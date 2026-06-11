import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Search, ShoppingCart, Calculator, Trash2, Plus, Minus, 
  Share2, Copy, Send, RotateCcw, User, Phone, Calendar, Download, 
  CheckCircle2, AlertCircle, Info, Hash, Printer, FileSpreadsheet, Scale
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Product, UnitType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface QuoteItem {
  product: Product;
  quantity: number;
  pesosValue: string; // Helper for bidirectional input
  customPrice?: number;
}

interface SavedQuote {
  id: string;
  clientName: string;
  clientPhone: string;
  items: {
    productName: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    unitType: UnitType;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  taxRate?: number; // BIZ-009: stored to avoid recalculation bugs with discounts
  total: number;
  date: string;
  notes: string;
}

interface QuoteDraft {
  id: string;
  name: string;
  clientName: string;
  clientPhone: string;
  items: QuoteItem[];
  discountType: 'percent' | 'fixed';
  discountValue: string;
  taxRate: number;
  notes: string;
  createdAt: string;
  lastModified: string;
}

export default function Quotations() {
  const { profile } = useAuth();
  // DAT-005: Build localStorage keys scoped to the active business
  const businessId = profile?.business_id || profile?.id || 'default';
  const QUOTE_HISTORY_KEY = `vuttik_quotations_history_${businessId}`;
  const QUOTE_DRAFTS_KEY = `vuttik_quotation_drafts_${businessId}`;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  
  // Current quote state
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<number>(0); // Default No Tax
  const [notes, setNotes] = useState('');

  // Draft Quotes multi-process system variables
  const [drafts, setDrafts] = useState<QuoteDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string>('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // History of saved quotes
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // UI States
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showPdfSimulator, setShowPdfSimulator] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Bidirectional weight calculator helper states
  const [activeWeightItemIdx, setActiveWeightItemIdx] = useState<number | null>(null);
  const [tempWeightPesos, setTempWeightPesos] = useState('');
  const [tempWeightQty, setTempWeightQty] = useState('');

  // Fetch products and initialize drafts
  useEffect(() => {
    setLoading(true);
    ApiService.getProducts()
      .then(data => {
        // Filter only active products
        const activeProducts = data.filter(p => p.estado === 'activo');
        setProducts(activeProducts);
      })
      .catch(err => {
        console.error("Error loading products for quote page:", err);
      });

    // Load saved quotes from local storage
    const stored = localStorage.getItem(QUOTE_HISTORY_KEY);
    if (stored) {
      try {
        setSavedQuotes(JSON.parse(stored));
      } catch (e) {
        console.warn('[Quotations] Error en operación secundaria (no crítico):', e);
      }
    }

    // Load active drafts from local storage
    const storedDrafts = localStorage.getItem(QUOTE_DRAFTS_KEY);
    let loadedDrafts: QuoteDraft[] = [];
    if (storedDrafts) {
      try {
        loadedDrafts = JSON.parse(storedDrafts);
      } catch (e) {
        console.warn('[Quotations] Error en operación secundaria (no crítico):', e);
      }
    }

    if (loadedDrafts.length === 0) {
      const newId = `DRAFT-${Date.now()}`;
      const defaultDraft: QuoteDraft = {
        id: newId,
        name: 'Borrador #1',
        clientName: '',
        clientPhone: '',
        items: [],
        discountType: 'percent',
        discountValue: '0',
        taxRate: 0,
        notes: '',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      loadedDrafts = [defaultDraft];
      localStorage.setItem(QUOTE_DRAFTS_KEY, JSON.stringify(loadedDrafts));
    }

    setDrafts(loadedDrafts);
    
    // Select the first draft on initialize
    const firstDraft = loadedDrafts[0];
    setQuoteItems(firstDraft.items);
    setClientName(firstDraft.clientName);
    setClientPhone(firstDraft.clientPhone);
    setDiscountType(firstDraft.discountType);
    setDiscountValue(firstDraft.discountValue);
    setTaxRate(firstDraft.taxRate);
    setNotes(firstDraft.notes);
    setActiveDraftId(firstDraft.id);
    setLoading(false);
  }, []);

  // Set up auto-saving of changes to current active draft
  useEffect(() => {
    if (loading || isSwitching || !activeDraftId) return;

    setDrafts(prevDrafts => {
      const idx = prevDrafts.findIndex(d => d.id === activeDraftId);
      if (idx === -1) return prevDrafts;

      const currentDraft = prevDrafts[idx];
      const itemsChanged = JSON.stringify(currentDraft.items) !== JSON.stringify(quoteItems);
      const nameChanged = currentDraft.clientName !== clientName;
      const phoneChanged = currentDraft.clientPhone !== clientPhone;
      const discTypeChanged = currentDraft.discountType !== discountType;
      const discValChanged = currentDraft.discountValue !== discountValue;
      const taxChanged = currentDraft.taxRate !== taxRate;
      const notesChanged = currentDraft.notes !== notes;

      if (!itemsChanged && !nameChanged && !phoneChanged && !discTypeChanged && !discValChanged && !taxChanged && !notesChanged) {
        return prevDrafts;
      }

      // Automatically rename based on Client Name
      let dynamicName = currentDraft.name;
      if (clientName.trim()) {
        dynamicName = `Para: ${clientName.trim()}`;
      } else if (currentDraft.name.startsWith('Para:')) {
        dynamicName = `Borrador #${currentDraft.id.slice(-4)}`;
      }

      const updatedDraft: QuoteDraft = {
        ...currentDraft,
        name: dynamicName,
        clientName,
        clientPhone,
        items: quoteItems,
        discountType,
        discountValue,
        taxRate,
        notes,
        lastModified: new Date().toISOString()
      };

      const updatedList = prevDrafts.map((d, i) => i === idx ? updatedDraft : d);
      localStorage.setItem(QUOTE_DRAFTS_KEY, JSON.stringify(updatedList));
      return updatedList;
    });
  }, [quoteItems, clientName, clientPhone, discountType, discountValue, taxRate, notes, activeDraftId, loading, isSwitching]);

  // Select another draft and map state variables
  const selectDraft = (draft: QuoteDraft) => {
    setIsSwitching(true);
    setQuoteItems(draft.items);
    setClientName(draft.clientName);
    setClientPhone(draft.clientPhone);
    setDiscountType(draft.discountType);
    setDiscountValue(draft.discountValue);
    setTaxRate(draft.taxRate);
    setNotes(draft.notes);
    setActiveDraftId(draft.id);
    setTimeout(() => {
      setIsSwitching(false);
    }, 50);
  };

  // Create a brand new blank draft quotation
  const createNewDraft = (existingList?: QuoteDraft[]) => {
    const list = existingList || drafts;
    const newId = `DRAFT-${Date.now()}`;
    const nextNumber = list.length + 1;
    const newDraft: QuoteDraft = {
      id: newId,
      name: `Borrador #${nextNumber}`,
      clientName: '',
      clientPhone: '',
      items: [],
      discountType: 'percent',
      discountValue: '0',
      taxRate: 0,
      notes: '',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const updated = [...list, newDraft];
    setDrafts(updated);
    localStorage.setItem(QUOTE_DRAFTS_KEY, JSON.stringify(updated));
    selectDraft(newDraft);
    showFeedback("¡Nuevo borrador de cotización creado!");
  };

  // Delete an existing draft
  const deleteDraft = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    
    if (drafts.length === 1) {
      showFeedback("No puedes eliminar el único borrador activo. Limpia sus campos en su lugar.");
      return;
    }

    if (confirmDeleteId === idToDelete) {
      const updatedList = drafts.filter(d => d.id !== idToDelete);
      setDrafts(updatedList);
      localStorage.setItem(QUOTE_DRAFTS_KEY, JSON.stringify(updatedList));
      
      // If deleting the active draft, switch to first remaining
      if (activeDraftId === idToDelete) {
        const remainingDraft = updatedList[0];
        selectDraft(remainingDraft);
      }
      setConfirmDeleteId(null);
      showFeedback("Borrador eliminado");
    } else {
      setConfirmDeleteId(idToDelete);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === idToDelete ? null : prev);
      }, 3000);
    }
  };

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.codigo_barra.includes(searchQuery) ||
                          p.marca.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'TODOS' || p.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Extract list of all unique categories
  const categories = ['TODOS', ...Array.from(new Set(products.map(p => p.categoria)))];

  // Helper calculation details
  const subtotal = quoteItems.reduce((acc, item) => {
    const price = item.customPrice ?? item.product.precio_venta;
    return acc + (item.quantity * price);
  }, 0);

  // Calculate discount amount
  const numericDiscount = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'percent' 
    ? (subtotal * (numericDiscount / 100)) 
    : numericDiscount;

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  // Add a product to the quotation draft
  const handleAddProduct = (product: Product) => {
    const existingIdx = quoteItems.findIndex(item => item.product.id === product.id);
    if (existingIdx > -1) {
      // Just increase quantity
      const updated = [...quoteItems];
      const newQty = updated[existingIdx].quantity + 1;
      updated[existingIdx].quantity = newQty;
      updated[existingIdx].pesosValue = (newQty * product.precio_venta).toFixed(2);
      setQuoteItems(updated);
    } else {
      // Add new
      setQuoteItems([
        ...quoteItems,
        {
          product,
          quantity: 1,
          pesosValue: product.precio_venta.toFixed(2)
        }
      ]);
    }
  };

  // Bidirectional values calculation: when user modifies the quantity input
  const handleItemQuantityChange = (idx: number, valStr: string) => {
    const updated = [...quoteItems];
    const qty = parseFloat(valStr);
    updated[idx].quantity = isNaN(qty) ? 0 : qty;
    
    // Auto-update pesos value
    const p = updated[idx].product;
    const price = updated[idx].customPrice ?? p.precio_venta;
    if (!isNaN(qty)) {
      updated[idx].pesosValue = (qty * price).toFixed(2);
    } else {
      updated[idx].pesosValue = '';
    }
    setQuoteItems(updated);
  };

  // Bidirectional values calculation: when user modifies the amount in pesos (RD$)
  const handleItemPesosChange = (idx: number, pesoStr: string) => {
    const updated = [...quoteItems];
    updated[idx].pesosValue = pesoStr;
    const pesos = parseFloat(pesoStr);
    const p = updated[idx].product;
    const price = updated[idx].customPrice ?? p.precio_venta;

    if (!isNaN(pesos) && pesos > 0) {
      const calculatedWeight = pesos / price;
      // Truncate to 3 decimal places for weighed commodities, or round naturally
      const decimalPoints = (p.unidad_venta === UnitType.LIBRA || p.unidad_venta === UnitType.KILOGRAMO) ? 3 : 2;
      updated[idx].quantity = Number(calculatedWeight.toFixed(decimalPoints));
    } else {
      updated[idx].quantity = 0;
    }
    setQuoteItems(updated);
  };

  // Modify unit price directly in quotation (employee liberty feature)
  const handleItemCustomPriceChange = (idx: number, priceStr: string) => {
    const updated = [...quoteItems];
    const customPriceVal = parseFloat(priceStr);
    if (!isNaN(customPriceVal) && customPriceVal >= 0) {
      updated[idx].customPrice = customPriceVal;
      // Recalculate pesos value based on new custom unit price
      updated[idx].pesosValue = (updated[idx].quantity * customPriceVal).toFixed(2);
    } else {
      updated[idx].customPrice = undefined;
      updated[idx].pesosValue = (updated[idx].quantity * updated[idx].product.precio_venta).toFixed(2);
    }
    setQuoteItems(updated);
  };

  const incrementItem = (idx: number) => {
    const updated = [...quoteItems];
    updated[idx].quantity += 1;
    const price = updated[idx].customPrice ?? updated[idx].product.precio_venta;
    updated[idx].pesosValue = (updated[idx].quantity * price).toFixed(2);
    setQuoteItems(updated);
  };

  const decrementItem = (idx: number) => {
    const updated = [...quoteItems];
    if (updated[idx].quantity > 1) {
      updated[idx].quantity -= 1;
      const price = updated[idx].customPrice ?? updated[idx].product.precio_venta;
      updated[idx].pesosValue = (updated[idx].quantity * price).toFixed(2);
      setQuoteItems(updated);
    } else {
      handleRemoveItem(idx);
    }
  };

  const handleRemoveItem = (idx: number) => {
    const updated = quoteItems.filter((_, i) => i !== idx);
    setQuoteItems(updated);
  };

  const clearQuote = () => {
    if (window.confirm("¿Estás seguro de que quieres limpiar la cotización actual?")) {
      setQuoteItems([]);
      setClientName('');
      setClientPhone('');
      setDiscountValue('0');
      setTaxRate(0);
      setNotes('');
    }
  };

  // Create text representation for sharing (WhatsApp, clipboard, etc.)
  const generateQuotationText = () => {
    const dateStr = new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
    let text = `*📄 COTIZACIÓN DE VENTA - VUTTIK MARKET*\n`;
    text += `*Establecimiento:* Santo Domingo, RD\n`;
    text += `*Fecha:* ${dateStr}\n`;
    if (clientName) text += `*Cliente:* ${clientName}\n`;
    if (clientPhone) text += `*Teléfono:* ${clientPhone}\n`;
    text += `-------------------------------------------\n\n`;
    
    quoteItems.forEach((item, idx) => {
      const p = item.product;
      const price = item.customPrice ?? p.precio_venta;
      const unit = p.unidad_venta.toLowerCase();
      const itemSubtotal = item.quantity * price;
      text += `*${idx + 1}. ${p.nombre}*\n`;
      text += `   Cant: ${item.quantity} ${unit} x ${formatCurrency(price)} = *${formatCurrency(itemSubtotal)}*\n`;
    });
    
    text += `\n-------------------------------------------\n`;
    text += `*Subtotal:* ${formatCurrency(subtotal)}\n`;
    if (discountAmount > 0) {
      text += `*Descuento (${discountType === 'percent' ? discountValue + '%' : 'monto fijo'}):* -${formatCurrency(discountAmount)}\n`;
    }
    if (taxAmount > 0) {
      text += `*ITBIS (${taxRate}%):* ${formatCurrency(taxAmount)}\n`;
    }
    text += `*TOTAL ESTIMADO:* ${formatCurrency(total)}\n\n`;
    
    if (notes) {
      text += `*Notas:* ${notes}\n`;
    }
    text += `_Precios sujetos a cambio. Gracias por preferirnos._`;
    return text;
  };

  const handleCopyToClipboard = () => {
    const text = generateQuotationText();
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      showFeedback('¡Cotización copiada al portapapeles!');
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(e => {
      console.error(e);
      showFeedback('Error al copiar. Intenta manualmente.');
    });
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateQuotationText());
    let url = `https://wa.me/`;
    if (clientPhone) {
      // Clean up phone characters
      const cleanedPhone = clientPhone.replace(/\D/g, '');
      url += cleanedPhone;
    }
    url += `?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShareSuccess(true);
    showFeedback('Abriendo WhatsApp...');
    setTimeout(() => setShareSuccess(false), 2000);
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Save the quotation permanently in local history list
  const handleSaveToHistory = () => {
    if (quoteItems.length === 0) {
      showFeedback("Agrega productos antes de guardar la cotización");
      return;
    }
    
    const newSaved: SavedQuote = {
      id: `COT-${Date.now().toString().slice(-6)}`,
      clientName: clientName || 'Cliente General',
      clientPhone: clientPhone || '',
      items: quoteItems.map(item => {
        const p = item.product;
        const price = item.customPrice ?? p.precio_venta;
        return {
          productId: p.id,
          productName: p.nombre,
          quantity: item.quantity,
          unitPrice: price,
          unitType: p.unidad_venta,
          total: item.quantity * price
        };
      }),
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      taxRate: taxRate, // BIZ-009: save original tax rate to avoid recalculation bugs with discounts
      total,
      date: new Date().toLocaleString('es-DO'),
      notes: notes
    };

    const newHistory = [newSaved, ...savedQuotes];
    setSavedQuotes(newHistory);
    localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(newHistory));
    
    // Log the activity to the backend
    try {
      const userStr = localStorage.getItem('invuttarik_session');
      const user = userStr ? JSON.parse(userStr) : null;
      ApiService.postActivityLog({
        usuario_nombre: user?.nombre || 'Dueño',
        accion: 'Cotización Guardada',
        detalles: `Se guardó la cotización ${newSaved.id} por ${formatCurrency(total)} para el cliente ${newSaved.clientName}`,
        modulo: 'Cotizador'
      });
    } catch(e) {
      console.warn('[Quotations] Error en operación secundaria (no crítico):', e);
    }

    showFeedback("¡Cotización guardada en el historial!");

    if (window.confirm("¡Cotización guardada en el historial! ¿Deseas vaciar este borrador para empezar una nueva cotización?")) {
      setQuoteItems([]);
      setClientName('');
      setClientPhone('');
      setDiscountValue('0');
      setTaxRate(0);
      setNotes('');
    }
  };

  const handleDeleteSavedQuote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(`¿Seguro que deseas eliminar la cotización ${id}?`)) {
      const quoteToDelete = savedQuotes.find(q => q.id === id);
      const filtered = savedQuotes.filter(q => q.id !== id);
      setSavedQuotes(filtered);
      localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(filtered));

      // Log the deletion
      try {
        const userStr = localStorage.getItem('invuttarik_session');
        const user = userStr ? JSON.parse(userStr) : null;
        ApiService.postActivityLog({
          usuario_nombre: user?.nombre || 'Dueño',
          accion: 'Eliminación de Cotización',
          detalles: `Se eliminó la cotización ${id} del cliente ${quoteToDelete?.clientName || 'General'} por ${formatCurrency(quoteToDelete?.total || 0)}`,
          modulo: 'Cotizador'
        });
      } catch(err) {
        console.warn('[Quotations] Error en operación secundaria (no crítico):', err);
      }
    }
  };

  const handleLoadSavedQuote = (quote: SavedQuote) => {
    // Reconstruct quoteItems state
    // Fetch products list or build temp product elements
    const reconstructedItems: QuoteItem[] = quote.items.map(savedItem => {
      // Find matching actual product
      const actualP = products.find(p => p.id === savedItem.productId);
      const productObj: Product = actualP || {
        id: savedItem.productId,
        nombre: savedItem.productName,
        codigo_barra: '',
        categoria: 'Cargado',
        marca: '',
        costo_compra: 0,
        precio_venta: savedItem.unitPrice,
        cantidad_disponible: 999,
        stock_minimo: 0,
        unidad_venta: savedItem.unitType,
        estado: 'activo',
        fecha_creacion: null,
        fecha_actualizacion: null
      };

      return {
        product: productObj,
        quantity: savedItem.quantity,
        pesosValue: savedItem.total.toFixed(2),
        customPrice: savedItem.unitPrice
      };
    });

    setQuoteItems(reconstructedItems);
    setClientName(quote.clientName === 'Cliente General' ? '' : quote.clientName);
    setClientPhone(quote.clientPhone);
    setDiscountType('fixed');
    setDiscountValue(quote.discount.toString());
    // BIZ-009 FIX: Use stored taxRate to avoid recalculation error when discount was applied
    if (quote.taxRate !== undefined) {
      setTaxRate(quote.taxRate);
    } else {
      // Fallback para cotizaciones antiguas sin taxRate guardado
      const calculated = quote.subtotal > 0 ? Math.round((quote.tax / quote.subtotal) * 100) : 0;
      setTaxRate(calculated);
    }
    setNotes(quote.notes);
    setShowHistoryModal(false);
    showFeedback(`Cotización ${quote.id} cargada`);
  };

  // Bidirectional weight helper logic modal trigger
  const openWeightCalculator = (idx: number) => {
    const item = quoteItems[idx];
    const price = item.customPrice ?? item.product.precio_venta;
    setActiveWeightItemIdx(idx);
    setTempWeightQty(item.quantity.toString());
    setTempWeightPesos((item.quantity * price).toFixed(2));
  };

  const handleWeightCalculatorPesosChange = (val: string) => {
    if (activeWeightItemIdx === null) return;
    setTempWeightPesos(val);
    const item = quoteItems[activeWeightItemIdx];
    const price = item.customPrice ?? item.product.precio_venta;
    const pesos = parseFloat(val);
    if (!isNaN(pesos) && pesos > 0) {
      setTempWeightQty((pesos / price).toFixed(3));
    } else {
      setTempWeightQty('');
    }
  };

  const handleWeightCalculatorQtyChange = (val: string) => {
    if (activeWeightItemIdx === null) return;
    setTempWeightQty(val);
    const item = quoteItems[activeWeightItemIdx];
    const price = item.customPrice ?? item.product.precio_venta;
    const qty = parseFloat(val);
    if (!isNaN(qty) && qty > 0) {
      setTempWeightPesos((qty * price).toFixed(2));
    } else {
      setTempWeightPesos('');
    }
  };

  const confirmWeightCalculator = () => {
    if (activeWeightItemIdx === null) return;
    const updated = [...quoteItems];
    const qty = parseFloat(tempWeightQty);
    updated[activeWeightItemIdx].quantity = isNaN(qty) ? 0 : qty;
    updated[activeWeightItemIdx].pesosValue = tempWeightPesos;
    setQuoteItems(updated);
    setActiveWeightItemIdx(null);
  };

  return (
    <div id="quotations-view-container" className="flex flex-col h-full space-y-6 font-sans">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-105">
            Módulo de Presupuestos
          </span>
          <h1 className="text-3xl font-black text-gray-950 tracking-tight uppercase leading-none mt-2 flex items-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600 shrink-0" />
            Cotizador de Productos
          </h1>
          <p className="text-gray-500 font-medium text-xs mt-1">
            Calcula presupuestos sin afectar el inventario y comparte detalles con tus clientes al instante.
          </p>
        </div>

        {/* Top Header controls integration */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
            Ver Historial ({savedQuotes.length})
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/10 shrink-0"
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
          <span>{feedbackMsg}</span>
        </motion.div>
      )}

      {/* 📥 Cotizaciones en Proceso (Drafts Management Bar) */}
      <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm shrink-0">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse animate-duration-1000" />
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Calculator className="h-4 w-4 text-gray-400" />
              Borradores y Cotizaciones en Proceso ({drafts.length})
            </h2>
          </div>
          <button
            onClick={() => createNewDraft()}
            className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0 font-bold" />
            Emparejar Nueva Cotización
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin select-none">
          {drafts.map((d) => {
            const isActive = d.id === activeDraftId;
            
            // Calculate total estimated for this draft
            const dSubtotal = d.items.reduce((acc, item) => {
              const price = item.customPrice ?? item.product.precio_venta;
              return acc + (item.quantity * price);
            }, 0);
            
            const dNumericDiscount = parseFloat(d.discountValue) || 0;
            const dDiscountAmount = d.discountType === 'percent' 
              ? (dSubtotal * (dNumericDiscount / 100)) 
              : dNumericDiscount;
            
            const dAfterDiscount = Math.max(0, dSubtotal - dDiscountAmount);
            const dTaxAmount = dAfterDiscount * (d.taxRate / 100);
            const dTotal = dAfterDiscount + dTaxAmount;

            return (
              <div
                key={d.id}
                onClick={() => selectDraft(d)}
                className={cn(
                  "px-4 py-3.5 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer transition-all shrink-0 relative group min-w-[210px]",
                  isActive
                    ? "bg-blue-50/70 border-blue-500 text-blue-955 shadow-sm ring-1 ring-blue-500/30"
                    : "bg-gray-55/70 hover:bg-gray-50 border-gray-150 text-gray-700 hover:border-gray-250"
                )}
              >
                <div className="space-y-1 pr-6 flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "font-extrabold text-xs max-w-[150px] truncate leading-tight block",
                      isActive ? "text-blue-900" : "text-gray-800"
                    )}>
                      {d.clientName ? d.clientName : `Borrador #${d.id.slice(-4)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">
                    <span className="font-mono text-blue-750 font-black">
                      {d.items.length} {d.items.length === 1 ? 'artículo' : 'artículos'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-emerald-700 font-extrabold">
                      {formatCurrency(dTotal)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => deleteDraft(e, d.id)}
                  className={cn(
                    "p-1.5 rounded-lg border-0 transition-opacity absolute right-2.5 top-1/2 -translate-y-1/2 z-20 cursor-pointer flex items-center gap-1",
                    confirmDeleteId === d.id
                      ? "opacity-100 bg-red-650 hover:bg-red-700 text-white animate-pulse"
                      : "text-gray-400 hover:text-red-600 hover:bg-red-50",
                    isActive || confirmDeleteId === d.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  title={confirmDeleteId === d.id ? "Haz clic de nuevo para eliminar" : "Eliminar borrador"}
                >
                  {confirmDeleteId === d.id ? (
                    <span className="text-[8px] font-black uppercase tracking-wider px-1">¿Eliminar?</span>
                  ) : (
                    <Trash2 className="h-4 w-4 shrink-0" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Core Layout: Catalog Product Picker on Left, Draft Quote Form on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-y-auto lg:overflow-hidden pb-10">
        {/* Left column (col-span-5): Product Picker Catalog */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] border border-gray-150 p-6 flex flex-col h-full min-h-[400px] lg:min-h-0 overflow-hidden shadow-sm">
          <div className="space-y-4 shrink-0 mb-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              1. Seleccionar Artículos
            </h3>

            {/* Core Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-450 h-4.5 w-4.5" />
              <input
                id="quote-catalog-search"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, código o marca..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900"
              />
            </div>

            {/* Categories horizontal list */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none select-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap border cursor-pointer transition-all",
                    selectedCategory === cat 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : "bg-gray-50 border-gray-100 text-gray-505 hover:bg-gray-100 hover:text-gray-800"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Vertical scrollable Grid */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {loading ? (
              <div className="h-40 flex items-center justify-center font-bold text-xs text-gray-400">
                <div className="animate-pulse">Cargando catálogo...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 p-4">
                <AlertCircle className="h-8 w-8 text-gray-300" />
                <p className="text-xs font-bold text-gray-450">No se encontraron productos en el catálogo</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const stockColor = p.cantidad_disponible <= p.stock_minimo 
                  ? "bg-red-50 text-red-650" 
                  : "bg-emerald-50 text-emerald-700";
                
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddProduct(p)}
                    className="p-3 bg-gray-55/70 hover:bg-blue-55 border border-gray-150/50 hover:border-blue-150 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99] group text-left"
                  >
                    <div className="space-y-1 pr-2 min-w-0">
                      <p className="text-xs font-extrabold text-gray-900 leading-tight truncate group-hover:text-blue-900">{p.nombre}</p>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">
                        <span className="truncate">{p.categoria}</span>
                        <span>•</span>
                        <span>{p.marca || 'Genérica'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${stockColor}`}>
                          Stock: {p.cantidad_disponible} {p.unidad_venta.toLowerCase()}(s)
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block font-mono font-black text-gray-950 text-xs">
                        {formatCurrency(p.precio_venta)}
                      </span>
                      <span className="text-[9px] font-bold text-gray-455 block">
                        por {p.unidad_venta}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column (col-span-7): Active quote form drafting */}
        <div className="lg:col-span-7 bg-white rounded-[2rem] border border-gray-150 p-6 flex flex-col h-full overflow-hidden shadow-sm">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4 shrink-0">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              2. Detalle de Cotización ({quoteItems.length} items)
            </h3>

            {quoteItems.length > 0 && (
              <button
                onClick={clearQuote}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border-0 cursor-pointer"
                title="Limpiar Cotización"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          {/* Client general info layout inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 mb-4 bg-gray-55 p-4 rounded-2.5xl border border-gray-102">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                <User className="h-3 w-3 text-blue-500" />
                Nombre del Cliente (Opcional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ingresa nombre de cliente..."
                className="w-full px-3 py-2 bg-white border border-gray-180 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-500" />
                Teléfono de WhatsApp (Presupuesto)
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="Ejemplo: 8095551234"
                className="w-full px-3 py-2 bg-white border border-gray-180 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table list of selected draft items */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4">
            {quoteItems.length === 0 ? (
              <div className="h-48 border border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <Calculator className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-800">Cotización Vacía de Borrador</h4>
                  <p className="text-xs text-gray-450 max-w-xs mt-1">
                    Selecciona productos en el panel izquierdo para agregarlos al cálculo de presupuesto en vivo.
                  </p>
                </div>
              </div>
            ) : (
              quoteItems.map((item, idx) => {
                const p = item.product;
                const price = item.customPrice ?? p.precio_venta;
                const isWeighed = p.unidad_venta === UnitType.LIBRA || p.unidad_venta === UnitType.KILOGRAMO;

                return (
                  <motion.div
                    key={`${p.id}-${idx}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-white border border-gray-150 rounded-2.5xl space-y-3 relative group"
                  >
                    {/* Delete item button */}
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="absolute top-4 right-4 p-1 rounded-lg text-gray-350 hover:text-red-500 hover:bg-gray-100 transition-all border-0 invisible group-hover:visible cursor-pointer"
                      title="Eliminar de cotización"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex justify-between items-start gap-2 pr-4">
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-tight">{p.nombre}</p>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                          {p.categoria} • Marca: {p.marca || 'N/A'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-gray-950 text-sm block">
                          {formatCurrency(item.quantity * price)}
                        </span>
                      </div>
                    </div>

                    {/* Integrated Bidirectional Input layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100">
                      
                      {/* Price editor */}
                      <div className="space-y-1 text-left">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Precio Unitario</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-[10px]">RD$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={price}
                            onChange={(e) => handleItemCustomPriceChange(idx, e.target.value)}
                            className="w-full pl-8 pr-1.5 py-1.5 bg-white border border-gray-250 rounded-xl font-mono text-xs font-black text-gray-900 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Quantity column */}
                      <div className="space-y-1 text-left">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">
                          Cant. ({p.unidad_venta})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={isWeighed ? "0.001" : "1"}
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-250 rounded-xl font-mono text-xs font-black text-blue-650 outline-none text-center focus:border-blue-500"
                            placeholder="0.00"
                          />
                          {isWeighed && (
                            <button
                              onClick={() => openWeightCalculator(idx)}
                              className="p-1 px-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-105 hover:bg-blue-100 text-[9px] font-black flex items-center justify-center shrink-0"
                              title="Balanza asistida"
                            >
                              <Scale className="h-3 w-3 shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bidirectional Value in Pesos RD$ */}
                      <div className="space-y-1 text-left">
                        <span className="block text-[9px] font-black text-gray-450 uppercase tracking-wider">
                          Monto en Pesos (RD$)
                        </span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-450 font-extrabold text-[10px]">RD$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.pesosValue}
                            onChange={(e) => handleItemPesosChange(idx, e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-gray-250 rounded-xl font-mono text-xs font-black text-emerald-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                    </div>
                    
                    {/* Weight-to-scale description helper under item */}
                    {isWeighed && item.quantity > 0 && (
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold bg-blue-50/20 px-3 py-1 rounded-xl">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                        <span>Equivale a despachar exactamente <b>{item.quantity.toFixed(3)} libras</b> de este artículo.</span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Quotation totals draft controls */}
          {quoteItems.length > 0 && (
            <div className="bg-gray-55 p-5 rounded-[2rem] border border-gray-150 space-y-4 shrink-0 transition-all font-sans">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Discount Control */}
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Descuento</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={discountValue === '0' ? '' : discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-250 rounded-xl text-xs font-black font-mono outline-none"
                    />
                    <select
                      value={discountType}
                      onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}
                      className="p-1 px-1.5 bg-white border border-gray-250 rounded-xl text-[10px] font-black uppercase outline-none"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">RD$</option>
                    </select>
                  </div>
                </div>

                {/* Tax Option (ITBIS) */}
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Cálculo Impuesto (ITBIS)</label>
                  <select
                    value={taxRate}
                    onChange={e => setTaxRate(parseInt(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-gray-250 rounded-xl text-xs font-black outline-none"
                  >
                    <option value={0}>Sin Impuesto (0%)</option>
                    <option value={18}>ITBIS General (18%)</option>
                    <option value={16}>ITBIS Reducido (16%)</option>
                  </select>
                </div>

                {/* Notes general quote */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Vencimiento o Nota</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Validez de 15 días o nota..."
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-250 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Breakdown details */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200 text-xs">
                <div className="flex justify-between items-center text-gray-500 font-semibold">
                  <span>Subtotal:</span>
                  <span className="font-mono text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-red-650 font-semibold bg-red-50/50 px-2 py-1 rounded-lg">
                    <span>Descuento Aplicado:</span>
                    <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between items-center text-gray-500 font-semibold">
                    <span>ITBIS ({taxRate}%):</span>
                    <span className="font-mono text-gray-900">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-250 font-black text-sm bg-blue-50/40 p-2.5 rounded-xl border border-blue-105-half">
                  <span className="text-blue-900 uppercase tracking-wide">TOTAL PRESUPUESTO</span>
                  <span className="font-mono text-blue-955 text-base">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Action layout CTAs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5">
                <button
                  onClick={handleSaveToHistory}
                  className="px-3 py-3 bg-white hover:bg-gray-50 text-emerald-700 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" /> Guardar
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className="px-3 py-3 bg-white hover:bg-gray-50 text-blue-700 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Copy className="h-4 w-4" /> Copiar Detalle
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-500/10"
                >
                  <Send className="h-4 w-4" /> WhatsApp
                </button>

                <button
                  onClick={() => setShowPdfSimulator(true)}
                  className="px-3 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
                >
                  <Printer className="h-4 w-4" /> Ver Documento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: PRE-VISUALIZACIÓN DE DOCUMENTO Y IMPRIMIR (PDF SIMULATOR) */}
      <AnimatePresence>
        {showPdfSimulator && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl border border-gray-150 overflow-hidden font-sans text-gray-900 flex flex-col my-8"
            >
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-blue-500 rounded-xl flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase">Documento de Cotización de Venta</h3>
                    <p className="text-[9px] text-gray-400 font-extrabold tracking-widest uppercase">Establecimiento Oficial Vuttik</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPdfSimulator(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  ✖
                </button>
              </div>

              {/* The printable document body */}
              <div id="quotation-printable-area" className="p-8 space-y-6 overflow-y-auto max-h-[60vh] text-left bg-gray-50/50">
                <div className="bg-white p-8 rounded-2xl border border-gray-150 shadow-sm space-y-6 text-xs text-gray-800 font-sans leading-relaxed">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                    <div>
                      <h4 className="text-lg font-black text-gray-950 uppercase">VUTTIK MARKET POS</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">República Dominicana</p>
                      <p className="text-[9px] text-gray-550">Autopista Duarte KM 9, Santo Domingo</p>
                      <p className="text-[9px] text-gray-555">Edificio Comercial Colmado Sabor</p>
                    </div>
                    <div className="text-right">
                      <span className="block px-3 py-1 bg-blue-100 text-blue-700 font-black tracking-widest text-[9px] rounded-full uppercase">PRESUpuESTO</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Documento No: COT-ORD-112</p>
                      <p className="text-[9px] text-gray-500">Fecha: {new Date().toLocaleDateString('es-DO', {day: 'numeric', month: 'numeric', year: 'numeric'})}</p>
                    </div>
                  </div>

                  {/* Customer details info */}
                  <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                    <div>
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Dirigido a:</span>
                      <p className="text-xs font-black text-gray-950">{clientName || 'Cliente de Venta General'}</p>
                      {clientPhone && <p className="text-[10px] text-gray-500 font-medium">WhatsApp: {clientPhone}</p>}
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Detalle o Validez:</span>
                      <p className="text-xs font-bold text-gray-950">{notes || 'Validez inmediata de cotización durante 15 días.'}</p>
                    </div>
                  </div>

                  {/* Products table loop list */}
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-[9px] font-black text-gray-400 uppercase">
                        <th className="pb-2 w-10">No</th>
                        <th className="pb-2">Descripción Producto</th>
                        <th className="pb-2 text-right">Cant.</th>
                        <th className="pb-2 text-right">Precio unit.</th>
                        <th className="pb-2 text-right">subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {quoteItems.map((item, idx) => {
                        const price = item.customPrice ?? item.product.precio_venta;
                        return (
                          <tr key={idx} className="text-xs">
                            <td className="py-2.5 font-bold text-gray-400">{idx + 1}</td>
                            <td className="py-2.5">
                              <span className="font-extrabold text-gray-900 block">{item.product.nombre}</span>
                              <span className="text-[9px] text-gray-400 font-bold block">{item.product.unidad_venta.toLowerCase()} • {item.product.categoria}</span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-gray-900">{item.quantity}</td>
                            <td className="py-2.5 text-right font-mono text-gray-500">{formatCurrency(price)}</td>
                            <td className="py-2.5 text-right font-mono font-black text-gray-950">{formatCurrency(item.quantity * price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Foot total card */}
                  <div className="border-t border-gray-150 pt-4 flex justify-end">
                    <div className="w-64 space-y-1.5 text-xs text-left">
                      <div className="flex justify-between font-semibold text-gray-500">
                        <span>Subtotal bruto:</span>
                        <span className="font-mono text-gray-950">{formatCurrency(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between font-semibold text-red-650">
                          <span>Descuento descontado:</span>
                          <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      {taxAmount > 0 && (
                        <div className="flex justify-between font-semibold text-gray-500">
                          <span>ITBIS ({taxRate}%):</span>
                          <span className="font-mono text-gray-900">{formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-sm border-t border-gray-250 pt-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-105-half">
                        <span className="text-blue-900">Total General:</span>
                        <span className="font-mono text-blue-955">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer small line */}
                  <div className="pt-6 border-t border-gray-100 text-center space-y-1">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">¡Gracias por cotizar con nosotros!</p>
                    <p className="text-[8px] text-gray-400 font-medium">Cotización generada a través del sistema oficial Vuttik Market. Se excluyen responsabilidades de fluctuaciones de precios tras su caducidad.</p>
                  </div>
                </div>
              </div>

              {/* Action buttons inside the modal */}
              <div className="bg-gray-50 p-6 flex justify-end gap-3 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setShowPdfSimulator(false)}
                  className="px-5 py-3 border border-gray-150 font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-xs uppercase"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    window.print();
                    showFeedback('Iniciando impresión física / PDF...');
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  <Printer className="h-4.5 w-4.5" />
                  Imprimir Documento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: HISTORIAL DE COTIZACIONES GUARDADAS */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl border border-gray-155 overflow-hidden font-sans text-gray-900 flex flex-col"
            >
              <div className="bg-emerald-600 p-6 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FileSpreadsheet className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase">Historial de Cotizaciones Guardadas</h3>
                    <p className="text-[9px] text-emerald-100 font-extrabold tracking-widest uppercase">Historial local persistente del Colmado</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-white hover:bg-white/10 p-1.5 rounded-lg border-0 cursor-pointer"
                >
                  ✖
                </button>
              </div>

              {/* Saved list loop */}
              <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh] bg-gray-50 text-left">
                {savedQuotes.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <FileText className="h-10 w-10 text-gray-300" />
                    <p className="text-xs font-bold text-gray-450">Aún no has guardado ninguna cotización en esta terminal</p>
                  </div>
                ) : (
                  savedQuotes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => handleLoadSavedQuote(q)}
                      className="p-4 bg-white hover:bg-emerald-50/40 border border-gray-150 hover:border-emerald-150 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99] group"
                    >
                      <div className="space-y-1 text-left min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                            {q.id}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">{q.date}</span>
                        </div>
                        <p className="text-xs font-black text-gray-900 truncate">Cliente: {q.clientName}</p>
                        <p className="text-[10px] text-gray-400 font-bold leading-none">
                          {q.items.length} tipo(s) de mercancía • {q.items.reduce((acc, x) => acc + x.quantity, 0)} unidades de despacho
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="block font-mono font-black text-gray-950 text-xs">
                            {formatCurrency(q.total)}
                          </span>
                          <span className="text-[8px] font-black uppercase text-gray-400 block">Total Estimado</span>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeleteSavedQuote(e, q.id)}
                          className="p-2 text-gray-300 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all border-0"
                          title="Eliminar del historial"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-gray-50 p-5 flex justify-end border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-6 py-2.5 bg-gray-950 hover:bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Cerrar Historial
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: INTEGRATED DUPLEX WEIGHT CALCULATOR FOR PESOS LIBRAS BIDIRECTIONAL */}
      <AnimatePresence>
        {activeWeightItemIdx !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[250]">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl max-w-xl w-full shadow-2xl space-y-4 text-gray-900 font-sans text-left">
              <div className="text-center">
                <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Scale className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Calculadora de Peso para Cotizar</h3>
                <p className="text-xs text-gray-550 font-sans font-extrabold leading-tight">
                  Producto: {quoteItems[activeWeightItemIdx].product.nombre}
                </p>
                <span className="inline-block mt-1.5 px-3 py-1 bg-gray-100 text-gray-650 text-[10px] font-black uppercase tracking-wider rounded-lg">
                  Precio: {formatCurrency(quoteItems[activeWeightItemIdx].customPrice ?? quoteItems[activeWeightItemIdx].product.precio_venta)} / {quoteItems[activeWeightItemIdx].product.unidad_venta.toLowerCase()}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {/* Input 1: Pesos */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Monto deseado en Pesos (RD$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">RD$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={tempWeightPesos} 
                      onChange={e => handleWeightCalculatorPesosChange(e.target.value)} 
                      className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left text-sm font-black text-gray-900 outline-none font-mono focus:border-blue-500" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div className="flex justify-center -my-1">
                  <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">Equivale a</span>
                </div>

                {/* Input 2: Weight quantity */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Cantidad en {quoteItems[activeWeightItemIdx].product.unidad_venta}</label>
                  <div className="relative">
                    <input 
                      autoFocus 
                      type="number" 
                      step="0.001" 
                      value={tempWeightQty} 
                      onChange={e => handleWeightCalculatorQtyChange(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left text-sm font-black text-blue-650 outline-none font-mono focus:border-blue-500" 
                      placeholder="0.000" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold block uppercase text-[10px]">{quoteItems[activeWeightItemIdx].product.unidad_venta.toLowerCase()}</span>
                  </div>
                </div>
              </div>

              {/* Info feedback */}
              {tempWeightQty && parseFloat(tempWeightQty) > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-105 rounded-xl text-center text-xs">
                  <p className="text-gray-500 font-bold">Resumen de Cotización:</p>
                  <p className="text-blue-900 font-black text-sm my-0.5">
                    {parseFloat(tempWeightQty).toFixed(3)} {quoteItems[activeWeightItemIdx].product.unidad_venta.toLowerCase()}(s)
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Importe estimado: {formatCurrency(parseFloat(tempWeightQty) * (quoteItems[activeWeightItemIdx].customPrice ?? quoteItems[activeWeightItemIdx].product.precio_venta))}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1 font-sans text-xs shrink-0">
                <button onClick={() => setActiveWeightItemIdx(null)} className="py-3 border border-gray-150 rounded-xl font-bold hover:bg-gray-50 font-sans cursor-pointer outline-none text-center">CANCELAR</button>
                <button onClick={confirmWeightCalculator} className="py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 font-sans cursor-pointer outline-none text-center">APLICAR</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
