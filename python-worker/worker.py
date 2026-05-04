import os
import sys
import time
import json
import random
import signal
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

from dotenv import load_dotenv
from supabase import create_client, Client
from playwright.sync_api import sync_playwright
from openai import OpenAI

load_dotenv()

# --- STRUCTURED LOGGING ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("netalyze-worker")

# --- CONFIG & ENVIRONMENT VARIABLES ---
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("[!] Missing Supabase Credentials. Setup SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
if not OPENAI_API_KEY:
    sys.exit("[!] Missing OpenAI API Key. Setup OPENAI_API_KEY in .env")

# --- INITIALIZE CLIENTS ---
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# --- SCRAPER CONSTANTS ---
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
MAX_STALE_ROUNDS = 20

# --- GRACEFUL SHUTDOWN STATE ---
current_job_id: str | None = None
shutdown_requested = False


def handle_signal(signum, frame):
    global shutdown_requested
    logger.warning("Received shutdown signal. Finishing current job gracefully...")
    shutdown_requested = True


signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

JS_CLICK_VIEW_COMMENTS = """
() => {
    // Klik tombol "View all X comments" atau "Lihat semua komentar"
    const buttons = document.querySelectorAll('div[role="button"], button');
    for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('view all') || text.includes('lihat semua') || text.includes('more comments')) {
            btn.click();
            return true;
        }
    }
    return false;
}
"""

JS_SCROLL_COMMENTS = """
() => {
    let scrolled = false;

    // Cari semua div scrollable di halaman, dari yang paling kecil (paling spesifik)
    const candidates = document.querySelectorAll('div');
    const scrollables = [];
    for (const el of candidates) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
            scrollables.push({el, area: el.scrollHeight * el.clientWidth, textLen: el.textContent.length});
        }
    }

    // Sort: area terkecil yang punya teks panjang = area komentar yang paling spesifik
    scrollables.sort((a, b) => a.area - b.area);

    for (const s of scrollables) {
        // Area komentar biasanya punya teks panjang (banyak komentar)
        if (s.textLen > 200) {
            s.el.scrollTop += 800;
            scrolled = true;
            break;
        }
    }

    // Fallback: scroll window
    if (!scrolled) {
        window.scrollBy(0, 800);
        scrolled = true;
    }

    return scrolled;
}
"""


def update_job_status(job_id: str, status: str, progress: int = None, message: str = None):
    """Update status dan progress di Supabase"""
    data = {"status": status}
    if progress is not None:
        data["progress"] = progress
    if message is not None:
        data["message"] = message
    try:
        supabase.table("scraping_jobs").update(data).eq("id", job_id).execute()
        logger.info("Job [%s] updated -> status: '%s', progress: %s%%", job_id, status, progress)
    except Exception as e:
        logger.error("Failed to update job %s: %s", job_id, e)


def recover_stale_jobs():
    """Cari job stale (>30 menit) dan set ke error"""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
        stale_statuses = ["scraping", "analyzing"]
        for status in stale_statuses:
            response = (
                supabase.table("scraping_jobs")
                .select("id, updated_at")
                .eq("status", status)
                .lt("updated_at", cutoff.isoformat())
                .execute()
            )
            for job in response.data:
                update_job_status(
                    job["id"],
                    "error",
                    message="Job dianggap stale (tidak ada aktivitas >30 menit). Worker mungkin crash."
                )
                logger.warning("Recovered stale job %s with status '%s'", job["id"], status)
    except Exception as e:
        logger.error("Error recovering stale jobs: %s", e)


def write_heartbeat():
    """Tulis heartbeat timestamp ke file untuk monitoring"""
    try:
        with open("worker_heartbeat.txt", "w") as f:
            f.write(datetime.now(timezone.utc).isoformat())
    except Exception as e:
        logger.warning("Failed to write heartbeat file: %s", e)


JS_EXTRACT_DOM_COMMENTS = """
() => {
    const results = [];
    const seen = new Set();

    // Cari semua elemen yang berisi teks komentar
    // Instagram menyimpan komentar di berbagai struktur, kita coba semua kemungkinan

    // Pendekatan 1: Cari semua <li> di dalam list komentar
    const lists = document.querySelectorAll('ul');
    for (const ul of lists) {
        const items = ul.querySelectorAll(':scope > li');
        if (items.length < 1) continue;

        for (const li of items) {
            // Ambil semua link (username)
            const links = li.querySelectorAll('a[href^="/"]');
            let username = '';
            for (const a of links) {
                const href = a.getAttribute('href');
                // Username link format: /username/
                if (href && href.startsWith('/') && href.length > 2) {
                    const spans = a.querySelectorAll('span');
                    for (const s of spans) {
                        const t = s.textContent.trim();
                        if (t && t.length > 1 && t.length < 30 && !t.includes(' ') && t === s.textContent.trim()) {
                            username = t;
                            break;
                        }
                    }
                    if (username) break;
                }
            }

            // Ambil teks komentar - cari span[dir="auto"] atau teks langsung
            let text = '';
            const autoSpans = li.querySelectorAll('span[dir="auto"]');
            for (const span of autoSpans) {
                const content = span.textContent.trim();
                if (content && content !== username && content.length > 1 && content.length < 2000) {
                    text = content;
                    break;
                }
            }

            if (!text) {
                // Fallback: ambil teks dari span yang bukan link
                const spans = li.querySelectorAll('span');
                for (const span of spans) {
                    const content = span.textContent.trim();
                    if (content && content !== username && content.length > 3 && content.length < 2000) {
                        text = content;
                        break;
                    }
                }
            }

            if (text && !seen.has(text)) {
                seen.add(text);
                results.push({ username: username || 'unknown', comment_text: text });
            }
        }
    }

    return results;
}
"""


def scrape_comments(job_id: str, url: str, target_comments: int = 100) -> List[Dict]:
    """Scraping komentar menggunakan Playwright dengan dua metode: API intercept + DOM fallback"""
    comments: dict[str, dict] = {}

    with sync_playwright() as p:
        # Set HEADLESS=false di .env untuk debug (buka browser visual)
        headless = os.getenv("HEADLESS", "true").lower() == "true"
        session_file = os.getenv("INSTAGRAM_SESSION_FILE", "instagram_session.json")
        browser = p.chromium.launch(headless=headless)

        # Gunakan session Instagram jika ada (simpan via login.py)
        context_kwargs = {"user_agent": UA, "viewport": {"width": 1280, "height": 800}}
        if os.path.exists(session_file):
            context_kwargs["storage_state"] = session_file
            logger.info("Menggunakan session Instagram dari %s", session_file)
        else:
            logger.warning("Tidak ada session Instagram. Jalankan 'python login.py' terlebih dahulu.")
        ctx = browser.new_context(**context_kwargs)
        page = ctx.new_page()

        # Metode 1: Intercept API responses
        def on_response(resp):
            url_lower = resp.url.lower()
            if resp.status == 200 and ("comment" in url_lower or "graphql" in url_lower):
                try:
                    body = resp.json()
                    # Coba berbagai struktur response Instagram
                    data_sources = []

                    # Struktur 1: langsung ada comments array
                    if body.get("comments"):
                        data_sources.append(body.get("comments"))

                    # Struktur 2: GraphQL edges
                    graphql_data = body.get("data", {})
                    if graphql_data:
                        # Berbagai key yang mungkin
                        for key in graphql_data:
                            if "comment" in key.lower():
                                edges = graphql_data[key].get("edges", [])
                                data_sources.append(edges)

                    # Struktur 3: xdt_api
                    for key in body:
                        if "xdt_api" in key or "comment" in key.lower():
                            nested = body[key]
                            if isinstance(nested, dict):
                                edges = nested.get("edges", nested.get("comments", []))
                                if isinstance(edges, list):
                                    data_sources.append(edges)

                    for data in data_sources:
                        for item in data:
                            c = item.get("node") if isinstance(item, dict) and "node" in item else item
                            if not isinstance(c, dict):
                                continue
                            pk = str(c.get("pk") or c.get("id", ""))
                            if pk and pk not in comments:
                                comments[pk] = {
                                    "username": c.get("user", {}).get("username", "unknown"),
                                    "comment_text": c.get("text", ""),
                                }
                except:
                    pass

        page.on("response", on_response)
        logger.info("Membuka target: %s ...", url)
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(8000)

        # Debug: dump struktur HTML area komentar
        try:
            debug_html = page.evaluate("""
                () => {
                    const dialog = document.querySelector('div[role="dialog"]');
                    if (dialog) {
                        // Cari semua ul dan hitung li-nya
                        const uls = dialog.querySelectorAll('ul');
                        const ulInfo = [];
                        for (const ul of uls) {
                            ulInfo.push('UL with ' + ul.querySelectorAll(':scope > li').length + ' li children');
                        }
                        // Cari elemen scrollable
                        const divs = dialog.querySelectorAll('div');
                        const scrollables = [];
                        for (const d of divs) {
                            const s = window.getComputedStyle(d);
                            if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && d.scrollHeight > d.clientHeight + 10) {
                                scrollables.push('scrollable div: scrollHeight=' + d.scrollHeight + ', clientHeight=' + d.clientHeight + ', children=' + d.children.length + ', textLen=' + d.textContent.length);
                            }
                        }
                        // Dump sebagian HTML dari dialog (bagian teks komentar)
                        const allText = dialog.innerText.substring(0, 5000);
                        return JSON.stringify({ulInfo, scrollables, allText}, null, 2);
                    }
                    return 'No dialog found';
                }
            """)
            if debug_html == 'No dialog found':
                logger.info("Instagram loaded post in full-page mode (no dialog). Continuing extraction on main page.")
            else:
                logger.info("=== DEBUG HTML (Dialog Mode) ===\n%s\n=== END DEBUG ===", debug_html)
        except Exception as e:
            logger.warning("Debug dump gagal: %s", e)

        # Klik tombol "View all comments" kalau ada
        try:
            clicked = page.evaluate(JS_CLICK_VIEW_COMMENTS)
            if clicked:
                logger.info("Tombol 'View all comments' diklik")
                page.wait_for_timeout(3000)
        except:
            pass

        stale = 0
        last_progress = 0

        for i in range(2000):
            if shutdown_requested:
                logger.warning("Shutdown requested during scraping. Stopping.")
                break

            current_len = len(comments)
            if current_len >= target_comments:
                break

            progress_pct = int((current_len / target_comments) * 50)
            if progress_pct > last_progress:
                update_job_status(job_id, "scraping", progress=progress_pct)
                last_progress = progress_pct

            prev_count = current_len
            try:
                page.evaluate(JS_SCROLL_COMMENTS)
                page.wait_for_timeout(random.randint(4000, 6000))
            except Exception as e:
                if "context was destroyed" in str(e):
                    page.wait_for_timeout(3000)
                    continue
                break

            # Setiap 3 round, coba DOM extraction untuk menangkap komentar yang sudah terload
            if i > 0 and i % 3 == 0:
                try:
                    dom_comments = page.evaluate(JS_EXTRACT_DOM_COMMENTS)
                    if dom_comments:
                        added = 0
                        for c in dom_comments:
                            key = f"{c['username']}:{c['comment_text']}"
                            if key not in comments:
                                comments[key] = c
                                added += 1
                        if added > 0:
                            logger.info("DOM extraction round %d: +%d komentar (total %d)", i, added, len(comments))
                except Exception as e:
                    logger.debug("DOM extraction gagal: %s", e)

            # Setiap 10 round, coba klik "View all comments" lagi
            if len(comments) == 0 and i > 0 and i % 10 == 0:
                # Coba klik tombol lagi
                try:
                    page.evaluate(JS_CLICK_VIEW_COMMENTS)
                except:
                    pass
                # DOM fallback
                logger.info("Mencoba ekstraksi DOM fallback (round %d)...", i)
                try:
                    dom_comments = page.evaluate(JS_EXTRACT_DOM_COMMENTS)
                    if dom_comments:
                        for c in dom_comments:
                            key = f"{c['username']}:{c['comment_text']}"
                            if key not in comments:
                                comments[key] = c
                        logger.info("DOM fallback: terambil %d komentar", len(comments))
                except Exception as e:
                    logger.debug("DOM fallback gagal: %s", e)

            if len(comments) > prev_count:
                stale = 0
                logger.info("Terambil %d komentar...", len(comments))
            else:
                stale += 1
                if stale % 5 == 0:
                    logger.info("Menunggu lazyload (%d/%d)", stale, MAX_STALE_ROUNDS)
                if stale >= MAX_STALE_ROUNDS:
                    logger.warning("Mentok. Scroll dihentikan.")
                    break

        # Fallback akhir: jika masih 0 komentar, coba DOM extraction satu kali lagi
        if len(comments) == 0:
            logger.info("API intercept gagal. Mencoba DOM extraction penuh...")

            # Debug: simpan screenshot dan dump HTML
            try:
                page.screenshot(path="debug_screenshot.png", full_page=False)
                logger.info("Screenshot disimpan ke debug_screenshot.png")

                # Dump teks halaman untuk debug
                page_text = page.evaluate("() => document.body.innerText.substring(0, 3000)")
                logger.info("=== PAGE TEXT (3000 chars) ===\n%s\n=== END ===", page_text)

                # Dump semua URL response yang tertangkap
                all_urls = page.evaluate("""
                    () => performance.getEntriesByType('resource').map(e => e.name).filter(u => u.includes('graphql') || u.includes('api') || u.includes('comment')).join('\\n')
                """)
                logger.info("=== API URLs ===\n%s\n=== END ===", all_urls)
            except Exception as e:
                logger.warning("Debug dump gagal: %s", e)

            try:
                dom_comments = page.evaluate(JS_EXTRACT_DOM_COMMENTS)
                if dom_comments:
                    for c in dom_comments:
                        key = f"{c['username']}:{c['comment_text']}"
                        if key not in comments:
                            comments[key] = c
                    logger.info("DOM extraction: terambil %d komentar", len(comments))
            except Exception as e:
                logger.warning("DOM extraction gagal: %s", e)

        browser.close()

    update_job_status(job_id, "scraping", progress=50)
    return list(comments.values())


def analyze_comments(comments: List[Dict], job_id: str) -> List[Dict]:
    """Analisis sentimen & kategori akun dengan OpenAI gpt-4o-mini"""
    if not comments:
        return []

    logger.info("Memulai analisis OpenAI untuk %d komentar...", len(comments))
    batch_size = 50
    analyzed_comments = []
    model_name = "gpt-4o-mini"

    for i in range(0, len(comments), batch_size):
        if shutdown_requested:
            logger.warning("Shutdown requested during AI analysis. Stopping.")
            break

        batch = comments[i : i + batch_size]

        prompt = f"""Tugas Anda adalah membaca daftar komentar Instagram ini dan memberikan analisis untuk setiap entri.
Tentukan nilai berikut untuk setiap entri komentar:
1. 'sentiment': WAJIB pilih SATU antara ['POSITIVE', 'NEGATIVE', 'NEUTRAL'].
2. 'account_type': Analisis teks & username-nya.
    - Jika mempromosikan barang/jasa lain, menyalin sebuah text ajakan berulang, terlihat seperti robot, maka pilih 'BUZZER'.
    - Jika username hanya angka/karakter abstrak atau spam, pilih 'SUSPICIOUS'.
    - Selain di atas, pilih 'GENUINE'.
    - WAJIB pilih SATU antara ['GENUINE', 'SUSPICIOUS', 'BUZZER'].

Berikan output dalam format JSON object dengan key "results" berisi array yang urutannya sama persis dengan input:
{{
  "results": [
    {{
      "username": "...",
      "comment_text": "...",
      "sentiment": "...",
      "account_type": "..."
    }}
  ]
}}

Komentar Input:
{json.dumps(batch, ensure_ascii=False)}"""

        try:
            logger.info("Mengirim batch %d ke AI...", i // batch_size + 1)
            response = openai_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "Kamu adalah analis sentimen. Berikan output JSON saja."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )

            raw = response.choices[0].message.content
            parsed = json.loads(raw)
            results = parsed.get("results", parsed if isinstance(parsed, list) else [])

            for res in results:
                res["job_id"] = job_id
                analyzed_comments.append(res)

            progress_pct = 50 + int((len(analyzed_comments) / len(comments)) * 40)
            update_job_status(job_id, "analyzing", progress=progress_pct)

            time.sleep(1)

        except Exception as e:
            logger.error("Error pada batch AI %d: %s", i // batch_size + 1, e)
            for c in batch:
                c["sentiment"] = "NEUTRAL"
                c["account_type"] = "GENUINE"
                c["job_id"] = job_id
                analyzed_comments.append(c)

    update_job_status(job_id, "analyzing", progress=95)
    return analyzed_comments


def process_job(job: dict):
    global current_job_id
    job_id = job.get("id")
    current_job_id = job_id
    url = job.get("target_url")
    target_count = job.get("target_count", 200)

    if not url:
        update_job_status(job_id, "error", progress=0, message="URL target tidak ditemukan dalam job.")
        return

    try:
        update_job_status(job_id, "scraping", progress=0)
        comments = scrape_comments(job_id, url, target_comments=target_count)

        if not comments:
            raise Exception("Tidak ada komentar yang berhasil diambil")

        update_job_status(job_id, "analyzing", progress=50)
        analyzed_data = analyze_comments(comments, job_id)

        logger.info("Menyimpan %d hasil ke tabel 'comments_data'...", len(analyzed_data))
        for i in range(0, len(analyzed_data), 100):
            batch_slice = analyzed_data[i : i + 100]
            supabase.table("comments_data").insert(batch_slice).execute()

        logger.info("Job %s SELESAI DISIMPAN.", job_id)
        update_job_status(job_id, "completed", progress=100)

    except Exception as e:
        logger.error("Job %s GAGAL: %s", job_id, str(e))
        update_job_status(job_id, "error", progress=job.get("progress", 0), message=str(e))
    finally:
        current_job_id = None


def main():
    logger.info("=" * 40)
    logger.info("Background Worker Started")
    logger.info("=" * 40)

    # Recover stale jobs on startup
    recover_stale_jobs()

    logger.info("Running and checking pending jobs every 5s...")

    while True:
        if shutdown_requested:
            # If a job is still running, mark it as error
            if current_job_id:
                update_job_status(
                    current_job_id,
                    "error",
                    message="Worker shutdown unexpectedly.",
                )
            logger.info("Worker shut down gracefully.")
            break

        try:
            write_heartbeat()

            response = (
                supabase.table("scraping_jobs")
                .select("*")
                .eq("status", "pending")
                .order("created_at")
                .limit(1)
                .execute()
            )

            jobs = response.data
            if jobs:
                job = jobs[0]
                logger.info("Menemukan Job # %s", job["id"])
                process_job(job)
            else:
                time.sleep(5)

        except Exception as e:
            logger.error("Error polling jobs: %s", e)
            time.sleep(5)


if __name__ == "__main__":
    main()
