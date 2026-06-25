import { Product, Sale, Shift, Expense, CashMovement, UnitType, ShiftStatus } from '../types';

const isPosDomain = window.location.hostname.startsWith('pos.') || window.location.pathname.startsWith('/pos');
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isPosSubdomain = window.location.hostname.startsWith('pos.');
const API_BASE = (isPosSubdomain || isDevelopment) ? '/api' : '/pos/api';

// Global fetch wrapper: intercepts 401 "negocio inválido" and redirects to business selector
async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    // Clone so we can read body and still return original response
    const cloned = res.clone();
    try {
      const data = await cloned.json();
      if (typeof data?.error === 'string' && data.error.includes('sesi\u00f3n de negocio')) {
        // Stale business session — redirect to business selector
        window.location.href = '/businesses';
      }
    } catch (_) {}
  }
  return res;
}


async function translateText(text: string, from: string, to: string): Promise<string> {
  if (!text || text.trim() === '') return '';
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    }
    return text;
  } catch (err) {
    console.error("Failed to translate:", err);
    return text;
  }
}

export function isPracticeModeActive(): boolean {
  return localStorage.getItem('vuttik_practice_mode') === 'true';
}

export function setPracticeModeActive(active: boolean) {
  localStorage.setItem('vuttik_practice_mode', active ? 'true' : 'false');
  if (active) {
    localStorage.removeItem('v_sim_initialized');
    initSimulation();
  }
  window.dispatchEvent(new Event('practice_mode_changed'));
}

function initSimulation() {
  if (!localStorage.getItem('v_sim_initialized')) {
    // Populate realistic Dominican products
    const initialProducts: Product[] = [
      { id: '1', nombre: 'Arroz Selecto Campos (Lb)', categoria: 'Granos', marca: 'Campos', costo_compra: 32, precio_venta: 45, cantidad_disponible: 150, stock_minimo: 30, unidad_venta: UnitType.LIBRA, codigo_barra: '', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '2', nombre: 'Aceite de Cocina Crisol 128oz', categoria: 'Aceites', marca: 'Crisol', costo_compra: 220, precio_venta: 280, cantidad_disponible: 40, stock_minimo: 8, unidad_venta: UnitType.UNIDAD, codigo_barra: '7461234567891', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '3', nombre: 'Salami Súper Especial Mallita (Lb)', categoria: 'Embutidos', marca: 'Mallita', costo_compra: 130, precio_venta: 180, cantidad_disponible: 80, stock_minimo: 15, unidad_venta: UnitType.LIBRA, codigo_barra: '', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '4', nombre: 'Queso Checo Amarillo (Lb)', categoria: 'Lácteos', marca: 'Checo', costo_compra: 165, precio_venta: 220, cantidad_disponible: 50, stock_minimo: 10, unidad_venta: UnitType.LIBRA, codigo_barra: '', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '5', nombre: 'Huevo de Campo (Unidad)', categoria: 'Otros', marca: 'Genérico', costo_compra: 5, precio_venta: 8, cantidad_disponible: 300, stock_minimo: 50, unidad_venta: UnitType.UNIDAD, codigo_barra: '', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '6', nombre: 'Plátano Verde (Unidad)', categoria: 'Víveres', marca: 'Campo', costo_compra: 9, precio_venta: 15, cantidad_disponible: 250, stock_minimo: 40, unidad_venta: UnitType.UNIDAD, codigo_barra: '', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '7', nombre: 'Refresco Pepsi Cola 2 Litros', categoria: 'Bebidas', marca: 'Pepsi', costo_compra: 65, precio_venta: 85, cantidad_disponible: 100, stock_minimo: 20, unidad_venta: UnitType.UNIDAD, codigo_barra: '012000002123', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '8', nombre: 'Cerveza Presidente Grande', categoria: 'Bebidas', marca: 'Cervecería Nacional Dominicana', costo_compra: 160, precio_venta: 210, cantidad_disponible: 120, stock_minimo: 24, unidad_venta: UnitType.UNIDAD, codigo_barra: '746001235467', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '9', nombre: 'Pan Sobao de la Tarde', categoria: 'Panadería', marca: 'Local', costo_compra: 7, precio_venta: 10, cantidad_disponible: 150, stock_minimo: 20, unidad_venta: UnitType.UNIDAD, codigo_barra: '', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() },
      { id: '10', nombre: 'Leche Rica Entera 1L', categoria: 'Lácteos', marca: 'Rica', costo_compra: 75, precio_venta: 95, cantidad_disponible: 60, stock_minimo: 12, unidad_venta: UnitType.UNIDAD, codigo_barra: '746004500102', estado: 'activo', fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString() }
    ];
    setSimData('v_sim_products', initialProducts);
    
    // Initial configuration settings
    setSimData('v_sim_settings', {
      nombre_negocio: 'Colmado El Sol (Canal de Práctica)',
      itbis: 18,
      alertas_stock: true,
      gps_seguro: false
    });
    
    // Initial active shift for cajero
    const mockShift: Shift = {
      id: 'shift-sim-initial',
      usuario_id: 'user-sim-01',
      usuario_nombre: 'Cajero de Práctica',
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
      monto_inicial: 2000,
      total_ventas: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
      total_mixto: 0,
      total_reembolsos: 0,
      total_cancelaciones: 0,
      total_entradas: 0,
      total_salidas: 0,
      monto_esperado: 2000,
      monto_contado: undefined,
      diferencia: undefined,
      desglose_denominaciones: undefined,
      motivo_diferencia: '',
      nota_admin: '',
      estado: ShiftStatus.ABIERTO,
      revisado_por: '',
      fecha_revision: null,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };
    setSimData('v_sim_shifts', [mockShift]);
    setSimData('v_sim_sales', []);
    setSimData('v_sim_expenses', []);
    setSimData('v_sim_cash_movements', []);
    setSimData('v_sim_clientes', [
      { id: 'cli-sim-1', nombre: 'Doña María', telefono: '809-555-0192', limite_credito: 6000, deuda_actual: 2450, estado: 'activo', fecha_creacion: new Date().toISOString() },
      { id: 'cli-sim-2', nombre: 'Pedro el del Colmado', telefono: '829-555-0144', limite_credito: 15000, deuda_actual: 8200, estado: 'activo', fecha_creacion: new Date().toISOString() },
      { id: 'cli-sim-3', nombre: 'Juan Distribuidores', telefono: '809-555-0177', limite_credito: 20000, deuda_actual: 0, estado: 'activo', fecha_creacion: new Date().toISOString() }
    ]);
    setSimData('v_sim_pagos_clientes', []);
    setSimData('v_sim_activity_log', [
      {
        id: 'act-sim-initialized',
        usuario_nombre: 'Sistema',
        accion: 'Lanzamiento Práctica',
        detalle: 'El entorno de simulador para entrenamiento de personal ha sido configurado.',
        fecha: new Date().toISOString()
      }
    ]);
    
    localStorage.setItem('v_sim_initialized', 'true');
  }
}

const getSimData = <T>(key: string, defaultValue: T): T => {
  initSimulation();
  const raw = localStorage.getItem(key);
  if (!raw) return defaultValue;
  try { return JSON.parse(raw); } catch { return defaultValue; }
};

const setSimData = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const ApiService = {
  async register(nombre: string, correo: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, password })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al registrar.'); }
    return res.json();
  },

  async login(correo: string, password: string, location?: { lat: number, lng: number, address?: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password, location })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Credenciales inválidas.'); }
    return res.json();
  },

  async employeeLogin(business_codigo: string, username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/employee-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_codigo, username, password })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Credenciales incorrectas.'); }
    return res.json();
  },

  async googleCallback(data: any) {
    const res = await fetch(`${API_BASE}/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error en Google Callback.'); }
    return res.json();
  },

  async facebookCallback(data: any) {
    const res = await fetch(`${API_BASE}/auth/facebook/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error en Facebook Callback.'); }
    return res.json();
  },

  async loginMe() {
    const res = await fetch(`${API_BASE}/auth/me?t=${Date.now()}`);
    if (!res.ok) return null;
    return res.json();
  },

  async logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    return res.json();
  },

  // Business management
  async getBusinesses() {
    const res = await fetch(`${API_BASE}/businesses`);
    if (!res.ok) return [];
    return res.json();
  },

  async createBusiness(nombre: string) {
    const res = await fetch(`${API_BASE}/businesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre })
    });
    if (!res.ok) { 
      const err = await res.json().catch(() => ({})); 
      if (err.error === 'needs_request' || err.error === 'pending_evaluation') {
        throw new Error(`MULTI_BIZ_ERROR:${err.error}:${err.message}`);
      }
      throw new Error(err.error || 'Error al crear negocio.'); 
    }
    return res.json();
  },

  async requestMultiBusiness() {
    const res = await fetch(`${API_BASE}/pos/request-multi-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al solicitar permiso.'); }
    return res.json();
  },

  async updateBusiness(id: string, nombre: string) {
    const res = await fetch(`${API_BASE}/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al actualizar negocio.'); }
    return res.json();
  },

  async deleteBusiness(id: string) {
    const res = await fetch(`${API_BASE}/businesses/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al eliminar negocio.'); }
    return res.json();
  },
  async selectBusiness(business_id: string) {
    const res = await fetch(`${API_BASE}/auth/select-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al seleccionar negocio.'); }
    return res.json();
  },

  async exitBusiness() {
    const res = await fetch(`${API_BASE}/auth/exit-business`, { method: 'POST' });
    return res.json();
  },

  // Employee management
  async getEmployees(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/employees`);
    if (!res.ok) return [];
    return res.json();
  },

  async addEmployee(data: { nombre: string, username: string, password: string, rol?: string }) {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al agregar empleado.'); }
    return res.json();
  },

  async updateEmployee(empId: string, data: any) {
    const res = await fetch(`${API_BASE}/employees/${empId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error al actualizar empleado.'); }
    return res.json();
  },

  async deleteEmployee(empId: string) {
    const res = await fetch(`${API_BASE}/employees/${empId}`, { method: 'DELETE' });
    return res.json();
  },

  async getProducts(): Promise<Product[]> {
    if (isPracticeModeActive()) {
      return getSimData<Product[]>('v_sim_products', []);
    }
    const res = await apiFetch(`${API_BASE}/products`);
    return res.json();
  },


  async addProduct(product: any) {
    if (isPracticeModeActive()) {
      const products = getSimData<Product[]>('v_sim_products', []);
      const newProd: Product = {
        id: `prod-sim-${Date.now()}`,
        nombre: product.nombre,
        categoria: product.categoria || 'Otros',
        marca: product.marca || '',
        costo_compra: Number(product.costo_compra) || Number(product.precio_compra) || 0,
        precio_venta: Number(product.precio_venta) || 0,
        cantidad_disponible: Number(product.cantidad_disponible) || Number(product.stock) || 0,
        stock_minimo: Number(product.stock_minimo) || 0,
        unidad_venta: product.unidad_venta || UnitType.UNIDAD,
        codigo_barra: product.codigo_barra || product.codigo_barras || '',
        estado: 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };
      products.push(newProd);
      setSimData('v_sim_products', products);
      
      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({
        id: `act-${Date.now()}`,
        usuario_nombre: 'Cajero de Práctica',
        accion: 'Crear Producto',
        detalle: `Creado producto ${newProd.nombre} con stock ${newProd.cantidad_disponible}`,
        fecha: new Date().toISOString()
      });
      setSimData('v_sim_activity_log', logs);
      return newProd;
    }
    const res = await apiFetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    return res.json();
  },

  async updateProduct(id: string, product: any) {
    if (isPracticeModeActive()) {
      const products = getSimData<Product[]>('v_sim_products', []);
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        products[idx] = {
          ...products[idx],
          ...product,
          cantidad_disponible: Number(product.cantidad_disponible) !== undefined && !isNaN(Number(product.cantidad_disponible)) ? Number(product.cantidad_disponible) : (Number(product.stock) !== undefined && !isNaN(Number(product.stock)) ? Number(product.stock) : products[idx].cantidad_disponible),
          costo_compra: Number(product.costo_compra) !== undefined && !isNaN(Number(product.costo_compra)) ? Number(product.costo_compra) : (Number(product.precio_compra) !== undefined && !isNaN(Number(product.precio_compra)) ? Number(product.precio_compra) : products[idx].costo_compra),
          precio_venta: Number(product.precio_venta) !== undefined && !isNaN(Number(product.precio_venta)) ? Number(product.precio_venta) : products[idx].precio_venta
        };
        setSimData('v_sim_products', products);
        
        const logs = getSimData<any[]>('v_sim_activity_log', []);
        logs.unshift({
          id: `act-${Date.now()}`,
          usuario_nombre: 'Cajero de Práctica',
          accion: 'Editar Producto',
          detalle: `Modificado el producto ${products[idx].nombre}`,
          fecha: new Date().toISOString()
        });
        setSimData('v_sim_activity_log', logs);
      }
      return products[idx];
    }
    const res = await apiFetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    return res.json();
  },

  async lookupBarcode(barcode: string) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1) {
        const targetLang = localStorage.getItem('vuttik_language') || (navigator.language.startsWith('en') ? 'en' : 'es');
        
        let nombre = '';
        let categoria = '';
        
        // 1. Get raw product name and category
        const rawNameEs = data.product.product_name_es || '';
        const rawNameEn = data.product.product_name || '';
        
        const rawCategoryTag = data.product.categories_tags?.[0] || '';
        const rawCategoryLang = rawCategoryTag.split(':')[0] || 'en';
        const rawCategoryName = rawCategoryTag.split(':')[1]?.replace(/-/g, ' ') || '';
        
        // 2. Resolve Name Translation
        if (targetLang === 'es') {
          if (rawNameEs) {
            nombre = rawNameEs;
          } else if (rawNameEn) {
            nombre = await translateText(rawNameEn, 'en', 'es');
          }
        } else { // targetLang === 'en'
          if (rawNameEn) {
            nombre = rawNameEn;
          } else if (rawNameEs) {
            nombre = await translateText(rawNameEs, 'es', 'en');
          }
        }
        
        // Final fallback for name if empty
        if (!nombre) {
          nombre = rawNameEs || rawNameEn || '';
        }
        
        // 3. Resolve Category Translation
        if (rawCategoryName) {
          if (rawCategoryLang === targetLang) {
            categoria = rawCategoryName;
          } else {
            categoria = await translateText(rawCategoryName, rawCategoryLang, targetLang);
          }
        }
        
        return {
          nombre: nombre,
          categoria: categoria,
          marca: data.product.brands || ''
        };
      }
      return null;
    } catch (error) {
      console.error("Error looking up barcode:", error);
      return null;
    }
  },

  async deleteProduct(id: string, usuario_id: string, usuario_nombre: string) {
    if (isPracticeModeActive()) {
      const products = getSimData<Product[]>('v_sim_products', []);
      const p = products.find(prod => prod.id === id);
      const filtered = products.filter(prod => prod.id !== id);
      setSimData('v_sim_products', filtered);
      
      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({
        id: `act-${Date.now()}`,
        usuario_nombre: 'Cajero de Práctica',
        accion: 'Eliminación de Producto',
        modulo: 'Inventario',
        detalles: `Producto eliminado: ${p?.nombre}`,
        fecha: new Date().toISOString(),
        usuario_id
      });
      setSimData('v_sim_activity_log', logs);
      return { success: true };
    }
    const res = await apiFetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id, usuario_nombre })
    });
    return res.json();
  },

  async adjustProductStock(id: string, data: { cantidad: number, tipo_movimiento: string, motivo: string, usuario_id: string, metadata?: any }): Promise<Product> {
    if (isPracticeModeActive()) {
      const products = getSimData<Product[]>('v_sim_products', []);
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        const p = products[idx];
        const change = Number(data.cantidad);
        p.cantidad_disponible = data.tipo_movimiento === 'entrada' ? p.cantidad_disponible + change : Math.max(0, p.cantidad_disponible - change);
        setSimData('v_sim_products', products);

        const logs = getSimData<any[]>('v_sim_activity_log', []);
        logs.unshift({
          id: `act-${Date.now()}`,
          usuario_nombre: 'Cajero de Práctica',
          accion: 'Ajuste Inventario',
          detalle: `Ajuste (${data.tipo_movimiento}): ${change} ud a ${p.nombre}. Motivo: ${data.motivo}`,
          fecha: new Date().toISOString()
        });
        setSimData('v_sim_activity_log', logs);
        return p;
      }
      throw new Error('Product not found');
    }
    const res = await fetch(`${API_BASE}/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async restockProduct(id: string, data: { cantidad: number, costo_unitario: number, motivo: string, usuario_id: string, usuario_nombre: string, fuente_pago: 'Caja' | 'Banco' | 'Inversion Externa', metadata?: any }): Promise<Product> {
    if (isPracticeModeActive()) {
      const products = getSimData<Product[]>('v_sim_products', []);
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        const p = products[idx];
        const change = Number(data.cantidad);
        const montoTotal = change * Number(data.costo_unitario);
        p.cantidad_disponible += change;
        p.costo_compra = Number(data.costo_unitario);
        setSimData('v_sim_products', products);

        // Auto-register expense in simulator
        const expenses = getSimData<any[]>('v_sim_expenses', []);
        expenses.unshift({
          id: `exp-compra-sim-${Date.now()}`,
          descripcion: `Compra: ${p.nombre} (${change} × RD$${data.costo_unitario})`,
          monto: montoTotal,
          categoria: 'Compras de Mercancía',
          fecha: new Date().toISOString(),
          usuario_id: data.usuario_id,
          fuente_pago: data.fuente_pago,
          es_compra_mercancia: true,
          producto_id: id,
          pagado_desde_caja: data.fuente_pago === 'Caja'
        });
        setSimData('v_sim_expenses', expenses);

        const logs = getSimData<any[]>('v_sim_activity_log', []);
        logs.unshift({
          id: `act-${Date.now()}`,
          usuario_nombre: 'Cajero de Práctica',
          accion: 'Compra de Mercancía',
          detalle: `Entrada de ${change} uds × RD$${data.costo_unitario} = RD$${montoTotal} (${p.nombre}) — Fuente: ${data.fuente_pago}`,
          fecha: new Date().toISOString()
        });
        setSimData('v_sim_activity_log', logs);
        
        const movements = getSimData<any[]>('v_sim_inventory_movements', []);
        movements.unshift({
          id: 'mov-' + Date.now(),
          producto_id: id,
          tipo_movimiento: 'Compra',
          cantidad: change,
          costo_unitario: Number(data.costo_unitario),
          monto_total: montoTotal,
          fuente_pago: data.fuente_pago,
          usuario_id: data.usuario_id,
          fecha: new Date().toISOString(),
          motivo: data.motivo || 'Compra simulada'
        });
        setSimData('v_sim_inventory_movements', movements);
        
        return p;
      }
      throw new Error('Product not found');
    }
    const res = await fetch(`${API_BASE}/products/${id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async transferFunds(data: { origen: string, destino: string, monto: number, usuario_id: string }): Promise<any> {
    if (isPracticeModeActive()) {
      const transfers = getSimData<any[]>('v_sim_transfers', []);
      const newTransfer = {
        id: 'trans-sim-' + Date.now(),
        origen: data.origen,
        destino: data.destino,
        monto: Number(data.monto),
        fecha: new Date().toISOString(),
        usuario_id: data.usuario_id
      };
      transfers.push(newTransfer);
      setSimData('v_sim_transfers', transfers);

      // In simulator, active shift is tracked differently but let's just log to activity for now
      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({
        id: `act-${Date.now()}`,
        usuario_nombre: 'Cajero de Práctica',
        accion: 'Transferencia de Fondos',
        detalle: `Se transfirió RD$${data.monto} de ${data.origen} a ${data.destino}`,
        fecha: new Date().toISOString()
      });
      setSimData('v_sim_activity_log', logs);

      return newTransfer;
    }
    const res = await fetch(`${API_BASE}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getProductHistory(id: string): Promise<any[]> {
    if (isPracticeModeActive()) {
      const movements = getSimData<any[]>('v_sim_inventory_movements', []);
      return movements.filter(m => m.producto_id === id);
    }
    const res = await fetch(`${API_BASE}/products/${id}/history`);
    return res.json();
  },

  async getActiveShift(userId: string): Promise<Shift | null> {
    if (isPracticeModeActive()) {
      const shifts = getSimData<Shift[]>('v_sim_shifts', []);
      const active = shifts.find(s => s.usuario_id === userId && s.estado === ShiftStatus.ABIERTO);
      return active || null;
    }
    const res = await fetch(`${API_BASE}/shifts/active/${userId}`);
    return res.json();
  },

  async getUsers(): Promise<any[]> {
    if (isPracticeModeActive()) {
      return [
        { id: 'user-sim-01', nombre: 'Cajero de Práctica', rol: 'admin', email: 'practica@colmado.com' },
        { id: 'user-sim-02', nombre: 'Junior de Entrenamiento', rol: 'cajero', email: 'empleado@colmado.com' }
      ];
    }
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  async openShift(userId: string, userName: string, montoInicial: number): Promise<Shift> {
    if (isPracticeModeActive()) {
      const shifts = getSimData<Shift[]>('v_sim_shifts', []);
      const cleaned = shifts.map(s => s.usuario_id === userId && s.estado === ShiftStatus.ABIERTO ? { ...s, estado: ShiftStatus.CERRADO, fecha_cierre: new Date().toISOString() } : s);
      
      const newShift: Shift = {
        id: `shift-sim-${Date.now()}`,
        usuario_id: userId,
        usuario_nombre: userName,
        fecha_apertura: new Date().toISOString(),
        fecha_cierre: null,
        monto_inicial: montoInicial,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        total_mixto: 0,
        total_reembolsos: 0,
        total_cancelaciones: 0,
        total_entradas: 0,
        total_salidas: 0,
        monto_esperado: montoInicial,
        monto_contado: undefined,
        diferencia: undefined,
        desglose_denominaciones: undefined,
        motivo_diferencia: '',
        nota_admin: '',
        estado: ShiftStatus.ABIERTO,
        revisado_por: '',
        fecha_revision: null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };
      cleaned.push(newShift);
      setSimData('v_sim_shifts', cleaned);

      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({
        id: `act-${Date.now()}`,
        usuario_nombre: userName,
        accion: 'Caja Abierta (Sim)',
        detalle: `Caja abierta con fondo de RD$${montoInicial}`,
        fecha: new Date().toISOString()
      });
      setSimData('v_sim_activity_log', logs);

      return newShift;
    }
    const res = await fetch(`${API_BASE}/shifts/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, montoInicial })
    });
    return res.json();
  },

  async closeShift(shiftId: string, montoContado: number, desglose: any, motivoDiferencia: string): Promise<Shift> {
    if (isPracticeModeActive()) {
      const shifts = getSimData<Shift[]>('v_sim_shifts', []);
      const idx = shifts.findIndex(s => s.id === shiftId);
      if (idx !== -1) {
        const s = shifts[idx];
        const subtotalCalculado = s.monto_inicial + s.total_ventas + s.total_entradas - s.total_salidas;
        const diferencia = montoContado - subtotalCalculado;
        
        shifts[idx] = {
          ...s,
          fecha_cierre: new Date().toISOString(),
          monto_contado: montoContado,
          diferencia: diferencia,
          desglose_denominaciones: desglose,
          estado: ShiftStatus.CERRADO,
          motivo_diferencia: motivoDiferencia
        };
        setSimData('v_sim_shifts', shifts);

        const logs = getSimData<any[]>('v_sim_activity_log', []);
        logs.unshift({
          id: `act-${Date.now()}`,
          usuario_nombre: s.usuario_nombre,
          accion: 'Caja Cerrada (Sim)',
          detalle: `Caja cerrada. Contado: RD$${montoContado}, Diferencia: RD$${diferencia}`,
          fecha: new Date().toISOString()
        });
        setSimData('v_sim_activity_log', logs);

        return shifts[idx];
      }
      throw new Error('Shift not found');
    }
    const res = await fetch(`${API_BASE}/shifts/close/${shiftId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montoContado, desglose, motivoDiferencia })
    });
    return res.json();
  },

  async getAllShifts(params?: { userId?: string, status?: string, date?: string }): Promise<Shift[]> {
    if (isPracticeModeActive()) {
      let shifts = getSimData<Shift[]>('v_sim_shifts', []);
      if (params?.userId) {
        shifts = shifts.filter(s => s.usuario_id === params.userId);
      }
      if (params?.status) {
        shifts = shifts.filter(s => s.estado === params.status);
      }
      return shifts.sort((a,b) => b.fecha_apertura.localeCompare(a.fecha_apertura));
    }
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/shifts?${query}`);
    return res.json();
  },

  async updateShiftStatus(shiftId: string, data: { status: string, notaAdmin?: string, reviewedBy?: string }): Promise<Shift> {
    if (isPracticeModeActive()) {
      const shifts = getSimData<Shift[]>('v_sim_shifts', []);
      const idx = shifts.findIndex(s => s.id === shiftId);
      if (idx !== -1) {
        shifts[idx] = { ...shifts[idx], estado: data.status as any, ...data };
        setSimData('v_sim_shifts', shifts);
        return shifts[idx];
      }
      throw new Error('Shift not found');
    }
    const res = await fetch(`${API_BASE}/shifts/${shiftId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getCashMovements(shiftId: string): Promise<CashMovement[]> {
    if (isPracticeModeActive()) {
      const movements = getSimData<CashMovement[]>('v_sim_cash_movements', []);
      return movements.filter(m => m.turno_id === shiftId).sort((a,b) => b.fecha.localeCompare(a.fecha));
    }
    const res = await fetch(`${API_BASE}/cash-movements/${shiftId}`);
    return res.json();
  },

  async addCashMovement(movement: Omit<CashMovement, 'id' | 'fecha'>): Promise<CashMovement> {
    if (isPracticeModeActive()) {
      const movements = getSimData<CashMovement[]>('v_sim_cash_movements', []);
      const newM: CashMovement = {
        ...movement,
        id: `m-sim-${Date.now()}`,
        fecha: new Date().toISOString()
      };
      movements.push(newM);
      setSimData('v_sim_cash_movements', movements);

      const shifts = getSimData<Shift[]>('v_sim_shifts', []);
      const sIdx = shifts.findIndex(s => s.id === movement.turno_id);
      if (sIdx !== -1) {
        const s = shifts[sIdx];
        if (movement.tipo === 'entrada') {
          s.total_entradas += movement.monto;
        } else {
          s.total_salidas += movement.monto;
        }
        s.monto_esperado = s.monto_inicial + s.total_ventas + s.total_entradas - s.total_salidas;
        setSimData('v_sim_shifts', shifts);
      }

      return newM;
    }
    const res = await fetch(`${API_BASE}/cash-movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movement)
    });
    return res.json();
  },

  async completeSale(sale: any, items: any[], metadata?: any) {
    if (isPracticeModeActive()) {
      const sales = getSimData<any[]>('v_sim_sales', []);
      const currentShiftId = sale.turno_id;
      
      const newSaleId = `VTA-SIM-${Date.now()}`;
      const newSale = {
        ...sale,
        id: newSaleId,
        fecha: new Date().toISOString(),
        items: items.map(item => ({
          ...item,
          venta_id: newSaleId
        }))
      };
      
      sales.unshift(newSale);
      setSimData('v_sim_sales', sales);
      
      // Increment client debt in simulator if fiao
      if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
        const clList = getSimData<any[]>('v_sim_clientes', []);
        const clIdx = clList.findIndex(c => c.id === sale.cliente_id);
        if (clIdx !== -1) {
          clList[clIdx].deuda_actual += sale.total;
          setSimData('v_sim_clientes', clList);
        }
      }

      const products = getSimData<Product[]>('v_sim_products', []);
      items.forEach(item => {
        const pIdx = products.findIndex(p => p.id === item.producto_id);
        if (pIdx !== -1) {
          products[pIdx].cantidad_disponible = Math.max(0, products[pIdx].cantidad_disponible - item.cantidad);
        }
      });
      setSimData('v_sim_products', products);

      const shifts = getSimData<Shift[]>('v_sim_shifts', []);
      const sIdx = shifts.findIndex(s => s.id === currentShiftId);
      if (sIdx !== -1) {
        shifts[sIdx].total_ventas += sale.total;
        if (sale.metodo_pago === 'Efectivo') shifts[sIdx].total_efectivo += sale.total;
        else if (sale.metodo_pago === 'Tarjeta') shifts[sIdx].total_tarjeta += sale.total;
        else if (sale.metodo_pago === 'Transferencia') shifts[sIdx].total_transferencia += sale.total;
        else shifts[sIdx].total_mixto += sale.total;
        
        shifts[sIdx].monto_esperado = shifts[sIdx].monto_inicial + shifts[sIdx].total_ventas + shifts[sIdx].total_entradas - shifts[sIdx].total_salidas;
        setSimData('v_sim_shifts', shifts);
      }

      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({
        id: `act-${Date.now()}`,
        usuario_nombre: sale.usuario_nombre,
        accion: 'Venta Realizada',
        detalle: `Venta cobrada por RD$${sale.total.toFixed(2)} (${items.length} productos)`,
        fecha: new Date().toISOString()
      });
      setSimData('v_sim_activity_log', logs);

      return { success: true, sale: newSale };
    }
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale, items, metadata })
    });
    return res.json();
  },

  async getStats(month?: number, year?: number, startDate?: string | null, endDate?: string | null) {
    if (isPracticeModeActive()) {
      const sales = getSimData<any[]>('v_sim_sales', []);
      const expenses = getSimData<any[]>('v_sim_expenses', []);
      const products = getSimData<Product[]>('v_sim_products', []);
      
      const activeSales = sales.filter(s => s.estado !== 'reembolsado' && s.estado !== 'cancelado');
      const totalSales = activeSales.reduce((acc, s) => acc + s.total, 0);
      const totalCost = activeSales.reduce((acc, s) => {
        return acc + s.items.reduce((sum: number, item: any) => sum + (item.cantidad * (item.precio_compra || item.precio_unitario * 0.7)), 0);
      }, 0);
      const totalExpenses = expenses.reduce((acc, e) => acc + e.monto, 0);
      const netProfit = totalSales - totalCost - totalExpenses;

      const categorySales: Record<string, number> = {};
      activeSales.forEach(s => {
        s.items.forEach((item: any) => {
          categorySales[item.categoria || 'Otros'] = (categorySales[item.categoria || 'Otros'] || 0) + (item.cantidad * item.precio_unitario);
        });
      });

      const processedCategories = Object.entries(categorySales).map(([name, value]) => ({ name, value }));
      
      const dailySales: Record<string, number> = {};
      activeSales.forEach(s => {
        const day = s.fecha.slice(0, 10);
        dailySales[day] = (dailySales[day] || 0) + s.total;
      });
      const processedDaily = Object.entries(dailySales).map(([date, total]) => ({ date, total })).sort((a,b) => a.date.localeCompare(b.date));

      return {
        keyStats: {
          totalVentas: totalSales,
          beneficioNeto: netProfit,
          totalEgresos: totalExpenses,
          margenPromedio: totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0
        },
        ventasPorCategoria: processedCategories,
        ventasDiarias: processedDaily,
        alertasStock: products.filter(p => p.cantidad_disponible <= p.stock_minimo).map(p => p.nombre),
        transaccionesRecientes: sales.slice(0, 15).map(s => ({
          id: s.id,
          cliente: s.cliente_nombre || 'Cliente General',
          total: s.total,
          fecha: s.fecha,
          estado: s.estado,
          usuario_nombre: s.usuario_nombre
        }))
      };
    }
    const params = new URLSearchParams();
    if (month !== undefined && month !== -1) params.append('month', month.toString());
    if (year !== undefined && year !== -1) params.append('year', year.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const res = await fetch(`${API_BASE}/stats?${params.toString()}`);
    return res.json();
  },

  async getExpenses(): Promise<Expense[]> {
    if (isPracticeModeActive()) {
      return getSimData<Expense[]>('v_sim_expenses', []);
    }
    const res = await fetch(`${API_BASE}/expenses`, { cache: 'no-store' });
    return res.json();
  },

  async addExpense(expense: any, metadata?: any) {
    if (isPracticeModeActive()) {
      const expenses = getSimData<any[]>('v_sim_expenses', []);
      const newE = {
        ...expense,
        id: `exp-sim-${Date.now()}`,
        fecha: new Date().toISOString()
      };
      expenses.unshift(newE);
      setSimData('v_sim_expenses', expenses);

      const shifts = getSimData<Shift[]>('v_sim_shifts', []);
      const sIdx = shifts.findIndex(s => s.id === expense.turno_id);
      if (sIdx !== -1) {
        shifts[sIdx].total_salidas += expense.monto;
        shifts[sIdx].monto_esperado = shifts[sIdx].monto_inicial + shifts[sIdx].total_ventas + shifts[sIdx].total_entradas - shifts[sIdx].total_salidas;
        setSimData('v_sim_shifts', shifts);
      }

      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({
        id: `act-${Date.now()}`,
        usuario_nombre: 'Cajero de Práctica',
        accion: 'Gasto Registrado',
        detalle: `Registrado egreso por RD$${expense.monto.toFixed(2)} - ${expense.descripcion}`,
        fecha: new Date().toISOString()
      });
      setSimData('v_sim_activity_log', logs);

      return newE;
    }
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...expense, metadata })
    });
    return res.json();
  },

  async refundSale(saleId: string, password?: string, motivo?: string, usuarioNombre?: string, usuarioId?: string): Promise<any> {
    if (isPracticeModeActive()) {
      if (password !== '123456') {
        throw new Error('Contraseña Maestra incorrecta');
      }
      const sales = getSimData<any[]>('v_sim_sales', []);
      const idx = sales.findIndex(s => s.id === saleId);
      if (idx !== -1) {
        const sale = sales[idx];
        if (sale.estado === 'reembolsado') throw new Error('Esta venta ya fue reembolsada.');
        
        sale.estado = 'reembolsado';
        sale.motivo_reembolso = motivo;
        setSimData('v_sim_sales', sales);

        const products = getSimData<Product[]>('v_sim_products', []);
        sale.items.forEach((item: any) => {
          const pIdx = products.findIndex(p => p.id === item.producto_id);
          if (pIdx !== -1) {
            products[pIdx].cantidad_disponible += item.cantidad;
          }
        });
        setSimData('v_sim_products', products);

        const shifts = getSimData<Shift[]>('v_sim_shifts', []);
        const sIdx = shifts.findIndex(s => s.id === sale.turno_id);
        if (sIdx !== -1) {
          shifts[sIdx].total_reembolsos += sale.total;
          shifts[sIdx].total_ventas = Math.max(0, shifts[sIdx].total_ventas - sale.total);
          shifts[sIdx].monto_esperado = shifts[sIdx].monto_inicial + shifts[sIdx].total_ventas + shifts[sIdx].total_entradas - shifts[sIdx].total_salidas;
          setSimData('v_sim_shifts', shifts);
        }

        // Deduct simulated client debt if fiao
        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
          const clList = getSimData<any[]>('v_sim_clientes', []);
          const clIdx = clList.findIndex(c => c.id === sale.cliente_id);
          if (clIdx !== -1) {
            clList[clIdx].deuda_actual = Math.max(0, clList[clIdx].deuda_actual - sale.total);
            setSimData('v_sim_clientes', clList);
          }
        }

        const logs = getSimData<any[]>('v_sim_activity_log', []);
        logs.unshift({
          id: `act-${Date.now()}`,
          usuario_nombre: usuarioNombre || 'Admin de Práctica',
          accion: 'Reembolso Venta',
          detalle: `Reembolso de venta ${saleId} por RD$${sale.total.toFixed(2)}. Motivo: ${motivo}`,
          fecha: new Date().toISOString()
        });
        setSimData('v_sim_activity_log', logs);

        return { success: true };
      }
      throw new Error('Venta no encontrada');
    }
    const res = await fetch(`${API_BASE}/sales/refund/${saleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, motivo, usuario_nombre: usuarioNombre, usuario_id: usuarioId })
    });
    if (!res.ok) {
      const errorMsg = await res.json().catch(() => ({}));
      throw new Error(errorMsg.error || 'Error al procesar el reembolso');
    }
    return res.json();
  },

  async cancelSale(saleId: string): Promise<Sale> {
    if (isPracticeModeActive()) {
      const sales = getSimData<any[]>('v_sim_sales', []);
      const idx = sales.findIndex(s => s.id === saleId);
      if (idx !== -1) {
        const sale = sales[idx];
        sale.estado = 'cancelado';
        setSimData('v_sim_sales', sales);

        const products = getSimData<Product[]>('v_sim_products', []);
        sale.items.forEach((item: any) => {
          const pIdx = products.findIndex(p => p.id === item.producto_id);
          if (pIdx !== -1) {
            products[pIdx].cantidad_disponible += item.cantidad;
          }
        });
        setSimData('v_sim_products', products);

        const shifts = getSimData<Shift[]>('v_sim_shifts', []);
        const sIdx = shifts.findIndex(s => s.id === sale.turno_id);
        if (sIdx !== -1) {
          shifts[sIdx].total_cancelaciones += sale.total;
          shifts[sIdx].total_ventas = Math.max(0, shifts[sIdx].total_ventas - sale.total);
          shifts[sIdx].monto_esperado = shifts[sIdx].monto_inicial + shifts[sIdx].total_ventas + shifts[sIdx].total_entradas - shifts[sIdx].total_salidas;
          setSimData('v_sim_shifts', shifts);
        }

        // Deduct simulated client debt if fiao
        if (sale.metodo_pago === 'A Crédito (Fiao)' && sale.cliente_id) {
          const clList = getSimData<any[]>('v_sim_clientes', []);
          const clIdx = clList.findIndex(c => c.id === sale.cliente_id);
          if (clIdx !== -1) {
            clList[clIdx].deuda_actual = Math.max(0, clList[clIdx].deuda_actual - sale.total);
            setSimData('v_sim_clientes', clList);
          }
        }

        const logs = getSimData<any[]>('v_sim_activity_log', []);
        logs.unshift({
          id: `act-${Date.now()}`,
          usuario_nombre: 'Cajero de Práctica',
          accion: 'Venta Cancelada',
          detalle: `Venta cancelada ${saleId} por RD$${sale.total.toFixed(2)}`,
          fecha: new Date().toISOString()
        });
        setSimData('v_sim_activity_log', logs);

        return sale;
      }
      throw new Error('Venta no encontrada');
    }
    const res = await fetch(`${API_BASE}/sales/cancel/${saleId}`, {
      method: 'POST'
    });
    return res.json();
  },

  async getInventoryMovements(): Promise<any[]> {
    if (isPracticeModeActive()) {
      const logs = getSimData<any[]>('v_sim_activity_log', []);
      return logs.filter(l => l.accion.includes('Inventario') || l.accion.includes('Producto')).map(l => ({
        id: l.id,
        producto_nombre: l.detalle.split(' a ')[1]?.split('. ')[0] || l.detalle.split(' ')[2] || 'Varios',
        tipo_movimiento: l.detalle.includes('entrada') ? 'entrada' : 'salida',
        cantidad: parseFloat(l.detalle.match(/\d+/)?.[0] || '1'),
        motivo: l.detalle,
        fecha: l.fecha,
        usuario_nombre: l.usuario_nombre
      }));
    }
    const res = await fetch(`${API_BASE}/inventory/movements`);
    return res.json();
  },

  async getActivityLog(): Promise<any[]> {
    if (isPracticeModeActive()) {
      return getSimData<any[]>('v_sim_activity_log', []);
    }
    const res = await fetch(`${API_BASE}/activity-log`);
    return res.json();
  },

  async postActivityLog(data: any): Promise<void> {
    if (isPracticeModeActive()) {
      // just push it to local sim data
      const simLogs = getSimData<any[]>('v_sim_activity_log', []);
      simLogs.unshift({
        id: `act-${Date.now()}`,
        usuario_nombre: data.usuario_nombre || 'Sistema',
        accion: data.accion,
        detalle: data.detalles,
        modulo: data.modulo,
        fecha: new Date().toISOString()
      });
      setSimData('v_sim_activity_log', simLogs);
      return;
    }
    await fetch(`${API_BASE}/activity-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async getApprovalRequests() {
    if (isPracticeModeActive()) {
      return [];
    }
    const res = await fetch(`${API_BASE}/approval-requests`);
    return res.json();
  },

  async getApprovalStatus(userId: string) {
    if (isPracticeModeActive()) {
      return { id: 'req-sim-01', estado: 'aprobado' };
    }
    const res = await fetch(`${API_BASE}/approval-requests/status/${userId}`);
    return res.json();
  },

  async requestLocationApproval(data: { usuario_id: string, usuario_nombre: string, lat: number, lng: number, address: string }) {
    if (isPracticeModeActive()) {
      return { id: 'req-sim-01', estado: 'aprobado' };
    }
    const res = await fetch(`${API_BASE}/approval-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async actionApprovalRequest(id: string, action: 'aprobar' | 'rechazar', options: { guardarEnListaBlanca: boolean, adminId: string, adminNombre: string }) {
    if (isPracticeModeActive()) {
      return { success: true };
    }
    const res = await fetch(`${API_BASE}/approval-requests/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...options })
    });
    return res.json();
  },

  async getSettings() {
    if (isPracticeModeActive()) {
      return getSimData('v_sim_settings', {
        nombre_negocio: 'Colmado El Sol (Canal de Práctica)',
        itbis: 18,
        alertas_stock: true,
        gps_seguro: false
      });
    }
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settings: any) {
    if (isPracticeModeActive()) {
      setSimData('v_sim_settings', settings);
      return settings;
    }
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async logLocation(lat: number, lng: number) {
    if (isPracticeModeActive()) {
      return { success: true };
    }
    const res = await fetch(`${API_BASE}/settings/log-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });
    return res.json();
  },

  async getClientes() {
    if (isPracticeModeActive()) {
      return getSimData('v_sim_clientes', []);
    }
    const res = await fetch(`${API_BASE}/clientes`);
    return res.json();
  },

  async createCliente(cliente: { nombre: string; telefono?: string; limite_credito?: number }) {
    if (isPracticeModeActive()) {
      const clList = getSimData<any[]>('v_sim_clientes', []);
      const newCl = {
        id: 'cli-' + Date.now(),
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        limite_credito: Number(cliente.limite_credito) || 0,
        deuda_actual: 0,
        estado: 'activo',
        fecha_creacion: new Date().toISOString()
      };
      clList.push(newCl);
      setSimData('v_sim_clientes', clList);
      
      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({ id: 'act-' + Date.now(), usuario_nombre: 'Sistema', accion: 'Creación de Cliente', detalle: `Cliente creado en simulador: ${cliente.nombre}`, fecha: new Date().toISOString() });
      setSimData('v_sim_activity_log', logs);
      
      return newCl;
    }
    const res = await fetch(`${API_BASE}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    });
    const text = await res.text();
    if (!text || text.trim() === '') {
      throw new Error(`Error del servidor (${res.status}): respuesta vacía`);
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Respuesta inválida del servidor (${res.status}): ${text.slice(0, 100)}`);
    }
    if (!res.ok) {
      throw new Error(data?.error || `Error del servidor: ${res.status}`);
    }
    return data;
  },

  async updateCliente(id: string, cliente: any) {
    if (isPracticeModeActive()) {
      const clList = getSimData<any[]>('v_sim_clientes', []);
      const idx = clList.findIndex(c => c.id === id);
      if (idx !== -1) {
        clList[idx] = { ...clList[idx], ...cliente };
        setSimData('v_sim_clientes', clList);
        return clList[idx];
      }
      throw new Error('Cliente no encontrado');
    }
    const res = await fetch(`${API_BASE}/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    });
    return res.json();
  },

  async payClienteDeuda(id: string, pago: { monto: number; motivo: string; turno_id?: string; usuario_id?: string; usuario_nombre?: string }) {
    if (isPracticeModeActive()) {
      const clList = getSimData<any[]>('v_sim_clientes', []);
      const idx = clList.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Cliente no encontrado');
      
      const cliente = clList[idx];
      const abono = Number(pago.monto);
      cliente.deuda_actual -= abono;
      if (cliente.deuda_actual < 0) cliente.deuda_actual = 0;
      setSimData('v_sim_clientes', clList);
      
      const newPago = {
        id: 'pay-' + Date.now(),
        cliente_id: id,
        monto: abono,
        motivo: pago.motivo || 'Abono a cuenta',
        usuario_id: pago.usuario_id || 'sim-user',
        usuario_nombre: pago.usuario_nombre || 'Sistema',
        fecha: new Date().toISOString()
      };
      
      const pList = getSimData<any[]>('v_sim_pagos_clientes', []);
      pList.push(newPago);
      setSimData('v_sim_pagos_clientes', pList);
      
      // Handle cash movement in simulated shifts
      const shList = getSimData<any[]>('v_sim_shifts', []);
      const activeShIdx = shList.findIndex(sh => sh.id === pago.turno_id || sh.estado === 'abierto');
      if (activeShIdx !== -1) {
        const shift = shList[activeShIdx];
        shift.total_entradas += abono;
        shift.total_efectivo += abono;
        shift.monto_esperado += abono;
        shift.fecha_actualizacion = new Date().toISOString();
        setSimData('v_sim_shifts', shList);
        
        const cmList = getSimData<any[]>('v_sim_cash_movements', []);
        cmList.push({
          id: 'mov-' + Date.now() + Math.random(),
          turno_id: shift.id,
          usuario_id: pago.usuario_id || 'sim-user',
          tipo: 'entrada',
          monto: abono,
          motivo: `Abono de Cliente: ${cliente.nombre}`,
          fecha: new Date().toISOString()
        });
        setSimData('v_sim_cash_movements', cmList);
      }
      
      const logs = getSimData<any[]>('v_sim_activity_log', []);
      logs.unshift({ id: 'act-' + Date.now(), usuario_nombre: pago.usuario_nombre || 'Sistema', accion: 'Abono de Deuda', detalle: `Cliente ${cliente.nombre} abonó RD$${abono}`, fecha: new Date().toISOString() });
      setSimData('v_sim_activity_log', logs);
      
      return { cliente, pago: newPago };
    }
    
    const res = await fetch(`${API_BASE}/clientes/${id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pago)
    });
    return res.json();
  },

  async getClienteHistory(id: string) {
    if (isPracticeModeActive()) {
      const clList = getSimData<any[]>('v_sim_clientes', []);
      const cliente = clList.find(c => c.id === id);
      if (!cliente) throw new Error('Cliente no encontrado');
      
      const sales = getSimData<any[]>('v_sim_sales', []).filter(s => s.cliente_id === id).map(s => ({ ...s, tipo: 'venta' }));
      const payments = getSimData<any[]>('v_sim_pagos_clientes', []).filter(p => p.cliente_id === id).map(p => ({ ...p, tipo: 'pago' }));
      
      const history = [...sales, ...payments].sort((a, b) => new Date(b.fecha || b.fecha_creacion).getTime() - new Date(a.fecha || a.fecha_creacion).getTime());
      return { cliente, history };
    }
    const res = await fetch(`${API_BASE}/clientes/${id}/history`);
    return res.json();
  },

  async downloadBackup() {
    if (isPracticeModeActive()) {
      const fullDB = {
        products: getSimData('v_sim_products', []),
        sales: getSimData('v_sim_sales', []),
        expenses: getSimData('v_sim_expenses', []),
        shifts: getSimData('v_sim_shifts', []),
        cash_movements: getSimData('v_sim_cash_movements', []),
        clientes: getSimData('v_sim_clientes', []),
        pagos_clientes: getSimData('v_sim_pagos_clientes', []),
        activity_log: getSimData('v_sim_activity_log', [])
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDB, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", "vuttik_simulador_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return { success: true };
    }
    window.open(`${API_BASE}/backup/download`);
    return { success: true };
  }
};

export const StoreService = ApiService;
