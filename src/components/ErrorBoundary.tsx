import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FaceLock ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100 font-sans select-none">
          <div className="max-w-lg w-full rounded-2xl border border-red-500/40 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              FaceLock Guard gặp lỗi hiển thị
            </h2>

            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              Ứng dụng đã tự động bảo vệ trạng thái để ngăn màn hình đen. Vui lòng bấm nút bên dưới để khôi phục lại ứng dụng.
            </p>

            {this.state.error && (
              <div className="mb-5 rounded-xl bg-black/60 p-3 text-left border border-zinc-800 overflow-x-auto max-h-36 font-mono text-xs text-red-300">
                <div className="font-semibold text-red-200 mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap leading-tight">
                    {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Khởi động lại giao diện</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
