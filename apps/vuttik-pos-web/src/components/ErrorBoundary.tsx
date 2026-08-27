import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// We use a traditional class component because React ErrorBoundary
// requires componentDidCatch, which only works in class components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ErrorBoundaryBase = class extends Component<Props, State> {
  declare state: State;
  declare props: Props;

  constructor(props: Props) {
    super(props);
    (this as any).state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    (this as any).setState({ errorInfo });
    console.error('App crash captured by ErrorBoundary:', error, errorInfo);
  }

  render() {
    const state = (this as any).state as State;
    const props = (this as any).props as Props;
    
    if (state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#002B49',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: '20px',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>⚠️ Error en la aplicación</h1>
          <div style={{
            background: 'rgba(255,0,0,0.2)',
            border: '1px solid rgba(255,0,0,0.4)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '800px',
            width: '100%',
            fontFamily: 'monospace',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            <strong style={{ color: '#ff6b6b' }}>Error:</strong> {state.error?.message}
            <br /><br />
            <strong style={{ color: '#ff6b6b' }}>Stack:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
              {state.error?.stack}
            </pre>
            <br />
            <strong style={{ color: '#ff6b6b' }}>Componente:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
              {state.errorInfo?.componentStack}
            </pre>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('vuttik_token');
              window.location.reload();
            }}
            style={{
              background: '#22d3ee',
              color: '#002B49',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Limpiar sesión y Reiniciar
          </button>
        </div>
      );
    }
    return props.children;
  }
};

export const ErrorBoundary = ErrorBoundaryBase as unknown as new (props: Props) => Component<Props, State>;
