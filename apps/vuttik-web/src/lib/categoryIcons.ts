/**
 * Registro explícito de iconos para categorías.
 *
 * Antes se resolvían con `import * as LucideIcons from 'lucide-react'` y un
 * acceso dinámico `LucideIcons[nombre]`. Un import de espacio de nombres impide
 * el tree-shaking: Rollup no puede saber qué propiedades se leerán en tiempo de
 * ejecución, así que incluía los ~1500 iconos de la librería. El resultado eran
 * 795 KB de JavaScript para usar un puñado.
 *
 * Al enumerarlos aquí, el empaquetador incluye solo estos. Añadir uno nuevo es
 * una línea; el coste es explícito y visible.
 */
import {
  LayoutGrid, Tag, Globe, ShoppingBag, ShoppingCart, Store, Package,
  // Alimentación y bebidas
  Apple, Beef, Cake, Coffee, CupSoda, Fish, IceCream, Milk, Pizza, Sandwich,
  Utensils, Wine, Wheat, Egg, Carrot,
  // Hogar y limpieza
  Home, Sofa, Bed, Lamp, Refrigerator, WashingMachine, Droplets, SprayCan,
  Trash2, Hammer, Wrench, PaintRoller, Plug,
  // Tecnología
  Smartphone, Laptop, Monitor, Headphones, Camera, Tv, Gamepad2, HardDrive,
  Battery, Printer,
  // Moda y cuidado personal
  Shirt, Footprints, Watch, Glasses, Scissors, Sparkles, HeartPulse, Pill,
  Stethoscope, Baby,
  // Transporte
  Car, Bike, Truck, Fuel, Plane,
  // Ocio y otros
  Book, Music, Dumbbell, Trophy, PawPrint, Flower2, TreePine, Gift, Palette,
  Briefcase, GraduationCap, Wallet, Building2, MapPin, DollarSign, Banknote,
  Key, ArrowUpCircle, ArrowDownCircle, Percent, Star, Heart, Zap, Clock,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

/** Nombre de icono -> componente. Las claves son las que se guardan en la base. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  LayoutGrid, Tag, Globe, ShoppingBag, ShoppingCart, Store, Package,
  Apple, Beef, Cake, Coffee, CupSoda, Fish, IceCream, Milk, Pizza, Sandwich,
  Utensils, Wine, Wheat, Egg, Carrot,
  Home, Sofa, Bed, Lamp, Refrigerator, WashingMachine, Droplets, SprayCan,
  Trash2, Hammer, Wrench, PaintRoller, Plug,
  Smartphone, Laptop, Monitor, Headphones, Camera, Tv, Gamepad2, HardDrive,
  Battery, Printer,
  Shirt, Footprints, Watch, Glasses, Scissors, Sparkles, HeartPulse, Pill,
  Stethoscope, Baby,
  Car, Bike, Truck, Fuel, Plane,
  Book, Music, Dumbbell, Trophy, PawPrint, Flower2, TreePine, Gift, Palette,
  Briefcase, GraduationCap, Wallet, Building2, MapPin, DollarSign, Banknote,
  Key, ArrowUpCircle, ArrowDownCircle, Percent, Star, Heart, Zap, Clock,
};

/** Icono para un nombre guardado. Cae en LayoutGrid si no se reconoce. */
export function getCategoryIcon(name?: string | null): LucideIcon {
  if (!name) return LayoutGrid;
  return CATEGORY_ICONS[name] || LayoutGrid;
}

/** Nombres disponibles, para ofrecerlos en un selector. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);
