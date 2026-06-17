import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import countriesData from 'i18n-iso-countries';
import esLocale from 'i18n-iso-countries/langs/es.json';

countriesData.registerLocale(esLocale);

interface Country {
  code: string;
  name: string;
}

interface CountryDropdownProps {
  value: string;
  onChange: (countryCode: string) => void;
}

export default function CountryDropdown({ value, onChange }: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => setIsOpen(false), isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const COUNTRIES = useMemo(() => {
    const names = countriesData.getNames('es', { select: 'official' });
    const list: Country[] = Object.keys(names).map(code => ({
      code,
      name: names[code]
    }));
    
    // Sort by name, but keep DO and US at the top for convenience
    list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    
    return [
      { code: 'GLOBAL', name: 'Global' },
      ...list
    ];
  }, []);

  const selectedCountry = COUNTRIES.find(c => c.code === value) || COUNTRIES[1] || COUNTRIES[0];
  
  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const renderFlag = (code: string, className = "w-5 h-4") => {
    if (code === 'GLOBAL') return <Globe className="text-vuttik-blue w-4 h-4 md:w-5 md:h-5" />;
    return (
      <img 
        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} 
        alt={`Bandera de ${code}`}
        className={`object-cover rounded-sm shadow-sm ${className}`}
        loading="lazy"
      />
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 md:gap-2 bg-vuttik-gray/50 px-3 py-1.5 rounded-full border border-gray-200 hover:border-vuttik-blue hover:bg-white transition-all shadow-sm h-9 md:h-10"
      >
        <span className="flex items-center justify-center shrink-0">
          {renderFlag(selectedCountry.code)}
        </span>
        <span className="text-[11px] md:text-xs font-black text-vuttik-navy">{selectedCountry.code}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-64 md:w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 flex flex-col"
          >
            <div className="p-2 border-b border-gray-50 bg-gray-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar país..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm font-bold outline-none focus:border-vuttik-blue transition-colors"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 md:max-h-80 overflow-y-auto p-1 custom-scrollbar">
              {filteredCountries.length > 0 ? (
                filteredCountries.map(country => (
                  <button
                    key={country.code}
                    onClick={() => {
                      onChange(country.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${value === country.code ? 'bg-vuttik-blue/10 text-vuttik-blue' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span className="shrink-0 flex items-center justify-center w-6 h-5">
                      {renderFlag(country.code, "w-6 h-4.5")}
                    </span>
                    <span className={`text-sm truncate ${value === country.code ? 'font-black' : 'font-bold'}`}>{country.name}</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-xs font-bold">No se encontraron países</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
