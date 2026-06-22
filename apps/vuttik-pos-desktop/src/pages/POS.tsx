import React, { useState, useEffect } from 'react';
import { ShoppingCart, LogOut, Plus, Minus, CreditCard, Receipt, Search, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function POS({ session, isOnline }: { session: any, isOnline: boolean }) {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Shift (Caja) States
  const [activeShift, setActiveShift] = useState<any>(null);
  const [showShiftModal, setShowShiftModal] = useState(true);
  const [shiftAmount, setShiftAmount] = useState('');
  const [isClosingShift, setIsClosingShift] = useState(false);

  // Clients State
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const bid = session.profile.business_id || session.profile.business?.id;
        if (!bid) return;
        
        // 1. Fetch active shift
        const shiftRes = await fetch(`http://localhost:3005/api/shifts/${bid}/active`);
        if (shiftRes.ok) {
          const shiftData = await shiftRes.json();
          if (shiftData) {
            setActiveShift(shiftData);
            setShowShiftModal(false);
          } else {
            setShowShiftModal(true);
          }
        }

        // 2. Fetch products
        const prodRes = await fetch(`http://localhost:3005/api/products/${bid}`);
        if (prodRes.ok) setProducts(await prodRes.json());

        // 3. Fetch clients
        const clientRes = await fetch(`http://localhost:3005/api/clients/${bid}`);
        if (clientRes.ok) setClients(await clientRes.json());
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    };
    loadInitialData();
  }, [session]);

  const addToCart = (prod: any) => {
    setCart(prev => {
      const ex = prev.find(p => p.id === prod.id);
      if (ex) return prev.map(p => p.id === prod.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === id) {
        const n = p.qty + delta;
        return n > 0 ? { ...p, qty: n } : p;
      }
      return p;
    }).filter(p => p.qty > 0));
  };

  const total = cart.reduce((acc, p) => acc + (p.price * p.qty), 0);
  
  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const bid = session.profile.business_id || session.profile.business?.id;
      const res = await fetch('http://localhost:3005/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: bid,
          user_id: session.user.id,
          total,
          items: cart
        })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setCart([]);
        }, 2000);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleShift = async () => {
    if (!shiftAmount || isNaN(Number(shiftAmount))) return;
    setLoading(true);
    try {
      const bid = session.profile.business_id || session.profile.business?.id;
      if (isClosingShift && activeShift) {
        // Close shift
        const res = await fetch('http://localhost:3005/api/shifts/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeShift.id, closing_amount: Number(shiftAmount), user_id: session.user.id })
        });
        if (res.ok) {
          setActiveShift(null);
          setShowShiftModal(true);
          setIsClosingShift(false);
          setShiftAmount('');
        }
      } else {
        // Open shift
        const res = await fetch('http://localhost:3005/api/shifts/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: bid, user_id: session.user.id, opening_amount: Number(shiftAmount) })
        });
        if (res.ok) {
          const data = await res.json();
          setActiveShift({ id: data.shiftId, opening_amount: Number(shiftAmount) });
          setShowShiftModal(false);
          setShiftAmount('');
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleQuote = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const bid = session.profile.business_id || session.profile.business?.id;
      const res = await fetch('http://localhost:3005/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: bid,
          user_id: session.user.id,
          client_id: selectedClient?.id || null,
          total,
          items: cart
        })
      });
      if (res.ok) {
        alert('Cotización guardada exitosamente offline.');
        setCart([]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex bg-slate-50 text-slate-800 relative">
      
      {/* SHIFT MODAL */}
      <AnimatePresence>
        {showShiftModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-[400px] flex flex-col items-center"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">APERTURA DE TURNO</h2>
              <p className="text-slate-500 mb-6 text-center">Ingresa el fondo de caja inicial para comenzar a vender u operar offline.</p>
              <div className="w-full relative mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  value={shiftAmount}
                  onChange={e => setShiftAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-center font-bold text-xl text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <button 
                onClick={() => { setIsClosingShift(false); handleShift(); }}
                disabled={loading || !shiftAmount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Abriendo...' : 'ABRIR TURNO'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT: PRODUCTS GRID */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-200">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Terminal de Ventas</h2>
              <p className="text-sm text-slate-500">{session.profile.nombre} - {session.profile.business?.nombre || 'Mi Negocio'}</p>
            </div>
            <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 transition-colors" onClick={() => window.location.reload()}>
              <LogOut size={20} />
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar productos..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                key={p.id} 
                onClick={() => addToCart(p)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col text-left hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Stock: {p.stock}</p>
                </div>
                <div className="mt-4 font-bold text-lg text-blue-600">
                  ${p.price.toFixed(2)}
                </div>
              </motion.button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center">
                <ShoppingCart size={48} className="opacity-20 mb-4" />
                <p>No se encontraron productos.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: CART TICKET */}
      <div className="w-[380px] bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Receipt size={20} className="text-blue-600" />
            Ticket Actual
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {cart.map(p => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={p.id} 
                className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium text-slate-800 text-sm leading-tight flex-1 pr-2">{p.title}</span>
                  <span className="font-bold text-slate-900">${(p.price * p.qty).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">${p.price.toFixed(2)} c/u</span>
                  
                  {/* QTY CONTROLS - En una misma línea */}
                  <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-1 shadow-sm whitespace-nowrap">
                    <button onClick={() => updateQty(p.id, -1)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-md transition-colors"><Minus size={14}/></button>
                    <span className="font-semibold text-slate-700 w-6 text-center select-none text-sm">{p.qty}</span>
                    <button onClick={() => updateQty(p.id, 1)} className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 rounded-md transition-colors"><Plus size={14}/></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50 pt-20">
              <ShoppingCart size={64} strokeWidth={1} />
              <p>El ticket está vacío</p>
            </div>
          )}
        </div>

        {/* CHECKOUT SECTION */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-medium">Total a cobrar</span>
            <span className="text-2xl font-black text-slate-900">${total.toFixed(2)}</span>
          </div>
          
          <button 
            disabled={cart.length === 0 || loading}
            onClick={handleCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          >
            <CreditCard size={20} />
            COBRAR OFFLINE
          </button>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button 
              disabled={cart.length === 0 || loading}
              onClick={handleQuote}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
            >
              COTIZACIÓN
            </button>
            <button 
              onClick={() => { setIsClosingShift(true); setShowShiftModal(true); }}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-all"
            >
              CERRAR CAJA
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
