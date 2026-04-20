import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, MapPin, Clock, Instagram, Facebook, Twitter, Globe, 
  Plus, Edit2, Trash2, Package, TrendingUp, Eye, MessageCircle,
  Save, X, Camera, Share2, Megaphone, BarChart2, Users, CreditCard,
  Phone
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { api } from '../lib/api';
import { 
  doc, onSnapshot, updateDoc, setDoc, collection, 
  query, where, orderBy, addDoc, serverTimestamp, deleteDoc 
} from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import LocationInput from './LocationInput';

const MOCK_METRICS = [
  { name: 'Lun', views: 400, sales: 240 },
  { name: 'Mar', views: 300, sales: 139 },
  { name: 'Mie', views: 200, sales: 980 },
  { name: 'Jue', views: 278, sales: 390 },
  { name: 'Vie', views: 189, sales: 480 },
  { name: 'Sab', views: 239, sales: 380 },
  { name: 'Dom', views: 349, sales: 430 },
];

export default function NegocioDashboard({ onViewProduct }: { onViewProduct?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'inventory' | 'metrics' | 'posts'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ title: '', price: '', stock: '', description: '', categoryId: '', type: 'sell', phone: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [profileForm, setProfileForm] = useState<any>({});
  const [selectedProductMetrics, setSelectedProductMetrics] = useState<any>(null);
  const [realStats, setRealStats] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Categories listener
    const unsubscribeCats = onSnapshot(query(collection(db, 'categories'), orderBy('order', 'asc')), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Profile listener
    const unsubscribeProfile = onSnapshot(doc(db, 'businessProfiles', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
        setProfileForm(docSnap.data());
      } else {
        // Initialize profile if it doesn't exist
        const initialProfile = {
          name: auth.currentUser.displayName || 'Mi Negocio',
          description: 'Bienvenido a nuestro perfil oficial.',
          location: '',
          phone: '',
          workingHours: 'Lun-Vie: 8:00 AM - 6:00 PM',
          socialLinks: { instagram: '', facebook: '', twitter: '', website: '' },
          metrics: { views: 0, followers: 0, sales: 0 }
        };
        setDoc(doc(db, 'businessProfiles', auth.currentUser.uid), initialProfile);
      }
    });

    // Inventory listener
    const q = query(collection(db, 'products'), where('authorId', '==', auth.currentUser.uid));
    const unsubscribeInv = onSnapshot(q, (snapshot) => {
      setInventory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeProfile();
      unsubscribeInv();
      unsubscribeCats();
    };
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const loadRealStats = async () => {
      try {
        const stats = await api.getBusinessStats(auth.currentUser!.uid);
        setRealStats(stats);
      } catch (error) {
        console.error('Error loading real business stats:', error);
      }
    };
    loadRealStats();
  }, [activeTab]);

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'businessProfiles', auth.currentUser.uid), profileForm);
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'businessProfiles');
    }
  };

  const handleAddProduct = async () => {
    if (!auth.currentUser) return;
    try {
      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), {
          ...productForm,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock),
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...productForm,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock),
          currency: 'DOP',
          authorId: auth.currentUser.uid,
          authorName: profile?.name || auth.currentUser.displayName,
          createdAt: serverTimestamp(),
          views: 0,
          upVotes: [],
          downVotes: [],
          images: ['https://picsum.photos/seed/' + Math.random() + '/800/600'],
          // Initialize product metrics
          productMetrics: [
            { name: 'Lun', views: Math.floor(Math.random() * 50), sales: Math.floor(Math.random() * 10) },
            { name: 'Mar', views: Math.floor(Math.random() * 50), sales: Math.floor(Math.random() * 10) },
            { name: 'Mie', views: Math.floor(Math.random() * 50), sales: Math.floor(Math.random() * 10) },
            { name: 'Jue', views: Math.floor(Math.random() * 50), sales: Math.floor(Math.random() * 10) },
            { name: 'Vie', views: Math.floor(Math.random() * 50), sales: Math.floor(Math.random() * 10) },
            { name: 'Sab', views: Math.floor(Math.random() * 50), sales: Math.floor(Math.random() * 10) },
            { name: 'Dom', views: Math.floor(Math.random() * 50), sales: Math.floor(Math.random() * 10) },
          ]
        });
      }
      setIsAddingProduct(false);
      setEditingProductId(null);
      setProductForm({ title: '', price: '', stock: '', description: '', categoryId: '', type: 'sell', phone: '' });
    } catch (error) {
      handleFirestoreError(error, editingProductId ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const handleEditProduct = (product: any) => {
    setProductForm({
      title: product.title || product.name || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      type: product.typeId || 'sell',
      phone: product.phone || ''
    });
    setEditingProductId(product.id);
    setIsAddingProduct(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const handleCloseProductModal = () => {
    setIsAddingProduct(false);
    setEditingProductId(null);
    setProductForm({ title: '', price: '', stock: '', description: '', categoryId: '', type: 'sell' });
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-vuttik-navy text-white rounded-xl md:rounded-[20px] flex items-center justify-center shadow-xl shadow-vuttik-navy/20 shrink-0">
            <Store size={20} className="md:size-8" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-display font-black text-vuttik-navy">Panel de Negocio</h2>
            <p className="text-vuttik-text-muted text-[10px] md:text-sm font-bold uppercase tracking-widest">Perfil Oficial y Gestión Comercial</p>
          </div>
        </div>
        
        <div className="flex bg-vuttik-gray p-1 md:p-1.5 rounded-xl md:rounded-2xl self-start md:self-auto overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'profile', label: 'Perfil', icon: Store },
            { id: 'inventory', label: 'Inventario', icon: Package },
            { id: 'metrics', label: 'Métricas', icon: TrendingUp },
            { id: 'posts', label: 'Social', icon: Share2 },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-vuttik-navy shadow-sm' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-vuttik-blue/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              
              <div className="flex flex-col md:flex-row gap-8 relative z-10">
                <div className="relative shrink-0">
                  <div className="w-32 h-32 rounded-[40px] bg-vuttik-navy flex items-center justify-center text-white shadow-2xl overflow-hidden">
                    {profile?.logo ? <img src={profile.logo} className="w-full h-full object-cover" /> : <Store size={48} />}
                  </div>
                  <button className="absolute -bottom-2 -right-2 bg-vuttik-blue text-white p-2 rounded-2xl border-4 border-white">
                    <Camera size={18} />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-display font-black text-vuttik-navy">{profile?.name}</h3>
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="p-2 text-vuttik-blue hover:bg-vuttik-blue/10 rounded-xl transition-all"
                    >
                      <Edit2 size={20} />
                    </button>
                  </div>
                  <p className="text-vuttik-text-muted text-sm mb-6 leading-relaxed">
                    {profile?.description}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-vuttik-navy font-bold text-xs">
                      <MapPin size={18} className="text-vuttik-blue" />
                      {profile?.location || 'Añadir ubicación'}
                    </div>
                    <div className="flex items-center gap-3 text-vuttik-navy font-bold text-xs">
                      <Clock size={18} className="text-vuttik-blue" />
                      {profile?.workingHours}
                    </div>
                    {profile?.phone ? (
                      <div className="flex items-center gap-3 text-vuttik-navy font-bold text-xs">
                        <Phone size={18} className="text-vuttik-blue" />
                        <a href={`tel:${profile.phone}`} className="hover:text-vuttik-blue transition-colors">
                          {profile.phone}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-vuttik-text-muted font-bold text-xs italic">
                        <Phone size={18} className="text-gray-300" />
                        Sin teléfono (Edita tu perfil para añadirlo)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm">
              <h4 className="text-sm font-black text-vuttik-navy uppercase tracking-widest mb-6">Redes Sociales</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: Instagram, label: 'Instagram', key: 'instagram' },
                  { icon: Facebook, label: 'Facebook', key: 'facebook' },
                  { icon: Twitter, label: 'Twitter', key: 'twitter' },
                  { icon: Globe, label: 'Website', key: 'website' },
                ].map((social) => (
                  <div key={social.key} className="flex flex-col items-center gap-3 p-4 bg-vuttik-gray rounded-3xl hover:bg-vuttik-blue/5 transition-all cursor-pointer group">
                    <social.icon size={24} className="text-vuttik-navy group-hover:text-vuttik-blue transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">{social.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            {[
              { label: 'Vistas Totales', value: realStats?.views || 0, icon: Eye, color: 'text-vuttik-blue' },
              { label: 'Seguidores', value: 0, icon: Users, color: 'text-vuttik-navy' },
              { label: 'Contactos', value: realStats?.sales || 0, icon: CreditCard, color: 'text-green-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-2xl bg-gray-50 ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <p className="text-xs font-bold text-vuttik-text-muted uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className="text-3xl font-display font-black text-vuttik-navy">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-black text-vuttik-navy">Gestión de Inventario</h3>
            <button 
              onClick={() => setIsAddingProduct(true)}
              className="flex items-center gap-2 bg-vuttik-navy text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-lg"
            >
              <Plus size={18} />
              Añadir Producto
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {inventory.map((item) => (
              <div key={item.id} className="bg-white border border-gray-100 p-6 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-vuttik-blue/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-vuttik-gray rounded-2xl flex items-center justify-center text-vuttik-navy shrink-0">
                    {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover rounded-2xl" /> : <Package size={32} />}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-vuttik-navy">{item.title || item.name}</h4>
                    <p className="text-sm text-vuttik-text-muted font-bold">{item.price} USD</p>
                    {item.phone && (
                      <div className="flex items-center gap-1.5 text-[10px] text-vuttik-blue font-bold mt-1">
                        <Phone size={12} />
                        {item.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-1">Stock</p>
                    <p className={`text-lg font-black ${item.stock < 10 ? 'text-red-500' : 'text-vuttik-navy'}`}>{item.stock}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest mb-1">Vistas</p>
                    <p className="text-lg font-black text-vuttik-navy">{item.views}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedProductMetrics(item);
                      setActiveTab('metrics');
                    }}
                    className="p-3 bg-vuttik-blue/10 text-vuttik-blue rounded-xl hover:bg-vuttik-blue hover:text-white transition-all"
                    title="Ver Métricas"
                  >
                    <BarChart2 size={18} />
                  </button>
                  <button 
                    onClick={() => onViewProduct?.(item.id)}
                    className="p-3 bg-vuttik-navy text-white rounded-xl hover:scale-105 transition-all"
                    title="Ver Detalles"
                  >
                    <Eye size={18} />
                  </button>
                  <button 
                    onClick={() => handleEditProduct(item)}
                    className="p-3 bg-vuttik-gray rounded-xl text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all"
                    title="Editar Producto"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(item.id)}
                    className="p-3 bg-vuttik-gray rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    title="Eliminar Producto"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="space-y-8">
          {selectedProductMetrics && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-vuttik-blue/5 border border-vuttik-blue/20 p-6 rounded-[32px] flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-vuttik-blue shadow-sm">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-vuttik-blue uppercase tracking-widest">Métricas del Producto</p>
                  <h4 className="text-lg font-bold text-vuttik-navy">{selectedProductMetrics.title}</h4>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProductMetrics(null)}
                className="px-4 py-2 bg-white text-vuttik-text-muted text-xs font-bold rounded-xl hover:text-vuttik-navy transition-all"
              >
                Ver Métricas Generales
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-100 p-8 rounded-[40px] shadow-sm">
              <h3 className="text-xl font-display font-black text-vuttik-navy mb-8">
                {selectedProductMetrics ? 'Vistas del Producto' : 'Vistas Semanales'}
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedProductMetrics?.productMetrics || MOCK_METRICS}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 rounded-[40px] shadow-sm">
              <h3 className="text-xl font-display font-black text-vuttik-navy mb-8">
                {selectedProductMetrics ? 'Ventas del Producto' : 'Ventas Realizadas'}
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedProductMetrics?.productMetrics || MOCK_METRICS}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="sales" fill="#002B49" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Products Section in Profile */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-vuttik-navy uppercase tracking-widest">Nuestros Productos</h4>
              <button 
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-bold text-vuttik-blue hover:underline"
              >
                Ver todo el inventario
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {inventory.slice(0, 4).map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[32px] p-4 shadow-sm hover:shadow-xl transition-all group">
                  <div className="aspect-square rounded-2xl bg-vuttik-gray mb-4 overflow-hidden relative">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-vuttik-navy/20">
                        <Package size={48} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-vuttik-navy">
                      {item.price} USD
                    </div>
                  </div>
                  <h5 className="font-bold text-vuttik-navy text-sm mb-1 truncate">{item.title || item.name}</h5>
                  <p className="text-[10px] text-vuttik-text-muted font-bold uppercase tracking-widest">Stock: {item.stock}</p>
                </div>
              ))}
              {inventory.length === 0 && (
                <div className="col-span-full py-12 text-center bg-vuttik-gray/30 rounded-[32px] border-2 border-dashed border-gray-200">
                  <p className="text-sm text-vuttik-text-muted font-bold">No has publicado productos todavía.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] bg-white rounded-none md:rounded-[40px] shadow-2xl p-6 md:p-12 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <h3 className="text-2xl md:text-4xl font-display font-black text-vuttik-navy">Editar Perfil</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-3 bg-vuttik-gray rounded-2xl text-vuttik-text-muted hover:bg-vuttik-blue hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8 overflow-y-auto no-scrollbar pr-2 flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Nombre del Negocio</label>
                  <input 
                    type="text" 
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Descripción</label>
                    <textarea 
                      value={profileForm.description}
                      onChange={(e) => setProfileForm({...profileForm, description: e.target.value})}
                      rows={2}
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Horarios</label>
                    <input 
                      type="text" 
                      value={profileForm.workingHours}
                      onChange={(e) => setProfileForm({...profileForm, workingHours: e.target.value})}
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Teléfono</label>
                    <input 
                      type="tel" 
                      value={profileForm.phone || ''}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      placeholder="Ej: 809-555-0123"
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                    />
                  </div>
                </div>

                <LocationInput 
                  label="Ubicación (Google Maps)"
                  value={profileForm.location || ''}
                  onChange={(val) => setProfileForm({...profileForm, location: val})}
                  placeholder="Ej: Av. Winston Churchill 123, Santo Domingo"
                />

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest border-b border-gray-100 pb-2">Redes Sociales y Web</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Instagram</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.instagram || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, instagram: e.target.value }})}
                        placeholder="@usuario"
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Facebook</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.facebook || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, facebook: e.target.value }})}
                        placeholder="facebook.com/pagina"
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Twitter (X)</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.twitter || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, twitter: e.target.value }})}
                        placeholder="@usuario"
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Sitio Web</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.website || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, website: e.target.value }})}
                        placeholder="https://www.minegocio.com"
                        className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-vuttik-navy text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-vuttik-navy/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseProductModal}
              className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8 md:p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-black text-vuttik-navy">
                  {editingProductId ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button onClick={handleCloseProductModal} className="p-2 bg-vuttik-gray rounded-xl text-vuttik-text-muted">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Título del Producto</label>
                  <input 
                    type="text" 
                    value={productForm.title}
                    onChange={(e) => setProductForm({...productForm, title: e.target.value})}
                    placeholder="Ej: Arroz Premium"
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Categoría</label>
                  <select 
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Precio (USD)</label>
                    <input 
                      type="number" 
                      value={productForm.price}
                      onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Stock</label>
                    <input 
                      type="number" 
                      value={productForm.stock}
                      onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Teléfono de Contacto (Opcional)</label>
                  <input 
                    type="tel" 
                    value={productForm.phone || ''}
                    onChange={(e) => setProductForm({...productForm, phone: e.target.value})}
                    placeholder="Ej: 809-555-0123"
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                  />
                </div>

                <button 
                  onClick={handleAddProduct}
                  className="w-full bg-vuttik-blue text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-vuttik-blue/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  {editingProductId ? <Save size={20} /> : <Plus size={20} />}
                  {editingProductId ? 'Guardar Cambios' : 'Añadir al Inventario'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
