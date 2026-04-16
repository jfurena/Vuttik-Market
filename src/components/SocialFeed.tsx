import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, ShieldCheck, Search, User as UserIcon, Megaphone } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';
import PromotionModal from './PromotionModal';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isVerified: boolean;
  content: string;
  image?: string;
  likes: string[];
  comments: number;
  createdAt: any;
  location: string;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: string;
}

export default function SocialFeed({ onNavigateToProfile }: { onNavigateToProfile: (uid: string) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoTargetId, setPromoTargetId] = useState<string | null>(null);

  const loadPosts = async () => {
    try {
      const p = await api.getPosts();
      setPosts(p);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  useEffect(() => {
    loadPosts();
    // Poll every 30 seconds as snapshot replacement
    const interval = setInterval(loadPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const searchUsers = async () => {
        try {
          // This would ideally be a dedicated search endpoint, but for now we filter
          // In a real migration, we'd add GET /api/users/search
          // For now, let's assume we can fetch basic profile info
          // Fetching specific user if it looks like an ID/unique name
          const u = await api.getUser(searchQuery).catch(() => null);
          setUsers(u ? [u] : []);
        } catch (err) {
          console.error('Search error:', err);
        }
      };
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const filteredPosts = posts.filter(p => 
    p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePublish = async () => {
    if (!newPostContent.trim() || !auth.currentUser) return;

    try {
      await api.publishPost({
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Usuario',
        authorAvatar: auth.currentUser.photoURL || '',
        content: newPostContent,
        location: 'Dominican Republic', // Default for now
        image: 'https://picsum.photos/seed/' + Math.random() + '/800/600', // Mock image
        isVerified: false
      });
      setNewPostContent('');
      loadPosts(); // Refresh feed
    } catch (error) {
      console.error('Error publishing post:', error);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-4xl font-display font-black text-vuttik-navy">Social</h2>
        <p className="text-base md:text-lg text-vuttik-text-muted">Conéctate con la comunidad y comparte hallazgos.</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={18} />
        <input 
          type="text" 
          placeholder="Buscar usuarios o publicaciones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearching(true)}
          className="w-full bg-vuttik-gray border-none rounded-2xl px-12 py-4 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none text-sm"
        />
      </div>

      {/* User Search Results */}
      {users.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-[32px] p-4 shadow-xl">
          <h3 className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest mb-3 px-2">Usuarios encontrados</h3>
          <div className="flex flex-col gap-2">
            {users.map(user => (
              <button 
                key={user.uid}
                onClick={() => onNavigateToProfile(user.uid)}
                className="flex items-center gap-3 p-2 hover:bg-vuttik-gray rounded-2xl transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-vuttik-navy text-white flex items-center justify-center font-bold">
                  {user.displayName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-vuttik-navy">{user.displayName}</p>
                  <p className="text-[10px] text-vuttik-text-muted font-bold uppercase">{user.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Post Placeholder */}
      <div className="bg-vuttik-gray rounded-[24px] md:rounded-[32px] p-3 md:p-6 flex items-center gap-2 md:gap-4">
        <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-vuttik-navy text-white flex items-center justify-center font-bold shadow-lg shrink-0 text-xs md:text-base">U</div>
        <input 
          type="text" 
          placeholder="¿Qué está pasando?"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-vuttik-navy font-medium placeholder:text-vuttik-text-muted/60 text-xs md:text-base min-w-0"
        />
        <button 
          onClick={handlePublish}
          className="bg-vuttik-blue text-white px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest shadow-lg shadow-vuttik-blue/20 hover:scale-105 transition-transform shrink-0 min-w-[70px] md:min-w-[120px]"
        >
          Publicar
        </button>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-6 md:gap-8">
        {filteredPosts.map((post, index) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-gray-100 rounded-[32px] md:rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
          >
            {/* Header */}
            <div className="p-5 md:p-8 flex items-center justify-between">
              <button 
                onClick={() => onNavigateToProfile(post.authorId)}
                className="flex items-center gap-3 md:gap-4 text-left"
              >
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-[20px] bg-vuttik-navy text-white flex items-center justify-center font-bold text-base md:text-xl shadow-lg shrink-0">
                  {post.authorAvatar || post.authorName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <h4 className="text-sm md:text-lg font-display font-black text-vuttik-navy truncate">{post.authorName}</h4>
                    {post.isVerified && <ShieldCheck size={14} className="text-vuttik-blue md:size-[18px]" />}
                  </div>
                  <p className="text-[10px] md:text-xs text-vuttik-text-muted font-bold truncate">
                    {post.location}
                  </p>
                </div>
              </button>
              <button className="p-2 text-vuttik-text-muted hover:bg-vuttik-gray rounded-xl transition-colors">
                <MoreHorizontal size={20} className="md:size-6" />
              </button>
              <button 
                onClick={() => {
                  setPromoTargetId(post.id);
                  setShowPromoModal(true);
                }}
                className="p-2 text-vuttik-blue hover:bg-vuttik-blue/10 rounded-xl transition-colors ml-2"
                title="Promocionar publicación"
              >
                <Megaphone size={20} className="md:size-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 md:px-8 pb-4">
              <p className="text-vuttik-navy text-sm md:text-lg leading-relaxed">
                {post.content}
              </p>
            </div>

            {/* Image */}
            {post.image && (
              <div className="px-5 md:px-8 pb-6">
                <div className="aspect-[16/9] rounded-[24px] md:rounded-[32px] overflow-hidden bg-gray-100">
                  <img src={post.image} alt="Post content" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 md:px-8 pb-5 md:pb-8 flex items-center justify-between border-t border-gray-50 pt-4 md:pt-6">
              <div className="flex items-center gap-4 md:gap-6">
                <button className="flex items-center gap-1.5 md:gap-2 text-vuttik-text-muted hover:text-red-500 transition-all group">
                  <div className="p-1.5 md:p-2 rounded-xl group-hover:bg-red-50 transition-colors">
                    <Heart size={20} className={`md:size-6 ${post.likes?.length > 0 ? "fill-red-500 text-red-500" : ""}`} />
                  </div>
                  <span className="text-xs md:text-sm font-black">{post.likes?.length || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 md:gap-2 text-vuttik-text-muted hover:text-vuttik-blue transition-all group">
                  <div className="p-1.5 md:p-2 rounded-xl group-hover:bg-vuttik-blue/5 transition-colors">
                    <MessageCircle size={20} className="md:size-6" />
                  </div>
                  <span className="text-xs md:text-sm font-black">{post.comments}</span>
                </button>
              </div>
              <button className="p-1.5 md:p-2 text-vuttik-text-muted hover:text-vuttik-navy hover:bg-vuttik-gray rounded-xl transition-all">
                <Share2 size={20} className="md:size-6" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {promoTargetId && (
        <PromotionModal 
          isOpen={showPromoModal}
          onClose={() => {
            setShowPromoModal(false);
            setPromoTargetId(null);
          }}
          initialTargetId={promoTargetId}
          initialTargetType="post"
        />
      )}
    </div>
  );
}
