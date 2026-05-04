"""
Script untuk login Instagram dan menyimpan session.
Jalankan sekali saja: python login.py
Browser akan terbuka, login manual, lalu tekan Enter di terminal.
"""

import os
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

SESSION_FILE = os.getenv("INSTAGRAM_SESSION_FILE", "instagram_session.json")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def main():
    print("=" * 40)
    print("Instagram Session Saver")
    print("=" * 40)
    print()
    print("Browser akan terbuka ke Instagram.")
    print("Login secara manual seperti biasa.")
    print("Setelah berhasil login, kembali ke terminal ini dan tekan Enter.")
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 800})
        page = ctx.new_page()

        page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded")
        print("Browser terbuka. Silakan login di Instagram...")
        print()

        input("Tekan Enter setelah berhasil login...")

        # Simpan cookies + localStorage
        ctx.storage_state(path=SESSION_FILE)
        print()
        print(f"Session berhasil disimpan ke: {SESSION_FILE}")
        print("Worker akan otomatis menggunakan session ini saat scraping.")

        browser.close()


if __name__ == "__main__":
    main()
