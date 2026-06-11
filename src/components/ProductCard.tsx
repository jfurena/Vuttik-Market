import { ArrowUp, ArrowDown, MapPin, Star, Edit2, Trash2, Info, ArrowUpRight, Megaphone, ShieldAlert, Store, Eye } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { motion } from 'motion/react';

export interface ProductCardProps {
  key?: string | number;
  id: string;
  type: string;
  typeLabel?: string;
  category: string;
  title: string;
  price: string;
  regularPrice?: string;
  currency: string;
  image?: string;
  location: string;
  business?: string;
  registeredAt: string;
  offerEndDate?: string;
  stock?: string;
  isOffer?: boolean;
  isVerified?: boolean;
  trustLevel: 'High' | 'Medium' | 'Low';
  upvotes: number;
  downvotes: number;
  authorName: string;
  authorId?: string;
  authorAvatar?: string;
  authorRating: number;
  phone?: string;
  isOfficialSource?: boolean;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onAuthorClick?: (authorId: string) => void;
  onVote?: (id: string, type: 'up' | 'down') => void;
  userVote?: 'up' | 'down' | null;
  viewMode?: 'grid' | 'list';
}

const ProductCard = (props: ProductCardProps) => {
  const {
    id,
    type,
    typeLabel,
    category,
    title,
    price,
    regularPrice,
    currency,
    image,
    location,
    business,
    registeredAt,
    offerEndDate,
    stock,
    isOffer,
    trustLevel,
    upvotes,
    downvotes,
    authorName,
    authorAvatar,
    authorRating,
    phone,
    isOfficialSource,
    canEdit,
    onViewDetails,
    onVote,
    userVote,
    viewMode = 'grid'
  } = props;
  
  const typeLabels = {
    sell: 'Venta',
    buy: 'Compra',
    rent: 'Alquiler',
    loan: 'Préstamo',
    hiring: 'Contratación',
    service: 'Servicio'
  };

  const typeColors = {
    sell: 'bg-green-500',
    buy: 'bg-vuttik-blue',
    rent: 'bg-purple-500',
    loan: 'bg-orange-500',
    hiring: 'bg-vuttik-navy',
    service: 'bg-cyan-500',
    inform: 'bg-gray-700'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => onViewDetails?.(id)}
      className={`bg-white border border-gray-100/60 rounded-[24px] overflow-hidden group hover:shadow-pro-hover hover:-translate-y-1 transition-all duration-300 relative cursor-pointer shadow-pro ${viewMode === 'list' ? 'flex flex-row w-full h-[135px] sm:h-[150px] md:h-[220px]' : 'flex flex-col h-full'}`}
    >
      {/* Management Actions (Guardians/Authors) */}
      {canEdit && (
        <div className={`z-20 flex gap-2 ${viewMode === 'list' ? 'absolute bottom-4 right-4' : 'absolute top-4 right-4'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); props.onEdit?.(id); }}
            className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-vuttik-navy shadow-sm hover:bg-vuttik-blue hover:text-white transition-all border border-gray-100/50"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); props.onDelete?.(id); }}
            className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all border border-gray-100/50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Image Section */}
      <div className={`relative aspect-square overflow-hidden bg-gray-50/50 shrink-0 ${viewMode === 'list' ? 'w-[135px] sm:w-[150px] md:w-[220px]' : 'w-full'} p-1.5 sm:p-2`}>
        <div className="w-full h-full rounded-[20px] overflow-hidden relative">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100/50">
              <Info size={40} className="md:size-16 opacity-50" />
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-12">
            <div className={`${type === 'inform' ? 'bg-orange-500' : (typeColors[type as keyof typeof typeColors] || 'bg-vuttik-navy')} text-white text-[10px] font-black px-3 py-1.5 rounded-xl backdrop-blur-md uppercase tracking-wider shadow-sm`}>
              {type === 'inform' ? 'VENTA' : (typeLabel || typeLabels[type as keyof typeof typeLabels] || type)}
            </div>
            {isOffer && (
              <div className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl backdrop-blur-md tracking-wider shadow-sm">
                OFERTA
              </div>
            )}
          </div>

          <div 
            className="hidden md:block absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-xl rounded-xl p-3 text-vuttik-navy cursor-pointer hover:bg-white transition-colors z-30 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-white"
            onClick={(e) => {
              e.stopPropagation();
              if (props.onAuthorClick && props.authorId) {
                props.onAuthorClick(props.authorId);
              }
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-vuttik-navy shadow-inner flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-gray-50">
                <UserAvatar src={authorAvatar} alt={authorName} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate group-hover:text-vuttik-blue transition-colors">{authorName || 'Usuario'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center text-yellow-500">
                    <Star size={10} fill="currentColor" />
                    <span className="text-[10px] font-black ml-1">{authorRating}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">• {trustLevel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 md:p-6 flex flex-col flex-1 min-w-0 justify-between">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${type === 'inform' ? 'bg-orange-500' : 'bg-green-500'}`} />
            <span className="text-[9px] md:text-[11px] font-black text-vuttik-blue/80 uppercase tracking-[0.15em] truncate">
              {category}
            </span>
          </div>
          <h3 className="text-sm sm:text-base md:text-xl font-black text-gray-900 line-clamp-2 leading-snug group-hover:text-vuttik-blue transition-colors">
            {title}
          </h3>
          <div className="flex flex-col gap-1 md:gap-1.5 mt-0.5 md:mt-1">
            {business && (
              <div className="flex items-center gap-1.5 text-vuttik-navy text-[10px] md:text-xs font-bold">
                <Store size={12} className="text-vuttik-blue md:size-3.5" />
                <span className="truncate">{business}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-gray-400 text-[10px] md:text-xs font-medium">
              <MapPin size={12} className="text-gray-300 shrink-0 md:size-3.5" />
              <span className="truncate">{location}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50 gap-2">
          <div className="flex flex-col min-w-0 shrink">
            <div className="flex items-baseline gap-1 md:gap-1.5 truncate">
              <span className="text-vuttik-blue font-display text-lg sm:text-xl md:text-3xl font-black tracking-tight truncate">{price}</span>
              <span className="text-gray-400 text-[9px] md:text-sm font-bold uppercase">{currency}</span>
            </div>
            {isOffer && regularPrice && (
              <span className="text-[9px] md:text-xs text-gray-400 line-through font-medium mt-0.5 truncate">
                {regularPrice} {currency}
              </span>
            )}
          </div>

          <div className="flex items-center shrink-0">
            <div className="flex items-center bg-gray-50/80 rounded-[10px] md:rounded-xl p-1 md:p-1.5 border border-gray-100/80">
              <button 
                onClick={(e) => { e.stopPropagation(); onVote?.(id, 'up'); }}
                className={`p-1.5 md:p-2 rounded-md md:rounded-lg transition-all flex items-center gap-1 md:gap-1.5 ${userVote === 'up' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'text-green-600 hover:bg-white hover:shadow-sm'}`}
              >
                <ArrowUp size={14} className="md:size-4" />
                <span className="text-xs md:text-sm font-black">{upvotes}</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onVote?.(id, 'down'); }}
                className={`p-1.5 md:p-2 rounded-md md:rounded-lg transition-all flex items-center gap-1 md:gap-1.5 ${userVote === 'down' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'text-red-600 hover:bg-white hover:shadow-sm'}`}
              >
                <ArrowDown size={14} className="md:size-4" />
                <span className="text-xs md:text-sm font-black">{downvotes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
