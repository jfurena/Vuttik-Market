import { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, User as UserIcon, Globe, DollarSign, Tag, ChevronDown, Bell, MapPin, Building2, ArrowLeft, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard, { ProductCardProps } from './ProductCard';
import OfferMap from './OfferMap';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';
import { trackMetric } from '../utils/metrics';

interface Category {
  id: string;
  name: string;
  allowedTypes: string[];
  order: number;
}

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

export default function P2PBoard({ 
  onViewDetails, 
  onBack,
  initialCategory = 'GLOBAL',
  initialType = 'sell'
}: { 
  onViewDetails?: (id: string) => void;
  onBack?: () => void;
  initialCategory?: string;
  initialType?: string;
}) {
  const [p2pType, setP2pType] = useState<string>(initialType);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; label: string }[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('DOP');
  const [isOfferFilter, setIsOfferFilter] = useState(false);
  const [showOfferMap, setShowOfferMap] = useState(false);
  const [chainFilter, setChainFilter] = useState('');

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
    const loadTypes = async () => {
      try {
        const types = await api.getTransactionTypes();
        setTransactionTypes(types);
      } catch (error) {
        console.error('Error loading transaction types:', error);
      }
    };
    loadTypes();
  }, []);

  const loadProducts = async () => {
    try {
      const prods = await api.getProducts(activeCategory);
      setProducts(prods);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  useEffect(() => {
    loadProducts();
    const interval = setInterval(loadProducts, 30000);
    return () => clearInterval(interval);
  }, [activeCategory]);

  useEffect(() => {
    setActiveCategory(initialCategory);
    setP2pType(initialType);
    
    // Tracking
    trackMetric({
      userId: auth.currentUser?.uid || 'anonymous',
      action: 'view',
      targetId: initialCategory,
      targetType: 'category'
    });
  }, [initialCategory, initialType]);

  // Debounced Search Tracking
  useEffect(() => {
    if (!searchQuery) return;
    const timer = setTimeout(() => {
      trackMetric({
        userId: auth.currentUser?.uid || 'anonymous',
        action: 'search',
        targetId: searchQuery,
        targetType: 'category', // Using category as general bucket for now
        metadata: { query: searchQuery, category: activeCategory }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory]);

  useEffect(() => {
    if (categories.length > 0) {
      const currentCat = categories.find(c => c.id === activeCategory);
      if (currentCat && currentCat.allowedTypes && !currentCat.allowedTypes.includes(p2pType)) {
        setP2pType(currentCat.allowedTypes[0]);
      }
    }
  }, [activeCategory, categories]);

  const handleVote = async (productId: string, voteType: 'up' | 'down') => {
    // Vote logic will be moved to SQL later
    console.log('Voting:', productId, voteType);
  };

  const filteredProducts = products.filter(p => {
    const displayTypeMap: Record<string, string> = {
      'buy': 'sell',
      'sell': 'buy',
      'rent': 'rent'
    };
    
    const typeId = p.typeId || p.type_id;
    const categoryId = p.categoryId || p.category_id;
    
    const matchesType = typeId === (displayTypeMap[p2pType] || p2pType);
    const matchesCategory = activeCategory === 'GLOBAL' || categoryId === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.authorName || p.author_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !locationFilter || p.location?.toLowerCase().includes(locationFilter.toLowerCase());
    
    const price = p.price;
    const matchesMinPrice = !minPrice || price >= parseFloat(minPrice);
    const matchesMaxPrice = !maxPrice || price <= parseFloat(maxPrice);
    const matchesCurrency = p.currency === currencyFilter;
    const matchesIsOffer = !isOfferFilter || (p.isOnSale === true || p.is_on_sale === true || p.is_on_sale === 1);

    return matchesType && matchesCategory && matchesSearch && matchesLocation && matchesMinPrice && matchesMaxPrice && matchesCurrency && matchesIsOffer;
  });

  const allCategories = [
    { id: 'GLOBAL', name: 'GLOBAL' },
    ...categories
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-32">
      {/* Top Bar with Notifications and Filters */}
      <div className="px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 md:p-2 bg-vuttik-gray rounded-xl text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all"
            >
              <ArrowLeft size={18} className="md:size-5" />
            </button>
          )}
          <h2 className="text-2xl md:text-3xl font-display font-black text-vuttik-navy">Mercado</h2>
          <div className="flex items-center gap-1.5 md:gap-2 bg-vuttik-gray px-2 md:px-3 py-1 md:py-1.5 rounded-full">
            <Globe size={12} className="text-vuttik-blue md:size-[14px]" />
            <span className="text-[10px] md:text-xs font-bold text-vuttik-navy">RD</span>
            <ChevronDown size={12} className="text-vuttik-text-muted md:size-[14px]" />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setShowOfferMap(true)}
            className="relative p-1.5 md:p-2 bg-vuttik-gray rounded-xl text-vuttik-navy hover:bg-red-500 hover:text-white transition-all group"
            title="Ver mapa de ofertas"
          >
            <MapIcon size={18} className="md:size-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1 rounded-full border border-white">MAP</span>
          </button>
          <button className="relative p-1.5 md:p-2 bg-vuttik-gray rounded-xl text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all">
            <Bell size={18} className="md:size-5" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 md:p-2 rounded-xl transition-all ${showFilters ? 'bg-vuttik-blue text-white' : 'bg-vuttik-gray text-vuttik-navy'}`}
          >
            <SlidersHorizontal size={18} className="md:size-5" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 md:px-6 flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar">
        {allCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 md:px-5 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === cat.id 
                ? 'bg-vuttik-blue text-white' 
                : 'bg-white border border-gray-100 text-vuttik-navy hover:border-vuttik-blue'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Transaction Type Toggle */}
      <div className="px-4 md:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {transactionTypes
          .filter(type => {
            if (activeCategory === 'GLOBAL') return true;
            if (categories.length === 0) return false;
            const currentCat = categories.find(c => c.id === activeCategory);
            return currentCat?.allowedTypes?.includes(type.id);
          })
          .map((type) => (
            <button
              key={type.id}
              onClick={() => setP2pType(type.id)}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${
                p2pType === type.id 
                  ? 'bg-vuttik-navy text-white shadow-lg shadow-vuttik-navy/20' 
                  : 'bg-white border border-gray-100 text-vuttik-text-muted hover:border-vuttik-blue'
              }`}
            >
              {type.label.toUpperCase()}
            </button>
          ))}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-6 overflow-hidden"
        >
          <div className="bg-vuttik-gray rounded-[32px] p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Moneda</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                <select 
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold appearance-none outline-none"
                >
                  <option value="DOP">DOP - Peso Dominicano</option>
                  <option value="USD">USD - Dólar Estadounidense</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Rango de Precio</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" 
                />
                <span className="text-vuttik-text-muted">-</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Ubicación</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                <input 
                  type="text" 
                  placeholder="Ciudad o Sector" 
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Cadena / Franquicia</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                <input 
                  type="text" 
                  placeholder="Ej: Bravo, Sirena..." 
                  value={chainFilter}
                  onChange={(e) => setChainFilter(e.target.value)}
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" 
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <button 
                onClick={() => setIsOfferFilter(!isOfferFilter)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                  isOfferFilter ? 'bg-red-500 text-white' : 'bg-white text-vuttik-navy border border-gray-100'
                }`}
              >
                <Tag size={16} />
                Solo Ofertas
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="px-4 md:px-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={18} />
          <input 
            type="text" 
            placeholder={`Buscar en ${activeCategory === 'GLOBAL' ? 'todo el mercado' : activeCategory}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-vuttik-gray border-none rounded-xl md:rounded-2xl px-10 md:px-12 py-3 md:py-4 focus:ring-2 focus:ring-vuttik-blue/20 transition-all outline-none text-xs md:text-sm"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              {...product} 
              id={product.id}
              price={String(product.price ?? 0)}
              category={categories.find(c => c.id === (product.categoryId || product.category_id))?.name || 'General'}
              type={product.typeId || product.type_id}
              typeLabel={transactionTypes.find(t => t.id === (product.typeId || product.type_id))?.label}
              image={product.images?.[0]}
              upvotes={product.upVotes?.length || product.up_votes?.length || 0}
              downvotes={product.downVotes?.length || product.down_votes?.length || 0}
              authorName={product.authorName || product.author_name || 'Usuario'}
              registeredAt={safeDate(product.createdAt || product.created_at)}
              phone={product.phone}
              onViewDetails={onViewDetails} 
              onVote={handleVote}
              trustLevel="High"
              authorRating={4.5}
            />
          ))
        }
      </div>
      
      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-20 h-20 bg-vuttik-gray rounded-full flex items-center justify-center text-gray-300 mb-4">
            <Tag size={40} />
          </div>
          <h3 className="text-lg font-bold text-vuttik-navy">No hay resultados</h3>
          <p className="text-sm text-vuttik-text-muted max-w-xs">Intenta cambiar los filtros o la categoría para encontrar lo que buscas.</p>
        </div>
      )}

      {/* Offer Map Modal */}
      <AnimatePresence>
        {showOfferMap && (
          <OfferMap 
            products={filteredProducts} 
            onClose={() => setShowOfferMap(false)} 
            onViewProduct={(id) => {
              setShowOfferMap(false);
              onViewDetails?.(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
