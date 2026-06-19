import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, Award, MapPin, Calendar, Grid, List, TrendingUp, Eye, MessageSquare, DollarSign, BarChart3, PieChart, Megaphone, Camera, X, Save, Activity, Store, Edit2, ImageIcon, UserPlus, UserMinus, Users, Share2, Timer, Bell, Settings, Star, Heart, MessageCircle, Package, Phone, Instagram, Facebook, Twitter, Globe, Clock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';
import ProductCard from './ProductCard';
import UserAvatar from './UserAvatar';
import PromotionModal from './PromotionModal';
import CameraModal from './CameraModal';
import PortfolioManager from './PortfolioManager';

import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isBusinessMode = searchParams.get('mode') === 'business';
  const { setShowGlobalBusinessSelector } = useAuth();
  const { userId, username } = useParams<{ userId?: string, username?: string }>();
  const [activeProfileTab, setActiveProfileTab] = useState('posts');
  const effectiveTab = isBusinessMode ? 'products' : activeProfileTab;
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoTarget, setPromoTarget] = useState<{id: string, type: 'product' | 'post'} | null>(null);
  const [postFilter, setPostFilter] = useState<'product' | 'post'>('product');
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

  const computedRating = useMemo(() => {
    if (userProducts.length === 0) return profileUser?.rating || 0;
    
    let totalScore = 0;
    let count = 0;
    
    userProducts.forEach(p => {
      const isProduct = p.price !== undefined || p.categoryId !== undefined;
      if (!isProduct) return;
      
      const up = Array.isArray(p.upVotes) ? p.upVotes.length : (p.upVotes || 0);
      const down = Array.isArray(p.downVotes) ? p.downVotes.length : (p.downVotes || 0);
      const total = up + down;
      if (total > 0) {
        totalScore += (up / total) * 5;
        count++;
      }
    });
    
    return count > 0 ? totalScore / count : (profileUser?.rating || 0);
  }, [userProducts, profileUser]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: profileUser?.displayName || 'Perfil Vuttik', url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Enlace copiado al portapapeles');
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        let user;
        if (isBusinessMode && targetUserId) {
          user = await api.getBusinessProfile(targetUserId);
          if (user) {
            user.displayName = user.name;
            user.photoURL = user.logo;
            user.bio = user.description;
            user.role = 'business';
            user.workingHours = user.working_hours || user.workingHours;
          }
        } else if (username) {
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

    trackMetric({
      userId: currentUserId || 'anonymous',
      action: 'view' as any,
      targetId: targetUserId,
      targetType: 'user',
      metadata: { profileName: profileUser?.displayName }
    });
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;

    const loadUserProducts = async () => {
      try {
        const [prodsRes, postsRes] = await Promise.allSettled([
          api.getProducts(undefined, targetUserId, isBusinessMode ? 'business' : undefined),
          isBusinessMode ? Promise.resolve({ value: [] }) : api.getUserSocialPosts(targetUserId)
        ]);
        
        let allItems: any[] = [];
        if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value)) {
          allItems = [...allItems, ...prodsRes.value];
        }
        if (postsRes.status === 'fulfilled' && postsRes.value !== undefined && Array.isArray((postsRes.value as any).value ? (postsRes.value as any).value : postsRes.value)) {
          const arr = (postsRes.value as any).value || postsRes.value;
          allItems = [...allItems, ...arr];
        }

        const mapped = allItems.map((p: any) => ({
          ...p,
          authorId: p.authorId || p.author_id,
          authorName: p.authorName || p.author_name || profileUser?.displayName || profileUser?.display_name || 'Usuario',
          createdAt: p.createdAt || p.created_at,
          typeId: p.typeId || p.type_id,
          categoryId: p.categoryId || p.category_id
        }));
        
        // Sort by date descending
        mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setUserProducts(mapped);
        
        const followers = await api.getFollowers(targetUserId);
        setFollowersList(followers);
        
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

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type.startsWith('image/')) {
      try {
        const b64 = await compressImage(file, 800, 0.7);
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
    // Normalise to array (API may return a count or an array depending on context)
    const upVotes: string[] = Array.isArray(product.upVotes) ? [...product.upVotes] : [];
    const downVotes: string[] = Array.isArray(product.downVotes) ? [...product.downVotes] : [];
    
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
    <div className="bg-surface text-on-surface font-body-md selection:bg-vuttik-blue selection:text-white">
      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop">
        {/* Premium Header Section */}
        <section className="relative mb-12">
          {/* Profile Banner Background */}
          <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden relative mb-[-48px] md:mb-[-64px]">
            <div className="absolute inset-0 bg-gradient-to-br from-vuttik-blue via-vuttik-navy to-black opacity-90"></div>
          </div>
          
          {/* User Info Overlay */}
          <div className="px-6 relative flex flex-col items-center md:items-start md:flex-row md:gap-8">
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                <UserAvatar src={profileUser.photoURL || profileUser.photo_url} alt={profileUser.displayName || profileUser.display_name} />
              </div>
              <div className="absolute bottom-2 right-2 w-8 h-8 bg-sky-accent rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-white" size={18} />
              </div>
            </div>
            
            <div className="mt-4 md:mt-16 text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-vuttik-navy font-black md:drop-shadow-none">
                    {profileUser.displayName || profileUser.display_name}
                  </h2>
                  <p className="font-body-md text-vuttik-text-muted mb-4">
                    {profileUser.bio || 'Digital Collector & Curated Goods Vendor'}
                  </p>
                  
                  {isBusinessMode && (
                    <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500 justify-center md:justify-start mb-6">
                      {profileUser.location && (
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                          <MapPin size={16} className="text-vuttik-blue" />
                          <span>{profileUser.location}</span>
                        </div>
                      )}
                      {profileUser.workingHours && (
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                          <Clock size={16} className="text-vuttik-blue" />
                          <span>{profileUser.workingHours}</span>
                        </div>
                      )}
                      {profileUser.phone && (
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                          <Phone size={16} className="text-vuttik-blue" />
                          <span>{profileUser.phone}</span>
                        </div>
                      )}
                      {profileUser.socialLinks && (
                        <div className="flex gap-2 items-center bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          {profileUser.socialLinks.instagram && (
                            <a href={profileUser.socialLinks.instagram} target="_blank" rel="noreferrer" className="p-1 text-pink-600 hover:bg-gray-100 rounded-full transition-colors"><Instagram size={18} /></a>
                          )}
                          {profileUser.socialLinks.facebook && (
                            <a href={profileUser.socialLinks.facebook} target="_blank" rel="noreferrer" className="p-1 text-blue-600 hover:bg-gray-100 rounded-full transition-colors"><Facebook size={18} /></a>
                          )}
                          {profileUser.socialLinks.twitter && (
                            <a href={profileUser.socialLinks.twitter} target="_blank" rel="noreferrer" className="p-1 text-blue-400 hover:bg-gray-100 rounded-full transition-colors"><Twitter size={18} /></a>
                          )}
                          {profileUser.socialLinks.website && (
                            <a href={profileUser.socialLinks.website} target="_blank" rel="noreferrer" className="p-1 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><Globe size={18} /></a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-center md:justify-start">
                  {currentUserId === targetUserId ? (
                    <>
                      <button 
                        onClick={() => setShowGlobalBusinessSelector(true)}
                        className="px-4 md:px-6 py-2.5 bg-surface border border-vuttik-blue text-vuttik-blue rounded-full font-label-md hover:bg-vuttik-blue/10 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                        title="Cambiar a Modo Negocio"
                      >
                        <Store size={18} />
                        <span className="hidden sm:inline">Modo Negocio</span>
                      </button>
                      <button 
                        onClick={() => setIsEditingBio(true)}
                        className="px-4 md:px-6 py-2.5 bg-surface border border-gray-200 text-on-surface rounded-full font-label-md hover:bg-surface-variant active:scale-95 transition-all shadow-sm flex items-center gap-2"
                        title="Editar bio"
                      >
                        <Edit2 size={16} />
                        <span className="hidden sm:inline">Editar Bio</span>
                      </button>
                      <button 
                        onClick={() => setIsEditingPhoto(true)}
                        className="px-6 py-2.5 bg-vuttik-blue text-white rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all shadow-md"
                      >
                        Editar Perfil
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={async () => {
                          if (!currentUserId || !targetUserId) return;
                          setIsTogglingFollow(true);
                          try {
                            if (isFollowing) {
                              await api.unfollowUser(currentUserId, targetUserId);
                              setIsFollowing(false);
                            } else {
                              await api.followUser(currentUserId, targetUserId);
                              setIsFollowing(true);
                            }
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsTogglingFollow(false);
                          }
                        }}
                        disabled={isTogglingFollow}
                        className={`px-6 py-2.5 ${isFollowing ? 'bg-surface-variant text-vuttik-navy' : 'bg-vuttik-blue text-white'} rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all shadow-md`}
                      >
                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                      </button>
                      <button 
                        onClick={async () => {
                          if (!currentUserId || !targetUserId) return;
                          try {
                            const conv = await api.getOrCreateConversation(currentUserId, targetUserId);
                            navigate('/mensajes', { state: { targetConversationId: conv.id } });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-6 py-2.5 bg-surface text-vuttik-blue rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all shadow-md"
                      >
                        Mensaje
                      </button>
                    </>
                  )}
                  <button onClick={handleShare} className="p-2.5 bg-white border border-outline-variant/30 rounded-full text-vuttik-navy active:scale-95 transition-all shadow-sm" title="Compartir perfil">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="max-w-4xl mx-auto mb-10">
          <div className="bg-white rounded-lg shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] p-6 flex justify-around items-center gap-4 text-center">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 mb-1">
                <Star size={24} className="text-yellow-400 fill-yellow-400" />
                <span className="text-headline-md text-vuttik-navy font-bold leading-none">
                  {computedRating > 0 ? computedRating.toFixed(1) : 'N/A'}
                </span>
              </div>
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                Calificación
              </span>
            </div>
            <div className="w-px h-10 bg-outline-variant/30"></div>
            <div className="flex-1">
              <span className="block text-headline-md text-vuttik-navy font-bold">
                {userProducts.filter(p => p.price !== undefined || p.categoryId !== undefined).length}
              </span>
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Productos</span>
            </div>
            <div className="w-px h-10 bg-outline-variant/30"></div>
            <div className="flex-1 cursor-pointer" onClick={() => setShowFollowersModal(true)}>
              <span className="block text-headline-md text-vuttik-navy font-bold">{profileUser.followerCount || 0}</span>
              <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Seguidores</span>
            </div>
          </div>
        </section>

        {/* Tabs Content */}
        <section>
          <div className="flex border-b border-outline-variant/20 mb-8 sticky top-20 bg-surface/80 backdrop-blur-md z-10">
            <button 
              onClick={() => setActiveProfileTab('posts')}
              className={`flex-1 py-4 font-label-md transition-all ${activeProfileTab === 'posts' ? 'text-vuttik-blue border-b-2 border-vuttik-blue' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Publicaciones
            </button>
            {(currentUserId === targetUserId || profileUser?.privacy?.publicAnalytics) && (
              <button 
                onClick={() => setActiveProfileTab('analytics')}
                className={`flex-1 py-4 font-label-md transition-all ${activeProfileTab === 'analytics' ? 'text-vuttik-blue border-b-2 border-vuttik-blue' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Analytics
              </button>
            )}
            {currentUserId === targetUserId && (
              <button 
                onClick={() => setActiveProfileTab('portfolios')}
                className={`flex-1 py-4 font-label-md transition-all ${activeProfileTab === 'portfolios' ? 'text-vuttik-blue border-b-2 border-vuttik-blue' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Portafolios
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeProfileTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
          <div className="max-w-6xl mx-auto">
            {effectiveTab === 'posts' && (
                <div className="space-y-6">
                  {/* Filter Section */}
                  <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                    {['product', 'post'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setPostFilter(filter as any)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                          postFilter === filter 
                            ? 'bg-vuttik-blue text-white shadow-md' 
                            : 'bg-white border border-gray-100 text-vuttik-text-muted hover:bg-gray-50'
                        }`}
                      >
                        {filter === 'product' ? 'Productos' : 'Posts'}
                      </button>
                    ))}
                  </div>

                  {postFilter === 'product' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
                      {userProducts.filter(p => p.price !== undefined || p.categoryId !== undefined).length > 0 ? (
                        userProducts.filter(p => p.price !== undefined || p.categoryId !== undefined).map(product => (
                          <div key={product.id} className="relative group">
                            <ProductCard 
                              {...product} 
                              price={String(product.price ?? 0)}
                              category={categories.find(c => c.id === (product.categoryId || product.category_id))?.name || 'General'}
                              type={product.typeId || product.type_id}
                              image={product.images?.[0]}
                              upvotes={typeof product.upVotes === 'number' ? product.upVotes : (Array.isArray(product.upVotes) ? product.upVotes.length : 0)}
                              downvotes={typeof product.downVotes === 'number' ? product.downVotes : (Array.isArray(product.downVotes) ? product.downVotes.length : 0)}
                              userVote={Array.isArray(product.upVotes) && product.upVotes.includes(currentUserId) ? 'up' : Array.isArray(product.downVotes) && product.downVotes.includes(currentUserId) ? 'down' : null}
                              onVote={handleVoteProduct}
                              onViewDetails={() => onViewProduct?.(product.id)}
                              trustLevel="High"
                              authorRating={computedRating}
                              registeredAt={safeDate(product.createdAt || product.created_at)}
                            />
                            {currentUserId === targetUserId && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePromote(product.id, 'product');
                                }}
                                className="absolute top-4 left-4 bg-vuttik-blue text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
                                title="Promocionar este producto"
                              >
                                <Megaphone size={18} />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-16 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-200">
                          <div className="w-20 h-20 bg-vuttik-blue/10 rounded-full flex items-center justify-center text-vuttik-blue mx-auto mb-4">
                            <Package size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-vuttik-navy mb-2">Sin productos</h3>
                          <p className="text-vuttik-text-muted">Este usuario aún no ha publicado productos.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-6">
                      {userProducts.filter(p => p.price === undefined && p.categoryId === undefined).length > 0 ? (
                        userProducts.filter(p => p.price === undefined && p.categoryId === undefined).map(post => (
                          <div key={post.id} className="bg-white rounded-[32px] shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] border border-gray-100 overflow-hidden">
                            <div className="p-5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-surface-variant/30">
                                  <UserAvatar src={post.author_avatar || post.authorAvatar} alt={post.author_name || post.authorName} />
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-gray-900">{post.author_name || post.authorName}</span>
                                    {(post.is_verified || profileUser?.trustLevel === 'High') && <ShieldCheck size={18} className="text-vuttik-blue" />}
                                  </div>
                                  <span className="text-xs text-gray-500 font-medium">{safeDate(post.created_at || post.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="px-5 pb-5">
                              <p className="text-gray-800 text-sm whitespace-pre-wrap">{post.content || post.title}</p>
                            </div>
                            {(post.image_url || post.images?.[0]) && (
                              <div className="relative w-full">
                                <img src={post.image_url || post.images?.[0]} alt="Post" className="w-full h-auto max-h-[500px] object-cover" />
                              </div>
                            )}
                            <div className="p-4 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
                              <div className="flex items-center gap-6">
                                <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-all">
                                  <Heart size={20} />
                                  <span className="font-bold text-xs">{post.likes?.length || 0}</span>
                                </button>
                                <button className="flex items-center gap-2 text-gray-500 hover:text-vuttik-blue transition-all">
                                  <MessageCircle size={20} />
                                  <span className="font-bold text-xs">{post.comments || 0}</span>
                                </button>
                                <button className="flex items-center gap-2 text-gray-500 hover:text-vuttik-teal transition-all">
                                  <Share2 size={20} />
                                  <span className="font-bold text-xs">{post.reposts || 0}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-16 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-200">
                          <div className="w-20 h-20 bg-vuttik-blue/10 rounded-full flex items-center justify-center text-vuttik-blue mx-auto mb-4">
                            <MessageCircle size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-vuttik-navy mb-2">Sin posts sociales</h3>
                          <p className="text-vuttik-text-muted">Este usuario aún no ha publicado contenido social.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {effectiveTab === 'analytics' && (
                <div className="bg-white rounded-lg p-8 shadow-[0_8px_32px_0_rgba(6,11,25,0.04)]">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="font-headline-md text-vuttik-navy mb-1">Performance Trend</h3>
                      <p className="font-label-md text-on-surface-variant">Your profile visibility and sales last 30 days</p>
                    </div>
                    <div className="flex items-center gap-2 text-success">
                      <TrendingUp size={20} />
                      <span className="font-label-md">+12.4%</span>
                    </div>
                  </div>

                  <div className="h-80 w-full mt-4">
                    {loadingAnalytics ? (
                       <div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vuttik-blue"></div></div>
                    ) : analyticsData?.trend && analyticsData.trend.length > 0 ? (
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
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 8px 32px 0 rgba(6,11,25,0.04)' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#0066FF" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorViews)" 
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant">
                        <Activity size={48} className="opacity-20 mb-4" />
                        <p className="font-bold">No hay suficientes datos para mostrar una tendencia aún.</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                    <div className="border border-outline-variant/30 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase">Conversion Rate</p>
                        <p className="text-headline-md font-bold text-vuttik-navy">4.2%</p>
                      </div>
                      <Store className="text-vuttik-blue" size={32} />
                    </div>
                    <div className="border border-outline-variant/30 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase">Avg. View Time</p>
                        <p className="text-headline-md font-bold text-vuttik-navy">12s</p>
                      </div>
                      <Timer className="text-vuttik-blue" size={32} />
                    </div>
                  </div>
                </div>
              )}
              
              {activeProfileTab === 'portfolios' && currentUserId === targetUserId && (
                <PortfolioManager userId={currentUserId} />
              )}
            </div>
            </motion.div>
          </AnimatePresence>
        </section>
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

      {/* Followers Modal */}
      <AnimatePresence>
        {showFollowersModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFollowersModal(false)} className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-black text-vuttik-navy">Seguidores</h3>
                <button onClick={() => setShowFollowersModal(false)} className="p-2 bg-surface-container rounded-xl text-on-surface-variant"><X size={18} /></button>
              </div>
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                {followersList.length === 0 ? (
                  <p className="text-center text-sm text-on-surface-variant py-6">Aún no hay seguidores.</p>
                ) : followersList.map((f: any) => (
                  <div key={f.uid} onClick={() => { setShowFollowersModal(false); navigate(`/perfil/${f.uid}`); }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container cursor-pointer transition-colors">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100"><UserAvatar src={f.photoURL || f.photo_url} alt={f.displayName || f.display_name} /></div>
                    <span className="font-semibold text-sm text-on-surface">{f.displayName || f.display_name || 'Usuario'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bio Edit Modal */}
      <AnimatePresence>
        {isEditingBio && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingBio(false)} className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-black text-vuttik-navy">Editar Bio</h3>
                <button onClick={() => setIsEditingBio(false)} className="p-2 bg-surface-container rounded-xl text-on-surface-variant"><X size={18} /></button>
              </div>
              <textarea
                className="w-full h-32 border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                placeholder="Escribe algo sobre ti..."
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-on-surface-variant text-right mb-4">{newBio.length}/200</p>
              <button onClick={handleUpdateBio} disabled={isSubmitting} className="w-full bg-vuttik-blue text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50">
                {isSubmitting ? 'Guardando...' : 'Guardar Bio'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-md bg-white rounded-lg shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-black text-on-surface">Foto de Perfil</h3>
                <button onClick={() => setIsEditingPhoto(false)} className="p-2 bg-surface-container rounded-xl text-on-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-[40px] bg-surface-container overflow-hidden">
                    <UserAvatar src={newPhotoURL} alt="Edit" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center block">Sube una imagen o toma una foto</label>
                  
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
                      className="aspect-[3/2] bg-surface-container rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-vuttik-blue hover:text-vuttik-blue transition-all cursor-pointer"
                    >
                      <Camera size={28} />
                      <span className="text-[10px] font-black uppercase text-center leading-tight">Tomar<br/>Foto</span>
                    </button>
                    <label
                      htmlFor="profile-gallery-input"
                      className="aspect-[3/2] bg-surface-container rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-vuttik-blue hover:text-vuttik-blue transition-all cursor-pointer"
                    >
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-black uppercase text-center leading-tight">Subir<br/>Foto</span>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handleUpdatePhoto}
                  disabled={isSubmitting || !newPhotoURL}
                  className="w-full bg-vuttik-navy text-white py-4 rounded-lg font-bold shadow-xl shadow-vuttik-navy/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
