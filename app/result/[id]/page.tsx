'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Loader2, AlertCircle, Instagram, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { CommentData } from '@/lib/types';
import SentimentChart from '@/components/SentimentChart';

const COMMENTS_PER_PAGE = 20;

export default function ResultPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/comments/${id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Gagal memuat data komentar.');
        }
        const comments: CommentData[] = await res.json();
        setData(comments);
      } catch (err: any) {
        console.error('Gagal memuat data:', err);
        setError(err.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]);

  const totalPages = Math.ceil(data.length / COMMENTS_PER_PAGE);
  const paginatedData = data.slice(
    (currentPage - 1) * COMMENTS_PER_PAGE,
    currentPage * COMMENTS_PER_PAGE
  );

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = ['Username', 'Komentar', 'Sentimen', 'Tipe Akun'];
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = [
        `"${(row.username || '').replace(/"/g, '""')}"`,
        `"${(row.comment_text || '').replace(/"/g, '""')}"`,
        `"${row.sentiment || 'NEUTRAL'}"`,
        `"${row.account_type || ''}"`,
      ];
      csvRows.push(values.join(','));
    }

    // UTF-8 BOM agar Excel menampilkan karakter Indonesia dengan benar
    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hasil_analisis_${id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (data.length === 0) return;

    // XML Spreadsheet format (Excel dapat membuka ini tanpa library tambahan)
    const escapeXml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const rows = data.map(row =>
      `    <Row>
      <Cell><Data ss:Type="String">${escapeXml(row.username || '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.comment_text || '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.sentiment || 'NEUTRAL')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.account_type || '')}</Data></Cell>
    </Row>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Hasil Analisis">
    <Table>
      <Column ss:Width="120"/>
      <Column ss:Width="400"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">Username</Data></Cell>
        <Cell><Data ss:Type="String">Komentar</Data></Cell>
        <Cell><Data ss:Type="String">Sentimen</Data></Cell>
        <Cell><Data ss:Type="String">Tipe Akun</Data></Cell>
      </Row>
${rows}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hasil_analisis_${id}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full px-6 sm:px-12 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Instagram className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm text-slate-900">Netalyze</span>
          </Link>
        </div>
        <div className="flex gap-8">
          <Link href="/" className="text-sm text-slate-400 cursor-pointer hover:text-slate-900 transition-colors flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
          </Link>
        </div>
      </nav>

      {/* Header */}
      <main className="flex-1 flex flex-col px-4 sm:px-12 py-16 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-500">
              Hasil Analisis
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Ringkasan Sentimen
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Job ID: <span className="font-mono">{id}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              disabled={data.length === 0 || loading}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-3 px-5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
            >
              <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-sm font-medium">CSV</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={data.length === 0 || loading}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-3 px-5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-sm font-medium">Excel</span>
            </button>
          </div>
        </div>

        {/* Dashboard */}
        {!loading && !error && data.length > 0 && (
          <SentimentChart comments={data} />
        )}

        {loading ? (
          <div className="w-full flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-100 bg-white">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-4" />
            <p className="text-sm text-slate-400">Memuat data komentar...</p>
          </div>
        ) : error ? (
          <div className="w-full p-8 rounded-2xl border border-red-100 bg-white flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-lg font-semibold text-slate-900">Terjadi Kesalahan</p>
            <p className="text-sm text-red-500 max-w-md">{error}</p>
          </div>
        ) : (
          <>
            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 w-1/5">Username</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500">Komentar</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 w-[15%]">Sentimen</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 w-[15%]">Tipe Akun</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                      <td className="py-5 px-6 align-top">
                        <span className="font-medium text-sm text-slate-900">@{row.username}</span>
                      </td>
                      <td className="py-5 px-6 align-top">
                        <p className="text-[15px] leading-relaxed text-slate-600">{row.comment_text}</p>
                      </td>
                      <td className="py-5 px-6 align-top">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                          row.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' :
                          row.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {row.sentiment || 'NEUTRAL'}
                        </span>
                      </td>
                      <td className="py-5 px-6 align-top">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                          row.account_type === 'BUZZER' ? 'bg-purple-50 text-purple-700' :
                          row.account_type === 'SUSPICIOUS' ? 'bg-amber-50 text-amber-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>{row.account_type || 'Tidak Diketahui'}</span>
                      </td>
                    </tr>
                  ))}

                  {data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-24 text-center">
                        <p className="text-sm text-slate-400">Tidak ada komentar yang ditemukan untuk analisis ini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 px-2">
                <span className="text-xs text-slate-400">
                  Menampilkan {((currentPage - 1) * COMMENTS_PER_PAGE) + 1}-{Math.min(currentPage * COMMENTS_PER_PAGE, data.length)} dari {data.length} komentar
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages;
                    })
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage !== undefined && page - prevPage > 1;
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && <span className="px-1 text-xs text-slate-300">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 text-sm font-medium rounded-lg flex items-center justify-center transition-colors ${
                              page === currentPage
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-6 sm:px-12 py-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 bg-white/50">
        <span>v1.0.0-beta</span>
        <span className="text-center">&copy; 2026 Dibuat dengan Next.js & Supabase</span>
        <span>Netalyze</span>
      </footer>
    </div>
  );
}
