import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10 text-center">
          <h1 className="text-4xl font-black text-rose-500 italic mb-4">SYSTEM INTERRUPTED</h1>
          <p className="text-slate-400 max-w-md mb-8">{this.state.error?.message || 'A critical rendering error occurred.'}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-white/10 transition-all"
          >
            Reset Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
