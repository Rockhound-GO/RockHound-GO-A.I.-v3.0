
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black p-6 text-center font-mono">
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 border border-red-500/50 animate-pulse">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-500 mb-2 uppercase tracking-widest">System Critical Failure</h2>
          <p className="text-xs text-red-400/70 mb-6 max-w-xs">{this.state.error?.message || "Unknown Error"}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RefreshCcw className="w-4 h-4" /> Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
