import { motion } from 'motion/react';
import { X, MapPin, Calendar, ShieldCheck, Star, Share2, Edit2, Trash2, Clock, Info, Building2, TrendingUp, Users, Eye, Tag, Phone, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCardProps } from './ProductCard';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ProductDetailsProps {
  product: any;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

export default function ProductDetails({ product, onClose, onEdit, onDelete, currentUserId }: ProductDetailsProps) {
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; label: string }[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (currentUserId && product?.id) {
        try {
          const followedProducts = await api.getFollowingProducts(currentUserId);
          setIsFollowing(followedProducts.includes(product.id));
        } catch (e) {
          console.error('Error fetching follow status:', e);
        }
      }
    };
    fetchFollowStatus();
  }, [currentUserId, product?.id]);

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      alert('Debes iniciar sesión para guardar productos');
      return;
    }
    setIsSubmittingFollow(true);
    try {
      if (isFollowing) {
        await api.unfollowProduct(product.id, currentUserId);
        setIsFollowing(false);
      } else {
        await api.followProduct(product.id, currentUserId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsSubmittingFollow(false);
    }
  };

  const getCleanLocation = () => {
    let loc = product.location || '';
    
    // Remove Business name from the beginning if it exists
    if (product.business && loc.toLowerCase().includes(product.business.toLowerCase())) {
      // Escape special regex characters to prevent regex errors
      const escapedBusiness = (product.business || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedBusiness}[,\\s]*`, 'i');
      loc = loc.replace(regex, '');
    }
    
    // Remove Country name from the end if it exists
    if (product.authorCountry && loc.toLowerCase().includes(product.authorCountry.toLowerCase())) {
      // Create a regex to replace the country name (case insensitive) and any preceding commas/spaces
      const regex = new RegExp(`[,\\s]*${product.authorCountry}$`, 'i');
      loc = loc.replace(regex, '');
    }
    
    return loc || 'No especificada';
  };

  useEffect(() => {
    // Track product view
    setSelectedImageIndex(0);
  }, [product.id]);

  useEffect(() => {
    // transactionTypes used to be loaded from firebase, now using static fallback for rendering
    setTransactionTypes([
      { id: 'sell', label: 'Venta' },
      { id: 'buy', label: 'Compra' },
      { id: 'rent', label: 'Alquiler' }
    ]);
  }, []);

  const isAuthor = currentUserId === product.authorId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[95vh] md:max-h-[90vh]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 bg-white/80 backdrop-blur-md rounded-full text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all shadow-lg"
        >
          <X size={20} className="md:size-6" />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-[50%] bg-gray-50 relative flex flex-col min-h-[35vh] md:min-h-0 shrink-0 border-b md:border-b-0 md:border-r border-gray-100">
          <div className="flex-1 relative w-full h-full min-h-[300px] md:min-h-0 flex items-center justify-center p-4">
            <img 
              src={(product.images && product.images.length > 0 ? product.images[selectedImageIndex] : null) || product.image || product.images?.[0] || 'https://picsum.photos/seed/detail/1200/1200'} 
              className="absolute inset-0 w-full h-full object-contain drop-shadow-sm p-2 md:p-6" 
              referrerPolicy="no-referrer" 
            />
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="h-20 md:h-24 bg-white/80 backdrop-blur-sm p-3 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-100">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-full aspect-square rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-gray-50 ${
                    selectedImageIndex === idx ? 'border-vuttik-blue opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-300'
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {product.isOnSale && (
            <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-red-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl z-10">
              Oferta Especial
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="w-full md:w-[50%] p-5 md:p-8 overflow-y-auto no-scrollbar flex flex-col bg-white">
          {/* Title and Tags */}
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-vuttik-blue/10 text-vuttik-blue text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {product.category}
              </span>
              <span className={`text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                product.typeId === 'sell' ? 'bg-green-500' : 
                product.typeId === 'buy' ? 'bg-vuttik-blue' : 'bg-vuttik-navy'
              }`}>
                {transactionTypes.find(t => t.id === product.typeId)?.label || product.typeId}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black text-vuttik-navy leading-tight mb-2">{product.title}</h2>
            
            {/* Price Box */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="bg-vuttik-gray/50 px-4 py-2 md:px-5 md:py-3 rounded-2xl border border-gray-100 flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-display font-black text-vuttik-navy">{product.isOnSale ? product.salePrice : product.price}</span>
                <span className="text-xs font-bold text-vuttik-text-muted">{product.currency}</span>
              </div>
              {product.isOnSale && (
                <div className="bg-red-50 px-4 py-2 md:px-5 md:py-3 rounded-2xl border border-red-100 flex items-baseline gap-2">
                  <span className="text-lg md:text-xl font-display font-black text-red-400 line-through">{product.price}</span>
                  <span className="text-xs font-bold text-red-300">{product.currency}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-4">
                <p className="text-sm text-vuttik-navy leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quick Details right under description */}
            <div className="flex flex-col gap-2 mb-4 bg-vuttik-gray/30 px-4 py-3 rounded-2xl border border-gray-50">
              <div className="flex items-start gap-2 text-vuttik-text-muted">
                <Building2 size={14} className="text-vuttik-blue shrink-0 mt-0.5" />
                <span className="text-[9px] font-black uppercase tracking-widest w-16 shrink-0 mt-0.5">Local:</span>
                <span className="text-xs font-bold leading-tight flex-1 break-words">{product.business || 'No especificado'}</span>
              </div>

              <div className="flex items-start gap-2 text-vuttik-text-muted">
                <MapPin size={14} className="text-vuttik-blue shrink-0 mt-0.5" />
                <span className="text-[9px] font-black uppercase tracking-widest w-16 shrink-0 mt-0.5">Ubic.:</span>
                <span className="text-xs font-bold leading-tight flex-1 break-words">{getCleanLocation()}</span>
                {product.location && (
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(product.location)}`, '_blank')}
                    className="shrink-0 p-1 text-vuttik-blue hover:bg-vuttik-blue/10 rounded transition-all -mt-1"
                  >
                    <span className="text-[8px] font-black uppercase">Mapa</span>
                  </button>
                )}
              </div>

              <div className="flex items-start gap-2 text-vuttik-text-muted">
                <MapPin size={14} className="text-vuttik-blue shrink-0 opacity-70 mt-0.5" />
                <span className="text-[9px] font-black uppercase tracking-widest w-16 shrink-0 mt-0.5">Provincia:</span>
                <span className="text-xs font-bold leading-tight flex-1 break-words">{product.province || 'No especificada'}</span>
              </div>

              <div className="flex items-start gap-2 text-vuttik-text-muted">
                <MapPin size={14} className="text-vuttik-blue shrink-0 opacity-50 mt-0.5" />
                <span className="text-[9px] font-black uppercase tracking-widest w-16 shrink-0 mt-0.5">País:</span>
                <span className="text-xs font-bold leading-tight flex-1 break-words">{product.authorCountry || 'No especificado'}</span>
              </div>
              
              <div className="flex items-start gap-2 text-vuttik-text-muted">
                <Phone size={14} className="text-vuttik-blue shrink-0 mt-0.5" />
                <span className="text-[9px] font-black uppercase tracking-widest w-16 shrink-0 mt-0.5">Tel.:</span>
                {product.phone ? (
                  <a href={`tel:${product.phone}`} className="text-xs font-bold leading-tight hover:text-vuttik-blue transition-colors flex-1 break-words">
                    {product.phone}
                  </a>
                ) : (
                  <span className="text-xs font-bold leading-tight flex-1">No especificado</span>
                )}
              </div>
              
              <div className="flex items-start gap-2 text-vuttik-text-muted">
                <Info size={14} className="text-vuttik-blue shrink-0 mt-0.5" />
                <span className="text-[9px] font-black uppercase tracking-widest w-16 shrink-0 mt-0.5">EAN:</span>
                <span className="text-xs font-bold leading-tight flex-1 break-words">{product.barcode || 'No especificado'}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button (Contactar) */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => {
                if (product.phone) {
                  window.open(`https://wa.me/${product.phone.replace(/\D/g, '')}`, '_blank');
                } else {
                  onClose();
                  navigate('/mensajes', { state: { targetUser: { uid: product.authorId, name: product.authorName, photo: product.authorAvatar } } });
                }
              }}
              className="flex-1 bg-vuttik-blue text-white py-3 px-4 text-base font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-vuttik-blue/20 hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {product.typeId === 'buy' ? 'Tomar Pedido' : 'Contactar Ahora'}
            </button>
            <button 
              onClick={handleFollowToggle}
              disabled={isSubmittingFollow}
              className={`p-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center ${isFollowing ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/20' : 'bg-vuttik-gray text-vuttik-navy hover:bg-vuttik-blue hover:text-white'}`}
            >
              <Bookmark size={20} fill={isFollowing ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Author Details */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between mt-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-vuttik-navy text-white flex items-center justify-center text-lg font-black overflow-hidden shrink-0">
                <img src={product.authorAvatar || '/user unkwon.jpeg'} alt={product.authorName || 'Usuario'} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-lg font-black text-vuttik-navy">{product.authorName || 'Usuario'}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-yellow-400">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-bold ml-1">4.5</span>
                  </div>
                  <span className="text-xs text-vuttik-text-muted font-bold">• Alta Confianza</span>
                </div>
              </div>
            </div>
            <ShieldCheck className="text-vuttik-blue" size={24} />
          </div>

          {/* Custom Fields */}
          {product.customFields && Object.keys(product.customFields).length > 0 && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.customFields).map(([key, value]) => (
                <div key={key} className="bg-vuttik-gray/50 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-vuttik-text-muted mb-1">
                    <Tag size={16} className="text-vuttik-blue" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{key}</span>
                  </div>
                  <p className="text-sm font-bold text-vuttik-navy">{String(value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Author / Edit Actions at the bottom */}
          <div className="mt-auto">
            {isAuthor && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => onEdit?.(product.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-vuttik-navy text-vuttik-navy rounded-3xl font-black text-sm hover:bg-vuttik-navy hover:text-white transition-all"
                >
                  <Edit2 size={18} />
                  Editar
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Estás seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.')) {
                      onDelete?.(product.id);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-50 text-red-500 rounded-3xl font-black text-sm hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={18} />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
