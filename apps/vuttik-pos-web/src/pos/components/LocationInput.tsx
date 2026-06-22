import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Loader2, ExternalLink, Map as MapIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet default icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  placeholder?: string;
  label?: string;
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (e && e.latlng) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function ChangeView({ center, showMap }: { center: [number, number], showMap: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (showMap && map) {
      // Use a safer way to invalidate size
      const handleInvalidate = () => {
        try {
          if (map) map.invalidateSize();
        } catch (e) {
          // Ignore errors during unmount/transition
        }
      };

      const timer1 = setTimeout(handleInvalidate, 100);
      const timer2 = setTimeout(handleInvalidate, 500);
      const timer3 = setTimeout(handleInvalidate, 1000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [showMap, map]);

  useEffect(() => {
    if (map && center) {
      try {
        map.setView(center, map.getZoom());
      } catch (e) {
        // Ignore errors
      }
    }
  }, [center, map]);

  return null;
}

export default function LocationInput({ value, onChange, onCoordinatesChange, placeholder, label }: LocationInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.4861, -69.9312]); // Default to Santo Domingo
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Using a more detailed search query
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=10&addressdetails=1&countrycodes=do` // Focused on Dominican Republic for better local results
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const displayName = data.display_name;
      setQuery(displayName);
      onChange(displayName);
      onCoordinatesChange?.(lat, lng);
      setMarkerPos([lat, lng]);
      setMapCenter([lat, lng]);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    // We search if query has changed and is long enough
    // We don't check query !== value here because many parents update state on every keystroke
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        searchLocations(query);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400); // Slightly faster debounce for better feel

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (suggestion: any) => {
    const displayName = suggestion.display_name;
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    
    // Update local and parent state
    setQuery(displayName);
    onChange(displayName);
    onCoordinatesChange?.(lat, lon);
    
    // Update map position
    setMarkerPos([lat, lon]);
    setMapCenter([lat, lon]);
    
    // Close suggestions
    setShowSuggestions(false);
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    // Ensure suggestions show up when typing
    if (val.length >= 3) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-vuttik-blue flex items-center gap-2">
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleManualChange}
          onFocus={() => query.length >= 3 && setShowSuggestions(true)}
          placeholder={placeholder || "Buscar lugar o escribir dirección..."}
          className="w-full bg-vuttik-gray border-none rounded-2xl pl-16 pr-24 py-4 text-sm font-bold text-vuttik-navy outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button 
              onClick={() => { setQuery(''); onChange(''); setMarkerPos(null); setSuggestions([]); }}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors text-vuttik-text-muted"
            >
              <X size={16} />
            </button>
          )}
          <button 
            onClick={() => setShowMapModal(true)}
            className="p-2 rounded-xl bg-white text-vuttik-blue shadow-sm hover:bg-vuttik-blue/10 transition-all"
            title="Seleccionar en mapa"
          >
            <MapIcon size={18} />
          </button>
        </div>
      </div>

      {/* Suggestions Dropdown (Inline) */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && !showMapModal && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[2000] left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto"
          >
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-6 py-4 hover:bg-vuttik-gray transition-all flex items-start gap-3 border-b border-gray-50 last:border-none"
              >
                <Search size={16} className="text-vuttik-text-muted mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-vuttik-navy line-clamp-1">{s.display_name.split(',')[0]}</p>
                  <p className="text-[10px] text-vuttik-text-muted line-clamp-1">{s.display_name}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Map Modal (Uber Style) */}
      <AnimatePresence>
        {showMapModal && (
          <div className="fixed inset-0 z-[3000] flex flex-col bg-white">
            {/* Header / Search Bar */}
            <div className="p-4 md:p-6 bg-white shadow-lg z-[3010] flex items-center gap-4">
              <button 
                onClick={() => setShowMapModal(false)}
                className="p-3 bg-vuttik-gray rounded-2xl text-vuttik-navy hover:bg-vuttik-blue hover:text-white transition-all"
              >
                <X size={24} />
              </button>
              <div className="flex-1 relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-vuttik-blue">
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={handleManualChange}
                  autoFocus
                  placeholder="¿A dónde vamos?"
                  className="w-full bg-vuttik-gray border-none rounded-3xl pl-16 pr-14 py-5 text-lg font-bold text-vuttik-navy outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                />
                
                {query && (
                  <button 
                    onClick={() => { setQuery(''); onChange(''); setSuggestions([]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full transition-colors text-vuttik-text-muted"
                  >
                    <X size={20} />
                  </button>
                )}
                
                {/* Modal Suggestions */}
                <AnimatePresence>
                  {showSuggestions && query.length >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 top-full mt-4 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-[60vh] overflow-y-auto z-[3020]"
                    >
                      {isLoading ? (
                        <div className="p-10 flex flex-col items-center justify-center gap-4 text-vuttik-text-muted">
                          <Loader2 size={32} className="animate-spin text-vuttik-blue" />
                          <p className="text-sm font-medium">Buscando lugares...</p>
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelect(s)}
                            className="w-full text-left px-8 py-6 hover:bg-vuttik-gray transition-all flex items-start gap-4 border-b border-gray-50 last:border-none"
                          >
                            <div className="p-3 bg-vuttik-blue/10 rounded-full text-vuttik-blue shrink-0">
                              <MapPin size={22} />
                            </div>
                            <div className="flex-1">
                              <p className="text-lg font-black text-vuttik-navy leading-tight">{s.display_name.split(',')[0]}</p>
                              <p className="text-xs text-vuttik-text-muted mt-1 line-clamp-2">{s.display_name}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-10 flex flex-col items-center justify-center gap-2 text-vuttik-text-muted">
                          <Search size={32} className="opacity-20" />
                          <p className="text-sm font-medium">No se encontraron resultados para "{query}"</p>
                          <p className="text-[10px] opacity-60">Intenta con una dirección más específica</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative z-[3005] bg-gray-100">
              <MapContainer 
                center={mapCenter} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView center={mapCenter} showMap={showMapModal} />
                <MapEvents onMapClick={reverseGeocode} />
                {markerPos && <Marker position={markerPos} icon={DefaultIcon} />}
              </MapContainer>

              {/* Confirm Button Overlay */}
              <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[3010] px-6">
                <button 
                  onClick={() => setShowMapModal(false)}
                  disabled={!value}
                  className="w-full max-w-md bg-vuttik-navy text-white py-5 rounded-[24px] font-black text-lg uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-vuttik-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={24} />
                  Confirmar Ubicación
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {value && !showMapModal && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] text-vuttik-text-muted font-medium italic">
            * Toca el icono de mapa para una experiencia completa
          </p>
          <button 
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`, '_blank')}
            className="flex items-center gap-1 text-[10px] font-black text-vuttik-blue uppercase hover:underline"
          >
            <ExternalLink size={10} />
            Ver en Google Maps
          </button>
        </div>
      )}
    </div>
  );
}
