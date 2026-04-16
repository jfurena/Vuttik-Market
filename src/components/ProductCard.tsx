import { CheckCircle2, ArrowUp, ArrowDown, MapPin, Star, Edit2, Trash2, Clock, Info, Phone } from 'lucide-react';
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
  authorRating: number;
  phone?: string;
  isOfficialSource?: boolean;
  canEdit?: boolean;
  onViewDetails?: (id: string) => void;
  onVote?: (id: string, type: 'up' | 'down') => void;
  userVote?: 'up' | 'down' | null;
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
    authorRating,
    phone,
    isOfficialSource,
    canEdit,
    onViewDetails,
    onVote,
    userVote
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
    service: 'bg-cyan-500'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-white border border-gray-100 rounded-[24px] overflow-hidden flex flex-row md:flex-col group hover:shadow-2xl hover:shadow-vuttik-navy/5 transition-all duration-300 relative h-auto md:h-full`}
    >
      {/* Management Actions (Guardians/Authors) */}
      {canEdit && (
        <div className="absolute top-3 right-3 z-20 flex gap-2">
          <button className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-vuttik-navy shadow-sm hover:bg-vuttik-blue hover:text-white transition-all">
            <Edit2 size={14} />
          </button>
          <button className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Image Section */}
      <div className="relative w-[35%] md:w-full aspect-square md:aspect-[4/5] overflow-hidden bg-gray-50 shrink-0">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Info size={32} className="md:size-12" />
          </div>
        )}
        
        <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-wrap gap-1 md:gap-2 pr-8 md:pr-12">
          <div className={`${typeColors[type as keyof typeof typeColors] || 'bg-vuttik-navy'} text-white text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full backdrop-blur-md uppercase`}>
            {typeLabel || typeLabels[type as keyof typeof typeLabels] || type}
          </div>
          {isOffer && (
            <div className="bg-red-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full backdrop-blur-md">
              OFERTA
            </div>
          )}
        </div>

        <div className="hidden md:block absolute bottom-3 left-3 right-3 bg-black/40 backdrop-blur-md rounded-xl p-2 text-white">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-vuttik-blue flex items-center justify-center text-[10px] font-bold">
              {authorName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate">{authorName}</p>
              <div className="flex items-center gap-1">
                <div className="flex items-center text-yellow-400">
                  <Star size={8} fill="currentColor" />
                  <span className="text-[8px] font-bold ml-0.5">{authorRating}</span>
                </div>
                <span className="text-[8px] opacity-80">• {trustLevel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-2.5 md:p-4 flex flex-col flex-1 min-w-0 justify-between">
        <div className="flex flex-col gap-0.5 md:gap-1">
          <div className="flex justify-between items-start">
            <div className="flex flex-col min-w-0">
              <span className="text-[7px] md:text-[10px] font-bold text-vuttik-blue uppercase tracking-wider truncate">
                {category} • {business || 'Particular'}
              </span>
              <button 
                onClick={() => onViewDetails?.(id)}
                className="text-[11px] md:text-sm font-bold line-clamp-1 md:line-clamp-2 leading-tight text-left hover:text-vuttik-blue transition-colors"
              >
                {title}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-vuttik-text-muted text-[7px] md:text-[10px]">
            <MapPin size={7} className="md:size-[10px]" />
            <span className="truncate">{location}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-1 text-vuttik-blue text-[7px] md:text-[10px] font-bold">
              <Phone size={7} className="md:size-[10px]" />
              <span>{phone}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 md:gap-2 mt-1 md:mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 md:gap-2">
                <span className="text-vuttik-navy font-display text-base md:text-2xl font-black">{price}</span>
                <span className="text-vuttik-text-muted text-[8px] md:text-xs font-bold">{currency}</span>
              </div>
              {isOffer && regularPrice && (
                <span className="text-[7px] md:text-xs text-vuttik-text-muted line-through font-medium leading-none">
                  {regularPrice} {currency}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 md:hidden">
              <div className="w-4 h-4 rounded-full bg-vuttik-blue flex items-center justify-center text-[7px] font-bold text-white">
                {authorName.charAt(0)}
              </div>
              <div className="flex items-center text-yellow-400">
                <Star size={7} fill="currentColor" />
                <span className="text-[7px] font-bold ml-0.5">{authorRating}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button 
              onClick={() => onViewDetails?.(id)}
              className={`flex-1 vuttik-button !py-1.5 md:!py-3 !text-[9px] md:!text-xs !rounded-lg md:!rounded-xl ${type === 'buy' ? '!bg-vuttik-navy' : ''}`}
            >
              {type === 'buy' ? 'Tomar Pedido' : 'Ver más'}
            </button>
            <div className="flex items-center bg-gray-50 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-gray-100">
              <button 
                onClick={(e) => { e.stopPropagation(); onVote?.(id, 'up'); }}
                className={`p-1 md:p-1.5 rounded-lg transition-colors ${userVote === 'up' ? 'bg-green-500 text-white' : 'text-green-600 hover:bg-green-100'}`}
              >
                <ArrowUp size={10} className="md:size-4" />
              </button>
              <span className="text-[7px] md:text-[10px] font-bold px-0.5 md:px-1">{upvotes - downvotes}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onVote?.(id, 'down'); }}
                className={`p-1 md:p-1.5 rounded-lg transition-colors ${userVote === 'down' ? 'bg-red-500 text-white' : 'text-red-600 hover:bg-red-100'}`}
              >
                <ArrowDown size={10} className="md:size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
