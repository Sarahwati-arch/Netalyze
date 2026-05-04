-- ============================================
-- Netalyze - Supabase Database Schema
-- ============================================

-- Tabel untuk menyimpan job scraping
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scraping', 'analyzing', 'completed', 'error')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT,
    target_count INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel untuk menyimpan hasil analisis komentar
CREATE TABLE IF NOT EXISTS comments_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    username TEXT,
    comment_text TEXT,
    sentiment TEXT CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
    account_type TEXT CHECK (account_type IN ('GENUINE', 'SUSPICIOUS', 'BUZZER')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_comments_data_job_id ON comments_data(job_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at);

-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_scraping_jobs_updated_at
    BEFORE UPDATE ON scraping_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments_data ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous read/write (worker menggunakan service_role_key yang bypass RLS)
-- Jika ingin lebih ketat, ganti 'anon' dengan specific roles

-- scraping_jobs: allow insert & select for anon (frontend)
CREATE POLICY "Allow anon insert on scraping_jobs"
    ON scraping_jobs FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon select on scraping_jobs"
    ON scraping_jobs FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon update on scraping_jobs"
    ON scraping_jobs FOR UPDATE
    TO anon
    USING (true);

-- comments_data: allow select for anon, insert via service_role
CREATE POLICY "Allow anon select on comments_data"
    ON comments_data FOR SELECT
    TO anon
    USING (true);

-- Note: Insert ke comments_data dilakukan oleh worker menggunakan service_role_key
-- sehingga tidak perlu policy INSERT untuk anon.
-- Jika frontend perlu insert langsung, uncomment berikut:
-- CREATE POLICY "Allow anon insert on comments_data"
--     ON comments_data FOR INSERT
--     TO anon
--     WITH CHECK (true);
