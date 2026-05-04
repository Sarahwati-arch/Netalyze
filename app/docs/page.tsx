'use client';

import Link from 'next/link';
import { Instagram, ArrowLeft, BookOpen, BarChart3, MessageCircle, Info } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const content = {
  id: {
    back: 'Kembali',
    title: 'Panduan Penggunaan',
    desc: 'Pelajari cara menggunakan Netalyze untuk mengekstraksi dan menganalisis sentimen dari komentar Instagram secara otomatis.',
    sec1: '1. Cara Memulai Analisis',
    sec1Desc: 'Netalyze dirancang agar sangat mudah digunakan. Anda hanya memerlukan URL dari postingan Instagram yang ingin dianalisis.',
    step1: 'Langkah 1',
    step1Desc: 'Buka Instagram dan salin tautan (URL) dari postingan target. Contoh:',
    step2: 'Langkah 2',
    step2Desc: 'Tempelkan URL tersebut ke kolom pencarian di halaman utama Netalyze dan klik Mulai Analisis.',
    step3: 'Langkah 3',
    step3Desc: 'Sistem akan menjadwalkan tugas. Tunggu hingga proses scraping dan analisis sentimen selesai.',
    note: 'Catatan Penting: Pastikan akun atau postingan Instagram target bersifat publik (tidak dikunci/private) agar sistem dapat membaca komentar.',
    
    sec2: '2. Membaca Hasil Analisis',
    sec2Desc: 'Setelah analisis selesai, Netalyze menggunakan kecerdasan buatan (AI) untuk mengelompokkan opini publik ke dalam kategori sentimen yang mudah dipahami.',
    posTitle: 'Sentimen Positif',
    posDesc: 'Komentar yang mengandung pujian, dukungan, persetujuan, kebahagiaan, atau opini membangun yang menguntungkan subjek postingan.',
    negTitle: 'Sentimen Negatif',
    negDesc: 'Komentar yang berisi kritikan, keluhan, kemarahan, atau ketidaksetujuan terhadap isi dari postingan.',
    neuTitle: 'Sentimen Netral',
    neuDesc: 'Komentar yang hanya bersifat informatif, pertanyaan biasa, sekadar tag teman (@mention) tanpa konteks opini yang kuat, atau ucapan basa-basi.',
    
    sec3: '3. Analisis Tipe Akun',
    sec3Desc: 'Selain menganalisis sentimen dari isi komentar, Netalyze juga mengidentifikasi tipe akun dari setiap komentator. Fitur ini membantu Anda membedakan antara respon dari audiens riil, interaksi dari sesama kreator, hingga potensi spam atau bot.',
    genDesc: 'Akun pengguna asli dengan interaksi yang wajar dan organik. Komentar dari akun tipe ini merupakan representasi opini audiens yang sesungguhnya.',
    susDesc: 'Akun yang menunjukkan pola aktivitas tidak biasa, seperti komentar repetitif, menggunakan banyak template, atau memiliki indikasi spam ringan.',
    buzDesc: 'Akun yang terindikasi kuat dikendalikan untuk tujuan tertentu (kampanye opini, promosi berbayar, atau bot). Cenderung membanjiri komentar dengan narasi yang sama.',
    
    sec4: '4. Fitur Ringkasan & Tema AI',
    sec4Desc: 'Selain persentase sentimen, Netalyze juga menyediakan:',
    sum1: 'Ringkasan Eksekutif:',
    sum1Desc: 'Rangkuman naratif singkat buatan AI mengenai topik utama apa saja yang sedang dibicarakan oleh netizen di kolom komentar.',
    sum2: 'Tema Dominan:',
    sum2Desc: 'Keyword atau tag sentimen kunci yang paling sering muncul (misal: "Kualitas Produk Baik", "Pengiriman Terlambat", "Pertanyaan Harga").',
    sum3: 'List Komentar Terbaik & Terburuk:',
    sum3Desc: 'Sorotan terhadap beberapa komentar aktual yang sangat merepresentasikan opini mayoritas positif atau negatif.'
  },
  en: {
    back: 'Back',
    title: 'User Guide',
    desc: 'Learn how to use Netalyze to automatically extract and analyze sentiments from Instagram comments.',
    sec1: '1. How to Start Analysis',
    sec1Desc: 'Netalyze is designed to be very easy to use. You only need the URL of the target Instagram post.',
    step1: 'Step 1',
    step1Desc: 'Open Instagram and copy the link (URL) of the target post. Example:',
    step2: 'Step 2',
    step2Desc: 'Paste the URL into the search field on the Netalyze homepage and click Start Analysis.',
    step3: 'Step 3',
    step3Desc: 'The system will schedule the task. Wait for the scraping and sentiment analysis process to finish.',
    note: 'Important Note: Ensure the target Instagram account or post is public (not locked/private) so the system can read the comments.',
    
    sec2: '2. Reading Analysis Results',
    sec2Desc: 'Once the analysis is complete, Netalyze uses Artificial Intelligence (AI) to categorize public opinions into easy-to-understand sentiment categories.',
    posTitle: 'Positive Sentiment',
    posDesc: 'Comments containing praise, support, agreement, happiness, or constructive opinions favorable to the post subject.',
    negTitle: 'Negative Sentiment',
    negDesc: 'Comments containing criticism, complaints, anger, or disagreement with the post content.',
    neuTitle: 'Neutral Sentiment',
    neuDesc: 'Comments that are merely informative, casual questions, simple friend tags (@mention) without strong opinions, or pleasantries.',
    
    sec3: '3. Account Type Analysis',
    sec3Desc: 'In addition to analyzing comment sentiment, Netalyze identifies the account type of each commenter. This feature helps distinguish between real audience responses, creator interactions, and potential spam or bots.',
    genDesc: 'Real user accounts with natural and organic interactions. Comments from these accounts represent genuine audience opinions.',
    susDesc: 'Accounts showing unusual activity patterns, such as repetitive comments, heavy use of templates, or mild spam indications.',
    buzDesc: 'Accounts strongly indicated to be controlled for specific purposes (opinion campaigns, paid promotions, or bots). They tend to flood comments with the same narrative.',
    
    sec4: '4. AI Summary & Theme Features',
    sec4Desc: 'Besides sentiment percentages, Netalyze also provides:',
    sum1: 'Executive Summary:',
    sum1Desc: 'A short, AI-generated narrative summary of the main topics being discussed by netizens in the comments.',
    sum2: 'Dominant Themes:',
    sum2Desc: 'The most frequently appearing keywords or key sentiment tags (e.g., "Good Product Quality", "Late Delivery", "Price Inquiry").',
    sum3: 'Best & Worst Comments List:',
    sum3Desc: 'Highlights of several actual comments that highly represent the positive or negative majority opinion.'
  }
};

export default function DocumentationPage() {
  const { lang, setLang } = useLanguage();
  const t = content[lang];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full px-6 sm:px-12 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100">
        <Link href="/" className="flex items-center gap-3 group">
          <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          <span className="font-medium text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{t.back}</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-slate-100/50 rounded-full p-1 border border-slate-200/50">
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
          <div className="flex items-center gap-3 hidden sm:flex">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Instagram className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm text-slate-900">Netalyze</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 sm:py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            {t.title}
          </h1>
          <p className="text-lg text-slate-600">
            {t.desc}
          </p>
        </div>

        <div className="space-y-12">
          {/* Section 1: Cara Kerja */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">{t.sec1}</h2>
            </div>

            <div className="space-y-6 text-slate-600">
              <p>{t.sec1Desc}</p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-900 mb-2">{t.step1}</div>
                  <p className="text-sm">{t.step1Desc} <br/><code className="bg-slate-200 px-1 py-0.5 rounded text-xs text-slate-800 break-all mt-2 inline-block">https://www.instagram.com/p/ABC123/</code></p>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-900 mb-2">{t.step2}</div>
                  <p className="text-sm">{t.step2Desc}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-900 mb-2">{t.step3}</div>
                  <p className="text-sm">{t.step3Desc}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm mt-6">
                <Info className="w-5 h-5 shrink-0" />
                <p>
                  <strong>{t.note.split(':')[0]}:</strong> {t.note.split(':')[1]}
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Membaca Metrik */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">{t.sec2}</h2>
            </div>

            <div className="space-y-6 text-slate-600">
              <p>{t.sec2Desc}</p>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{t.posTitle}</h3>
                    <p className="text-sm">{t.posDesc}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/50 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{t.negTitle}</h3>
                    <p className="text-sm">{t.negDesc}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-100/50 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{t.neuTitle}</h3>
                    <p className="text-sm">{t.neuDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2.5: Analisis Tipe Akun */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                <Instagram className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">{t.sec3}</h2>
            </div>

            <div className="space-y-6 text-slate-600">
              <p>{t.sec3Desc}</p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                  <h3 className="font-semibold text-blue-900 mb-2">Genuine</h3>
                  <p className="text-sm text-blue-800/80">{t.genDesc}</p>
                </div>

                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                  <h3 className="font-semibold text-amber-900 mb-2">Suspicious</h3>
                  <p className="text-sm text-amber-800/80">{t.susDesc}</p>
                </div>

                <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50">
                  <h3 className="font-semibold text-purple-900 mb-2">Buzzer</h3>
                  <p className="text-sm text-purple-800/80">{t.buzDesc}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Ringkasan AI */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">{t.sec4}</h2>
            </div>

            <div className="space-y-4 text-slate-600">
              <p>{t.sec4Desc}</p>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li><strong>{t.sum1}</strong> {t.sum1Desc}</li>
                <li><strong>{t.sum2}</strong> {t.sum2Desc}</li>
                <li><strong>{t.sum3}</strong> {t.sum3Desc}</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
