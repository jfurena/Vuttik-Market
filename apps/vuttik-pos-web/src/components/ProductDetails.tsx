import { motion } from 'motion/react';
import { X, MapPin, Calendar, ShieldCheck, Star, Share2, Edit2, Trash2, Clock, Info, Building2, TrendingUp, Users, Eye, Tag, Phone, Bookmark, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCardProps } from './ProductCard';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import PortfolioSelectionModal from './PortfolioSelectionModal';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ProductDetailsProps {
  product: any;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
  currentUserRole?: string;
}

export default function ProductDetails({ product, onClose, onEdit, onDelete, currentUserId, currentUserRole }: ProductDetailsProps) {
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; label: string }[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [computedAuthorRating, setComputedAuthorRating] = useState<number | null>(null);
  const [authorProfileData, setAuthorProfileData] = useState<any>(null);
  const navigate = useNavigate();

  useEscapeKey(onClose);

  useEffect(() => {
    const fetchAuthorRating = async () => {
      if (!product?.authorId) return;
      try {
        const [authorProds, authorProfile] = await Promise.all([
          api.getProducts(undefined, product.authorId).catch(() => []),
          api.getUser(product.authorId, true).catch(() => null)
        ]);
        if (authorProfile) {
          setAuthorProfileData(authorProfile);
        }
        if (Array.isArray(authorProds)) {
          let totalScore = 0;
          let count = 0;
          authorProds.forEach((p: any) => {
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
          setComputedAuthorRating(count > 0 ? totalScore / count : (authorProfile?.rating || 0));
        }
      } catch (error) {
        console.error('Error fetching author rating:', error);
      }
    };
    fetchAuthorRating();
  }, [product?.authorId]);

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

  const [fullProduct, setFullProduct] = useState(product);

  useEffect(() => {
    const fetchFullProduct = async () => {
      if (product?.id) {
        try {
          const res = await api.getProduct(product.id);
          if (res) setFullProduct(res);
        } catch (e) {
          console.error('Error fetching full product:', e);
        }
      }
    };
    fetchFullProduct();
  }, [product?.id]);

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      alert('Debes iniciar sesión para guardar productos');
      return;
    }
    setIsPortfolioModalOpen(true);
  };

  const getCleanLocation = () => {
    let loc = product.location || '';
    if (product.business && loc.toLowerCase().includes(product.business.toLowerCase())) {
      const escapedBusiness = (product.business || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedBusiness}[,\\s]*`, 'i');
      loc = loc.replace(regex, '');
    }
    if (product.authorCountry && loc.toLowerCase().includes(product.authorCountry.toLowerCase())) {
      const regex = new RegExp(`[,\\s]*${product.authorCountry}$`, 'i');
      loc = loc.replace(regex, '');
    }
    return loc || 'No especificada';
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/producto/${product.id}`;
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: `Mira este producto en Vuttik Market: ${product.title}`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product.id]);

  useEffect(() => {
    setTransactionTypes([
      { id: 'sell', label: 'Venta' },
      { id: 'buy', label: 'Compra' },
      { id: 'rent', label: 'Alquiler' }
    ]);
  }, []);

  const isAuthor = currentUserId === product.authorId;
  const isMegaGuardian = currentUserRole === 'mega_guardian';
  const currentImage = (fullProduct.images && fullProduct.images.length > 0 ? fullProduct.images[selectedImageIndex] : null) || fullProduct.image || fullProduct.images?.[0] || null;
  const isBusinessProduct = product.postedAs === 'business' || product.business || authorProfileData?.role === 'business';
  const displayAvatar = isBusinessProduct && authorProfileData?.logo 
    ? authorProfileData.logo 
    : (product.authorAvatar || authorProfileData?.photoURL || '/user_unknown.jpeg');

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto overflow-x-hidden">
      <header className="sticky top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 bg-white/90 backdrop-blur-md border-b border-gray-100/50">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
            <Share2 size={18} />
          </button>
          <button onClick={handleFollowToggle} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700">
            <Bookmark size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-32">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Left Column: Image Gallery & Description */}
          <div className="flex-1 space-y-8">
            {/* Image Gallery */}
            <div className="w-full aspect-square md:aspect-[4/3] relative rounded-[32px] overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
              {(currentImage && currentImage !== '/producto.jpeg') ? (
                <img alt={product.title} className="w-full h-full object-contain" src={currentImage} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Package size={80} className="text-vuttik-blue opacity-50" />
              )}
              
              <div className="absolute top-4 left-4 flex gap-2">
                {product.isOnSale && (
                  <span className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                    Oferta Especial
                  </span>
                )}
                <span className={`text-white px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                  product.typeId === 'sell' ? 'bg-green-500' : 
                  product.typeId === 'buy' ? 'bg-vuttik-blue' : 'bg-vuttik-navy'
                }`}>
                  {transactionTypes.find(t => t.id === product.typeId)?.label || product.typeId}
                </span>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {fullProduct.images && fullProduct.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {(fullProduct.images || [fullProduct.image || '']).map((img: string, idx: number) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedImageIndex(idx)} 
                    className={`w-20 h-20 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? 'border-vuttik-blue opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img alt="thumbnail" className="w-full h-full object-cover" src={img} />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-xl font-display font-black text-gray-900 mb-4">Descripción</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description || 'Sin descripción detallada.'}
              </p>
            </div>

            {/* Custom Fields */}
            {product.customFields && Object.keys(product.customFields).length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                {Object.entries(product.customFields).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 p-4 bg-gray-50 rounded-[20px]">
                    <Tag className="text-vuttik-blue shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{key}</p>
                      <p className="text-sm font-bold text-gray-800">{String(value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Info & Actions */}
          <div className="w-full lg:w-[400px]">
            <div className="sticky top-24 space-y-6">
              
              {/* Core Info */}
              <div>
                <span className="text-xs font-black text-vuttik-blue uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full mb-3 inline-block">
                  {product.category}
                </span>
                <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 mb-4 leading-tight">
                  {product.title}
                </h1>
                
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-4xl font-black text-vuttik-blue leading-none">
                    {product.isOnSale ? product.salePrice : product.price}
                  </span>
                  <span className="text-xl font-bold text-gray-400 mb-1">{product.currency}</span>
                  {product.isOnSale && (
                    <span className="text-lg font-bold text-gray-300 line-through mb-1 ml-2">{product.price}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider">
                    Disponible
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">
                    {product.transactionType || 'Premium'}
                  </span>
                </div>
              </div>

              {/* Seller Card */}
              <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Información del Vendedor</h3>
                
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => {
                  onClose();
                  navigate(`/perfil/${product.authorId}${isBusinessProduct ? '?mode=business' : ''}`);
                }}>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                      <img alt="Seller" src={displayAvatar} className="w-full h-full object-cover" />
                    </div>
                    {product.trustLevel === 'High' && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white">
                        <ShieldCheck size={12} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{product.authorName || 'Usuario'}</h4>
                    <p className="text-sm text-gray-500">Vendedor Verificado</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-1">
                      <Star size={20} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xl font-black text-gray-900 leading-none mt-0.5">
                        {computedAuthorRating && computedAuthorRating > 0 ? computedAuthorRating.toFixed(1) : (computedAuthorRating === 0 ? 'N/A' : '...')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Calificación Vendedor
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-gray-900">
                      {computedAuthorRating && computedAuthorRating > 0 ? Math.round((computedAuthorRating / 5) * 100) + '%' : (computedAuthorRating === 0 ? 'N/A' : '...')}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confianza</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600">{getCleanLocation()}, {product.province}</p>
                  </div>
                  {product.business && (
                    <div className="flex items-start gap-3">
                      <Building2 size={18} className="text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600">{product.business}</p>
                    </div>
                  )}
                </div>

                {/* Main CTA */}
                {!isAuthor && !isMegaGuardian ? (
                  <button 
                    onClick={() => {
                      if (product.phone) {
                        window.open(`https://wa.me/${product.phone.replace(/\D/g, '')}`, '_blank');
                      } else {
                        onClose();
                        navigate('/mensajes', { state: { targetUser: { uid: product.authorId, name: product.authorName, photo: product.authorAvatar } } });
                      }
                    }}
                    className="w-full py-4 bg-vuttik-blue text-white rounded-2xl font-bold shadow-md hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Phone size={18} />
                    Contactar Ahora
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    {isAuthor && (
                      <button 
                        onClick={() => onEdit?.(product.id)}
                        className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Edit2 size={18} /> Editar
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (window.confirm('¿Estás seguro que deseas eliminar esta publicación?')) onDelete?.(product.id);
                      }}
                      className="w-full py-3 text-red-500 hover:bg-red-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} /> Eliminar {isMegaGuardian && !isAuthor ? '(Admin)' : ''}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating CTA for Mobile ONLY */}
      {!isAuthor && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full z-40 p-4 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => {
              if (product.phone) {
                window.open(`https://wa.me/${product.phone.replace(/\D/g, '')}`, '_blank');
              } else {
                onClose();
                navigate('/mensajes', { state: { targetUser: { uid: product.authorId, name: product.authorName, photo: product.authorAvatar } } });
              }
            }}
            className="w-full py-4 bg-vuttik-blue text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Phone size={18} /> Contactar Ahora
          </button>
        </div>
      )}

      <PortfolioSelectionModal 
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        userId={currentUserId || ''}
        product={product}
      />
    </div>
  );
}
