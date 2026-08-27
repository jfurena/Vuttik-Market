import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Loader2, Calendar, Users, Globe, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function MissingDemographicsModal() {
  const { user, login, token } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState(() => {
    const lang = navigator.language?.split('-')[0]?.toLowerCase() || '';
    return ['es', 'en', 'pt', 'fr'].includes(lang) ? lang : 'other';
  });
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle'|'loading'|'available'|'taken'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.displayName && !user.username && !username) {
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

  if (!user || !user.onboardingCompleted) return null;

  const isMegaGuardian = user.role === 'mega_guardian';

  // Mostrar si falta el username
  const needsUsername = !user.username;
  // O si faltan datos demográficos y NO es mega guardian
  const needsDemographics = !isMegaGuardian && ((!user.dateOfBirth && !user.age) || !user.gender || !user.country || !user.language);

  if (!needsUsername && !needsDemographics) return null;

  const checkUsernameAvailability = async (val: string) => {
    if (!val || val.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('loading');
    try {
      const res = await api.checkUsername(val);
      setUsernameStatus(res.available ? 'available' : 'taken');
    } catch {
      setUsernameStatus('idle');
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
    checkUsernameAvailability(val);
  };

  const missingDemographics = needsDemographics && (
    (!user.dateOfBirth && !user.age && !dateOfBirth) || 
    (!user.gender && !gender) || 
    (!user.country && !country) || 
    (!user.language && !language)
  );

  const handleSave = async () => {
    if (missingDemographics) return;
    if (needsUsername && (!username || usernameStatus !== 'available')) {
      alert("Por favor elige un @username válido y disponible.");
      return;
    }
    setLoading(true);
    try {
      const updatedUser = {
        ...user,
        username: user.username || username,
        ...(needsDemographics ? {
          dateOfBirth: user.dateOfBirth || dateOfBirth,
          gender: user.gender || gender,
          country: user.country || country,
          language: user.language || language
        } : {})
      };
      await api.saveUser(updatedUser);
      if (token) {
        login(token, updatedUser);
      }
    } catch (error: any) {
      console.error('Error saving demographics:', error);
      alert(error.message || 'Hubo un error al guardar los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-vuttik-navy/80 backdrop-blur-md p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[32px] w-full max-w-md p-8 relative shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-vuttik-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 text-vuttik-blue">
              <User size={32} />
            </div>
            <h2 className="text-2xl font-display font-black text-vuttik-navy mb-2">Completa tu Registro</h2>
            <p className="text-vuttik-text-muted text-sm">
              Para continuar disfrutando de Vuttik, necesitamos un par de datos adicionales para mejorar tu experiencia.
            </p>
          </div>

          <div className="space-y-6 mb-8 text-left">
            {!user.username && (
              <div className="vuttik-input-group !mb-5 text-left">
                <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Nombre de Usuario</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-vuttik-blue/50 font-bold z-10 text-lg">@</span>
                  <input type="text" value={username} onChange={handleUsernameChange}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none hover:bg-gray-50" disabled={loading} maxLength={20} />
                </div>
                {usernameStatus === 'loading' && <p className="text-xs text-vuttik-text-muted mt-1.5 ml-1">Comprobando disponibilidad...</p>}
                {usernameStatus === 'available' && <p className="text-xs text-green-500 mt-1.5 ml-1 font-bold">¡Disponible!</p>}
                {usernameStatus === 'taken' && <p className="text-xs text-red-500 mt-1.5 ml-1 font-bold">El nombre ya está en uso.</p>}
              </div>
            )}

            {!user.dateOfBirth && !user.age && !isMegaGuardian && (
              <div className="vuttik-input-group !mb-5 text-left">
                <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Fecha de Nacimiento</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none hover:bg-gray-50" disabled={loading} required />
                </div>
              </div>
            )}
            
            {!user.gender && !isMegaGuardian && (
              <div className="vuttik-input-group !mb-5 text-left">
                <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Género</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                  <select value={gender} onChange={e => setGender(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none appearance-none hover:bg-gray-50" required disabled={loading}>
                    <option value="" disabled hidden>Selecciona tu género</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                    <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                  </select>
                </div>
              </div>
            )}

            {!user.country && !isMegaGuardian && (
              <div className="vuttik-input-group !mb-5 text-left">
                <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">País</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none appearance-none hover:bg-gray-50" required disabled={loading}>
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
            )}

            {!user.language && !isMegaGuardian && (
              <div className="vuttik-input-group !mb-5 text-left">
                <label className="block text-xs font-bold text-vuttik-navy/70 uppercase tracking-wide mb-2 ml-1">Idioma Preferido</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue/50 z-10" size={18} />
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-vuttik-navy font-medium focus:bg-white focus:border-vuttik-blue focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none appearance-none hover:bg-gray-50" required disabled={loading}>
                    <option value="" disabled hidden>Selecciona tu idioma</option>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                    <option value="pt">Portugués</option>
                    <option value="fr">Francés</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleSave}
            disabled={
              missingDemographics || 
              (needsUsername && (!username || usernameStatus !== 'available')) || 
              loading
            }
            className="vuttik-button !w-full !py-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Guardar y Continuar'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
