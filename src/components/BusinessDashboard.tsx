import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { 
  Package, TrendingUp, Search, Eye, MessageCircle, 
  Plus, Edit2, Trash2, Filter, ChevronRight, BarChart2, Megaphone, Target, Users, CreditCard, CheckCircle2,
  DollarSign, Globe, X, Save
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import PromotionModal from './PromotionModal';

const SEARCH_DATA = [
  { name: 'Arroz', busquedas: 2400 },
  { name: 'Leche', busquedas: 1398 },
  { name: 'Aceite', busquedas: 9800 },
  { name: 'Pollo', busquedas: 3908 },
  { name: 'Pan', busquedas: 4800 },
];

const MOCK_STORAGE = [
  { id: '1', name: 'Leche Entera 1L', price: '1.20', stock: 45, views: 1240, status: 'Active' },
  { id: '2', name: 'Arroz Premium 5lb', price: '4.50', stock: 120, views: 850, status: 'Active' },
  { id: '3', name: 'Aceite de Oliva 500ml', price: '8.99', stock: 15, views: 320, status: 'Low Stock' },
];

export default function BusinessDashboard({ onViewProduct }: { onViewProduct?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'storage' | 'analytics' | 'promotions'>('storage');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [promoTarget, setPromoTarget] = useState<{id: string, type: 'product' | 'post'} | null>(null);

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    status: 'Active'
  });

  // Promotion Form State
  const [promoType, setPromoType] = useState<'post' | 'product'>('product');
  const [promoTargetId, setPromoTargetId] = useState('');
  const [promoAudience, setPromoAudience] = useState<'global' | 'segmented'>('global');
  const [promoBudget, setPromoBudget] = useState('50');

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Promotions listener
    const qPromo = query(collection(db, 'promotions'), where('businessId', '==', auth.currentUser.uid));
    const unsubscribePromo = onSnapshot(qPromo, (snapshot) => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'promotions');
    });

    // Inventory listener (Products)
    const qInv = query(collection(db, 'products'), where('authorId', '==', auth.currentUser.uid));
    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => {
      unsubscribePromo();
      unsubscribeInv();
    };
  }, []);

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      stock: item.stock?.toString() || '0',
      status: item.status || 'Active'
    });
    setShowEditModal(true);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      price: '',
      stock: '',
      status: 'Active'
    });
    setShowEditModal(true);
  };

  const handleSaveItem = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const data = {
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        status: formData.status,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, 'products', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          authorId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          views: 0,
          upVotes: [],
          downVotes: []
        });
      }
      setShowEditModal(false);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const handleOpenPromote = (id?: string) => {
    if (id) {
      setPromoTarget({ id, type: 'product' });
    } else {
      setPromoTarget(null);
    }
    setShowPromoteModal(true);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-vuttik-blue text-white rounded-xl md:rounded-[20px] flex items-center justify-center shadow-xl shadow-vuttik-blue/20 shrink-0">
            <Package size={20} className="md:size-8" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-display font-black text-vuttik-navy">Panel de Empresa</h2>
            <p className="text-vuttik-text-muted text-[10px] md:text-sm font-bold uppercase tracking-widest">Gestión de Inventario y Métricas</p>
          </div>
        </div>
        <div className="flex bg-vuttik-gray p-1 md:p-1.5 rounded-xl md:rounded-2xl self-start md:self-auto">
          <button 
            onClick={() => setActiveTab('storage')}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all ${activeTab === 'storage' ? 'bg-white text-vuttik-navy shadow-sm' : 'text-vuttik-text-muted'}`}
          >
            Storage
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-vuttik-navy shadow-sm' : 'text-vuttik-text-muted'}`}
          >
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('promotions')}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all ${activeTab === 'promotions' ? 'bg-white text-vuttik-navy shadow-sm' : 'text-vuttik-text-muted'}`}
          >
            Promociones
          </button>
        </div>
      </div>

      {activeTab === 'storage' ? (
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-display font-black text-vuttik-navy">Inventario</h3>
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-vuttik-navy text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold shadow-lg shadow-vuttik-navy/20"
            >
              <Plus size={16} className="md:size-4.5" />
              Añadir
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {inventory.length > 0 ? inventory.map((item) => (
              <div key={item.id} className="bg-white border border-gray-100 p-4 md:p-6 rounded-2xl md:rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 hover:shadow-xl hover:shadow-vuttik-navy/5 transition-all group">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-vuttik-gray rounded-xl md:rounded-2xl flex items-center justify-center text-vuttik-navy shrink-0">
                    <Package size={24} className="md:size-8" />
                  </div>
                  <div>
                    <h4 className="text-sm md:text-lg font-bold text-vuttik-navy">{item.name}</h4>
                    <p className="text-xs md:text-sm text-vuttik-text-muted font-bold">{item.price} USD</p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-start gap-4 md:gap-8 border-y md:border-none border-gray-50 py-3 md:py-0">
                  <div className="text-center">
                    <p className="text-[8px] md:text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-0.5 md:mb-1">Stock</p>
                    <p className={`text-sm md:text-lg font-black ${item.stock < 20 ? 'text-red-500' : 'text-vuttik-navy'}`}>{item.stock || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] md:text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-0.5 md:mb-1">Vistas</p>
                    <p className="text-sm md:text-lg font-black text-vuttik-navy">{item.views || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] md:text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-0.5 md:mb-1">Estado</p>
                    <span className={`text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg uppercase ${item.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {item.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenPromote(item.id)}
                    className="flex-1 md:flex-none p-2.5 md:p-3 bg-vuttik-gray rounded-xl md:rounded-2xl text-vuttik-blue hover:bg-vuttik-blue hover:text-white transition-all flex justify-center"
                    title="Promocionar"
                  >
                    <Megaphone size={16} className="md:size-4.5" />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(item)}
                    className="flex-1 md:flex-none p-2.5 md:p-3 bg-vuttik-gray rounded-xl md:rounded-2xl text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all flex justify-center"
                    title="Editar"
                  >
                    <Edit2 size={16} className="md:size-4.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 md:flex-none p-2.5 md:p-3 bg-vuttik-gray rounded-xl md:rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all flex justify-center"
                    title="Eliminar"
                  >
                    <Trash2 size={16} className="md:size-4.5" />
                  </button>
                  <button 
                    onClick={() => onViewProduct?.(item.id)}
                    className="flex-1 md:flex-none p-2.5 md:p-3 bg-vuttik-navy text-white rounded-xl md:rounded-2xl hover:scale-105 transition-all flex justify-center"
                    title="Ver Detalles"
                  >
                    <ChevronRight size={16} className="md:size-4.5" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center bg-vuttik-gray/50 rounded-[40px] border-2 border-dashed border-gray-200">
                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-bold text-vuttik-navy">No hay productos</h4>
                <p className="text-sm text-vuttik-text-muted">Empieza añadiendo tu primer producto al inventario.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Search Metrics */}
          <div className="lg:col-span-2 bg-white border border-gray-100 p-4 md:p-8 rounded-2xl md:rounded-[40px] shadow-sm">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-display font-black text-vuttik-navy">Métricas</h3>
              <BarChart2 size={20} className="text-vuttik-blue md:size-6" />
            </div>
            <div className="h-[250px] md:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SEARCH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: '#F3F4F6'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  />
                  <Bar dataKey="busquedas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 md:gap-6">
            {[
              { label: 'Conversión', value: '4.2%', icon: TrendingUp, color: 'text-green-600' },
              { label: 'Alcance', value: '45.2k', icon: Eye, color: 'text-vuttik-blue' },
              { label: 'Consultas', value: '128', icon: MessageCircle, color: 'text-vuttik-navy' },
            ].map((insight, i) => (
              <div key={i} className="bg-white border border-gray-100 p-4 md:p-6 rounded-2xl md:rounded-[32px] shadow-sm">
                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl bg-gray-50 ${insight.color}`}>
                    <insight.icon size={20} className="md:size-6" />
                  </div>
                  <p className="text-[10px] md:text-sm font-bold text-vuttik-text-muted uppercase tracking-wider">{insight.label}</p>
                </div>
                <p className="text-xl md:text-3xl font-display font-black text-vuttik-navy">{insight.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-display font-black text-vuttik-navy">Campañas Promocionales</h3>
            <button 
              onClick={() => handleOpenPromote()}
              className="flex items-center gap-2 bg-vuttik-blue text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold shadow-lg shadow-vuttik-blue/20"
            >
              <Megaphone size={16} className="md:size-4.5" />
              Promocionar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {promotions.length > 0 ? promotions.map((promo) => (
              <div key={promo.id} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${promo.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-vuttik-gray text-vuttik-text-muted'}`}>
                    <Target size={24} />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                    promo.status === 'active' ? 'bg-green-50 text-green-600' : 
                    promo.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {promo.status}
                  </span>
                </div>
                <h4 className="font-bold text-vuttik-navy mb-1">Promoción de {promo.targetType === 'product' ? 'Producto' : 'Publicación'}</h4>
                <p className="text-xs text-vuttik-text-muted mb-4">Alcance: <span className="font-bold text-vuttik-navy uppercase">{promo.audience}</span></p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-vuttik-blue" />
                    <span className="text-sm font-black text-vuttik-navy">{promo.budget} USD</span>
                  </div>
                  <p className="text-[10px] text-vuttik-text-muted font-bold">{new Date(promo.createdAt?.toDate()).toLocaleDateString()}</p>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-vuttik-gray/50 rounded-[40px] border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-vuttik-blue mb-4 shadow-sm">
                  <Megaphone size={32} />
                </div>
                <h4 className="text-lg font-bold text-vuttik-navy">Sin campañas activas</h4>
                <p className="text-sm text-vuttik-text-muted max-w-xs mt-1">Empieza a promocionar tus productos para llegar a más clientes hoy mismo.</p>
              </div>
            )}
          </div>

          {/* Promotion Modal */}
          {showPromoteModal && (
            <PromotionModal 
              isOpen={showPromoteModal}
              onClose={() => {
                setShowPromoteModal(false);
                setPromoTarget(null);
              }}
              initialTargetId={promoTarget?.id}
              initialTargetType={promoTarget?.type}
            />
          )}

          {/* Edit/Add Modal */}
          {showEditModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowEditModal(false)}
                className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
              >
                <div className="p-8 md:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-vuttik-navy text-white rounded-2xl flex items-center justify-center">
                        {editingItem ? <Edit2 size={24} /> : <Plus size={24} />}
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-black text-vuttik-navy">{editingItem ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                        <p className="text-sm text-vuttik-text-muted font-bold uppercase tracking-wider">Completa los detalles</p>
                      </div>
                    </div>
                    <button onClick={() => setShowEditModal(false)} className="p-2 bg-vuttik-gray rounded-xl text-vuttik-text-muted">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Nombre del Producto</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ej: Arroz Premium"
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Precio (USD)</label>
                        <input 
                          type="number" 
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          placeholder="0.00"
                          className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Stock</label>
                        <input 
                          type="number" 
                          value={formData.stock}
                          onChange={(e) => setFormData({...formData, stock: e.target.value})}
                          placeholder="0"
                          className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Estado</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                      >
                        <option value="Active">Activo</option>
                        <option value="Inactive">Inactivo</option>
                        <option value="Low Stock">Stock Bajo</option>
                      </select>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={handleSaveItem}
                        disabled={isSubmitting || !formData.name || !formData.price}
                        className="w-full bg-vuttik-navy text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-vuttik-navy/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? (
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save size={20} />
                            {editingItem ? 'Guardar Cambios' : 'Crear Producto'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
