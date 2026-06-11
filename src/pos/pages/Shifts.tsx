import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiService } from '../services/api';
import { formatCurrency, cn } from '../lib/utils';
import { 
  History, User, Clock, ArrowRight, ShieldCheck, Plus, Minus, 
  TrendingUp, TrendingDown, Banknote, Coins, AlertTriangle, 
  CheckCircle2, FileText, Search, CreditCard, Landmark, 
  Receipt, Wallet, Calendar, X, AlertCircle, MoreVertical, Loader2, Eye, Users
} from 'lucide-react';
import { Shift, ShiftStatus, DenominationBreakdown, CashMovement, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import ClickableDate from '../components/ClickableDate';
import { DENOMINATIONS } from '../constants/denominations';


export default function Shifts() {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  // Users select list for ADMIN
  const [sysUsers, setSysUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const location = useLocation();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedShiftMovements, setSelectedShiftMovements] = useState<CashMovement[]>([]);
  const [selectedShiftSales, setSelectedShiftSales] = useState<any[]>([]);
  const [loadingShiftDetails, setLoadingShiftDetails] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.rol === UserRole.ADMIN) {
      ApiService.getUsers()
        .then(users => {
          setSysUsers(users || []);
          if (profile?.id) {
            setSelectedUserId(profile.id);
          }
        })
        .catch(err => console.error("Error loading system users:", err));
    }
  }, [profile]);

  useEffect(() => {
    if (selectedShift) {
      setLoadingShiftDetails(true);
      Promise.all([
        ApiService.getCashMovements(selectedShift.id),
        fetch('/api/sales').then(r => r.json())
      ]).then(([movements, sales]) => {
        setSelectedShiftMovements(movements || []);
        const shiftSales = (sales || []).filter((s: any) => s.turno_id === selectedShift.id);
        setSelectedShiftSales(shiftSales);
      }).catch(err => {
        console.error("Error loading shift details:", err);
      }).finally(() => {
        setLoadingShiftDetails(false);
      });
    } else {
      setSelectedShiftMovements([]);
      setSelectedShiftSales([]);
    }
  }, [selectedShift]);
  
  // Form states
  const [montoInicial, setMontoInicial] = useState('0');
  const [movementForm, setMovementForm] = useState({ tipo: 'salida' as const, monto: '', motivo: '' });
  const [closeForm, setCloseForm] = useState({
    desglose: {
      b2000: 0, b1000: 0, b500: 0, b200: 0, b100: 0, b50: 0,
      m25: 0, m10: 0, m5: 0, m1: 0, otros: 0
    } as DenominationBreakdown,
    motivoDiferencia: ''
  });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const targetUserId = selectedUserId || profile.id;
      const active = await ApiService.getActiveShift(targetUserId);
      setActiveShift(active);
      
      const params = profile.rol === UserRole.ADMIN ? {} : { userId: profile.id };
      const history = await ApiService.getAllShifts(params);
      setShifts(history);
    } catch (error) {
      console.error("Error loading shift data:", error);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-open modal if navigated from POS
  useEffect(() => {
    if (location.state?.openCloseModal && activeShift) {
      setShowCloseModal(true);
      // Clear the state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, activeShift]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const targetUserId = selectedUserId || profile.id;
      const targetUser = sysUsers.find(u => u.id === targetUserId) || profile;
      await ApiService.openShift(targetUser.id, targetUser.nombre, parseFloat(montoInicial));
      setShowOpenModal(false);
      loadData();
    } catch (error: any) {
      alert(error.message || "Error al abrir turno");
    }
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !profile) return;
    try {
      await ApiService.addCashMovement({
        turno_id: activeShift.id,
        usuario_id: profile.id,
        tipo: movementForm.tipo,
        monto: parseFloat(movementForm.monto),
        motivo: movementForm.motivo
      });
      setShowMovementModal(false);
      setMovementForm({ tipo: 'salida', monto: '', motivo: '' });
      loadData();
    } catch (error) {
      console.error("Error adding movement:", error);
    }
  };

  const calculateCounted = () => {
    let total = 0;
    DENOMINATIONS.forEach(d => {
      total += (closeForm.desglose[d.key as keyof DenominationBreakdown] || 0) * d.value;
    });
    total += Number(closeForm.desglose.otros || 0);
    return total;
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    const counted = calculateCounted();
    const diff = counted - activeShift.monto_esperado;
    
    if (diff !== 0 && !closeForm.motivoDiferencia) {
      alert("Debes indicar un motivo para la diferencia en caja.");
      return;
    }

    try {
      await ApiService.closeShift(
        activeShift.id, 
        counted, 
        closeForm.desglose, 
        closeForm.motivoDiferencia
      );
      setShowCloseModal(false);
      loadData();
    } catch (error) {
      console.error("Error closing shift:", error);
    }
  };

  const handleUpdateStatus = async (shiftId: string, status: ShiftStatus) => {
    if (!profile) return;
    const nota = prompt("Nota administrativa opcional:");
    try {
      await ApiService.updateShiftStatus(shiftId, {
        status,
        notaAdmin: nota || undefined,
        reviewedBy: profile.nombre
      });
      loadData();
    } catch (error) {
      console.error("Error updating shift:", error);
    }
  };

  if (loading && !activeShift && shifts.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold">Sincronizando caja...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mi Caja y Turnos</h1>
          <p className="text-gray-500 font-medium">Aquí abres tu caja al empezar el día con el cambio, anotas si sacas dinero para pagos, y cuentas tus billetes al cerrar el turno.</p>
          
          {profile?.rol === UserRole.ADMIN && sysUsers.length > 0 && (
            <div className="mt-4 flex items-center gap-3 bg-white p-3 border border-gray-150 rounded-2xl shadow-sm max-w-md">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex-shrink-0">GESTIONAR CAJA DE:</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-gray-50 border-2 border-gray-100 text-gray-800 text-sm rounded-xl px-3 py-1.5 focus:border-blue-500 outline-none font-black flex-1"
              >
                {sysUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nombre} ({user.rol.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {!activeShift && (
          <button 
            id="open-shift-btn"
            onClick={() => setShowOpenModal(true)}
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
          >
            <Plus className="h-6 w-6" />
            + EMPEZAR DÍA / ABRIR CAJA
          </button>
        )}
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <div id="active-shift-card" className="bg-white rounded-[2.5rem] border-2 border-emerald-100 shadow-xl shadow-emerald-50/50 overflow-hidden">
          <div className="bg-emerald-600 px-8 py-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Clock className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <p className="text-emerald-100 text-xs font-black uppercase tracking-widest">Turno Activo</p>
                <h3 className="text-xl font-black uppercase tracking-tight">{activeShift.usuario_nombre}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-xs font-black uppercase tracking-widest">Apertura</p>
              <p className="font-bold">{format(new Date(activeShift.fecha_apertura), "p", { locale: es })}</p>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Saldo Inicial</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{formatCurrency(activeShift.monto_inicial)}</p>
              </div>

              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Ventas Efectivo</span>
                </div>
                <p className="text-2xl font-black text-emerald-600">{formatCurrency(activeShift.total_efectivo)}</p>
              </div>

              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Movimientos (+/-)</span>
                </div>
                <p className={cn(
                  "text-2xl font-black",
                  activeShift.total_entradas - activeShift.total_salidas >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {formatCurrency(activeShift.total_entradas - activeShift.total_salidas)}
                </p>
              </div>

              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-black text-blue-400 uppercase tracking-widest font-sans">DINERO ESPERADO</span>
                </div>
                <p className="text-2xl font-black text-blue-600">{formatCurrency(activeShift.monto_esperado)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-sm">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <span className="font-bold text-gray-500">Tarjeta:</span>
                  <span className="font-black text-gray-900 ml-auto">{formatCurrency(activeShift.total_tarjeta)}</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Landmark className="h-5 w-5 text-gray-400" />
                  <span className="font-bold text-gray-500">Transferencia:</span>
                  <span className="font-black text-gray-900 ml-auto">{formatCurrency(activeShift.total_transferencia)}</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Receipt className="h-5 w-5 text-gray-400" />
                  <span className="font-bold text-gray-500">Ventas Totales:</span>
                  <span className="font-black text-blue-600 ml-auto text-lg">{formatCurrency(activeShift.total_ventas)}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-100">
              <button 
                onClick={() => setShowMovementModal(true)}
                className="flex-1 bg-white border-2 border-gray-100 text-gray-700 px-6 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5 text-blue-600" />
                MOVIMIENTO DE CAJA
              </button>
              <button 
                onClick={() => setShowCloseModal(true)}
                className="flex-1 bg-gray-900 text-white px-6 py-4 rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                CERRAR TURNO Y ARQUEO
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-[2rem] text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Sin Turno Activo</h3>
          <p className="text-amber-700 font-medium max-w-md mx-auto">
            {profile?.rol === UserRole.ADMIN && selectedUserId !== profile.id
              ? `El usuario seleccionado (${sysUsers.find(u => u.id === selectedUserId)?.nombre || 'Administrador'}) no tiene un turno activo.` 
              : 'No tienes un turno activo abierto para el día de hoy.'}
          </p>
          <button 
            id="open-shift-now-btn"
            onClick={() => setShowOpenModal(true)}
            className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all px-6 text-xs uppercase font-black"
          >
            ABRIR TURNO AHORA
          </button>
        </div>
      )}

      {/* History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Historial de Turnos</h2>
          <div className="flex items-center gap-2 text-gray-400">
            <Search className="h-5 w-5" />
            <span className="text-sm font-bold">Filtros Avanzados</span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cajero / Fecha</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Horarios</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Vendido</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Diferencia</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shifts.map((shift, index) => {
                  const isOpeningDiff = shift.diferencia_apertura !== undefined && shift.diferencia_apertura !== 0;

                  return (
                  <tr 
                    key={shift.id} 
                    onClick={() => setSelectedShift(shift)}
                    className="hover:bg-gray-50 transition-all group cursor-pointer"
                    title="Haz clic para abrir la auditoría con cronología y horas exactas"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-55 group-hover:text-blue-500 transition-colors">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{shift.usuario_nombre}</p>
                          <div className="text-xs font-bold text-gray-400">
                            <ClickableDate date={shift.fecha_apertura} className="text-xs font-bold text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-2">
                        {/* Apertura */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-24 shrink-0">
                            <div className="h-4 w-4 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                              <Plus className="h-2.5 w-2.5 text-emerald-500" />
                            </div>
                            Apertura
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-gray-900">{format(new Date(shift.fecha_apertura), "hh:mm a")}</span>
                            <div 
                              className={cn(
                                "px-2 py-0.5 rounded-md font-mono text-[10px] font-black flex items-center gap-1",
                                isOpeningDiff ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                              )}
                              title={isOpeningDiff ? `Descuadre de ${shift.diferencia_apertura > 0 ? '+' : ''}${formatCurrency(shift.diferencia_apertura)} respecto al cierre anterior` : "Monto reportado al abrir"}
                            >
                              {formatCurrency(shift.monto_inicial)}
                              {isOpeningDiff && <AlertTriangle className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>

                        {/* Cierre */}
                        {shift.fecha_cierre && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-24 shrink-0">
                              <div className="h-4 w-4 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                                <Minus className="h-2.5 w-2.5 text-rose-500" />
                              </div>
                              Cierre
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-gray-900">{format(new Date(shift.fecha_cierre), "hh:mm a")}</span>
                              {shift.monto_contado !== undefined && (
                                <div 
                                  className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black flex items-center gap-1 bg-gray-100 text-gray-500"
                                  title="Monto reportado al cerrar"
                                >
                                  {formatCurrency(shift.monto_contado)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-gray-900 font-mono">
                      {formatCurrency(shift.total_ventas)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {shift.diferencia !== undefined ? (
                        <div className={cn(
                          "font-mono font-black",
                          shift.diferencia === 0 ? "text-emerald-500" : shift.diferencia > 0 ? "text-blue-500" : "text-red-500"
                        )}>
                          {shift.diferencia > 0 ? "+" : ""}{formatCurrency(shift.diferencia)}
                          <p className="text-[10px] uppercase font-bold tracking-tighter mt-0.5">
                            {shift.diferencia === 0 ? "Cuadre OK" : shift.diferencia > 0 ? "Sobrante" : "Faltante"}
                          </p>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span 
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          shift.estado === ShiftStatus.ABIERTO && "bg-emerald-100 text-emerald-700 border border-emerald-200",
                          shift.estado === ShiftStatus.CERRADO && "bg-blue-100 text-blue-700 border border-blue-200",
                          shift.estado === ShiftStatus.APROBADO && "bg-emerald-600 text-white",
                          shift.estado === ShiftStatus.CON_DIFERENCIA && "bg-orange-100 text-orange-700 border border-orange-200 cursor-help"
                        )}
                        title={shift.estado === ShiftStatus.CON_DIFERENCIA ? (shift.diferencia === 0 ? "Marcado manualmente con diferencia por un administrador." : `El cajero reportó ${shift.diferencia > 0 ? 'un sobrante de' : 'un faltante de'} ${formatCurrency(Math.abs(shift.diferencia))} respecto al cálculo del sistema.`) : undefined}
                      >
                        {shift.estado === ShiftStatus.CON_DIFERENCIA ? 'DESCUADRE' : shift.estado}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {profile?.rol === UserRole.ADMIN && shift.estado === ShiftStatus.CERRADO && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(shift.id, ShiftStatus.APROBADO);
                              }}
                              title="Aprobar Turno"
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShift(shift);
                          }}
                          className="p-2 text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Eye className="h-5 w-5" />
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
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showOpenModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white p-8 rounded-[3rem] w-full max-w-2xl shadow-2xl space-y-8"
            >
              <div className="text-center">
                <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <Wallet className="h-10 w-10" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Apertura de Turno</h3>
                <p className="text-blue-600 font-extrabold uppercase text-xs tracking-widest mt-1">
                  Para: {sysUsers.find(u => u.id === (selectedUserId || profile?.id))?.nombre || profile?.nombre}
                </p>
                <p className="text-gray-500 font-medium text-xs mt-2">Define el dinero base para iniciar ventas</p>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">DINERO BASE EN CAJA (RD$)</label>
                  <div className="relative">
                    <input 
                      autoFocus
                      required
                      type="number"
                      value={montoInicial}
                      onChange={e => setMontoInicial(e.target.value)}
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:ring-8 focus:ring-blue-100 focus:border-blue-500 outline-none text-3xl font-black text-blue-600 font-mono text-center"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowOpenModal(false)}
                    className="py-5 bg-gray-50 text-gray-500 rounded-3xl font-black hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="py-5 bg-blue-600 text-white rounded-3xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-xs"
                  >
                    ABRIR TURNO
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showMovementModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white p-8 rounded-[3rem] w-full max-w-2xl shadow-2xl space-y-6"
            >
              <div className="text-center">
                <div className="flex gap-4 items-center justify-center mb-6">
                  <div className={cn(
                    "h-16 w-16 rounded-2xl flex items-center justify-center transition-all transform",
                    movementForm.tipo === 'entrada' ? "bg-emerald-100 text-emerald-600 rotate-3" : "bg-red-100 text-red-600 -rotate-3"
                  )}>
                    {movementForm.tipo === 'entrada' ? <TrendingUp className="h-8 w-8" /> : <TrendingDown className="h-8 w-8" />}
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Movimiento de Caja</h3>
              </div>

              <form onSubmit={handleCashMovement} className="space-y-4">
                <div className="p-1 bg-gray-100 rounded-2xl flex gap-1">
                  <button 
                    type="button"
                    onClick={() => setMovementForm({...movementForm, tipo: 'entrada'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-black text-xs transition-all",
                      movementForm.tipo === 'entrada' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    ENTRADA
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMovementForm({...movementForm, tipo: 'salida'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-black text-xs transition-all",
                      movementForm.tipo === 'salida' ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    SALIDA
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Monto (RD$)</label>
                  <input 
                    required
                    type="number"
                    value={movementForm.monto}
                    onChange={e => setMovementForm({...movementForm, monto: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-black text-xl text-center"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Motivo / Descripción</label>
                  <textarea 
                    required
                    value={movementForm.motivo}
                    onChange={e => setMovementForm({...movementForm, motivo: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold min-h-[100px]"
                    placeholder="Ej. Pago a delivery, compra de fundas..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowMovementModal(false)}
                    className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-xs uppercase"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-black transition-all"
                  >
                    GUARDAR
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCloseModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white p-8 rounded-[3rem] w-full max-w-4xl shadow-2xl my-8"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Cierre de Turno y Arqueo</h3>
                  <p className="text-gray-500 font-medium">Cuenta físicamente el dinero en caja por denominación</p>
                </div>
                <button onClick={() => setShowCloseModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {DENOMINATIONS.map(d => (
                      <div key={d.key} className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 group hover:border-blue-300 transition-colors">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase",
                          d.type === 'billete' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {d.type === 'billete' ? "B" : "M"}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{d.label}</p>
                          <input 
                            type="number"
                            min="0"
                            value={closeForm.desglose[d.key as keyof DenominationBreakdown] || ''}
                            onChange={e => setCloseForm({
                              ...closeForm, 
                              desglose: { ...closeForm.desglose, [d.key]: parseInt(e.target.value) || 0 }
                            })}
                            className="bg-transparent border-none outline-none font-black text-gray-900 w-full"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 col-span-2">
                        <div className="h-10 w-10 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500">
                          <MoreVertical className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Otros / Centavos</p>
                          <input 
                            type="number"
                            step="0.01"
                            value={closeForm.desglose.otros || ''}
                            onChange={e => setCloseForm({
                              ...closeForm, 
                              desglose: { ...closeForm.desglose, otros: parseFloat(e.target.value) || 0 }
                            })}
                            className="bg-transparent border-none outline-none font-black text-gray-900 w-full"
                            placeholder="0.00"
                          />
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-gray-200">
                    <div>
                      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Dinero Esperado</p>
                      <p className="text-3xl font-black font-mono">{formatCurrency(activeShift?.monto_esperado || 0)}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Dinero Contado (Físico)</p>
                      <p className="text-4xl font-black font-mono text-emerald-400">{formatCurrency(calculateCounted())}</p>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Diferencia Final</p>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                          calculateCounted() - (activeShift?.monto_esperado || 0) === 0 ? "bg-emerald-500/20 text-emerald-400" :
                          calculateCounted() - (activeShift?.monto_esperado || 0) > 0 ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {calculateCounted() - (activeShift?.monto_esperado || 0) === 0 ? "Cuadro Perfecto" : "Descuadre"}
                        </span>
                      </div>
                      <p className={cn(
                        "text-3xl font-black font-mono mt-1",
                        calculateCounted() - (activeShift?.monto_esperado || 0) === 0 ? "text-white" :
                        calculateCounted() - (activeShift?.monto_esperado || 0) > 0 ? "text-blue-400" : "text-red-400"
                      )}>
                        {calculateCounted() - (activeShift?.monto_esperado || 0) > 0 ? "+" : ""}
                        {formatCurrency(calculateCounted() - (activeShift?.monto_esperado || 0))}
                      </p>
                    </div>
                  </div>

                  {(calculateCounted() - (activeShift?.monto_esperado || 0)) !== 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="block text-xs font-black text-red-500 uppercase tracking-widest mb-2 ml-2">Explica el motivo del descuadre</label>
                      <textarea 
                        required
                        value={closeForm.motivoDiferencia}
                        onChange={e => setCloseForm({...closeForm, motivoDiferencia: e.target.value})}
                        className="w-full px-6 py-4 bg-red-50 border-2 border-red-100 rounded-2xl focus:ring-4 focus:ring-red-200 outline-none font-bold text-red-900"
                        placeholder="Ej. Faltaron RD$50 de un cambio, error en conteo inicial..."
                      ></textarea>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowCloseModal(false)}
                      className="py-5 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase"
                    >
                      VOLVER
                    </button>
                    <button 
                      onClick={handleCloseShift}
                      className="py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-700 shadow-xl shadow-blue-100"
                    >
                      FINALIZAR CIERRE
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedShift && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white p-8 rounded-[3rem] w-full max-w-4xl shadow-2xl my-8 flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6 shrink-0 border-b border-gray-100 pb-6">
                <div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block",
                    selectedShift.estado === ShiftStatus.ABIERTO && "bg-emerald-100 text-emerald-700",
                    selectedShift.estado === ShiftStatus.CERRADO && "bg-blue-100 text-blue-700",
                    selectedShift.estado === ShiftStatus.APROBADO && "bg-emerald-600 text-white",
                    selectedShift.estado === ShiftStatus.CON_DIFERENCIA && "bg-red-600 text-white"
                  )}>
                    Turno {selectedShift.estado}
                  </span>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                    Auditoría de Turno: {selectedShift.usuario_nombre}
                  </h3>
                  <p className="text-gray-500 font-medium text-sm">
                    Apertura: {format(new Date(selectedShift.fecha_apertura), "PPP 'a las' p", { locale: es })}
                    {selectedShift.fecha_cierre && ` | Cierre: ${format(new Date(selectedShift.fecha_cierre), "p", { locale: es })}`}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedShift(null);
                    setAuditSearchQuery('');
                  }} 
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all text-gray-400 hover:text-gray-900 shadow-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {loadingShiftDetails ? (
                <div className="flex-1 py-20 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                  <p className="text-gray-500 font-black text-sm">Cargando cronología de operaciones...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-8 min-h-0">
                  {/* Financial metrics summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Saldo Inicial (Cambio)</span>
                      <span className="text-lg font-black text-gray-900 font-mono">{formatCurrency(selectedShift.monto_inicial)}</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Ventas Registradas</span>
                      <span className="text-lg font-black text-blue-600 font-mono">{formatCurrency(selectedShift.total_ventas)}</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Movimientos Caja (+/-)</span>
                      <span className="text-lg font-black text-purple-600 font-mono">{formatCurrency(selectedShift.total_entradas - selectedShift.total_salidas)}</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border",
                      selectedShift.diferencia === 0 ? "bg-emerald-50 border-emerald-100" :
                      (selectedShift.diferencia && selectedShift.diferencia < 0) ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
                    )}>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Resultado de Cuadre</span>
                      <span className={cn(
                        "text-lg font-black font-mono",
                        selectedShift.diferencia === 0 ? "text-emerald-700 font-sans" :
                        (selectedShift.diferencia && selectedShift.diferencia < 0) ? "text-red-700" : "text-blue-700"
                      )}>
                        {selectedShift.diferencia === undefined ? 'Turno Abierto' : 
                         selectedShift.diferencia === 0 ? 'Cuadre Perfecto' : 
                         `${selectedShift.diferencia > 0 ? '+' : ''}${formatCurrency(selectedShift.diferencia)}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Expected Cash Box values */}
                  <div className="bg-slate-900 p-6 rounded-2xl text-white grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dinero Esperado en Caja</p>
                      <p className="text-2xl font-black font-mono text-slate-200">{formatCurrency(selectedShift.monto_esperado)}</p>
                    </div>
                    {selectedShift.monto_contado !== undefined && (
                      <>
                        <div>
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Dinero Contado (Arqueo Físico)</p>
                          <p className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(selectedShift.monto_contado)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Información de Diferencia</p>
                          <p className="text-sm font-bold text-slate-300">
                            {selectedShift.motivo_diferencia || 'Fórmula: Inicial + Ventas Efectivo + Entradas - Salidas. Sin novedades.'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cash breakdown denominations reported */}
                  {selectedShift.desglose_denominaciones && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Desglose Físico de Efectivo Reportado</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {DENOMINATIONS.map(d => {
                          const qty = selectedShift.desglose_denominaciones?.[d.key as keyof DenominationBreakdown] || 0;
                          if (qty === 0) return null;
                          return (
                            <div key={d.key} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                              <span className="block text-[10px] text-gray-400 font-bold uppercase">{d.label}</span>
                              <span className="text-base font-black text-gray-900">{qty} uds</span>
                              <span className="block text-[9px] text-gray-400 font-mono font-semibold">({formatCurrency(qty * d.value)})</span>
                            </div>
                          );
                        })}
                        {selectedShift.desglose_denominaciones?.otros > 0 && (
                          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center col-span-2 sm:col-span-1">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase">Otros Centavos</span>
                            <span className="text-base font-black text-gray-950">{formatCurrency(selectedShift.desglose_denominaciones.otros)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chronology & Auditing Line Timeline list */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-lg font-black text-gray-900 tracking-tight">Línea de Tiempo de Operaciones (Auditoría de Caja)</h4>
                        <p className="text-xs text-gray-400 font-medium">Cronología paso a paso con hora exacta, ideal para buscar grabaciones de cámaras de seguridad.</p>
                      </div>

                      {/* Search timelines query input */}
                      <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input 
                          type="text"
                          placeholder="Buscar ticket, cliente o motivo..."
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-gray-50 rounded-xl focus:bg-white outline-none font-bold text-xs transition-all"
                        />
                      </div>
                    </div>

                    <div className="relative border-l-2 border-gray-100 pl-6 ml-4 space-y-8 py-3">
                      {(() => {
                        const events: any[] = [];

                        // 1. Apertura
                        events.push({
                          fecha: new Date(selectedShift.fecha_apertura),
                          titulo: 'Apertura de Caja',
                          descripcion: `El cajero inició su jornada de venta registrando un fondo de cambio inicial de ${formatCurrency(selectedShift.monto_inicial)}.`,
                          montoVal: selectedShift.monto_inicial,
                          montoStr: formatCurrency(selectedShift.monto_inicial),
                          tipo: 'apertura',
                          cajero: selectedShift.usuario_nombre,
                          color: 'bg-blue-50 border-2 border-blue-500 text-blue-600',
                          icon: Wallet
                        });

                        // 2. Sales
                        selectedShiftSales.forEach((sale) => {
                          const itemsDesc = sale.items?.map((item: any) => `${item.cantidad}x ${item.nombre}`).join(', ') || 'Productos';
                          
                          events.push({
                            fecha: new Date(sale.fecha),
                            titulo: `Venta Registrada - Ticket #${sale.codigo_recibo || sale.id.slice(-6)}`,
                            descripcion: `Venta a cliente ${sale.cliente || 'Consumidor Final'} con un total de ${formatCurrency(sale.total)}. Pago vía ${sale.metodo_pago}. Detalle artículo(s): ${itemsDesc}`,
                            montoVal: sale.total,
                            montoStr: `+${formatCurrency(sale.total)}`,
                            tipo: 'venta',
                            cajero: sale.usuario_nombre || selectedShift.usuario_nombre,
                            color: sale.estado === 'cancelada' 
                              ? 'bg-red-50 border-2 border-red-500 text-red-650' 
                              : sale.estado === 'reembolsada' 
                              ? 'bg-amber-50 border-2 border-amber-500 text-amber-600'
                              : 'bg-emerald-50 border-2 border-emerald-500 text-emerald-600',
                            icon: Receipt,
                            subt: sale.estado !== 'completada' ? `⚠️ ESTADO: ${sale.estado.toUpperCase()}` : undefined
                          });
                        });

                        // 3. Cash movements
                        selectedShiftMovements.forEach((mov) => {
                          events.push({
                            fecha: new Date(mov.fecha),
                            titulo: mov.tipo === 'entrada' ? 'Entrada Manual de Efectivo' : 'Salida / Retiro Manual de Caja',
                            descripcion: `Se ajustó el saldo de la caja. Motivo: ${mov.motivo}`,
                            montoVal: mov.monto,
                            montoStr: `${mov.tipo === 'entrada' ? '+' : '-'}${formatCurrency(mov.monto)}`,
                            tipo: mov.tipo,
                            cajero: selectedShift.usuario_nombre,
                            color: mov.tipo === 'entrada' ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-600' : 'bg-rose-50 border-2 border-rose-500 text-rose-600',
                            icon: mov.tipo === 'entrada' ? TrendingUp : TrendingDown
                          });
                        });

                        // 4. Cierre
                        if (selectedShift.fecha_cierre) {
                          events.push({
                            fecha: new Date(selectedShift.fecha_cierre),
                            titulo: 'Cierre de Caja y Arqueo de Turno',
                            descripcion: `Se dio de baja a la operación activa de caja. Se esperaban ${formatCurrency(selectedShift.monto_esperado)}, y se reportaron contados físicamente ${formatCurrency(selectedShift.monto_contado || 0)}.`,
                            montoVal: selectedShift.monto_contado || 0,
                            montoStr: formatCurrency(selectedShift.monto_contado || 0),
                            tipo: 'cierre',
                            cajero: selectedShift.usuario_nombre,
                            color: 'bg-slate-900 border-2 border-slate-950 text-white',
                            icon: ShieldCheck,
                            subt: selectedShift.motivo_diferencia ? `Motivo del Descuadre: "${selectedShift.motivo_diferencia}"` : undefined
                          });
                        }

                        // Sort chronologically (oldest first)
                        events.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

                        // Filter by query
                        const filtered = events.filter(e => {
                          const query = auditSearchQuery.toLowerCase().trim();
                          if (!query) return true;
                          return (
                            e.titulo.toLowerCase().includes(query) ||
                            e.descripcion.toLowerCase().includes(query) ||
                            e.cajero.toLowerCase().includes(query) ||
                            (e.subt && e.subt.toLowerCase().includes(query))
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-10 text-center font-bold text-gray-400 italic">
                              No hay registros de caja que coincidan con la búsqueda.
                            </div>
                          );
                        }

                        return filtered.map((ev, index) => {
                          const IconComp = ev.icon;
                          return (
                            <div key={index} className="relative group/item">
                              {/* Bullet ring layout */}
                              <div className={cn(
                                "absolute -left-[35px] top-1.5 h-7 w-7 rounded-lg flex items-center justify-center shadow-sm z-10 transition-transform group-hover/item:scale-110",
                                ev.color
                              )}>
                                <IconComp className="h-4 w-4" />
                              </div>

                              <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="font-black text-gray-900 text-sm leading-tight">{ev.titulo}</h5>
                                    {ev.subt && (
                                      <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded font-black text-[9px] uppercase tracking-wider">
                                        {ev.subt}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono font-black text-gray-900 shrink-0 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                                    {ev.montoStr}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-3xl">{ev.descripcion}</p>
                                <div className="flex items-center gap-3 mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(ev.fecha, "p (hh:mm:ss a)")}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Registró: {ev.cajero}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border-t border-gray-100 p-6 -mx-8 -mb-8 rounded-b-[3rem] text-right shrink-0">
                <button 
                  onClick={() => {
                    setSelectedShift(null);
                    setAuditSearchQuery('');
                  }}
                  className="px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg"
                >
                  Entendido / Cerrar Auditoría
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
