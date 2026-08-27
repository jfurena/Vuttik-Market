import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
  }).format(amount)
    .replace(/\s+/g, '\u00A0')
    .replace(/-/g, '\u2011');
}

export function generateReceiptCode() {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `REC-${timestamp}-${random}`;
}


export function getActiveProductPrice(product: any): { price: number, isDiscounted: boolean } {
  if (!product.oferta_activa || !product.precio_oferta) {
    return { price: product.precio_venta, isDiscounted: false };
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const start = product.oferta_inicio;
  const end = product.oferta_fin;
  
  // If dates are provided, check if today is within range
  if (start && start > today) return { price: product.precio_venta, isDiscounted: false };
  if (end && end < today) return { price: product.precio_venta, isDiscounted: false };
  
  // Is discounted
  return { price: product.precio_oferta, isDiscounted: true };
}
