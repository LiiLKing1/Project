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
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
          <strong>Menyuni yuklashda xatolik yuz berdi.</strong>
          <br/>Sahifani yangilang.
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginTop: '0.5rem', opacity: 0.7, fontSize: '0.75rem' }}>
              {this.state.error?.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
