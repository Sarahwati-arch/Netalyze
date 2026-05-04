import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

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
