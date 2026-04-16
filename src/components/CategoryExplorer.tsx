import { useState, useEffect } from 'react';
import { Search, Utensils, Landmark, DollarSign, Car, Laptop, Home, Briefcase, Globe, ChevronRight, ArrowUpCircle, ArrowDownCircle, ShieldCheck, X, LayoutGrid, ShoppingBag, CarFront, Smartphone, BriefcaseBusiness, Key, Banknote, MapPin, Tag } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';

interface Category {
  id: string;
  name: string;
  icon: string;
  allowedTypes: string[];
  order: number;
  active: boolean;
  description?: string;
  color?: string;
}

const ICON_MAP: Record<string, any> = {
  Utensils, Landmark, DollarSign, Car, Laptop, Home, Briefcase, Globe, ShoppingBag, CarFront, Smartphone, BriefcaseBusiness, Key, Banknote, LayoutGrid, MapPin
};

const COLOR_MAP: Record<string, string> = {
  Comida: 'bg-orange-500',
  Terrenos: 'bg-emerald-600',
  Divisas: 'bg-vuttik-blue',
  Vehículos: 'bg-red-500',
  Electrónica: 'bg-blue-600',
  Hogar: 'bg-amber-600',
  Empleo: 'bg-purple-600',
  Alquiler: 'bg-indigo-600',
  Préstamo: 'bg-cyan-600',
  GLOBAL: 'bg-vuttik-navy'
};

interface CategoryExplorerProps {
  onSelectCategory: (categoryId: string, type: string) => void;
}

const CategoryIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LayoutGrid;
  return <IconComponent size={size} className={className} />;
};

export default function CategoryExplorer({ onSelectCategory }: CategoryExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; label: string; icon: string }[]>([]);

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

  const allCategories = [
    { id: 'GLOBAL', name: 'Todo el Mercado', icon: 'Globe', color: 'bg-vuttik-navy', description: 'Explora todas las publicaciones sin filtros', allowedTypes: ['sell', 'buy'], order: 0, active: true },
    ...categories
  ];

  const filteredCategories = allCategories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (cat: Category) => {
    if (cat.id === 'GLOBAL') {
      onSelectCategory('GLOBAL', 'sell');
    } else {
      setSelectedCategory(cat);
    }
  };

  const getIcon = (name: string) => ICON_MAP[name] || LayoutGrid;
  const getColor = (name: string) => COLOR_MAP[name] || 'bg-vuttik-navy';

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-6">
      <div className="flex flex-col gap-1 md:gap-2">
        <div className="flex items-center gap-2 text-vuttik-blue font-black text-[8px] md:text-[10px] uppercase tracking-widest">
          <ShieldCheck size={12} className="md:size-[14px]" />
          Categorías por Consenso (Mega Guardianes)
        </div>
        <h2 className="text-2xl md:text-4xl font-display font-black text-vuttik-navy">¿Qué buscas hoy?</h2>
        <p className="text-vuttik-text-muted text-sm md:text-lg">Explora categorías validadas por la comunidad.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={20} />
        <input 
          type="text" 
          placeholder="Buscar categoría..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-vuttik-gray border-none rounded-2xl md:rounded-[32px] px-12 md:px-16 py-4 md:py-6 focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none text-sm md:text-lg font-medium"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredCategories.map((cat, index) => {
          const Icon = getIcon(cat.icon);
          const color = getColor(cat.name);
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleCategoryClick(cat)}
              className="group relative bg-white border border-gray-100 p-6 md:p-8 rounded-[32px] md:rounded-[40px] text-left hover:shadow-2xl hover:shadow-vuttik-navy/5 hover:border-vuttik-blue/20 transition-all duration-300 overflow-hidden"
            >
              <div className={`w-12 h-12 md:w-16 md:h-16 ${color} rounded-2xl md:rounded-3xl flex items-center justify-center text-white mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <Icon size={24} className="md:size-8" />
              </div>
              
              <h3 className="text-xl md:text-2xl font-display font-black text-vuttik-navy mb-1 md:mb-2">{cat.name}</h3>
              <p className="text-vuttik-text-muted text-xs md:text-sm leading-relaxed mb-4 md:mb-6 line-clamp-2 md:line-clamp-none">{cat.description || `Explora el mercado de ${cat.name}`}</p>
              
              <div className="flex items-center gap-2 text-vuttik-blue font-black text-[10px] md:text-xs uppercase tracking-widest">
                Explorar Mercado
                <ChevronRight size={14} className="md:size-4 group-hover:translate-x-1 transition-transform" />
              </div>

              <div className={`absolute -right-4 -bottom-4 w-20 h-20 md:w-24 md:h-24 ${color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500`} />
            </motion.button>
          );
        })}
      </div>

      {/* Binary Selection Modal (Dynamic based on Category) */}
      <AnimatePresence>
        {selectedCategory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCategory(null)}
              className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[48px] p-10 shadow-2xl text-center"
            >
              <button 
                onClick={() => setSelectedCategory(null)}
                className="absolute top-6 right-6 p-2 text-vuttik-text-muted hover:text-vuttik-navy"
              >
                <X size={24} />
              </button>

              <div className={`w-20 h-20 ${getColor(selectedCategory.name)} rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl`}>
                {(() => {
                  const Icon = getIcon(selectedCategory.icon);
                  return <Icon size={40} />;
                })()}
              </div>

              <h3 className="text-3xl font-display font-black text-vuttik-navy mb-2">{selectedCategory.name}</h3>
              <p className="text-vuttik-text-muted mb-10">¿Qué deseas hacer en esta categoría?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedCategory.allowedTypes.map(typeId => {
                  const type = transactionTypes.find(t => t.id === typeId);
                  return (
                    <button 
                      key={typeId}
                      onClick={() => onSelectCategory(selectedCategory.id, typeId)}
                      className="flex flex-col items-center gap-4 p-8 bg-vuttik-gray rounded-[32px] hover:bg-vuttik-blue hover:text-white transition-all group"
                    >
                      <CategoryIcon name={type?.icon || 'Tag'} size={48} className="text-vuttik-blue group-hover:text-white" />
                      <span className="font-black uppercase tracking-widest text-sm">{type?.label || typeId}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-vuttik-gray rounded-full flex items-center justify-center text-gray-300 mb-4">
            <Search size={40} />
          </div>
          <h3 className="text-xl font-bold text-vuttik-navy">No encontramos esa categoría</h3>
          <p className="text-vuttik-text-muted">Prueba con términos más generales o explora el Global.</p>
        </div>
      )}
    </div>
  );
}
