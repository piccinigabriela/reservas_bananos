import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public handleClearSession = () => {
    localStorage.removeItem('bn_remembered_user');
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#2A2118] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white border border-[#EAE0D2] rounded-3xl p-8 max-w-md w-full shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-[#2A2118]">
              Cabañas Los Bananos
            </h2>
            <p className="text-xs text-[#7A6752]">
              Ocurrió un pequeño inconveniente al cargar esta vista.
            </p>
            {this.state.error && (
              <pre className="text-[10px] bg-slate-100 text-slate-700 p-2.5 rounded-xl overflow-x-auto text-left max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar Sistema</span>
              </button>
              <button
                onClick={this.handleClearSession}
                className="w-full py-2 px-4 rounded-xl bg-[#FAF5EE] hover:bg-[#EAE0D2] text-[#7A6752] font-semibold text-xs border border-[#D4C3AE] transition cursor-pointer"
              >
                Volver a la Pantalla de PIN
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
