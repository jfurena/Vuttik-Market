import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Store, Loader2, LogOut, Hash, Package, ShoppingBag, ChevronRight, X, AlertCircle, User, TrendingUp, DollarSign, MapPin, Briefcase } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface BizSummary {
  id: string;
  nombre: string;
  codigo: string;
  fecha_creacion: string;
  employee_count: number;
  product_count: number;
  sales_count: number;
  ganancia_neta?: number;
}

export default function BusinessSelector() {
  const { user, selectBusiness, logout } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUbicacion, setNewUbicacion] = useState('');
  const [newTipo, setNewTipo] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const totalProfit = businesses.reduce((acc, b) => acc + (b.ganancia_neta || 0), 0);

  const load = async () => {
    setLoading(true);
    try {
      const list = await ApiService.getBusinesses();
      setBusinesses(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEnter = async (bizId: string) => {
    setSelecting(bizId);
    try {
      await selectBusiness(bizId);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Error al seleccionar negocio.');
      setSelecting(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUbicacion.trim() || !newTipo) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await ApiService.createBusiness(newName.trim(), newUbicacion.trim(), newTipo);
      setNewName('');
      setNewUbicacion('');
      setNewTipo('');
      setShowCreate(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al crear negocio.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10 mt-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-6">
            <img src="/vuttik-pos-logo.png" alt="Vuttik POS" className="w-16 object-contain hidden sm:block" />
            <div>
              <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Panel de Control de Vuttik</p>
              <h1 className="text-3xl font-black text-gray-900">
                Hola, <span className="text-blue-600">{user?.nombre}</span> 👋
              </h1>
              <p className="text-gray-500 font-bold mt-1 text-sm">Selecciona un negocio para comenzar a gestionar</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs uppercase tracking-widest font-black"
          >
            <LogOut size={16} />
            Salir
          </button>
        </motion.div>

        {/* Global Profit Panel */}
        {businesses.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button 
              onClick={() => setShowProfitModal(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white flex items-center justify-between hover:scale-[1.01] transition-all shadow-xl shadow-emerald-600/20 border border-emerald-400 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <TrendingUp size={28} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-emerald-50 font-bold text-xs uppercase tracking-widest mb-1">Ganancia Neta Global (Todos los negocios)</p>
                  <p className="text-4xl font-black">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
              <div className="bg-white/10 group-hover:bg-white/20 p-3 rounded-full transition-colors hidden sm:block">
                <ChevronRight size={24} className="text-white" />
              </div>
            </button>
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 font-bold"
            >
              <AlertCircle size={16} />
              {error}
              <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

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
            {/* Create new business card */}
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

            {/* Business cards */}
            {businesses.map((biz, i) => (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.1 }}
                className="group relative bg-white border border-gray-100 hover:border-blue-200 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 flex flex-col min-h-[220px]"
              >
                {/* Business icon + name */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Store size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-black text-lg leading-tight truncate">{biz.nombre}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Hash size={12} className="text-gray-400" />
                      <span className="text-gray-500 text-xs font-mono font-bold uppercase tracking-wider">{biz.codigo}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { icon: <Package size={14} />, val: biz.product_count, label: 'Prods' },
                    { icon: <ShoppingBag size={14} />, val: biz.sales_count, label: 'Ventas' },
                    { icon: <User size={14} />, val: biz.employee_count, label: 'Equipo' },
                  ].map(({ icon, val, label }) => (
                    <div key={label} className="bg-gray-50 border border-gray-100 rounded-2xl p-2.5 text-center">
                      <div className="flex items-center justify-center text-gray-400 mb-1">{icon}</div>
                      <div className="text-gray-900 font-black text-sm">{val}</div>
                      <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Enter button */}
                <button
                  onClick={() => handleEnter(biz.id)}
                  disabled={selecting === biz.id}
                  className="mt-auto w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60 group/btn text-xs uppercase tracking-widest"
                >
                  {selecting === biz.id ? (
                    <Loader2 className="animate-spin" size={16} />
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
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900">Crear Nuevo Negocio</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    autoFocus required type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Nombre del negocio (ej: Mi Tienda)"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold"
                  />
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required type="text" value={newUbicacion} onChange={e => setNewUbicacion(e.target.value)}
                    placeholder="Ubicación del local (ej: Av. Principal #123)"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold"
                  />
                </div>

                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    required value={newTipo} onChange={e => setNewTipo(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Selecciona el tipo de establecimiento</option>
                    <option value="Supermercado">Supermercado</option>
                    <option value="Ferretería">Ferretería</option>
                    <option value="Farmacia">Farmacia</option>
                    <option value="Colmado">Colmado</option>
                    <option value="Tienda de Ropa">Tienda de Ropa</option>
                    <option value="Repuestos">Repuestos de Vehículos</option>
                    <option value="Restaurante">Restaurante / Comida Rápida</option>
                    <option value="Tecnología">Tienda de Tecnología</option>
                    <option value="Otro">Otro tipo de establecimiento</option>
                  </select>
                </div>
                <p className="text-gray-500 text-xs font-bold">Se generará automáticamente un código único para tus empleados (ej: MIT-001).</p>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 font-black transition-all text-xs uppercase tracking-widest">
                    Cancelar
                  </button>
                  <button type="submit" disabled={creating || !newName.trim() || !newUbicacion.trim() || !newTipo} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-100">
                    {creating ? <Loader2 className="animate-spin" size={16} /> : 'Crear Negocio'}
                  </button>
                </div>
              </form>
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
