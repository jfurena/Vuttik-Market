import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, MapPin, Clock, Instagram, Facebook, Twitter, Globe, 
  Plus, Edit2, Trash2, Package, TrendingUp, Eye, MessageCircle,
  Save, X, Camera, Share2, Megaphone, BarChart2, Users, CreditCard,
  Phone, User
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import LocationInput from './LocationInput';
import { compressImage } from '../utils/imageCompressor';

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
  const { user, switchProfileMode, updateUser, isBusinessModeActive } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'inventory' | 'metrics' | 'posts' | 'team'>('profile');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [businessInvites, setBusinessInvites] = useState<any[]>([]);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
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

  const currentUserRole = user?.originalUid 
    ? (user.originalUid === user.uid 
        ? 'owner' 
        : (teamMembers.find(m => m.member_uid === user.originalUid)?.role || 'user')
      )
    : 'owner';

  const businessUid = user?.activeProfileMode && user.activeProfileMode !== 'personal' && user.activeProfileMode !== 'business' ? user.activeProfileMode : user?.uid;

  const loadData = async () => {
    if (!user) return;
    try {
      const [productsData, profileData, teamData, invitesData, postsData] = await Promise.all([
        api.getProducts(undefined, businessUid, 'business').catch(() => []),
        api.getBusinessProfile(businessUid).catch(() => null),
        api.getBusinessMembers(businessUid).catch(() => []),
        api.getBusinessInvites(user.originalUid || user.uid).catch(() => []),
        api.getUserSocialPosts(businessUid, 'business').catch(() => [])
      ]);
      setInventory(productsData);
      setTeamMembers(teamData);
      setBusinessInvites(invitesData);
      setSocialPosts(postsData);
      setCategories(await api.getCategories());

      if (profileData) {
        setProfile(profileData);
        setProfileForm({
          name: profileData.name || user.displayName || 'Mi Negocio',
          description: profileData.description || '',
          location: profileData.location || '',
          phone: profileData.phone || '',
          workingHours: profileData.working_hours || 'Lun-Vie: 8:00 AM - 6:00 PM',
          socialLinks: profileData.socialLinks || { instagram: '', facebook: '', twitter: '', website: '' },
          logo: profileData.logo || ''
        });
      } else {
        // Bootstrap default profile in state only
        const initialProfile = {
          name: user.displayName || 'Mi Negocio',
          description: 'Bienvenido a nuestro perfil oficial.',
          location: '',
          phone: '',
          workingHours: 'Lun-Vie: 8:00 AM - 6:00 PM',
          socialLinks: { instagram: '', facebook: '', twitter: '', website: '' },
          logo: ''
        };
        setProfile(initialProfile);
        setProfileForm(initialProfile);
      }
    } catch (error) {
      console.error('Error loading Negocio data:', error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadRealStats = async () => {
      try {
        const [stats, followersData] = await Promise.all([
          api.getBusinessStats(businessUid),
          api.getFollowers(businessUid).catch(() => ({ count: 0 }))
        ]);
        setRealStats({ ...stats, followers: followersData.count || 0 });
      } catch (error) {
        console.error('Error loading real business stats:', error);
      }
    };
    loadRealStats();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const isNew = !profile || profile.name === user.displayName;
      const targetBizUid = isNew && (!businessUid || businessUid === user.uid) ? `biz-${Date.now()}` : businessUid;

      await api.saveBusinessProfile(targetBizUid, {
        name: profileForm.name,
        description: profileForm.description,
        location: profileForm.location,
        phone: profileForm.phone,
        workingHours: profileForm.workingHours,
        socialLinks: profileForm.socialLinks,
        logo: profileForm.logo
      }, user.originalUid || user.uid);
      setProfile(profileForm);
      if (isBusinessModeActive && !isNew) {
        updateUser({ displayName: profileForm.name });
      }
      setIsEditingProfile(false);
      
      if (isNew) {
        alert('Negocio creado exitosamente. Cambiando a tu nuevo panel...');
        await switchProfileMode(targetBizUid);
      }
    } catch (error) {

      console.error('Error updating business profile:', error);
      alert('Error al guardar el perfil. Intenta de nuevo.');
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 0.5);
        setProfileForm({ ...profileForm, logo: compressed });
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const handleAddProduct = async () => {
    if (!user) return;
    if (!productForm.title || !productForm.price) {
      alert('El título y el precio son obligatorios.');
      return;
    }
    try {
      const data = {
        title: productForm.title,
        description: productForm.description,
        categoryId: productForm.categoryId,
        typeId: productForm.type,
        phone: productForm.phone,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        currency: 'DOP',
        authorId: user.uid,
        authorName: profile?.name || user.displayName || 'Vuttik Negocio',
        authorAvatar: profile?.logo || user.photoURL || '',
        location: profile?.location || '',
        postedAs: 'business'
      };

      if (editingProductId) {
        await api.updateProduct(editingProductId, data, user.uid);
      } else {
        await api.publishProduct(data);
      }
      await loadData();
      setIsAddingProduct(false);
      setEditingProductId(null);
      setProductForm({ title: '', price: '', stock: '', description: '', categoryId: '', type: 'sell', phone: '' });
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error al guardar el producto. Intenta de nuevo.');
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

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteEmail) return;
    setIsInviting(true);
    try {
      await api.inviteBusinessMember({ businessUid, email: inviteEmail });
      setInviteEmail('');
      alert('Invitación enviada correctamente.');
      loadData();
    } catch (error: any) {
      alert(error.message || 'Error al enviar invitación.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este miembro del equipo?')) return;
    try {
      await api.deleteBusinessMember(id);
      loadData();
    } catch (error: any) {
      alert('Error al eliminar miembro.');
    }
  };

  const handleAcceptInvite = async (id: string) => {
    try {
      await api.acceptBusinessInvite(id);
      alert('¡Invitación aceptada! Ahora eres miembro de este negocio.');
      loadData();
    } catch (error: any) {
      alert('Error al aceptar la invitación.');
    }
  };

  const handleRejectInvite = async (id: string) => {
    try {
      await api.deleteBusinessMember(id);
      loadData();
    } catch (error: any) {
      alert('Error al rechazar la invitación.');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await api.updateBusinessMemberRole(id, role);
      await loadData();
    } catch (error: any) {
      console.error('Error updating member role:', error);
      alert('Error al actualizar el rol');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      if (!user) return;
      await api.deleteProduct(id, businessUid || user.uid);
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
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
        
        <div className="flex flex-col md:flex-row items-center gap-4 self-start md:self-auto w-full md:w-auto">
          <div className="flex bg-vuttik-gray p-1 md:p-1.5 rounded-xl md:rounded-2xl overflow-x-auto no-scrollbar max-w-full w-full md:w-auto">
            {[
              { id: 'profile', label: 'Perfil', icon: Store },
              { id: 'inventory', label: 'Inventario', icon: Package },
              { id: 'metrics', label: 'Métricas', icon: TrendingUp },
              { id: 'posts', label: 'Social', icon: Share2 },
              { id: 'team', label: 'Equipo', icon: Users },
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

          <button
            onClick={() => {
              switchProfileMode('personal');
              navigate('/perfil');
            }}
            className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white border border-gray-200 text-vuttik-navy rounded-xl hover:bg-vuttik-gray hover:text-vuttik-blue transition-colors text-xs font-bold shadow-sm whitespace-nowrap"
          >
            <User size={16} />
            Volver al Perfil
          </button>
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
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-display font-black text-vuttik-navy">{profile?.name}</h3>
                    {currentUserRole === 'owner' && (
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="p-2 text-vuttik-blue hover:bg-vuttik-blue/10 rounded-xl transition-all"
                      >
                        <Edit2 size={20} />
                      </button>
                    )}
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
                { icon: Instagram, label: 'Instagram', key: 'instagram', prefix: 'https://instagram.com/' },
                { icon: Facebook, label: 'Facebook', key: 'facebook', prefix: 'https://' },
                { icon: Twitter, label: 'Twitter', key: 'twitter', prefix: 'https://twitter.com/' },
                { icon: Globe, label: 'Website', key: 'website', prefix: 'https://' },
              ].map((social) => {
                const link = profile?.socialLinks?.[social.key];
                const href = link ? (link.startsWith('http') ? link : social.prefix + link) : null;
                return (
                  <div key={social.key}
                    onClick={() => href && window.open(href, '_blank')}
                    className={`flex flex-col items-center gap-3 p-4 bg-vuttik-gray rounded-3xl transition-all ${
                      href ? 'hover:bg-vuttik-blue/10 cursor-pointer group' : 'opacity-40 cursor-not-allowed'
                    }`}
                    title={href ? `Abrir ${social.label}` : `Sin ${social.label} configurado`}
                  >
                    <social.icon size={24} className={href ? 'text-vuttik-navy group-hover:text-vuttik-blue transition-colors' : 'text-gray-400'} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">{social.label}</span>
                    {href && <span className="text-[8px] text-vuttik-blue font-bold truncate max-w-full">{link}</span>}
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            {[
              { label: 'Vistas Totales', value: realStats?.views || 0, icon: Eye, color: 'text-vuttik-blue' },
              { label: 'Seguidores', value: realStats?.followers || 0, icon: Users, color: 'text-vuttik-navy' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-vuttik-navy mb-6">Vistas Semanales</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={realStats?.chartData || MOCK_METRICS}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="views" name="Vistas" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-vuttik-navy mb-6">Ventas Realizadas</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realStats?.chartData || MOCK_METRICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="sales" name="Ventas" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={40} />
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

      {activeTab === 'posts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-black text-vuttik-navy">Publicaciones Sociales</h3>
            <p className="text-xs text-vuttik-text-muted font-bold">Tus posts aparecen en el feed de Vuttik</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {socialPosts.length === 0 ? (
              <div className="py-20 text-center bg-vuttik-gray/30 rounded-[40px] border-2 border-dashed border-gray-200">
                <Share2 size={48} className="mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-bold text-vuttik-navy">Sin publicaciones sociales</h4>
                <p className="text-sm text-vuttik-text-muted mt-2">Publica desde el Feed de Vuttik para que aparezcan aquí.</p>
              </div>
            ) : (
              socialPosts.slice(0, 6).map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 p-5 rounded-[28px] flex items-center gap-4 hover:border-vuttik-blue/30 transition-all">
                  <div className="w-12 h-12 bg-vuttik-gray rounded-xl flex items-center justify-center text-vuttik-navy shrink-0 overflow-hidden">
                    {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <Share2 size={24} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-vuttik-navy text-sm line-clamp-1">{item.content}</h4>
                    <p className="text-xs text-vuttik-text-muted">{item.likes?.length || 0} likes</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-xl font-display font-black text-vuttik-navy mb-2">Gestión de Equipo</h3>
                <p className="text-sm text-vuttik-text-muted">Invita a otros usuarios a administrar este negocio.</p>
              </div>
              {currentUserRole !== 'user' && (
                <form onSubmit={handleInviteMember} className="flex items-center gap-2 w-full md:w-auto">
                  <input 
                    type="email" 
                    placeholder="Correo electrónico del usuario" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm flex-1 md:w-64 focus:ring-2 focus:ring-vuttik-blue transition-all"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isInviting || !inviteEmail}
                    className="bg-vuttik-navy text-white px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-vuttik-blue transition-colors disabled:opacity-50"
                  >
                    {isInviting ? 'Enviando...' : 'Invitar'}
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <div className="text-center py-10 bg-vuttik-gray/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Users size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-vuttik-text-muted text-sm">No hay miembros en tu equipo todavía.</p>
                </div>
              ) : (
                teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white hover:border-vuttik-blue/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-vuttik-navy text-white rounded-xl flex items-center justify-center font-bold overflow-hidden">
                        {member.photo_url ? <img src={member.photo_url} className="w-full h-full object-cover" /> : member.display_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-vuttik-navy text-sm">{member.display_name}</h4>
                        <p className="text-xs text-vuttik-text-muted">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {currentUserRole === 'owner' ? (
                        <select
                          value={member.role || 'user'}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-gray-100 text-gray-700 rounded-full outline-none cursor-pointer"
                        >
                          <option value="owner">Dueño</option>
                          <option value="admin">Admin</option>
                          <option value="user">Usuario</option>
                        </select>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-gray-100 text-gray-500 rounded-full">
                          {member.role === 'owner' ? 'Dueño' : member.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        member.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {member.status === 'accepted' ? 'Activo' : 'Pendiente'}
                      </span>
                      {(currentUserRole === 'owner' || currentUserRole === 'admin') && member.role !== 'owner' && (
                        <button 
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Eliminar miembro"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-2xl md:text-3xl font-display font-black text-vuttik-navy">Editar Perfil</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-vuttik-gray rounded-xl text-vuttik-text-muted hover:bg-vuttik-blue hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto no-scrollbar pr-2 flex-1">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="shrink-0 relative group">
                    <div className="w-24 h-24 rounded-3xl bg-vuttik-gray flex items-center justify-center text-vuttik-navy overflow-hidden shadow-sm">
                      {profileForm.logo ? <img src={profileForm.logo} className="w-full h-full object-cover" /> : <Store size={32} />}
                    </div>
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl backdrop-blur-sm">
                      <Camera size={20} />
                      <span className="text-[10px] font-bold mt-1">Cambiar</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                    </label>
                  </div>
                  
                  <div className="flex-1 space-y-4 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Nombre del Negocio</label>
                      <input 
                        type="text" 
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Descripción</label>
                      <textarea 
                        value={profileForm.description}
                        onChange={(e) => setProfileForm({...profileForm, description: e.target.value})}
                        rows={1}
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Teléfono</label>
                    <input 
                      type="tel" 
                      value={profileForm.phone || ''}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      placeholder="Ej: 809-555-0123"
                      className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Horarios (Desde - Hasta)</label>
                    <div className="flex items-center gap-2">
                      <select 
                        value={profileForm.workingHours?.split(' - ')[0] || '08:00 AM'}
                        onChange={(e) => {
                          const parts = profileForm.workingHours?.split(' - ') || ['08:00 AM', '06:00 PM'];
                          setProfileForm({...profileForm, workingHours: `${e.target.value} - ${parts[1] || '06:00 PM'}`})
                        }}
                        className="w-full bg-vuttik-gray border-none rounded-xl px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      >
                        {Array.from({ length: 24 }).map((_, i) => {
                          const hour = i % 12 === 0 ? 12 : i % 12;
                          const ampm = i < 12 ? 'AM' : 'PM';
                          const timeStr = `${hour.toString().padStart(2, '0')}:00 ${ampm}`;
                          return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                        })}
                      </select>
                      <span className="text-vuttik-text-muted font-bold">-</span>
                      <select 
                        value={profileForm.workingHours?.split(' - ')[1] || '06:00 PM'}
                        onChange={(e) => {
                          const parts = profileForm.workingHours?.split(' - ') || ['08:00 AM', '06:00 PM'];
                          setProfileForm({...profileForm, workingHours: `${parts[0] || '08:00 AM'} - ${e.target.value}`})
                        }}
                        className="w-full bg-vuttik-gray border-none rounded-xl px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      >
                        {Array.from({ length: 24 }).map((_, i) => {
                          const hour = i % 12 === 0 ? 12 : i % 12;
                          const ampm = i < 12 ? 'AM' : 'PM';
                          const timeStr = `${hour.toString().padStart(2, '0')}:00 ${ampm}`;
                          return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                <LocationInput 
                  label="Ubicación (Google Maps)"
                  value={profileForm.location || ''}
                  onChange={(val) => setProfileForm({...profileForm, location: val})}
                  placeholder="Ej: Av. Winston Churchill 123, Santo Domingo"
                />

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest border-b border-gray-100 pb-1 mb-2">Redes Sociales y Web</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Instagram</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.instagram || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, instagram: e.target.value }})}
                        placeholder="@usuario"
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Facebook</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.facebook || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, facebook: e.target.value }})}
                        placeholder="facebook.com/pagina"
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Twitter (X)</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.twitter || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, twitter: e.target.value }})}
                        placeholder="@usuario"
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Sitio Web</label>
                      <input 
                        type="text" 
                        value={profileForm.socialLinks?.website || ''}
                        onChange={(e) => setProfileForm({...profileForm, socialLinks: { ...profileForm.socialLinks, website: e.target.value }})}
                        placeholder="https://www.minegocio.com"
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-vuttik-navy text-white py-3 rounded-2xl font-black text-sm shadow-xl shadow-vuttik-navy/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 mt-2"
                >
                  <Save size={18} />
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
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Precio (DOP)</label>
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
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">Descripción del Producto</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    rows={2}
                    placeholder="Describe tu producto..."
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 resize-none"
                  />
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
