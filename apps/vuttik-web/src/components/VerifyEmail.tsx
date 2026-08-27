import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { MailCheck, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, login, token: authToken } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu correo...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El enlace de verificación no es válido.');
      return;
    }

    api.verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Tu correo ha sido verificado exitosamente.');
        
        // If user is already logged in, update their context state
        if (user && authToken) {
          login(authToken, { ...user, emailVerified: true });
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'El enlace de verificación ha expirado o no es válido.');
      });
  }, [token, user, authToken, login]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 max-w-md w-full shadow-xl flex flex-col items-center text-center gap-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-vuttik-blue animate-spin" />
            <h2 className="text-2xl font-black text-vuttik-navy mt-4">Verificando</h2>
            <p className="text-vuttik-text-muted">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <MailCheck className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-black text-vuttik-navy mt-4">¡Verificado!</h2>
            <p className="text-vuttik-text-muted">{message}</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-6 bg-vuttik-blue text-white w-full py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Ir a la plataforma
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500" />
            <h2 className="text-2xl font-black text-vuttik-navy mt-4">Error de Verificación</h2>
            <p className="text-vuttik-text-muted">{message}</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-6 bg-gray-200 text-vuttik-navy w-full py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
            >
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
