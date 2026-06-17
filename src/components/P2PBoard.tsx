import { useState, useEffect, useRef } from 'react';
import { Search, Filter, SlidersHorizontal, User as UserIcon, Globe, DollarSign, Tag, ChevronDown, Bell, MapPin, Building2, ArrowLeft, Map as MapIcon, LayoutGrid, List, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard, { ProductCardProps } from './ProductCard';
import OfferMap from './OfferMap';
import CountryDropdown from './CountryDropdown';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { trackMetric } from '../utils/metrics';
import { useNavigate, useLocation } from 'react-router-dom';

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
  initialType = 'buy'
}: { 
  onViewDetails?: (id: string) => void;
  onBack?: () => void;
  initialCategory?: string;
  initialType?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [p2pType, setP2pType] = useState<string>(initialType);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; label: string }[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [location.search]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isBusinessModeActive, setIsBusinessModeActive] = useState(false);
  const [marketLocation, setMarketLocation] = useState('GLOBAL');

  const containerRef = useRef<HTMLDivElement>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [isOfferFilter, setIsOfferFilter] = useState(false);
  const [showOfferMap, setShowOfferMap] = useState(false);
  const [chainFilter, setChainFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pinnedCategories, setPinnedCategories] = useState<string[]>(['GLOBAL', 'TECNOLOGIA', 'VEHICULOS', 'INMUEBLES', 'EMPLEOS']);

  useEffect(() => {
    const saved = localStorage.getItem('vuttik_pinned_categories');
    if (saved) {
      try {
        setPinnedCategories(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const togglePinCategory = (id: string) => {
    if (id === 'GLOBAL') return;
    let newPinned;
    if (pinnedCategories.includes(id)) {
      newPinned = pinnedCategories.filter(c => c !== id);
    } else {
      newPinned = [...pinnedCategories, id];
    }
    setPinnedCategories(newPinned);
    localStorage.setItem('vuttik_pinned_categories', JSON.stringify(newPinned));
  };

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
        // Orden requerido: buy (compras), sell (ventas), rent (alquiler), otros...
        const sortOrder: Record<string, number> = {
          buy: 1,
          sell: 2,
          rent: 3
        };
        types.sort((a: any, b: any) => {
          const orderA = sortOrder[a.id] || 99;
          const orderB = sortOrder[b.id] || 99;
          return orderA - orderB;
        });
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
    // Reset all filters when navigating to a new category/type
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setCountryFilter('');
    setProvinceFilter('');
    setChainFilter('');
    setCurrencyFilter('ALL');
    setIsOfferFilter(false);
    
    // Tracking
    trackMetric({
      userId: user?.uid || 'anonymous',
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
        userId: user?.uid || 'anonymous',
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
    if (!user) {
      alert("Debes iniciar sesión para votar.");
      return;
    }
    
    // Optimistic update
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    const product = products[productIndex];
    const upVotes = [...(product.upVotes || [])];
    const downVotes = [...(product.downVotes || [])];
    
    const isUpvoted = upVotes.includes(user.uid);
    const isDownvoted = downVotes.includes(user.uid);
    
    let newVoteType: 'up' | 'down' | null = voteType;
    
    if (voteType === 'up') {
      if (isUpvoted) {
        newVoteType = null; // Toggle off
        upVotes.splice(upVotes.indexOf(user.uid), 1);
      } else {
        upVotes.push(user.uid);
        if (isDownvoted) downVotes.splice(downVotes.indexOf(user.uid), 1);
      }
    } else {
      if (isDownvoted) {
        newVoteType = null; // Toggle off
        downVotes.splice(downVotes.indexOf(user.uid), 1);
      } else {
        downVotes.push(user.uid);
        if (isUpvoted) upVotes.splice(upVotes.indexOf(user.uid), 1);
      }
    }

    const newProducts = [...products];
    newProducts[productIndex] = { ...product, upVotes, downVotes };
    setProducts(newProducts);

    try {
      await api.voteProduct(productId, user.uid, newVoteType);
    } catch (err) {
      console.error('Failed to vote:', err);
      // Revert on failure (simple implementation, ideally we'd restore previous state)
      setProducts(products); 
    }
  };

  const filteredProducts = products.filter(p => {
    const displayTypeMap: Record<string, string> = {
      'buy': 'sell',
      'sell': 'buy',
      'seek_job': 'offer_job',
      'offer_job': 'seek_job',
      'seek_service': 'offer_service',
      'offer_service': 'seek_service',
      'rent_in': 'rent_out',
      'rent_out': 'rent_in',
      'rent': 'rent'
    };
    
    const typeId = p.typeId || p.type_id;
    const categoryId = p.categoryId || p.category_id;
    const targetType = displayTypeMap[p2pType] || p2pType;
    let matchesType = typeId === targetType;
    if (p2pType === 'buy' && (typeId === 'sell' || typeId === 'inform')) {
      matchesType = true;
    }
    
    const matchesCategory = activeCategory === 'GLOBAL' || categoryId === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.authorName || p.author_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.storeName || p.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.barcode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const locStr = (p.location || '').toLowerCase();
    const matchesCountry = !countryFilter || locStr.includes(countryFilter.toLowerCase()) || (p.country || '').toLowerCase().includes(countryFilter.toLowerCase());
    const matchesProvince = !provinceFilter || locStr.includes(provinceFilter.toLowerCase());
    
    const price = p.price;
    const matchesMinPrice = !minPrice || price >= parseFloat(minPrice);
    const matchesMaxPrice = !maxPrice || price <= parseFloat(maxPrice);
    const matchesCurrency = currencyFilter === 'ALL' || p.currency === currencyFilter;
    const matchesIsOffer = !isOfferFilter || (p.isOnSale === true || p.is_on_sale === true || p.is_on_sale === 1);
    
    const matchesChain = !chainFilter || 
                         (p.business || '').toLowerCase().includes(chainFilter.toLowerCase()) || 
                         (p.storeName || p.store_name || '').toLowerCase().includes(chainFilter.toLowerCase()) ||
                         (p.authorName || p.author_name || '').toLowerCase().includes(chainFilter.toLowerCase());

    const matchesMarketLocation = marketLocation === 'GLOBAL' || 
                                  (p.country || '').toUpperCase() === marketLocation || 
                                  locStr.toUpperCase().includes(marketLocation) ||
                                  (p.location || '').toUpperCase().includes(marketLocation);

    return matchesType && matchesCategory && matchesSearch && matchesCountry && matchesProvince && matchesMinPrice && matchesMaxPrice && matchesCurrency && matchesIsOffer && matchesChain && matchesMarketLocation;
  });

  const allCategories = [
    { id: 'GLOBAL', name: 'GLOBAL' },
    ...categories
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-8 pb-32">
      {/* Top Bar with Notifications and Filters */}
      <div className="px-4 sm:px-6 md:px-8 flex flex-wrap items-center justify-between mt-2 md:mt-4 gap-y-3 gap-x-2">
        <div className="flex items-center gap-2 md:gap-5">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 md:p-3 bg-vuttik-gray/50 rounded-2xl text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all hover:-translate-x-1"
            >
            <ArrowLeft size={20} className="md:size-5" />
          </button>
        )}
        <h2 className="text-3xl md:text-4xl font-display font-black text-vuttik-navy tracking-tight">Mercado</h2>
        <CountryDropdown value={marketLocation} onChange={setMarketLocation} />
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="flex bg-vuttik-gray/50 rounded-xl md:rounded-2xl p-1 border border-gray-100">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-vuttik-blue' : 'text-gray-400 hover:text-vuttik-navy'}`}
            >
              <LayoutGrid size={18} className="md:size-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-vuttik-blue' : 'text-gray-400 hover:text-vuttik-navy'}`}
            >
              <List size={18} className="md:size-5" />
            </button>
          </div>
          <button 
            onClick={() => setShowOfferMap(true)}
            className="relative p-2 md:p-3 bg-white border border-gray-100/80 shadow-sm rounded-xl md:rounded-2xl text-vuttik-navy hover:bg-red-500 hover:text-white hover:border-red-500 transition-all hover:-translate-y-0.5 group shrink-0"
            title="Ver mapa de ofertas"
          >
            <MapIcon size={20} className="md:size-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">MAP</span>
          </button>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all hover:-translate-y-0.5 shadow-sm border shrink-0 ${showFilters ? 'bg-vuttik-blue text-white border-vuttik-blue shadow-md shadow-vuttik-blue/20' : 'bg-white text-vuttik-navy border-gray-100/80 hover:border-vuttik-blue/30'}`}
          >
            <SlidersHorizontal size={20} className="md:size-5" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="w-full pl-4 sm:pl-6 md:pl-8 py-1">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-2 md:gap-4 pb-2 pr-4 md:pr-8">
            {allCategories.filter(c => pinnedCategories.includes(c.id)).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-[11px] md:text-sm font-medium transition-all tracking-wide border ${
                  activeCategory === cat.id 
                    ? 'border-vuttik-blue bg-vuttik-blue/5 text-vuttik-blue shadow-sm' 
                    : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-vuttik-navy'
                }`}
              >
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setShowCategoryModal(true)}
              className="shrink-0 px-4 md:px-6 py-2 md:py-2.5 rounded-[16px] text-[11px] md:text-sm font-black transition-all bg-gray-50 text-gray-500 hover:bg-vuttik-blue hover:text-white border border-transparent shadow-sm"
            >
              + Ver más
            </button>
          </div>
        </div>

      {/* Transaction Type Toggle */}
      <div className="w-full pl-4 sm:pl-6 md:pl-8 pb-1 md:pb-2">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-2 md:gap-3 pb-2 pr-4 md:pr-8">
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
                  className={`shrink-0 px-5 md:px-8 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all tracking-wide border ${
                    p2pType === type.id 
                      ? 'border-vuttik-navy bg-vuttik-navy text-white shadow-md' 
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  {type.label.toUpperCase()}
                </button>
              ))}
          </div>
        </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 sm:px-6 overflow-hidden"
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
                  <option value="ALL">Todas las monedas</option>
                  <option value="DOP">DOP - Peso Dominicano</option>
                  <option value="USD">USD - Dólar Estadounidense</option>
                  <option value="EUR">EUR - Euro</option>
                  <optgroup label="Todas las monedas">
                    {/* @ts-ignore */}
                    {(typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function' ? (Intl as any).supportedValuesOf('currency') : ['USD', 'EUR', 'DOP', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'MXN', 'BRL', 'COP', 'ARS', 'CLP', 'PEN']).filter((c: string) => !['DOP', 'USD', 'EUR'].includes(c)).map((code: string) => {
                      let name = code;
                      try {
                        name = new Intl.DisplayNames(['es'], { type: 'currency' }).of(code) || code;
                      } catch (e) {
                        // ignore
                      }
                      const capitalized = name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
                      return (
                        <option key={code} value={code}>
                          {code} - {capitalized}
                        </option>
                      );
                    })}
                  </optgroup>
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
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">País</label>
              <div className="relative">
                <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                <input 
                  type="text" 
                  placeholder="Ej: República Dominicana" 
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Provincia / Estado</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                <input 
                  type="text" 
                  placeholder="Ej: Santiago, Distrito Nacional..." 
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Categoría</label>
              <div className="relative">
                <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                <select 
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold appearance-none outline-none"
                >
                  <option value="GLOBAL">Todas las categorías</option>
                  {allCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Subcategoría (Tipo)</label>
              <div className="relative">
                <List size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                <select 
                  value={p2pType}
                  onChange={(e) => setP2pType(e.target.value)}
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold appearance-none outline-none"
                >
                  {transactionTypes
                    .filter(type => {
                      if (activeCategory === 'GLOBAL') return true;
                      if (categories.length === 0) return false;
                      const currentCat = categories.find(c => c.id === activeCategory);
                      return currentCat?.allowedTypes?.includes(type.id);
                    })
                    .map(type => (
                      <option key={type.id} value={type.id}>{type.label.toUpperCase()}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-wider">Local / Tienda</label>
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
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMinPrice('');
                  setMaxPrice('');
                  setCountryFilter('');
                  setProvinceFilter('');
                  setChainFilter('');
                  setCurrencyFilter('ALL');
                  setIsOfferFilter(false);
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Bar Removed (now handled globally in TopNav) */}

      {/* Products Grid */}
      <div className={`px-4 sm:px-6 md:px-8 mt-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8' : 'flex flex-col gap-4 md:gap-6'}`}>
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
              upvotes={product.upVotes?.length || 0}
              downvotes={product.downVotes?.length || 0}
              userVote={product.upVotes?.includes(user?.uid) ? 'up' : product.downVotes?.includes(user?.uid) ? 'down' : null}
              authorName={product.authorName || product.author_name || 'Usuario'}
              authorId={product.authorId || product.author_id || product.uid}
              onAuthorClick={(id) => {
                navigate(`/perfil/${id}`);
              }}
              registeredAt={safeDate(product.createdAt || product.created_at)}
              phone={product.phone}
              onViewDetails={onViewDetails} 
              onVote={handleVote}
              trustLevel="High"
              authorRating={4.5}
              viewMode={viewMode}
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

      {/* All Categories Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCategoryModal(false)}
              className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl max-h-[85vh] bg-white rounded-[32px] p-6 md:p-8 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl md:text-3xl font-display font-black text-vuttik-navy mb-1">Todas las Categorías</h3>
                  <p className="text-sm md:text-base text-vuttik-text-muted">Marca tus favoritas con la estrella para anclarlas a la barra principal.</p>
                </div>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 text-vuttik-text-muted hover:text-vuttik-navy bg-vuttik-gray rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 custom-scrollbar pb-6">
                {allCategories.map(cat => (
                  <div key={cat.id} className={`flex items-center justify-between p-3 md:p-4 rounded-[16px] border ${activeCategory === cat.id ? 'border-vuttik-blue bg-vuttik-blue/5' : 'border-gray-100 hover:border-vuttik-blue/30'} transition-all`}>
                    <button 
                      className="flex-1 text-left text-sm md:text-base font-bold text-vuttik-navy truncate"
                      onClick={() => { setActiveCategory(cat.id); setShowCategoryModal(false); }}
                    >
                      {cat.name}
                    </button>
                    {cat.id !== 'GLOBAL' && (
                      <button 
                        onClick={() => togglePinCategory(cat.id)}
                        className={`p-1.5 md:p-2 rounded-xl transition-colors ${pinnedCategories.includes(cat.id) ? 'text-amber-400 bg-amber-50' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-50'}`}
                      >
                        <Star size={18} fill={pinnedCategories.includes(cat.id) ? 'currentColor' : 'none'} className={pinnedCategories.includes(cat.id) ? 'scale-110' : ''} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
