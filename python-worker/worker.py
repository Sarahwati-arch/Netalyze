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
        logger.info("Job [%s] updated -> status: '%s', progress: %s%%, message: %s", job_id, status, progress, message)
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


def instagram_auto_login(page) -> bool:
    """Login otomatis ke Instagram menggunakan username & password dari env"""
    ig_user = os.getenv("INSTAGRAM_USERNAME", "")
    ig_pass = os.getenv("INSTAGRAM_PASSWORD", "")

    if not ig_user or not ig_pass:
        logger.error("INSTAGRAM_USERNAME dan INSTAGRAM_PASSWORD belum diset di .env")
        return False

    try:
        logger.info("Mencoba auto-login Instagram sebagai @%s ...", ig_user)

        page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded", timeout=60000)
        logger.info("Login page goto done. Current URL: %s", page.url)

        # Wait for JS to render the login form
        page.wait_for_timeout(5000)

        # Debug: dump page state
        try:
            page.screenshot(path="debug_login.png")
            logger.info("Login page screenshot saved to debug_login.png")
            page_text = page.evaluate("() => document.body.innerText.substring(0, 2000)")
            logger.info("=== LOGIN PAGE TEXT ===\n%s\n=== END ===", page_text)
        except Exception as dbg_err:
            logger.warning("Debug dump gagal: %s", dbg_err)

        # Try multiple selectors for the username input
        username_input = page.locator('input[name="username"]')
        try:
            username_input.wait_for(state="visible", timeout=5000)
        except Exception:
            # Instagram tidak pakai name="username" lagi, cari berdasarkan placeholder/aria-label
            logger.info("input[name=username] not found, trying alternative selectors...")
            username_input = page.locator('input[aria-label*="Mobile"], input[aria-label*="Phone"], input[aria-label*="username"], input[aria-label*="email"]').first
            try:
                username_input.wait_for(state="visible", timeout=5000)
            except Exception:
                # Fallback: ambil input pertama di halaman login
                logger.info("Alternative selectors juga gagal, mencari semua input...")
                all_inputs = page.locator('input')
                count = all_inputs.count()
                logger.info("Ditemukan %d input fields di halaman", count)
                if count >= 2:
                    username_input = all_inputs.nth(0)
                else:
                    raise Exception("Tidak bisa menemukan input username")

        # Isi username dengan type() untuk simulasi keyboard asli
        username_input.click()
        page.wait_for_timeout(300)
        page.keyboard.type(ig_user, delay=100)

        # Isi password
        password_input = page.locator('input[name="password"]')
        try:
            password_input.wait_for(state="visible", timeout=5000)
        except Exception:
            all_inputs = page.locator('input')
            password_input = all_inputs.nth(1)
        password_input.click()
        page.wait_for_timeout(300)
        page.keyboard.type(ig_pass, delay=100)

        # Klik tombol login
        login_btn = page.locator('button[type="submit"]')
        try:
            login_btn.click(timeout=3000)
        except Exception:
            # Instagram pakai div[role="button"] bukan <button>
            page.get_by_role("button", name="Log In", exact=True).click(timeout=5000)
        page.wait_for_timeout(8000)

        # Handle "Save Login Info" dialog
        try:
            not_now_btn = page.locator('button', has_text="Not Now").first
            if not_now_btn.is_visible(timeout=3000):
                not_now_btn.click()
                page.wait_for_timeout(2000)
        except Exception:
            pass

        # Handle "Turn on Notifications" dialog
        try:
            not_now_btn = page.locator('button', has_text="Not Now").first
            if not_now_btn.is_visible(timeout=3000):
                not_now_btn.click()
                page.wait_for_timeout(2000)
        except Exception:
            pass

        # Cek apakah login berhasil
        current_url = page.url
        if "login" in current_url.lower():
            logger.error("Login gagal. Masih di halaman login. Cek username/password.")
            return False

        logger.info("Login Instagram berhasil sebagai @%s", ig_user)
        return True

    except Exception as e:
        logger.error("Auto-login gagal: %s", e)
        return False


JS_EXTRACT_DOM_COMMENTS = """
() => {
    const results = [];
    const seen = new Set();

    // In English Instagram, every comment has a "Reply" button.
    // We use this "Reply" text as an anchor to find genuine comment blocks
    // and avoid capturing captions, sidebars, or footers.
    const elements = document.querySelectorAll('*');
    const replyNodes = [];
    for (const el of elements) {
        if (el.textContent.trim() === 'Reply' && el.children.length === 0) {
            replyNodes.push(el);
        }
    }

    for (const node of replyNodes) {
        let container = node.parentElement;
        let foundUsername = '';
        let foundText = '';
        
        // Go up up to 8 levels to find the comment container that holds both the username and text
        for (let i = 0; i < 8; i++) {
            if (!container) break;
            
            // Find username
            const links = container.querySelectorAll('a[href^="/"]');
            for (const a of links) {
                const href = a.getAttribute('href');
                if (href && href.length > 2 && href.startsWith('/')) {
                    const un = href.replace(/\\//g, '');
                    if (!['p', 'explore', 'reels', 'stories'].includes(un)) {
                        // Check if it's a valid username link (not an icon)
                        if (a.textContent.trim().toLowerCase() === un.toLowerCase() || a.querySelector('img')) {
                            foundUsername = un;
                            break;
                        }
                    }
                }
            }
            
            if (foundUsername) {
                // Find comment text
                const autoEls = container.querySelectorAll('span[dir="auto"], div[dir="auto"], span');
                for (const el of autoEls) {
                    const t = el.textContent.trim();
                    if (!t) continue;
                    
                    // Filter out metadata and usernames
                    if (t.toLowerCase() === foundUsername.toLowerCase()) continue;
                    if (['Verified', 'Reply', 'See Translation', 'Edited', 'Hide replies'].includes(t)) continue;
                    if (/^[0-9]+[smhdw]$/.test(t)) continue; // 1w, 2h
                    if (/^[0-9,]+\\s+likes?$/.test(t)) continue; // 19 likes
                    if (t.includes('View replies')) continue;
                    
                    // We found the actual text
                    foundText = t;
                    break;
                }
            }
            
            // If we found both in this container, we stop climbing the DOM tree
            // to avoid capturing parent comments (if this is a nested reply)
            if (foundUsername && foundText) {
                break;
            }
            
            container = container.parentElement;
        }
        
        if (foundUsername && foundText && !seen.has(foundText)) {
            seen.add(foundText);
            results.push({ username: foundUsername, comment_text: foundText });
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
        session_file = os.getenv("INSTAGRAM_SESSION_FILE", "/app/data/instagram_session.json")
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )

        # Gunakan session Instagram jika ada
        context_kwargs = {"user_agent": UA, "viewport": {"width": 1280, "height": 800}}
        need_login = True
        if os.path.exists(session_file):
            context_kwargs["storage_state"] = session_file
            logger.info("Menggunakan session Instagram dari %s", session_file)
            need_login = False
        ctx = browser.new_context(**context_kwargs)

        # Stealth: inject anti-detection script on every new page
        ctx.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
            Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
        """)

        page = ctx.new_page()

        # Auto-login jika tidak ada session
        if need_login:
            if instagram_auto_login(page):
                ctx.storage_state(path=session_file)
                logger.info("Session Instagram disimpan ke %s", session_file)
            else:
                logger.warning("Auto-login gagal. Mencoba scraping tanpa login...")

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
                        return 'Dialog found';
                    }
                    return 'No dialog found';
                }
            """)
            if debug_html == 'No dialog found':
                logger.info("Instagram loaded post in full-page mode (no dialog). Continuing extraction on main page.")
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

        # Selalu jalankan DOM extraction di akhir untuk menangkap komentar yang di-load di HTML awal
        # atau komentar yang terlewat oleh API interception
        logger.info("Menjalankan DOM extraction final...")
        try:
            dom_comments = page.evaluate(JS_EXTRACT_DOM_COMMENTS)
            if dom_comments:
                added = 0
                for c in dom_comments:
                    key = f"{c['username']}:{c['comment_text']}"
                    if key not in comments:
                        comments[key] = c
                        added += 1
                logger.info("Final DOM extraction: +%d komentar (total %d)", added, len(comments))
        except Exception as e:
            logger.warning("Final DOM extraction gagal: %s", e)

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
