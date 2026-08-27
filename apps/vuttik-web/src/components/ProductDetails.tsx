import { motion } from 'motion/react';
import { X, MapPin, Calendar, ShieldCheck, Star, Share2, Edit2, Trash2, Clock, Info, Building2, TrendingUp, Users, User, Eye, Tag, Phone, Bookmark, Package, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCardProps } from './ProductCard';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import PortfolioSelectionModal from './PortfolioSelectionModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import OfferMap from './OfferMap';
import UserAvatar from './UserAvatar';

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
  const [showOfferMap, setShowOfferMap] = useState(false);
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
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
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
  const isBusinessProduct = product.postedAs === 'business' || authorProfileData?.role === 'business';
  const displayAvatar = isBusinessProduct && authorProfileData?.logo 
    ? authorProfileData.logo 
    : (product.authorAvatar || authorProfileData?.photoURL || '/user_unknown.jpeg');

  let parsedCustomFields = product.customFields || {};
  if (typeof parsedCustomFields === 'string') {
    try { parsedCustomFields = JSON.parse(parsedCustomFields); } catch (e) {}
    if (typeof parsedCustomFields === 'string') {
      try { parsedCustomFields = JSON.parse(parsedCustomFields); } catch (e) {}
    }
  }
  const displayCustomFields = Object.entries(parsedCustomFields).filter(([key]) => !['menuId', 'isMenuGroup', 'subCategory', 'storeName'].includes(key));

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto overflow-x-hidden">
      <header className="sticky top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 bg-white border-b border-gray-200">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <X size={24} /> <span className="font-semibold text-sm hidden md:inline">Cerrar</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 pb-24 lg:pb-0">
          
          {/* Left Column: Image Gallery */}
          <div className="w-full lg:w-[45%] shrink-0 flex flex-col gap-4">
            <div className="w-full aspect-square relative rounded-xl border border-gray-200 overflow-hidden bg-white flex items-center justify-center">
              {(currentImage && currentImage !== '/producto.jpeg') ? (
                <img alt={product.title} className="w-full h-full object-contain" src={currentImage} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Package size={80} className="text-gray-300" />
              )}
            </div>

            {/* Thumbnail Gallery */}
            {fullProduct.images && fullProduct.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 shrink-0">
                {(fullProduct.images || [fullProduct.image || '']).map((img: string, idx: number) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedImageIndex(idx)} 
                    className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? 'border-gray-900 shadow-sm' : 'border-gray-200 opacity-70 hover:opacity-100 bg-white'}`}
                  >
                    <img alt="thumbnail" className="w-full h-full object-cover" src={img} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Middle Column: Details */}
          <div className="w-full lg:w-[35%] flex flex-col gap-6">
            <div>
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-medium hover:underline cursor-pointer">{product.category}</span>
                    <span>›</span>
                    <span className="font-medium">{transactionTypes.find(t => t.id === product.typeId)?.label || product.typeId}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    {product.lat && product.lng && (
                      <button onClick={() => setShowOfferMap(true)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Ver en el Offermap">
                        <Map size={20} />
                      </button>
                    )}
                    <button onClick={handleShare} className="text-gray-400 hover:text-gray-600 transition-colors p-1" title="Compartir">
                      <Share2 size={20} />
                    </button>
                    <button onClick={handleFollowToggle} className={`transition-colors p-1 ${isFollowing ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`} title="Guardar">
                      <Bookmark size={20} className={isFollowing ? 'fill-current' : ''} />
                    </button>
                 </div>
               </div>

               <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-2">
                 {product.title}
               </h1>
               
                                {product.typeId !== 'inform' && (
                   <a href={`/perfil/${product.authorId}${isBusinessProduct ? '?mode=business' : ''}`} className="text-blue-600 hover:text-orange-600 hover:underline text-sm font-medium flex items-center gap-1 mb-2" onClick={(e) => { e.preventDefault(); onClose(); navigate(`/perfil/${product.authorId}${isBusinessProduct ? '?mode=business' : ''}`); }}>
                     Visitar perfil de {product.authorName || 'Usuario'}
                   </a>
                 )}
                 {product.createdAt && (
                   <p className="text-xs text-gray-400 font-medium mb-4 flex items-center gap-1">
                     <Calendar size={12} /> Publicado el {new Date(product.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                   </p>
                 )}

               <div className="flex items-baseline gap-2 mb-2">
                 <span className="text-3xl font-semibold text-gray-900 flex items-start">
                   <span className="text-base font-normal mt-1 mr-1">{product.currency}</span>
                   {product.isOnSale ? product.salePrice : product.price}
                 </span>
                 {product.isOnSale && (
                   <span className="text-base text-gray-500 line-through">
                     {product.currency} {product.price}
                   </span>
                 )}
               </div>
               {product.isOnSale && (
                 <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold mb-4">
                   Oferta
                 </span>
               )}
            </div>

            <hr className="border-gray-200" />

            {/* Custom Fields / Specifications */}
            {displayCustomFields.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Especificaciones</h3>
                  {displayCustomFields.map(([key, value]) => (
                    <div key={key} className="flex text-sm">
                      <span className="w-1/3 text-gray-600 font-medium break-words pr-4">{key}</span>
                      <span className="w-2/3 text-gray-900 font-medium break-words">{String(value)}</span>
                    </div>
                  ))}
                </div>
                <hr className="border-gray-200" />
              </>
            )}

            <div className="prose prose-sm text-gray-800 max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Acerca de este artículo</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                {product.description || 'Sin descripción detallada.'}
              </p>
            </div>
          </div>

          {/* Right Column: "Buy Box" / Seller Info */}
          <div className="w-full lg:w-[20%] lg:min-w-[280px]">
             <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm sticky top-24">
                <div className="mb-5">
                  <span className="text-2xl font-bold text-gray-900 flex items-start mb-2">
                    <span className="text-sm font-normal mt-1 mr-1">{product.currency}</span>
                    {product.isOnSale ? product.salePrice : product.price}
                  </span>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    Estado: <span className="text-green-700 font-semibold">Disponible</span>
                  </div>

                  <div className="flex gap-2 text-gray-700 mb-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400" />
                    <div className="flex flex-col gap-1 w-full">
                      {product.business && (
                        <div className="flex"><span className="font-bold min-w-[70px]">Negocio:</span> <span className="font-medium text-gray-900 break-words flex-1">{product.business}</span></div>
                      )}
                      <div className="flex"><span className="font-bold min-w-[70px]">Calle:</span> <span className="font-medium text-gray-900 break-words flex-1">{getCleanLocation()}</span></div>
                      {product.province && (
                        <div className="flex"><span className="font-bold min-w-[70px]">Provincia:</span> <span className="font-medium text-gray-900 break-words flex-1">{product.province}</span></div>
                      )}
                      {(product.country || product.authorCountry) && (
                        <div className="flex"><span className="font-bold min-w-[70px]">País:</span> <span className="font-medium text-gray-900 break-words flex-1">{product.country || product.authorCountry}</span></div>
                      )}
                    </div>
                  </div>
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
                    className="w-full py-2.5 px-4 bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 rounded-full font-medium text-sm transition-colors flex items-center justify-center gap-2 mb-4 border border-[#FCD200]"
                  >
                    <Phone size={16} />
                    Contactar Ahora
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 w-full mb-4">
                    {isAuthor && (
                      <button 
                        onClick={() => onEdit?.(product.id)}
                        className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-medium text-sm transition-colors flex items-center justify-center gap-2 border border-gray-300"
                      >
                        <Edit2 size={16} /> Editar
                      </button>
                    )}
                    <button 
                      onClick={() => onDelete?.(product.id)}
                      className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-red-600 rounded-full font-medium text-sm transition-colors flex items-center justify-center gap-2 border border-red-200"
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                )}

                {/* Seller Info Mini */}
                <div className="mt-5 pt-5 border-t border-gray-200">
                  {product.isOwner !== false && product.typeId !== 'inform' ? (
                    /* ── OWNER: standard vendor display ── */
                    <>
                      <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Vendedor</p>
                      <div className="flex items-center gap-3 mb-3 cursor-pointer group" onClick={() => { onClose(); navigate(`/perfil/${product.authorId}${isBusinessProduct ? '?mode=business' : ''}`); }}>
                        <div className="w-10 h-10 shrink-0 group-hover:opacity-90 transition-opacity">
                          <UserAvatar alt="Seller" src={displayAvatar} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 group-hover:underline">{product.authorName || 'Usuario'}</h4>
                          <div className="flex items-center gap-1 text-xs font-medium text-gray-600 mt-0.5">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            <span>{computedAuthorRating && computedAuthorRating > 0 ? computedAuthorRating.toFixed(1) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ── INFORMER: business is the star, publisher is secondary ── */
                    <>
                      {(product.storeName || product.business) && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-vuttik-blue uppercase tracking-widest">DISPONIBLE EN</span>
                            
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 rounded-xl bg-vuttik-blue/10 border border-vuttik-blue/20 flex items-center justify-center shrink-0">
                              <Building2 size={20} className="text-vuttik-blue" />
                            </div>
                            <div>
                              <h4 className="font-black text-gray-900 text-base line-clamp-1">{product.storeName || product.business}</h4>
                              {product.chain && <p className="text-xs text-gray-500 mt-0.5">{product.chain}</p>}
                            </div>
                          </div>
                          <div className="h-px bg-gray-100 my-3" />
                        </>
                      )}
                      <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => { onClose(); navigate(`/perfil/${product.authorId}`); }}
                      >
                        <Info size={13} className="text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-400 font-medium">Informado por:</span>
                        <div className="flex items-center gap-1.5 group-hover:text-blue-500 transition-colors">
                          <div className="w-5 h-5 shrink-0">
                            <UserAvatar alt="Informer" src={displayAvatar} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-500 group-hover:underline line-clamp-1">{product.authorName || 'Usuario'}</span>
                        </div>
                      </div>
                    </>
                  )}
                  {product.trustLevel === 'High' && (
                    <div className="flex items-center gap-1.5 text-green-700 bg-green-50 py-1.5 px-2 rounded-md w-fit border border-green-200 mt-3">
                      <ShieldCheck size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Verificado</span>
                    </div>
                  )}
                  {isBusinessProduct && product.isOwner !== false && (
                    <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 py-1.5 px-2 rounded-md w-fit border border-blue-200 mt-2">
                      <Building2 size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Negocio</span>
                    </div>
                  )}
                </div>
             </div>
          </div>

        </div>
      </main>

      {/* Floating CTA for Mobile ONLY */}
      {!isAuthor && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full z-40 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => {
              if (product.phone) {
                window.open(`https://wa.me/${product.phone.replace(/\D/g, '')}`, '_blank');
              } else {
                onClose();
                navigate('/mensajes', { state: { targetUser: { uid: product.authorId, name: product.authorName, photo: product.authorAvatar } } });
              }
            }}
            className="w-full py-3.5 bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 rounded-full font-medium shadow-sm transition-colors flex items-center justify-center gap-2 border border-[#FCD200]"
          >
            <Phone size={18} /> Contactar al Vendedor
          </button>
        </div>
      )}

      {/* Offer Map Modal */}
      {showOfferMap && (
        <OfferMap 
          products={[product]} 
          onClose={() => setShowOfferMap(false)} 
          onViewProduct={() => setShowOfferMap(false)} 
        />
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
