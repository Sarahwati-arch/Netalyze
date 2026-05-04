import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

job_id_prefix = "85019ff5"
response = supabase.table("scraping_jobs").select("*").ilike("id", f"{job_id_prefix}%").execute()
if response.data:
    job = response.data[0]
    print(f"ID: {job['id']}, Status: {job['status']}, Progress: {job['progress']}%, URL: {job.get('target_url')}")
else:
    print("Job not found")
