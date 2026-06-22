import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COUNTRIES } from '../lib/countries';

interface PhoneInputProps {
  value: string; // The raw number e.g. "8099618352" or "+18099618352"
  onChange: (formattedValue: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = '809 123 4567', className }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Try to parse existing value to find country code
  const initialCountry = COUNTRIES.find(c => value.startsWith(c.dialCode)) || COUNTRIES[0];
  
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [rawNumber, setRawNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize from value if provided
  useEffect(() => {
    if (value) {
      let matchedCountry = COUNTRIES[0];
      let cleanNum = value;
      
      // Check if value includes a dial code
      if (value.startsWith('+')) {
        const found = COUNTRIES.find(c => value.startsWith(c.dialCode));
        if (found) {
          matchedCountry = found;
          cleanNum = value.substring(found.dialCode.length);
        }
      }
      
      setSelectedCountry(matchedCountry);
      // Remove any non-digit character for the raw internal state
      setRawNumber(cleanNum.replace(/\D/g, ''));
    }
  }, []);

  // Format the number based on the country
  const formatNumber = (num: string, countryCode: string) => {
    if (!num) return '';
    
    // NANP (North American Numbering Plan) format for +1
    if (countryCode === '+1') {
      const match = num.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
      }
      return num;
    }
    
    // Generic format for other countries (group by 3 or 4)
    const match = num.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
        return !match[2] ? match[1] : `${match[1]} ${match[2]}${match[3] ? ' ' + match[3] : ''}`;
    }
    return num;
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const inputVal = e.target.value.replace(/\D/g, '');
    
    // Limit length (10 digits for US/DO, up to 15 for others based on standard)
    const maxLength = selectedCountry.dialCode === '+1' ? 10 : 12;
    const truncated = inputVal.substring(0, maxLength);
    
    setRawNumber(truncated);
    
    // Emit the full E.164 number to parent
    if (truncated) {
      onChange(`${selectedCountry.dialCode}${truncated}`);
    } else {
      onChange('');
    }
  };

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country);
    setIsOpen(false);
    if (rawNumber) {
      onChange(`${country.dialCode}${rawNumber}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedDisplay = formatNumber(rawNumber, selectedCountry.dialCode);

  return (
    <div className={`relative flex items-center bg-white border border-gray-100/80 rounded-2xl md:rounded-[32px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus-within:shadow-[0_8px_30px_rgba(59,130,246,0.1)] focus-within:border-vuttik-blue/30 transition-all ${className}`} ref={containerRef}>
      
      {/* Country Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 md:gap-2 pl-4 md:pl-6 pr-2 md:pr-4 py-4 md:py-6 h-full text-lg hover:bg-gray-50/50 rounded-l-2xl md:rounded-l-[32px] transition-colors"
        >
          <span className="text-xl md:text-2xl">{selectedCountry.flag}</span>
          <span className="text-xs md:text-sm font-bold text-vuttik-navy">{selectedCountry.dialCode}</span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-[100] top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden flex flex-col"
            >
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar país o código..." 
                      className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-vuttik-blue/50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {COUNTRIES.filter(c => 
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    c.dialCode.includes(searchQuery)
                  ).map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-vuttik-blue/5 transition-colors ${selectedCountry.code === country.code ? 'bg-vuttik-blue/10' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{country.flag}</span>
                    <span className="text-sm font-medium text-vuttik-navy">{country.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500">{country.dialCode}</span>
                </button>
              ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-100" />

      {/* Number Input */}
      <input
        type="tel"
        value={formattedDisplay}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none px-4 md:px-6 py-4 md:py-6 text-sm md:text-lg font-bold text-vuttik-navy outline-none placeholder:text-gray-300 w-full"
      />
    </div>
  );
}
