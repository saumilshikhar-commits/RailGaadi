import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary wraps child components and catches any render-phase errors.
 * Shows a clean recovery UI instead of crashing the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary-card" role="alert" aria-live="assertive">
          <span className="error-boundary-icon" aria-hidden="true">⚠️</span>
          <div className="error-boundary-content">
            <strong className="error-boundary-title">Something went wrong</strong>
            <span className="error-boundary-msg">
              {this.state.error?.message ?? 'An unexpected error occurred rendering this section.'}
            </span>
            <button className="error-boundary-retry" onClick={this.handleReset}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
