import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Sale, UserRole } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Receipt, Search, Calendar, User, Clock, Trash2, RotateCcw, AlertCircle, FileText, Printer, Eye, X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { printReceipt } from '../lib/printReceipt';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClickableDate from '../components/ClickableDate';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export default function SalesHistory() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Refund security modal states
  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const [refundNote, setRefundNote] = useState('');
  const [refundPassword, setRefundPassword] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundingSaleId, setRefundingSaleId] = useState<string | null>(null);

  const [filterMetodo, setFilterMetodo] = useState('todos');
  const [filterDate, setFilterDate] = useState('todos');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonthView, setCurrentMonthView] = useState<Date>(new Date());

  const handlePrevMonth = () => {
    setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(date);
      setTempEndDate(null);
    } else if (tempStartDate && !tempEndDate) {
      if (date >= tempStartDate) {
        setTempEndDate(date);
      } else {
        setTempStartDate(date);
        setTempEndDate(null);
      }
    }
  };

  const applyPreset = (preset: string) => {
    const today = new Date();
    setFilterDate(preset);
    
    if (preset === 'todos') {
      setStartDate(null);
      setEndDate(null);
      setTempStartDate(null);
      setTempEndDate(null);
    } else if (preset === 'hoy') {
      const d = new Date(today);
      setStartDate(d);
      setEndDate(d);
      setTempStartDate(d);
      setTempEndDate(d);
    } else if (preset === 'ayer') {
      const d = new Date(today);
      d.setDate(today.getDate() - 1);
      setStartDate(d);
      setEndDate(d);
      setTempStartDate(d);
      setTempEndDate(d);
    } else if (preset === 'semana') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setStartDate(start);
      setEndDate(today);
      setTempStartDate(start);
      setTempEndDate(today);
    } else if (preset === 'mes_30') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      setStartDate(start);
      setEndDate(today);
      setTempStartDate(start);
      setTempEndDate(today);
    } else if (preset === 'mes') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(start);
      setEndDate(end);
      setTempStartDate(start);
      setTempEndDate(end);
    } else if (preset === 'mes_anterior') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(start);
      setEndDate(end);
      setTempStartDate(start);
      setTempEndDate(end);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    interface DayItem {
      date: Date;
      isCurrentMonth: boolean;
    }
    const days: DayItem[] = [];
    
    const prevMonthIndex = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevMonthYear, prevMonthIndex, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const remaining = 42 - days.length;
    const nextMonthIndex = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(nextMonthYear, nextMonthIndex, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales');
      const salesData = await res.json();
      setSales(salesData.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const startRefundFlow = (saleId: string) => {
    setRefundingSaleId(saleId);
    setRefundNote('');
    setRefundPassword('');
    setRefundError(null);
    setIsConfirmingRefund(true);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingSaleId || !profile) return;
    if (!refundNote.trim()) {
      setRefundError("El motivo del reembolso es obligatorio.");
      return;
    }
    if (!refundPassword) {
      setRefundError("La clave del usuario es obligatoria.");
      return;
    }

    try {
      setRefundError(null);
      await ApiService.refundSale(refundingSaleId, refundPassword, refundNote, profile.nombre, profile.id);
      
      // Reset refund state
      setIsConfirmingRefund(false);
      setRefundNote('');
      setRefundPassword('');
      setRefundingSaleId(null);
      setSelectedSale(null); // Close main ticket details
      
      // Reload sales list
      loadSales();
    } catch (error: any) {
      setRefundError(error.message || "Error al realizar el reembolso. Verifica la clave de seguridad.");
    }
  };

  const handleCancel = async (saleId: string) => {
    if (!confirm('¿Seguro que deseas cancelar esta venta?')) return;
    try {
      await ApiService.cancelSale(saleId);
      loadSales();
    } catch (error) {
      alert("Error al cancelar");
    }
  };

  const filteredSales = sales.filter(s => {
    // 1. Search filter (tickets, products name, payment method, cashier)
    const normalizedSearch = search.toLowerCase();
    const matchesSearch = 
      s.codigo_recibo.toLowerCase().includes(normalizedSearch) ||
      (s.metodo_pago && s.metodo_pago.toLowerCase().includes(normalizedSearch)) ||
      ((s as any).usuario_nombre && (s as any).usuario_nombre.toLowerCase().includes(normalizedSearch)) ||
      (s.items && s.items.some((item: any) => item.nombre?.toLowerCase().includes(normalizedSearch)));

    // 2. Payment Method filter
    const matchesMetodo = filterMetodo === 'todos' || s.metodo_pago === filterMetodo;

    // 3. Date filter
    let matchesDate = true;
    if (startDate || endDate) {
      const saleDate = new Date(s.fecha);
      
      const startOfDay = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy.getTime();
      };
      
      const endOfDay = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(23, 59, 59, 999);
        return copy.getTime();
      };

      const saleTime = saleDate.getTime();

      if (startDate && endDate) {
        matchesDate = saleTime >= startOfDay(startDate) && saleTime <= endOfDay(endDate);
      } else if (startDate) {
        matchesDate = saleTime >= startOfDay(startDate);
      } else if (endDate) {
        matchesDate = saleTime <= endOfDay(endDate);
      }
    }

    return matchesSearch && matchesMetodo && matchesDate;
  });

  // Calculate dynamic stats based on filtered selection
  const totalVentasValidas = filteredSales.filter(s => s.estado === 'completada');
  const sumTotalVentas = totalVentasValidas.reduce((sum, s) => sum + s.total, 0);
  const totalTickets = filteredSales.length;
  const ticketPromedio = totalVentasValidas.length > 0 ? sumTotalVentas / totalVentasValidas.length : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Histórico de Ventas</h1>
          <p className="text-gray-500 font-medium font-sans">
            Consulta facturas antiguas, busca por código de ticket o productos vendidos, y gestiona reembolsos.
          </p>
        </div>
      </div>

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto Total Filtrado</span>
            <span className="text-3xl font-black text-gray-950 font-mono">{formatCurrency(sumTotalVentas)}</span>
          </div>
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold font-mono">RD$</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total de Facturas</span>
            <span className="text-3xl font-black text-gray-950 font-mono">{totalTickets}</span>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ticket Promedio</span>
            <span className="text-3xl font-black text-gray-950 font-mono">{formatCurrency(ticketPromedio)}</span>
          </div>
          <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-lg font-black font-sans">Avg</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
              type="text" 
              placeholder="Buscar por ticket, producto vendido o cajero..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Payment Method Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Metodo:</span>
              <select
                value={filterMetodo}
                onChange={e => setFilterMetodo(e.target.value)}
                className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl py-2 px-3 text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="todos">Todos los métodos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                <option value="Transferencia">Transferencia Bancaria</option>
              </select>
            </div>

            {/* Range Calendar Picker Wrapper */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Fecha:</span>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-100 text-xs font-bold rounded-xl py-2 px-4 text-gray-750 outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center gap-2 transition-all shadow-sm"
                >
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>
                    {filterDate === 'todos' && 'Cualquier fecha'}
                    {filterDate === 'hoy' && 'Hoy'}
                    {filterDate === 'ayer' && 'Ayer'}
                    {filterDate === 'semana' && 'Últimos 7 días'}
                    {filterDate === 'mes_30' && 'Últimos 30 días'}
                    {filterDate === 'mes' && 'Este mes'}
                    {filterDate === 'mes_anterior' && 'Mes anterior'}
                    {filterDate === 'personalizado' && startDate && endDate && (
                      `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`
                    )}
                    {filterDate === 'personalizado' && startDate && !endDate && (
                      `Desde ${format(startDate, 'dd/MM/yyyy')}...`
                    )}
                  </span>
                </button>
              </div>

              {/* Popover Card */}
              <AnimatePresence>
                {isCalendarOpen && (
                  <>
                    {/* Background overlay click-off handler */}
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsCalendarOpen(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-[540px] max-w-[92vw] sm:max-w-none bg-white border border-gray-150 rounded-[2rem] shadow-2xl p-5 z-[110] flex flex-col md:flex-row gap-5 font-sans divide-y md:divide-y-0 md:divide-x divide-gray-100"
                    >
                      {/* Presets Sidebar List */}
                      <div className="w-full md:w-44 shrink-0 flex flex-col gap-1 pb-4 md:pb-0 md:pr-4">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2.5 mb-2 block">Atajos</span>
                        {[
                          { id: 'todos', label: 'Cualquier fecha' },
                          { id: 'hoy', label: 'Hoy' },
                          { id: 'ayer', label: 'Ayer' },
                          { id: 'semana', label: 'Últimos 7 días' },
                          { id: 'mes_30', label: 'Últimos 30 días' },
                          { id: 'mes', label: 'Este mes' },
                          { id: 'mes_anterior', label: 'Mes anterior' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              applyPreset(p.id);
                              if (p.id !== 'personalizado') {
                                setIsCalendarOpen(false);
                              }
                            }}
                            className={cn(
                              "w-full text-left py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                              filterDate === p.id 
                                ? "bg-blue-50 text-blue-700" 
                                : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <span>{p.label}</span>
                            {filterDate === p.id && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                          </button>
                        ))}
                      </div>

                      {/* Dynamic monthly grid calendar */}
                      <div className="flex-1 pt-4 md:pt-0 md:pl-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                          >
                            <ChevronLeft className="h-4.5 w-4.5" />
                          </button>
                          
                          <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                            {format(currentMonthView, 'MMMM yyyy', { locale: es })}
                          </span>

                          <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                          >
                            <ChevronRight className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        {/* Calendar Header Day abbreviations */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 lg:tracking-wider pb-1 border-b border-gray-50">
                          {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day) => (
                            <div key={day} className="py-1">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Grid cells */}
                        <div className="grid grid-cols-7 gap-1 select-none">
                          {getDaysInMonth(currentMonthView).map(({ date, isCurrentMonth }, idx) => {
                            const isSelectedStart = tempStartDate && date.toDateString() === tempStartDate.toDateString();
                            const isSelectedEnd = tempEndDate && date.toDateString() === tempEndDate.toDateString();
                            const isInRange = tempStartDate && tempEndDate && date > tempStartDate && date < tempEndDate;

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleDayClick(date)}
                                className={cn(
                                  "h-8 text-center text-xs font-bold transition-all relative flex items-center justify-center rounded-lg",
                                  !isCurrentMonth ? "text-gray-200 pointer-events-none" : "text-gray-700",
                                  isInRange && "bg-blue-50/70 text-blue-800 rounded-none",
                                  isSelectedStart && "bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 z-10 font-black shadow-md shadow-blue-500/10",
                                  isSelectedEnd && "bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 z-10 font-black shadow-md shadow-blue-500/10",
                                  !isSelectedStart && !isSelectedEnd && !isInRange && isCurrentMonth && "hover:bg-gray-100"
                                )}
                              >
                                <span>{date.getDate()}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Actions & info display */}
                        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Rango: {tempStartDate ? (
                              <span className="text-blue-700 font-black">
                                {format(tempStartDate, 'dd/MM/yyyy')} {tempEndDate ? `al ${format(tempEndDate, 'dd/MM/yyyy')}` : '...'}
                              </span>
                            ) : (
                              'Selecciona fechas'
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                applyPreset('todos');
                                setIsCalendarOpen(false);
                              }}
                              className="px-2.5 py-1.5 text-red-500 hover:bg-red-50 font-black rounded-lg text-[9px] uppercase tracking-wider"
                            >
                              Limpiar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (tempStartDate) {
                                  setStartDate(tempStartDate);
                                  setEndDate(tempEndDate || tempStartDate);
                                  setFilterDate('personalizado');
                                }
                                setIsCalendarOpen(false);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider shadow-sm transition-all"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table Board */}
      <div id="sales-list-view" className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Código, Fecha y Productos</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Método y Cajero</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)}
                  className="hover:bg-gray-50 transition-all duration-150 cursor-pointer"
                  title="Toca para ver todo lo que compró, quién atendió y la hora"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900">#{sale.codigo_recibo}</p>
                        <p className="text-[10px] font-bold text-gray-400">
                          <ClickableDate date={sale.fecha} className="text-[10px] text-gray-400 font-bold" />
                        </p>
                        
                        {/* Display Products Sold directly in the list to avoid empty spaces */}
                        {sale.items && sale.items.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 max-w-sm md:max-w-xl">
                            {sale.items.map((item: any, i: number) => (
                              <span key={i} className="bg-gray-100 text-gray-700 text-[9px] font-black px-1.5 py-0.5 rounded-md truncate uppercase">
                                {item.cantidad} {item.unidad_venta?.toLowerCase() || 'ud'}(s) x {item.nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-650 bg-gray-100 px-3 py-1 rounded-full">{sale.metodo_pago}</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 font-bold ml-1">
                      <User className="h-3 w-3 text-gray-400" />
                      <span>{(sale as any).usuario_nombre || 'Cajero de turno'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-gray-900 font-mono text-lg">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      sale.estado === 'completada' ? "bg-emerald-100 text-emerald-700" :
                      sale.estado === 'cancelada' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {sale.estado}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedSale(sale)}
                        title="Ver Detalles Completos del Ticket"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      >
                        <Eye className="h-5 w-5" />
                      </button>

                      <button 
                        onClick={() => printReceipt(sale)}
                        title="Reimprimir Recibo"
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                      
                      {sale.estado === 'completada' && (
                        <>
                          <button 
                            onClick={() => startRefundFlow(sale.id)}
                            title="Reembolsar"
                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                          {profile?.rol === UserRole.ADMIN && (
                            <button 
                              onClick={() => handleCancel(sale.id)}
                              title="Cancelar"
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300">
                      <Receipt className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-lg font-black uppercase tracking-tighter text-gray-450 mb-1">No hay ventas registradas</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ajusta los filtros o escribe otro término para buscar</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle de Ticket Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSale(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 p-8 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-none">Detalles del Ticket</h2>
                    <p className="text-sm font-bold text-gray-400 mt-1">Código: <span className="text-gray-900 font-mono">#{selectedSale.codigo_recibo}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="p-3 bg-white hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all text-gray-400 hover:text-gray-900 shadow-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto space-y-6">
                {/* Info Cards (Who & When) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cajero / Empleado */}
                  <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Cajero de turno</p>
                      <p className="text-base font-black text-gray-900">{(selectedSale as any).usuario_nombre || 'Desconocido'}</p>
                    </div>
                  </div>

                  {/* Hora y Fecha */}
                  <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-4">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Fecha y Hora</p>
                      <p className="text-sm font-black text-gray-900">
                        {selectedSale.fecha ? format(new Date(selectedSale.fecha), "d 'de' MMMM, yyyy - h:mm a", { locale: es }) : '---'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status & Payment Method */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2 bg-slate-50 border border-gray-100 rounded-xl flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Estado:</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      selectedSale.estado === 'completada' ? "bg-emerald-100 text-emerald-700" :
                      selectedSale.estado === 'cancelada' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedSale.estado}
                    </span>
                  </div>

                  <div className="px-4 py-2 bg-slate-50 border border-gray-100 rounded-xl flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Método de pago:</span>
                    <span className="text-xs font-black text-gray-900">{selectedSale.metodo_pago}</span>
                  </div>

                  {selectedSale.turno_id && (
                    <div className="px-4 py-2 bg-slate-50 border border-gray-100 rounded-xl flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">ID Turno Caja:</span>
                      <span className="text-xs font-mono font-bold text-gray-900">{selectedSale.turno_id.replace('shift-', '#')}</span>
                    </div>
                  )}
                </div>

                {/* GPS metadata of the transaction */}
                {selectedSale.metadata && (selectedSale.metadata as any).lat && (
                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Coordenadas de la Venta (GPS)</p>
                        <p className="text-xs font-mono font-bold text-gray-800">
                          Lat: {parseFloat((selectedSale.metadata as any).lat).toFixed(6)}, Lng: {parseFloat((selectedSale.metadata as any).lng).toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${(selectedSale.metadata as any).lat},${(selectedSale.metadata as any).lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Ver en Google Maps
                    </a>
                  </div>
                )}

                {/* Refund Motivo / Reason block */}
                {selectedSale.estado === 'reembolsada' && (selectedSale as any).motivo_reembolso && (
                  <div className="p-5 bg-amber-50 border border-amber-200/80 rounded-2xl flex flex-col gap-2 font-sans">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 leading-none">Motivo del Reembolso</span>
                    </div>
                    <p className="text-sm font-semibold text-amber-900 bg-white p-3.5 rounded-xl border border-amber-200/40 shadow-sm leading-relaxed">
                      {(selectedSale as any).motivo_reembolso}
                    </p>
                    {(selectedSale as any).reembolsado_por && (
                      <p className="text-[10px] font-bold text-amber-700/80 leading-none text-right">
                        Autorizado por: <span className="font-extrabold text-amber-900">{(selectedSale as any).reembolsado_por}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Products Purchased List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Artículos Comprados</h3>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Artículo</th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cant.</th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Precio</th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(selectedSale as any).items?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-black text-gray-900">{item.nombre || 'Producto Desconocido'}</p>
                              {item.unidad_venta && (
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.unidad_venta}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-black text-gray-900">
                              {item.cantidad}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-500 font-mono">
                              {formatCurrency(item.precio_unitario || item.precio_venta)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-black text-gray-900 font-mono">
                              {formatCurrency(item.total_linea || ((item.precio_unitario || item.precio_venta) * item.cantidad))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary Breakdown */}
                <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.descuento > 0 && (
                    <div className="flex justify-between text-sm font-bold text-red-500">
                      <span>Descuento</span>
                      <span className="font-mono">-{formatCurrency(selectedSale.descuento)}</span>
                    </div>
                  )}
                  {selectedSale.impuesto > 0 && (
                    <div className="flex justify-between text-sm font-bold text-gray-500">
                      <span>Impuestos / ITBIS</span>
                      <span className="font-mono">{formatCurrency(selectedSale.impuesto)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-gray-900">TOTAL COBRADO</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(selectedSale.total)}</span>
                  </div>

                  {/* Received & Change Info */}
                  {selectedSale.monto_recibido !== undefined && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div className="p-3 bg-white rounded-xl border border-gray-100">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Efectivo Recibido</span>
                        <span className="text-sm font-black text-gray-800 font-mono">{formatCurrency(selectedSale.monto_recibido || selectedSale.total)}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-gray-100">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Cambio Devolución</span>
                        <span className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(selectedSale.cambio || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 border-t border-gray-100 p-8 flex flex-col sm:flex-row gap-3 shrink-0">
                <button 
                  onClick={() => {
                    printReceipt(selectedSale);
                  }}
                  className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <Printer className="h-5 w-5" />
                  Volver a imprimir ticket
                </button>

                {selectedSale.estado === 'completada' && (
                  <>
                    <button 
                      onClick={() => {
                        startRefundFlow(selectedSale.id);
                      }}
                      className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Reembolsar
                    </button>

                    {profile?.rol === UserRole.ADMIN && (
                      <button 
                        onClick={() => {
                          handleCancel(selectedSale.id);
                          setSelectedSale(null);
                        }}
                        className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Trash2 className="h-5 w-5" />
                        Anular
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refund Confirmation Security Modal */}
      <AnimatePresence>
        {isConfirmingRefund && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl border border-gray-100 space-y-6 z-50 font-sans"
            >
              <div className="text-center">
                <div className="h-16 w-16 bg-amber-100/80 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Confirmar Reembolso</h3>
                <p className="text-gray-500 font-medium text-xs mt-1">
                  Se devolverá el inventario de esta venta y se restará el monto total de la caja del turno activo.
                </p>
              </div>

              {refundError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold flex items-start gap-2.5">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-500" />
                  <span>{refundError}</span>
                </div>
              )}

              <form onSubmit={handleRefundSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Motivo del Reembolso (Obligatorio)</label>
                  <textarea
                    required
                    rows={2}
                    value={refundNote}
                    onChange={e => setRefundNote(e.target.value)}
                    placeholder="Ej. Artículos defectuosos, cambio de producto, cobro erróneo..."
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none font-bold text-sm text-gray-800 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Clave de Seguridad (Contraseña)</label>
                  <input
                    required
                    type="password"
                    value={refundPassword}
                    onChange={e => setRefundPassword(e.target.value)}
                    placeholder="Introduce tu clave de empleado o dueño"
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none font-black text-center tracking-widest font-mono text-gray-800 placeholder-tracking-normal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsConfirmingRefund(false);
                      setRefundError(null);
                    }}
                    className="py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 active:scale-95 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="py-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-100"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
