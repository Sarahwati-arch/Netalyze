import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LanguageProvider } from '@/components/LanguageContext';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Netalyze - Analisis Sentimen Komentar Instagram',
  description: 'Analisis sentimen komentar Instagram secara otomatis dengan AI. Scraping, analisis, dan ekspor hasil.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="antialiased font-sans bg-white text-slate-900 overflow-x-hidden selection:bg-indigo-600 selection:text-white" suppressHydrationWarning>
        <ErrorBoundary>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
