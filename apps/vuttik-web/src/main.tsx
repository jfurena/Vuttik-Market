import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { DialogProvider } from './contexts/DialogContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

import { BrowserRouter } from 'react-router-dom';

// Proxy Google OAuth redirect back to pos.vuttik.com
const params = new URLSearchParams(window.location.search);
if (params.get('state') === 'pos_google' && !window.location.hostname.startsWith('pos.')) {
  params.set('state', 'google');
  window.location.href = `https://pos.vuttik.com/login?${params.toString()}`;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <DialogProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </DialogProvider>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
