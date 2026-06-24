import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Cliente, PagoCliente, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Phone, Scale, Calendar, FileText, CheckCircle, 
  AlertTriangle, AlertCircle, Edit, X, Wallet, User, UserCheck, 
  ArrowUpRight, ArrowDownLeft, TrendingUp, RefreshCw 
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import ClickableDate from '../components/ClickableDate';

export default function ClientsManager() {
  const { profile } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'activos' | 'limite'>('todos');
  
  // Selection & Details
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  // Active Shift Checking
  const [activeShift, setActiveShift] = useState<any | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Form States
  const [clientForm, setClientForm] = useState({
    nombre: '',
    telefono: '',
    limite_credito: ''
  });

  const [editClientForm, setEditClientForm] = useState({
    id: '',
    nombre: '',
    telefono: '',
    limite_credito: '',
    estado: 'activo' as 'activo' | 'inactivo'
  });

  const [payForm, setPayForm] = useState({
    monto: '',
    motivo: 'Abono a cuenta'
  });

  useEffect(() => {
    loadData();
    checkShift();
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getClientes();
      setClientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading clients:", error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const checkShift = async () => {
    if (!profile) return;
    try {
      const shift = await ApiService.getActiveShift(profile.id);
      setActiveShift(shift);
    } catch (error) {
      console.error("Error checking active shift:", error);
      setActiveShift(null);
    }
  };

  const loadClientHistory = async (client: Cliente) => {
    try {
      setHistoryLoading(true);
      const res = await ApiService.getClienteHistory(client.id);
      if (res && Array.isArray(res.history)) {
        setHistory(res.history);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error("Error loading client history:", error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectClient = (client: Cliente) => {
    setSelectedCliente(client);
    loadClientHistory(client);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.nombre.trim()) return;

    try {
      const newClient = await ApiService.createCliente({
        nombre: clientForm.nombre.trim(),
        telefono: clientForm.telefono.trim(),
        limite_credito: Number(clientForm.limite_credito) || 0
      });
      
      setShowAddModal(false);
      setClientForm({ nombre: '', telefono: '', limite_credito: '' });
      loadData();
      
      // Auto select newly created client
      if (newClient) {
        handleSelectClient(newClient);
      }
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientForm.nombre.trim()) return;

    try {
      const updated = await ApiService.updateCliente(editClientForm.id, {
        nombre: editClientForm.nombre.trim(),
        telefono: editClientForm.telefono.trim(),
        limite_credito: Number(editClientForm.limite_credito) || 0,
        estado: editClientForm.estado
      });
      
      setShowEditModal(false);
      loadData();
      
      if (selectedCliente && selectedCliente.id === editClientForm.id) {
        setSelectedCliente(updated);
      }
    } catch (error) {
      console.error("Error editing client:", error);
    }
  };

  const isShiftExpired = React.useMemo(() => {
    if (!activeShift) return false;
    const shiftDate = new Date(activeShift.fecha_apertura).toDateString();
    const todayDate = new Date().toDateString();
    return shiftDate !== todayDate;
  }, [activeShift]);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente || !payForm.monto || isShiftExpired) return;
    if (!selectedCliente || !payForm.monto) return;

    try {
      const res = await ApiService.payClienteDeuda(selectedCliente.id, {
        monto: Number(payForm.monto),
        motivo: payForm.motivo || 'Abono a cuenta',
        turno_id: activeShift?.id,
        usuario_id: profile?.id,
        usuario_nombre: profile?.nombre || 'Sistema'
      });

      setShowPayModal(false);
      setPayForm({ monto: '', motivo: 'Abono a cuenta' });
      
      // Reload current list & details
      await loadData();
      if (res && res.cliente) {
        setSelectedCliente(res.cliente);
        await loadClientHistory(res.cliente);
      } else {
        await handleSelectClient(selectedCliente);
      }
      
      // Reload shift state as cash enters it
      checkShift();
    } catch (error) {
      console.error("Error registering payment:", error);
    }
  };

  const openEditModal = (client: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditClientForm({
      id: client.id,
      nombre: client.nombre,
      telefono: client.telefono,
      limite_credito: String(client.limite_credito),
      estado: client.estado
    });
    setShowEditModal(true);
  };

  const openPayModal = (client: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCliente(client);
    setShowPayModal(true);
  };

  // Filter logic
  const filteredClientes = clientes.filter(client => {
    const matchesSearch = 
      client.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.telefono.includes(searchQuery);

    if (!matchesSearch) return false;

    if (activeFilter === 'activos') {
      return client.estado === 'activo';
    }
    if (activeFilter === 'limite') {
      const threshold = client.limite_credito * 0.8;
      return client.estado === 'activo' && client.limite_credito > 0 && client.deuda_actual >= threshold;
    }
    return true;
  });

  // Totals calculations
  const totalCuentasCobrar = clientes.reduce((sum, c) => sum + c.deuda_actual, 0);
  const totalClientesActivos = clientes.filter(c => c.estado === 'activo').length;
  const clientesAlLimite = clientes.filter(c => c.estado === 'activo' && c.limite_credito > 0 && c.deuda_actual >= c.limite_credito * 0.8).length;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-blue-400" />
            Clientes y Crédito (Fiao)
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Gestiona la cartera de fiaos, límites de crédito y abonos de tus clientes.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-gray-900 px-6 py-3.5 rounded-2xl font-black flex items-center gap-2 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-blue-950/40 hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          NUEVO CLIENTE DE CRÉDITO
        </button>
      </div>

      {/* Overview Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center gap-5 shadow-xl">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-blue-400">
            <Wallet className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cuentas por Cobrar</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{formatCurrency(totalCuentasCobrar)}</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center gap-5 shadow-xl">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-400">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clientes Activos</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{totalClientesActivos} <span className="text-sm font-medium text-gray-400">/ {clientes.length} total</span></p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className={`bg-white/40 border rounded-3xl p-6 flex items-center gap-5 shadow-xl transition-colors duration-300 ${clientesAlLimite > 0 ? 'border-amber-500/30 bg-amber-950/5' : 'border-gray-100'}`}>
          <div className={`p-4 rounded-2xl border transition-colors ${clientesAlLimite > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-gray-100/50 border-gray-100 text-gray-500'}`}>
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clientes al Límite (≥ 80%)</p>
            <p className={`text-3xl font-black mt-1 ${clientesAlLimite > 0 ? 'text-amber-400 animate-pulse' : 'text-gray-900'}`}>{clientesAlLimite}</p>
          </div>
        </div>
      </div>

      {/* Main Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Clients List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-2xl space-y-4">
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Buscar por nombre o número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex bg-white/60 border border-gray-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setActiveFilter('todos')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === 'todos' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveFilter('activos')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === 'activos' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Activos
                </button>
                <button
                  onClick={() => setActiveFilter('limite')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === 'limite' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Al Límite
                </button>
              </div>
            </div>

            {/* List/Table */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-sm font-semibold text-gray-500">Cargando libreta de clientes...</p>
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                <div className="bg-white/60 border border-gray-100 p-4 rounded-3xl text-gray-400 mb-4">
                  <User className="h-8 w-8" />
                </div>
                <p className="text-lg font-bold text-gray-900">Ningún cliente encontrado</p>
                <p className="text-gray-500 text-sm max-w-sm mt-1">Intenta con otra búsqueda o registra un nuevo cliente de crédito usando el botón superior.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClientes.map((client) => {
                  const percentUsed = client.limite_credito > 0 
                    ? Math.min(100, Math.round((client.deuda_actual / client.limite_credito) * 100))
                    : 0;

                  const isNearLimit = client.limite_credito > 0 && client.deuda_actual >= client.limite_credito * 0.8;
                  const isOverLimit = client.limite_credito > 0 && client.deuda_actual >= client.limite_credito;

                  const isSelected = selectedCliente?.id === client.id;

                  return (
                    <div 
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected 
                          ? 'bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-950/10' 
                          : 'bg-white/40 border-gray-100 hover:bg-white/70 hover:border-gray-100'
                      }`}
                    >
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-base group-hover:text-blue-400 transition-colors">
                            {client.nombre}
                          </span>
                          
                          {/* Badges */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${client.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-100 text-gray-500 border border-slate-700'}`}>
                            {client.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </span>

                          {isOverLimit && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                              Límite Superado
                            </span>
                          )}
                          {!isOverLimit && isNearLimit && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Límite Cercano
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {client.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.telefono}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            Límite: {client.limite_credito > 0 ? formatCurrency(client.limite_credito) : 'Sin límite'}
                          </span>
                        </div>

                        {/* Credit Limit Progress Bar */}
                        {client.limite_credito > 0 && (
                          <div className="w-full max-w-md mt-2 space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                              <span>Límite utilizado: {percentUsed}%</span>
                              <span>{formatCurrency(client.deuda_actual)} / {formatCurrency(client.limite_credito)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentUsed >= 100 
                                    ? 'bg-red-500' 
                                    : percentUsed >= 80 
                                    ? 'bg-amber-500' 
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions and Debt */}
                      <div className="flex items-center gap-4 justify-between sm:justify-end border-t border-gray-100 sm:border-t-0 pt-3 sm:pt-0">
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Deuda Pendiente</p>
                          <p className={`text-xl font-black ${client.deuda_actual > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            {formatCurrency(client.deuda_actual)}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          {client.estado === 'activo' && client.deuda_actual > 0 && (
                            <button
                              onClick={(e) => openPayModal(client, e)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20"
                              title="Registrar Abono"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              Abonar
                            </button>
                          )}
                          <button
                            onClick={(e) => openEditModal(client, e)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-900 p-2 rounded-xl text-xs font-bold transition-all border border-gray-100"
                            title="Editar Cliente"
                          >
                            <Edit className="h-3.5 w-3.5 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Client History & Activity Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-2xl space-y-4">
            {selectedCliente ? (
              <div className="space-y-4">
                {/* Header detail of client */}
                <div className="border-b border-gray-100 pb-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black text-gray-900">{selectedCliente.nombre}</h3>
                    <button 
                      onClick={() => setSelectedCliente(null)}
                      className="text-gray-500 hover:text-gray-900 transition-all bg-white p-1.5 rounded-lg border border-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">
                    ID: {selectedCliente.id} • Creado el {new Date(selectedCliente.fecha_creacion).toLocaleDateString('es-ES')}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/60 p-3 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase block tracking-wider">Deuda Actual</span>
                      <span className="text-base font-black text-red-400">{formatCurrency(selectedCliente.deuda_actual)}</span>
                    </div>
                    <div className="bg-white/60 p-3 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase block tracking-wider">Límite Permitido</span>
                      <span className="text-base font-black text-gray-900">
                        {selectedCliente.limite_credito > 0 ? formatCurrency(selectedCliente.limite_credito) : 'Sin Límite'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* History Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-400" />
                    Historial de Movimientos
                  </h4>

                  {historyLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                      <p className="text-xs text-gray-400 font-semibold">Cargando movimientos...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 border border-dashed border-gray-100 rounded-2xl bg-white/20">
                      <p className="text-xs font-bold text-gray-500">Sin ventas ni abonos registrados</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Las transacciones fiadas o abonos aparecerán aquí.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                      {history.map((item, idx) => {
                        const isPayment = item.tipo === 'pago';

                        return (
                          <div 
                            key={item.id || idx}
                            onClick={() => setSelectedHistoryItem(item)}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${
                              isPayment 
                                ? 'bg-emerald-950/15 border-emerald-500/20' 
                                : 'bg-white/40 border-gray-100 hover:border-blue-200'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`p-1 rounded-md ${isPayment ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {isPayment ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                </span>
                                <span className="font-bold text-gray-900">
                                  {isPayment ? 'Abono / Pago' : 'Venta Fiada'}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500">
                                <ClickableDate date={item.fecha || item.fecha_creacion} />
                              </p>
                              {!isPayment && (
                                <p className="text-[10px] font-black text-blue-400">
                                  Código: {item.codigo_recibo || 'Factura'}
                                </p>
                              )}
                              {isPayment && item.motivo && (
                                <p className="text-[10px] text-gray-500 italic">
                                  "{item.motivo}"
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <span className={`font-black text-sm block ${isPayment ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isPayment ? '-' : '+'}{formatCurrency(item.monto || item.total)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Active shift warning or info inside sidebar */}
                {selectedCliente.estado === 'activo' && selectedCliente.deuda_actual > 0 && (
                  <button
                    onClick={(e) => openPayModal(selectedCliente, e)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-gray-900 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30"
                  >
                    <Wallet className="h-4 w-4" />
                    REGISTRAR ABONO AHORA
                  </button>
                )}
              </div>
            ) : (
              <div className="py-24 text-center px-4 flex flex-col items-center justify-center">
                <div className="bg-white/60 p-4 rounded-3xl text-gray-400 border border-gray-100 mb-3">
                  <UserCheck className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-gray-900">Selecciona un cliente</p>
                <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">Haz clic en cualquier cliente de la libreta para ver su ficha, movimientos e historial de transacciones.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* MODAL: ADD CLIENT (Agrandado para evitar cortes de texto) */}
      {/* ======================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-100 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-400" />
                  Nuevo Cliente de Crédito
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Registra un cliente de confianza en la libreta de fiaos.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-900 transition-all bg-gray-100 p-2 rounded-xl border border-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Nombre Completo *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej: Doña María Valdéz"
                    value={clientForm.nombre}
                    onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Teléfono / Celular</label>
                  <input 
                    type="text"
                    placeholder="Ej: 809-555-0100"
                    value={clientForm.telefono}
                    onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Límite de Crédito */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Límite de Crédito Máximo (RD$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">RD$</span>
                  <input 
                    type="number"
                    min="0"
                    placeholder="Ej: 10000 (Coloca 0 para crédito ilimitado)"
                    value={clientForm.limite_credito}
                    onChange={(e) => setClientForm({ ...clientForm, limite_credito: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 italic mt-1 leading-relaxed">
                  Nota: El POS bloqueará las ventas a este cliente si su deuda actual más el total de la compra excede este límite configurado.
                </p>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 border border-gray-100 text-gray-600 hover:text-gray-900 rounded-xl text-xs font-black transition-all bg-transparent"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-gray-900 rounded-xl text-xs font-black transition-all hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-950/20"
                >
                  GUARDAR CLIENTE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: EDIT CLIENT (Agrandado para evitar cortes de texto) */}
      {/* ======================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-100 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-400" />
                  Editar Cliente de Crédito
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Modifica los detalles del cliente y su límite financiero.</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-900 transition-all bg-gray-100 p-2 rounded-xl border border-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditClient} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Nombre Completo *</label>
                  <input 
                    type="text"
                    required
                    value={editClientForm.nombre}
                    onChange={(e) => setEditClientForm({ ...editClientForm, nombre: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Teléfono / Celular</label>
                  <input 
                    type="text"
                    value={editClientForm.telefono}
                    onChange={(e) => setEditClientForm({ ...editClientForm, telefono: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Límite de Crédito */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Límite de Crédito (RD$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">RD$</span>
                    <input 
                      type="number"
                      min="0"
                      value={editClientForm.limite_credito}
                      onChange={(e) => setEditClientForm({ ...editClientForm, limite_credito: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Estado del Cliente</label>
                  <select 
                    value={editClientForm.estado}
                    onChange={(e) => setEditClientForm({ ...editClientForm, estado: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
                  >
                    <option value="activo">Activo (Habilitado para fiar)</option>
                    <option value="inactivo">Inactivo (Crédito suspendido)</option>
                  </select>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 border border-gray-100 text-gray-600 hover:text-gray-900 rounded-xl text-xs font-black transition-all bg-transparent"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-gray-900 rounded-xl text-xs font-black transition-all hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-950/20"
                >
                  ACTUALIZAR CLIENTE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: REGISTER PAYMENT (Agrandado y con shift logging) */}
      {/* ======================================================= */}
      {showPayModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-100 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                  Registrar Abono a Deuda
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Ingresa el pago recibido de parte del cliente.</p>
              </div>
              <button 
                onClick={() => setShowPayModal(false)}
                className="text-gray-500 hover:text-gray-900 transition-all bg-gray-100 p-2 rounded-xl border border-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              {/* Cliente deudor info summary */}
              <div className="bg-white/60 border border-gray-100 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Deudor</span>
                  <span className="text-lg font-black text-gray-900">{selectedCliente.nombre}</span>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Deuda Pendiente</span>
                  <span className="text-2xl font-black text-red-400">{formatCurrency(selectedCliente.deuda_actual)}</span>
                </div>
              </div>

              {/* Shift validation warning */}
              {isShiftExpired ? (
                <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-red-400 uppercase tracking-wide">Día Vencido</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      La caja actual fue abierta un día anterior. Para mantener tus cuentas claras, debes ir a la sección de Turnos, realizar el cierre de caja de ayer y abrir una nueva para hoy. No podrás registrar abonos hasta entonces.
                    </p>
                  </div>
                </div>
              ) : !activeShift ? (
                <div className="bg-amber-950/20 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide">Turno de caja cerrado</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      No tienes un turno de caja abierto en este momento. Si registras este pago en efectivo, la transacción se guardará en la libreta del cliente, pero **no sumará al arqueo del efectivo de caja diario**. Te recomendamos abrir un turno en la sección de Turnos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/15 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wide">Turno activo detectado</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      El abono se vinculará a tu turno activo **({activeShift.usuario_nombre})**. Se registrará automáticamente un **ingreso de efectivo de caja** de {formatCurrency(Number(payForm.monto) || 0)} que incrementará el monto esperado al cuadrar la caja.
                    </p>
                  </div>
                </div>
              )}

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monto del Abono */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Monto a Abonar (RD$) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">RD$</span>
                    <input 
                      type="number"
                      required
                      min="1"
                      max={selectedCliente.deuda_actual}
                      placeholder="Ingresa la cantidad recibida"
                      value={payForm.monto}
                      onChange={(e) => setPayForm({ ...payForm, monto: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 text-sm transition-all font-black text-emerald-400 text-lg"
                    />
                  </div>
                </div>

                {/* Motivo o Tipo de abono */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Motivo / Concepto</label>
                  <select 
                    value={payForm.motivo}
                    onChange={(e) => setPayForm({ ...payForm, motivo: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-500/50 text-sm transition-all"
                  >
                    <option value="Abono a cuenta">Abono regular a cuenta</option>
                    <option value="Abono parcial de factura">Abono parcial de factura</option>
                    <option value="Liquidación de cuenta">Liquidación completa de deuda</option>
                    <option value="Pago por transferencia">Abono recibido por transferencia</option>
                  </select>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-6 py-3 border border-gray-100 text-gray-600 hover:text-gray-900 rounded-xl text-xs font-black transition-all bg-transparent"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={!payForm.monto || Number(payForm.monto) <= 0 || Number(payForm.monto) > selectedCliente.deuda_actual}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-gray-900 rounded-xl text-xs font-black transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-950/20"
                >
                  REGISTRAR ABONO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {selectedHistoryItem.tipo === 'pago' ? 'Detalle de Abono' : 'Detalle de Venta Fiada'}
              </h2>
              <button onClick={() => setSelectedHistoryItem(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha</p>
                  <p className="font-bold text-gray-700">
                    <ClickableDate date={selectedHistoryItem.fecha || selectedHistoryItem.fecha_creacion} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto Total</p>
                  <p className={`text-xl font-black ${selectedHistoryItem.tipo === 'pago' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(selectedHistoryItem.monto || selectedHistoryItem.total)}
                  </p>
                </div>
              </div>

              {selectedHistoryItem.tipo === 'venta' && selectedHistoryItem.detalles && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Productos Fiados</p>
                  <div className="space-y-3">
                    {selectedHistoryItem.detalles.map((prod: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-2xl flex justify-between items-center border border-gray-100">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{prod.nombre || prod.producto_nombre || 'Producto'}</p>
                          <p className="text-xs text-gray-500">{prod.cantidad}x {formatCurrency(prod.precio_unitario || prod.precio_venta || 0)}</p>
                        </div>
                        <p className="font-black text-gray-900 font-mono text-sm">
                          {formatCurrency(prod.total_linea || ((prod.cantidad || 1) * (prod.precio_unitario || prod.precio_venta || 0)))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedHistoryItem.tipo === 'pago' && selectedHistoryItem.motivo && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Motivo / Concepto</p>
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100/50 text-sm font-semibold">
                    {selectedHistoryItem.motivo}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
