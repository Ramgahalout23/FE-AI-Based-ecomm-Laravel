import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Component } from 'react';
import { withTranslation } from 'react-i18next';

;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = this.props.fallbackPath || '/admin';
    }
  };

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div role="alert" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>

          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '8px',
            fontFamily: '"Cabinet Grotesk", system-ui, sans-serif',
          }}>
            {this.props.title || t('error_boundary.something_wrong')}
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#8a8a9a',
            maxWidth: '400px',
            lineHeight: 1.5,
            marginBottom: '32px',
          }}>
            {this.props.description || t('error_boundary.description')}
          </p>

          {import.meta.env.MODE === 'development' && this.state.error && (
            <details style={{
              marginBottom: '24px',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left',
              fontSize: '12px',
              color: '#666',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>
                {t('error_boundary.error_details')}
              </summary>
              <pre style={{
                background: '#f8f9fa',
                border: '1px solid #e8e8e8',
                borderRadius: '8px',
                padding: '12px',
                overflow: 'auto',
                maxHeight: '200px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack || ''}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: '#1a1a1a',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
            >
              <RefreshCw size={16} />
              {t('error_boundary.try_again')}
            </button>

            <button
              onClick={this.handleGoBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                background: 'white',
                color: '#1a1a1a',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#ccc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <ArrowLeft size={16} />
              {t('error_boundary.go_back')}
            </button>
          </div>

          {this.props.showRefreshPrompt !== false && (
            <p style={{
              marginTop: '24px',
              fontSize: '12px',
              color: '#aaa',
            }}>
              {t('error_boundary.refresh_prompt')}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
