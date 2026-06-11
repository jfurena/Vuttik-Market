import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Lock, Shield, Eye, Palette, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function Settings() {
  const { user, login, token } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [notifs, setNotifs] = useState({ push: true, email: false, market: true, messages: true });
  const [privacy, setPrivacy] = useState({ publicProfile: true, showOnline: true, anyMessage: false });
  const [security, setSecurity] = useState({ tfa: false });

  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<'idle'|'loading'|'available'|'taken'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);
  const [changingUsername, setChangingUsername] = useState(false);

  // Other info states
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [ageInput, setAgeInput] = useState(user?.age?.toString() || '');
  const [genderInput, setGenderInput] = useState(user?.gender || '');
  const [countryInput, setCountryInput] = useState(user?.country || '');
  const [languageInput, setLanguageInput] = useState(user?.language || '');
  
  const [savingOthers, setSavingOthers] = useState(false);
  const [othersMessage, setOthersMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  useEffect(() => {
    if (user) {
      setUsernameInput(user.username || '');
      setDisplayNameInput(user.displayName || '');
      setEmailInput(user.email || '');
      setAgeInput(user.age?.toString() || '');
      setGenderInput(user.gender || '');
      setCountryInput(user.country || '');
      setLanguageInput(user.language || '');
    }
  }, [user]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsernameInput(val);
    setUsernameMessage(null);
    if (!val || val.length < 3 || val === user?.username) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('loading');
    api.checkUsername(val).then(res => {
      setUsernameStatus(res.available ? 'available' : 'taken');
    }).catch(() => setUsernameStatus('idle'));
  };

  const handleSaveUsername = async () => {
    if (!user || !token || usernameStatus !== 'available') return;
    setChangingUsername(true);
    setUsernameMessage(null);
    try {
      const res = await api.changeUsername(user.uid, usernameInput);
      if (res.success) {
        setUsernameMessage({ type: 'success', text: 'Nombre de usuario actualizado con éxito.' });
        setUsernameStatus('idle');
        const updatedUser = { ...user, username: usernameInput };
        login(token, updatedUser);
      }
    } catch (error: any) {
      setUsernameMessage({ type: 'error', text: error.message || 'Error al cambiar el nombre de usuario.' });
    } finally {
      setChangingUsername(false);
    }
  };

  const handleSaveOtherChanges = async () => {
    if (!user || !token) return;
    setSavingOthers(true);
    setOthersMessage(null);
    try {
      const updateData = {
        uid: user.uid,
        displayName: displayNameInput,
        email: emailInput,
        age: ageInput ? parseInt(ageInput) : user.age,
        gender: genderInput || user.gender,
        country: countryInput || user.country,
        language: languageInput || user.language
      };
      const res = await api.saveUser(updateData);
      if (res.success) {
        setOthersMessage({ type: 'success', text: 'Tus datos se han guardado con éxito.' });
        const updatedUser = { ...user, ...updateData };
        login(token, updatedUser);
      }
    } catch (error: any) {
      setOthersMessage({ type: 'error', text: error.message || 'Error al guardar los datos.' });
    } finally {
      setSavingOthers(false);
    }
  };

  const Toggle = ({ label, description, enabled, onChange }: any) => (
    <div className="flex items-center justify-between p-4 bg-vuttik-gray/30 rounded-2xl border border-gray-50 hover:bg-vuttik-gray/50 transition-colors">
      <div className="flex flex-col gap-1 pr-4">
        <span className="text-sm font-bold text-vuttik-navy">{label}</span>
        {description && <span className="text-xs text-vuttik-text-muted">{description}</span>}
      </div>
      <button 
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-vuttik-blue' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  const tabs = [
    { id: 'account', label: 'Cuenta', icon: SettingsIcon },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'privacy', label: 'Privacidad', icon: Lock },
    { id: 'security', label: 'Seguridad', icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-6 w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-4xl font-display font-black text-vuttik-navy">Ajustes</h2>
        <p className="text-base md:text-lg text-vuttik-text-muted">Configura tu experiencia en Vuttik Market.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${
                activeTab === tab.id
                  ? 'bg-vuttik-navy text-white shadow-lg'
                  : 'text-vuttik-text-muted hover:bg-vuttik-gray hover:text-vuttik-navy'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-gray-100 rounded-[32px] p-6 md:p-10 shadow-sm">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'account' && (
              <div className="flex flex-col gap-8">
                <div>
                  <h3 className="text-xl font-display font-black text-vuttik-navy mb-4">Información de la Cuenta</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Nombre de Usuario (@)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted font-bold">@</span>
                        <input 
                          type="text" 
                          value={usernameInput}
                          onChange={handleUsernameChange}
                          className="w-full bg-vuttik-gray border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-vuttik-navy outline-none focus:ring-2 focus:ring-vuttik-blue/20" 
                          placeholder="tu_usuario" 
                          maxLength={20}
                        />
                      </div>
                      {usernameStatus === 'loading' && <p className="text-xs text-vuttik-text-muted">Comprobando disponibilidad...</p>}
                      {usernameStatus === 'available' && <p className="text-xs text-green-500 font-bold">¡Disponible!</p>}
                      {usernameStatus === 'taken' && <p className="text-xs text-red-500 font-bold">El nombre ya está en uso.</p>}
                      {usernameMessage && (
                        <p className={`text-xs font-bold mt-1 ${usernameMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                          {usernameMessage.text}
                        </p>
                      )}
                      {usernameStatus === 'available' && (
                        <button 
                          onClick={handleSaveUsername}
                          disabled={changingUsername}
                          className="mt-2 w-fit bg-vuttik-blue text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                          {changingUsername ? 'Guardando...' : 'Cambiar @username'}
                        </button>
                      )}
                      <p className="text-[10px] text-vuttik-text-muted mt-1 leading-tight">
                        Nota: Solo puedes cambiar tu nombre de usuario 2 veces cada 15 días.
                      </p>
                    </div>
                    <div className="h-px w-full bg-gray-100 my-2"></div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Nombre Completo</label>
                      <input type="text" value={displayNameInput} onChange={e => setDisplayNameInput(e.target.value)} className="bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold text-vuttik-navy outline-none" placeholder="Tu nombre" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Correo Electrónico</label>
                      <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold text-vuttik-navy outline-none" placeholder="correo@ejemplo.com" />
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 mt-2">
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Edad</label>
                        <input type="number" min="13" max="120" value={ageInput} onChange={e => setAgeInput(e.target.value)} className="bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold text-vuttik-navy outline-none" placeholder="Tu edad" />
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Género</label>
                        <select value={genderInput} onChange={e => setGenderInput(e.target.value)} className="bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold text-vuttik-navy outline-none appearance-none">
                          <option value="" disabled>Selecciona...</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                          <option value="Otro">Otro</option>
                          <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">País</label>
                      <select value={countryInput} onChange={e => setCountryInput(e.target.value)} className="bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold text-vuttik-navy outline-none appearance-none">
                        <option value="" disabled>Selecciona tu país...</option>
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

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Idioma Principal</label>
                      <select value={languageInput} onChange={e => setLanguageInput(e.target.value)} className="bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold text-vuttik-navy outline-none appearance-none">
                        <option value="" disabled>Selecciona tu idioma preferido...</option>
                        <option value="es">Español</option>
                        <option value="en">Inglés</option>
                        <option value="pt">Portugués</option>
                        <option value="fr">Francés</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>

                  </div>
                </div>
                <div>
                  {othersMessage && (
                    <p className={`text-xs font-bold mb-3 ${othersMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                      {othersMessage.text}
                    </p>
                  )}
                  <button 
                    onClick={handleSaveOtherChanges}
                    disabled={savingOthers}
                    className="bg-vuttik-blue text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {savingOthers ? 'Guardando...' : 'Guardar Otros Cambios'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="flex flex-col gap-8">
                <div>
                  <h3 className="text-xl font-display font-black text-vuttik-navy mb-4">Notificaciones</h3>
                  <div className="flex flex-col gap-3">
                    <Toggle 
                      label="Notificaciones Push" 
                      description="Recibe alertas directamente en tu dispositivo."
                      enabled={notifs.push} 
                      onChange={(v: boolean) => setNotifs({...notifs, push: v})} 
                    />
                    <Toggle 
                      label="Correos Electrónicos" 
                      description="Resumen semanal e información importante por correo."
                      enabled={notifs.email} 
                      onChange={(v: boolean) => setNotifs({...notifs, email: v})} 
                    />
                    <Toggle 
                      label="Alertas de Mercado" 
                      description="Avisos cuando bajen de precio los productos que sigues."
                      enabled={notifs.market} 
                      onChange={(v: boolean) => setNotifs({...notifs, market: v})} 
                    />
                    <Toggle 
                      label="Mensajes Directos" 
                      description="Notificarme cuando reciba un mensaje nuevo."
                      enabled={notifs.messages} 
                      onChange={(v: boolean) => setNotifs({...notifs, messages: v})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="flex flex-col gap-8">
                <div>
                  <h3 className="text-xl font-display font-black text-vuttik-navy mb-4">Privacidad</h3>
                  <div className="flex flex-col gap-3">
                    <Toggle 
                      label="Perfil Público" 
                      description="Permitir que cualquier usuario vea tus publicaciones."
                      enabled={privacy.publicProfile} 
                      onChange={(v: boolean) => setPrivacy({...privacy, publicProfile: v})} 
                    />
                    <Toggle 
                      label="Mostrar Estado en Línea" 
                      description="Otros usuarios podrán ver cuándo estás conectado."
                      enabled={privacy.showOnline} 
                      onChange={(v: boolean) => setPrivacy({...privacy, showOnline: v})} 
                    />
                    <Toggle 
                      label="Mensajes de Desconocidos" 
                      description="Permitir mensajes de personas que no sigues."
                      enabled={privacy.anyMessage} 
                      onChange={(v: boolean) => setPrivacy({...privacy, anyMessage: v})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="flex flex-col gap-8">
                <div>
                  <h3 className="text-xl font-display font-black text-vuttik-navy mb-4">Seguridad</h3>
                  <div className="flex flex-col gap-3">
                    <Toggle 
                      label="Autenticación en Dos Pasos (2FA)" 
                      description="Protege tu cuenta con un código de seguridad extra."
                      enabled={security.tfa} 
                      onChange={(v: boolean) => setSecurity({...security, tfa: v})} 
                    />
                    <div className="flex items-center justify-between p-4 bg-vuttik-gray/30 rounded-2xl border border-gray-50">
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="text-sm font-bold text-vuttik-navy">Cambiar Contraseña</span>
                        <span className="text-xs text-vuttik-text-muted">Actualiza tu contraseña regularmente para mayor seguridad.</span>
                      </div>
                      <button className="bg-white border border-gray-200 text-vuttik-navy px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:border-vuttik-blue hover:text-vuttik-blue transition-colors shrink-0">
                        Cambiar
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100 mt-4">
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="text-sm font-bold text-red-500">Cerrar Sesión en todos los dispositivos</span>
                        <span className="text-xs text-red-400">Si notas actividad sospechosa, cierra las demás sesiones.</span>
                      </div>
                      <button className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shrink-0">
                        Cerrar Todo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
