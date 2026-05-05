import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const JOBS_PER_PAGE = 50;

// GET /api/jobs — List semua jobs dengan jumlah komentar
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const from = (page - 1) * JOBS_PER_PAGE;
    const to = from + JOBS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from('scraping_jobs')
      .select('*, comments_data(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Supabase select error:', error);
      return NextResponse.json(
        { error: 'Gagal memuat riwayat.' },
        { status: 500 }
      );
    }

    // Transform: flatten comments_data count
    const jobs = (data || []).map((job: any) => ({
      ...job,
      comment_count: job.comments_data?.[0]?.count ?? 0,
      comments_data: undefined,
    }));

    return NextResponse.json({
      jobs,
      total: count ?? 0,
      page,
      per_page: JOBS_PER_PAGE,
      total_pages: Math.ceil((count ?? 0) / JOBS_PER_PAGE),
    });
  } catch (err) {
    console.error('API /jobs GET error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await request.json();
    const { target_url } = body;

    if (!target_url || typeof target_url !== 'string') {
      return NextResponse.json(
        { error: 'URL target wajib diisi.' },
        { status: 400 }
      );
    }

    // Validasi URL harus Instagram
    if (!target_url.includes('instagram.com')) {
      return NextResponse.json(
        { error: 'URL harus berasal dari instagram.com' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('scraping_jobs')
      .insert([{ target_url, status: 'pending' }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Gagal membuat job baru.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('API /jobs POST error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
