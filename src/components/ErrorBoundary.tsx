import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('YuksalQuiz Unhandled Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white font-sans select-none">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-base font-black text-white">
              Kutilmagan xatolik yuz berdi
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Dasturda vaqtinchalik xatolik kuzatildi. Iltimos, sahifani qayta yuklang yoki testni qaytadan boshlang.
            </p>

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ilovani qayta yuklash</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
