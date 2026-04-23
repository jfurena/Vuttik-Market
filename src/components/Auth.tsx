import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface AuthProps {
  onLogin: () => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

function Auth({ onLogin }: AuthProps) {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'business'>('free'); // Can optionally be passed to API later if needed
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

  // Handle OAuth Redirect processing on mount
  useEffect(() => {
    const processOAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (code && state) {
        setLoading(true);
        try {
          // Remove query params to clean URL
          window.history.replaceState({}, document.title, '/');
          
          let response;
          const googleRedirectUri = window.location.origin;
          const facebookRedirectUri = window.location.origin + '/';
          
          if (state === 'google') {
            response = await api.googleCallback({ code, redirect_uri: googleRedirectUri });
          } else if (state === 'facebook') {
            response = await api.facebookCallback({ code, redirect_uri: facebookRedirectUri });
          }

          if (response?.user && response?.token) {
              login(response.token, response.user);
              onLogin();
          }
        } catch (err: any) {
          setError(err.message || 'Error de autenticación. Intenta de nuevo.');
        } finally {
          setLoading(false);
        }
      }
    };
    processOAuth();
  }, []);

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google login is not configured on this environment.');
      return;
    }
    setLoading(true);
    const redirectUri = window.location.origin;
    const scope = 'openid email profile';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=google`;
  };

  const handleFacebookLogin = () => {
    if (!FACEBOOK_APP_ID) {
      setError('Facebook login is not configured.');
      return;
    }
    setLoading(true);
    const redirectUri = window.location.origin + '/';
    const scope = 'email,public_profile';
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=facebook`;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      const response = await api.login({ email, password });
      login(response.token, response.user);
      onLogin();
    } catch (err: any) {
      // Very basic error handling, assuming JSON api throws with error string
      setError(err.message || 'Credenciales inválidas.');
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
      const response = await api.register({ name, email, password });
      login(response.token, response.user);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Error al registrar la cuenta.');
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
      // NOTE: Password reset requires a separate token flow we can implement later.
      // For now, simulate or notify user it's unsupported in manual basic flow
      setError('Recuperación de contraseña está deshabilitada en este momento.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER FORGOT PASSWORD ---
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 mesh-gradient-premium">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center mb-10">
            <motion.img 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src="/logo_solo.png" 
              alt="Vuttik Logo" 
              className="w-32 h-32 mx-auto mb-6 object-contain" 
            />
            <h2 className="text-3xl font-display font-black text-white mb-2">Recuperar Acceso</h2>
            <p className="text-vuttik-text-muted">Ingresa tu correo y te contactaremos.</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3">
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-vuttik-cyan/10 text-vuttik-cyan border border-vuttik-cyan/20 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3">
                  <CheckCircle2 size={20} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form className="space-y-6" onSubmit={handleForgotPassword}>
              <div className="vuttik-input-group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted/50 z-10" size={20} />
                <input type="email" placeholder=" " value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  className="vuttik-input-field" />
                <label className="vuttik-floating-label">Email</label>
              </div>
              <button type="submit" disabled={loading}
                className="vuttik-button !w-full !py-5 !text-lg mt-4 disabled:opacity-60 group">
                {loading ? 'Enviando...' : 'Enviar enlace'}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <button onClick={() => { setShowForgotPassword(false); clearMessages(); }}
              className="mt-8 flex items-center justify-center gap-2 text-vuttik-text-muted hover:text-white transition-colors text-sm font-bold w-full">
              <ArrowLeft size={16} /> Volver al Inicio
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- RENDER MAIN AUTH ---
  return (
    <div className="auth-split-layout">
      {/* LEFT PANE: BRAND HERO (DESKTOP ONLY) */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hero-pane"
      >
        <div className="hero-spotlight" />
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="mb-10 inline-block"
          >
            <img src="/favicon.png" alt="Vuttik Logo" className="w-48 h-48 md:w-64 md:h-64 object-contain filter drop-shadow-[0_0_80px_rgba(34,211,238,0.2)]" />
          </motion.div>
          <h1 className="stitch-hero-text !mb-4">
            Vuttik <span className="text-vuttik-cyan">Market</span>
          </h1>
          <p className="text-vuttik-text-muted text-xl font-medium tracking-wide max-w-sm mx-auto leading-relaxed">
            La plataforma líder de intercambio con <span className="text-vuttik-blue">seguridad de grado bancario</span>.
          </p>
        </div>
      </motion.div>

      {/* RIGHT PANE: ACTION FORM */}
      <div className="form-pane overflow-y-auto no-scrollbar py-12">
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-[480px] w-full"
        >
          {/* Mobile-only Branding */}
          <div className="lg:hidden text-center mb-10">
            <img src="/favicon.png" alt="Vuttik Logo" className="w-24 h-24 mx-auto mb-4" />
            <h1 className="text-4xl font-display font-black text-vuttik-navy">Vuttik <span className="text-vuttik-cyan">Market</span></h1>
          </div>

          <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
            {/* Subtle light effect for form */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-vuttik-blue/5 blur-[80px] pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-display font-black text-vuttik-navy">{isLogin ? 'Bienvenido' : 'Únete'}</h2>
                <p className="text-vuttik-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-60">
                  {isLogin ? 'Acceso Seguro' : 'Nueva Cuenta'}
                </p>
              </div>
              <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                <button 
                  onClick={() => { setIsLogin(true); clearMessages(); }}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${isLogin ? 'bg-white text-vuttik-deep shadow-sm scale-[1.02] border border-gray-100' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
                >
                  Entrar
                </button>
                <button 
                  onClick={() => { setIsLogin(false); clearMessages(); }}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${!isLogin ? 'bg-white text-vuttik-deep shadow-sm scale-[1.02] border border-gray-100' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
                >
                  Unirme
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-red-500/10 text-red-400 border border-red-500/10 p-4 rounded-2xl mb-8 text-sm flex items-center gap-3">
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-vuttik-cyan/10 text-vuttik-cyan border border-vuttik-cyan/10 p-4 rounded-2xl mb-8 text-sm flex items-center gap-3">
                  <CheckCircle2 size={20} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <button type="button" onClick={handleGoogleLogin} disabled={loading} className="social-button">
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 opacity-80" alt="Google" />
                <span className="text-[10px] font-black uppercase tracking-widest">Google</span>
              </button>
              <button type="button" onClick={handleFacebookLogin} disabled={loading} className="social-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Facebook</span>
              </button>
            </div>

            <div className="relative flex items-center gap-4 mb-10">
              <div className="flex-1 h-[1px] bg-white/5"></div>
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Continuar con</span>
              <div className="flex-1 h-[1px] bg-white/5"></div>
            </div>

            <AnimatePresence mode="wait">
              <motion.form 
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                className="space-y-6" 
                onSubmit={isLogin ? handleEmailLogin : handleEmailRegister}
              >
                {!isLogin && step === 1 && (
                  <div className="vuttik-input-group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted/40 z-10" size={20} />
                    <input type="text" placeholder=" " value={name} onChange={e => { setName(e.target.value); clearMessages(); }}
                      className="vuttik-input-field" />
                    <label className="vuttik-floating-label">Nombre</label>
                  </div>
                )}

                {(isLogin || step === 1) && (
                  <div className="vuttik-input-group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted/40 z-10" size={20} />
                    <input type="email" placeholder=" " value={email} onChange={e => { setEmail(e.target.value); clearMessages(); }}
                      className="vuttik-input-field" />
                    <label className="vuttik-floating-label">Email</label>
                  </div>
                )}

                {(isLogin || step === 2) && (
                  <div className="vuttik-input-group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted/40 z-10" size={20} />
                    <input type={showPassword ? 'text' : 'password'} placeholder=" " value={password} onChange={e => { setPassword(e.target.value); clearMessages(); }}
                      className="vuttik-input-field pr-14" />
                    <label className="vuttik-floating-label">Contraseña</label>
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted hover:text-vuttik-navy transition-colors z-20">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}

                {isLogin && (
                  <div className="flex justify-end mt-[-10px]">
                    <button type="button" onClick={() => { setShowForgotPassword(true); clearMessages(); setResetEmail(email); }}
                      className="text-[10px] font-black text-vuttik-cyan/60 hover:text-vuttik-cyan uppercase tracking-widest transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="vuttik-button !w-full !py-5 !text-lg !rounded-[1.5rem] mt-6 disabled:opacity-60 group shadow-vuttik-blue/20">
                  {loading ? 'Cargando...' : isLogin ? 'Entrar Ahora' : step === 2 ? 'Finalizar' : 'Continuar'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.form>
            </AnimatePresence>
          </div>

          <p className="mt-10 text-center text-vuttik-text-muted text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
            Al entrar aceptas los <span className="text-vuttik-navy cursor-pointer hover:text-vuttik-cyan transition-colors">Términos</span> <br className="lg:hidden" /> & <span className="text-vuttik-navy cursor-pointer hover:text-vuttik-cyan transition-colors">Privacidad</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
