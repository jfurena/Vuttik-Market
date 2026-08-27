import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, Award, MapPin, Calendar, Grid, List, TrendingUp, Eye, MessageSquare, DollarSign, BarChart3, PieChart, Megaphone, Camera, X, Save, Activity, Store, Edit2, ImageIcon, UserPlus, UserMinus, Users, Share2, Timer, Bell, Settings, Star, Heart, MessageCircle, Package, Phone, Instagram, Facebook, Twitter, Globe, Clock, ArrowRight, Upload, FileText, CheckCircle, Check, ChevronDown, ChevronUp, MoreVertical, Link, Send, Trash2, Target, Search, Filter } from 'lucide-react';
import { formatLocation, formatLocationRegion, formatWorkingHours } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';
import ProductCard from './ProductCard';
import UserAvatar from './UserAvatar';
import PromotionModal from './PromotionModal';

import PortfolioManager from './PortfolioManager';
import EditProfileModal from './EditProfileModal';
import LocationInput from './LocationInput';

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
  const { setShowGlobalBusinessSelector, plans } = useAuth();
  const { userId, username } = useParams<{ userId?: string, username?: string }>();
  const targetUserId = userId || (!username ? currentUserId : undefined);
  
  const [profileUser, setProfileUser] = useState<any>(null);

  const profileHasFeature = (featureId: string) => {
    if (!profileUser?.planId || !plans) return false;
    const plan = plans.find((p: any) => p.id === profileUser.planId);
    return plan?.features?.includes(featureId) ?? false;
  };
  const isBusinessMode = searchParams.get('mode') === 'business' || (targetUserId?.startsWith('biz-')) || profileUser?.role === 'business';
  
  const [activeProfileTab, setActiveProfileTab] = useState('posts');
  const effectiveTab = activeProfileTab;
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoTarget, setPromoTarget] = useState<{id: string, type: 'product' | 'post'} | null>(null);
  const [postFilter, setPostFilter] = useState<'product' | 'post' | 'menus'>('product');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  
  // Menu state
  const [editingMenu, setEditingMenu] = useState<{ menuId: string; items: any[]; storeName: string; menuImage?: string; location?: string; lat?: number; lng?: number } | null>(null);
  const [viewingMenu, setViewingMenu] = useState<{ menuId: string; items: any[]; storeName: string; createdAt: string; menuImage?: string; location?: string; lat?: number; lng?: number } | null>(null);
  const [isDeletingMenu, setIsDeletingMenu] = useState<string | null>(null);
  const [isSavingMenu, setIsSavingMenu] = useState(false);

  // Bulk product selection
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);

  // Search & Pagination States
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [searchConfig, setSearchConfig] = useState({ products: true, posts: true, menus: true });
  const [showSearchConfig, setShowSearchConfig] = useState(false);
  const [visibleItemsLimit, setVisibleItemsLimit] = useState(15);

  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handlePromote = (id: string, type: 'product' | 'post') => {
    setPromoTarget({ id, type });
    setShowPromoModal(true);
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedProductIds.size} producto(s)?`)) return;
    if (!currentUserId) return;
    
    try {
      const ids = Array.from(selectedProductIds);
      await Promise.all(ids.map(id => api.deleteProduct(id, currentUserId)));
      setUserProducts(prev => prev.filter(p => !selectedProductIds.has(p.id)));
      setSelectedProductIds(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      console.error('Error deleting products:', err);
      alert('Error al eliminar algunos productos.');
    }
  };

  const handleLikeSocial = async (postId: string) => {
    if (!currentUserId) return;
    try {
      await api.likePost(postId, currentUserId);
      setUserProducts(prev => prev.map(p => {
        if (p.id === postId) {
          const likes = p.likes || [];
          const hasLiked = likes.includes(currentUserId);
          return {
            ...p,
            likes: hasLiked ? likes.filter((id: string) => id !== currentUserId) : [...likes, currentUserId]
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShareSocial = (post: any) => {
    const url = `${window.location.origin}/social?post=${post.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Publicación de ${post.author_name || post.authorName}`,
        text: post.content,
        url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert('Enlace copiado al portapapeles');
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const data = await api.getComments(postId);
      setPostComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSocial = (post: any) => {
    setSelectedPostForComments(post);
    fetchComments(post.id);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPostForComments || !currentUserId) return;
    try {
      await api.addComment(selectedPostForComments.id, {
        authorId: currentUserId,
        authorName: isBusinessMode ? (profileUser?.businessName || profileUser?.displayName) : (profileUser?.displayName || 'Usuario'),
        authorAvatar: isBusinessMode ? (profileUser?.businessLogo || profileUser?.photoURL) : (profileUser?.photoURL || ''),
        content: newComment
      });
      setNewComment('');
      fetchComments(selectedPostForComments.id);
      setUserProducts(prev => prev.map(p => p.id === selectedPostForComments.id ? { ...p, comments: (p.comments || 0) + 1 } : p));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
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
          api.getProducts(undefined, targetUserId, isBusinessMode ? 'business' : undefined, 1, 500),
          isBusinessMode ? api.getUserSocialPosts(targetUserId, 'business') : api.getUserSocialPosts(targetUserId)
        ]);
        
        let allItems: any[] = [];
        if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value)) {
          allItems = [...allItems, ...prodsRes.value];
        }
        if (postsRes.status === 'fulfilled' && Array.isArray(postsRes.value)) {
          allItems = [...allItems, ...postsRes.value];
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

  // Filter products vs posts (component level)
  const realProducts = userProducts.filter(p => p.price !== undefined || p.categoryId !== undefined);
  const userPosts = userProducts.filter(p => p.price === undefined && p.categoryId === undefined);

  // Group products by menuId
  const groupedMenus = new Map<string, any[]>();
  realProducts.forEach(p => {
    let custom = p.customFields || {};
    if (typeof custom === 'string') {
      try { custom = JSON.parse(custom); } catch (e) {}
      if (typeof custom === 'string') {
        try { custom = JSON.parse(custom); } catch (e) {}
      }
    }
    if (custom.isMenuGroup && custom.menuId) {
      if (!groupedMenus.has(custom.menuId)) groupedMenus.set(custom.menuId, []);
      groupedMenus.get(custom.menuId)!.push(p);
    }
  });

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
      const [data, promoData] = await Promise.all([
        api.getUserAnalytics(targetUserId!),
        api.getPromotions()
      ]);
      if (data.trend) {
        data.trend = data.trend.map((t: any) => ({
          name: new Date(t.date).toLocaleDateString([], { weekday: 'short' }),
          value: t.count
        }));
      }
      setAnalyticsData(data);
      setPromotions(promoData.filter((p: any) => p.businessId === targetUserId || p.author_id === targetUserId));
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta campaña promocional?')) return;
    try {
      if (!currentUserId) return;
      await api.deletePromotion(promoId);
      setPromotions(prev => prev.filter(p => p.id !== promoId));
    } catch (error) {
      console.error('Error deleting promotion:', error);
    }
  };

  const handleDeleteMenu = async (menuId: string, items: any[]) => {
    if (!confirm(`¿Eliminar este menú y sus ${items.length} producto(s)?`)) return;
    if (!currentUserId) return;
    setIsDeletingMenu(menuId);
    try {
      await Promise.all(items.map(item => api.deleteProduct(item.id, currentUserId)));
      setUserProducts(prev => prev.filter(p => {
        let custom = p.customFields || {};
        if (typeof custom === 'string') { try { custom = JSON.parse(custom); } catch (e) {} }
        return !(custom.menuId === menuId);
      }));
    } catch (err) {
      console.error('Error deleting menu:', err);
      alert('Hubo un error eliminando el menú.');
    } finally {
      setIsDeletingMenu(null);
    }
  };

  const handleSaveMenuEdits = async () => {
    if (!editingMenu || !currentUserId) return;
    setIsSavingMenu(true);
    try {
      await Promise.all(editingMenu.items.map(item => {
        let customFields = item.customFields;
        if (typeof customFields === 'string') {
          try { customFields = JSON.parse(customFields); } catch(e) {}
        }
        customFields = { ...customFields, storeName: editingMenu.storeName };
        
        const payload: any = {
          title: item.title,
          price: Number(item.price),
          categoryId: item.categoryId,
          currency: item.currency,
          typeId: item.typeId || item.type_id || 'sell',
          customFields: JSON.stringify(customFields),
          location: editingMenu.location || item.location,
          lat: editingMenu.lat !== undefined ? editingMenu.lat : item.lat,
          lng: editingMenu.lng !== undefined ? editingMenu.lng : item.lng
        };

        if (editingMenu.menuImage) {
          payload.images = [editingMenu.menuImage];
        }

        return api.updateProduct(item.id, payload, currentUserId);
      }));
      setUserProducts(prev => prev.map(p => {
        const edited = editingMenu.items.find((ei: any) => ei.id === p.id);
        return edited ? { ...p, ...edited } : p;
      }));
      setEditingMenu(null);
    } catch (err) {
      console.error('Error saving menu:', err);
      alert('Error al guardar los cambios.');
    } finally {
      setIsSavingMenu(false);
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
        <section className="relative mb-8 pt-8">
          
          {/* User Info Overlay */}
          <div className="px-4 sm:px-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8">
              <div className="relative shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1.5 bg-white shadow-xl border border-gray-100">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white shadow-inner">
                    <UserAvatar src={profileUser.photoURL || profileUser.photo_url} alt={profileUser.displayName || profileUser.display_name} />
                  </div>
                </div>
                {(profileUser.is_verified || profileUser.trustLevel === 'High' || profileHasFeature('verified_badge')) && (
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-sky-500 rounded-full border-[3px] border-white flex items-center justify-center shadow-lg">
                    <ShieldCheck className="text-white" size={14} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 w-full flex flex-col md:flex-row justify-between items-center md:items-start gap-6 md:pt-4">
                <div className="text-center md:text-left flex-1 min-w-0">
                  <h2 className="text-3xl md:text-4xl text-vuttik-navy font-black tracking-tight mb-2 truncate">
                    {profileUser.displayName || profileUser.display_name}
                  </h2>
                  <p className="text-sm md:text-base text-gray-600 font-medium mb-4 leading-relaxed max-w-3xl">
                    {profileUser.bio || 'Digital Collector & Curated Goods Vendor'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {profileUser.location && (
                      <div className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-full border border-gray-200">
                        <MapPin size={14} className="text-vuttik-blue shrink-0" />
                        <span className="text-xs text-gray-700 font-semibold truncate max-w-[200px] sm:max-w-xs">
                          {profileUser.locationPrivacy === 'region' ? formatLocationRegion(profileUser.location) : formatLocation(profileUser.location)}
                        </span>
                      </div>
                    )}
                    {profileUser.phone && (
                      <div className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-full border border-gray-200">
                        <Phone size={14} className="text-vuttik-blue shrink-0" />
                        <span className="text-xs text-gray-700 font-semibold">{profileUser.phone}</span>
                      </div>
                    )}
                    {profileUser.workingHours && profileUser.showWorkingHours !== false && formatWorkingHours(profileUser.workingHours).length > 0 && (
                      <div className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-full border border-gray-200" title={formatWorkingHours(profileUser.workingHours).join('\n')}>
                        <Clock size={14} className="text-vuttik-blue shrink-0" />
                        <span className="text-xs text-gray-700 font-semibold truncate max-w-[200px]">
                          {formatWorkingHours(profileUser.workingHours)[0]} {formatWorkingHours(profileUser.workingHours).length > 1 && '...'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Actions & Social */}
                <div className="flex flex-col items-center md:items-end gap-4 shrink-0 w-full md:w-auto">
                  {/* Social Circles */}
                  {profileUser.socialLinks && (Object.values(profileUser.socialLinks).some(v => v)) && (
                    <div className="flex gap-2">
                      {profileUser.socialLinks.instagram && (
                        <a href={profileUser.socialLinks.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm text-gray-400 hover:text-pink-600 hover:shadow-md hover:-translate-y-0.5 transition-all"><Instagram size={18} /></a>
                      )}
                      {profileUser.socialLinks.facebook && (
                        <a href={profileUser.socialLinks.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm text-gray-400 hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5 transition-all"><Facebook size={18} /></a>
                      )}
                      {profileUser.socialLinks.twitter && (
                        <a href={profileUser.socialLinks.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm text-gray-400 hover:text-sky-500 hover:shadow-md hover:-translate-y-0.5 transition-all"><Twitter size={18} /></a>
                      )}
                      {profileUser.socialLinks.website && (
                        <a href={profileUser.socialLinks.website} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm text-gray-400 hover:text-gray-900 hover:shadow-md hover:-translate-y-0.5 transition-all"><Globe size={18} /></a>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    {currentUserId === targetUserId ? (
                      <>
                        <button onClick={() => setShowGlobalBusinessSelector(true)} className="flex-1 md:flex-none px-5 py-2.5 bg-white border-2 border-vuttik-blue text-vuttik-blue rounded-full font-bold text-sm hover:bg-vuttik-blue/5 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm">
                          <Store size={18} />
                          <span>Modo Negocio</span>
                        </button>
                        <button onClick={() => setIsEditingProfile(true)} className="p-2.5 bg-white border border-gray-200 shadow-sm hover:shadow-md rounded-full text-vuttik-navy active:scale-95 transition-all h-full aspect-square flex items-center justify-center">
                          <Edit2 size={18} />
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
                          className={`flex-1 md:flex-none px-6 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg active:scale-95 transition-all text-sm ${isFollowing ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-vuttik-blue text-white border border-vuttik-blue'}`}
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
                          className="flex-1 md:flex-none px-6 py-2.5 bg-white border border-gray-200 text-vuttik-navy rounded-full font-bold text-sm hover:bg-gray-50 shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={18} className="text-vuttik-blue" />
                          Mensaje
                        </button>
                      </>
                    )}
                    <button onClick={handleShare} className="p-2.5 bg-white border border-gray-200 shadow-sm hover:shadow-md rounded-full text-gray-700 active:scale-95 transition-all h-full aspect-square flex items-center justify-center shrink-0">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Glass Card */}
        <section className="max-w-4xl mx-auto mb-10 px-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] p-5 flex justify-around items-center gap-4 text-center">
            <div className="flex-1 flex flex-col items-center justify-center hover:scale-105 transition-transform">
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
                <span className="text-2xl text-vuttik-navy font-black leading-none">
                  {computedRating > 0 ? computedRating.toFixed(1) : 'N/A'}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
                Calificación
              </span>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 flex flex-col items-center justify-center hover:scale-105 transition-transform">
              <span className="block text-2xl text-vuttik-navy font-black mb-1">
                {userProducts.filter(p => p.price !== undefined || p.categoryId !== undefined).length}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Productos</span>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform group" onClick={() => setShowFollowersModal(true)}>
              <span className="block text-2xl text-vuttik-navy font-black mb-1 group-hover:text-vuttik-blue transition-colors">{profileUser.followerCount || 0}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest group-hover:text-vuttik-blue transition-colors">Seguidores</span>
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
          <div className="max-w-6xl mx-auto pb-24">
            {effectiveTab === 'posts' && (() => {
              const query = profileSearchQuery.toLowerCase().trim();
              
              const filteredProducts = userProducts
                .filter(p => p.price !== undefined || p.categoryId !== undefined)
                .filter(p => !query || !searchConfig.products ? true : (
                  (p.title?.toLowerCase() || '').includes(query) ||
                  (p.description?.toLowerCase() || '').includes(query)
                ));

              const filteredPosts = userProducts
                .filter(p => p.price === undefined && p.categoryId === undefined)
                .filter(p => !query || !searchConfig.posts ? true : (
                  (p.content?.toLowerCase() || '').includes(query)
                ));

              const filteredMenus = Array.from(groupedMenus.entries())
                .filter(([menuId, menuData]) => !query || !searchConfig.menus ? true : (
                  ((menuData[0] as any)?.storeName?.toLowerCase() || (menuData[0] as any)?.customFields?.storeName?.toLowerCase() || '').includes(query)
                ));

              const isSearching = query.length > 0;

              return (
                <div className="space-y-6">
                  {/* Filter & Search Section */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
                      {([
                        { key: 'product', label: 'Productos' },
                        { key: 'post', label: 'Posts' },
                        ...(currentUserId === targetUserId ? [{ key: 'menus', label: `Menús (${groupedMenus.size})` }] : [])
                      ] as { key: string; label: string }[]).map(filter => (
                        <button
                          key={filter.key}
                          onClick={() => {
                            setPostFilter(filter.key as any);
                            setProfileSearchQuery(''); // Reset search when switching tabs manually
                            setVisibleItemsLimit(15);
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                            postFilter === filter.key && !profileSearchQuery
                              ? 'bg-vuttik-blue text-white shadow-md' 
                              : 'bg-white border border-gray-100 text-vuttik-text-muted hover:bg-gray-50'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative flex-1 md:max-w-md flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar en el perfil..."
                          value={profileSearchQuery}
                          onChange={(e) => setProfileSearchQuery(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                        />
                        {profileSearchQuery && (
                          <button onClick={() => setProfileSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div className="relative">
                        <button
                          onClick={() => setShowSearchConfig(!showSearchConfig)}
                          className={`p-2 rounded-xl transition-all ${showSearchConfig || !Object.values(searchConfig).every(Boolean) ? 'bg-vuttik-blue text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                          title="Filtros de búsqueda"
                        >
                          <Filter size={18} />
                        </button>
                        
                        <AnimatePresence>
                          {showSearchConfig && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-30"
                            >
                              <h4 className="text-xs font-bold text-vuttik-navy mb-3 uppercase tracking-wider">Buscar en:</h4>
                              <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${searchConfig.products ? 'bg-vuttik-blue' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                                    {searchConfig.products && <Check size={12} className="text-white" />}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Productos</span>
                                  <input type="checkbox" className="hidden" checked={searchConfig.products} onChange={() => setSearchConfig(p => ({ ...p, products: !p.products }))} />
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${searchConfig.posts ? 'bg-vuttik-blue' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                                    {searchConfig.posts && <Check size={12} className="text-white" />}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Posts</span>
                                  <input type="checkbox" className="hidden" checked={searchConfig.posts} onChange={() => setSearchConfig(p => ({ ...p, posts: !p.posts }))} />
                                </label>
                                {currentUserId === targetUserId && (
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${searchConfig.menus ? 'bg-vuttik-blue' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                                      {searchConfig.menus && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Menús</span>
                                    <input type="checkbox" className="hidden" checked={searchConfig.menus} onChange={() => setSearchConfig(p => ({ ...p, menus: !p.menus }))} />
                                  </label>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {(isSearching ? searchConfig.products && filteredProducts.length > 0 : postFilter === 'product') && (
                    <div className="space-y-6">
                      {isSearching && <h3 className="text-lg font-bold text-vuttik-navy border-b border-gray-100 pb-2">Productos Encontrados</h3>}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.slice(0, visibleItemsLimit).map(product => (
                            <div key={product.id} className={`relative group ${isSelectionMode && selectedProductIds.has(product.id) ? 'ring-4 ring-vuttik-blue rounded-[32px] overflow-hidden' : ''}`}>
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
                              onViewDetails={() => {
                                if (isSelectionMode) {
                                  setSelectedProductIds(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(product.id)) newSet.delete(product.id);
                                    else newSet.add(product.id);
                                    return newSet;
                                  });
                                } else {
                                  onViewProduct?.(product.id);
                                }
                              }}
                              trustLevel="High"
                              authorRating={computedRating}
                              registeredAt={safeDate(product.createdAt || product.created_at)}
                            />
                            {currentUserId === targetUserId && !isSelectionMode && (
                              <div className="absolute top-4 right-4 z-20">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDropdownOpenId(dropdownOpenId === product.id ? null : product.id);
                                  }}
                                  className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm hover:bg-white transition-all border border-gray-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                  <MoreVertical size={18} className="text-gray-700" />
                                </button>
                                
                                {dropdownOpenId === product.id && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setDropdownOpenId(null); }} />
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-1 z-40">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handlePromote(product.id, 'product'); setDropdownOpenId(null); }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Megaphone size={16} className="text-vuttik-blue" /> Promocionar
                                      </button>
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setIsSelectionMode(true); 
                                          setSelectedProductIds(new Set([product.id])); 
                                          setDropdownOpenId(null); 
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <CheckCircle size={16} className="text-vuttik-blue" /> Seleccionar
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDropdownOpenId(null);
                                          if (confirm('¿Eliminar producto?')) {
                                            api.deleteProduct(product.id, currentUserId).then(() => {
                                              setUserProducts(prev => prev.filter(p => p.id !== product.id));
                                            });
                                          }
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <Trash2 size={16} /> Eliminar
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {isSelectionMode && (
                              <div className="absolute top-4 left-4 z-20">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer border-2 ${selectedProductIds.has(product.id) ? 'bg-vuttik-blue border-vuttik-blue' : 'bg-white/80 border-gray-300 hover:border-vuttik-blue'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductIds(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(product.id)) newSet.delete(product.id);
                                      else newSet.add(product.id);
                                      return newSet;
                                    });
                                  }}
                                >
                                  {selectedProductIds.has(product.id) && <Check size={16} className="text-white" />}
                                </div>
                              </div>
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
                      
                      {filteredProducts.length > visibleItemsLimit && (
                        <div className="flex justify-center mt-8">
                          <button
                            onClick={() => setVisibleItemsLimit(prev => prev + 15)}
                            className="px-8 py-3 bg-white border border-gray-200 rounded-full font-bold text-vuttik-navy shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                          >
                            Cargar Más Productos
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(isSearching ? searchConfig.posts && filteredPosts.length > 0 : postFilter === 'post') && (
                    <div className="max-w-2xl mx-auto space-y-6">
                      {isSearching && <h3 className="text-lg font-bold text-vuttik-navy border-b border-gray-100 pb-2">Posts Encontrados</h3>}
                      {filteredPosts.length > 0 ? (
                        filteredPosts.slice(0, visibleItemsLimit).map(post => (
                          <div key={post.id} className="bg-white rounded-[32px] shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] border border-gray-100 overflow-hidden">
                            <div className="p-5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-surface-variant/30">
                                  <UserAvatar src={post.author_avatar || post.authorAvatar} alt={post.author_name || post.authorName} />
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-vuttik-navy">{post.author_name || profileUser?.displayName}</h4>
                                    {(post.is_verified || profileUser?.trustLevel === 'High' || profileHasFeature('verified_badge')) && <ShieldCheck size={18} className="text-vuttik-blue" />}
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
                                <button onClick={() => handleLikeSocial(post.id)} className={`flex items-center gap-2 transition-all ${post.likes?.includes(currentUserId) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                  <Heart size={20} className={post.likes?.includes(currentUserId) ? 'fill-red-500' : ''} />
                                  <span className="font-bold text-xs">{post.likes?.length || 0}</span>
                                </button>
                                <button onClick={() => handleCommentSocial(post)} className="flex items-center gap-2 text-gray-500 hover:text-vuttik-blue transition-all" title="Ver comentarios">
                                  <MessageCircle size={20} />
                                  <span className="font-bold text-xs">{post.comments || 0}</span>
                                </button>
                                <button onClick={() => handleShareSocial(post)} className="flex items-center gap-2 text-gray-500 hover:text-vuttik-teal transition-all">
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
                      
                      {filteredPosts.length > visibleItemsLimit && (
                        <div className="flex justify-center mt-8">
                          <button
                            onClick={() => setVisibleItemsLimit(prev => prev + 15)}
                            className="px-8 py-3 bg-white border border-gray-200 rounded-full font-bold text-vuttik-navy shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                          >
                            Cargar Más Posts
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ====== MENÚS TAB ====== */}
                  {(isSearching ? searchConfig.menus && filteredMenus.length > 0 : postFilter === 'menus') && (
                    <div className="space-y-6">
                      {isSearching && <h3 className="text-lg font-bold text-vuttik-navy border-b border-gray-100 pb-2">Menús Encontrados</h3>}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
                        {filteredMenus.length === 0 ? (
                          <div className="col-span-full py-16 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-vuttik-blue/10 rounded-full flex items-center justify-center text-vuttik-blue mx-auto mb-4">
                              <Package size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-vuttik-navy mb-2">Sin menús aún</h3>
                            <p className="text-vuttik-text-muted">Usa la IA para escanear un menú y aparecerá aquí.</p>
                          </div>
                        ) : (
                          filteredMenus.slice(0, visibleItemsLimit).map(([menuId, items]) => {
                          const storeName = items[0]?.storeName || items[0]?.store_name || 'Sin nombre';
                          const menuTitle = `Menú de ${storeName}`;
                          const createdAt = safeDate(items[0]?.createdAt || items[0]?.created_at);
                          const menuImage = items[0]?.images?.[0];
                          return (
                            <div 
                              key={menuId} 
                              onClick={() => {
                                const menuLocation = items.find(i => i.location)?.location;
                                const menuLat = items.find(i => i.lat)?.lat;
                                const menuLng = items.find(i => i.lng)?.lng;
                                setViewingMenu({ menuId, items, storeName, createdAt, menuImage, location: menuLocation, lat: menuLat, lng: menuLng });
                              }}
                              className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow group relative flex flex-col aspect-[4/3]"
                            >
                              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center relative rounded-t-[24px] overflow-hidden">
                                {menuImage ? (
                                  <>
                                    <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${menuImage})` }} />
                                    <div className="absolute inset-0 bg-black/50 z-0" />
                                    <h4 className="z-10 font-black text-white text-xl leading-tight line-clamp-2">
                                      {menuTitle}
                                    </h4>
                                  </>
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-br from-vuttik-blue/5 to-purple-50 flex flex-col items-center justify-center p-6 z-0">
                                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                      <span className="text-3xl">🍽️</span>
                                    </div>
                                    <h4 className="font-black text-vuttik-navy text-lg leading-tight line-clamp-2">
                                      {menuTitle}
                                    </h4>
                                  </div>
                                )}
                              </div>
                              <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
                                <span className="text-sm font-bold text-vuttik-blue">{items.length} productos</span>
                                <span className="text-xs text-gray-400 font-medium">{createdAt}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      </div>
                      
                      {filteredMenus.length > visibleItemsLimit && (
                        <div className="flex justify-center mt-8">
                          <button
                            onClick={() => setVisibleItemsLimit(prev => prev + 15)}
                            className="px-8 py-3 bg-white border border-gray-200 rounded-full font-bold text-vuttik-navy shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                          >
                            Cargar Más Menús
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

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

                  <div className="mt-12 pt-8 border-t border-outline-variant/30">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-headline-md text-vuttik-navy">Campañas Promocionales</h3>
                      {currentUserId === targetUserId && (
                        <button 
                          onClick={() => handlePromote('', 'product')}
                          className="flex items-center gap-2 bg-vuttik-blue text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-vuttik-blue/20 hover:scale-105 transition-all"
                        >
                          <Megaphone size={16} />
                          Promocionar
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {promotions.length > 0 ? promotions.map((promo) => (
                        <div key={promo.id} className="bg-surface border border-outline-variant/30 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-2.5 rounded-xl ${promo.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-surface-container text-on-surface-variant'}`}>
                              <Target size={20} />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                                promo.status === 'active' ? 'bg-green-50 text-green-600' : 
                                promo.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-500'
                              }`}>
                                {promo.status}
                              </span>
                              {currentUserId === targetUserId && (
                                <button 
                                  onClick={() => handleDeletePromo(promo.id)}
                                  className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors"
                                  title="Eliminar Promoción"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <h4 className="font-bold text-vuttik-navy mb-1 text-sm">Promoción de {promo.targetType === 'product' ? 'Producto' : 'Publicación'}</h4>
                          <p className="text-xs text-on-surface-variant mb-4">Alcance: <span className="font-bold text-vuttik-navy uppercase">{promo.audience}</span></p>
                          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={14} className="text-vuttik-blue" />
                              <span className="text-sm font-black text-vuttik-navy">{promo.budget} USD</span>
                            </div>
                            <p className="text-[10px] text-on-surface-variant font-bold">{new Date(promo.createdAt?.toDate()).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-full py-10 flex flex-col items-center justify-center text-center bg-surface-container/50 rounded-2xl border border-dashed border-outline-variant/50">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-vuttik-blue mb-3 shadow-sm">
                            <Megaphone size={24} />
                          </div>
                          <h4 className="text-md font-bold text-vuttik-navy">Sin campañas activas</h4>
                          <p className="text-xs text-on-surface-variant max-w-xs mt-1">Empieza a promocionar para llegar a más clientes hoy mismo.</p>
                        </div>
                      )}
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

      {/* Floating Selection Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-[150]"
          >
            <span className="font-bold">{selectedProductIds.size} seleccionados</span>
            <div className="flex gap-2">
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-full text-sm font-bold transition-colors shadow-lg"
              >
                <Trash2 size={16} /> Eliminar
              </button>
              <button 
                onClick={() => { setIsSelectionMode(false); setSelectedProductIds(new Set()); }}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        userProfile={profileUser}
        onSaved={(updatedUser) => {
          setProfileUser(updatedUser);
          if (updatedUser.photoURL || updatedUser.photo_url) {
            window.dispatchEvent(new CustomEvent('user-photo-updated', { detail: updatedUser.photoURL || updatedUser.photo_url }));
          }
        }}
      />

      {/* Comments Modal */}
      <AnimatePresence>
        {selectedPostForComments && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPostForComments(null)}
              className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-black text-on-surface">Comentarios</h3>
                  <p className="text-xs text-on-surface-variant font-bold">Respuesta a {selectedPostForComments.author_name || selectedPostForComments.authorName}</p>
                </div>
                <button 
                  onClick={() => setSelectedPostForComments(null)}
                  className="p-3 bg-surface-container rounded-3xl text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                {loadingComments ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-4 border-vuttik-blue/20 border-t-vuttik-blue rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : postComments.length === 0 ? (
                  <div className="py-12 text-center text-on-surface-variant italic font-bold">
                    No hay comentarios aún. ¡Sé el primero en responder!
                  </div>
                ) : (
                  postComments.map((comment, i) => (
                    <div key={comment.id || i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-3xl bg-surface-container/50 text-on-surface shrink-0 overflow-hidden">
                        <UserAvatar src={comment.author_avatar || comment.authorAvatar} alt={comment.author_name || comment.authorName} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-on-surface">{comment.author_name || comment.authorName}</span>
                          <span className="text-[10px] text-on-surface-variant font-bold">{safeDate(comment.created_at || comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-on-surface leading-relaxed bg-surface-container/40 p-4 rounded-3xl rounded-tl-none">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-50 bg-white rounded-b-[40px]">
                <div className="flex items-end gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1">
                    <UserAvatar src={profileUser?.photoURL || ''} alt={profileUser?.displayName || ''} />
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      placeholder="Escribe un comentario..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-surface-container/30 border border-gray-100 rounded-3xl px-5 py-4 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none text-sm resize-none pr-14"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || !currentUserId}
                      className="absolute right-2 bottom-2 p-2 bg-vuttik-blue text-white rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====== VIEW MENU MODAL ====== */}
      {viewingMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingMenu(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {viewingMenu.menuImage ? (
              <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url(${viewingMenu.menuImage})` }}>
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                      <span className="text-3xl">🍽️</span> Menú de {viewingMenu.storeName}
                    </h2>
                    <p className="text-sm text-white/80 mt-1">{viewingMenu.items.length} productos · Subido el {viewingMenu.createdAt}</p>
                  </div>
                  <button onClick={() => setViewingMenu(null)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-vuttik-blue/5 to-purple-50">
                <div>
                  <h2 className="text-xl font-black text-vuttik-navy flex items-center gap-2">
                    <span className="text-2xl">🍽️</span>
                    Menú de {viewingMenu.storeName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{viewingMenu.items.length} productos · Subido el {viewingMenu.createdAt}</p>
                </div>
                <button onClick={() => setViewingMenu(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={24} className="text-vuttik-navy" />
                </button>
              </div>
            )}
            
            {/* Actions */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingMenu({ menuId: viewingMenu.menuId, items: viewingMenu.items.map(i => ({ ...i })), storeName: viewingMenu.storeName, menuImage: viewingMenu.menuImage, location: viewingMenu.location, lat: viewingMenu.lat, lng: viewingMenu.lng });
                  setViewingMenu(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-vuttik-blue text-white rounded-xl text-sm font-bold hover:bg-vuttik-blue/90 transition-all"
              >
                <Edit2 size={16} /> Editar Menú
              </button>
              <button
                onClick={() => {
                  handleDeleteMenu(viewingMenu.menuId, viewingMenu.items);
                  setViewingMenu(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
              >
                <Trash2 size={16} /> Eliminar Menú
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-5">
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {viewingMenu.items.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                      <span className="text-sm font-bold text-vuttik-navy truncate">{item.title}</span>
                    </div>
                    <span className="text-sm font-black text-vuttik-blue whitespace-nowrap pl-4">{item.currency || 'DOP'} {Number(item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ====== EDIT MENU MODAL ====== */}
      {editingMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-vuttik-blue/5 to-purple-50">
              <div>
                <h2 className="text-lg font-black text-vuttik-navy flex items-center gap-2">
                  <Edit2 size={18} className="text-vuttik-blue" />
                  Editar Menú
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Menú de {editingMenu.storeName}</p>
              </div>
              <button onClick={() => setEditingMenu(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={22} className="text-vuttik-navy" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Store name */}
              <div>
                <label className="block text-xs font-bold text-vuttik-navy mb-1.5 uppercase tracking-wide">Nombre del Negocio/Menú</label>
                <input
                  type="text"
                  value={editingMenu.storeName}
                  onChange={e => setEditingMenu(prev => prev ? { ...prev, storeName: e.target.value } : null)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue outline-none"
                  placeholder="Nombre del negocio"
                />
              </div>

              {/* Menu Image */}
              <div>
                <label className="block text-xs font-bold text-vuttik-navy mb-1.5 uppercase tracking-wide flex items-center gap-2">
                  <ImageIcon size={14} /> Imagen del Menú / Productos
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingMenu.menuImage || ''}
                    onChange={e => setEditingMenu(prev => prev ? { ...prev, menuImage: e.target.value } : null)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue outline-none"
                    placeholder="URL de la imagen (opcional)"
                  />
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-vuttik-blue/10 hover:bg-vuttik-blue/20 text-vuttik-blue rounded-xl cursor-pointer transition-colors text-sm font-bold">
                    <Upload size={16} /> Subir Foto
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await compressImage(file);
                        setEditingMenu(prev => prev ? { ...prev, menuImage: b64 } : null);
                      }
                    }} />
                  </label>
                </div>
                {editingMenu.menuImage && (
                  <div className="mt-3 w-full h-32 rounded-xl bg-cover bg-center border border-gray-200 shadow-inner" style={{ backgroundImage: `url(${editingMenu.menuImage})` }} />
                )}
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-xs font-bold text-vuttik-navy mb-1.5 uppercase tracking-wide flex items-center gap-2">
                  <MapPin size={14} /> Ubicación del Menú
                </label>
                <LocationInput
                  value={editingMenu.location || ''}
                  onChange={(loc) => setEditingMenu(prev => prev ? { ...prev, location: loc } : null)}
                  onCoordinatesChange={(lat, lng) => setEditingMenu(prev => prev ? { ...prev, lat, lng } : null)}
                />
              </div>

              {/* Category & Currency (applied to all) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-vuttik-navy mb-1.5 uppercase tracking-wide">Categoría (todos)</label>
                  <select
                    value={editingMenu.items[0]?.categoryId || ''}
                    onChange={e => setEditingMenu(prev => prev ? { ...prev, items: prev.items.map(i => ({ ...i, categoryId: e.target.value })) } : null)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-vuttik-blue outline-none"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-vuttik-navy mb-1.5 uppercase tracking-wide">Moneda (todos)</label>
                  <select
                    value={editingMenu.items[0]?.currency || 'DOP'}
                    onChange={e => setEditingMenu(prev => prev ? { ...prev, items: prev.items.map(i => ({ ...i, currency: e.target.value })) } : null)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-vuttik-blue outline-none"
                  >
                    {['DOP','USD','EUR','GBP','MXN','COP','ARS','CLP','PEN','BRL'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Items list */}
              <div>
                <label className="block text-xs font-bold text-vuttik-navy mb-2 uppercase tracking-wide">Productos del Menú ({editingMenu.items.length})</label>
                <div className="space-y-2">
                  {editingMenu.items.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-center bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-400 font-bold w-5 shrink-0">{idx + 1}</span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={e => setEditingMenu(prev => {
                          if (!prev) return null;
                          const items = [...prev.items];
                          items[idx] = { ...items[idx], title: e.target.value };
                          return { ...prev, items };
                        })}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue outline-none"
                        placeholder="Nombre del producto"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => setEditingMenu(prev => {
                          if (!prev) return null;
                          const items = [...prev.items];
                          items[idx] = { ...items[idx], price: e.target.value };
                          return { ...prev, items };
                        })}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-right font-bold focus:border-vuttik-blue focus:ring-1 focus:ring-vuttik-blue outline-none"
                        placeholder="Precio"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setEditingMenu(null)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMenuEdits}
                disabled={isSavingMenu}
                className="px-5 py-2.5 bg-vuttik-blue text-white rounded-xl text-sm font-bold hover:bg-vuttik-blue/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingMenu ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

