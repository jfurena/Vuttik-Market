import { useState } from 'react';
import { ArrowUp, ArrowDown, MapPin, Star, Edit2, Trash2, Info, ArrowUpRight, Megaphone, ShieldAlert, ShieldCheck, Store, Eye, Package } from 'lucide-react';
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
  const [imageError, setImageError] = useState(false);
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
    isVerified,
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
      className={`bg-white rounded-2xl shadow-pro hover:shadow-pro-hover group cursor-pointer relative overflow-hidden flex flex-col h-full border border-gray-100 transition-all duration-300`}
    >
      {canEdit && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); props.onEdit?.(id); }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 shadow-sm hover:bg-vuttik-blue hover:text-white transition-all"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); props.onDelete?.(id); }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <div className="w-full aspect-[4/3] overflow-hidden relative bg-gray-50 border-b border-gray-100">
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
          {typeLabel && (
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white rounded-lg shadow-sm ${typeColors[type as keyof typeof typeColors] || 'bg-gray-800'}`}>
              {typeLabel}
            </span>
          )}
        </div>

        {(image && image !== '/producto.jpeg' && !image.includes('/api/images/product/pos-') && !imageError) ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100/50">
            <Package size={48} className="text-vuttik-blue opacity-50" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col flex-grow justify-between p-4 md:p-5">
        <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2 leading-tight flex-1">{title}</h3>
            </div>
            <div className="text-xl font-black text-vuttik-blue mt-1">
              {price} <span className="text-sm font-bold opacity-80">{currency}</span>
            </div>
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mt-3 truncate">
                <MapPin size={12} className="shrink-0 text-gray-400" /> 
                <span className="truncate">{location}</span>
            </p>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (props.onAuthorClick && props.authorId) {
                props.onAuthorClick(props.authorId);
              }
            }}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200">
                <UserAvatar src={authorAvatar} alt={authorName} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-gray-700">{authorName || 'Usuario'}</span>
              {isVerified && <ShieldCheck size={12} className="text-success" />}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onVote?.(id, 'up'); }}
              className={`flex items-center gap-1 ${userVote === 'up' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'} transition-colors`}
            >
              <ArrowUp size={14} />
              <span className="text-xs font-bold">{upvotes}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onVote?.(id, 'down'); }}
              className={`flex items-center gap-1 ${userVote === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'} transition-colors`}
            >
              <ArrowDown size={14} />
              <span className="text-xs font-bold">{downvotes}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
