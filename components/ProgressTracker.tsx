'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { JobData } from '@/lib/types';
import { useLanguage } from '@/components/LanguageContext';

interface ProgressTrackerProps {
  jobId: string;
}

const content = {
  id: {
    loading: 'Memuat status...',
    syncError: 'Kesalahan Sinkronisasi',
    notFound: 'Job tidak ditemukan',
    statusTitle: 'Status Analisis',
    status: {
      pending: 'Sedang Menunggu Worker...',
      scraping: 'Sedang Scraping Data...',
      analyzing: 'Sedang Analisis AI...',
      completed: 'Analisis Selesai!',
      error: 'Terjadi Kesalahan',
      default: 'Memproses...'
    },
    systemMessage: 'Pesan Sistem',
    viewResult: 'Lihat Hasil Analisis'
  },
  en: {
    loading: 'Loading status...',
    syncError: 'Synchronization Error',
    notFound: 'Job not found',
    statusTitle: 'Analysis Status',
    status: {
      pending: 'Waiting for Worker...',
      scraping: 'Scraping Data...',
      analyzing: 'Analyzing with AI...',
      completed: 'Analysis Complete!',
      error: 'An Error Occurred',
      default: 'Processing...'
    },
    systemMessage: 'System Message',
    viewResult: 'View Analysis Results'
  }
};

export default function ProgressTracker({ jobId }: ProgressTrackerProps) {
  const { lang } = useLanguage();
  const t = content[lang];

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || t.notFound);
        }

        const data: JobData = await res.json();

        if (isMounted) {
          setJob(data);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Gagal memuat job:', err);
        if (isMounted) {
          setError(err.message || t.notFound);
          setLoading(false);
        }
      }
    };

    fetchJob();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`job_updates_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scraping_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (isMounted) {
            setJob(payload.new as JobData);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [jobId, t.notFound]);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center pt-8 mt-8 border-t border-slate-100/50">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mb-3" />
        <span className="text-sm font-medium text-slate-400">{t.loading}</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full border-t border-slate-100/50 pt-8 mt-8">
        <div className="flex items-start gap-4 bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
          <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-600">{t.syncError}</p>
            <p className="text-sm font-medium text-red-500/80">{error || t.notFound}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t.status.pending;
      case 'scraping': return t.status.scraping;
      case 'analyzing': return t.status.analyzing;
      case 'completed': return t.status.completed;
      case 'error': return t.status.error;
      default: return t.status.default;
    }
  };

  const progressValue = job.progress || 0;

  return (
    <div className="w-full border-t border-slate-100/50 pt-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end mb-4 px-1">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.statusTitle}</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
            {job.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {job.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {getStatusText(job.status)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent tabular-nums tracking-tighter drop-shadow-sm">
            {progressValue}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100/80 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${job.status === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`}
          style={{ width: `${progressValue}%` }}
        />
      </div>

      <div className="mt-4 flex justify-between items-center text-xs font-semibold text-slate-400 px-1">
        <span className="truncate max-w-[200px] sm:max-w-xs block">{job.target_url}</span>
        <span>ID: <span className="font-mono">{job.id.slice(0, 8)}</span></span>
      </div>

      {job.message && job.status === 'error' && (
        <div className="mt-6 p-4 bg-red-50/80 border border-red-100 rounded-2xl flex items-start gap-3">
           <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
           <div className="space-y-1">
             <p className="text-xs font-bold uppercase tracking-wider text-red-700">{t.systemMessage}</p>
             <p className="text-sm font-medium text-red-600">{job.message}</p>
           </div>
        </div>
      )}

      {job.status === 'completed' && (
        <div className="mt-8">
          <Link
            href={`/result/${job.id}`}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-2xl flex items-center justify-center gap-3 hover:opacity-100 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 shadow-md group"
          >
            <span className="text-base font-semibold tracking-wide">{t.viewResult}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform duration-300" />
          </Link>
        </div>
      )}
    </div>
  );
}
