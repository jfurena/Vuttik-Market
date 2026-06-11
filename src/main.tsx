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
if (window.location.hostname.startsWith('pos.')) {
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
