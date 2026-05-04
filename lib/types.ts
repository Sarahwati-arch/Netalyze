// Shared TypeScript types for Netalyze

export interface JobData {
  id: string;
  target_url: string;
  status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'error';
  progress: number;
  message?: string;
  target_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CommentData {
  id: string;
  job_id: string;
  username: string;
  comment_text: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  account_type: 'GENUINE' | 'SUSPICIOUS' | 'BUZZER';
  created_at?: string;
}
