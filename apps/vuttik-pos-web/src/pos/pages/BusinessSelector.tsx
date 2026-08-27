import React, { useState, useEffect } from 'react';
import { compressImage } from '../../utils/imageCompressor';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Store, Loader2, LogOut, Hash, Package, ShoppingBag, ChevronRight, X, AlertCircle, User, TrendingUp, DollarSign, Settings, Trash2, Edit2, MapPin, Copy, Check, Mail } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import LocationInput from '../../components/LocationInput';

interface BizSummary {
  id: string;
  nombre: string;
  codigo: string;
  fecha_creacion: string;
  employee_count: number;
  product_count: number;
  sales_count: number;
  ganancia_neta?: number;
  location?: any;
  logo?: string;
  description?: string;
  working_hours?: string;
  phone?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  is_pending?: boolean;
}

interface Schedule {
  days: string[];
  openTime: string;
  closeTime: string;
}

export default function BusinessSelector() {
  const { user, selectBusiness, logout } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBiz, setEditingBiz] = useState<BizSummary | null>(null);
  const [editName, setEditName] = useState('');

  const [editLocation, setEditLocation] = useState<{ address: string, lat?: number, lng?: number, country?: string, state?: string } | null>(null);
  const [editLogo, setEditLogo] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSchedules, setEditSchedules] = useState<Schedule[]>([]);
  const [editPhoneCode, setEditPhoneCode] = useState('+1');
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editMarketUrl, setEditMarketUrl] = useState('');
  const [editMarketKey, setEditMarketKey] = useState('');

  const [showProfitModal, setShowProfitModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [location, setLocation] = useState<{ address: string, lat?: number, lng?: number, country?: string, state?: string } | null>(null);
  const [newLogo, setNewLogo] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newSchedules, setNewSchedules] = useState<Schedule[]>([]);
  const [newPhoneCode, setNewPhoneCode] = useState('+1');
  const [newPhone, setNewPhone] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [newFacebook, setNewFacebook] = useState('');
  const [newTwitter, setNewTwitter] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [multiBizStatus, setMultiBizStatus] = useState<'none' | 'needs_request' | 'pending_evaluation'>('none');
  const [multiBizMessage, setMultiBizMessage] = useState('');
  const [rejectedBiz, setRejectedBiz] = useState<any | null>(null);
  const [approvedBiz, setApprovedBiz] = useState<any | null>(null);

  const totalProfit = businesses.reduce((acc, b) => acc + (b.ganancia_neta || 0), 0);

  const load = async () => {
    setLoading(true);
    try {
      const list = await ApiService.getBusinesses();
      setBusinesses(list);
      const rejected = list.find((b: any) => b.is_rejected);
      if (rejected) {
        setRejectedBiz(rejected);
      }
      const approved = list.find((b: any) => b.is_approved);
      if (approved) {
        setApprovedBiz(approved);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDismissRejected = async () => {
    if (!rejectedBiz) return;
    try {
      await ApiService.dismissRejectedBusinessRequest(rejectedBiz.id);
      setRejectedBiz(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al limpiar solicitud.');
    }
  };

  const handleClaimApproved = async () => {
    if (!approvedBiz) return;
    setCreating(true);
    try {
      await ApiService.claimApprovedBusinessRequest(approvedBiz.id);
      setApprovedBiz(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al reclamar el negocio aprobado.');
    } finally {
      setCreating(false);
    }
  };

  const handleEnter = async (biz: BizSummary) => {
    if (biz.is_pending || (biz as any).is_rejected) return;
    if (!biz.location || !biz.location.address) {
      setEditingBiz(biz);
      setEditName(biz.nombre);
      setEditLocation(biz.location || null);
      setError('Por favor, ingresa la ubicación del negocio para poder gestionarlo.');
      return;
    }
    setSelecting(biz.id);
    try {
      await selectBusiness(biz.id);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Error al seleccionar negocio.');
      setSelecting(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    setMultiBizStatus('none');
    try {
      const workingHoursStr = newSchedules.length > 0 ? newSchedules.map(s => `${s.days.join(',')} de ${s.openTime} a ${s.closeTime}`).join(' | ') : undefined;
      const fullPhone = newPhone ? `${newPhoneCode} ${newPhone}` : undefined;
      const result = await ApiService.createBusiness(newName.trim(), location, newLogo, newDescription, workingHoursStr, fullPhone, newInstagram, newFacebook, newTwitter, newWebsite);
      if (result && result.is_pending) {
        setMultiBizStatus('pending_evaluation');
        setMultiBizMessage(`Tu petición ha sido enviada al Mega Guardian. Serás contactado por correo electrónico a ${user?.email || 'tu cuenta'} una vez que sea evaluada.`);
      } else {
        setNewName('');
        setLocation(null);
        setShowCreate(false);
      }
      await load();
    } catch (err: any) {
      if (err.message && err.message.startsWith('MULTI_BIZ_ERROR:')) {
        const parts = err.message.split(':');
        const errType = parts[1] as 'needs_request' | 'pending_evaluation';
        setMultiBizStatus(errType);
        setMultiBizMessage('');
      } else {
        setError(err.message || 'Error al crear negocio.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSendRequest = async () => {
    setCreating(true);
    setError('');
    try {
      await ApiService.requestMultiBusiness({ nombre: newName, location: location, logo: newLogo });
      setMultiBizStatus('pending_evaluation');
      setMultiBizMessage(`Tu petición ha sido enviada al Mega Guardian. Serás contactado por correo electrónico a ${user?.email || 'tu cuenta'} una vez que sea evaluada.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al solicitar permiso.');
    } finally {
      setCreating(false);
    }
  };


  const parseWorkingHours = (str: string) => {
    const result: Schedule[] = [];
    if (!str) return result;
    const to24h = (time12h: string) => {
      const match = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return time12h;
      let [_, h, m, p] = match;
      let hh = parseInt(h);
      if (p.toUpperCase() === 'PM' && hh < 12) hh += 12;
      if (p.toUpperCase() === 'AM' && hh === 12) hh = 0;
      return `${hh.toString().padStart(2, '0')}:${m}`;
    };
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
           result.push({
             days: daysPart.split(',').map(d => d.trim()).filter(Boolean),
             openTime: to24h(timePart.substring(0, aIndex).trim()),
             closeTime: to24h(timePart.substring(aIndex + 3).trim())
           });
         }
      } else if (b.includes('-')) {
        const parts = b.split('|');
        const times = b.split('-');
        if (times.length === 2) {
           result.push({ days: [], openTime: to24h(times[0].trim()), closeTime: to24h(times[1].trim()) });
        }
      }
    }
    return result;
  };

  const handleEditClick = (biz: BizSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (biz.is_pending) return;
    setEditingBiz(biz);
    setEditName(biz.nombre);
    setEditLocation(biz.location || null);
    setEditLogo(biz.logo || '');
    setEditDescription(biz.description || '');
    setEditSchedules(parseWorkingHours(biz.working_hours || ''));
    if (biz.phone) {
      const match = biz.phone.match(/^(\+\d{1,3})\s?(.*)$/);
      if (match) {
        setEditPhoneCode(match[1]);
        setEditPhone(match[2].replace(/\D/g, ''));
      } else {
        setEditPhone(biz.phone.replace(/\D/g, ''));
      }
    } else {
      setEditPhoneCode('+1');
      setEditPhone('');
    }
    setEditInstagram(biz.social_links?.instagram || '');
    setEditFacebook(biz.social_links?.facebook || '');
    setEditTwitter(biz.social_links?.twitter || '');
    setEditWebsite(biz.social_links?.website || '');
    setEditMarketUrl((biz as any).settings?.market_sync_url || '');
    setEditMarketKey((biz as any).settings?.market_api_key || '');
  };

  const handleSaveBiz = async () => {
    if (!editingBiz) return;
    if (!editName.trim()) { setError('El nombre es requerido.'); return; }
    if (!editLocation?.address) { setError('La ubicación es requerida.'); return; }
    
    setCreating(true);
    setError('');
    
    const to12h = (time24h: string) => {
      if (!time24h) return time24h;
      const parts = time24h.split(':');
      if (parts.length < 2) return time24h;
      let hh = parseInt(parts[0]);
      const m = parts[1];
      if (isNaN(hh)) return time24h;
      const p = hh >= 12 ? 'PM' : 'AM';
      if (hh === 0) hh = 12;
      if (hh > 12) hh -= 12;
      return `${hh.toString().padStart(2, '0')}:${m} ${p}`;
    };
    
    const wh = editSchedules.map(s => `${s.days.join(', ')} de ${to12h(s.openTime)} a ${to12h(s.closeTime)}`).join(' | ');
    const formattedPhone = editPhone ? `${editPhoneCode} ${editPhone}` : '';

    try {
      await ApiService.updateBusiness(
        editingBiz.id,
        editName.trim(),
        editLocation,
        editLogo,
        editDescription,
        wh,
        formattedPhone,
        editInstagram,
        editFacebook,
        editTwitter,
        editWebsite,
        editMarketUrl,
        editMarketKey
      );
      setEditingBiz(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const [copied, setCopied] = useState(false);
    const getShareText = (biz: any) => {
    return `Hola! Tu código de acceso a la caja registradora de *${biz.nombre}* es: *${biz.codigo}*\n\nIngresa a ${window.location.origin}/login y usa este código junto con tu usuario y contraseña.`;
  };

  const handleCopyClipboard = async () => {
    if (editingBiz) {
      try {
        await navigator.clipboard.writeText(getShareText(editingBiz).replace(/\*/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {}
    }
  };

  const handleShareGmail = () => {
    if (editingBiz) {
      const subject = encodeURIComponent(`Acceso a Caja: ${editingBiz.nombre}`);
      const body = encodeURIComponent(getShareText(editingBiz).replace(/\*/g, ''));
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`, '_blank');
    }
  };

  const handleShareWhatsapp = () => {
    if (editingBiz) {
      const text = encodeURIComponent(getShareText(editingBiz));
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  const handleImageFile = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    try {
      const base64 = await compressImage(file, 800, 0.6);
      setEditLogo(base64);
    } catch (err) {
      console.error('Error compressing image:', err);
    }
  };

  const handleDelete = async () => {
    if (!editingBiz) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este negocio y todos sus datos? Esta acción es irreversible.')) return;
    setCreating(true);
    try {
      await ApiService.deleteBusiness(editingBiz.id);
      setEditingBiz(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar negocio.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-20 selection:bg-blue-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6"
        >
          <div className="flex items-center gap-6 bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5 w-full">
            <img src="/vuttik-pos-logo.png" alt="Vuttik POS" className="w-16 object-contain hidden sm:block" />
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Panel de Control</p>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                  Hola, <span className="text-blue-600">{user?.nombre}</span> 👋
                </h1>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-xs uppercase tracking-widest font-black shrink-0"
              >
                <LogOut size={16} className="hidden sm:block" />
                Salir
              </button>
            </div>
          </div>
        </motion.div>

        {/* Global Stats - Franja delgada */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <button
            onClick={() => setShowProfitModal(true)}
            className="w-full relative flex items-center justify-between bg-[#0B1120] border border-slate-800 rounded-2xl px-5 py-3 sm:px-6 sm:py-4 shadow-lg hover:border-slate-700 hover:shadow-emerald-900/20 transition-all group overflow-hidden"
          >
            {/* Hover subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/80 border border-slate-700 group-hover:scale-110 transition-transform shadow-inner shrink-0">
                <TrendingUp className="text-emerald-400" size={20} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 text-left">
                <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Balance Global
                </span>
                <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {formatCurrency(totalProfit)}
                </span>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm font-semibold relative z-10 group-hover:text-white transition-colors">
              Ver Análisis &rarr;
            </div>
          </button>
        </motion.div>

        {/* Business Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setShowCreate(true); setError(''); }}
              className="group relative flex flex-col items-center justify-center gap-4 p-8 bg-white border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-3xl transition-all duration-300 text-center min-h-[220px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center transition-all">
                <Plus className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
              </div>
              <div>
                <p className="text-gray-900 font-black group-hover:text-blue-700 transition-colors text-lg">Nuevo Negocio</p>
                <p className="text-gray-500 text-sm font-bold mt-1">Agregar tienda o local</p>
              </div>
            </motion.button>

            {businesses.map((biz, i) => (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.1 }}
                className={`group relative bg-white border ${biz.is_pending ? 'border-dashed border-gray-300 opacity-90' : 'border-gray-100 hover:border-blue-200'} rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 flex flex-col min-h-[220px]`}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${biz.is_pending ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                    {biz.logo ? (
                      <img src={biz.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={22} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-black text-lg leading-tight truncate ${biz.is_pending ? 'text-gray-600' : 'text-gray-900'}`}>{biz.nombre}</h3>
                      {biz.is_suspended && !biz.is_pending && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                          Suspendido
                        </span>
                      )}
                      {biz.is_pending && (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
                          En proceso
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {biz.is_pending && biz.location?.address ? (
                        <>
                          <MapPin size={12} className="text-gray-400" />
                          <span className="text-gray-500 text-xs font-bold truncate">{biz.location.address}</span>
                        </>
                      ) : (
                        <>
                          <Hash size={12} className="text-gray-400" />
                          <span className="text-gray-500 text-xs font-mono font-bold uppercase tracking-wider">{biz.codigo}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {!biz.is_pending && (
                    <button 
                      onClick={(e) => handleEditClick(biz, e)}
                      className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all shrink-0"
                      title="Ajustes del negocio"
                    >
                      <Settings size={20} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { icon: <Package size={14} />, val: biz.product_count, label: 'Prods' },
                    { icon: <ShoppingBag size={14} />, val: biz.sales_count, label: 'Ventas' },
                    { icon: <User size={14} />, val: biz.employee_count, label: 'Equipo' },
                  ].map(({ icon, val, label }) => (
                    <div key={label} className={`border rounded-2xl p-2.5 text-center ${biz.is_pending ? 'bg-gray-50/50 border-gray-100/50' : 'bg-gray-50 border-gray-100'}`}>
                      <div className={`flex items-center justify-center mb-1 ${biz.is_pending ? 'text-gray-300' : 'text-gray-400'}`}>{icon}</div>
                      <div className={`font-black text-sm ${biz.is_pending ? 'text-gray-400' : 'text-gray-900'}`}>{val}</div>
                      <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Enter button */}
                <button
                  onClick={() => handleEnter(biz)}
                  disabled={selecting === biz.id || biz.is_suspended || biz.is_pending || (biz as any).is_rejected || (biz as any).is_approved}
                  className={`mt-auto w-full py-3.5 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md text-xs uppercase tracking-widest ${
                    biz.is_suspended || (biz as any).is_rejected
                      ? 'bg-red-50 text-red-400 cursor-not-allowed opacity-80' 
                      : (biz as any).is_approved
                      ? 'bg-green-50 text-green-500 cursor-not-allowed border border-green-100'
                      : biz.is_pending
                      ? 'bg-amber-50 text-amber-500 cursor-not-allowed border border-amber-100'
                      : 'bg-gray-900 hover:bg-black text-white group/btn disabled:opacity-60'
                  }`}
                >
                  {selecting === biz.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : biz.is_suspended ? (
                    'Acceso Bloqueado'
                  ) : (biz as any).is_rejected ? (
                    'Solicitud Rechazada'
                  ) : (biz as any).is_approved ? (
                    'Solicitud Aprobada'
                  ) : biz.is_pending ? (
                    'Pendiente de Aprobación'
                  ) : (
                    <>
                      Gestionar
                      <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create Business Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900">Crear Nuevo Negocio</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>
              {multiBizStatus === 'pending_evaluation' ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Solicitud Enviada</h3>
                  <p className="text-gray-500 text-sm mb-6">{multiBizMessage}</p>
                  <button onClick={() => { setShowCreate(false); setMultiBizStatus('none'); }} className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs">
                    Entendido
                  </button>
                </div>
              ) : multiBizStatus === 'needs_request' ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Límite Alcanzado</h3>
                  <p className="text-gray-500 text-sm mb-6">No tienes un plan premium activo. Debes solicitar acceso al Mega Guardian para crear otro negocio.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setShowCreate(false); setMultiBizStatus('none'); }} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-black rounded-2xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs">
                      Cancelar
                    </button>
                    <button onClick={handleSendRequest} disabled={creating} className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest text-xs shadow-lg shadow-amber-200">
                      {creating ? <Loader2 className="animate-spin" size={16} /> : 'Enviar Solicitud'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      autoFocus required type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Nombre del negocio (ej: Mi Tienda)"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative shrink-0">
                      {newLogo ? (
                        <img src={newLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="text-gray-400" size={24} />
                      )}
                      <input type="file" accept="image/*" onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const base64 = await compressImage(file, 800, 0.6);
                            setNewLogo(base64);
                          } catch (err) {
                            console.error('Error compressing image:', err);
                          }
                        }
                      }} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Logo del Negocio</p>
                      <p className="text-xs text-gray-500">Haz clic en el recuadro para subir imagen</p>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={newDescription} onChange={e => setNewDescription(e.target.value)}
                      placeholder="Descripción del negocio..."
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">Horario de Trabajo</p>
                      <button type="button" onClick={() => setNewSchedules([...newSchedules, { days: [], openTime: '08:00', closeTime: '18:00' }])} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Plus size={14} /> Agregar Horario
                      </button>
                    </div>
                    {newSchedules.length === 0 && (
                      <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">
                        No hay horarios configurados. Haz clic en "Agregar Horario".
                      </div>
                    )}
                    {newSchedules.map((schedule, index) => (
                      <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl relative space-y-3">
                        <button type="button" onClick={() => setNewSchedules(newSchedules.filter((_, i) => i !== index))} className="absolute top-3 right-3 text-red-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                        <div className="flex gap-2 flex-wrap pr-8">
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                            <label key={day} className={`px-2.5 py-1 rounded-md border cursor-pointer transition-all text-[11px] font-bold ${schedule.days.includes(day) ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                              <input type="checkbox" className="hidden" checked={schedule.days.includes(day)} onChange={e => {
                                const schedules = [...newSchedules];
                                if (e.target.checked) schedules[index].days = [...schedule.days, day];
                                else schedules[index].days = schedule.days.filter(d => d !== day);
                                setNewSchedules(schedules);
                              }} />
                              {day.substring(0, 3)}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-3 items-center">
                          <input type="time" value={schedule.openTime} onChange={e => {
                            const schedules = [...newSchedules];
                            schedules[index].openTime = e.target.value;
                            setNewSchedules(schedules);
                          }} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 font-bold text-sm" />
                          <span className="text-gray-400 font-bold text-sm">a</span>
                          <input type="time" value={schedule.closeTime} onChange={e => {
                            const schedules = [...newSchedules];
                            schedules[index].closeTime = e.target.value;
                            setNewSchedules(schedules);
                          }} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 font-bold text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 mt-4">
                    <LocationInput
                      value={location?.address || ''}
                      onChange={(addr, placeName, country, state) => setLocation(prev => ({ ...prev, address: addr, country, state }))}
                      onCoordinatesChange={(lat, lng) => setLocation(prev => ({ ...prev, lat, lng, address: prev?.address || '' }))}
                      placeholder="Ubicación del negocio"
                    />
                  </div>

                  <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100 mt-4">
                    <p className="text-sm font-black text-gray-900 border-b border-gray-200 pb-3">Información de Contacto <span className="text-gray-400 font-normal ml-2">(Opcional)</span></p>
                    
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Teléfono</label>
                      <div className="flex gap-2">
                        <select 
                          value={newPhoneCode} 
                          onChange={e => setNewPhoneCode(e.target.value)}
                          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all cursor-pointer"
                        >
                          <option value="+1">🇩🇴/🇺🇸 +1</option>
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+52">🇲🇽 +52</option>
                          <option value="+57">🇨🇴 +57</option>
                          <option value="+54">🇦🇷 +54</option>
                          <option value="+56">🇨🇱 +56</option>
                          <option value="+51">🇵🇪 +51</option>
                          <option value="+593">🇪🇨 +593</option>
                          <option value="+58">🇻🇪 +58</option>
                          <option value="+507">🇵🇦 +507</option>
                          <option value="+506">🇨🇷 +506</option>
                          <option value="+504">🇭🇳 +504</option>
                          <option value="+503">🇸🇻 +503</option>
                          <option value="+502">🇬🇹 +502</option>
                          <option value="+505">🇳🇮 +505</option>
                        </select>
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="Ej. 809 555 5555"
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Instagram</label>
                        <input
                          type="text"
                          value={newInstagram}
                          onChange={(e) => setNewInstagram(e.target.value)}
                          placeholder="@usuario"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Facebook</label>
                        <input
                          type="text"
                          value={newFacebook}
                          onChange={(e) => setNewFacebook(e.target.value)}
                          placeholder="Enlace o usuario"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Twitter (X)</label>
                        <input
                          type="text"
                          value={newTwitter}
                          onChange={(e) => setNewTwitter(e.target.value)}
                          placeholder="@usuario"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Sitio Web</label>
                        <input
                          type="url"
                          value={newWebsite}
                          onChange={(e) => setNewWebsite(e.target.value)}
                          placeholder="https://www.minegocio.com"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs font-bold mt-4">Se generará automáticamente un código único para tus empleados (ej: MIT-001).</p>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 font-black transition-all text-xs uppercase tracking-widest">
                      Cancelar
                    </button>
                    <button type="submit" disabled={creating || !newName.trim() || !location?.address} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-100">
                      {creating ? <Loader2 className="animate-spin" size={16} /> : 'Crear'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit/Delete Business Modal */}
      <AnimatePresence>
        {editingBiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={e => { if (e.target === e.currentTarget) setEditingBiz(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900">Ajustes del Negocio</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCopyClipboard} title="Copiar al portapapeles" className="text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 p-2 rounded-full flex items-center justify-center">
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                  <button type="button" onClick={handleShareGmail} title="Compartir por Gmail" className="text-red-600 hover:text-red-700 transition-colors bg-red-50 hover:bg-red-100 p-2 rounded-full flex items-center justify-center">
                    <Mail size={20} />
                  </button>
                  <button type="button" onClick={handleShareWhatsapp} title="Compartir por WhatsApp" className="text-green-600 hover:text-green-700 transition-colors bg-green-50 hover:bg-green-100 p-2 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </button>
                  <button type="button" onClick={() => setEditingBiz(null)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSaveBiz(); }} className="space-y-5">

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative shrink-0">
                    {editLogo ? (
                      <img src={editLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="text-gray-400" size={24} />
                    )}
                    <input type="file" accept="image/*" onChange={e => handleImageFile(e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Logo del Negocio</p>
                    <p className="text-xs text-gray-500">Haz clic en el recuadro para subir imagen</p>
                  </div>
                </div>

                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    autoFocus required type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    placeholder="Nombre del negocio (ej: Mi Tienda)"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold"
                  />
                </div>

                <div className="relative">
                  <textarea
                    value={editDescription} onChange={e => setEditDescription(e.target.value)}
                    placeholder="Descripción del negocio..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Horario de Trabajo</p>
                    <button type="button" onClick={() => setEditSchedules([...editSchedules, { days: [], openTime: '08:00', closeTime: '18:00' }])} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Plus size={14} /> Agregar Horario
                    </button>
                  </div>
                  {editSchedules.length === 0 && (
                    <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">
                      No hay horarios configurados. Haz clic en "Agregar Horario".
                    </div>
                  )}
                  {editSchedules.map((schedule, index) => (
                    <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl relative space-y-3">
                      <button type="button" onClick={() => setEditSchedules(editSchedules.filter((_, i) => i !== index))} className="absolute top-3 right-3 text-red-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                      <div className="flex gap-2 flex-wrap pr-8">
                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                          <label key={day} className={`px-2.5 py-1 rounded-md border cursor-pointer transition-all text-[11px] font-bold ${schedule.days.includes(day) ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
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
                        }} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 font-bold text-sm" />
                        <span className="text-gray-400 font-bold text-sm">a</span>
                        <input type="time" value={schedule.closeTime} onChange={e => {
                          const newSchedules = [...editSchedules];
                          newSchedules[index].closeTime = e.target.value;
                          setEditSchedules(newSchedules);
                        }} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 font-bold text-sm" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative z-10">
                  <LocationInput
                    value={editLocation?.address || ''}
                    onChange={(addr, placeName, country, state) => setEditLocation(prev => ({ ...prev, address: addr, country, state }))}
                    onCoordinatesChange={(lat, lng) => setEditLocation(prev => ({ ...prev, lat, lng, address: prev?.address || '' }))}
                    placeholder="Ubicación del negocio"
                  />
                </div>

                <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-sm font-black text-gray-900 border-b border-gray-200 pb-3">Información de Contacto <span className="text-gray-400 font-normal ml-2">(Opcional)</span></p>
                  
                  <div>
                    <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Teléfono</label>
                    <div className="flex gap-2">
                      <select 
                        value={editPhoneCode} 
                        onChange={e => setEditPhoneCode(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all cursor-pointer"
                      >
                        <option value="+1">🇩🇴/🇺🇸 +1</option>
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+52">🇲🇽 +52</option>
                        <option value="+57">🇨🇴 +57</option>
                        <option value="+54">🇦🇷 +54</option>
                        <option value="+56">🇨🇱 +56</option>
                        <option value="+51">🇵🇪 +51</option>
                        <option value="+593">🇪🇨 +593</option>
                        <option value="+58">🇻🇪 +58</option>
                        <option value="+507">🇵🇦 +507</option>
                        <option value="+506">🇨🇷 +506</option>
                        <option value="+504">🇭🇳 +504</option>
                        <option value="+503">🇸🇻 +503</option>
                        <option value="+502">🇬🇹 +502</option>
                        <option value="+505">🇳🇮 +505</option>
                      </select>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Ej. 809 555 5555"
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Instagram</label>
                      <input
                        type="text"
                        value={editInstagram}
                        onChange={(e) => setEditInstagram(e.target.value)}
                        placeholder="@usuario"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Facebook</label>
                      <input
                        type="text"
                        value={editFacebook}
                        onChange={(e) => setEditFacebook(e.target.value)}
                        placeholder="Enlace o usuario"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Twitter (X)</label>
                      <input
                        type="text"
                        value={editTwitter}
                        onChange={(e) => setEditTwitter(e.target.value)}
                        placeholder="@usuario"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">Sitio Web</label>
                      <input
                        type="url"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        placeholder="https://www.minegocio.com"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                      />
                    </div>
                  </div>
                </div>
                  <div className="space-y-4 bg-purple-50 p-6 rounded-3xl border border-purple-100 mt-4">
                    <p className="text-sm font-black text-purple-900 border-b border-purple-200 pb-3 flex items-center gap-2">Sincronización Avanzada <span className="text-[10px] bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Servidores Propios</span></p>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[11px] font-black text-purple-700 mb-1.5 uppercase tracking-wider">URL de Vuttik Marketplace</label>
                        <input type="url" value={editMarketUrl} onChange={(e) => setEditMarketUrl(e.target.value)} placeholder="Ej. https://pos.vuttik.com" className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 font-bold text-gray-900 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-purple-700 mb-1.5 uppercase tracking-wider">API Key (Tu ID de Vuttik)</label>
                        <input type="password" value={editMarketKey} onChange={(e) => setEditMarketKey(e.target.value)} placeholder="Pega tu ID aquí" className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 font-bold text-gray-900 transition-all" />
                      </div>
                    </div>
                  </div>


                <div className="flex justify-between items-center bg-red-50 p-4 rounded-2xl border border-red-100">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-red-900 font-bold text-sm">Zona de Peligro</p>
                      <p className="text-red-600 text-xs font-medium mt-0.5">Eliminar un negocio borrará todos sus datos permanentemente.</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleDelete} disabled={creating} className="shrink-0 p-2.5 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-xl transition-colors disabled:opacity-50">
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingBiz(null)} className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 font-black transition-all text-xs uppercase tracking-widest">
                    Cancelar
                  </button>
                  <button type="submit" disabled={creating || !editName.trim() || !editLocation?.address} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-100">
                    {creating ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejected Business Alert Modal */}
      <AnimatePresence>
        {rejectedBiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-500"></div>
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3">Solicitud Declinada</h2>
              <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                Lamentamos informarte que tu solicitud para el negocio <span className="font-bold text-gray-900">"{rejectedBiz.nombre}"</span> ha sido declinada por el Mega Guardian.
              </p>
              <button 
                onClick={handleDismissRejected}
                className="w-full py-4 bg-gray-900 hover:bg-black text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl uppercase tracking-widest text-xs"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approved Business Alert Modal */}
      <AnimatePresence>
        {approvedBiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-green-500"></div>
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Check size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3">¡Solicitud Aprobada!</h2>
              <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                ¡Felicidades! Tu solicitud para el negocio <span className="font-bold text-gray-900">"{approvedBiz.nombre}"</span> ha sido aprobada exitosamente por el Mega Guardian.
              </p>
              <button 
                onClick={handleClaimApproved}
                disabled={creating}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-200 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {creating ? <Loader2 className="animate-spin" size={16} /> : 'Crear Negocio Ahora'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profit Breakdown Modal */}
      <AnimatePresence>
        {showProfitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={e => { if (e.target === e.currentTarget) setShowProfitModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Desglose de Ganancias</h2>
                  <p className="text-gray-500 font-bold text-sm mt-1">Rentabilidad por negocio en tu cartera</p>
                </div>
                <button onClick={() => setShowProfitModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-3 rounded-2xl">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {businesses.map((biz) => {
                  const profit = biz.ganancia_neta || 0;
                  const percentage = totalProfit > 0 ? ((profit / totalProfit) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={biz.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 shadow-sm flex items-center justify-center shrink-0 font-black">
                          {percentage}%
                        </div>
                        <div>
                          <h3 className="text-gray-900 font-black text-lg">{biz.nombre}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Hash size={12} className="text-gray-400" />
                            <span className="text-gray-500 text-xs font-mono font-bold uppercase tracking-wider">{biz.codigo}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-black text-xl">{formatCurrency(profit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                <span className="text-gray-400 font-black uppercase tracking-widest text-xs">Total Cartera</span>
                <span className="text-gray-900 font-black text-2xl">{formatCurrency(totalProfit)}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
