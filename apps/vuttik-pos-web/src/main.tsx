import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { DialogProvider } from './contexts/DialogContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

import { BrowserRouter } from 'react-router-dom';

import PosApp from './pos/App.tsx';

// Si el subdominio es 'pos', renderizar Vuttik POS
const isPos = window.location.hostname.startsWith('pos.');

// Proxy Google OAuth redirect back to pos.vuttik.com
const params = new URLSearchParams(window.location.search);
if ((params.get('state') === 'pos_google' || params.get('state') === 'pos_facebook') && !isPos) {
  const originalState = params.get('state');
  params.set('state', originalState === 'pos_google' ? 'google' : 'facebook');
  window.location.href = `https://pos.vuttik.com/login?${params.toString()}`;
}

if (isPos) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PosApp />
    </StrictMode>
  );
} else {
  // Renderizar Vuttik Market normal
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
