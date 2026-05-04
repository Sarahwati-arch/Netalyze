import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = getSupabaseServer();
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID wajib diisi.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('comments_data')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data komentar.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API /comments/[jobId] GET error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
