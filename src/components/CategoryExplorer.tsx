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
  GLOBAL: 'bg-vuttik-navy'
};

const PALETTE = [
  'bg-blue-500', 'bg-red-500', 'bg-emerald-500', 'bg-amber-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-violet-500',
  'bg-orange-500', 'bg-sky-500'
];
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
      onSelectCategory('GLOBAL', 'buy');
    } else {
      setSelectedCategory(cat);
    }
  };

  const getIcon = (name: string) => (LucideIcons as any)[name] || LayoutGrid;
  const getColor = (name: string) => {
    if (COLOR_MAP[name]) return COLOR_MAP[name];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-6">
      <div className="flex flex-col gap-1 md:gap-2">
        <div className="flex items-center gap-2 text-vuttik-blue font-black text-[8px] md:text-[10px] uppercase tracking-widest">
          <ShieldCheck size={12} className="md:size-[14px]" />
          Categorías por Consenso (Mega Guardianes)
        </div>
        <h2 className="text-2xl md:text-4xl font-display font-black text-on-surface">¿Qué buscas hoy?</h2>
        <p className="text-on-surface-variant text-sm md:text-lg">Explora categorías validadas por la comunidad.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar categoría..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-100/80 rounded-[24px] md:rounded-[32px] px-14 md:px-16 py-4 md:py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] focus:shadow-[0_8px_30px_rgba(59,130,246,0.1)] focus:border-vuttik-blue/30 transition-all outline-none text-sm md:text-lg font-medium placeholder:text-gray-400"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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
              className="group relative bg-white border border-gray-100/60 p-8 md:p-10 rounded-[32px] md:rounded-[40px] text-left hover:shadow-pro-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden shadow-pro"
            >
              <div className={`w-14 h-14 md:w-16 md:h-16 ${color} rounded-full md:rounded-3xl flex items-center justify-center text-white mb-6 md:mb-8 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                <Icon size={28} className="md:size-8" />
              </div>
              
              <h3 className="text-xl md:text-2xl font-display font-black text-gray-900 mb-2 md:mb-3 group-hover:text-vuttik-blue transition-colors">{cat.name}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 md:mb-8 line-clamp-2 md:line-clamp-none font-medium">{cat.description || `Explora el mercado de ${cat.name}`}</p>
              
              <div className="flex items-center gap-2 text-vuttik-blue font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">
                Explorar Mercado
                <ChevronRight size={14} className="md:size-4 group-hover:translate-x-1.5 transition-transform" />
              </div>

              <div className={`absolute -right-4 -bottom-4 w-32 h-32 md:w-40 md:h-40 ${color} opacity-[0.02] rounded-full group-hover:scale-[2] transition-transform duration-700 ease-out`} />
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
                className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-on-surface"
              >
                <X size={24} />
              </button>

              <div className={`w-20 h-20 ${getColor(selectedCategory.name)} rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl`}>
                {(() => {
                  const Icon = getIcon(selectedCategory.icon);
                  return <Icon size={40} />;
                })()}
              </div>

              <h3 className="text-3xl font-display font-black text-on-surface mb-2">{selectedCategory.name}</h3>
              <p className="text-on-surface-variant mb-6 text-sm">{selectedCategory.description}</p>
              <p className="text-on-surface-variant mb-10 font-bold">¿Qué deseas hacer en esta categoría?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedCategory.allowedTypes.map(typeId => {
                  const type = transactionTypes.find(t => t.id === typeId);
                  return (
                    <button 
                      key={typeId}
                      onClick={() => onSelectCategory(selectedCategory.id, typeId)}
                      className="flex flex-col items-center gap-4 p-8 bg-surface-container rounded-[32px] hover:bg-vuttik-blue hover:text-white transition-all group"
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
          <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center text-gray-300 mb-4">
            <Search size={40} />
          </div>
          <h3 className="text-xl font-bold text-on-surface">No encontramos esa categoría</h3>
          <p className="text-on-surface-variant mb-6">Prueba con términos más generales o explora el Global.</p>
          <button 
            onClick={async () => {
              const name = prompt('¿Qué categoría sugieres que agreguemos?');
              if (!name) return;
              try {
                // Generar id estilo uuid simple o timestamp
                const id = 'cat_' + Date.now();
                await api.submitCategoryProposal({
                  id,
                  name,
                  suggested_by_id: 'user', // En un caso real usar currentUser
                  suggested_by_name: 'Comunidad'
                });
                alert('¡Sugerencia enviada! Los guardianes votarán si se aprueba tu categoría en los próximos 2 días.');
              } catch (e) {
                alert('Error al enviar sugerencia.');
              }
            }}
            className="px-6 py-3 bg-vuttik-blue text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-vuttik-blue/20"
          >
            Sugerir Nueva Categoría
          </button>
        </div>
      )}
    </div>
  );
}
