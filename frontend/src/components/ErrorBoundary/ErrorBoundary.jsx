import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-shell p-4">
          <div className="surface-panel max-w-2xl w-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-400/20 rounded-full mb-6 relative">
                <div className="absolute inset-0 bg-red-400/20 rounded-full blur-xl animate-pulse"></div>
                <FiAlertTriangle className="relative text-red-400 text-4xl" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-4">
                Oops! Something went wrong
              </h1>
              
              <p className="text-slate-400 text-base sm:text-lg mb-8">
                We're sorry for the inconvenience. An unexpected error occurred.
              </p>

              {isDev && this.state.error && (
                <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-left border border-slate-800">
                  <p className="text-leather-400 font-mono text-sm mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-slate-500 text-xs overflow-auto max-h-40 scrollbar-thin">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={this.handleReload}
                  className="btn-cricket flex items-center gap-2"
                >
                  <FiRefreshCw />
                  <span>Reload Page</span>
                </button>
                <button
                  onClick={this.handleReset}
                  className="btn-outline flex items-center gap-2"
                >
                  <FiHome />
                  <span>Go Home</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
