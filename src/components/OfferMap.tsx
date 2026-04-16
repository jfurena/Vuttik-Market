import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Tag, ShoppingBag, MapPin, Star, ChevronRight, Info, Loader2, Search, SlidersHorizontal, DollarSign, Building2, Globe, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Fix for Leaflet default icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Special Offer Icon
const OfferIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-10 h-10 bg-red-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface OfferMapProps {
  products: any[];
  onClose: () => void;
  onViewProduct: (id: string) => void;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function OfferMap({ products, onClose, onViewProduct }: OfferMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [mapCenter] = useState<[number, number]>([18.4861, -69.9312]); // Santo Domingo
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('DOP');
  const [chainFilter, setChainFilter] = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>(['GLOBAL']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });
    return () => unsubscribe();
  }, []);

  // Apply Filters
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.authorName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Multi-category match
    const matchesCategory = activeCategories.includes('GLOBAL') || activeCategories.includes(p.categoryId);
    
    const matchesLocation = !locationFilter || p.location?.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesChain = !chainFilter || p.business?.toLowerCase().includes(chainFilter.toLowerCase()) || p.authorName?.toLowerCase().includes(chainFilter.toLowerCase());
    
    const price = p.price;
    const matchesMinPrice = !minPrice || price >= parseFloat(minPrice);
    const matchesMaxPrice = !maxPrice || price <= parseFloat(maxPrice);
    const matchesCurrency = p.currency === currencyFilter;
    const matchesOffer = !onlyOffers || p.isOnSale === true;
    const hasCoords = p.lat && p.lng;

    return matchesSearch && matchesCategory && matchesLocation && matchesChain && matchesMinPrice && matchesMaxPrice && matchesCurrency && matchesOffer && hasCoords;
  });

  const toggleCategory = (id: string) => {
    if (id === 'GLOBAL') {
      setActiveCategories(['GLOBAL']);
      return;
    }
    
    setActiveCategories(prev => {
      const withoutGlobal = prev.filter(c => c !== 'GLOBAL');
      if (withoutGlobal.includes(id)) {
        const next = withoutGlobal.filter(c => c !== id);
        return next.length === 0 ? ['GLOBAL'] : next;
      } else {
        return [...withoutGlobal, id];
      }
    });
  };

  const filteredCats = categories.filter(c => c.name.toLowerCase().includes(catSearchQuery.toLowerCase()));

  // Group products by location
  const locations = filteredProducts.reduce((acc: any[], product) => {
    const existing = acc.find(l => 
      Math.abs(l.lat - product.lat) < 0.0001 && 
      Math.abs(l.lng - product.lng) < 0.0001
    );

    if (existing) {
      existing.products.push(product);
    } else {
      acc.push({
        lat: product.lat,
        lng: product.lng,
        address: product.location,
        phone: product.phone,
        business: product.business || product.authorName,
        products: [product]
      });
    }
    return acc;
  }, []);

  return (
    <div className="fixed inset-0 z-[5000] bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Header Mobile */}
      <div className="md:hidden p-4 bg-white border-b border-gray-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-500 rounded-xl text-white">
            <Tag size={20} />
          </div>
          <h2 className="text-xl font-display font-black text-vuttik-navy">Mapa Visual</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl transition-all ${showFilters ? 'bg-vuttik-blue text-white' : 'bg-vuttik-gray text-vuttik-navy'}`}>
            <SlidersHorizontal size={20} />
          </button>
          <button onClick={onClose} className="p-2 bg-vuttik-gray rounded-xl text-vuttik-navy">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Sidebar / Product List */}
      <div className="w-full md:w-[450px] h-[45vh] md:h-full bg-white border-r border-gray-100 flex flex-col z-20 shadow-2xl">
        <div className="hidden md:flex p-8 border-b border-gray-50 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-vuttik-blue rounded-2xl text-white shadow-lg shadow-vuttik-blue/20">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black text-vuttik-navy leading-none">Mapa Visual</h2>
              <p className="text-vuttik-text-muted text-xs font-bold mt-1 uppercase tracking-widest">Explora el mercado</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl transition-all ${showFilters ? 'bg-vuttik-blue text-white' : 'bg-vuttik-gray text-vuttik-navy hover:bg-vuttik-blue/10'}`}
            >
              <SlidersHorizontal size={24} />
            </button>
            <button onClick={onClose} className="p-3 bg-vuttik-gray rounded-2xl text-vuttik-navy hover:bg-red-500 hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search Bar in Sidebar */}
        <div className="p-4 md:p-6 border-b border-gray-50 bg-vuttik-gray/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="¿Qué producto buscas?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-none rounded-2xl px-12 py-4 text-sm font-bold text-vuttik-navy shadow-sm outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 space-y-4">
          <AnimatePresence mode="wait">
            {showFilters ? (
              <motion.div
                key="filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 pb-6"
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest ml-1">Categorías</label>
                    <button 
                      onClick={() => setShowCategoryModal(true)}
                      className="w-full bg-vuttik-gray hover:bg-vuttik-blue/5 border-2 border-dashed border-gray-200 rounded-2xl p-5 flex items-center justify-between group transition-all"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-black text-vuttik-navy group-hover:text-vuttik-blue transition-colors">
                          {activeCategories.includes('GLOBAL') 
                            ? 'Todas las categorías' 
                            : `${activeCategories.length} seleccionadas`}
                        </span>
                        {!activeCategories.includes('GLOBAL') && (
                          <span className="text-[10px] text-vuttik-text-muted font-bold truncate max-w-[200px]">
                            {activeCategories.map(id => categories.find(c => c.id === id)?.name).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="p-2 bg-white rounded-xl shadow-sm text-vuttik-blue group-hover:scale-110 transition-transform">
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest ml-1">Moneda</label>
                      <select 
                        value={currencyFilter}
                        onChange={(e) => setCurrencyFilter(e.target.value)}
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-xs font-bold outline-none"
                      >
                        <option value="DOP">DOP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest ml-1">Solo Ofertas</label>
                      <button 
                        onClick={() => setOnlyOffers(!onlyOffers)}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${onlyOffers ? 'bg-red-500 text-white' : 'bg-vuttik-gray text-vuttik-navy'}`}
                      >
                        {onlyOffers ? 'SÍ' : 'NO'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest ml-1">Rango de Precio</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" 
                      />
                      <input 
                        type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest ml-1">Ubicación / Ciudad</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                      <input 
                        type="text" placeholder="Ej: Santo Domingo, Santiago..." value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full bg-vuttik-gray border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest ml-1">Tienda / Cadena</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                      <input 
                        type="text" placeholder="Ej: Bravo, Sirena, Nacional..." value={chainFilter} onChange={(e) => setChainFilter(e.target.value)}
                        className="w-full bg-vuttik-gray border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none" 
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full py-4 bg-vuttik-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg"
                >
                  Aplicar Filtros Visuales
                </button>
              </motion.div>
            ) : selectedLocation ? (
              <motion.div
                key="location-details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="flex items-center gap-2 text-vuttik-blue font-black text-xs uppercase tracking-widest hover:underline mb-2"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  Volver al mapa
                </button>
                
                <div className="p-6 bg-vuttik-navy rounded-[32px] text-white shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-vuttik-blue" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Lugar Seleccionado</p>
                  </div>
                  <h3 className="text-xl font-display font-black leading-tight mb-1">{selectedLocation.business}</h3>
                  <p className="text-xs opacity-80 line-clamp-2 mb-3">{selectedLocation.address}</p>
                  
                  {selectedLocation.phone && (
                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      <Phone size={14} className="text-vuttik-blue" />
                      <a href={`tel:${selectedLocation.phone}`} className="text-sm font-bold hover:underline">
                        {selectedLocation.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest ml-2">Productos Encontrados ({selectedLocation.products.length})</p>
                  {selectedLocation.products.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => onViewProduct(p.id)}
                      className="w-full bg-white border border-gray-100 rounded-[24px] p-4 flex items-center gap-4 hover:border-vuttik-blue hover:shadow-xl hover:shadow-vuttik-navy/5 transition-all text-left group"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                        <img src={p.images?.[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-vuttik-navy truncate">{p.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`${p.isOnSale ? 'text-red-500' : 'text-vuttik-blue'} font-black text-lg`}>{p.price} {p.currency}</span>
                          {p.isOnSale && p.salePrice && <span className="text-[10px] text-vuttik-text-muted line-through">{p.salePrice}</span>}
                        </div>
                      </div>
                      <div className="p-2 bg-vuttik-gray rounded-xl group-hover:bg-vuttik-blue group-hover:text-white transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div key="list" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest">Puntos en el Mapa ({locations.length})</p>
                    <span className="text-[10px] font-bold text-vuttik-text-muted">{filteredProducts.length} productos</span>
                  </div>
                  {locations.length > 0 ? (
                    locations.map((loc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedLocation(loc)}
                        className="w-full bg-white border border-gray-100 rounded-[24px] p-5 flex items-center gap-4 hover:border-vuttik-blue hover:shadow-xl transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-vuttik-blue/5 rounded-2xl flex items-center justify-center text-vuttik-blue shrink-0 group-hover:bg-vuttik-blue group-hover:text-white transition-all">
                          <ShoppingBag size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-vuttik-navy truncate">{loc.business}</h4>
                          <p className="text-[10px] text-vuttik-text-muted mt-0.5 truncate">{loc.address}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 ${loc.products.some((p:any) => p.isOnSale) ? 'bg-red-100 text-red-600' : 'bg-vuttik-blue/10 text-vuttik-blue'} text-[9px] font-black rounded-full uppercase`}>
                              {loc.products.length} {loc.products.length === 1 ? 'Producto' : 'Productos'}
                            </span>
                            {loc.products.some((p:any) => p.isOnSale) && (
                              <span className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase">
                                <Tag size={10} />
                                Ofertas
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <div className="w-20 h-20 bg-vuttik-gray rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                        <Search size={40} />
                      </div>
                      <p className="text-lg font-black text-vuttik-navy">Sin resultados visuales</p>
                      <p className="text-sm text-vuttik-text-muted mt-1 max-w-[250px] mx-auto">Prueba ajustando los filtros o buscando otro producto.</p>
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setActiveCategories(['GLOBAL']);
                          setOnlyOffers(false);
                          setMinPrice('');
                          setMaxPrice('');
                          setLocationFilter('');
                          setChainFilter('');
                        }}
                        className="mt-6 text-xs font-black text-vuttik-blue uppercase tracking-widest hover:underline"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Category Selection Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[6000] bg-vuttik-navy/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-black text-vuttik-navy">Categorías</h3>
                  <p className="text-vuttik-text-muted text-xs font-bold uppercase tracking-widest mt-1">Selecciona una o varias</p>
                </div>
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="p-3 bg-vuttik-gray rounded-2xl text-vuttik-navy hover:bg-red-500 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 bg-vuttik-gray/30">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar categoría..."
                    value={catSearchQuery}
                    onChange={(e) => setCatSearchQuery(e.target.value)}
                    className="w-full bg-white border-none rounded-2xl px-12 py-4 text-sm font-bold text-vuttik-navy shadow-sm outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-2 no-scrollbar">
                <button
                  onClick={() => toggleCategory('GLOBAL')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${activeCategories.includes('GLOBAL') ? 'bg-vuttik-navy text-white shadow-lg' : 'bg-vuttik-gray text-vuttik-navy hover:bg-gray-200'}`}
                >
                  <span className="font-black text-sm uppercase tracking-widest">Todas las categorías</span>
                  {activeCategories.includes('GLOBAL') && <Star size={18} fill="currentColor" />}
                </button>
                
                <div className="h-px bg-gray-100 my-4" />

                <div className="grid grid-cols-1 gap-2">
                  {filteredCats.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${activeCategories.includes(cat.id) ? 'bg-vuttik-blue text-white shadow-lg' : 'bg-vuttik-gray text-vuttik-navy hover:bg-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">{cat.name}</span>
                      </div>
                      {activeCategories.includes(cat.id) && <Star size={18} fill="currentColor" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-gray-50 bg-white">
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="w-full py-5 bg-vuttik-navy text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-vuttik-blue transition-all"
                >
                  Seleccionar ({activeCategories.includes('GLOBAL') ? 'Global' : activeCategories.length})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Container */}
      <div className="flex-1 relative bg-gray-100">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          className="z-10"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {locations.map((loc, idx) => {
            const hasOffers = loc.products.some((p: any) => p.isOnSale);
            return (
              <Marker 
                key={idx} 
                position={[loc.lat, loc.lng]} 
                icon={hasOffers ? OfferIcon : DefaultIcon}
                eventHandlers={{
                  click: () => setSelectedLocation(loc),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[180px]">
                    <h4 className="font-black text-vuttik-navy text-sm mb-1">{loc.business}</h4>
                    <p className="text-[10px] text-vuttik-text-muted mb-1">{loc.address}</p>
                    {loc.phone && (
                      <div className="flex items-center gap-1 mb-2">
                        <Phone size={10} className="text-vuttik-blue" />
                        <span className="text-[10px] font-bold text-vuttik-navy">{loc.phone}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 mb-3">
                      <span className="text-[10px] font-bold text-vuttik-blue uppercase tracking-widest">{loc.products.length} Productos</span>
                      {hasOffers && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">¡Ofertas disponibles!</span>}
                    </div>
                    <button 
                      onClick={() => setSelectedLocation(loc)}
                      className="w-full py-2 bg-vuttik-navy text-white text-[10px] font-black rounded-lg uppercase tracking-widest"
                    >
                      Ver Productos
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {selectedLocation && (
            <ChangeView center={[selectedLocation.lat, selectedLocation.lng]} />
          )}
        </MapContainer>

        {/* Floating Stats */}
        <div className="absolute top-6 right-6 z-[1000] hidden lg:block">
          <div className="bg-white/90 backdrop-blur-md border border-white p-5 rounded-[32px] shadow-2xl flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Resultados</span>
              <span className="text-3xl font-display font-black text-vuttik-navy">{filteredProducts.length}</span>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Puntos Mapa</span>
              <span className="text-3xl font-display font-black text-vuttik-navy">{locations.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
