import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Image as ImageIcon, Camera, Loader2, Save, Trash2, Plus, Phone, Globe, Instagram, Facebook, Twitter, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import UserAvatar from './UserAvatar';
import CameraModal from './CameraModal';
import LocationInput from './LocationInput';

interface Schedule {
  days: string[];
  openTime: string;
  closeTime: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onSaved: (updatedUser: any) => void;
}

export default function EditProfileModal({ isOpen, onClose, userProfile, onSaved }: EditProfileModalProps) {
  const { user } = useAuth();
  
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState<{ address: string, lat?: number, lng?: number, country?: string, state?: string } | null>(null);
  const [locationPrivacy, setLocationPrivacy] = useState<'full' | 'region'>('full');
  
  const [editSchedules, setEditSchedules] = useState<Schedule[]>([]);
  const [showWorkingHours, setShowWorkingHours] = useState(true);
  
  const [editPhoneCode, setEditPhoneCode] = useState('+1');
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && userProfile) {
      setEditName(userProfile.displayName || userProfile.display_name || '');
      setEditBio(userProfile.bio || '');
      setEditPhotoURL(userProfile.photoURL || userProfile.photo_url || '');
      
      // Parse Location
      if (userProfile.location) {
        try {
          const loc = JSON.parse(userProfile.location);
          setEditLocation(loc);
        } catch {
          setEditLocation({ address: userProfile.location });
        }
      } else {
        setEditLocation(null);
      }
      setLocationPrivacy(userProfile.locationPrivacy || 'full');
      setShowWorkingHours(userProfile.showWorkingHours !== false);
      
      // Parse Schedules
      if (userProfile.workingHours) {
        try {
           setEditSchedules(parseWorkingHours(userProfile.workingHours));
        } catch {}
      } else {
        setEditSchedules([]);
      }
      
      // Social & Phone
      if (userProfile.phone) {
         const match = userProfile.phone.match(/^(\+\d+)\s*(.*)/);
         if (match) {
            setEditPhoneCode(match[1]);
            setEditPhone(match[2]);
         } else {
            setEditPhone(userProfile.phone);
         }
      } else {
         setEditPhoneCode('+1');
         setEditPhone('');
      }
      setEditInstagram(userProfile.socialLinks?.instagram || '');
      setEditFacebook(userProfile.socialLinks?.facebook || '');
      setEditTwitter(userProfile.socialLinks?.twitter || '');
      setEditWebsite(userProfile.socialLinks?.website || '');
    }
  }, [isOpen, userProfile]);

  const parseWorkingHours = (str: string): Schedule[] => {
    const result: Schedule[] = [];
    if (!str) return result;
    if (str.includes('|') && !str.includes(' de ') && str.includes('-')) {
      const parts = str.split('|');
      const days = parts[0].trim().split(',').map(d => d.trim()).filter(Boolean);
      const times = parts[1].split('-');
      if (times.length === 2) {
        result.push({ days, openTime: times[0].trim(), closeTime: times[1].trim() });
      }
      return result;
    }
    const blocks = str.split('|');
    for (const block of blocks) {
      const b = block.trim();
      if (!b) continue;
      const deIndex = b.lastIndexOf(' de ');
      if (deIndex > -1) {
         const daysPart = b.substring(0, deIndex).trim();
         const timePart = b.substring(deIndex + 4).trim();
         const aIndex = timePart.indexOf(' a ');
         if (aIndex > -1) {
            let open = timePart.substring(0, aIndex).trim();
            let close = timePart.substring(aIndex + 3).trim();
            const days = daysPart.split(',').map(d => d.trim()).filter(Boolean);
            const convertTo24 = (t12: string) => {
               const match = t12.match(/(\d+):(\d+)\s*(AM|PM)/i);
               if (match) {
                  let h = parseInt(match[1]);
                  const m = match[2];
                  const isPM = match[3].toUpperCase() === 'PM';
                  if (isPM && h !== 12) h += 12;
                  if (!isPM && h === 12) h = 0;
                  return `${h.toString().padStart(2, '0')}:${m}`;
               }
               return t12;
            };
            result.push({ days, openTime: convertTo24(open), closeTime: convertTo24(close) });
         }
      }
    }
    return result;
  };

  const formatWorkingHours = (schedules: Schedule[]) => {
    const convertTo12 = (t24: string) => {
      const parts = t24.split(':');
      if (parts.length !== 2) return t24;
      let h = parseInt(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12; 
      return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    };
    return schedules.filter(s => s.days.length > 0 && s.openTime && s.closeTime)
      .map(s => `${s.days.join(', ')} de ${convertTo12(s.openTime)} a ${convertTo12(s.closeTime)}`)
      .join(' | ');
  };

  const handleImageFile = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setEditPhotoURL(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const updatedData = {
        ...userProfile,
        displayName: editName,
        bio: editBio,
        photoURL: editPhotoURL,
        location: editLocation ? JSON.stringify(editLocation) : undefined,
        locationPrivacy,
        workingHours: editSchedules.length > 0 ? formatWorkingHours(editSchedules) : null,
        showWorkingHours,
        phone: editPhone ? `${editPhoneCode} ${editPhone}` : null,
        socialLinks: {
          instagram: editInstagram || null,
          facebook: editFacebook || null,
          twitter: editTwitter || null,
          website: editWebsite || null
        }
      };
      
      await api.updateUserProfile(userProfile.uid || userProfile.id || user.uid, updatedData);
      onSaved(updatedData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-2xl font-display font-black text-on-surface">Editar Perfil</h3>
              <p className="text-sm text-gray-500 font-medium">Personaliza cómo te ven en Vuttik</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Foto de Perfil */}
            <div className="flex items-center gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md overflow-hidden relative shrink-0">
                <UserAvatar src={editPhotoURL} alt="Foto" />
                <input id="profile-upload" type="file" accept="image/*" onChange={e => handleImageFile(e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 mb-2">Foto de Perfil</p>
                <div className="flex gap-3">
                  <label htmlFor="profile-upload" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                    <ImageIcon size={14} /> Subir Foto
                  </label>
                  <button type="button" onClick={() => setShowCamera(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                    <Camera size={14} /> Tomar Foto
                  </button>
                </div>
              </div>
            </div>

            {/* Info Básica */}
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  required type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  placeholder="Tu Nombre"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-vuttik-blue focus:bg-white transition-all text-sm font-bold"
                />
              </div>
              <div className="relative">
                <textarea
                  value={editBio} onChange={e => setEditBio(e.target.value)}
                  placeholder="Una breve descripción sobre ti..."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-vuttik-blue focus:bg-white transition-all text-sm font-bold min-h-[100px] resize-none"
                />
              </div>
            </div>

            {/* Ubicación y Privacidad */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Ubicación</h4>
              <div className="relative z-20">
                <LocationInput
                  value={editLocation?.address || ''}
                  onChange={(addr, placeName, country, state) => setEditLocation(prev => ({ ...prev, address: addr, country, state }))}
                  onCoordinatesChange={(lat, lng) => setEditLocation(prev => ({ ...prev, lat, lng, address: prev?.address || '' }))}
                  placeholder="Tu ubicación (ej: Calle principal 123...)"
                />
              </div>
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <MapPin className="text-vuttik-blue shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900 mb-2">Privacidad de Ubicación</p>
                  <label className="flex items-center gap-2 text-xs text-gray-600 mb-2 cursor-pointer">
                    <input type="radio" name="locPrivacy" value="full" checked={locationPrivacy === 'full'} onChange={() => setLocationPrivacy('full')} className="text-vuttik-blue focus:ring-vuttik-blue" />
                    <span>Mostrar mi ubicación completa (calle y número)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="radio" name="locPrivacy" value="region" checked={locationPrivacy === 'region'} onChange={() => setLocationPrivacy('region')} className="text-vuttik-blue focus:ring-vuttik-blue" />
                    <span>Mostrar solo País y Provincia (recomendado si no eres negocio)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Horario de Apertura */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Horario / Disponibilidad</h4>
                  <p className="text-xs text-gray-500 mt-1">Si tienes un emprendimiento u ofreces servicios</p>
                </div>
                <button type="button" onClick={() => setEditSchedules([...editSchedules, { days: [], openTime: '08:00', closeTime: '18:00' }])} className="text-xs font-bold text-vuttik-blue hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                  <Plus size={14} /> Agregar Horario
                </button>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <label className="flex items-center gap-2 text-xs text-gray-700 font-bold cursor-pointer">
                  <input type="checkbox" checked={showWorkingHours} onChange={e => setShowWorkingHours(e.target.checked)} className="rounded text-vuttik-blue focus:ring-vuttik-blue w-4 h-4" />
                  Hacer público mi horario en mi perfil
                </label>
              </div>

              {editSchedules.map((schedule, index) => (
                <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-xl relative space-y-3">
                  <button type="button" onClick={() => setEditSchedules(editSchedules.filter((_, i) => i !== index))} className="absolute top-3 right-3 text-red-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <div className="flex gap-2 flex-wrap pr-8">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                      <label key={day} className={`px-2 py-1 rounded-md border cursor-pointer transition-all text-[10px] font-bold ${schedule.days.includes(day) ? 'bg-vuttik-blue/10 border-vuttik-blue/30 text-vuttik-blue' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                        <input type="checkbox" className="hidden" checked={schedule.days.includes(day)} onChange={e => {
                          const newSchedules = [...editSchedules];
                          if (e.target.checked) newSchedules[index].days = [...schedule.days, day];
                          else newSchedules[index].days = schedule.days.filter(d => d !== day);
                          setEditSchedules(newSchedules);
                        }} />
                        {day.substring(0, 3)}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3 items-center">
                    <input type="time" value={schedule.openTime} onChange={e => {
                      const newSchedules = [...editSchedules];
                      newSchedules[index].openTime = e.target.value;
                      setEditSchedules(newSchedules);
                    }} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-vuttik-blue font-bold text-sm" />
                    <span className="text-gray-400 font-bold text-sm">a</span>
                    <input type="time" value={schedule.closeTime} onChange={e => {
                      const newSchedules = [...editSchedules];
                      newSchedules[index].closeTime = e.target.value;
                      setEditSchedules(newSchedules);
                    }} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-vuttik-blue font-bold text-sm" />
                  </div>
                </div>
              ))}
            </div>

            {/* Redes y Contacto */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Contacto y Redes Sociales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-vuttik-blue focus-within:bg-white transition-all">
                  <div className="pl-4 pr-2 flex items-center bg-transparent">
                    <Phone className="text-gray-400" size={16} />
                  </div>
                  <select value={editPhoneCode} onChange={e => setEditPhoneCode(e.target.value)} className="bg-transparent text-sm font-bold text-gray-600 focus:outline-none py-3 border-r border-gray-200">
                    <option value="+1">+1 (DO/US/PR)</option>
                    <option value="+52">+52 (MX)</option>
                    <option value="+57">+57 (CO)</option>
                    <option value="+34">+34 (ES)</option>
                    <option value="+54">+54 (AR)</option>
                    <option value="+56">+56 (CL)</option>
                    <option value="+51">+51 (PE)</option>
                  </select>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Número de teléfono" className="w-full px-3 py-3 bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none" />
                </div>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={16} />
                  <input type="url" value={editInstagram} onChange={e => setEditInstagram(e.target.value)} placeholder="Enlace de Instagram" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-pink-500 focus:bg-white transition-all text-sm font-bold" />
                </div>
                <div className="relative">
                  <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={16} />
                  <input type="url" value={editFacebook} onChange={e => setEditFacebook(e.target.value)} placeholder="Enlace de Facebook" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold" />
                </div>
                <div className="relative">
                  <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" size={16} />
                  <input type="url" value={editTwitter} onChange={e => setEditTwitter(e.target.value)} placeholder="Enlace de X / Twitter" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all text-sm font-bold" />
                </div>
                <div className="relative md:col-span-2">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input type="url" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="Sitio Web personal o portafolio" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:bg-white transition-all text-sm font-bold" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/90 backdrop-blur-sm z-10 py-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 font-black transition-all text-sm uppercase tracking-widest">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-vuttik-navy hover:bg-vuttik-blue text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm uppercase tracking-widest shadow-lg shadow-vuttik-navy/20">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Guardar Perfil</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <AnimatePresence>
        {showCamera && (
          <CameraModal
            onClose={() => setShowCamera(false)}
            onCapture={(imageBase64) => {
              setEditPhotoURL(imageBase64);
              setShowCamera(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
