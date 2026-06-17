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
  const [selectedType, setSelectedType] = useState('buy');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; label: string; icon: string }[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

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

  const handleCategoryClick = (cat: Category) => {
    if (cat.id === 'GLOBAL') {
      onSelectCategory('GLOBAL', selectedType);
    } else {
      onSelectCategory(cat.id, selectedType);
    }
  };

  const getIcon = (name: string) => (LucideIcons as any)[name] || LayoutGrid;

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-6 px-4 md:px-6">
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="font-headline-lg md:text-display-sm font-bold text-vuttik-navy">Explorar Mercado</h2>
            <p className="text-on-surface-variant max-w-md font-body-md text-body-md">Descubre productos y servicios premium seleccionados en nuestro ecosistema verificado.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 mb-4 mt-2">
        <div className="flex flex-row items-center bg-white border border-gray-200/60 shadow-sm rounded-full p-1 sm:p-1.5 gap-1 sm:gap-2 max-w-xl mx-auto md:mx-0">
          <div className="flex items-center shrink-0 px-2 sm:px-3">
            <span className="hidden sm:inline text-[13px] font-black tracking-wide text-gray-400 uppercase mr-2">Quiero:</span>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 sm:h-10 bg-transparent text-vuttik-blue font-black focus:outline-none cursor-pointer border-none text-xs sm:text-sm pl-0"
            >
              {transactionTypes.length > 0 ? transactionTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label.toUpperCase()}</option>
              )) : (
                <>
                  <option value="buy">COMPRAR</option>
                  <option value="sell">VENDER</option>
                  <option value="rent">ALQUILAR</option>
                </>
              )}
            </select>
          </div>
          
          <div className="w-[1px] h-6 sm:h-8 bg-gray-100 shrink-0"></div>

          <div className="relative flex-1 w-full flex items-center px-1 sm:px-2">
            <Search className="text-gray-400 shrink-0" size={16} />
            <input 
              type="text"
              placeholder="Buscar categoría..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full h-9 sm:h-10 pl-2 pr-2 bg-transparent border-none outline-none text-xs sm:text-sm font-medium placeholder-gray-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full mt-2">
          {allCategories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).map((cat, index) => {
            const Icon = getIcon(cat.icon);
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleCategoryClick(cat)}
                className="group relative bg-white border border-gray-100 p-6 md:p-8 rounded-[32px] text-left hover:shadow-pro-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden shadow-pro flex flex-col justify-between min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-vuttik-blue bg-blue-50/50 mb-4 group-hover:scale-110 transition-transform duration-300 border border-blue-100/50">
                  <Icon size={24} />
                </div>
                
                <div>
                    <h3 className="text-xl font-display font-black text-gray-900 group-hover:text-vuttik-blue transition-colors">{cat.name}</h3>
                    <p className="text-gray-400 text-xs mt-1 font-medium line-clamp-2">{cat.description || `Explorar ${cat.name.toLowerCase()}`}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
