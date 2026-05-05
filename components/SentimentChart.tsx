'use client';

import { CommentData } from '@/lib/types';
import { useLanguage } from '@/components/LanguageContext';

interface SentimentChartProps {
  comments: CommentData[];
}

const content = {
  id: {
    distSentiment: "Distribusi Sentimen",
    pos: "Positif",
    neg: "Negatif",
    neu: "Netral",
    total: "Total Komentar:",
    distAccount: "Distribusi Tipe Akun",
    gen: "Asli",
    sus: "Mencurigakan",
    buz: "Buzzer"
  },
  en: {
    distSentiment: "Sentiment Distribution",
    pos: "Positive",
    neg: "Negative",
    neu: "Neutral",
    total: "Total Comments:",
    distAccount: "Account Type Distribution",
    gen: "Genuine",
    sus: "Suspicious",
    buz: "Buzzer"
  }
};

export default function SentimentChart({ comments }: SentimentChartProps) {
  const { lang } = useLanguage();
  const t = content[lang];
  
  const total = comments.length;
  if (total === 0) return null;

  // Sentiment counts
  const positive = comments.filter(c => c.sentiment === 'POSITIVE').length;
  const negative = comments.filter(c => c.sentiment === 'NEGATIVE').length;
  const neutral = comments.filter(c => c.sentiment === 'NEUTRAL').length;

  // Account type counts
  const genuine = comments.filter(c => c.account_type === 'GENUINE').length;
  const suspicious = comments.filter(c => c.account_type === 'SUSPICIOUS').length;
  const buzzer = comments.filter(c => c.account_type === 'BUZZER').length;

  const pct = (n: number) => ((n / total) * 100).toFixed(1);

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
      {/* Sentimen */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
        <h3 className="text-sm font-semibold text-slate-500 mb-6">
          {t.distSentiment}
        </h3>
        <div className="space-y-5">
          {/* Positive */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-emerald-700">{t.pos}</span>
              <span className="text-sm tabular-nums text-slate-400">{positive} ({pct(positive)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${pct(positive)}%` }} />
            </div>
          </div>
          {/* Negative */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-red-700">{t.neg}</span>
              <span className="text-sm tabular-nums text-slate-400">{negative} ({pct(negative)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500" style={{ width: `${pct(negative)}%` }} />
            </div>
          </div>
          {/* Neutral */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">{t.neu}</span>
              <span className="text-sm tabular-nums text-slate-400">{neutral} ({pct(neutral)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-500 transition-all duration-500" style={{ width: `${pct(neutral)}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">{t.total} {total}</span>
        </div>
      </div>

      {/* Account Type */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
        <h3 className="text-sm font-semibold text-slate-500 mb-6">
          {t.distAccount}
        </h3>
        <div className="space-y-5">
          {/* Genuine */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-700">{t.gen}</span>
              <span className="text-sm tabular-nums text-slate-400">{genuine} ({pct(genuine)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500" style={{ width: `${pct(genuine)}%` }} />
            </div>
          </div>
          {/* Suspicious */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-amber-700">{t.sus}</span>
              <span className="text-sm tabular-nums text-slate-400">{suspicious} ({pct(suspicious)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" style={{ width: `${pct(suspicious)}%` }} />
            </div>
          </div>
          {/* Buzzer */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-purple-700">{t.buz}</span>
              <span className="text-sm tabular-nums text-slate-400">{buzzer} ({pct(buzzer)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-purple-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-500" style={{ width: `${pct(buzzer)}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">{t.total} {total}</span>
        </div>
      </div>
    </div>
  );
}
