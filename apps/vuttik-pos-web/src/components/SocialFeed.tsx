import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, ShieldCheck, Search, UserPlus, UserCheck, Megaphone, Rss, Users, CheckCircle, AlertTriangle, X, ImageIcon, Repeat, Trash2, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Link } from 'react-router-dom';
import CameraModal from './CameraModal';
import { compressImage } from '../utils/imageCompressor';
import PromotionModal from './PromotionModal';
import UserAvatar from './UserAvatar';
import ProductCard from './ProductCard';
import { useNavigate } from 'react-router-dom';

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  is_verified: boolean;
  content: string;
  image_url?: string;
  likes: string[];
  verifications?: { user_id: string; is_veracious: boolean }[];
  comments: number;
  created_at: any;
  location: string;
}

interface UserProfile {
  uid: string;
  display_name: string;
  photo_url?: string;
  role: string;
}

type SocialTab = 'feed' | 'search';
type FeedFilter = 'all' | 'following';

export default function SocialFeed({ onNavigateToProfile }: { onNavigateToProfile: (uid: string) => void }) {
  const [activeTab, setActiveTab] = useState<SocialTab>('feed');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [feedContentType, setFeedContentType] = useState<'all' | 'posts' | 'products'>('all');

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const [newPostContent, setNewPostContent] = useState('');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoTargetId, setPromoTargetId] = useState<string | null>(null);

  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());

  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEscapeKey(() => setSelectedImage(null), !!selectedImage);

  const { user: currentUser, isBusinessModeActive } = useAuth();
  const dialog = useDialog();
  const navigate = useNavigate();

  // Load who the current user follows
  const loadFollowing = useCallback(async () => {
    if (!currentUser) return;
    try {
      const ids: string[] = await api.getFollowing(currentUser.uid);
      setFollowing(new Set(ids));
    } catch (err) {
      console.error('Error loading following:', err);
    }
  }, [currentUser]);

  // Load posts based on current filter
  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const p = await api.getPosts(
        feedFilter,
        feedFilter === 'following' ? currentUser?.uid : undefined,
        feedContentType
      );
      setPosts(p);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [feedFilter, currentUser, feedContentType]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  useEffect(() => {
    if (activeTab === 'feed') {
      loadPosts();
      const interval = setInterval(loadPosts, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, feedFilter, feedContentType, loadPosts]);

  // User search
  useEffect(() => {
    if (activeTab === 'search' && searchQuery.length > 1) {
      setSearching(true);
      const timer = setTimeout(async () => {
        try {
          const results = await api.searchUsers(searchQuery);
          setSearchResults(results);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setSearching(false);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  }, [searchQuery, activeTab]);

  const handlePublish = async () => {
    if (!newPostContent.trim()) return;
    if (!currentUser) {
      alert("Debes iniciar sesión para publicar.");
      return;
    }
    try {
      const authorId = isBusinessModeActive ? (currentUser.activeProfileMode !== 'personal' && currentUser.activeProfileMode !== 'business' ? currentUser.activeProfileMode : currentUser.uid) : currentUser.uid;
      
      await api.publishPost({
        authorId,
        authorName: isBusinessModeActive && currentUser.businessName ? currentUser.businessName : (currentUser.displayName || 'Usuario'),
        authorAvatar: isBusinessModeActive && currentUser.businessLogo ? currentUser.businessLogo : (currentUser.photoURL || ''),
        content: newPostContent,
        image: newPostImage,
        location: 'República Dominicana',
        isVerified: false,
        postedAs: isBusinessModeActive ? 'business' : 'personal'
      });
      setNewPostContent('');
      setNewPostImage(null);
      loadPosts();
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.6);
        setNewPostImage(compressed);
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const handleRepost = async (post: Post) => {
    if (!currentUser) {
      alert("Debes iniciar sesión para repostear.");
      return;
    }
    if (await dialog.confirm(`¿Quieres repostear la publicación de ${post.author_name}?`)) {
      try {
        const repostContent = `🔁 Reposteado de @${post.author_name}\n\n${post.content}`;
        const bId = isBusinessModeActive ? (currentUser.activeProfileMode !== 'personal' && currentUser.activeProfileMode !== 'business' ? currentUser.activeProfileMode : currentUser.uid) : currentUser.uid;
        await api.publishPost({
          authorId: bId,
          authorName: currentUser.displayName || 'Usuario',
          authorAvatar: currentUser.photoURL || '',
          content: repostContent,
          image: post.image_url,
          location: post.location || 'República Dominicana',
          isVerified: false,
          postedAs: isBusinessModeActive ? 'business' : 'personal'
        });
        loadPosts();
      } catch (err) {
        console.error('Error reposting:', err);
      }
    }
  };

  const handleFollow = async (targetId: string) => {
    if (!currentUser || followLoading.has(targetId)) return;
    setFollowLoading(prev => new Set(prev).add(targetId));
    try {
      if (following.has(targetId)) {
        await api.unfollowUser(currentUser.uid, targetId);
        setFollowing(prev => { const s = new Set(prev); s.delete(targetId); return s; });
      } else {
        await api.followUser(currentUser.uid, targetId);
        setFollowing(prev => new Set(prev).add(targetId));
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(prev => { const s = new Set(prev); s.delete(targetId); return s; });
    }
  };

  const handleVerify = async (postId: string, isVeracious: boolean) => {
    if (!currentUser) return;
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const verifications = p.verifications || [];
          const otherVerifications = verifications.filter(v => v.user_id !== currentUser.uid);
          return {
            ...p,
            verifications: [...otherVerifications, { user_id: currentUser.uid, is_veracious: isVeracious }]
          };
        }
        return p;
      }));
      await api.verifyPost(postId, { userId: currentUser.uid, isVeracious });
    } catch (err) {
      console.error('Verification error:', err);
      loadPosts(); // Revert on failure
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const isLiked = p.likes.includes(currentUser.uid);
          return {
            ...p,
            likes: isLiked ? p.likes.filter(id => id !== currentUser.uid) : [...p.likes, currentUser.uid]
          };
        }
        return p;
      }));
      await api.likePost(postId, currentUser.uid);
    } catch (err) {
      console.error('Error liking post:', err);
      loadPosts(); // Revert on failure
    }
  };

  const handleShare = async (post: Post) => {
    try {
      const url = `${window.location.origin}/social?post=${post.id}`;
      if (navigator.share) {
        await navigator.share({
          title: `Publicación de ${post.author_name} en Vuttik Market`,
          text: post.content,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.error('Error sharing post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta publicación?')) return;
    try {
      if (!currentUser) return;
      await api.deletePost(postId, currentUser.uid, currentUser.role === 'mega_guardian');
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Error al eliminar');
    }
  };

  const handleReportPost = async (post: Post) => {
    const reason = await dialog.prompt('¿Por qué reportas esta publicación?');
    if (!reason) return;
    try {
      await api.submitReport({
        reporterId: currentUser.uid,
        targetId: post.id,
        targetType: 'post',
        targetTitle: post.content.substring(0, 50),
        authorId: post.author_id,
        authorName: post.author_name,
        reason
      });
      dialog.alert('Reporte enviado correctamente. Nuestro equipo lo revisará pronto.');
    } catch (error) {
      console.error('Error submitting report:', error);
      dialog.alert('Error al enviar el reporte. Intenta de nuevo.');
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!currentUser || !editingContent.trim()) return;
    try {
      await api.updatePost(postId, currentUser.uid, editingContent);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editingContent } : p));
      setEditingPostId(null);
    } catch (err) {
      console.error('Error updating post:', err);
    }
  };

  const handleOpenComments = async (post: Post) => {
    setSelectedPostForComments(post);
    setLoadingComments(true);
    try {
      const comments = await api.getComments(post.id);
      setPostComments(comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPostForComments || !newComment.trim() || !currentUser) return;
    try {
      const bId = isBusinessModeActive ? (currentUser.activeProfileMode !== 'personal' && currentUser.activeProfileMode !== 'business' ? currentUser.activeProfileMode : currentUser.uid) : currentUser.uid;
      await api.addComment(selectedPostForComments.id, {
        authorId: bId,
        authorName: currentUser.displayName || 'Usuario',
        authorAvatar: currentUser.photoURL || '',
        content: newComment
      });
      setPosts(prev => prev.map(p => p.id === selectedPostForComments.id ? { ...p, comments: p.comments + 1 } : p));
      setNewComment('');
      handleOpenComments(selectedPostForComments);
      // Backend already has updated comments count, but we optimized it locally too
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString('es-DO');
  };

  return (
    <div className="feed-container space-y-6 pb-32 px-4 md:px-6 w-full">

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-surface-container rounded-3xl">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-3xl font-bold text-sm transition-all ${
            activeTab === 'feed'
              ? 'bg-white text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Rss size={16} />
          Publicaciones
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-3xl font-bold text-sm transition-all ${
            activeTab === 'search'
              ? 'bg-white text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Users size={16} />
          Buscar Perfiles
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ── FEED TAB ── */}
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setFeedFilter('all')}
                  className={`flex-1 py-3 px-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                    feedFilter === 'all'
                      ? 'bg-vuttik-blue text-white border-vuttik-blue shadow-lg shadow-vuttik-blue/20'
                      : 'bg-white text-on-surface border-gray-100 hover:border-vuttik-blue'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFeedFilter('following')}
                  className={`flex-1 py-3 px-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                    feedFilter === 'following'
                      ? 'bg-vuttik-navy text-white border-vuttik-navy shadow-lg shadow-vuttik-navy/20'
                      : 'bg-white text-on-surface border-gray-100 hover:border-vuttik-navy'
                  }`}
                >
                  Siguiendo
                </button>
              </div>

              {feedFilter === 'following' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setFeedContentType('all')}
                    className={`flex-1 py-2 px-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      feedContentType === 'all' ? 'bg-surface-container text-on-surface' : 'bg-transparent text-on-surface-variant hover:bg-surface-container/50'
                    }`}
                  >
                    Todo
                  </button>
                  <button
                    onClick={() => setFeedContentType('posts')}
                    className={`flex-1 py-2 px-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      feedContentType === 'posts' ? 'bg-surface-container text-on-surface' : 'bg-transparent text-on-surface-variant hover:bg-surface-container/50'
                    }`}
                  >
                    Publicaciones
                  </button>
                  <button
                    onClick={() => setFeedContentType('products')}
                    className={`flex-1 py-2 px-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      feedContentType === 'products' ? 'bg-surface-container text-on-surface' : 'bg-transparent text-on-surface-variant hover:bg-surface-container/50'
                    }`}
                  >
                    Productos
                  </button>
                </div>
              )}
            </div>

            {/* Create Post */}
            <div className="bg-surface-container rounded-[24px] md:rounded-[32px] p-3 md:p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-3xl md:rounded-3xl bg-surface-container/50 text-on-surface overflow-hidden shrink-0">
                  <UserAvatar src={currentUser?.photoURL} alt={currentUser?.displayName || 'Usuario'} />
                </div>
                <input
                  type="text"
                  placeholder="¿Qué está pasando?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePublish()}
                  className="flex-1 bg-transparent border-none outline-none text-on-surface font-medium placeholder:text-on-surface-variant/60 text-xs md:text-base min-w-0"
                />
                
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    id="post-image-upload" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageFile}
                  />
                  <label 
                    htmlFor="post-image-upload"
                    className="p-2 md:p-3 text-vuttik-blue hover:bg-vuttik-blue/10 rounded-3xl cursor-pointer transition-colors"
                  >
                    <ImageIcon size={20} className="md:size-6" />
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-on-surface-variant">{newPostContent.length}/280</span>
                    <button 
                      onClick={handlePublish}
                      disabled={!newPostContent.trim()}
                      className="bg-vuttik-blue text-white px-3 md:px-6 py-2 md:py-3 rounded-3xl md:rounded-3xl font-black text-[9px] md:text-xs uppercase tracking-widest shadow-lg shadow-vuttik-blue/20 hover:scale-105 transition-transform shrink-0 disabled:opacity-40 disabled:scale-100"
                    >
                      Publicar
                    </button>
                  </div>
                </div>
              </div>
              
              {newPostImage && (
                <div className="relative self-start ml-11 md:ml-16">
                  <img src={newPostImage} alt="Preview" className="h-24 md:h-32 object-cover rounded-3xl" />
                  <button 
                    onClick={() => setNewPostImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Posts */}
            {loadingPosts && posts.length === 0 ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <Rss size={40} className="mx-auto mb-4 opacity-30" />
                <p className="font-bold">
                  {feedFilter === 'following'
                    ? 'No hay publicaciones de las cuentas que sigues todavía.'
                    : 'No hay publicaciones aún. ¡Sé el primero!'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 md:gap-8">
                {posts.map((post: any, index) => {
                  if (post.feedType === 'product') {
                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="w-full relative"
                      >
                         <ProductCard 
                           id={post.id}
                           type={post.type_id || 'sell'}
                           category={post.category_id || ''}
                           title={post.title}
                           price={post.is_on_sale ? String(post.sale_price) : String(post.price)}
                           regularPrice={post.is_on_sale ? String(post.price) : undefined}
                           currency={post.currency || 'DOP'}
                           image={(() => { 
                             if (!post.images) return undefined;
                             if (Array.isArray(post.images)) return post.images[0];
                             if (typeof post.images === 'string') {
                               try { const p = JSON.parse(post.images); return Array.isArray(p) ? p[0] : p; } catch { return post.images; }
                             }
                             return undefined;
                           })()}
                           location={post.location}
                           registeredAt={post.created_at}
                           isOffer={post.is_on_sale}
                           trustLevel="High"
                           upvotes={post.likes?.length || 0}
                           downvotes={0}
                           authorName={post.author_name}
                           authorId={post.author_id}
                           authorAvatar={post.author_avatar}
                           authorRating={4.5}
                           onViewDetails={() => navigate(`/mercado/${post.id}`)}
                         />
                      </motion.div>
                    );
                  }

                  const isOwn = post.author_id === currentUser?.uid;
                  const isFollowing = following.has(post.author_id);
                  const isFollowLoading = followLoading.has(post.author_id);
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-lg shadow-[0_8px_32px_0_rgba(6,11,25,0.04)] overflow-hidden mb-6"
                    >
                      {/* Header */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => onNavigateToProfile(post.author_id)} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-surface-variant/30">
                              <UserAvatar src={post.author_avatar} alt={post.author_name} />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                <span className="font-label-md text-on-surface">{post.author_name}</span>
                                {post.is_verified && <ShieldCheck size={18} className="text-vuttik-blue" />}
                              </div>
                              <span className="text-label-sm text-on-surface-variant">{formatDate(post.created_at)} • {post.location}</span>
                            </div>
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!isOwn && (
                            <button
                              onClick={() => handleFollow(post.author_id)}
                              disabled={isFollowLoading}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                isFollowing
                                  ? 'border border-vuttik-blue/30 text-vuttik-blue bg-vuttik-blue/5 hover:bg-red-50 hover:text-red-500'
                                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                              } ${isFollowLoading ? 'opacity-50' : ''}`}
                            >
                              {isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>
                          )}
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
                              className="p-2 text-outline hover:text-on-surface transition-colors rounded-full"
                            >
                              <MoreHorizontal size={20} />
                            </button>
                            {activeMenu === post.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-surface-container-low py-2 z-50">
                                  {isOwn || currentUser?.role === 'mega_guardian' ? (
                                    <>
                                      {isOwn && <button onClick={() => { setEditingPostId(post.id); setEditingContent(post.content); setActiveMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container transition-colors">Editar publicación</button>}
                                      <button onClick={() => handleDeletePost(post.id)} className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error-container transition-colors">Eliminar publicación {currentUser?.role === 'mega_guardian' && !isOwn ? '(Admin)' : ''}</button>
                                    </>
                                  ) : (
                                    <button onClick={() => { setActiveMenu(null); handleReportPost(post); }} className="w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container transition-colors">Reportar</button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content Text */}
                      <div className="px-4 pb-4">
                        {editingPostId === post.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full bg-surface-container-low rounded-lg p-3 text-body-md text-on-surface outline-none resize-none focus:ring-2 focus:ring-vuttik-blue"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingPostId(null)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface">Cancelar</button>
                              <button onClick={() => handleEditPost(post.id)} disabled={!editingContent.trim() || editingContent === post.content} className="px-4 py-2 text-sm bg-vuttik-blue text-white rounded-full">Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-body-md text-on-surface">{post.content}</p>
                        )}
                      </div>

                      {/* Post Image */}
                      {post.image_url && (
                        <div className="relative w-full aspect-square md:aspect-video">
                          <button onClick={() => setSelectedImage(post.image_url!)} className="w-full h-full cursor-zoom-in">
                            <img src={post.image_url} alt="Post" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="p-4 flex items-center justify-between border-t border-surface-variant/30">
                        <div className="flex items-center gap-6">
                          <button onClick={() => handleLike(post.id)} className="flex items-center gap-2 text-on-surface-variant hover:text-alert transition-all group">
                            <Heart size={20} className={`group-active:scale-125 transition-transform ${post.likes?.includes(currentUser?.uid || '') ? 'fill-alert text-alert' : ''}`} />
                            <span className="font-label-sm">{post.likes?.length || 0}</span>
                          </button>
                          <button onClick={() => handleOpenComments(post)} className="flex items-center gap-2 text-on-surface-variant hover:text-vuttik-blue transition-all">
                            <MessageCircle size={20} />
                            <span className="font-label-sm">{post.comments}</span>
                          </button>
                          <button onClick={() => handleRepost(post)} className="flex items-center gap-2 text-on-surface-variant hover:text-success transition-all">
                            <Repeat size={20} />
                          </button>
                        </div>
                        <button onClick={() => handleShare(post)} className="text-on-surface-variant hover:text-vuttik-blue transition-colors">
                          <Share2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SEARCH TAB ── */}
        {activeTab === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o @usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-surface-container border-none rounded-3xl px-12 py-4 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none text-sm"
              />
              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-vuttik-blue border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search results */}
            {searchQuery.length > 1 && (
              <div className="flex flex-col gap-3">
                {searchResults.length === 0 && !searching && (
                  <div className="text-center py-12 text-on-surface-variant">
                    <Users size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">No se encontraron perfiles para "{searchQuery}"</p>
                  </div>
                )}
                {searchResults.map((user) => {
                  const isFollowing = following.has(user.uid);
                  const isFollowLoading = followLoading.has(user.uid);
                  const isOwn = user.uid === currentUser?.uid;
                  return (
                    <motion.div
                      key={user.uid}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-gray-100 rounded-[24px] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <button onClick={() => onNavigateToProfile(user.uid)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                        <div className="w-12 h-12 rounded-3xl bg-surface-container/50 text-on-surface overflow-hidden shrink-0">
                          <UserAvatar src={user.photo_url} alt={user.display_name} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-on-surface truncate">{user.display_name}</p>
                          <div className="flex items-center gap-2">
                            {user.username && <span className="text-xs text-vuttik-blue font-bold">@{user.username}</span>}
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{user.role}</span>
                          </div>
                        </div>
                      </button>
                      {!isOwn && (
                        <button
                          onClick={() => handleFollow(user.uid)}
                          disabled={isFollowLoading}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-3xl text-xs font-black uppercase tracking-widest transition-all border shrink-0 ${
                            isFollowing
                              ? 'border-vuttik-blue/30 text-vuttik-blue bg-vuttik-blue/5'
                              : 'border-vuttik-navy bg-vuttik-navy text-white hover:bg-vuttik-blue hover:border-vuttik-blue'
                          } ${isFollowLoading ? 'opacity-50' : ''}`}
                        >
                          {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                          {isFollowing ? 'Siguiendo' : 'Seguir'}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {searchQuery.length <= 1 && (
              <div className="text-center py-16 text-on-surface-variant">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">Escribe al menos 2 caracteres para buscar perfiles</p>
                <p className="text-xs mt-2">Puedes buscar usuarios, negocios y empresas</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {promoTargetId && (
        <PromotionModal
          isOpen={showPromoModal}
          onClose={() => { setShowPromoModal(false); setPromoTargetId(null); }}
          initialTargetId={promoTargetId}
          initialTargetType="post"
        />
      )}

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
                  <p className="text-xs text-on-surface-variant font-bold">Respuesta a {selectedPostForComments.author_name}</p>
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
                        <UserAvatar src={comment.author_avatar} alt={comment.author_name} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-on-surface">{comment.author_name}</span>
                          <span className="text-[10px] text-on-surface-variant font-bold">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-on-surface leading-relaxed bg-surface-container/40 p-4 rounded-3xl rounded-tl-none">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 border-t border-gray-50 bg-surface-container/20 rounded-b-[40px]">
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Escribe un comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 bg-white border-none rounded-3xl px-6 py-4 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="bg-vuttik-blue text-white px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg shadow-vuttik-blue/20 disabled:opacity-40"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              alt="Fullscreen" 
              className="max-w-full max-h-[90vh] object-contain shadow-2xl cursor-default" 
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
