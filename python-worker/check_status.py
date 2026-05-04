import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    response = supabase.table("scraping_jobs").select("*").order("created_at", desc=True).limit(20).execute()
    for job in response.data:
        print(f"ID: {job['id']}, Status: {job['status']}, URL: {job.get('target_url')}, Progress: {job['progress']}%, Message: {job.get('message')}")
except Exception as e:
    print(f"Error: {e}")
