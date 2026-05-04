'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { JobData } from '@/lib/types';

interface ProgressTrackerProps {
  jobId: string;
}

export default function ProgressTracker({ jobId }: ProgressTrackerProps) {
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
          throw new Error(errData.error || 'Gagal memuat status pekerjaan.');
        }

        const data: JobData = await res.json();

        if (isMounted) {
          setJob(data);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Gagal memuat job:', err);
        if (isMounted) {
          setError(err.message || 'Gagal memuat status pekerjaan.');
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
  }, [jobId]);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center pt-8 mt-8 border-t border-slate-100">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mb-3" />
        <span className="text-sm text-slate-400">Memuat status...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full border-t border-slate-100 pt-8 mt-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-600">Kesalahan Sinkronisasi</p>
            <p className="text-sm text-slate-500">{error || 'Job tidak ditemukan'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Sedang Menunggu Worker...';
      case 'scraping': return 'Sedang Scraping Data...';
      case 'analyzing': return 'Sedang Analisis AI...';
      case 'completed': return 'Analisis Selesai!';
      case 'error': return 'Terjadi Kesalahan';
      default: return 'Memproses...';
    }
  };

  const progressValue = job.progress || 0;

  return (
    <div className="w-full border-t border-slate-100 pt-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end mb-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Status Analisis</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            {job.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {job.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {getStatusText(job.status)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl sm:text-4xl font-bold text-indigo-600 tabular-nums tracking-tight">{progressValue}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${job.status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-500'}`}
          style={{ width: `${progressValue}%` }}
        />
      </div>

      <div className="mt-4 flex justify-between items-center text-xs font-medium text-slate-400">
        <span className="truncate max-w-[200px] sm:max-w-xs block">{job.target_url}</span>
        <span>ID: {job.id.slice(0, 8)}</span>
      </div>

      {job.message && job.status === 'error' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
           <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
           <div className="space-y-0.5">
             <p className="text-xs font-semibold text-red-700">Pesan Sistem</p>
             <p className="text-sm text-red-600">{job.message}</p>
           </div>
        </div>
      )}

      {job.status === 'completed' && (
        <div className="mt-8">
          <Link
            href={`/result/${job.id}`}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-5 rounded-xl flex items-center justify-center gap-4 hover:opacity-90 transition-opacity shadow-sm group"
          >
            <span className="text-sm font-medium">Lihat Hasil Analisis</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}
