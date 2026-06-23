import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { ScaleService } from '../services/scaleService';
import { Product, Shift, Sale, UnitType, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Landmark, AlertCircle, Scale, Loader2, Users, Receipt, X, Maximize2, Minimize2, Calendar, Clock, Filter, Sparkles, Keyboard, Package, Wifi, Terminal, Settings, Cpu, LogOut, UserCheck, Plus, CheckCircle } from 'lucide-react';
import { formatCurrency, generateReceiptCode, cn } from '../lib/utils';
import { printReceipt } from '../lib/printReceipt';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CartItem extends Product {
  quantity: number;
}

export default function POS() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [montoInicial, setMontoInicial] = useState('0');
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState<string | null>(null);

  // Expanded Kiosk and Supermarket States
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [currentTime, setCurrentTime] = useState(new Date());

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const kioskSearchRef = React.useRef<HTMLInputElement>(null);

  // Live Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state with browser-native fullscreen event
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = !!document.fullscreenElement;
      if (!isNativeFullscreen && isKioskMode) {
        setIsKioskMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isKioskMode]);

  // Support F10 focusing to feel like a rapid enterprise workstation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        if (isKioskMode) {
          kioskSearchRef.current?.focus();
        } else {
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKioskMode]);
  const [lastSaleData, setLastSaleData] = useState<{ 
    items: CartItem[], 
    subtotal: number, 
    itbis: number, 
    total: number, 
    code: string,
    metodo_pago?: string,
    monto_recibido?: number,
    cambio?: number,
    cliente?: string,
    cliente_rnc?: string,
    tipo_comprobante?: string,
    ncf?: string,
    tarjeta_aprobacion?: string,
    tarjeta_verifone?: string
  } | null>(null);
  const [weightModal, setWeightModal] = useState<{ product: Product, weight: string } | null>(null);
  const [pesosInput, setPesosInput] = useState<string>('');
  const [scaleLoading, setScaleLoading] = useState(false);
  const [scaleError, setScaleError] = useState('');

  // Verifone Card Terminal Integration States
  const [verifoneStatus, setVerifoneStatus] = useState<'idle' | 'linking' | 'waiting_card' | 'processing' | 'approved' | 'failed'>('idle');
  const [verifoneConnectionMethod, setVerifoneConnectionMethod] = useState<'Wi-Fi/IP' | 'Bluetooth' | 'USB/Serial'>('Wi-Fi/IP');
  const [verifoneIp, setVerifoneIp] = useState('192.168.1.150');
  const [verifonePort, setVerifonePort] = useState('443');
  const [verifoneTerminalId, setVerifoneTerminalId] = useState('CARDNET-VF202');
  const [verifoneBrand, setVerifoneBrand] = useState<'Cardnet' | 'Azul' | 'Visanet'>('Cardnet');
  const [verifoneMsg, setVerifoneMsg] = useState('');
  const [verifoneApproval, setVerifoneApproval] = useState('');
  const [showVerifoneScreen, setShowVerifoneScreen] = useState(false);

  // Checkout and Supermarket-style Payment System States
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Mixto' | 'A Crédito (Fiao)'>('Efectivo');
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [clienteSearch, setClienteSearch] = useState<string>('');
  const [showClienteDropdown, setShowClienteDropdown] = useState<boolean>(false);
  const [showQuickClientForm, setShowQuickClientForm] = useState<boolean>(false);
  const [quickClientForm, setQuickClientForm] = useState({
    nombre: '',
    telefono: '',
    limite_credito: '5000'
  });
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [clienteName, setClienteName] = useState<string>('');
  const [clienteRnc, setClienteRnc] = useState<string>('');
  const [tipoComprobante, setTipoComprobante] = useState<string>('Consumidor Final');
  const [ncfCode, setNcfCode] = useState<string>('');
  const [aplicarItbis, setAplicarItbis] = useState<boolean>(true); // Default Dominican 18% ITBIS

  const generateNcfCodeForType = (type: string) => {
    if (type === 'Consumidor Final') {
      return `B01${Math.floor(100000000 + Math.random() * 900000000)}`;
    } else if (type === 'Crédito Fiscal') {
      return `B02${Math.floor(100000000 + Math.random() * 900000000)}`;
    } else if (type === 'Registro Único de Ingresos') {
      return `B12${Math.floor(100000000 + Math.random() * 900000000)}`;
    }
    return '';
  };

  // Verifone Payment Flow Controls
  const startVerifoneTransaction = () => {
    setShowVerifoneScreen(true);
    setVerifoneStatus('linking');
    setVerifoneMsg(`Inicializando protocolo POS... Estableciendo conexión con el Verifone ID: ${verifoneTerminalId} (${verifoneConnectionMethod}) en ${verifoneConnectionMethod === 'Wi-Fi/IP' ? `${verifoneIp}:${verifonePort}` : 'Puerto Comm General'}...`);
    setVerifoneApproval('');

    setTimeout(() => {
      setVerifoneStatus('waiting_card');
      setVerifoneMsg(`Verifone conectado con éxito. Monto enviado: RD$ ${total.toFixed(2)}. ADVERTENCIA: Por favor introduzca, deslice o acerque la tarjeta del cliente en el aparato para procesar.`);
    }, 1800);
  };

  const simulateSuccessInsertion = () => {
    setVerifoneStatus('processing');
    setVerifoneMsg('Chip EMV o tecnología Contactless detectada. Leyendo datos de tarjeta...');

    setTimeout(() => {
        setVerifoneMsg(`Autorizando transacción por RD$ ${total.toFixed(2)} con la red bancaria ${verifoneBrand.toUpperCase()}...`);
        
        setTimeout(() => {
          // EST-005 NOTE: This is a SIMULATION — no real card transaction occurs.
          // A real Verifone/CardNet/Azul SDK integration is required for production use.
          // Approval code is randomly generated for demo purposes only.
          const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
          setVerifoneStatus('approved');
          setVerifoneApproval(generatedCode);
          setVerifoneMsg(`¡Transacción Aprobada de manera inalámbrica! Código de aprobación: #${generatedCode}. Listo para registrar la venta.`);
        }, 2000);

      }, 1500);
  };

  const simulateFailureDecline = (errorDetail: string) => {
    setVerifoneStatus('processing');
    setVerifoneMsg('Verificando fondos y estatus de servicio bancario...');

    setTimeout(() => {
      setVerifoneStatus('failed');
      setVerifoneApproval('');
      setVerifoneMsg(`La red bancaria rechazó la tarjeta: ${errorDetail}`);
    }, 1500);
  };

  const cancelVerifoneTransaction = () => {
    setVerifoneStatus('idle');
    setVerifoneApproval('');
    setShowVerifoneScreen(false);
  };

  const toggleKioskMode = () => {
    if (!isKioskMode) {
      setIsKioskMode(true);
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn("Native fullscreen request rejected:", e);
      }
    } else {
      setIsKioskMode(false);
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      } catch (e) {
        console.warn("Native exit fullscreen rejected:", e);
      }
    }
  };

  useEffect(() => {
    if (profile) {
      ApiService.getActiveShift(profile.id).then(setShift);
      ApiService.getProducts().then(setProducts);
      ApiService.getClientes().then(data => {
        if (Array.isArray(data)) {
          setClientes(data.filter((c: any) => c.estado === 'activo'));
        }
      }).catch(err => console.error("Error loading clients in POS:", err));
    }
  }, [profile]);

  useEffect(() => {
    if (showPayModal && profile) {
      ApiService.getClientes().then(data => {
        if (Array.isArray(data)) {
          setClientes(data.filter((c: any) => c.estado === 'activo'));
        }
      }).catch(err => console.error("Error refreshing clients in POS modal:", err));
      // Reset selected client and search
      setSelectedClienteId('');
      setClienteSearch('');
      setShowClienteDropdown(false);
    }
  }, [showPayModal, profile]);

  useEffect(() => {
    let barcode = '';
    let lastTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If we are in an input/textarea, don't trigger global scanner logic
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        // However, if it's the search input and they hit Enter, we can handle it
        return;
      }

      const currentTime = Date.now();
      
      // If interval between keystrokes is more than 50ms, it's likely manual typing, so reset
      if (currentTime - lastTime > 50) {
        barcode = '';
      }
      
      lastTime = currentTime;

      if (e.key === 'Enter') {
        if (barcode.length >= 3) {
          const product = products.find(p => p.codigo_barra === barcode);
          if (product) {
            addToCart(product);
          }
          barcode = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        barcode += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  const addToCart = (product: Product) => {
    if (product.unidad_venta === UnitType.LIBRA || product.unidad_venta === UnitType.KILOGRAMO) {
      setWeightModal({ product, weight: '' });
      setPesosInput('');
      return;
    }

    const existingQty = cart.find(item => item.id === product.id)?.quantity || 0;
    if (product.cantidad_disponible !== undefined && (existingQty + 1) > product.cantidad_disponible) {
      alert(`No hay suficiente inventario de "${product.nombre}". Disponible: ${product.cantidad_disponible}`);
      return;
    }

    setCart(current => {
      const exists = current.find(item => item.id === product.id);
      if (exists) {
        return current.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const confirmWeight = () => {
    if (!weightModal) return;
    const weight = parseFloat(weightModal.weight);
    if (isNaN(weight) || weight <= 0) {
      setScaleError('Ingresa un peso válido');
      return;
    }

    const product = weightModal.product;
    const existingQty = cart.find(item => item.id === product.id)?.quantity || 0;
    if (product.cantidad_disponible !== undefined && (existingQty + weight) > product.cantidad_disponible) {
      setScaleError(`Stock insuficiente de "${product.nombre}". Disponible: ${product.cantidad_disponible}`);
      return;
    }

    setCart(current => {
      const exists = current.find(item => item.id === product.id);
      if (exists) {
        return current.map(item => 
          item.id === product.id ? { ...item, quantity: Number((item.quantity + weight).toFixed(2)) } : item
        );
      }
      return [...current, { ...product, quantity: weight }];
    });

    setWeightModal(null);
    setPesosInput('');
    setScaleError('');
  };

  const handleReadScale = async () => {
    if (!weightModal) return;
    setScaleLoading(true);
    setScaleError('');
    try {
      const weight = await ScaleService.getWeight();
      setWeightModal({ ...weightModal, weight: weight.toString() });
      setPesosInput((weight * weightModal.product.precio_venta).toFixed(2));
    } catch (err: any) {
      setScaleError(err.message || 'Error al conectar con la balanza');
    } finally {
      setScaleLoading(false);
    }
  };

  const handlePesosChange = (val: string) => {
    setPesosInput(val);
    if (!weightModal) return;
    const pesos = parseFloat(val);
    if (!isNaN(pesos) && pesos > 0) {
      const calculatedWeight = pesos / weightModal.product.precio_venta;
      setWeightModal({
        ...weightModal,
        weight: Number(calculatedWeight.toFixed(3)).toString()
      });
    } else {
      setWeightModal({ ...weightModal, weight: '' });
    }
  };

  const handleWeightChange = (val: string) => {
    if (!weightModal) return;
    setWeightModal({ ...weightModal, weight: val });
    const weight = parseFloat(val);
    if (!isNaN(weight) && weight > 0) {
      const calculatedPesos = weight * weightModal.product.precio_venta;
      setPesosInput(calculatedPesos.toFixed(2));
    } else {
      setPesosInput('');
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (item && delta > 0 && item.cantidad_disponible !== undefined && (item.quantity + delta) > item.cantidad_disponible) {
      alert(`No hay suficiente inventario de "${item.nombre}". Disponible: ${item.cantidad_disponible}`);
      return;
    }
    setCart(current => current.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        // Allow products to be removed if qty hits 0, but buttons won't let it go below 0.1 normally
        return { ...item, quantity: Number(newQty.toFixed(2)) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(current => current.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.precio_venta * item.quantity), 0);
  const itbis = aplicarItbis ? subtotal * 0.18 : 0;
  const total = subtotal + itbis;

  const handleOpenShift = async () => {
    if (!profile) return;
    try {
      const newShift = await ApiService.openShift(profile.id, profile.nombre, parseFloat(montoInicial));
      setShift(newShift);
    } catch (error: any) {
      alert(error.message || "Error al abrir turno");
    }
  };

  const handlePaymentSubmit = () => {
    if (payMethod === 'Tarjeta') {
      startVerifoneTransaction();
    } else {
      handleCompleteSale();
    }
  };

  const handleCreateQuickClient = async () => {
    if (!quickClientForm.nombre.trim()) return;
    try {
      // Verify session is still valid before attempting creation
      const sessionCheck = await fetch('/api/auth/me');
      const sessionData = await sessionCheck.json();
      if (!sessionData || !sessionData.business_id) {
        alert('Tu sesión ha expirado o no tienes un negocio seleccionado. Por favor recarga la página e inicia sesión de nuevo.');
        return;
      }

      const newClient = await ApiService.createCliente({
        nombre: quickClientForm.nombre.trim(),
        telefono: quickClientForm.telefono.trim(),
        limite_credito: Number(quickClientForm.limite_credito) || 0
      });
      
      if (newClient && newClient.error) {
        throw new Error(newClient.error);
      }
      
      if (newClient) {
        // Refresh clients list
        const updatedList = await ApiService.getClientes();
        if (Array.isArray(updatedList)) {
          setClientes(updatedList.filter((c: any) => c.estado === 'activo'));
        }
        
        // Select the newly created client
        setSelectedClienteId(newClient.id);
        setClienteName(newClient.nombre);
        setClienteRnc(newClient.telefono || '');
      }
      
      // Hide quick form and reset
      setShowQuickClientForm(false);
      setQuickClientForm({ nombre: '', telefono: '', limite_credito: '5000' });
    } catch (err) {
      console.error("Error creating quick client in checkout:", err);
      alert("No se pudo crear el cliente: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCompleteSale = async (overridePayMethod?: string, approvalCode?: string) => {
    if (!profile || !shift || cart.length === 0) return;
    setProcessing(true);
    try {
      const codigo = generateReceiptCode();
      const activePayMethod = overridePayMethod || payMethod;
      const finalMontoRecibido = activePayMethod === 'Efectivo' 
        ? (parseFloat(montoRecibido) || total) 
        : total;
      const finalCambio = activePayMethod === 'Efectivo'
        ? Math.max(0, finalMontoRecibido - total)
        : 0;

      const sale: any = {
        codigo_recibo: codigo,
        usuario_id: profile.id,
        usuario_nombre: profile.nombre,
        subtotal,
        descuento: 0,
        impuesto: itbis,
        total,
        metodo_pago: activePayMethod,
        monto_recibido: finalMontoRecibido,
        cambio: finalCambio,
        estado: 'completada',
        fecha: null,
        turno_id: shift.id,
        cliente_id: activePayMethod === 'A Crédito (Fiao)' ? selectedClienteId : undefined,
        cliente: clienteName.trim() || undefined,
        cliente_rnc: clienteRnc.trim() || undefined,
        tipo_comprobante: tipoComprobante !== 'Sin Comprobante' ? tipoComprobante : undefined,
        ncf: tipoComprobante !== 'Sin Comprobante' ? ncfCode : undefined,
        tarjeta_aprobacion: approvalCode || undefined,
        tarjeta_verifone: activePayMethod === 'Tarjeta' ? `${verifoneBrand} (ID: ${verifoneTerminalId})` : undefined
      };

      const items = cart.map(item => ({
        producto_id: item.id,
        nombre: item.nombre,
        unidad_venta: item.unidad_venta,
        cantidad: item.quantity,
        costo_unitario: item.costo_compra,
        precio_unitario: item.precio_venta,
        ganancia_unitaria: item.precio_venta - item.costo_compra,
        ganancia_total: (item.precio_venta - item.costo_compra) * item.quantity,
        total_linea: item.precio_venta * item.quantity,
        itbis_gravado: aplicarItbis
      }));

      let locationMetadata = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, enableHighAccuracy: true });
        });
        locationMetadata = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        console.warn("Could not fetch GPS metadata for sale receipt:", err);
      }

      await ApiService.completeSale(sale, items, locationMetadata);
      
      setLastSaleData({
        items: [...cart],
        subtotal,
        itbis,
        total,
        code: codigo,
        metodo_pago: activePayMethod,
        monto_recibido: finalMontoRecibido,
        cambio: finalCambio,
        cliente: clienteName.trim() || undefined,
        cliente_rnc: clienteRnc.trim() || undefined,
        tipo_comprobante: tipoComprobante !== 'Sin Comprobante' ? tipoComprobante : undefined,
        ncf: tipoComprobante !== 'Sin Comprobante' ? ncfCode : undefined,
        tarjeta_aprobacion: approvalCode || undefined,
        tarjeta_verifone: activePayMethod === 'Tarjeta' ? `${verifoneBrand} (ID: ${verifoneTerminalId})` : undefined
      });
      
      setCart([]);
      setShowPayModal(false);
      setShowReceipt(codigo);
      
      // Update shift state
      const active = await ApiService.getActiveShift(profile.id);
      setShift(active);
      
      // Refresh products to show updated stock
      const updatedProducts = await ApiService.getProducts();
      setProducts(updatedProducts);
    } catch (e: any) {
      // EST-004 FIX: Always show the error to the cashier.
      // Without this, if the server rejects the sale (stock issue, network error, etc.)
      // the spinner just disappears and the cashier may think the sale was saved when it was not.
      console.error('handleCompleteSale error:', e);
      alert(`❌ Error al procesar la venta: ${e?.message || 'Error desconocido. Verifica la conexión al servidor e inténtalo de nuevo.'}`);
    } finally {
      setProcessing(false);
    }
  };

  const isShiftExpired = React.useMemo(() => {
    if (!shift) return false;
    const shiftDate = new Date(shift.fecha_apertura).toDateString();
    const todayDate = new Date().toDateString();
    return shiftDate !== todayDate;
  }, [shift]);

  if (isShiftExpired) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-red-50 p-8 rounded-[2rem] shadow-xl border border-red-100 max-w-md w-full text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-red-900 uppercase tracking-tight font-sans">Día Vencido</h2>
          <p className="text-red-700 font-sans text-sm font-medium leading-relaxed">
            La caja actual fue abierta un día anterior. Para mantener tus cuentas claras y evitar mezclar el dinero, debes realizar el cierre de caja de ayer y abrir una nueva para hoy.
          </p>
          <button 
            onClick={() => navigate('/shifts')}
            className="w-full bg-red-600 text-white py-4 mt-4 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-red-700 transition-all shadow-xl shadow-red-500/20"
          >
            Ir a Cuadre de Caja
          </button>
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 max-w-md w-full text-center space-y-4">
          <Landmark className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight font-sans">Apertura de Turno</h2>
          <p className="text-gray-500 font-sans text-sm font-medium">Ingresa el fondo de caja inicial para comenzar a vender.</p>
          <input 
            type="number" 
            value={montoInicial} 
            onChange={e => setMontoInicial(e.target.value)}
            className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:ring-4 focus:ring-blue-105 focus:border-blue-500 outline-none text-xl font-bold text-center text-blue-600 font-mono"
            placeholder="Monto inicial (RD$)"
          />
          <button 
            onClick={handleOpenShift}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10"
          >
            Abrir Turno
          </button>
        </div>
      </div>
    );
  }

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.categoria).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || 
                         p.codigo_barra.includes(search);
    const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderModals = () => {
    return (
      <>
        {showPayModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] max-w-3xl w-full shadow-2xl space-y-5 flex flex-col max-h-[90vh] text-gray-900"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-600" />
                    PROCESAR COBRO Y FACTURACIÓN
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Configura la factura fiscal o consumidor</p>
                </div>
                <button 
                  onClick={() => setShowPayModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-950"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
                <div className="bg-slate-900 p-5 rounded-2xl text-white flex justify-between items-center">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Total a pagar</span>
                    <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <span className="bg-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-100 border border-white/5 font-sans">
                    {payMethod}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                  <div>
                    <span className="block font-black text-xs text-gray-800 font-sans">Aplicar ITBIS (18%)</span>
                    <span className="text-[9px] text-gray-400 font-semibold font-sans">Grava los artículos con impuesto de ley dominicana</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAplicarItbis(!aplicarItbis)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      aplicarItbis ? "bg-emerald-500" : "bg-gray-300"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      aplicarItbis ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="space-y-1.5 font-sans">
                  <span className="text-[9px] font-black text-gray-450 uppercase tracking-widest block font-sans">Método de cobro</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                      { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard },
                      { id: 'Transferencia', label: 'Transf.', icon: Landmark },
                      { id: 'A Crédito (Fiao)', label: 'A Crédito (Fiao)', icon: UserCheck }
                    ].map((m) => (
                      <button
                        key={m.id}
                        id={m.id === 'A Crédito (Fiao)' ? 'fiao-payment-btn' : undefined}
                        type="button"
                        onClick={() => setPayMethod(m.id as any)}
                        className={cn(
                          "flex flex-col items-center justify-center py-2.5 border rounded-xl font-black text-[10px] uppercase tracking-wider transition-all gap-1 font-sans",
                          payMethod === m.id 
                            ? "bg-blue-600 border-blue-700 text-white"
                            : "border-gray-100 text-gray-400 hover:bg-gray-50 bg-white"
                        )}
                      >
                        <m.icon className="h-4 w-4 shrink-0" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {payMethod === 'A Crédito (Fiao)' && (
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-3 font-sans text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest font-sans flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 inline-block animate-ping" />
                        SELECCIONAR CLIENTE DE CONFIANZA (FIAO)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        {/* Searchable client combobox */}
                        <div className="relative flex-1">
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-amber-200 rounded-lg focus-within:border-amber-500 transition-colors">
                            <Search className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <input
                              id="fiao-client-search"
                              type="text"
                              placeholder={selectedClienteId ? clientes.find((c:any)=>c.id===selectedClienteId)?.nombre || 'Buscar cliente...' : 'Buscar cliente por nombre...'}
                              value={clienteSearch}
                              onChange={(e) => {
                                setClienteSearch(e.target.value);
                                setShowClienteDropdown(true);
                                if (!e.target.value) {
                                  setSelectedClienteId('');
                                  setClienteName('');
                                  setClienteRnc('');
                                }
                              }}
                              onFocus={() => setShowClienteDropdown(true)}
                              onBlur={() => setTimeout(() => setShowClienteDropdown(false), 180)}
                              className="flex-1 bg-transparent text-xs font-bold text-gray-800 outline-none placeholder-amber-300 min-w-0"
                            />
                            {selectedClienteId && (
                              <button
                                type="button"
                                onClick={() => { setSelectedClienteId(''); setClienteSearch(''); setClienteName(''); setClienteRnc(''); }}
                                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Dropdown results */}
                          {showClienteDropdown && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-amber-100 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                              {(() => {
                                const filtered = clientes.filter((c: any) =>
                                  c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                                  (c.telefono && c.telefono.includes(clienteSearch))
                                );
                                if (filtered.length === 0) {
                                  return (
                                    <div className="px-4 py-3 text-xs text-gray-400 font-semibold text-center">
                                      No se encontró ningún cliente
                                    </div>
                                  );
                                }
                                return filtered.map((c: any) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onMouseDown={() => {
                                      setSelectedClienteId(c.id);
                                      setClienteSearch('');
                                      setClienteName(c.nombre);
                                      setClienteRnc(c.telefono || '');
                                      setShowClienteDropdown(false);
                                    }}
                                    className={cn(
                                      "w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-b border-gray-50 last:border-0",
                                      selectedClienteId === c.id ? 'bg-amber-50' : ''
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <span className="text-xs font-black text-gray-800 block">{c.nombre}</span>
                                        {c.telefono && <span className="text-[10px] text-gray-400 font-mono">{c.telefono}</span>}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-[9px] font-black text-red-500 block">Deuda: {formatCurrency(c.deuda_actual)}</span>
                                        <span className="text-[9px] text-gray-400 font-semibold">{c.limite_credito > 0 ? `Límite: ${formatCurrency(c.limite_credito)}` : 'Sin límite'}</span>
                                      </div>
                                    </div>
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowQuickClientForm(!showQuickClientForm)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4" />
                          {showQuickClientForm ? 'Cerrar' : 'Nuevo Cliente'}
                        </button>
                      </div>

                      {/* Selected client badge */}
                      {selectedClienteId && (() => {
                        const sel = clientes.find((c: any) => c.id === selectedClienteId);
                        if (!sel) return null;
                        return (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border border-amber-200 rounded-lg">
                            <UserCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-black text-amber-900 block truncate">{sel.nombre}</span>
                              {sel.telefono && <span className="text-[9px] text-amber-600 font-mono">{sel.telefono}</span>}
                            </div>
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md uppercase whitespace-nowrap">✓ Seleccionado</span>
                          </div>
                        );
                      })()}

                      {showQuickClientForm && (
                        <div className="bg-slate-900 p-4 rounded-xl border border-white/10 space-y-3 text-left">
                          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                            Registrar Cliente al Instante
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block pb-0.5 uppercase">Nombre Completo *</span>
                              <input
                                type="text"
                                placeholder="Ej: Doña Carmen"
                                value={quickClientForm.nombre}
                                onChange={(e) => setQuickClientForm({ ...quickClientForm, nombre: e.target.value })}
                                className="w-full px-2.5 py-2 bg-slate-950 border border-white/10 rounded-lg text-white placeholder-slate-500 font-bold text-xs focus:border-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block pb-0.5 uppercase">Teléfono</span>
                              <input
                                type="text"
                                placeholder="Ej: 809-555-0123"
                                value={quickClientForm.telefono}
                                onChange={(e) => setQuickClientForm({ ...quickClientForm, telefono: e.target.value })}
                                className="w-full px-2.5 py-2 bg-slate-950 border border-white/10 rounded-lg text-white placeholder-slate-500 font-mono text-xs focus:border-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block pb-0.5 uppercase">Límite Crédito (RD$)</span>
                              <input
                                type="number"
                                placeholder="Ej: 10000"
                                value={quickClientForm.limite_credito}
                                onChange={(e) => setQuickClientForm({ ...quickClientForm, limite_credito: e.target.value })}
                                className="w-full px-2.5 py-2 bg-slate-950 border border-white/10 rounded-lg text-white placeholder-slate-500 font-bold text-xs focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowQuickClientForm(false);
                                setQuickClientForm({ nombre: '', telefono: '', limite_credito: '5000' });
                              }}
                              className="px-3 py-1.5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateQuickClient}
                              disabled={!quickClientForm.nombre.trim()}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase transition-all shadow-md shadow-blue-950/20"
                            >
                              Guardar y Seleccionar
                            </button>
                          </div>
                        </div>
                      )}

                      {(() => {
                        if (!selectedClienteId) return null;
                        const client = clientes.find((c: any) => c.id === selectedClienteId);
                        if (!client) return null;

                        const projectedDebt = client.deuda_actual + total;
                        const hasLimit = client.limite_credito > 0;
                        const isOverLimit = hasLimit && projectedDebt > client.limite_credito;
                        const isNearLimit = hasLimit && projectedDebt >= client.limite_credito * 0.8;

                        if (isOverLimit) {
                          return (
                            <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2 text-[10px] text-red-800 font-bold leading-normal">
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <span>CRÉDITO DENEGADO: Límite de crédito superado.</span>
                                <span className="block font-medium mt-0.5">
                                  Límite: {formatCurrency(client.limite_credito)} • Deuda actual: {formatCurrency(client.deuda_actual)} • Total Factura: {formatCurrency(total)} • Faltante: {formatCurrency(projectedDebt - client.limite_credito)}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        if (isNearLimit) {
                          return (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-2 text-[10px] text-amber-800 font-bold leading-normal">
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <span>ALERTA DE CRÉDITO: El cliente alcanzará el 80% de su límite de crédito.</span>
                                <span className="block font-medium mt-0.5">
                                  Límite: {formatCurrency(client.limite_credito)} • Deuda actual: {formatCurrency(client.deuda_actual)} • Total Factura: {formatCurrency(total)} • Disponible restante: {formatCurrency(client.limite_credito - projectedDebt)}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-2 text-[10px] text-emerald-800 font-bold leading-normal">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <span>CRÉDITO AUTORIZADO: El cliente tiene suficiente crédito disponible.</span>
                              {hasLimit && (
                                <span className="block font-medium mt-0.5">
                                  Límite: {formatCurrency(client.limite_credito)} • Proyección tras compra: {formatCurrency(projectedDebt)} • Disponible restante: {formatCurrency(client.limite_credito - projectedDebt)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {payMethod === 'Tarjeta' && (
                  <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-3 font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-blue-800 uppercase tracking-widest font-sans flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 inline-block animate-ping" />
                        APARATO INTEGRADO / VERIFONE LOCAL
                      </span>
                      <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1 uppercase">
                        <Wifi className="h-3 w-3 text-emerald-600" />
                        VINCULADO
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                      <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                        <span className="text-[8px] font-black text-gray-400 block pb-0.5 uppercase">Aparato / Terminal ID</span>
                        <input
                          type="text"
                          value={verifoneTerminalId}
                          onChange={(e) => setVerifoneTerminalId(e.target.value)}
                          className="w-full bg-transparent font-bold font-mono outline-none text-slate-800 text-[11px]"
                          placeholder="CARDNET-VF202"
                        />
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                        <span className="text-[8px] font-black text-gray-400 block pb-0.5 uppercase">Eje de Red (Banco)</span>
                        <select
                          value={verifoneBrand}
                          onChange={(e) => setVerifoneBrand(e.target.value as any)}
                          className="w-full bg-transparent font-black outline-none text-slate-800 text-[11px] py-0"
                        >
                          <option value="Cardnet">Cardnet (Banco Popular/BHD)</option>
                          <option value="Azul">Azul (Banco Popular)</option>
                          <option value="Visanet">Visanet (Banco de Reservas)</option>
                        </select>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                        <span className="text-[8px] font-black text-gray-400 block pb-0.5 uppercase">Protocolo de Enlace</span>
                        <select
                          value={verifoneConnectionMethod}
                          onChange={(e) => setVerifoneConnectionMethod(e.target.value as any)}
                          className="w-full bg-transparent font-black outline-none text-slate-800 text-[11px] py-0"
                        >
                          <option value="Wi-Fi/IP">Wi-Fi / Red Local (IP)</option>
                          <option value="USB/Serial">USB / Serial Port (WebSerial)</option>
                          <option value="Bluetooth">Bluetooth Terminal</option>
                        </select>
                      </div>

                      {verifoneConnectionMethod === 'Wi-Fi/IP' ? (
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                          <span className="text-[8px] font-black text-gray-400 block pb-0.5 uppercase">Dirección IP del Verifone</span>
                          <input
                            type="text"
                            value={verifoneIp}
                            onChange={(e) => setVerifoneIp(e.target.value)}
                            className="w-full bg-transparent font-bold font-mono outline-none text-slate-800 text-[11px]"
                            placeholder="192.168.1.150"
                          />
                        </div>
                      ) : (
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
                          <div>
                            <span className="text-[8px] font-black text-gray-400 block pb-0.5 uppercase">Puerto Físico / Enlace</span>
                            <span className="font-extrabold text-[10px] text-slate-700">AUTO-DETECCIÓN</span>
                          </div>
                          <Cpu className="h-4 w-4 text-blue-500" />
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-500 font-sans italic flex items-center gap-1 leading-snug">
                      <Terminal className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>Al completar cobro, el total de la orden se enviará inalámbricamente.</span>
                    </div>
                  </div>
                )}

                {payMethod === 'Efectivo' && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-sans">Monto recibido (Efectivo)</span>
                      <button onClick={() => setMontoRecibido('')} className="text-[8px] font-black text-red-600 uppercase px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100">Limpiar</button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sm text-gray-400">RD$</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={montoRecibido}
                        onChange={e => setMontoRecibido(e.target.value)}
                        className="w-full pl-11 pr-4 py-2 bg-white border border-gray-150 rounded-xl font-black text-xl text-blue-600 focus:border-blue-500 outline-none font-mono"
                      />
                    </div>
                    {/* Quick selectors */}
                    <div className="grid grid-cols-4 gap-1.5 font-sans">
                      <button onClick={() => setMontoRecibido(total.toFixed(2))} className="py-2 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[9px] font-black font-sans">EXACTO</button>
                      {[100, 500, 1000].map(val => (
                        <button key={val} onClick={() => setMontoRecibido(((parseFloat(montoRecibido) || 0) + val).toString())} className="py-2 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[10px] font-mono font-black">+{val}</button>
                      ))}
                    </div>
                    {(() => {
                      const rValue = parseFloat(montoRecibido) || 0;
                      const change = rValue - total;
                      if (rValue === 0) return null;
                      return (
                        <div className={cn("p-2 px-3.5 rounded-xl flex justify-between items-center text-xs font-bold border font-sans", change >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800")}>
                          <span>{change >= 0 ? 'Cambio a Devolver:' : 'Faltante:'}</span>
                          <span className="font-mono font-black text-sm">{formatCurrency(Math.abs(change))}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 font-sans">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-sans">Información del Cliente y NCF</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black text-gray-400 block uppercase font-sans">Nombre Cliente</span>
                      <input type="text" placeholder="Consumidor Final" value={clienteName} onChange={e => setClienteName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500 font-sans" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black text-gray-400 block uppercase font-sans">RNC / Cédula</span>
                      <input type="text" placeholder="Opcional" value={clienteRnc} onChange={e => setClienteRnc(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black text-gray-400 block uppercase font-sans">Tipo Comprobante</span>
                      <select value={tipoComprobante} onChange={e => { const v = e.target.value; setTipoComprobante(v); setNcfCode(generateNcfCodeForType(v)); }} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500 font-sans">
                        <option value="Consumidor Final">Consumidor (B01)</option>
                        <option value="Crédito Fiscal">Crédito Fiscal (B02)</option>
                        <option value="Registro Único de Ingresos">Registro Único (B12)</option>
                        <option value="Sin Comprobante">Sin Comprobante</option>
                      </select>
                    </div>
                    {tipoComprobante !== 'Sin Comprobante' && (
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-black text-gray-400 block uppercase font-sans">Código NCF</span>
                        <input type="text" value={ncfCode} onChange={e => setNcfCode(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-black outline-none text-slate-800" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-gray-100 shrink-0 font-sans">
                <button onClick={() => setShowPayModal(false)} className="py-3 bg-gray-100 hover:bg-gray-150 text-gray-500 rounded-xl font-bold uppercase tracking-wider text-xs font-sans">Cancelar</button>
                {(() => {
                  const selectedClientObj = clientes.find(c => c.id === selectedClienteId);
                  const isFiaoInvalid = payMethod === 'A Crédito (Fiao)' && (
                    !selectedClienteId || 
                    (selectedClientObj && selectedClientObj.limite_credito > 0 && (selectedClientObj.deuda_actual + total > selectedClientObj.limite_credito))
                  );
                  const isEfectivoInvalid = payMethod === 'Efectivo' && (parseFloat(montoRecibido) || 0) < total;
                  const isCheckoutDisabled = processing || isEfectivoInvalid || isFiaoInvalid;

                  return (
                    <button 
                      onClick={handlePaymentSubmit}
                      disabled={isCheckoutDisabled}
                      className={cn(
                        "py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md font-sans", 
                        isCheckoutDisabled 
                          ? "bg-gray-200 shadow-none cursor-not-allowed text-gray-400" 
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
                      )}
                    >
                      {processing ? 'Procesando...' : 'COMPLETAR COBRO'}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {showReceipt && lastSaleData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-100 rounded-[2.5rem] w-full max-w-4xl shadow-2xl flex flex-col md:flex-row my-8 max-h-[90vh] overflow-hidden border border-zinc-200 text-gray-950 font-sans"
            >
              <div className="p-8 md:w-1/2 flex flex-col justify-between bg-white text-left font-sans">
                <div className="space-y-5 my-auto">
                  <div className="h-16 w-16 bg-emerald-105 text-emerald-605 rounded-2xl flex items-center justify-center font-sans">
                    <ShoppingCart className="h-8 w-8 animate-pulse text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-950 tracking-tight leading-none uppercase font-sans">Venta Procesada!</h3>
                    <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest block font-sans">Guardado en base de datos correctamente</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center text-xs font-sans">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Recibido</span>
                      <span className="font-mono font-black text-slate-800">{formatCurrency(lastSaleData.monto_recibido || lastSaleData.total)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] font-black text-red-100 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg font-sans">Cambio</span>
                      <span className="font-mono font-black text-red-600 text-[14px] block mt-1">{formatCurrency(lastSaleData.cambio || 0)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium font-sans">Equipado con estándar fiscal NIF dominicano para registro de venta.</p>
                </div>
                <div className="space-y-2 pt-4 border-t border-gray-100 font-sans">
                  <button onClick={() => { const sale = { ...lastSaleData, fecha: new Date(), codigo_recibo: lastSaleData.code, usuario_nombre: profile?.nombre }; printReceipt(sale); }} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 font-sans shadow-md">
                    <Receipt className="h-5 w-5" /> IMPRIMIR RECIBO TICKET
                  </button>
                  <button onClick={() => { setShowReceipt(null); setMontoRecibido(''); setClienteName(''); setClienteRnc(''); setTipoComprobante('Consumidor Final'); }} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black uppercase text-xs hover:bg-black font-sans">
                    Siguiente Cliente
                  </button>
                </div>
              </div>

              {/* Thermal receipt virtual layout */}
              <div className="md:w-1/2 bg-zinc-200 p-4 flex flex-col items-center justify-center overflow-y-auto max-h-full">
                <div className="w-[76mm] min-h-[350px] bg-white text-black p-5 font-mono text-[10px] leading-tight shadow-md border-t-[6px] border-b-[6px] border-dashed border-zinc-300">
                  <div className="text-center mb-3">
                    <div className="font-bold text-[11px] uppercase">SUPERMERCADO VUTTIK</div>
                    <div>RNC: 131-00234-5</div>
                    <div className="text-[9px]">TEL: 809-567-8901</div>
                    <div className="border-t border-dashed border-black mt-2 pt-1 text-[8px]">COMPROBANTE AUTORIZADO</div>
                  </div>
                  <div className="border-t border-b border-dashed border-black py-1.5 my-1.5 space-y-0.5">
                    <div className="flex justify-between"><span>TICKET:</span><span className="font-bold">#{lastSaleData.code}</span></div>
                    <div className="flex justify-between"><span>FECHA:</span><span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                    <div className="flex justify-between"><span>CAJERO:</span><span>{(profile?.nombre || '').toUpperCase()}</span></div>
                    <div className="flex justify-between"><span>CLIENTE:</span><span>{(lastSaleData.cliente || 'Consumidor Final').toUpperCase()}</span></div>
                    {lastSaleData.ncf && <div className="flex justify-between font-bold"><span>NCF:</span><span>{lastSaleData.ncf}</span></div>}
                  </div>
                  <div className="space-y-2 my-2">
                    {lastSaleData.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="truncate max-w-[150px]">{item.nombre.toUpperCase()} x {item.quantity}</span>
                        <span>{formatCurrency(item.quantity * item.precio_venta)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-black pt-2 space-y-1">
                    <div className="flex justify-between"><span>SUBTOTAL:</span><span>{formatCurrency(lastSaleData.subtotal)}</span></div>
                    <div className="flex justify-between"><span>ITBIS (18%):</span><span>{formatCurrency(lastSaleData.itbis)}</span></div>
                    <div className="flex justify-between font-bold border-t border-dashed border-black pt-1"><span>TOTAL GENERAL:</span><span>{formatCurrency(lastSaleData.total)}</span></div>
                  </div>
                  <div className="text-center mt-4 text-[8px] border-t border-dashed border-black pt-2">
                    <div className="font-bold">*** GRACIAS POR SU COMPRA ***</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {weightModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl max-w-xl w-full shadow-2xl space-y-4 text-gray-900 font-sans">
              <div className="text-center">
                <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Scale className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Ingresar Venta por Peso</h3>
                <p className="text-xs text-gray-500 font-sans font-bold">Producto: {weightModal.product.nombre}</p>
                <span className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-650 text-[10px] font-black uppercase tracking-wider rounded-lg">
                  Precio: {formatCurrency(weightModal.product.precio_venta)} / {weightModal.product.unidad_venta.toLowerCase()}
                </span>
              </div>
              <div className="space-y-3">
                {/* Pesos input */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Monto en Pesos (RD$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">RD$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={pesosInput} 
                      onChange={e => handlePesosChange(e.target.value)} 
                      className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left text-sm font-black text-gray-900 outline-none font-mono focus:border-blue-500" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div className="flex justify-center -my-1">
                  <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">Equivale a</span>
                </div>

                {/* Weight input */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Cantidad de {weightModal.product.unidad_venta}</label>
                  <div className="relative">
                    <input 
                      autoFocus 
                      type="number" 
                      step="0.001" 
                      value={weightModal.weight} 
                      onChange={e => handleWeightChange(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left text-sm font-black text-blue-650 outline-none font-mono focus:border-blue-500" 
                      placeholder="0.000" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold block uppercase text-[10px]">{weightModal.product.unidad_venta.toLowerCase()}</span>
                  </div>
                </div>

                {scaleError && <p className="text-red-500 text-xs font-bold text-center font-sans">{scaleError}</p>}
                
                <button 
                  onClick={handleReadScale} 
                  disabled={scaleLoading} 
                  className="w-full py-2 bg-gray-100 text-gray-700 hover:bg-gray-150 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-center font-sans border-0 cursor-pointer"
                >
                  {scaleLoading ? 'Leyendo...' : 'LEER BALANZA SENSOR'}
                </button>
              </div>

              {/* Delivery helper preview */}
              {weightModal.weight && parseFloat(weightModal.weight) > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-105 rounded-xl text-center text-xs">
                  <p className="text-gray-500 font-bold">Acción de Despacho:</p>
                  <p className="text-blue-900 font-black text-sm my-0.5">
                    Vender {parseFloat(weightModal.weight).toFixed(3)} {weightModal.product.unidad_venta.toLowerCase()}(s)
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Importe final: {formatCurrency(parseFloat(weightModal.weight) * weightModal.product.precio_venta)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1 font-sans text-xs shrink-0">
                <button onClick={() => { setWeightModal(null); setPesosInput(''); }} className="py-3 border border-gray-150 rounded-xl font-bold hover:bg-gray-50 font-sans cursor-pointer outline-none">CANCELAR</button>
                <button onClick={confirmWeight} className="py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 font-sans cursor-pointer outline-none">AGREGAR</button>
              </div>
            </motion.div>
          </div>
        )}

        {showVerifoneScreen && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[250] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-zinc-800 text-zinc-150 p-6 rounded-[2.5rem] w-full max-w-xl shadow-2xl border border-zinc-700 space-y-5 flex flex-col font-sans text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-zinc-700 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Cpu className="h-5 w-5 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white uppercase tracking-tight font-sans">VÍNCULO DE TERMINAL ACTIVO</h4>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest font-sans">Verifone Smart EMV Interface</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* EST-005: Simulation mode badge */}
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Modo Simulación — Integración Futura
                  </span>
                  <button
                    onClick={cancelVerifoneTransaction}
                    className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all animate-pulse"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Physical/Tactile Verifone Terminal GUI Card */}
              <div className="bg-zinc-900 border border-zinc-950 p-5 rounded-[2rem] shadow-inner space-y-4 flex flex-col self-center w-full max-w-sm">
                
                {/* Device Logo Header */}
                <div className="flex justify-between items-center text-[8px] text-zinc-500 font-bold tracking-widest px-1">
                  <span>VERIFONE Vx520/WiFi</span>
                  <span>ONLINE v3.1</span>
                </div>

                {/* Simulated LCD Screen */}
                <div className="bg-cyan-950 border-[5px] border-zinc-800 rounded-2xl p-4 text-cyan-400 font-mono text-xs leading-5 select-none shadow-md h-36 flex flex-col justify-between shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-cyan-900/10 opacity-75 pointer-events-none" />
                  
                  {/* Liquid Crystal Display text */}
                  <div className="space-y-1 z-10">
                    <div className="flex justify-between font-black border-b border-cyan-900 pb-1 text-[9px]">
                      <span>{verifoneBrand.toUpperCase()} TERMINAL</span>
                      <span className="animate-pulse">● TX_MODE</span>
                    </div>
                    <div className="pt-1.5 text-[9px] text-cyan-300">
                      ID: <span className="text-white font-extrabold">{verifoneTerminalId}</span> ({verifoneConnectionMethod})
                    </div>
                    <div className="text-[11px] font-black text-white mt-1">
                      COBRO: RD$ {total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] text-cyan-200 mt-1.5 line-clamp-3 leading-snug">
                      {verifoneMsg}
                    </div>
                  </div>

                  {/* LCD Status Pill */}
                  <div className="flex justify-between items-center text-[8px] border-t border-cyan-900/40 pt-1 z-10">
                    <span className="uppercase text-cyan-500 font-bold">Protocolo: TCP-IP</span>
                    <span className="font-bold flex items-center gap-1 text-cyan-400">
                      {verifoneStatus === 'linking' && <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-400" />}
                      {verifoneStatus === 'waiting_card' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
                      {verifoneStatus === 'processing' && <Loader2 className="h-2.5 w-2.5 animate-spin text-cyan-400" />}
                      {verifoneStatus === 'approved' && <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />}
                      {verifoneStatus === 'failed' && <span className="h-1.5 w-1.5 bg-red-400 rounded-full" />}
                      {verifoneStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Interactive Swipe Slit visual indicator */}
                <div className="h-4 p-1 rounded-md bg-zinc-800 border border-zinc-700 flex justify-between items-center text-[7px] text-zinc-500 uppercase tracking-widest font-black leading-none shadow-inner">
                  <span>← RANURA CHIP EMV</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 shadow-inner" />
                </div>

                {/* Verifone Keyboard grid keys */}
                <div className="grid grid-cols-4 gap-1.5 px-2">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="bg-zinc-850 text-zinc-300 rounded-md py-1 text-center font-bold text-[9px] border-b-2 border-zinc-950 shadow select-none">{n}</div>
                  ))}
                  <div className="bg-red-900 hover:bg-red-800 text-white rounded-md py-1 text-center font-black text-[9px] border-b-2 border-red-950 cursor-pointer shadow select-none" onClick={cancelVerifoneTransaction}>CANC</div>

                  {[4, 5, 6].map(n => (
                    <div key={n} className="bg-zinc-850 text-zinc-300 rounded-md py-1 text-center font-bold text-[9px] border-b-2 border-zinc-950 shadow select-none">{n}</div>
                  ))}
                  <button onClick={() => simulateFailureDecline('Fondos Insuficientes')} disabled={verifoneStatus !== 'waiting_card'} className="bg-amber-650 disabled:opacity-40 text-white rounded-md py-1 text-center font-black text-[8px] border-b-2 border-amber-950 cursor-pointer shadow select-none">RECHAZ</button>

                  {[7, 8, 9].map(n => (
                    <div key={n} className="bg-zinc-850 text-zinc-300 rounded-md py-1 text-center font-bold text-[9px] border-b-2 border-zinc-950 shadow select-none">{n}</div>
                  ))}
                  <button onClick={simulateSuccessInsertion} disabled={verifoneStatus !== 'waiting_card'} className="bg-emerald-600 disabled:opacity-40 text-white rounded-md py-1 text-center font-black text-[8px] border-b-2 border-emerald-950 cursor-pointer shadow select-none">APROB</button>
                </div>
              </div>

              {/* Operator Simulator Control Panel */}
              <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-700/60 space-y-3">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block font-sans">Panel Simulador del Operador POS</span>
                
                {verifoneStatus === 'linking' && (
                  <div className="py-2 text-center text-xs text-zinc-400 font-bold flex items-center justify-center gap-2 uppercase">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    Buscando Verifone en la red local...
                  </div>
                )}

                {verifoneStatus === 'waiting_card' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider text-center font-sans">Simula la interacción del cliente con el aparato:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={simulateSuccessInsertion}
                        className="py-2.5 bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-wider rounded-xl text-white shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 font-sans"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Pagar Tarjeta (Ok)
                      </button>
                      <button
                        onClick={() => simulateFailureDecline('FONDOS INSUFICIENTES (ERR 51)')}
                        className="py-2.5 bg-red-650 hover:bg-red-700 font-black text-[10px] uppercase tracking-wider rounded-xl text-white transition-all font-sans"
                      >
                        Fondo Insuficiente
                      </button>
                    </div>
                    <div className="pt-1 select-none">
                      <button
                        onClick={() => simulateFailureDecline('TARJETA VENCIDA (ERR 33)')}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[9px] text-zinc-400 font-extrabold uppercase font-sans"
                      >
                        Tarjeta Expirada (Simulation)
                      </button>
                    </div>
                  </div>
                )}

                {verifoneStatus === 'processing' && (
                  <div className="py-2 text-center text-xs text-cyan-400 font-bold flex flex-col items-center justify-center gap-2 uppercase animate-pulse font-sans">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Procesando firma EMV... Por favor espere.
                  </div>
                )}

                {verifoneStatus === 'approved' && (
                  <div className="space-y-3">
                    <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs text-center space-y-1">
                      <p className="font-sans font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        ¡CONEXIÓN DE COBRO EXITOSA!
                      </p>
                      <p className="text-[9px] font-sans text-zinc-400">Transacción aprobada de manera directa por la red {verifoneBrand.toUpperCase()}.</p>
                    </div>
                    <button
                      onClick={() => {
                        handleCompleteSale('Tarjeta', verifoneApproval);
                        setShowVerifoneScreen(false);
                      }}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 font-sans"
                    >
                      REGISTRAR VENTA Y EMITIR RECIBO
                    </button>
                  </div>
                )}

                {verifoneStatus === 'failed' && (
                  <div className="space-y-2">
                    <div className="bg-red-950/40 p-3 rounded-xl border border-red-500/20 text-red-400 text-xs text-center font-bold font-sans">
                      TRANSACCIÓN RECHAZADA POR LA RED DEL BANCO
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={startVerifoneTransaction}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl font-bold uppercase tracking-wider text-[10px] font-sans"
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={cancelVerifoneTransaction}
                        className="py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] font-sans"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </>
    );
  };

  if (isKioskMode) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-slate-100 z-[100] flex flex-col h-screen overflow-hidden p-6 font-sans select-none">
        {/* Kiosk Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-emerald-900/40">
              <ShoppingCart className="text-white h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tighter text-white uppercase leading-none">VUTTIK TERMINAL</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">MODO KIOSKO</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">SUPERMERCADO FACTURACIÓN • CAJA #BOX-01</p>
            </div>
          </div>

          {/* Quick Stats Panel in Header */}
          <div className="hidden lg:flex items-center gap-6 bg-slate-900/85 px-6 py-2.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-4 w-4 text-slate-450" />
              <div className="text-left">
                <span className="block text-[8px] font-black text-slate-500 uppercase">Cajero</span>
                <span className="font-bold text-slate-300">{profile?.nombre}</span>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-4 w-4 text-slate-450" />
              <div className="text-left">
                <span className="block text-[8px] font-black text-slate-500 uppercase">Hora Actual</span>
                <span className="font-mono font-bold text-slate-200">{format(currentTime, 'HH:mm:ss')}</span>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-4 w-4 text-slate-450" />
              <div className="text-left font-sans">
                <span className="block text-[8px] font-black text-slate-500 uppercase">Fecha</span>
                <span className="font-bold text-slate-300">{format(currentTime, 'dd MMM, yyyy', { locale: es }).toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Scale status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-850 text-emerald-400 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Balanza Online</span>
            </div>

            {/* Minimize / Exit button */}
            <button
              onClick={toggleKioskMode}
              className="flex items-center gap-2 px-5 py-3 bg-red-600/10 border border-red-500/20 hover:bg-red-650 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest text-red-400 transition-all select-none"
            >
              <Minimize2 className="h-4 w-4" />
              Salir Kiosko
            </button>
          </div>
        </div>

        {/* Kiosk Content Layout */}
        <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden mt-6">
          {/* Left panel - searchable products and categories */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 overflow-hidden h-full">
            {/* Search Input Custom Block */}
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 h-6 w-6 group-focus-within:text-emerald-500 transition-colors" />
              <input
                ref={kioskSearchRef}
                autoFocus
                type="text"
                placeholder="ESCANEA CÓDIGO DE BARRAS O BUSCA ARTÍCULO... [F10 PARA ENFOCAR]"
                className="w-full pl-16 pr-40 py-5 bg-slate-900 border-2 border-slate-800 rounded-3xl focus:border-emerald-500 outline-none font-black text-xl text-white placeholder:text-slate-600 tracking-tight transition-all font-sans"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredProducts.length === 1) {
                    addToCart(filteredProducts[0]);
                    setSearch('');
                    e.preventDefault();
                  }
                }}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-705 font-mono">F10</span>
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-sans">ESCANER LISTO</span>
              </div>
            </div>

            {/* Categories Selectors Tabs Scrollable */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-shrink-0">
              {categories.map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "flex-shrink-0 px-6 py-3.5 rounded-2xl font-black text-xs tracking-widest uppercase transition-all border",
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xl shadow-emerald-900/30 scale-[1.03]"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Kiosk High Density Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-6 content-start scrollbar-none">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map(product => {
                  const isStockWarning = product.cantidad_disponible <= product.stock_minimo;
                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 text-left flex flex-col hover:border-emerald-500 hover:bg-slate-900 hover:shadow-2xl hover:-translate-y-0.5 transition-all group relative overflow-hidden h-[10.5rem]"
                    >
                      <div className="absolute top-4 right-4 z-10">
                        {isStockWarning ? (
                          <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-1.5 rounded-full animate-pulse">
                            <AlertCircle className="h-4 w-4" />
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-slate-500 group-hover:text-emerald-400 transition-colors uppercase font-mono">
                            {product.unidad_venta.toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <span className="text-[9px] font-black text-slate-500 mb-1 tracking-widest uppercase truncate max-w-[80%]">
                        {product.categoria}
                      </span>
                      <span className="font-extrabold text-white mb-2 flex-1 line-clamp-2 leading-tight text-sm uppercase group-hover:text-emerald-350 transition-colors">
                        {product.nombre}
                      </span>

                      <div className="mt-auto">
                        <span className="block text-2xl font-black text-emerald-400 font-mono tracking-tighter">
                          RD${product.precio_venta}
                        </span>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                            isStockWarning 
                              ? "bg-red-500/10 text-red-400 border-red-500/20" 
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          )}>
                            STOCK: {product.cantidad_disponible} {product.unidad_venta.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-28 text-center flex flex-col items-center justify-center space-y-3">
                  <p className="text-slate-500 font-black text-2xl uppercase tracking-widest">No se encontraron productos</p>
                  <p className="text-slate-600 text-xs font-bold uppercase">Intenta buscar por otra categoría o palabra clave</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - checkout ticket / shopping list */}
          <div className="col-span-12 lg:col-span-4 flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden sticky top-0 h-full shadow-2xl">
            {/* Header of Billing panel */}
            <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-md font-black text-white uppercase tracking-tight">Caja de Factura</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">ORDEN #{shift.id.slice(-6)}</p>
                </div>
              </div>
              <motion.span 
                key={cart.length}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="bg-slate-800 text-slate-200 border border-slate-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                {cart.reduce((a, b) => a + b.quantity, 0)} ITEMS
              </motion.span>
            </div>

            {/* List items inside Billing box */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 content-start">
              <AnimatePresence initial={false}>
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 text-center opacity-40 select-none">
                    <div className="h-20 w-20 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="h-10 w-10 text-slate-500" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">Carrito Vacío</p>
                    <p className="text-[10px] font-bold mt-1.5 uppercase text-slate-500">Pasa un artículo por el scanner o búscalo</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -25 }}
                      key={item.id} 
                      className="flex items-center gap-4 bg-slate-950/85 border border-slate-800/80 p-4 rounded-2xl group transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-white truncate uppercase text-sm leading-tight">{item.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-emerald-400 font-mono">RD${item.precio_venta}</span>
                          <span className="text-[9px] font-bold text-slate-550 uppercase">x {item.quantity} {item.unidad_venta.slice(0, 3)}</span>
                        </div>
                      </div>
                      <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
                        <button onClick={() => updateQuantity(item.id, -1)} className="h-9 w-9 rounded-lg bg-slate-940 border border-slate-800 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors font-black text-lg select-none">-</button>
                        <span className="w-10 text-center font-black text-sm font-mono text-slate-200">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="h-9 w-9 rounded-lg bg-slate-940 border border-slate-800 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors font-black text-lg select-none">+</button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Bottom totals inside billing panel */}
            <div className="p-6 bg-slate-950 border-t border-slate-800 space-y-4 flex-shrink-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span className="font-black uppercase tracking-widest text-[10px]">Subtotal Acumulado</span>
                  <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between items-end pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-0.5">Total de Factura</span>
                    <span className="text-4xl font-black font-mono tracking-tighter text-white animate-pulse">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider font-mono">RD$</span>
                  </div>
                </div>
              </div>

              {/* Action buttons inside kiosk billing board */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  disabled={cart.length === 0 || processing}
                  onClick={() => {
                    setPayMethod('Efectivo');
                    setMontoRecibido('');
                    setClienteName('');
                    setClienteRnc('');
                    setTipoComprobante('Consumidor Final');
                    setNcfCode(generateNcfCodeForType('Consumidor Final'));
                    setAplicarItbis(true);
                    setShowPayModal(true);
                  }}
                  className="col-span-2 flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white py-6 rounded-2xl font-black text-xl transition-all shadow-xl shadow-emerald-500/15 disabled:opacity-40 select-none group"
                >
                  <Banknote className="h-7 w-7 group-hover:scale-110 transition-transform" />
                  COBRAR FACTURA
                </button>
                
                <button 
                  disabled={cart.length === 0 || processing}
                  onClick={() => {
                    setPayMethod('Tarjeta');
                    setMontoRecibido('');
                    setClienteName('');
                    setClienteRnc('');
                    setTipoComprobante('Consumidor Final');
                    setNcfCode(generateNcfCodeForType('Consumidor Final'));
                    setAplicarItbis(true);
                    setShowPayModal(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-emerald-500 hover:border-emerald-600 text-slate-300 hover:text-white py-4 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all disabled:opacity-30 select-none"
                >
                  <CreditCard className="h-4 w-4" />
                  TARJETA
                </button>

                <button 
                  disabled={cart.length === 0 || processing}
                  className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-amber-500 hover:border-amber-600 text-slate-300 hover:text-white py-4 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all disabled:opacity-30 select-none"
                  onClick={() => {
                    setPayMethod('Transferencia');
                    setMontoRecibido('');
                    setClienteName('');
                    setClienteRnc('');
                    setTipoComprobante('Consumidor Final');
                    setNcfCode(generateNcfCodeForType('Consumidor Final'));
                    setAplicarItbis(true);
                    setShowPayModal(true);
                  }}
                >
                  <Users className="h-4 w-4" />
                  TRANSFERENCIA
                </button>
                
                <button 
                  disabled={cart.length === 0}
                  onClick={() => setCart([])}
                  className="col-span-2 flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 py-2.5 rounded-lg font-black text-[9px] tracking-widest uppercase transition-all select-none"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar Orden
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODALS RENDERER */}
        {renderModals()}
      </div>
    );
  }

  // STANDARD LAYOUT (Normal screen inside admin skeleton)
  return (
    <div className="flex flex-col gap-3 md:gap-4 h-full w-full overflow-hidden min-h-0 select-none">
      {/* Upper professional Title Dashboard Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-950 tracking-tight uppercase leading-none">Punto de Venta</h1>
            <span className="h-2 w-2 rounded-full bg-emerald-505 animate-pulse mt-0.5" title="Corte Abierto" />
          </div>
          <p className="text-gray-400 font-sans text-[10px] font-black tracking-widest uppercase mt-1">
            Terminal activa para: <span className="text-blue-600 underline font-extrabold">{profile?.nombre}</span> • Orden #{shift.id.slice(-6)}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live System Time */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl text-xs font-black text-gray-650">
            <Clock className="h-4 w-4 text-gray-405" />
            <span className="font-mono">{format(currentTime, 'HH:mm:ss')}</span>
          </div>

          <button
            onClick={() => navigate('/shifts', { state: { openCloseModal: true } })}
            className="flex items-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/15 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Turno
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
        {/* Search & Products List (Left, narrower) */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden h-full">
          {/* Top Search Input Box */}
          <div className="relative group flex-shrink-0" id="pos-search-input-container">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-blue-600 transition-colors" />
            <input 
              ref={searchInputRef}
              type="text" 
              id="pos-search-input"
              placeholder="ESCANEA VALOR O ESCRIBE PARA BUSCAR... [F10]"
              className="w-full pl-14 pr-24 py-4.5 bg-white border-2 border-gray-105 rounded-2xl shadow-sm focus:border-blue-505 outline-none font-black text-md placeholder:text-gray-300 tracking-tight transition-all font-sans"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length === 1) {
                  addToCart(filteredProducts[0]);
                  setSearch('');
                  e.preventDefault();
                }
              }}
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black bg-gray-100 text-gray-450 border border-gray-200 px-2.5 py-1 rounded-md font-mono">F10</span>
          </div>

          {/* Frequent Category Tabs Selector Row */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrolls-none flex-shrink-0">
            {categories.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all border",
                    isActive
                      ? "bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-550/15"
                      : "bg-white text-gray-450 border-gray-100 hover:text-gray-800"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* List Area - Vertically Stacked Products */}
          <div id="pos-product-list" className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 pb-4 content-start scrolling-none">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => {
                const isStockCritical = product.cantidad_disponible <= product.stock_minimo;
                return (
                  <motion.button
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.12 }}
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white p-3 rounded-xl border border-gray-150 hover:border-blue-300 hover:bg-blue-50/10 transition-all text-left flex items-center justify-between gap-3 group shadow-sm flex-shrink-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                        isStockCritical ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {isStockCritical ? (
                          <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black text-gray-400 tracking-widest uppercase">{product.categoria}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-md",
                            isStockCritical ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            STOCK: {product.cantidad_disponible} {product.unidad_venta.toUpperCase()}(S)
                          </span>
                        </div>
                        <h4 className="font-extrabold text-gray-905 group-hover:text-blue-600 transition-colors text-xs uppercase truncate mt-0.5 leading-snug">
                          {product.nombre}
                        </h4>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="block text-[15px] font-black text-blue-600 font-mono tracking-tight leading-none">
                        RD${product.precio_venta}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-gray-400 block mt-0.5 leading-none">
                        AGREGAR +
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {filteredProducts.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-1 opacity-70 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-405 font-black text-sm uppercase tracking-widest">No hay resultados</p>
                <p className="text-gray-300 text-[10px] font-bold uppercase">Busca por otro término o filtro</p>
              </div>
            )}
          </div>
        </div>

        {/* Right billing panel (detalles de venta - wider for best tracking experience) */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
          <div className="px-5 py-3.5 border-b border-gray-105 bg-gray-50/55 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-950 uppercase tracking-tight">Detalle de Cobro</h2>
                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mt-0.5">ORDEN #{shift.id.slice(-6)}</p>
              </div>
            </div>
            
            <motion.span 
              key={cart.length}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gray-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
            >
              {cart.reduce((a, b) => a + b.quantity, 0)} ITEMS
            </motion.span>
          </div>
 
          {/* Cart list container */}
          <div id="pos-cart-panel" className="flex-1 overflow-y-auto p-4 space-y-2 content-start">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 p-8 text-center opacity-45 select-none my-auto">
                  <div className="h-20 w-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="h-10 w-10 text-gray-450" />
                  </div>
                  <p className="font-black text-sm uppercase tracking-widest">Lista Vacía</p>
                  <p className="text-[10px] font-bold mt-1 uppercase text-gray-400">Escanea un producto para cobrarlo</p>
                </div>
              ) : (
                cart.map(item => (
                  <motion.div 
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    key={item.id} 
                    className="flex items-center gap-3 bg-white border border-gray-100/90 p-3.5 rounded-2xl hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-extrabold text-gray-900 truncate uppercase text-xs leading-none">{item.nombre}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{formatCurrency(item.precio_venta)}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase">x {item.quantity} {item.unidad_venta.slice(0, 3)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center bg-gray-50 p-0.5 rounded-lg border border-gray-100 flex-shrink-0">
                      <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-md bg-white border border-gray-150 flex items-center justify-center hover:bg-red-50 hover:text-red-600 font-extrabold text-md select-none">-</button>
                      <span className="w-8 text-center font-black text-xs font-mono">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8 rounded-md bg-white border border-gray-150 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 font-extrabold text-md select-none">+</button>
                    </div>

                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Lower totals footer bill panel */}
          <div className="p-6 bg-slate-950 text-white space-y-4 flex-shrink-0">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span className="font-black uppercase tracking-widest text-[9px]">Subtotal Bruto</span>
                <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-end pt-3 border-t border-slate-900">
                <div>
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Monto de ley a Cobrar</span>
                  <span className="text-4xl font-black font-mono tracking-tighter text-blue-105">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider font-mono">RD$</span>
                </div>
              </div>
            </div>

            {/* Pay tools trigger keyboard grid */}
            <div className="grid grid-cols-2 gap-3 pt-2" id="pos-pay-actions-grid">
              <button 
                id="pos-pay-btn"
                disabled={cart.length === 0 || processing}
                onClick={() => {
                  setPayMethod('Efectivo');
                  setMontoRecibido('');
                  setClienteName('');
                  setClienteRnc('');
                  setTipoComprobante('Consumidor Final');
                  setNcfCode(generateNcfCodeForType('Consumidor Final'));
                  setAplicarItbis(true);
                  setShowPayModal(true);
                }}
                className="col-span-2 flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white py-5 rounded-[1.5rem] font-black text-xl transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-40 select-none group"
              >
                <Banknote className="h-6 w-6 group-hover:scale-110 transition-transform" />
                COBRAR FACTURA
              </button>
              
              <button 
                disabled={cart.length === 0 || processing}
                onClick={() => {
                  setPayMethod('Tarjeta');
                  setMontoRecibido('');
                  setClienteName('');
                  setClienteRnc('');
                  setTipoComprobante('Consumidor Final');
                  setNcfCode(generateNcfCodeForType('Consumidor Final'));
                  setAplicarItbis(true);
                  setShowPayModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-blue-600 text-white py-3.5 rounded-xl font-black text-[9px] tracking-wider uppercase transition-all disabled:opacity-30 select-none"
              >
                <CreditCard className="h-4 w-4" />
                TARJETA
              </button>

              <button 
                disabled={cart.length === 0 || processing}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-amber-500 text-white py-3.5 rounded-xl font-black text-[9px] tracking-wider uppercase transition-all disabled:opacity-30 select-none"
                onClick={() => {
                  setPayMethod('Transferencia');
                  setMontoRecibido('');
                  setClienteName('');
                  setClienteRnc('');
                  setTipoComprobante('Consumidor Final');
                  setNcfCode(generateNcfCodeForType('Consumidor Final'));
                  setAplicarItbis(true);
                  setShowPayModal(true);
                }}
              >
                <Users className="h-4 w-4" />
                TRANSF.
              </button>
              
              <button 
                disabled={cart.length === 0}
                onClick={() => setCart([])}
                className="col-span-2 flex items-center justify-center gap-2 text-white/35 hover:text-red-400 py-1.5 rounded-lg font-black text-[9px] tracking-widest uppercase transition-all select-none"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Cancelar Venta actual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER MODAL LAYOUTS */}
      {renderModals()}
    </div>
  );
}
