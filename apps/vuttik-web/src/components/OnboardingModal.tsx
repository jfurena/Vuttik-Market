import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, User, Briefcase, Store, Shield, Activity, Star, ShoppingBag, Calendar, Users, Globe, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LemonSqueezyMockCheckout from './LemonSqueezyMockCheckout';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface OnboardingModalProps {
  onComplete: () => void;
}

const PLAN_ICONS: Record<string, any> = {
  free: User,
  business: Briefcase,
  negocio: Store,
  guardian: Shield,
  mega_guardian: Star
};

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { user, login, token } = useAuth();
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('free');

  useEscapeKey(onComplete);
  
  // Extra data fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState(() => {
    const lang = navigator.language?.split('-')[0]?.toLowerCase() || '';
    return ['es', 'en', 'pt', 'fr'].includes(lang) ? lang : 'other';
  });
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle'|'loading'|'available'|'taken'>('idle');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (user?.displayName && !username) {
      api.suggestUsername(user.displayName).then(res => {
        if (res.suggestion) {
          setUsername(res.suggestion);
          setUsernameStatus('loading');
          api.checkUsername(res.suggestion).then(check => {
            setUsernameStatus(check.available ? 'available' : 'taken');
          }).catch(() => setUsernameStatus('idle'));
        }
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.getSubscriptionPlans();
        setPlans(data);
        if (data.length > 0) {
          // Si el usuario ya tiene plan, lo preseleccionamos. Si no, el primero o el gratis.
          const defaultPlan = data.find((p: any) => p.price === 0) || data[0];
          setSelectedPlanId(defaultPlan.id);
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleFinish = async () => {
    if (!user) return;
    
    const selectedPlanObj = plans.find(p => p.id === selectedPlanId);
    if (selectedPlanObj && selectedPlanObj.price > 0) {
      // Show checkout modal instead of saving immediately
      setShowCheckout(true);
      return;
    }

    await saveUserFinal();
  };

  const saveUserFinal = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Determine new role based on plan
      let newRole = 'user';
      if (selectedPlanId === 'business') newRole = 'business';
      if (selectedPlanId === 'negocio') newRole = 'negocio';
      if (selectedPlanId === 'guardian') newRole = 'guardian';
      if (selectedPlanId === 'mega_guardian') newRole = 'mega_guardian';

      // Agregamos un pequeño modificador al nombre si pusieron un nombre de negocio
      const finalDisplayName = businessName ? `${user.displayName} - ${businessName}` : user.displayName;

      const updatedUser = {
        ...user,
        displayName: finalDisplayName,
        planId: selectedPlanId,
        role: newRole,
        onboardingCompleted: true,
        username: username || undefined,
        ...(newRole !== 'mega_guardian' ? {
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          country: country || undefined,
          language: language || undefined
        } : {})
      };

      await api.saveUser(updatedUser);
      
      // Update local context
      if (token) {
        login(token, updatedUser);
      }
      onComplete();
    } catch (err) {
      console.error('Error saving onboarding data:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-vuttik-blue" />
      </div>
    );
  }

  const selectedPlanObj = plans.find(p => p.id === selectedPlanId);
  const needsExtraInfo = selectedPlanId === 'business' || selectedPlanId === 'negocio';

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Left side: Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex flex-1 relative flex-col justify-between p-12 overflow-hidden bg-[#0A0F1C]"
      >
        <div className="absolute top-0 right-0 w-full h-full">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-vuttik-blue/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-vuttik-cyan/20 rounded-full blur-[140px]" />
          
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] opacity-20 mix-blend-overlay bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1C]/40 via-[#0A0F1C]/60 to-[#0A0F1C]" />
        </div>

        <div className="relative z-10 pt-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#1e40af] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
              <ShoppingBag className="text-white" size={24} />
            </div>
          </motion.div>
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
            Para brindarte la mejor experiencia, necesitamos configurar tu cuenta al instante.
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

      {/* Right side: Flow */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 flex flex-col relative no-scrollbar">
        {/* Mobile Header */}
        <div className="md:hidden text-center mb-8 mt-4">
          <img src="/favicon.png" alt="Vuttik" className="w-16 h-16 mx-auto mb-2" />
          <h1 className="text-2xl font-display font-black text-vuttik-navy">Configura tu <span className="text-vuttik-blue">Cuenta</span></h1>
        </div>

        <motion.div 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full mx-auto my-auto"
        >
          {step === 1 && (
            <>
              <div className="mb-8">
                <span className="text-[10px] font-black text-vuttik-blue uppercase tracking-widest mb-2 block">Paso 1 de {needsExtraInfo ? 3 : 2}</span>
                <h2 className="text-3xl font-display font-black text-vuttik-navy mb-2">Elige tu Plan</h2>
                <p className="text-vuttik-text-muted text-sm">Selecciona el plan que mejor se adapte a tus necesidades para comenzar.</p>
              </div>

              <div className="space-y-4 mb-8">
                {plans.filter(p => !p.is_hidden).map((plan) => {
                  const Icon = PLAN_ICONS[plan.id] || CheckCircle2;
                  const isSelected = selectedPlanId === plan.id;
                  
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full p-5 rounded-[1.5rem] border-2 text-left transition-all flex items-center gap-4 ${isSelected ? 'border-vuttik-blue bg-vuttik-blue/5 shadow-md shadow-vuttik-blue/10 scale-[1.02]' : 'border-gray-100 hover:border-vuttik-blue/30 hover:bg-gray-50'}`}
                    >
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-vuttik-blue text-white' : 'bg-gray-100 text-vuttik-navy'}`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-vuttik-navy">{plan.name} {plan.is_coming_soon && <span className="text-[10px] bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full ml-2">Próximamente</span>}</h3>
                          <span className={`text-sm font-black ${isSelected ? 'text-vuttik-blue' : 'text-vuttik-text-muted'}`}>
                            {plan.price === 0 ? 'Gratis' : `$${plan.price}/mes`}
                          </span>
                        </div>
                        <p className="text-[11px] text-vuttik-text-muted line-clamp-2">
                          {plan.features?.join(', ') || 'Plan básico'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => {
                  if (selectedPlanObj?.is_coming_soon) return;
                  setStep(2);
                }}
                disabled={saving || selectedPlanObj?.is_coming_soon}
                className={`vuttik-button !w-full !py-4 ${selectedPlanObj?.is_coming_soon ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Cargando...' : (selectedPlanObj?.is_coming_soon ? 'No disponible aún' : 'Siguiente Paso')}
                {!saving && <ArrowRight size={20} className="ml-2" />}
              </button>
            </>
          )}

          {step === 2 && (() => {
            const isMegaGuardian = selectedPlanId === 'mega_guardian';
            return (
              <>
                <div className="mb-8">
                  <span className="text-[10px] font-black text-vuttik-blue uppercase tracking-widest mb-2 block">Paso 2 de {needsExtraInfo ? 3 : 2}</span>
                  <h2 className="text-3xl font-display font-black text-vuttik-navy mb-2">Datos Personales</h2>
                  <p className="text-vuttik-text-muted text-sm">Completa esta información para mejorar tu experiencia.</p>
                </div>

                <div className="space-y-6 mb-8 text-left">
                  <div className="vuttik-input-group !mb-5">
                    <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Nombre de Usuario</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-vuttik-blue/50 font-bold z-10 text-lg">@</span>
                      <input type="text" value={username} onChange={(e) => {
                        let val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                        setUsername(val);
                        if (!val || val.length < 3) return setUsernameStatus('idle');
                        setUsernameStatus('loading');
                        api.checkUsername(val).then(res => setUsernameStatus(res.available ? 'available' : 'taken')).catch(() => setUsernameStatus('idle'));
                      }} className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none hover:bg-gray-50" maxLength={20} />
                    </div>
                    {usernameStatus === 'loading' && <p className="text-xs text-vuttik-text-muted mt-1.5 ml-1">Comprobando disponibilidad...</p>}
                    {usernameStatus === 'available' && <p className="text-xs text-green-500 mt-1.5 ml-1 font-bold">¡Disponible!</p>}
                    {usernameStatus === 'taken' && <p className="text-xs text-red-500 mt-1.5 ml-1 font-bold">El nombre ya está en uso.</p>}
                  </div>

                  {!isMegaGuardian && (
                    <>
                      <div className="vuttik-input-group !mb-5">
                        <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Fecha de Nacimiento</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                          <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none hover:bg-gray-50" required />
                        </div>
                      </div>
                      
                      <div className="vuttik-input-group !mb-5">
                        <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Género</label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                          <select value={gender} onChange={e => setGender(e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none appearance-none hover:bg-gray-50" required>
                            <option value="" disabled hidden>Selecciona tu género</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                            <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                          </select>
                        </div>
                      </div>

                      <div className="vuttik-input-group !mb-5">
                        <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">País</label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                          <select value={country} onChange={e => setCountry(e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none appearance-none hover:bg-gray-50" required>
                            <option value="" disabled hidden>Selecciona tu país</option>
                            <option value="Argentina">Argentina</option>
                            <option value="Bolivia">Bolivia</option>
                            <option value="Chile">Chile</option>
                            <option value="Colombia">Colombia</option>
                            <option value="Costa Rica">Costa Rica</option>
                            <option value="Cuba">Cuba</option>
                            <option value="Ecuador">Ecuador</option>
                            <option value="El Salvador">El Salvador</option>
                            <option value="España">España</option>
                            <option value="Estados Unidos">Estados Unidos</option>
                            <option value="Guatemala">Guatemala</option>
                            <option value="Honduras">Honduras</option>
                            <option value="México">México</option>
                            <option value="Nicaragua">Nicaragua</option>
                            <option value="Panamá">Panamá</option>
                            <option value="Paraguay">Paraguay</option>
                            <option value="Perú">Perú</option>
                            <option value="Puerto Rico">Puerto Rico</option>
                            <option value="República Dominicana">República Dominicana</option>
                            <option value="Uruguay">Uruguay</option>
                            <option value="Venezuela">Venezuela</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                      </div>

                      <div className="vuttik-input-group !mb-5">
                        <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Idioma Preferido</label>
                        <div className="relative">
                          <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                          <select value={language} onChange={e => setLanguage(e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none appearance-none hover:bg-gray-50" required>
                            <option value="" disabled hidden>Selecciona tu idioma</option>
                            <option value="es">Español</option>
                            <option value="en">Inglés</option>
                          <option value="pt">Portugués</option>
                          <option value="fr">Francés</option>
                          <option value="other">Otro</option>
                        </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    disabled={saving}
                    className="px-6 py-4 rounded-2xl font-bold text-vuttik-text-muted hover:bg-gray-50 transition-colors"
                  >
                    Volver
                  </button>
                  <button 
                    onClick={() => {
                      if (needsExtraInfo) setStep(3);
                      else handleFinish();
                    }}
                    disabled={
                      (!isMegaGuardian && (!dateOfBirth || !gender || !country || !language)) || 
                      !username || usernameStatus !== 'available' || saving
                    }
                    className="vuttik-button flex-1"
                  >
                    {saving ? 'Guardando...' : (needsExtraInfo ? 'Siguiente Paso' : 'Comenzar a usar Vuttik')}
                    {!saving && <ArrowRight size={20} className="ml-2" />}
                  </button>
                </div>
              </>
            );
          })()}

          {step === 3 && (
            <>
              <div className="mb-8">
                <span className="text-[10px] font-black text-vuttik-blue uppercase tracking-widest mb-2 block">Paso 3 de 3</span>
                <h2 className="text-3xl font-display font-black text-vuttik-navy mb-2">Detalles del Negocio</h2>
                <p className="text-vuttik-text-muted text-sm">Has elegido el plan <strong>{selectedPlanObj?.name}</strong>. Completa estos datos para finalizar.</p>
              </div>

              <div className="space-y-6 mb-8">
                <div className="vuttik-input-group">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted/40 z-10" size={20} />
                  <input type="text" placeholder=" " value={businessName} onChange={e => setBusinessName(e.target.value)}
                    className="vuttik-input-field" />
                  <label className="vuttik-floating-label">Nombre del Negocio / Empresa</label>
                </div>
                
                <div className="vuttik-input-group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted/40 z-10" size={20} />
                  <input type="tel" placeholder=" " value={phone} onChange={e => setPhone(e.target.value)}
                    className="vuttik-input-field" />
                  <label className="vuttik-floating-label">Teléfono de contacto</label>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  disabled={saving}
                  className="px-6 py-4 rounded-2xl font-bold text-vuttik-text-muted hover:bg-gray-50 transition-colors"
                >
                  Volver
                </button>
                <button 
                  onClick={handleFinish}
                  disabled={saving || (needsExtraInfo && !businessName)}
                  className="vuttik-button flex-1"
                >
                  {saving ? 'Configurando cuenta...' : 'Finalizar y Entrar'}
                  {!saving && <CheckCircle2 size={20} className="ml-2" />}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <LemonSqueezyMockCheckout 
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setShowCheckout(false);
          saveUserFinal();
        }}
        planName={selectedPlanObj?.name || ''}
        planPrice={selectedPlanObj?.price || 0}
      />
    </div>
  );
}
