'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Receives the caught error. */
  fallback?: (error: Error) => ReactNode;
  /** Short label used in the default fallback message. */
  label?: string;
}

/**
 * Generic React Error Boundary (class component — required by React APIs).
 *
 * Catches render/lifecycle errors in the subtree and shows a graceful
 * fallback instead of letting a crash propagate to the root.
 *
 * Usage:
 *   <ErrorBoundary label="Streaming response">
 *     <StreamingBubble />
 *   </ErrorBoundary>
 *
 * The boundary resets when the user clicks "Try again", making it suitable
 * for recoverable failures (e.g. a single malformed SSE frame that causes a
 * render crash inside ToolEventCard).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, label = 'This section' } = this.props;

    if (!hasError || !error) return children;

    if (fallback) return fallback(error);

    return (
      <div className="flex items-start gap-3 px-4 py-3 my-2 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label} encountered an unexpected error.</p>
          <p className="mt-1 text-xs text-red-400/70 truncate">{error.message}</p>
          <button
            onClick={this.reset}
            className="mt-2 text-xs underline underline-offset-2 text-red-400 hover:text-red-300 cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
