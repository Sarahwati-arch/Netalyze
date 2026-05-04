'use client';

import { useState } from 'react';
import { Play, Instagram, Loader2, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import ProgressTracker from '@/components/ProgressTracker';

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) return;

    if (!url.trim().includes('instagram.com')) {
      setStatus('error');
      setMessage('URL harus berasal dari instagram.com. Contoh: https://www.instagram.com/p/...');
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
        throw new Error(data.error || 'Gagal membuat job baru.');
      }

      setStatus('success');
      setJobId(data.id);
      setMessage('Analisis berhasil dijadwalkan! Sistem sedang memproses permintaan Anda.');
      setUrl('');
    } catch (err: any) {
      console.error('Gagal membuat job:', err);
      setStatus('error');
      setMessage(err?.message || 'Terjadi kesalahan saat menyimpan data.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full px-6 sm:px-12 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Instagram className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-slate-900">Netalyze</span>
        </div>
        <div className="flex gap-8">
          <span className="text-sm text-slate-400 cursor-pointer hover:text-slate-900 transition-colors">
            Dokumentasi
          </span>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-12 py-16">
        <div className="w-full max-w-3xl text-center space-y-6 mb-16">
          <p className="text-sm font-medium text-slate-500">
            Antarmuka Scraping Otomatis
          </p>
          <h1 className="text-5xl sm:text-7xl md:text-[5.5rem] font-bold tracking-tight leading-[0.95] text-slate-900">
            Analisis Sentimen <br /> <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">Komentar Instagram</span>
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto pt-6 leading-relaxed">
            Masukkan URL postingan Instagram. AI kami akan mengumpulkan komentar dan menganalisis sentimen untuk Anda.
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-slate-100 p-8 sm:p-12">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-4">
              <label htmlFor="url" className="text-sm font-medium block text-slate-500">
                URL Target Instagram
              </label>
              <div className="relative flex items-center">
                <Link2 className="h-5 w-5 text-slate-400 absolute left-4" />
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full border border-slate-200 rounded-xl bg-slate-50 pl-12 pr-4 py-4 text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-300 text-slate-900 transition-shadow"
                  disabled={status === 'loading'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || !url.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-5 rounded-xl flex items-center justify-center gap-4 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Sedang Memproses</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">Mulai Analisis</span>
                  <Play className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Status Notifications */}
            {status === 'success' && jobId && (
              <div className="mt-10">
                <div className="pt-6 border-t border-slate-100 flex items-start gap-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Analisis Dijadwalkan</p>
                    <p className="text-sm text-slate-500">{message}</p>
                  </div>
                </div>
                <ProgressTracker jobId={jobId} />
              </div>
            )}

            {status === 'error' && (
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Kesalahan Sistem</p>
                  <p className="text-sm text-slate-500">{message}</p>
                </div>
              </div>
            )}
          </form>

          {/* Instance Status */}
          <div className="mt-10 flex justify-between items-center pt-8 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'error' ? 'bg-red-500' : status === 'loading' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span className="text-xs text-slate-400">
                Instance Supabase: {status === 'error' ? 'Kesalahan' : 'Aktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="mt-16 w-full max-w-xl grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs text-slate-400">
          <div>
            <p className="text-slate-500 mb-1">Tabel Target</p>
            <p className="font-mono">scraping_jobs</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Status Default</p>
            <p className="font-mono">'pending'</p>
          </div>
          <div className="col-span-2 sm:col-span-1 sm:text-right">
            <p className="text-slate-500 mb-1">Status Sistem</p>
            <p>Versi Beta</p>
          </div>
        </div>
      </main>
    </div>
  );
}
