'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Instagram, Clock, ArrowLeft, Loader2, ExternalLink, MessageCircle, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface JobItem {
  id: string;
  target_url: string;
  status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'error';
  progress: number;
  message?: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

const content = {
  id: {
    back: 'Beranda',
    docs: 'Dokumentasi',
    history: 'Riwayat',
    title: 'Riwayat Analisis',
    desc: 'Semua analisis sentimen yang pernah Anda jalankan tersimpan di sini.',
    empty: 'Belum ada analisis.',
    emptyDesc: 'Mulai analisis pertama Anda dari halaman utama.',
    startFirst: 'Mulai Analisis',
    comments: 'komentar',
    viewResult: 'Lihat Hasil',
    loading: 'Memuat riwayat...',
    errorLoad: 'Gagal memuat riwayat analisis.',
    retry: 'Coba Lagi',
    search: 'Cari URL...',
    status: {
      pending: 'Menunggu',
      scraping: 'Mengumpulkan',
      analyzing: 'Menganalisis',
      completed: 'Selesai',
      error: 'Gagal',
    },
    time: {
      justNow: 'Baru saja',
      minutesAgo: (n: number) => `${n} menit lalu`,
      hoursAgo: (n: number) => `${n} jam lalu`,
      daysAgo: (n: number) => `${n} hari lalu`,
      weeksAgo: (n: number) => `${n} minggu lalu`,
    },
    totalJobs: 'total analisis',
    page: 'Halaman',
    of: 'dari',
  },
  en: {
    back: 'Home',
    docs: 'Documentation',
    history: 'History',
    title: 'Analysis History',
    desc: 'All sentiment analyses you\'ve run are stored here.',
    empty: 'No analyses yet.',
    emptyDesc: 'Start your first analysis from the home page.',
    startFirst: 'Start Analysis',
    comments: 'comments',
    viewResult: 'View Result',
    loading: 'Loading history...',
    errorLoad: 'Failed to load analysis history.',
    retry: 'Retry',
    search: 'Search URL...',
    status: {
      pending: 'Pending',
      scraping: 'Scraping',
      analyzing: 'Analyzing',
      completed: 'Completed',
      error: 'Failed',
    },
    time: {
      justNow: 'Just now',
      minutesAgo: (n: number) => `${n}m ago`,
      hoursAgo: (n: number) => `${n}h ago`,
      daysAgo: (n: number) => `${n}d ago`,
      weeksAgo: (n: number) => `${n}w ago`,
    },
    totalJobs: 'total analyses',
    page: 'Page',
    of: 'of',
  }
};

function getRelativeTime(dateStr: string, t: typeof content['id']['time']) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMin < 1) return t.justNow;
  if (diffMin < 60) return t.minutesAgo(diffMin);
  if (diffHours < 24) return t.hoursAgo(diffHours);
  if (diffDays < 7) return t.daysAgo(diffDays);
  return t.weeksAgo(diffWeeks);
}

function extractPostId(url: string): string {
  try {
    const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    // Fallback: just show domain + path truncated
    const u = new URL(url);
    return u.pathname.length > 30 ? u.pathname.slice(0, 30) + '...' : u.pathname;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url;
  }
}

const statusConfig = {
  pending: { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', animate: false },
  scraping: { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', animate: true },
  analyzing: { color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', animate: true },
  completed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', animate: false },
  error: { color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', animate: false },
};

export default function HistoryPage() {
  const { lang, setLang } = useLanguage();
  const t = content[lang];

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs?page=${page}`);
      if (!res.ok) throw new Error(t.errorLoad);
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalJobs(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to load history:', err);
      setError(err.message || t.errorLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredJobs = searchQuery.trim()
    ? jobs.filter(j => j.target_url.toLowerCase().includes(searchQuery.toLowerCase()))
    : jobs;

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[#FAFAFA]">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-400/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[20%] h-[20%] rounded-full bg-cyan-400/10 blur-[100px] pointer-events-none" />

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
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.back}
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col px-4 sm:px-12 py-12 sm:py-16 max-w-5xl mx-auto w-full relative z-10">
        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  {t.title}
                </h1>
              </div>
              <p className="text-base text-slate-500 font-medium">{t.desc}</p>
            </div>
            {!loading && !error && totalJobs > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-400">
                  {totalJobs} {t.totalJobs}
                </span>
                <button
                  onClick={() => fetchJobs(currentPage)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-white hover:border-slate-300 transition-all text-slate-400 hover:text-slate-600"
                  title={t.retry}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        {!loading && !error && jobs.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-md bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 placeholder:text-slate-400 text-slate-900 transition-all duration-300 shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
            <div className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-sm border border-white/60 p-16 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium text-slate-400">{t.loading}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
            <div className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-sm border border-red-100/60 p-16 flex flex-col items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm font-semibold text-slate-900">{t.errorLoad}</p>
              <button
                onClick={() => fetchJobs()}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                {t.retry}
              </button>
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-sm border border-white/60 p-16 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mb-2">
                <Clock className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-lg font-bold text-slate-900">{t.empty}</p>
              <p className="text-sm text-slate-500 max-w-xs">{t.emptyDesc}</p>
              <Link
                href="/"
                className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                {t.startFirst}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            {filteredJobs.map((job, index) => {
              const sc = statusConfig[job.status] || statusConfig.pending;
              const isClickable = job.status === 'completed';

              const cardContent = (
                <div
                  className={`group bg-white/70 backdrop-blur-2xl rounded-2xl shadow-[0_2px_16px_rgb(0,0,0,0.03)] border border-white/60 p-5 sm:p-6 transition-all duration-300 ${
                    isClickable
                      ? 'hover:shadow-[0_4px_24px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-indigo-200/50 cursor-pointer'
                      : 'opacity-80'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: URL + Meta */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* URL */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100/50">
                          <Instagram className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          instagram.com/p/{extractPostId(job.target_url)}
                        </span>
                        {isClickable && (
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 pl-[42px]">
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${sc.animate ? 'animate-pulse' : ''}`} />
                          {t.status[job.status]}
                        </span>

                        {/* Comment count */}
                        {job.comment_count > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <MessageCircle className="w-3 h-3" />
                            {job.comment_count} {t.comments}
                          </span>
                        )}

                        {/* Timestamp */}
                        <span className="text-xs text-slate-400 font-medium">
                          <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                          {getRelativeTime(job.created_at, t.time)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Action */}
                    {isClickable && (
                      <div className="sm:pl-4 pl-[42px]">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-bold shadow-sm group-hover:shadow-md group-hover:shadow-indigo-500/20 transition-all duration-300">
                          {t.viewResult}
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    )}

                    {/* In-progress indicator */}
                    {(job.status === 'scraping' || job.status === 'analyzing') && (
                      <div className="sm:pl-4 pl-[42px]">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          <span className="text-xs font-medium text-slate-400">{job.progress}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress bar for in-progress jobs */}
                  {(job.status === 'scraping' || job.status === 'analyzing') && job.progress > 0 && (
                    <div className="mt-4 pl-[42px]">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );

              return isClickable ? (
                <Link key={job.id} href={`/result/${job.id}`} className="block">
                  {cardContent}
                </Link>
              ) : (
                <div key={job.id}>
                  {cardContent}
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-6">
                <button
                  onClick={() => fetchJobs(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 hover:bg-white hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="text-sm font-medium text-slate-500">
                  {t.page} {currentPage} {t.of} {totalPages}
                </span>
                <button
                  onClick={() => fetchJobs(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 hover:bg-white hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-6 sm:px-12 py-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-400 bg-white/50">
        <span>v1.0.0-beta</span>
        <span className="text-center">&copy; 2026 Netalyze</span>
        <span>Netalyze</span>
      </footer>
    </div>
  );
}
