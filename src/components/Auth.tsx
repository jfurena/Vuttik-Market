import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import {
  GoogleAuthProvider,

interface AuthProps {
  onLogin: () => void;
}

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'business'>('free');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const clearMessages = () => { setError(null); setSuccess(null); };

  const getFirebaseErrorMessage = (code: string): string => {
    const messages: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con este correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/email-already-in-use': 'Este correo ya está registrado.',
      'auth/invalid-email': 'El formato del correo no es válido.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
      'auth/popup-closed-by-user': 'Inicio de sesión cancelado.',
      'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método.',
      'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
    };
    return messages[code] || 'Ocurrió un error. Inténtalo de nuevo.';
  };

  const ensureUserProfile = async (uid: string, userData: { email: string | null; displayName: string | null }) => {
    try {
      await api.getUser(uid);
      // User exists, no action needed for now (or update if needed)
    } catch (err) {
      // User doesn't exist in SQL, create it
      await api.saveUser({
        uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.email === 'jfurena02@gmail.com' ? 'admin' : (selectedPlan === 'business' ? 'business' : 'user'),
        planId: selectedPlan === 'business' ? 'business' : 'free'
      });
    }
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user.uid, {
        email: result.user.email,
        displayName: result.user.displayName,
      });
      onLogin();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    clearMessages();
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      if (FACEBOOK_APP_ID) provider.setCustomParameters({ app_id: FACEBOOK_APP_ID });
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user.uid, {
        email: result.user.email,
        displayName: result.user.displayName,
      });
      onLogin();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (step === 1) { if (!name || !email) { setError('Completa nombre y correo.'); return; } setStep(2); return; }
    if (!password || password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await ensureUserProfile(result.user.uid, { email, displayName: name });
      onLogin();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!resetEmail) { setError('Ingresa tu correo electrónico.'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess(`Se envió un enlace de recuperación a ${resetEmail}`);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex bg-white overflow-hidden">
        <div className="hidden md:flex md:w-1/2 bg-vuttik-navy relative items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-vuttik-blue rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-vuttik-blue rounded-full blur-[100px]"></div>
          </div>
          <div className="relative z-10 max-w-lg text-center">
            <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-8 overflow-hidden p-4">
              <img src="/logo.png" alt="Vuttik Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-4xl font-display font-extrabold text-white mb-6">Vuttik <span className="text-vuttik-cyan">Market</span></h2>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-10">
              <h3 className="text-3xl font-display font-extrabold text-vuttik-navy mb-2">Recuperar Contraseña</h3>
              <p className="text-vuttik-text-muted">Te enviaremos un enlace para restablecer tu contraseña.</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-6">
                  <AlertCircle size={18} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl mb-6">
                  <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                  <p className="text-sm text-green-600 font-medium">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={20} />
                <input type="email" placeholder="Tu correo electrónico" value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-12 py-4 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none" />
              </div>
              <button type="submit" disabled={loading}
                className="vuttik-button !w-full !py-5 !text-lg mt-4 disabled:opacity-60">
                {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                <ArrowRight size={20} />
              </button>
            </form>

            <div className="mt-8 text-center">
              <button onClick={() => { setShowForgotPassword(false); clearMessages(); }}
                className="text-sm font-bold text-vuttik-navy hover:text-vuttik-blue transition-colors">
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* Desktop Visual Side (Left) */}
      <div className="hidden md:flex md:w-1/2 bg-vuttik-navy relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-vuttik-blue rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-vuttik-blue rounded-full blur-[100px]"></div>
        </div>
        
        <div className="relative z-10 max-w-lg text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-8 overflow-hidden p-4"
          >
            <img src="/logo.png" alt="Vuttik Logo" className="w-full h-full object-contain" />
          </motion.div>
          <h2 className="text-4xl lg:text-5xl font-display font-extrabold text-white mb-6 leading-tight">
            Vuttik <span className="text-vuttik-cyan">Market</span>
          </h2>
          <p className="text-white/60 text-lg mb-10">
            La plataforma P2P más segura y moderna para tus intercambios locales.
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              'Verificación Biométrica',
              'Escrow Descentralizado',
              'Soporte 24/7',
              'Cero Comisiones'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <CheckCircle2 size={18} className="text-vuttik-blue" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-12 bg-vuttik-gray md:bg-white overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo */}
          <div className="md:hidden flex flex-col items-center gap-4 mb-10 text-center">
            <div className="w-28 h-28 flex items-center justify-center overflow-hidden bg-white rounded-[2rem] shadow-xl p-4 transition-transform hover:scale-105">
              <img src="/logo.png" alt="Vuttik Logo" className="w-full h-full object-contain" />
            </div>
            <div className="mt-2">
              <h1 className="text-3xl tracking-tight font-display font-black text-vuttik-navy leading-none">Vuttik</h1>
              <span className="text-vuttik-blue font-display font-bold text-xl">Market</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-3xl font-display font-extrabold text-vuttik-navy mb-2">
              {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h3>
            <p className="text-vuttik-text-muted">
              {isLogin ? 'Ingresa tus credenciales para continuar' : 'Comienza tu viaje en el mercado P2P'}
            </p>
          </div>

          {/* Plan Selection (Register only) */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button type="button" onClick={() => setSelectedPlan('free')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedPlan === 'free' ? 'border-vuttik-blue bg-vuttik-blue/5' : 'border-gray-100 hover:border-vuttik-blue/20'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted mb-1">Plan</p>
                <p className="font-bold text-vuttik-navy">Gratis</p>
                <p className="text-[10px] text-vuttik-blue font-bold">$0.00/mes</p>
              </button>
              <button type="button" onClick={() => setSelectedPlan('business')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedPlan === 'business' ? 'border-vuttik-blue bg-vuttik-blue/5' : 'border-gray-100 hover:border-vuttik-blue/20'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted mb-1">Plan</p>
                <p className="font-bold text-vuttik-navy">Business</p>
                <p className="text-[10px] text-vuttik-blue font-bold">$29.99/mes</p>
              </button>
            </div>
          )}

          {/* Step Progress (Register) */}
          {!isLogin && (
            <div className="flex gap-2 mb-6">
              {[1, 2].map((s) => (
                <div key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-vuttik-blue' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          )}

          {/* Error / Success messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-5">
                <AlertCircle size={18} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Social Logins */}
          <div className="grid grid-cols-1 gap-3 mb-5">
            <button type="button" onClick={handleGoogleLogin} disabled={loading}
              className="flex items-center justify-center gap-3 bg-white border border-gray-100 py-3.5 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              <span className="text-sm font-bold text-vuttik-navy">
                {loading ? 'Cargando...' : 'Continuar con Google'}
              </span>
            </button>

            <button type="button" onClick={handleFacebookLogin} disabled={loading}
              className="flex items-center justify-center gap-3 bg-[#1877F2] py-3.5 rounded-2xl hover:bg-[#166fe5] transition-colors shadow-sm disabled:opacity-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm font-bold text-white">
                {loading ? 'Cargando...' : 'Continuar con Facebook'}
              </span>
            </button>
          </div>

          <div className="relative flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">O con correo</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {/* Email/Password Form */}
          <form className="space-y-4" onSubmit={isLogin ? handleEmailLogin : handleEmailRegister}>
            {/* Name — only register step 1 */}
            <AnimatePresence>
              {!isLogin && step === 1 && (
                <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={20} />
                    <input type="text" placeholder="Nombre completo" value={name}
                      onChange={e => { setName(e.target.value); clearMessages(); }}
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-12 py-4 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email — login or register step 1 */}
            {(isLogin || step === 1) && (
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={20} />
                <input type="email" placeholder="Correo electrónico" value={email}
                  onChange={e => { setEmail(e.target.value); clearMessages(); }}
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-12 py-4 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none" />
              </div>
            )}

            {/* Password — login or register step 2 */}
            <AnimatePresence>
              {(isLogin || step === 2) && (
                <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={20} />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password}
                      onChange={e => { setPassword(e.target.value); clearMessages(); }}
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-12 py-4 pr-14 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted hover:text-vuttik-navy transition-colors">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forgot password link */}
            {isLogin && (
              <div className="flex justify-end">
                <button type="button" onClick={() => { setShowForgotPassword(true); clearMessages(); setResetEmail(email); }}
                  className="text-sm font-semibold text-vuttik-blue hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="vuttik-button !w-full !py-5 !text-lg mt-2 disabled:opacity-60">
              {loading ? 'Cargando...' : isLogin ? 'Entrar' : step === 2 ? 'Crear Cuenta' : 'Siguiente'}
              <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-vuttik-text-muted text-sm">
              {isLogin ? '¿No tienes una cuenta?' : '¿Ya eres miembro?'}
              <button
                onClick={() => { setIsLogin(!isLogin); setStep(1); clearMessages(); setName(''); setEmail(''); setPassword(''); }}
                className="ml-2 font-bold text-vuttik-navy hover:text-vuttik-blue transition-colors"
              >
                {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
