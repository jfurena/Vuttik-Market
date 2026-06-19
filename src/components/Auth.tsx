import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff, AlertCircle, ArrowLeft, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface AuthProps {
  onLogin: () => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

declare global {
  interface Window {
    ethereum?: any;
  }
}

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
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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

  const handleWalletLogin = async () => {
    try {
      if (!window.ethereum) {
        setError('No se detectó ninguna billetera (MetaMask). Instálala para continuar.');
        return;
      }
      setLoading(true);
      clearMessages();
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No se seleccionó ninguna cuenta.');
      }
      const address = accounts[0];
      
      // Get nonce from backend
      const { nonce } = await api.getWalletNonce(address);
      if (!nonce) throw new Error('No se pudo obtener el nonce del servidor.');
      
      // Sign message
      const message = `Iniciando sesión en Vuttik Market. Nonce: ${nonce}`;
      // In web3/MetaMask, message is often hex encoded or just passed as utf8 string depending on method.
      // personal_sign expects string hex or utf8 depending on provider version, standard is hex or raw string.
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      
      if (!signature) throw new Error('Firma cancelada.');
      
      // Verify signature on backend
      const response = await api.verifyWalletSignature(address, signature);
      login(response.token, response.user);
      onLogin();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar la billetera.');
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
    if (!resetEmail) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.requestPasswordReset(resetEmail);
      setSuccess(res.message || 'Se ha enviado un enlace a tu correo.');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Inténtalo de nuevo.');
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
            <p className="text-vuttik-text-muted">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
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
    <div className="min-h-screen flex w-full bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* LEFT PANE: BRAND HERO (DESKTOP ONLY) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex flex-col flex-1 p-12 relative overflow-hidden bg-slate-950 justify-between animate-fade-in"
      >
        <motion.img 
          initial={{ scale: 1.02 }}
          animate={{ scale: 1 }}
          transition={{ duration: 25, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
          src="/auth_bg.png" 
          alt="Premium E-commerce" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[15s] pointer-events-none"
        />
        {/* Navy tint to integrate the image with the brand colors and ensure text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30 pointer-events-none" />
        <div className="absolute inset-0 bg-blue-950/35 mix-blend-color pointer-events-none" />
        
        <div className="relative z-10 max-w-xl mt-auto mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl lg:text-7xl font-display font-black text-white mb-6 leading-[1.05] tracking-tight"
          >
            El mercado en<br/><span className="text-[#38bdf8]">tiempo real.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-slate-300 text-xl leading-relaxed mb-10 font-medium font-sans opacity-90 max-w-md"
          >
            Conectando compradores y vendedores al instante.
          </motion.p>
        </div>
        
        <div className="relative z-10 flex items-center justify-between pt-8">
           <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
             <img src="/logo_solo.png" alt="Vuttik" className="h-6 w-6 object-contain" />
             <span className="text-white font-bold tracking-widest text-sm">VUTTIK</span>
           </div>
           <p className="text-white/50 text-xs font-semibold tracking-widest uppercase">
            © {new Date().getFullYear()} Todos los derechos reservados
           </p>
        </div>
      </motion.div>

      {/* RIGHT PANE: ACTION FORM */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-col items-center justify-center w-full lg:w-[540px] xl:w-[600px] p-6 sm:p-12 bg-white overflow-y-auto"
      >
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-4 md:mb-8">
            <img src="/logo.png" alt="Vuttik Logo" className="h-12 md:h-16 mx-auto mb-3 md:mb-6 object-contain" />
            <h2 className="text-2xl md:text-3xl font-display font-black text-vuttik-navy mb-1 md:mb-2">{isLogin ? 'Bienvenido de vuelta' : 'Únete a Vuttik'}</h2>
            <p className="text-vuttik-text-muted text-xs md:text-sm">{isLogin ? 'Ingresa tus credenciales para continuar.' : 'Crea tu cuenta ahora.'}</p>
          </div>

          <div className="bg-gray-50/70 p-1.5 rounded-2xl flex mb-4 md:mb-8 border border-gray-100">
            <button 
              onClick={() => { setIsLogin(true); clearMessages(); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-white text-vuttik-navy shadow-sm' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setIsLogin(false); clearMessages(); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-white text-vuttik-navy shadow-sm' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
            >
              Registrarme
            </button>
          </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-red-500/10 text-red-500 border border-red-500/10 p-4 rounded-2xl mb-8 text-sm flex items-center gap-3">
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

            <AnimatePresence mode="wait">
              <motion.form 
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                className="space-y-3 md:space-y-5" 
                onSubmit={isLogin ? handleEmailLogin : handleEmailRegister}
              >
                {!isLogin && step === 1 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-vuttik-navy">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                      <input type="text" placeholder="Ej. Juan Pérez" value={name} onChange={e => { setName(e.target.value); clearMessages(); }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:border-[#1E62FF] focus:ring-4 focus:ring-[#1E62FF]/10 transition-all text-sm" />
                    </div>
                  </div>
                )}

                {(isLogin || step === 1) && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-vuttik-navy">Correo electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                      <input type="email" placeholder="tu@correo.com" value={email} onChange={e => { setEmail(e.target.value); clearMessages(); }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:border-[#1E62FF] focus:ring-4 focus:ring-[#1E62FF]/10 transition-all text-sm" />
                    </div>
                  </div>
                )}

                {(isLogin || step === 2) && (
                  <div className="flex flex-col gap-1.5 relative">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-vuttik-navy">Contraseña</label>
                      {isLogin && (
                        <button type="button" onClick={() => { setShowForgotPassword(true); clearMessages(); setResetEmail(email); }}
                          className="text-[11px] font-bold text-[#1E62FF] hover:underline transition-colors">
                          ¿Olvidaste tu contraseña?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); clearMessages(); }}
                        className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:border-[#1E62FF] focus:ring-4 focus:ring-[#1E62FF]/10 transition-all text-sm" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full mt-2 md:mt-4 py-3 md:py-3.5 bg-[#1E62FF] hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                  {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : step === 2 ? 'Finalizar' : 'Continuar'}
                  <ArrowRight size={18} />
                </button>
              </motion.form>
            </AnimatePresence>

            <div className="relative flex items-center gap-4 my-4 md:my-8">
              <div className="flex-1 h-[1px] bg-gray-200"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">o</span>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all hover:-translate-y-1 shadow-sm" title="Continuar con Google">
                <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
              </button>
              <button type="button" onClick={handleFacebookLogin} disabled={loading} className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-all hover:-translate-y-1 shadow-sm" title="Continuar con Facebook">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
              <button type="button" onClick={handleWalletLogin} disabled={loading} className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center hover:bg-orange-50 transition-all hover:-translate-y-1 shadow-sm" title="Conectar Billetera">
                <svg width="28" height="28" viewBox="0 0 118 118" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M116.326 47.9304L59.0003 4.20508L1.67432 47.9304L23.491 113.795H94.5097L116.326 47.9304Z" fill="#E2761B"/>
                  <path d="M94.5097 113.795L116.326 47.9304L59.0003 76.5414L94.5097 113.795Z" fill="#E4761B"/>
                  <path d="M23.491 113.795L1.67432 47.9304L59.0003 76.5414L23.491 113.795Z" fill="#E4761B"/>
                  <path d="M59.0003 4.20508L40.7163 47.9304L59.0003 76.5414L77.2843 47.9304L59.0003 4.20508Z" fill="#E4761B"/>
                  <path d="M1.67432 47.9304L40.7163 47.9304L59.0003 4.20508L1.67432 47.9304Z" fill="#D7C1B3"/>
                  <path d="M116.326 47.9304L77.2843 47.9304L59.0003 4.20508L116.326 47.9304Z" fill="#D7C1B3"/>
                  <path d="M59.0003 76.5414L77.2843 47.9304H40.7163L59.0003 76.5414Z" fill="#233447"/>
                  <path d="M59.0003 76.5414L94.5097 113.795H23.491L59.0003 76.5414Z" fill="#CD6116"/>
                </svg>
              </button>
            </div>

          <p className="mt-4 md:mt-8 text-center text-[10px] md:text-xs text-vuttik-text-muted font-medium">
            Al acceder aceptas los <button onClick={() => setShowTerms(true)} className="text-vuttik-navy font-bold hover:underline cursor-pointer bg-transparent border-none p-0 outline-none">Términos de Uso</button> y la <button onClick={() => setShowPrivacy(true)} className="text-vuttik-navy font-bold hover:underline cursor-pointer bg-transparent border-none p-0 outline-none">Política de Privacidad</button>.
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-2xl font-black font-display text-vuttik-navy">Términos de Uso</h2>
                <button
                  onClick={() => setShowTerms(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 prose prose-sm text-gray-600">
                <h3 className="text-lg font-bold text-gray-900">1. Aceptación de los Términos</h3>
                <p>Al acceder y utilizar Vuttik Market, aceptas cumplir con estos Términos de Uso. Si no estás de acuerdo con alguna parte de los términos, no podrás acceder al servicio.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">2. Descripción del Servicio</h3>
                <p>Vuttik Market es una plataforma que facilita el comercio electrónico y la gestión de tiendas. Proveemos herramientas para crear catálogos, procesar pagos y gestionar inventarios.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">3. Cuentas de Usuario</h3>
                <p>Para utilizar nuestros servicios, debes crear una cuenta proporcionando información precisa y completa. Eres responsable de mantener la confidencialidad de tu cuenta y contraseña.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">4. Conducta del Usuario</h3>
                <p>Te comprometes a utilizar Vuttik Market únicamente para propósitos legales y a no violar ninguna ley o regulación aplicable.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">5. Propiedad Intelectual</h3>
                <p>El servicio y su contenido original son propiedad exclusiva de Vuttik y están protegidos por derechos de autor, marcas registradas y otras leyes de propiedad intelectual.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">6. Limitación de Responsabilidad</h3>
                <p>Vuttik no será responsable por daños indirectos, incidentales o consecuentes que resulten del uso o la incapacidad de usar el servicio.</p>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-6 py-3 bg-vuttik-navy text-white font-bold rounded-xl hover:bg-vuttik-navy/90 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPrivacy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-2xl font-black font-display text-vuttik-navy">Política de Privacidad</h2>
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 prose prose-sm text-gray-600">
                <h3 className="text-lg font-bold text-gray-900">1. Información que Recopilamos</h3>
                <p>Recopilamos información que nos proporcionas directamente al crear una cuenta, actualizar tu perfil, o al utilizar nuestros servicios. Esto incluye tu nombre, correo electrónico y datos de facturación.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">2. Uso de la Información</h3>
                <p>Utilizamos la información recopilada para proveer, mantener y mejorar nuestros servicios, así como para procesar tus transacciones y enviarte notificaciones relacionadas con tu cuenta.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">3. Compartir tu Información</h3>
                <p>No vendemos tu información personal a terceros. Podemos compartir tu información con proveedores de servicios de confianza que nos asisten en la operación de nuestra plataforma, siempre bajo acuerdos estrictos de confidencialidad.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">4. Seguridad de Datos</h3>
                <p>Implementamos medidas de seguridad líderes en la industria para proteger tu información personal contra el acceso no autorizado, alteración, divulgación o destrucción.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">5. Cookies y Tecnologías de Seguimiento</h3>
                <p>Utilizamos cookies para mejorar la experiencia del usuario, analizar el tráfico y personalizar el contenido. Puedes controlar el uso de cookies a través de la configuración de tu navegador.</p>

                <h3 className="text-lg font-bold text-gray-900 mt-4">6. Tus Derechos</h3>
                <p>Tienes derecho a acceder, corregir o eliminar tu información personal en cualquier momento accediendo a la configuración de tu cuenta o contactando a nuestro equipo de soporte.</p>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="px-6 py-3 bg-vuttik-navy text-white font-bold rounded-xl hover:bg-vuttik-navy/90 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
