import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServer();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID wajib diisi.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Job tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API /jobs/[id] GET error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
