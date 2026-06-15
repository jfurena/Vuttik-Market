import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, Award, MapPin, Calendar, Grid, List, TrendingUp, Eye, MessageSquare, DollarSign, BarChart3, PieChart, Megaphone, Camera, X, Save, Activity, Store, Edit2, ImageIcon, UserPlus, UserMinus, Users } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api } from '../lib/api';
import ProductCard from './ProductCard';
import UserAvatar from './UserAvatar';
import PromotionModal from './PromotionModal';
import CameraModal from './CameraModal';

import { useParams, useNavigate } from 'react-router-dom';
import { trackMetric } from '../utils/metrics';

const safeDate = (dateStr: any) => {
  if (!dateStr) return 'Fecha no disponible';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Fecha no disponible';
    return d.toLocaleDateString();
  } catch (e) {
    return 'Fecha no disponible';
  }
};

import { useAuth } from '../contexts/AuthContext';

export default function Profile({ currentUserId, onViewProduct }: { currentUserId?: string, onViewProduct?: (id: string) => void }) {
  const navigate = useNavigate();
  const { setShowGlobalBusinessSelector } = useAuth();
  const { userId, username } = useParams<{ userId?: string, username?: string }>();
  const [activeProfileTab, setActiveProfileTab] = useState('posts');
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoTarget, setPromoTarget] = useState<{id: string, type: 'product' | 'post'} | null>(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [newPhotoURL, setNewPhotoURL] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const targetUserId = userId || (!username ? currentUserId : undefined);

  const handlePromote = (id: string, type: 'product' | 'post') => {
    setPromoTarget({ id, type });
    setShowPromoModal(true);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        let user;
        if (username) {
          user = await api.getUserByUsername(username, true);
        } else if (targetUserId) {
          user = await api.getUser(targetUserId, true);
        }
        if (user) {
          setProfileUser(user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();

    // Log Profile View Action
    trackMetric({
      userId: currentUserId || 'anonymous',
      action: 'view' as any, // backend expects 'view' for viewsResult query
      targetId: targetUserId,
      targetType: 'user',
      metadata: { profileName: profileUser?.displayName }
    });
    
    // Also log specifically as VIEW_PROFILE for trend analysis
    trackMetric({
      userId: currentUserId || 'anonymous',
      action: 'VIEW_PROFILE' as any,
      targetId: targetUserId,
      targetType: 'user'
    });
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;

    const loadUserProducts = async () => {
      try {
        const prods = await api.getProducts(undefined, targetUserId);
        if (!Array.isArray(prods)) {
          console.error('Invalid products format:', prods);
          setUserProducts([]);
          return;
        }
        // The API might still return unsanitized SQL names on some server instances
        const mapped = prods.map((p: any) => ({
          ...p,
          authorId: p.authorId || p.author_id,
          authorName: p.authorName || p.author_name || profileUser?.displayName || profileUser?.display_name || 'Usuario',
          createdAt: p.createdAt || p.created_at,
          typeId: p.typeId || p.type_id,
          categoryId: p.categoryId || p.category_id
        }));
        setUserProducts(mapped);
        
        // Fetch followers
        const followers = await api.getFollowers(targetUserId);
        setFollowersList(followers);
        
        // Check following status
        if (currentUserId && currentUserId !== targetUserId) {
          const following = await api.getFollowing(currentUserId);
          setIsFollowing(following.includes(targetUserId));
        }
      } catch (error) {
        console.error('Error loading user products:', error);
        setUserProducts([]);
      }
    };

    loadUserProducts();
    const interval = setInterval(loadUserProducts, 30000);
    return () => clearInterval(interval);
  }, [targetUserId, currentUserId]);

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

  useEffect(() => {
    if (activeProfileTab === 'analytics' && targetUserId) {
      fetchAnalytics();
    }
  }, [activeProfileTab, targetUserId]);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await api.getUserAnalytics(targetUserId!);
      // Map trend data for Recharts
      if (data.trend) {
        data.trend = data.trend.map((t: any) => ({
          name: new Date(t.date).toLocaleDateString([], { weekday: 'short' }),
          value: t.count
        }));
      }
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type.startsWith('image/')) {
      try {
        const b64 = await compressImage(file);
        setNewPhotoURL(b64);
      } catch (error) {
        console.error('Compression error:', error);
      }
    }
  };

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

  const handleUpdateBio = async () => {
    if (!targetUserId) return;
    setIsSubmitting(true);
    try {
      await api.saveUser({
        ...profileUser,
        bio: newBio
      });
      setProfileUser((prev: any) => ({ ...prev, bio: newBio }));
      setIsEditingBio(false);
    } catch (error) {
      console.error('Error updating bio:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteProduct = async (productId: string, voteType: 'up' | 'down') => {
    if (!currentUserId) {
      alert("Debes iniciar sesión para votar.");
      return;
    }
    
    const productIndex = userProducts.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    const product = userProducts[productIndex];
    const upVotes = [...(product.upVotes || [])];
    const downVotes = [...(product.downVotes || [])];
    
    const isUpvoted = upVotes.includes(currentUserId);
    const isDownvoted = downVotes.includes(currentUserId);
    
    let newVoteType: 'up' | 'down' | null = voteType;
    
    if (voteType === 'up') {
      if (isUpvoted) {
        newVoteType = null;
        upVotes.splice(upVotes.indexOf(currentUserId), 1);
      } else {
        upVotes.push(currentUserId);
        if (isDownvoted) downVotes.splice(downVotes.indexOf(currentUserId), 1);
      }
    } else {
      if (isDownvoted) {
        newVoteType = null;
        downVotes.splice(downVotes.indexOf(currentUserId), 1);
      } else {
        downVotes.push(currentUserId);
        if (isUpvoted) upVotes.splice(upVotes.indexOf(currentUserId), 1);
      }
    }

    const newUserProducts = [...userProducts];
    newUserProducts[productIndex] = { ...product, upVotes, downVotes };
    setUserProducts(newUserProducts);

    try {
      await api.voteProduct(productId, currentUserId, newVoteType);
    } catch (err) {
      console.error('Failed to vote:', err);
      // Revert if needed
      const revertedProducts = [...userProducts];
      revertedProducts[productIndex] = product;
      setUserProducts(revertedProducts);
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
      {/* Profile Header (Premium WOW) */}
      <div className="relative mb-12">
        {/* Cover Photo / Gradient Area */}
        <div className="h-48 md:h-64 bg-gradient-to-br from-vuttik-navy via-vuttik-navy to-vuttik-blue rounded-[40px] md:rounded-[60px] relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-vuttik-blue/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </div>

        {/* Identity & Stats Content */}
        <div className="relative -mt-20 md:-mt-28 px-4 md:px-10 flex flex-col items-center">
          {/* Overlapping Avatar */}
          <div className="relative group mb-4 md:mb-6">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white p-1.5 md:p-2 shadow-2xl">
              <div className="w-full h-full rounded-full bg-vuttik-gray/50 overflow-hidden flex items-center justify-center text-vuttik-navy border-4 border-vuttik-gray/10 shadow-inner">
                <UserAvatar src={profileUser.photoURL || profileUser.photo_url} alt={profileUser.displayName || profileUser.display_name} />
              </div>
            </div>
            {currentUserId === targetUserId && (
              <button 
                onClick={() => {
                  setNewPhotoURL(profileUser.photoURL || profileUser.photo_url || '');
                  setIsEditingPhoto(true);
                }}
                className="absolute bottom-1 right-1 md:bottom-3 md:right-3 bg-vuttik-blue text-white p-2.5 md:p-4 rounded-full border-4 border-white shadow-xl hover:scale-110 active:scale-95 transition-all z-20"
              >
                <Camera size={16} className="md:size-6" />
              </button>
            )}
            <div className={`absolute ${currentUserId === targetUserId ? 'top-1 left-1 md:top-3 md:left-3' : 'bottom-1 right-1 md:bottom-3 md:right-3'} bg-vuttik-blue text-white p-1.5 md:p-3 rounded-full border-4 border-white shadow-lg z-20`}>
              <ShieldCheck size={16} className="md:size-8" />
            </div>
          </div>

          {/* Identity Info */}
          <div className="text-center max-w-2xl">
            <div className="flex flex-col items-center gap-2 md:gap-4 mb-4">
              <h2 className="text-3xl md:text-5xl font-display font-black text-vuttik-navy tracking-tight leading-none">
                {profileUser.displayName || profileUser.display_name}
              </h2>
              {(profileUser.username) && (
                <div className="bg-vuttik-blue/5 border border-vuttik-blue/20 px-4 py-1.5 rounded-full inline-flex items-center gap-2 shadow-sm">
                  <span className="text-vuttik-blue font-bold tracking-wide">@{profileUser.username}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-vuttik-blue/10 text-vuttik-blue rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">
                  <Award size={14} />
                  {profileUser.role || 'Usuario'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-500/10 text-green-600 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  Verificado
                </span>
                {currentUserId && currentUserId !== targetUserId && (
                  <button 
                    onClick={async () => {
                      if (!currentUserId || !targetUserId) return;
                      try {
                        const conv = await api.getOrCreateConversation(currentUserId, targetUserId);
                        navigate('/mensajes', { state: { targetConversationId: conv.id } });
                      } catch (err) {
                        console.error('Failed to start chat:', err);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-vuttik-blue text-white rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm hover:bg-blue-600 transition-colors"
                  >
                    <MessageSquare size={14} />
                    Mensaje
                  </button>
                )}
                {currentUserId && currentUserId !== targetUserId && (
                  <button 
                    disabled={isTogglingFollow}
                    onClick={async () => {
                      if (!currentUserId || !targetUserId) return;
                      setIsTogglingFollow(true);
                      try {
                        if (isFollowing) {
                          await api.unfollowUser(currentUserId, targetUserId);
                          setIsFollowing(false);
                          setProfileUser((prev: any) => ({ ...prev, followerCount: Math.max(0, (prev.followerCount || 1) - 1) }));
                          setFollowersList(prev => prev.filter(f => f.follower_id !== currentUserId));
                        } else {
                          await api.followUser(currentUserId, targetUserId);
                          setIsFollowing(true);
                          setProfileUser((prev: any) => ({ ...prev, followerCount: (prev.followerCount || 0) + 1 }));
                          // Ideally we add the current user to the list, but it requires full user details
                          api.getFollowers(targetUserId).then(setFollowersList).catch(console.error);
                        }
                      } catch (err) {
                        console.error('Failed to toggle follow:', err);
                      } finally {
                        setIsTogglingFollow(false);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm transition-colors ${
                      isFollowing 
                        ? 'bg-gray-100 text-vuttik-text-muted hover:bg-red-50 hover:text-red-500' 
                        : 'bg-vuttik-blue text-white hover:bg-blue-600'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus size={14} />
                        Siguiendo
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        Seguir
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <div className="relative mb-8 max-w-2xl mx-auto group">
              {isEditingBio ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    className="w-full bg-vuttik-gray border-2 border-vuttik-blue/20 rounded-2xl p-4 text-sm md:text-lg leading-relaxed font-medium text-vuttik-navy focus:outline-none focus:border-vuttik-blue resize-none shadow-sm"
                    rows={4}
                    placeholder="Escribe algo sobre ti..."
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsEditingBio(false)}
                      className="px-4 py-2 bg-gray-100 text-vuttik-text-muted rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleUpdateBio}
                      className="px-4 py-2 bg-vuttik-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      <Save size={14} />
                      {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
                  <p className="text-vuttik-text-muted text-sm md:text-lg leading-relaxed font-medium">
                    {profileUser.bio || 'Especialista en la comunidad Vuttik. Comprometido con la transparencia y el comercio seguro en República Dominicana.'}
                  </p>
                  {currentUserId === targetUserId && (
                    <button 
                      onClick={() => {
                        setNewBio(profileUser.bio || '');
                        setIsEditingBio(true);
                      }}
                      className="absolute -right-12 top-0 p-2 bg-white text-vuttik-text-muted hover:text-vuttik-blue rounded-full shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      title="Editar descripción"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-10 mb-6">
              <div className="flex items-center gap-2 text-vuttik-text-muted text-xs md:text-base font-bold bg-vuttik-gray/50 px-4 py-2 rounded-2xl">
                <MapPin size={18} className="text-vuttik-blue" />
                {profileUser.location || 'República Dominicana'}
              </div>
              <div className="flex items-center gap-2 text-vuttik-text-muted text-xs md:text-base font-bold bg-vuttik-gray/50 px-4 py-2 rounded-2xl">
                <Calendar size={18} className="text-vuttik-blue" />
                Miembro desde {profileUser.createdAt || profileUser.created_at ? safeDate(profileUser.createdAt || profileUser.created_at) : 'Abril 2024'}
              </div>
            </div>

            {currentUserId === targetUserId && (
               <div className="flex justify-center w-full mb-10">
                 <button 
                   onClick={() => setShowGlobalBusinessSelector(true)}
                   className="flex items-center gap-2 bg-vuttik-navy text-white px-6 py-3 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-vuttik-navy/20"
                 >
                   <Store size={18} />
                   Ir a Mi Panel de Negocio
                 </button>
               </div>
            )}

            {/* Stats Cards (Floating Style) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
              <div className="bg-white border border-gray-100 p-5 rounded-[32px] text-center shadow-xl shadow-vuttik-navy/5 hover:scale-105 transition-transform">
                <div className="text-2xl md:text-3xl font-black text-vuttik-navy mb-1">98%</div>
                <div className="text-[9px] md:text-[10px] text-vuttik-text-muted font-black uppercase tracking-widest opacity-60">Confianza</div>
              </div>
              <div className="bg-white border border-gray-100 p-5 rounded-[32px] text-center shadow-xl shadow-vuttik-navy/5 hover:scale-105 transition-transform">
                <div className="text-2xl md:text-3xl font-black text-vuttik-navy mb-1">{userProducts.length}</div>
                <div className="text-[9px] md:text-[10px] text-vuttik-text-muted font-black uppercase tracking-widest opacity-60">Publicaciones</div>
              </div>
              <div 
                onClick={() => setShowFollowersModal(true)}
                className="bg-white border border-gray-100 p-5 rounded-[32px] text-center shadow-xl shadow-vuttik-navy/5 hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="text-2xl md:text-3xl font-black text-vuttik-navy mb-1">{profileUser.followerCount || 0}</div>
                <div className="text-[9px] md:text-[10px] text-vuttik-text-muted font-black uppercase tracking-widest opacity-60">Seguidores</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center md:justify-start border-b border-gray-100 px-2">
          <div className="flex gap-6 md:gap-10 overflow-x-auto no-scrollbar scroll-smooth">
            {['posts', 'analytics'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveProfileTab(tab)}
                className={`text-[11px] md:text-sm font-black uppercase tracking-widest transition-all border-b-4 pb-4 -mb-1 whitespace-nowrap ${
                  activeProfileTab === tab 
                    ? 'text-vuttik-blue border-vuttik-blue' 
                    : 'text-vuttik-text-muted border-transparent hover:text-vuttik-navy opacity-60 hover:opacity-100'
                }`}
              >
                {tab === 'posts' ? 'Publicaciones' : 'Analytics'}
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
                        price={String(product.price ?? 0)}
                        category={categories.find(c => c.id === (product.categoryId || product.category_id))?.name || 'General'}
                        type={product.typeId || product.type_id}
                        image={product.images?.[0]}
                        upvotes={product.upVotes?.length || 0}
                        downvotes={product.downVotes?.length || 0}
                        userVote={product.upVotes?.includes(currentUserId) ? 'up' : product.downVotes?.includes(currentUserId) ? 'down' : null}
                        onVote={handleVoteProduct}
                        onViewDetails={() => onViewProduct?.(product.id)}
                        trustLevel="High"
                        authorRating={4.5}
                        registeredAt={safeDate(product.createdAt || product.created_at)}
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
            {activeProfileTab === 'analytics' && (
              <div className="flex flex-col gap-8">
                {loadingAnalytics ? (
                  <div className="py-20 text-center">
                    <div className="w-12 h-12 border-4 border-vuttik-blue/20 border-t-vuttik-blue rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-vuttik-text-muted font-bold">Analizando datos reales...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-50 text-vuttik-blue rounded-xl">
                            <Eye size={20} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Vistas Totales</span>
                        </div>
                        <p className="text-3xl font-display font-black text-vuttik-navy">
                          {analyticsData?.totalViews || 0}
                        </p>
                        <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-2">
                          <TrendingUp size={12} />
                          Datos en tiempo real
                        </div>
                      </div>

                      <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                            <Activity size={20} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">Engagement</span>
                        </div>
                        <p className="text-3xl font-display font-black text-vuttik-navy">
                          {analyticsData?.engagement?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0}
                        </p>
                        <div className="text-[10px] text-vuttik-text-muted font-bold mt-2">
                          Acciones totales registradas
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-100 p-8 rounded-[40px] shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-xl font-display font-black text-vuttik-navy">Rendimiento de Publicaciones</h3>
                          <p className="text-sm text-vuttik-text-muted">Vistas registradas en los últimos 7 días</p>
                        </div>
                      </div>
                      
                      <div className="h-80 w-full">
                        {analyticsData?.trend && analyticsData.trend.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData.trend}>
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
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#9CA3AF' }}
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
                                dataKey="value" 
                                stroke="#0066FF" 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorViews)" 
                                isAnimationActive={false} // Disable animation to prevent layout crashes
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-vuttik-text-muted">
                            <TrendingUp size={48} className="opacity-20 mb-4" />
                            <p className="font-bold">No hay suficientes datos para mostrar una tendencia aún.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
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

      {showCamera && (
        <CameraModal 
          onCapture={(b64) => {
            setNewPhotoURL(b64);
            setShowCamera(false);
          }} 
          onClose={() => setShowCamera(false)} 
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
                    <UserAvatar src={newPhotoURL} alt="Edit" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest text-center block">Sube una imagen o toma una foto</label>
                  
                  <input
                    id="profile-gallery-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFiles(e.target.files)}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="aspect-[3/2] bg-vuttik-gray rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-vuttik-text-muted hover:border-vuttik-blue hover:text-vuttik-blue transition-all cursor-pointer"
                    >
                      <Camera size={28} />
                      <span className="text-[10px] font-black uppercase text-center leading-tight">Tomar<br/>Foto</span>
                    </button>
                    <label
                      htmlFor="profile-gallery-input"
                      className="aspect-[3/2] bg-vuttik-gray rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-vuttik-text-muted hover:border-vuttik-blue hover:text-vuttik-blue transition-all cursor-pointer"
                    >
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-black uppercase text-center leading-tight">Subir<br/>Foto</span>
                    </label>
                  </div>
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

