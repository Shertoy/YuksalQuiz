import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('YuksalQuiz Unhandled Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleHardReset = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {}
      window.location.href = window.location.pathname;
    }
  };

  private handleCopyDetails = () => {
    if (typeof window !== 'undefined' && this.state.error) {
      const details = `Error: ${this.state.error.name}\nMessage: ${this.state.error.message}\nStack: ${this.state.error.stack || ''}\nComponent Stack: ${this.state.errorInfo?.componentStack || ''}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(details).then(() => {
          this.setState({ copied: true });
          setTimeout(() => this.setState({ copied: false }), 2500);
        });
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "Noma'lum xatolik";
      const errName = this.state.error?.name || 'Error';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white font-sans select-none">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-in fade-in">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" strokeWidth={1.75} />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-white">
                Kutilmagan xatolik yuz berdi
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dastur komponentida vaqtinchalik xatolik kuzatildi. Quyidagi tugmalar orqali ilovani qayta ishga tushirishingiz mumkin.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl text-left text-xs font-mono text-red-300 break-words space-y-1">
              <div className="font-bold text-red-400 flex items-center justify-between">
                <span>{errName}</span>
                <button
                  type="button"
                  onClick={this.handleCopyDetails}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 flex items-center gap-1 font-sans"
                >
                  {this.state.copied ? 'Nusxalandi' : 'Nusxa olish'}
                </button>
              </div>
              <p className="text-[11px] text-slate-300">{errMsg}</p>
            </div>

            {/* Expandable technical details */}
            <div className="text-left">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline font-medium"
              >
                {this.state.showDetails ? "Texnik tafsilotlarni yashirish ▲" : "Texnik tafsilotlarni ko'rish ▼"}
              </button>
              {this.state.showDetails && (
                <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {this.state.error?.stack || this.state.errorInfo?.componentStack || "Qo'shimcha stack ma'lumotlari mavjud emas."}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
                <span>Sahifani qayta yuklash</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Bosh sahifaga o'tish</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
