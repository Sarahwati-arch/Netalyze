'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Terjadi Kesalahan
              </h2>
              <p className="text-sm text-slate-500">
                Aplikasi mengalami error yang tidak terduga. Silakan muat ulang halaman.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              Muat Ulang Halaman
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs font-medium text-slate-400 cursor-pointer">
                  Detail Error
                </summary>
                <pre className="mt-2 text-xs text-red-600/70 bg-slate-50 p-3 rounded-xl overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
