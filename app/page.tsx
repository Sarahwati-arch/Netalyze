'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Instagram, Loader2, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import ProgressTracker from '@/components/ProgressTracker';
import { useLanguage } from '@/components/LanguageContext';

const content = {
  id: {
    docs: 'Dokumentasi',
    badge: 'Antarmuka Scraping Otomatis',
    title: 'Analisis Sentimen',
    subtitle: 'Komentar Instagram',
    desc: 'Masukkan URL postingan Instagram. AI kami akan mengumpulkan komentar dan menganalisis sentimen untuk Anda dalam hitungan detik.',
    label: 'URL Target Instagram',
    processing: 'Sedang Memproses',
    start: 'Mulai Analisis',
    successTitle: 'Analisis Dijadwalkan',
    successMsg: 'Analisis berhasil dijadwalkan! Sistem sedang memproses permintaan Anda.',
    errorTitle: 'Kesalahan Sistem',
    errorUrl: 'URL harus berasal dari instagram.com. Contoh: https://www.instagram.com/p/...',
    errorDefault: 'Terjadi kesalahan saat menyimpan data.',
    instancePrefix: 'Instance Supabase:',
    instanceActive: 'Aktif',
    instanceError: 'Kesalahan',
  },
  en: {
    docs: 'Documentation',
    badge: 'Automated Scraping Interface',
    title: 'Sentiment Analysis',
    subtitle: 'Instagram Comments',
    desc: 'Enter an Instagram post URL. Our AI will scrape comments and analyze their sentiment for you in seconds.',
    label: 'Target Instagram URL',
    processing: 'Processing',
    start: 'Start Analysis',
    successTitle: 'Analysis Scheduled',
    successMsg: 'Analysis successfully scheduled! The system is processing your request.',
    errorTitle: 'System Error',
    errorUrl: 'URL must be from instagram.com. Example: https://www.instagram.com/p/...',
    errorDefault: 'An error occurred while saving data.',
    instancePrefix: 'Supabase Instance:',
    instanceActive: 'Active',
    instanceError: 'Error',
  }
};

export default function Home() {
  const { lang, setLang } = useLanguage();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);

  const t = content[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) return;

    if (!url.trim().includes('instagram.com')) {
      setStatus('error');
      setMessage(t.errorUrl);
      return;
    }

    setStatus('loading');
    setMessage('');
    setJobId(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t.errorDefault);
      }

      setStatus('success');
      setJobId(data.id);
      setMessage(t.successMsg);
      setUrl('');
    } catch (err: any) {
      console.error('Gagal membuat job:', err);
      setStatus('error');
      setMessage(err?.message || t.errorDefault);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[#FAFAFA]">
      {/* Background Orbs for Premium Mesh Gradient Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-400/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] rounded-full bg-cyan-400/10 blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full px-6 sm:px-12 py-4 flex justify-between items-center bg-white/60 backdrop-blur-xl border-b border-white/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <Instagram className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">Netalyze</span>
        </Link>
        
        <div className="flex items-center gap-6">
          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100/50 rounded-full p-1 border border-slate-200/50 backdrop-blur-sm">
            <button 
              onClick={() => setLang('id')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 ${lang === 'id' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              IDN
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 ${lang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ENG
            </button>
          </div>

          <Link href="/docs" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
            {t.docs}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-12 py-16">
        <div className="w-full max-w-4xl text-center space-y-6 mb-16 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-600 text-xs font-semibold tracking-wide uppercase shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {t.badge}
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] text-slate-900 drop-shadow-sm">
            {t.title} <br /> 
            <span className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent pb-4 pr-2 inline-block">
              {t.subtitle}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto pt-4 leading-relaxed font-medium">
            {t.desc}
          </p>
        </div>

        {/* Form Card (Glassmorphism) */}
        <div className="w-full max-w-xl bg-white/70 backdrop-blur-2xl rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white/60 p-8 sm:p-12 relative z-10 transition-all duration-500 hover:shadow-[0_8px_50px_rgb(0,0,0,0.06)] animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150 fill-mode-both">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-4">
              <label htmlFor="url" className="text-sm font-semibold block text-slate-700">
                {t.label}
              </label>
              <div className="relative flex items-center group">
                <Link2 className="h-5 w-5 text-slate-400 absolute left-4 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full border border-slate-200/80 rounded-2xl bg-white/50 pl-12 pr-4 py-4 text-lg focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 placeholder:text-slate-400 text-slate-900 transition-all duration-300 shadow-sm"
                  disabled={status === 'loading'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || !url.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-4 hover:opacity-100 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none shadow-md group"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-base font-semibold">{t.processing}</span>
                </>
              ) : (
                <>
                  <span className="text-base font-semibold tracking-wide">{t.start}</span>
                  <Play className="h-5 w-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </>
              )}
            </button>

            {/* Status Notifications */}
            {status === 'success' && jobId && (
              <div className="mt-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="pt-6 border-t border-slate-100/50 flex items-start gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">{t.successTitle}</p>
                    <p className="text-sm text-slate-600 font-medium">{message}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <ProgressTracker jobId={jobId} />
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="pt-6 border-t border-slate-100/50 flex items-start gap-4 bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                  <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">{t.errorTitle}</p>
                    <p className="text-sm text-slate-600 font-medium">{message}</p>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Instance Status */}
          <div className="mt-10 flex justify-between items-center pt-8 border-t border-slate-100/50">
            <div className="flex items-center gap-2.5 bg-slate-50/50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className={`w-2 h-2 rounded-full ${status === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : status === 'loading' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t.instancePrefix} {status === 'error' ? t.instanceError : t.instanceActive}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="mt-16 w-full max-w-xl grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs text-slate-400 opacity-60">
        </div>
      </main>
    </div>
  );
}

