import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, Award, MapPin, Calendar, Grid, List, TrendingUp, Eye, MessageSquare, DollarSign, BarChart3, PieChart, Megaphone, Camera, X, Save } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api } from '../lib/api';
import ProductCard from './ProductCard';
import PromotionModal from './PromotionModal';

const MOCK_ANALYTICS_DATA = [
  { name: 'Lun', views: 400, contacts: 24, sales: 12 },
  { name: 'Mar', views: 300, contacts: 13, sales: 8 },
  { name: 'Mie', views: 200, contacts: 98, sales: 22 },
  { name: 'Jue', views: 278, contacts: 39, sales: 15 },
  { name: 'Vie', views: 189, contacts: 48, sales: 18 },
  { name: 'Sab', views: 239, contacts: 38, sales: 14 },
  { name: 'Dom', views: 349, contacts: 43, sales: 17 },
];

export default function Profile({ userId, currentUserId, onViewProduct }: { userId?: string, currentUserId?: string, onViewProduct?: (id: string) => void }) {
  const [activeProfileTab, setActiveProfileTab] = useState('posts');
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoTarget, setPromoTarget] = useState<{id: string, type: 'product' | 'post'} | null>(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [newPhotoURL, setNewPhotoURL] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetUserId = userId || currentUserId;

  const handlePromote = (id: string, type: 'product' | 'post') => {
    setPromoTarget({ id, type });
    setShowPromoModal(true);
  };

  useEffect(() => {
    if (!targetUserId) return;

    const fetchUser = async () => {
      try {
        const user = await api.getUser(targetUserId);
        setProfileUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;

    const loadUserProducts = async () => {
      try {
        const prods = await api.getProducts();
        const filtered = prods.filter((p: any) => p.authorId === targetUserId);
        setUserProducts(filtered);
      } catch (error) {
        console.error('Error loading user products:', error);
      }
    };

    loadUserProducts();
    const interval = setInterval(loadUserProducts, 30000);
    return () => clearInterval(interval);
  }, [targetUserId]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  const handleUpdatePhoto = async () => {
    if (!targetUserId || !newPhotoURL) return;
    setIsSubmitting(true);
    try {
      await api.saveUser({
        ...profileUser,
        photoURL: newPhotoURL
      });
      setProfileUser((prev: any) => ({ ...prev, photoURL: newPhotoURL }));
      setIsEditingPhoto(false);
      setNewPhotoURL('');
    } catch (error) {
      console.error('Error updating photo:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vuttik-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-32">
      {/* Profile Header */}
      <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-vuttik-blue/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-[40px] bg-vuttik-navy flex items-center justify-center text-white shadow-2xl shadow-vuttik-navy/20 overflow-hidden">
              {profileUser.photoURL ? (
                <img src={profileUser.photoURL} alt={profileUser.displayName} className="w-full h-full object-cover" />
              ) : (
                <User size={64} />
              )}
            </div>
            {currentUserId === targetUserId && (
              <button 
                onClick={() => {
                  setNewPhotoURL(profileUser.photoURL || '');
                  setIsEditingPhoto(true);
                }}
                className="absolute -bottom-2 -right-2 bg-vuttik-blue text-white p-2.5 rounded-2xl border-4 border-white shadow-lg hover:scale-110 transition-all"
              >
                <Camera size={18} />
              </button>
            )}
            <div className={`absolute ${currentUserId === targetUserId ? '-top-2 -left-2' : '-bottom-2 -right-2'} bg-vuttik-blue text-white p-2 rounded-2xl border-4 border-white`}>
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
              <h2 className="text-3xl font-display font-black text-vuttik-navy">{profileUser.displayName}</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-vuttik-blue/10 text-vuttik-blue rounded-full text-xs font-bold capitalize">
                <Award size={14} />
                {profileUser.role || 'Usuario'}
              </span>
            </div>
            
            <p className="text-vuttik-text-muted text-sm mb-6 max-w-lg">
              {profileUser.bio || 'Sin biografía disponible.'}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="flex items-center gap-2 text-vuttik-text-muted text-sm">
                <MapPin size={18} />
                {profileUser.location || 'RD'}
              </div>
              <div className="flex items-center gap-2 text-vuttik-text-muted text-sm">
                <Calendar size={18} />
                Miembro desde {profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleDateString() : 'Abril 2024'}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-vuttik-gray px-6 py-4 rounded-3xl text-center">
              <p className="text-2xl font-black text-vuttik-navy">98%</p>
              <p className="text-[10px] text-vuttik-text-muted font-bold uppercase tracking-wider">Confianza</p>
            </div>
            <div className="bg-vuttik-gray px-6 py-4 rounded-3xl text-center">
              <p className="text-2xl font-black text-vuttik-navy">{userProducts.length}</p>
              <p className="text-[10px] text-vuttik-text-muted font-bold uppercase tracking-wider">Aportes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {['posts', 'reviews', 'achievements', 'analytics'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveProfileTab(tab)}
                className={`text-sm font-bold transition-all border-b-2 pb-4 -mb-4.5 whitespace-nowrap ${
                  activeProfileTab === tab 
                    ? 'text-vuttik-blue border-vuttik-blue' 
                    : 'text-vuttik-text-muted border-transparent hover:text-vuttik-navy'
                }`}
              >
                {tab === 'posts' ? 'Publicaciones' : tab === 'reviews' ? 'Reseñas' : tab === 'achievements' ? 'Logros' : 'Analytics'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProfileTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeProfileTab === 'posts' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProducts.length > 0 ? (
                  userProducts.map(product => (
                    <div key={product.id} className="relative group">
                      <ProductCard 
                        {...product} 
                        price={product.price.toString()}
                        category={categories.find(c => c.id === product.categoryId)?.name || 'General'}
                        type={product.typeId}
                        image={product.images?.[0]}
                        upvotes={product.upVotes?.length || 0}
                        downvotes={product.downVotes?.length || 0}
                        onViewDetails={() => onViewProduct?.(product.id)}
                        trustLevel="High"
                        authorRating={4.5}
                        registeredAt={new Date(product.createdAt).toLocaleDateString()}
                      />
                      {currentUserId === targetUserId && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromote(product.id, 'product');
                          }}
                          className="absolute top-4 right-4 bg-vuttik-blue text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
                          title="Promocionar este producto"
                        >
                          <Megaphone size={18} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full bg-vuttik-gray/50 border-2 border-dashed border-gray-200 rounded-[32px] aspect-square flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                      <Grid size={32} />
                    </div>
                    <h4 className="text-sm font-bold text-vuttik-navy mb-1">Sin publicaciones recientes</h4>
                    <p className="text-xs text-vuttik-text-muted">Los registros de precios aparecerán aquí.</p>
                  </div>
                )}
              </div>
            )}
            {activeProfileTab === 'reviews' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-vuttik-text-muted font-bold">No hay reseñas aún.</p>
              </div>
            )}
            {activeProfileTab === 'achievements' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-gray-100 p-6 rounded-3xl flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-vuttik-blue/10 text-vuttik-blue rounded-full flex items-center justify-center">
                      <Award size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-vuttik-navy">Logro {i}</p>
                  </div>
                ))}
              </div>
            )}
            {activeProfileTab === 'analytics' && (
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 text-vuttik-blue rounded-xl">
                        <Eye size={20} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Vistas Totales</span>
                    </div>
                    <p className="text-3xl font-display font-black text-vuttik-navy">1,245</p>
                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-2">
                      <TrendingUp size={12} />
                      +12% vs mes anterior
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 p-8 rounded-[40px] shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-display font-black text-vuttik-navy">Rendimiento de Publicaciones</h3>
                      <p className="text-sm text-vuttik-text-muted">Visualización de vistas y contactos en los últimos 7 días</p>
                    </div>
                  </div>
                  
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_ANALYTICS_DATA}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0066FF" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#0066FF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fontWeight: 600, fill: '#9CA3AF' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fontWeight: 600, fill: '#9CA3AF' }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          stroke="#0066FF" 
                          strokeWidth={4}
                          fillOpacity={1} 
                          fill="url(#colorViews)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {promoTarget && (
        <PromotionModal 
          isOpen={showPromoModal}
          onClose={() => {
            setShowPromoModal(false);
            setPromoTarget(null);
          }}
          initialTargetId={promoTarget.id}
          initialTargetType={promoTarget.type}
        />
      )}

      {/* Edit Photo Modal */}
      <AnimatePresence>
        {isEditingPhoto && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingPhoto(false)}
              className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-black text-vuttik-navy">Foto de Perfil</h3>
                <button onClick={() => setIsEditingPhoto(false)} className="p-2 bg-vuttik-gray rounded-xl text-vuttik-text-muted">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-[40px] bg-vuttik-gray overflow-hidden">
                    {newPhotoURL ? (
                      <img src={newPhotoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">URL de la Imagen</label>
                  <input 
                    type="text" 
                    value={newPhotoURL}
                    onChange={(e) => setNewPhotoURL(e.target.value)}
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                  />
                </div>

                <button 
                  onClick={handleUpdatePhoto}
                  disabled={isSubmitting || !newPhotoURL}
                  className="w-full bg-vuttik-navy text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-vuttik-navy/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={20} />
                      Guardar Foto
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

