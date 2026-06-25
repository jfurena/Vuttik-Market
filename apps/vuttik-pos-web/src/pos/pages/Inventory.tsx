import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Product, UnitType } from '../types';
import { Plus, Search, Filter, AlertTriangle, Edit2, Package, RefreshCw, Wand2, Loader2, ShoppingCart, History, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Inventory() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchingBarcode, setSearchingBarcode] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState<{ product: Product, amount: string } | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<{ product: Product, amount: string, cost: string, fuente_pago: 'Caja' | 'Banco' | 'Inversion Externa' } | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterStock, setFilterStock] = useState('Todos');
  // Barcode scanner logic
  useEffect(() => {
    let barcode = '';
    let lastTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If we are typing in an input (except the barcode one), don't trigger global scanner
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        // If it's the specific barcode input, let the field handle it
        if (target.getAttribute('data-barcode-input') === 'true') return;
        
        // If it's a search field or others, don't trigger scanning mode
        if (target.id !== 'global-scanner-trigger') return;
      }

      const currentTime = Date.now();
      if (currentTime - lastTime > 50) {
        barcode = '';
      }

      if (e.key === 'Enter') {
        if (barcode.length > 3) {
          handleBarcodeScanned(barcode);
          barcode = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        barcode += e.key;
      }
      lastTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const handleBarcodeScanned = (code: string) => {
    setFormData(prev => ({ ...prev, codigo_barra: code }));
    if (!showAddModal) setShowAddModal(true);
    // Give state a moment to catch up
    setTimeout(() => {
      handleLookupBarcode(code);
    }, 100);
  };

  // Form State
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'fecha_creacion' | 'fecha_actualizacion'> & { fuente_pago?: 'Caja' | 'Banco' | 'Inversion Externa', motivo_edicion?: string }>({
    nombre: '',
    codigo_barra: '',
    categoria: '',
    marca: '',
    costo_compra: 0,
    precio_venta: 0,
    cantidad_disponible: 0,
    stock_minimo: 5,
    unidad_venta: UnitType.UNIDAD,
    estado: 'activo',
    fuente_pago: 'Caja',
    motivo_edicion: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadError(null);
    try {
      const data = await ApiService.getProducts();
      if (!Array.isArray(data)) {
        // Server returned an error object (e.g. 401 session expired)
        const errMsg = (data as any)?.error || 'Respuesta inesperada del servidor.';
        setLoadError(errMsg);
        setProducts([]);
      } else {
        setProducts(data);
      }
    } catch (err: any) {
      setLoadError('No se pudo conectar con el servidor. Verifica tu conexión.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigo_barra: '',
      categoria: '',
      marca: '',
      costo_compra: 0,
      precio_venta: 0,
      cantidad_disponible: 0,
      stock_minimo: 5,
      unidad_venta: UnitType.UNIDAD,
      estado: 'activo',
      fuente_pago: 'Caja',
      motivo_edicion: ''
    });
    setEditingProduct(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      codigo_barra: product.codigo_barra,
      categoria: product.categoria,
      marca: product.marca || '',
      costo_compra: product.costo_compra,
      precio_venta: product.precio_venta,
      cantidad_disponible: product.cantidad_disponible,
      stock_minimo: product.stock_minimo,
      unidad_venta: product.unidad_venta,
      estado: product.estado,
      fuente_pago: 'Caja',
      motivo_edicion: ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      let result;
      if (editingProduct) {
        result = await ApiService.updateProduct(editingProduct.id, { ...formData, usuario_id: profile.id, usuario_nombre: profile.nombre });
      } else {
        result = await ApiService.addProduct({ ...formData, usuario_id: profile.id, usuario_nombre: profile.nombre } as any);
      }
      if (result && (result as any).error) {
        alert('Error al guardar: ' + (result as any).error);
        return;
      }
      setShowAddModal(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert('Error al guardar el producto: ' + (error?.message || 'Verifica tu conexión.'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
    if (!confirm('¿Seguro que deseas eliminar este producto? Esta acción quedará registrada en la auditoría.')) return;
    
    try {
      await ApiService.deleteProduct(id, profile.id, profile.nombre);
      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleLookupBarcode = async (codeToUse?: string) => {
    const code = codeToUse || formData.codigo_barra;
    if (!code) return;
    setSearchingBarcode(true);
    try {
      const data = await ApiService.lookupBarcode(code);
      if (data) {
        setFormData(prev => ({
          ...prev,
          codigo_barra: code, // Ensure it's set
          nombre: data.nombre || prev.nombre,
          categoria: data.categoria || prev.categoria,
          marca: data.marca || prev.marca
        }));
      } else if (!codeToUse) {
        alert("No se encontró información para este código. Favor ingresarlo manualmente.");
      }
    } catch (error) {
      console.error("Barcode lookup failed:", error);
    } finally {
      setSearchingBarcode(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustingStock || !profile) return;
    const amount = parseFloat(adjustingStock.amount);
    if (isNaN(amount) || amount === 0) return;

    try {
      let locationMetadata = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
        });
        locationMetadata = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        console.warn("Could not retrieve GPS metadata for inventory adjustment:", err);
      }

      await ApiService.adjustProductStock(adjustingStock.product.id, {
        cantidad: amount,
        tipo_movimiento: amount > 0 ? 'Entrada manual' : 'Salida manual',
        motivo: amount > 0 ? 'Reposición de mercancía' : 'Ajuste por merma/pérdida',
        usuario_id: profile.id,
        metadata: locationMetadata
      });
      setAdjustingStock(null);
      loadProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestock = async () => {
    if (!restockingProduct || !profile) return;
    const amount = parseFloat(restockingProduct.amount);
    const cost = parseFloat(restockingProduct.cost);
    if (isNaN(amount) || amount <= 0 || isNaN(cost) || cost < 0) {
      alert("Por favor ingresa una cantidad y costo válidos.");
      return;
    }

    try {
      await ApiService.restockProduct(restockingProduct.product.id, {
        cantidad: amount,
        costo_unitario: cost,
        motivo: 'Compra de mercancía',
        usuario_id: profile.id,
        usuario_nombre: profile.nombre || 'Usuario',
        fuente_pago: restockingProduct.fuente_pago
      });
      setRestockingProduct(null);
      loadProducts();
    } catch (e: any) {
      console.error(e);
      alert("Error al guardar la compra: Verifica que el servidor backend esté actualizado y corriendo (reinicia la consola donde corre 'npm run dev'). Detalles: " + e.message);
    }
  };

  const handleOpenHistory = async (product: Product) => {
    setViewingHistory(product);
    setLoadingHistory(true);
    try {
      const history = await ApiService.getProductHistory(product.id);
      setProductHistory(history);
    } catch (error) {
      console.error("Error fetching product history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo_barra.includes(search);
    const matchesCategory = filterCategory === 'Todas' || p.categoria === filterCategory;
    const matchesStatus = filterStatus === 'Todos' || p.estado === (filterStatus === 'Activos' ? 'activo' : 'inactivo');
    const matchesStock = filterStock === 'Todos' || 
                         (filterStock === 'Bajo' && p.cantidad_disponible <= p.stock_minimo && p.cantidad_disponible > 0) || 
                         (filterStock === 'Agotado' && p.cantidad_disponible <= 0);
    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  const uniqueCategories = ['Todas', ...Array.from(new Set(products.map(p => p.categoria))).filter(Boolean)];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mis Mercancías & Inventario</h1>
          <p className="text-gray-500 font-medium">Aquí controlas lo que tienes guardado para vender, cambias precios y ves si se está acabando la mercancía.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest text-xs"
        >
          <Plus className="h-6 w-6" />
          + GUARDAR PRODUCTO NUEVO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código de barras..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "border px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors",
              showFilters || filterCategory !== 'Todas' || filterStatus !== 'Todos' || filterStock !== 'Todos'
                ? "bg-blue-50 border-blue-200 text-blue-700" 
                : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
            )}
          >
            <Filter className="h-5 w-5" />
            Filtros
          </button>

          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-20">
              <h4 className="font-black text-gray-900 mb-4 text-sm">Filtrar Productos</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Categoría</label>
                  <select 
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Estado</label>
                  <select 
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Activos">Solo Activos</option>
                    <option value="Inactivos">Solo Inactivos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nivel de Stock</label>
                  <select 
                    value={filterStock}
                    onChange={e => setFilterStock(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Bajo">Stock Bajo (En alerta)</option>
                    <option value="Agotado">Agotados (0 disponibles)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      setFilterCategory('Todas');
                      setFilterStatus('Todos');
                      setFilterStock('Todos');
                      setShowFilters(false);
                    }}
                    className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-red-700 text-sm">Error al cargar productos</p>
            <p className="text-red-600 text-xs mt-0.5">{loadError}</p>
          </div>
          <button onClick={loadProducts} className="text-xs font-black text-red-600 underline hover:no-underline">Reintentar</button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Producto</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sección</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">¿Cuánto queda?</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Precio al Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      <span className="text-sm font-medium">Cargando productos...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 && !loadError ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Package className="h-12 w-12 opacity-20" />
                      <p className="font-bold text-gray-500">No hay productos registrados</p>
                      <p className="text-sm">Pulsa en "+ Guardar Producto Nuevo" para comenzar</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(product => {
                const isLowStock = product.cantidad_disponible <= product.stock_minimo;
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => handleOpenHistory(product)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{product.nombre}</p>
                          <p className="text-xs text-gray-400">{product.codigo_barra}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{product.categoria}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold",
                          isLowStock ? "text-red-600" : "text-gray-900"
                        )}>
                          {product.cantidad_disponible} {product.unidad_venta}
                        </span>
                        {isLowStock && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setAdjustingStock({ product, amount: '' }); }}
                          className="ml-2 p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Ajustar Stock (Merma/Error)"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-blue-600">{formatCurrency(product.precio_venta)}</p>
                      <p className="text-xs text-gray-400">Costo: {formatCurrency(product.costo_compra)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        product.estado === 'activo' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        {product.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setRestockingProduct({ product, amount: '', cost: product.costo_compra.toString(), fuente_pago: 'Caja' }); }}
                          className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl flex items-center gap-1 font-bold text-xs"
                          title="Ingresar Compra"
                        >
                          <TrendingUp className="h-4 w-4" />
                          <span>Comprar</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(product); }}
                          className="text-amber-500 hover:bg-amber-50 p-2 rounded-xl"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl"
                          title="Eliminar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8"
          >
            <h2 className="text-2xl font-black mb-6">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Código de Barra / Escáner</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      required 
                      type="text" 
                      data-barcode-input="true"
                      placeholder="Escanea o escribe el código..."
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-lg" 
                      value={formData.codigo_barra} 
                      onChange={e => setFormData({...formData, codigo_barra: e.target.value})} 
                    />
                    {searchingBarcode && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLookupBarcode()}
                    disabled={searchingBarcode || !formData.codigo_barra}
                    className="px-6 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Wand2 className="h-4 w-4" />
                    Auto-llenar
                  </button>
                </div>
                <p className="text-[10px] text-emerald-500 mt-2 font-black uppercase tracking-wider animate-pulse italic">
                  ✨ No escribas todo, escanea el producto y se llenará solo
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nombre del Producto</label>
                <input required type="text" placeholder="Ej. Arroz Selecto 2lb" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoría</label>
                <input required type="text" placeholder="Ej. Granos, Aceites, Lácteos" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Costo de Compra (RD$)</label>
                <input required type="number" step="0.01" placeholder="0.00" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold" value={formData.costo_compra} onChange={e => setFormData({...formData, costo_compra: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Precio de Venta (RD$)</label>
                <input required type="number" step="0.01" placeholder="0.00" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold animate-pulse focus:animate-none border-blue-100" value={formData.precio_venta} onChange={e => setFormData({...formData, precio_venta: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stock Inicial Disponible</label>
                <input required type="number" step="0.01" placeholder="Ej. 100" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold" value={formData.cantidad_disponible} onChange={e => setFormData({...formData, cantidad_disponible: Number(e.target.value)})} />
              </div>
              {!editingProduct && formData.cantidad_disponible > 0 && (
                <div className="md:col-span-2 mt-2">
                  <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">¿De dónde salió el dinero para este inventario inicial?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Caja', label: 'Caja', desc: 'Turno actual' },
                      { id: 'Banco', label: 'Banco', desc: 'Cuenta de banco' },
                      { id: 'Inversion Externa', label: 'Inversión', desc: 'Capital externo' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({...formData, fuente_pago: opt.id as any})}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          formData.fuente_pago === opt.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-100 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className={`text-xs font-black ${formData.fuente_pago === opt.id ? 'text-blue-700' : 'text-gray-900'}`}>
                          {opt.label}
                        </div>
                        <div className={`text-[9px] mt-1 ${formData.fuente_pago === opt.id ? 'text-blue-600' : 'text-gray-400'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Unidad de Medida del Producto</label>
                <select className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold" value={formData.unidad_venta} onChange={e => setFormData({...formData, unidad_venta: e.target.value as any})}>
                  {Object.values(UnitType).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {editingProduct && (
                <div className="md:col-span-2 mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Motivo de la edición (Auditoría) *</label>
                  <input required type="text" placeholder="Ej. Corrección de precio ingresado mal" className="w-full px-6 py-4 bg-white border-2 border-amber-200 rounded-2xl focus:border-amber-500 outline-none font-bold text-gray-700" value={formData.motivo_edicion} onChange={e => setFormData({...formData, motivo_edicion: e.target.value})} />
                </div>
              )}
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-blue-100">
                  {editingProduct ? 'Guardar Cambios' : 'Registrar'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] max-w-2xl w-full p-8 space-y-6"
          >
            <div className="text-center">
              <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black">Ajustar Stock</h3>
              <p className="text-gray-500">{adjustingStock.product.nombre}</p>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 text-center uppercase">Usa números positivos para entradas y negativos para salidas</p>
              <input 
                autoFocus
                type="number"
                step="0.01"
                placeholder="Ej. 10 o -5"
                className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-center text-3xl font-black text-blue-600"
                value={adjustingStock.amount}
                onChange={e => setAdjustingStock({...adjustingStock, amount: e.target.value})}
              />
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setAdjustingStock(null)}
                  className="py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-50"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleAdjustStock}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-100"
                >
                  CONFIRMAR
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Restock Modal */}
      {restockingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] max-w-2xl w-full p-8 space-y-6"
          >
            <div className="text-center">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black">Ingresar Compra</h3>
              <p className="text-gray-500">{restockingProduct.product.nombre}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">¿Cuántas unidades compraste?</label>
                <input 
                  autoFocus
                  type="number"
                  step="0.01"
                  placeholder="Ej. 50"
                  className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none text-center text-3xl font-black text-emerald-600"
                  value={restockingProduct.amount}
                  onChange={e => setRestockingProduct({...restockingProduct, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Costo unitario actual (Puedes cambiarlo si subió/bajó de precio)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">RD$</span>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full pl-16 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-xl font-black text-gray-900"
                    value={restockingProduct.cost}
                    onChange={e => setRestockingProduct({...restockingProduct, cost: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-4">¿De dónde salió el dinero?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Caja', label: 'Caja', desc: 'Resta de turno actual' },
                    { id: 'Banco', label: 'Banco', desc: 'Dinero en cuenta' },
                    { id: 'Inversion Externa', label: 'Inversión', desc: 'Capital del dueño' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRestockingProduct({...restockingProduct, fuente_pago: opt.id as any})}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        restockingProduct.fuente_pago === opt.id 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-100 bg-white hover:border-emerald-200'
                      }`}
                    >
                      <div className={`text-xs font-black ${restockingProduct.fuente_pago === opt.id ? 'text-emerald-700' : 'text-gray-900'}`}>
                        {opt.label}
                      </div>
                      <div className={`text-[9px] mt-1 ${restockingProduct.fuente_pago === opt.id ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>  
              <div className="grid grid-cols-2 gap-3 pt-2 mt-4">
                <button 
                  onClick={() => setRestockingProduct(null)}
                  className="py-4 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRestock}
                  className="py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  Guardar Compra
                </button>
              </div>
          </motion.div>
        </div>
      )}

      {/* Product History Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] max-w-4xl w-full p-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">{viewingHistory.nombre}</h3>
                  <p className="text-gray-500 font-medium text-sm">Historial de Compras e Inventario</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingHistory(null)}
                className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-gray-50/50 rounded-2xl border border-gray-100">
              {loadingHistory ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : productHistory.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                  <History className="h-12 w-12 mb-2 opacity-20" />
                  <p>No hay historial registrado para este producto</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-white sticky top-0">
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Movimiento</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cantidad</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo Unitario</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productHistory.map((mov, i) => (
                      <tr key={i} className="hover:bg-white transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-600">
                          {new Date(mov.fecha).toLocaleString('es-DO', { 
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-xs font-bold",
                            mov.tipo_movimiento === 'Compra' ? "bg-emerald-50 text-emerald-700" :
                            mov.tipo_movimiento === 'Venta' ? "bg-blue-50 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          )}>
                            {mov.tipo_movimiento}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "font-bold",
                            mov.cantidad > 0 ? "text-emerald-600" : "text-red-500"
                          )}>
                            {mov.cantidad > 0 ? '+' : ''}{mov.cantidad}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {mov.costo_unitario ? formatCurrency(mov.costo_unitario) : '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                          {mov.usuario_id || 'Sistema'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end shrink-0">
              <button 
                onClick={() => setViewingHistory(null)}
                className="px-6 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
