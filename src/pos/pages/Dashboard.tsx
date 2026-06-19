import React, { useState, useEffect } from 'react';
import { ApiService, isPracticeModeActive } from '../services/api';
import { formatCurrency } from '../lib/utils';
import { DollarSign, ShoppingBag, Package, AlertCircle, History, Minus, CheckCircle2, TrendingUp, TrendingDown, Receipt, Wallet, Truck, Banknote, Search, Eye, X, Printer, RotateCcw, Trash2, User, Clock, Loader2, ShieldCheck, Calendar, ChevronLeft, ChevronRight, MapPin, FileText, RefreshCw, Bell, CreditCard, ChevronDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { printReceipt } from '../lib/printReceipt';
import MapConfig from '../components/MapConfig';
import ClickableDate from '../components/ClickableDate';
import { DENOMINATIONS } from '../constants/denominations';

import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { profile } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({
    todaySales: 0,
    totalSalesCount: 0,
    lowStock: 0,
    profitStats: {
      totalVendido: 0,
      totalCostoVentas: 0,
      totalGastos: 0,
      gananciaBruta: 0,
      gananciaNeta: 0
    },
    fiadoStats: {
      totalFiado: 0,
      count: 0,
      history: [],
      totalPendienteGlobal: 0
    }
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockProductsList, setLowStockProductsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ventas' | 'gastos' | 'inversiones' | 'cuadres' | 'config' | 'fiado'>('ventas');
  const [expandedFiadoId, setExpandedFiadoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  // States for cash shifts verification and dynamic camera audit matching
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
  const [selectedShiftMovements, setSelectedShiftMovements] = useState<any[]>([]);
  const [selectedShiftSales, setSelectedShiftSales] = useState<any[]>([]);
  const [loadingShiftDetails, setLoadingShiftDetails] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Calendar states
  const initToday = new Date();
  const [filterDate, setFilterDate] = useState<string>('mes');
  const [startDate, setStartDate] = useState<Date | null>(new Date(initToday.getFullYear(), initToday.getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date(initToday.getFullYear(), initToday.getMonth() + 1, 0));
  const [tempStartDate, setTempStartDate] = useState<Date | null>(new Date(initToday.getFullYear(), initToday.getMonth(), 1));
  const [tempEndDate, setTempEndDate] = useState<Date | null>(new Date(initToday.getFullYear(), initToday.getMonth() + 1, 0));
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
    const todayVal = new Date();
    setFilterDate(preset);
    
    if (preset === 'todos') {
      setStartDate(null);
      setEndDate(null);
      setTempStartDate(null);
      setTempEndDate(null);
    } else if (preset === 'hoy') {
      const d = new Date(todayVal);
      setStartDate(d);
      setEndDate(d);
      setTempStartDate(d);
      setTempEndDate(d);
    } else if (preset === 'ayer') {
      const d = new Date(todayVal);
      d.setDate(todayVal.getDate() - 1);
      setStartDate(d);
      setEndDate(d);
      setTempStartDate(d);
      setTempEndDate(d);
    } else if (preset === 'semana') {
      const start = new Date(todayVal);
      start.setDate(todayVal.getDate() - 6);
      setStartDate(start);
      setEndDate(todayVal);
      setTempStartDate(start);
      setTempEndDate(todayVal);
    } else if (preset === 'mes_30') {
      const start = new Date(todayVal);
      start.setDate(todayVal.getDate() - 29);
      setStartDate(start);
      setEndDate(todayVal);
      setTempStartDate(start);
      setTempEndDate(todayVal);
    } else if (preset === 'mes') {
      const start = new Date(todayVal.getFullYear(), todayVal.getMonth(), 1);
      const end = new Date(todayVal.getFullYear(), todayVal.getMonth() + 1, 0);
      setStartDate(start);
      setEndDate(end);
      setTempStartDate(start);
      setTempEndDate(end);
    } else if (preset === 'mes_anterior') {
      const start = new Date(todayVal.getFullYear(), todayVal.getMonth() - 1, 1);
      const end = new Date(todayVal.getFullYear(), todayVal.getMonth(), 0);
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
    loadStats();
  }, [startDate, endDate]);

  // Load shift details (movements and sales) for the timeline chronology
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
        console.error("Error loading shift details in dashboard:", err);
      }).finally(() => {
        setLoadingShiftDetails(false);
      });
    } else {
      setSelectedShiftMovements([]);
      setSelectedShiftSales([]);
    }
  }, [selectedShift]);

  const loadStats = async () => {
    try {
      const data = await ApiService.getStats(
        -1,
        -1,
        startDate ? startDate.toISOString() : null,
        endDate ? endDate.toISOString() : null
      );
      setStats(data);

      if (data.weeklyData) {
        const formattedData = data.weeklyData.map((d: any) => ({
          name: d.day,
          sales: d.ventas,
          profit: d.ganancia
        }));
        setChartData(formattedData);
      }

      // Load shifts for dashboard Cuadres de Caja tab
      const shiftsData = await ApiService.getAllShifts();
      setShifts(shiftsData || []);

      // Calculate top selling products from all sales
      try {
        const salesRes = await fetch('/api/sales');
        if (salesRes.ok) {
          const allSales = await salesRes.json();
          const activeSales = isPracticeModeActive()
            ? JSON.parse(localStorage.getItem('v_sim_sales') || '[]')
            : allSales;

          const filteredRangeSales = activeSales.filter((s: any) => {
            if (s.estado === 'cancelada' || s.estado === 'reembolsada') return false;
            const sDate = new Date(s.fecha || s.fecha_creacion);
            if (startDate && sDate < startDate) return false;
            // DAT-004 FIX: Set end of day to include all sales on the last selected day
            if (endDate) {
              const endOfDay = new Date(endDate);
              endOfDay.setHours(23, 59, 59, 999);
              if (sDate > endOfDay) return false;
            }
            return true;
          });

          const productQuantities: Record<string, { nombre: string, cantidad: number, total: number }> = {};
          
          filteredRangeSales.forEach((sale: any) => {
            if (Array.isArray(sale.items)) {
              sale.items.forEach((item: any) => {
                const pId = item.producto_id || item.nombre;
                if (!productQuantities[pId]) {
                  productQuantities[pId] = { nombre: item.nombre, cantidad: 0, total: 0 };
                }
                productQuantities[pId].cantidad += item.cantidad || 0;
                productQuantities[pId].total += item.total_linea || (item.cantidad * item.precio_unitario) || 0;
              });
            }
          });
          
          const topProductsList = Object.values(productQuantities)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
            
          setTopProducts(topProductsList);
        }
      } catch (err) {
        console.error("Error calculating top products in Dashboard:", err);
      }

      // Fetch products for low stock items display
      try {
        const products = await ApiService.getProducts();
        if (Array.isArray(products)) {
          const lowStockList = products.filter((p: any) => p.estado === 'activo' && p.cantidad_disponible < p.stock_minimo);
          setLowStockProductsList(lowStockList);
        }
      } catch (err) {
        console.error("Error loading products for critical stock in Dashboard:", err);
      }

    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleDownloadJSONBackup = () => {
    if (isPracticeModeActive()) {
      // Gather all simulated keys
      const backupObj: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('v_sim_')) {
          try {
            backupObj[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            backupObj[key] = localStorage.getItem(key);
          }
        }
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `vuttik_simulador_respaldo_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      // Production mode: download actual db.json
      window.location.href = '/api/backup/download';
    }
  };

  const handleExportSalesCSV = async () => {
    try {
      const res = await fetch('/api/sales');
      const sales = await res.ok ? await res.json() : [];
      const activeSales = isPracticeModeActive() 
        ? JSON.parse(localStorage.getItem('v_sim_sales') || '[]')
        : sales;
        
      let csvContent = "Código de Recibo,Fecha,Método de Pago,Subtotal,Impuesto,Total,Estado\n";
      activeSales.forEach((s: any) => {
        csvContent += `"${s.codigo_recibo || s.id}","${new Date(s.fecha || s.fecha_creacion).toLocaleString("es-ES")}","${s.metodo_pago}",${s.subtotal},${s.impuesto},${s.total},"${s.estado}"\n`;
      });
      
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `vuttik_ventas_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Error exporting sales to CSV:", e);
    }
  };

  const handleExportInventoryCSV = async () => {
    try {
      const products = await ApiService.getProducts();
      let csvContent = "Código de Barra,Nombre,Categoría,Marca,Costo Compra,Precio Venta,Stock Disponible,Stock Mínimo,Unidad,Estado\n";
      products.forEach((p: any) => {
        csvContent += `"${p.codigo_barra}","${p.nombre}","${p.categoria}","${p.marca}",${p.costo_compra},${p.precio_venta},${p.cantidad_disponible},${p.stock_minimo},"${p.unidad_venta}","${p.estado}"\n`;
      });
      
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `vuttik_inventario_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Error exporting inventory to CSV:", e);
    }
  };

  const handleSelectSale = async (saleId: string) => {
    setLoadingSale(true);
    try {
      const res = await fetch(`/api/sales`);
      const allSales = await res.json();
      const found = allSales.find((s: any) => s.id === saleId);
      if (found) {
        setSelectedSaleDetail(found);
      } else {
        alert("No se encontró la información completa de esta venta.");
      }
    } catch (e) {
      console.error("Error fetching sale details:", e);
      alert("Error al cargar los detalles.");
    } finally {
      setLoadingSale(false);
    }
  };

  const handleRefund = async (saleId: string) => {
    if (!confirm('¿Seguro que deseas reembolsar esta venta? Esto devolverá el stock y restará el total de la caja.')) return;
    try {
      await ApiService.refundSale(saleId);
      setSelectedSaleDetail(null);
      loadStats();
    } catch (error) {
      alert("Error al reembolsar");
    }
  };

  const handleCancel = async (saleId: string) => {
    if (!confirm('¿Seguro que deseas cancelar esta venta?')) return;
    try {
      await ApiService.cancelSale(saleId);
      setSelectedSaleDetail(null);
      loadStats();
    } catch (error) {
      alert("Error al cancelar");
    }
  };

  const filteredSales = (stats.details?.sales || []).filter((sale: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const ticketShort = sale.id.slice(-6).toLowerCase();
    const cleanQuery = query.startsWith('#') ? query.slice(1) : query;
    
    return (
      sale.cliente.toLowerCase().includes(query) ||
      ticketShort.includes(cleanQuery) ||
      sale.id.toLowerCase().includes(query)
    );
  });

  const filteredExpenses = (stats.details?.expenses || []).filter((expense: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      expense.descripcion.toLowerCase().includes(query) ||
      expense.categoria.toLowerCase().includes(query)
    );
  });

  const filteredInvestments = (stats.details?.investments || []).filter((inv: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      inv.producto_nombre.toLowerCase().includes(query)
    );
  });

  const filteredShifts = (shifts || []).filter((shift: any) => {
    const date = new Date(shift.fecha_apertura);
    
    if (startDate || endDate) {
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
      
      const shiftTime = date.getTime();
      if (startDate && endDate) {
        if (shiftTime < startOfDay(startDate) || shiftTime > endOfDay(endDate)) return false;
      } else if (startDate) {
        if (shiftTime < startOfDay(startDate)) return false;
      } else if (endDate) {
        if (shiftTime > endOfDay(endDate)) return false;
      }
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      shift.usuario_nombre.toLowerCase().includes(query) ||
      shift.estado.toLowerCase().includes(query) ||
      (shift.id && shift.id.toLowerCase().includes(query))
    );
  });

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = [2024, 2025, 2026];

  const cards = [
    { 
      id: 'cobrado',
      title: 'Dinero Cobrado Hoy', 
      value: formatCurrency(stats?.todaySales || 0), 
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      description: `${stats?.totalSalesCount || 0} clientes atendidos hoy`,
      borderColor: 'border-emerald-100'
    },
    { 
      id: 'ganancia',
      title: 'Ganancia Limpia (Tu Dinero)', 
      value: formatCurrency(stats?.profitStats?.gananciaNeta || 0), 
      icon: Banknote, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-50/50', 
      description: 'Solo ventas cobradas. Lo fiado no está aquí hasta que paguen.',
      borderColor: 'border-emerald-500/20'
    },
    { 
      id: 'faltante',
      title: 'Falta Comprar (Stock Bajo)', 
      value: stats?.lowStock || 0, 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50', 
      description: 'Productos que se están agotando',
      borderColor: 'border-red-100'
    },
    { 
      id: 'gastos',
      title: 'Gastos del Mes (Salidas)', 
      value: formatCurrency(stats?.profitStats?.totalGastos || 0), 
      icon: Wallet, 
      color: 'text-gray-600', 
      bg: 'bg-surface', 
      description: 'Luz, renta, wifi, sueldos, compras registradas',
      borderColor: 'border-gray-200'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-vuttik-navy tracking-tight">Resumen de mi Negocio</h1>
          <p className="text-on-surface-variant font-medium">Aquí puedes ver cuánto dinero has cobrado, tus gastos, y la ganancia real que te queda libre.</p>
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-3xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-surface font-label-md font-black text-gray-700 rounded-2xl transition-all"
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

          <AnimatePresence>
            {isCalendarOpen && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsCalendarOpen(false)} />
                
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-[540px] max-w-[92vw] sm:max-w-none bg-surface-container-lowest border border-gray-155 rounded-[2rem] shadow-2xl p-5 z-[110] flex flex-col md:flex-row gap-5 font-sans divide-y md:divide-y-0 md:divide-x divide-gray-100"
                >
                  {/* Presets Sidebar List */}
                  <div className="w-full md:w-44 shrink-0 flex flex-col gap-1 pb-4 md:pb-0 md:pr-4">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2.5 mb-2 block font-sans">Atajos</span>
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
                        onClick={() => {
                          applyPreset(p.id);
                          if (p.id !== 'personalizado') {
                            setIsCalendarOpen(false);
                          }
                        }}
                        className={cn(
                          "w-full text-left py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between font-sans",
                          filterDate === p.id 
                            ? "bg-blue-50 text-blue-700" 
                            : "text-gray-600 hover:bg-surface"
                        )}
                      >
                        <span>{p.label}</span>
                        {filterDate === p.id && <span className="h-1.5 w-1.5 rounded-full bg-vuttik-blue" />}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic monthly grid calendar */}
                  <div className="flex-1 pt-4 md:pt-0 md:pl-5 space-y-4 font-sans">
                    <div className="flex items-center justify-between font-sans">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-on-surface-variant hover:text-vuttik-navy transition-all animate-none"
                      >
                        <ChevronLeft className="h-4.5 w-4.5" />
                      </button>
                      
                      <span className="font-label-md font-black text-gray-800 uppercase tracking-wider font-sans">
                        {format(currentMonthView, 'MMMM yyyy', { locale: es })}
                      </span>

                      <button
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-on-surface-variant hover:text-vuttik-navy transition-all animate-none"
                      >
                        <ChevronRight className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {/* Calendar Header Day abbreviations */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 lg:tracking-wider pb-1 border-b border-gray-50 font-sans">
                      {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Grid cells */}
                    <div className="grid grid-cols-7 gap-1 select-none font-sans">
                      {getDaysInMonth(currentMonthView).map(({ date, isCurrentMonth }, idx) => {
                        const isSelectedStart = tempStartDate && date.toDateString() === tempStartDate.toDateString();
                        const isSelectedEnd = tempEndDate && date.toDateString() === tempEndDate.toDateString();
                        const isInRange = tempStartDate && tempEndDate && date > tempStartDate && date < tempEndDate;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleDayClick(date)}
                            className={cn(
                              "h-8 text-center text-xs font-bold transition-all relative flex items-center justify-center rounded-lg font-sans",
                              !isCurrentMonth ? "text-gray-200 pointer-events-none" : "text-gray-700",
                              isInRange && "bg-blue-50/70 text-blue-800 rounded-none",
                              isSelectedStart && "bg-vuttik-blue text-white rounded-l-lg hover:bg-blue-700 z-10 font-black shadow-pro shadow-blue-500/10",
                              isSelectedEnd && "bg-vuttik-blue text-white rounded-r-lg hover:bg-blue-700 z-10 font-black shadow-pro shadow-blue-500/10",
                              !isSelectedStart && !isSelectedEnd && !isInRange && isCurrentMonth && "hover:bg-gray-100"
                            )}
                          >
                            <span>{date.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Actions & info display */}
                    <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-sans">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-sans">
                        Rango: {tempStartDate ? (
                          <span className="text-blue-700 font-black">
                            {format(tempStartDate, 'dd/MM/yyyy')} {tempEndDate ? `al ${format(tempEndDate, 'dd/MM/yyyy')}` : '...'}
                          </span>
                        ) : (
                          'Selecciona fechas'
                        )}
                      </div>
                      
                      <div className="flex gap-2 font-sans">
                        <button
                          onClick={() => {
                            applyPreset('todos');
                            setIsCalendarOpen(false);
                          }}
                          className="px-2.5 py-1.5 text-red-500 hover:bg-red-50 font-black rounded-lg text-[9px] uppercase tracking-wider font-sans"
                        >
                          Limpiar
                        </button>
                        <button
                          onClick={() => {
                            if (tempStartDate) {
                              setStartDate(tempStartDate);
                              setEndDate(tempEndDate || tempStartDate);
                              setFilterDate('personalizado');
                            }
                            setIsCalendarOpen(false);
                          }}
                          className="px-3 py-1.5 bg-vuttik-blue hover:bg-blue-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider shadow-sm transition-all font-sans"
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

      <div id="admin-stats-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            onClick={() => setActiveModal(card.id)}
            className={cn(
              "bg-surface-container-lowest p-8 rounded-[2rem] shadow-md border border-outline-variant/20 flex flex-col gap-4 group hover:shadow-xl hover:border-primary hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden",
              card.borderColor
            )}
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-4 rounded-3xl transition-transform group-hover:rotate-12", card.bg)}>
                <card.icon className={cn("h-7 w-7", card.color)} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{card.title}</p>
              <p className={cn("text-2xl xl:text-3xl font-black tracking-tight truncate", card.color)} title={card.value as string}>{card.value}</p>
              <p className="text-xs font-bold text-gray-400 mt-2 flex items-center gap-1">
                {card.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - The "Intuitive" part */}
      <div id="admin-accesos-rapidos" className="space-y-4">
        <h3 className="text-lg font-black text-vuttik-navy tracking-tight ml-2 uppercase text-xs text-gray-400 tracking-widest">Accesos Rápidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/pos" 
            className="flex flex-col items-center justify-center p-8 bg-vuttik-blue text-white rounded-[2.5rem] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all group"
          >
            <div className="h-16 w-16 bg-surface-container-lowest/20 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <span className="font-headline-md font-black">VENDER ALGO</span>
            <span className="text-blue-100 text-xs font-medium mt-1">Hacer un cobro ahora</span>
          </Link>

          <Link 
            to="/shifts" 
            className="flex flex-col items-center justify-center p-8 bg-amber-500 text-white rounded-[2.5rem] shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all group"
          >
            <div className="h-16 w-16 bg-surface-container-lowest/20 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <History className="h-8 w-8" />
            </div>
            <span className="font-headline-md font-black">CONTROL CAJA</span>
            <span className="text-amber-50 text-xs font-medium mt-1">Ver billetes y cuadres</span>
          </Link>

          <Link 
            to="/expenses" 
            className="flex flex-col items-center justify-center p-8 bg-red-500 text-white rounded-[2.5rem] shadow-xl shadow-red-200 hover:bg-red-600 transition-all group"
          >
            <div className="h-16 w-16 bg-surface-container-lowest/20 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <DollarSign className="h-8 w-8" />
            </div>
            <span className="font-headline-md font-black">ANOTAR GASTO</span>
            <span className="text-red-50 text-xs font-medium mt-1">Luz, renta, salarios</span>
          </Link>
        </div>
      </div>

      {/* Estado de los Fondos */}
      <div className="bg-surface-container-lowest p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="mb-8">
          <h3 className="text-2xl font-black text-vuttik-navy tracking-tight">Estado de los Fondos</h3>
          <p className="text-on-surface-variant font-medium">Historial completo del dinero invertido y disponible.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => setActiveModal('caja')}
            className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl cursor-pointer hover:shadow-pro-hover hover:-translate-y-1 transition-all duration-300"
          >
            <div className="h-12 w-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-4">
              <DollarSign className="h-6 w-6" />
            </div>
            <p className="font-label-md font-black text-emerald-600 uppercase tracking-widest">Estimado en Caja</p>
            <p className="text-sm text-emerald-800 font-medium mb-3">Ventas cobradas menos gastos de caja</p>
            <div className="text-3xl font-black text-emerald-900 font-mono">
              {formatCurrency(stats?.financieroStats?.dineroEstimadoCaja || 0)}
            </div>
          </div>
          
          <div 
            onClick={() => setActiveModal('banco')}
            className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl cursor-pointer hover:shadow-pro-hover hover:-translate-y-1 transition-all duration-300"
          >
            <div className="h-12 w-12 bg-vuttik-blue text-white rounded-2xl flex items-center justify-center mb-4">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="font-label-md font-black text-vuttik-blue uppercase tracking-widest">Ido al Banco (Guardado)</p>
            <p className="text-sm text-blue-800 font-medium mb-3">Dinero enviado de la caja al banco para guardarlo</p>
            <div className="text-3xl font-black text-blue-900 font-mono">
              {formatCurrency(stats?.financieroStats?.totalIdoBanco || 0)}
            </div>
          </div>

          <div 
            onClick={() => setActiveModal('inversion')}
            className="p-6 bg-purple-50/50 border border-purple-100 rounded-3xl cursor-pointer hover:shadow-pro-hover hover:-translate-y-1 transition-all duration-300"
          >
            <div className="h-12 w-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="font-label-md font-black text-purple-600 uppercase tracking-widest">Inversión Externa</p>
            <p className="text-sm text-purple-800 font-medium mb-3">Dinero inyectado de tu propio bolsillo</p>
            <div className="text-3xl font-black text-purple-900 font-mono">
              {formatCurrency(stats?.financieroStats?.totalInversionExterna || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Improved Profit Breakdown */}
      <div id="admin-profit-breakdown" className="bg-surface-container-lowest p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-2xl font-black text-vuttik-navy tracking-tight">
              ¿Cuánto gané en {filterDate === 'mes' ? 'este mes' : filterDate === 'hoy' ? 'hoy' : filterDate === 'ayer' ? 'ayer' : 'este período'}?
            </h3>
            <p className="text-on-surface-variant font-medium">Aquí te explicamos la cuenta paso a paso.</p>
          </div>
          <div className="px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-black uppercase tracking-widest">
            Resultado Final
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Sales (cobradas only) */}
          <div className="flex items-center gap-6 p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div className="h-14 w-14 bg-vuttik-blue text-white rounded-3xl flex items-center justify-center shadow-pro-hover shadow-blue-100">
              <span className="font-headline-md font-black">1</span>
            </div>
            <div className="flex-1">
              <p className="font-label-md font-black text-vuttik-blue uppercase tracking-widest">Ventas Cobradas</p>
              <p className="text-sm text-blue-800 font-medium">Dinero que realmente te pagaron (efectivo, tarjeta, transferencia)</p>
            </div>
            <div className="text-2xl font-black text-blue-900 font-mono">
              {formatCurrency(stats.profitStats?.totalVendido || 0)}
            </div>
          </div>

          {/* Fiao block — informational, NOT subtracted from profit */}
          {(stats.fiadoStats?.totalFiado || 0) > 0 && (
            <div className="flex items-center gap-6 p-5 bg-amber-50/60 rounded-3xl border-2 border-dashed border-amber-300">
              <div className="h-14 w-14 bg-amber-400 text-white rounded-3xl flex items-center justify-center shadow-pro-hover shadow-amber-100">
                <CreditCard className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="font-label-md font-black text-amber-700 uppercase tracking-widest">Lo Fiado (pendiente de cobro)</p>
                <p className="text-sm text-amber-800 font-medium">{stats.fiadoStats?.count || 0} ventas a crédito — aún no es dinero tuyo hasta que paguen</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-amber-700 font-mono">{formatCurrency(stats.fiadoStats?.totalFiado || 0)}</div>
                <div className="text-xs text-amber-600 font-bold mt-0.5">No incluido en ganancias</div>
              </div>
            </div>
          )}

          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-gray-100 text-gray-400 p-2 rounded-full border-4 border-white shadow-sm">
              <Minus className="h-4 w-4" />
            </div>
          </div>

          {/* Step 2: Cost */}
          <div className="flex items-center gap-6 p-6 bg-orange-50/50 rounded-3xl border border-orange-100">
            <div className="h-14 w-14 bg-orange-500 text-white rounded-3xl flex items-center justify-center shadow-pro-hover shadow-orange-100">
              <span className="font-headline-md font-black">2</span>
            </div>
            <div className="flex-1">
              <p className="font-label-md font-black text-orange-600 uppercase tracking-widest">Inversión en Productos</p>
              <p className="text-sm text-orange-800 font-medium">Dinero gastado comprando mercancía este mes</p>
            </div>
            <div className="text-2xl font-black text-orange-900 font-mono">
              -{formatCurrency(stats.profitStats?.totalComprasMercancia || 0)}
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-gray-100 text-gray-400 p-2 rounded-full border-4 border-white shadow-sm">
              <Minus className="h-4 w-4" />
            </div>
          </div>

          {/* Step 3: Expenses */}
          <div className="flex items-center gap-6 p-6 bg-red-50/50 rounded-3xl border border-red-100">
            <div className="h-14 w-14 bg-red-500 text-white rounded-3xl flex items-center justify-center shadow-pro-hover shadow-red-100">
              <span className="font-headline-md font-black">3</span>
            </div>
            <div className="flex-1">
              <p className="font-label-md font-black text-red-600 uppercase tracking-widest">Otros Gastos</p>
              <p className="text-sm text-red-800 font-medium">Luz, renta, salarios y otros pagos</p>
            </div>
            <div className="text-2xl font-black text-red-900 font-mono">
              -{formatCurrency(stats.profitStats?.totalGastos || 0)}
            </div>
          </div>

          <div className="pt-8 border-t-4 border-dashed border-gray-100">
            <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-200 flex flex-col md:flex-row justify-between items-center text-white">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-surface-container-lowest text-emerald-600 rounded-3xl flex items-center justify-center shadow-xl">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <p className="font-label-md font-black text-emerald-200 uppercase tracking-widest">Tu Ganancia Limpia</p>
                  <p className="text-2xl font-black tracking-tight">DINERO LIBRE PARA TI</p>
                </div>
              </div>
              <div className="text-5xl font-black font-mono mt-4 md:mt-0">
                {formatCurrency(stats.profitStats?.gananciaNeta || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Section */}
      <div className="bg-surface-container-lowest rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden" id="movimientos-seccion">
        <div className="p-6 sm:p-8 md:p-10 border-b border-gray-50 flex flex-col space-y-6">
          <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-6">
            <div>
              <h3 className="text-2xl font-black text-vuttik-navy tracking-tight">Detalle de Movimientos</h3>
              <p className="text-on-surface-variant font-medium">Revisa registro por registro lo que pasó en {filterDate === 'mes' ? 'este mes' : filterDate === 'hoy' ? 'hoy' : filterDate === 'ayer' ? 'ayer' : 'este período'}.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 p-1 bg-surface rounded-3xl shrink-0 max-w-full">
              {[
                { id: 'ventas', label: 'Ventas', icon: Receipt },
                { id: 'fiado', label: 'Fiao', icon: CreditCard },
                { id: 'gastos', label: 'Gastos', icon: Wallet },
                { id: 'inversiones', label: 'Inversión', icon: Truck },
                { id: 'cuadres', label: 'Cuadres', icon: History },
                { id: 'config', label: 'GPS', icon: MapPin },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`admin-tab-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery(''); 
                  }}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-label-md transition-all whitespace-nowrap",
                    activeTab === tab.id 
                      ? "bg-primary text-on-primary shadow-sm" 
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-variant"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar inside Movimientos */}
          {activeTab !== 'config' && activeTab !== 'fiado' && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                type="text" 
                placeholder={
                  activeTab === 'ventas' ? "Buscar por número de ticket o cliente (ej: #0001, General)..." :
                  activeTab === 'gastos' ? "Buscar gastos por descripción o categoría..." :
                  activeTab === 'inversiones' ? "Buscar inversión por nombre de mercancía..." :
                  "Buscar cuadres por cajero o estado (ej: abierto, cerrado, aprobado)..."
                }
                className="w-full pl-12 pr-4 py-4 bg-surface border-2 border-gray-100 rounded-3xl focus:border-blue-500 focus:bg-surface-container-lowest outline-none font-bold text-sm transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        {activeTab === 'config' ? (
          <div className="p-6 sm:p-8 md:p-10 border-t border-gray-50">
            <MapConfig />
          </div>
        ) : activeTab === 'fiado' ? (
          <div className="p-6 sm:p-8 md:p-10 border-t border-gray-50">
            {/* Global outstanding summary */}
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <div className="flex-1 bg-surface-container-lowest border border-amber-200/50 rounded-[2rem] p-6 flex items-center gap-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
                <div className="h-14 w-14 bg-amber-100 text-amber-600 rounded-[1.25rem] flex items-center justify-center shadow-sm relative z-10 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                  <CreditCard className="h-7 w-7" />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Fiado (período)</p>
                  <p className="text-3xl font-black text-amber-900 font-mono mt-1">{formatCurrency(stats.fiadoStats?.totalFiado || 0)}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">{stats.fiadoStats?.count || 0} ventas a crédito en este período</p>
                </div>
              </div>
              <div className="flex-1 bg-surface-container-lowest border border-red-200/50 rounded-[2rem] p-6 flex items-center gap-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
                <div className="h-14 w-14 bg-red-100 text-red-600 rounded-[1.25rem] flex items-center justify-center shadow-sm relative z-10 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deuda Total Pendiente</p>
                  <p className="text-3xl font-black text-red-600 font-mono mt-1">{formatCurrency(stats.fiadoStats?.totalPendienteGlobal || 0)}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">Total que te deben todos los clientes ahora mismo</p>
                </div>
              </div>
            </div>

            {/* Fiao history */}
            <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-4">Historial de Créditos ({stats.fiadoStats?.history?.length || 0})</h4>
            {(stats.fiadoStats?.history?.length || 0) === 0 ? (
              <div className="text-center py-20">
                <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-gray-400 font-bold text-lg">No hay ventas fiadas en este período</p>
                <p className="text-gray-400 text-sm mt-1">Las ventas a crédito aparecerán aquí con fecha y detalle</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(stats.fiadoStats?.history || []).map((fiao: any) => (
                  <div key={fiao.id} className="bg-amber-50/60 border border-amber-200 rounded-3xl overflow-hidden">
                    <button
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-amber-100/50 transition-colors"
                      onClick={() => setExpandedFiadoId(expandedFiadoId === fiao.id ? null : fiao.id)}
                    >
                      <div className="h-10 w-10 bg-amber-400 text-white rounded-2xl flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-vuttik-navy text-sm">{fiao.cliente_nombre}</span>
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">#{fiao.codigo_recibo}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(fiao.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {' '}a las {new Date(fiao.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-on-surface-variant">{fiao.items?.length || 0} producto(s)</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-amber-700 font-mono">{formatCurrency(fiao.total)}</div>
                        <div className="text-xs text-amber-600 font-bold">pendiente</div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${expandedFiadoId === fiao.id ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedFiadoId === fiao.id && (
                      <div className="px-5 pb-5 border-t border-amber-200/60">
                        <p className="font-label-md font-black text-gray-400 uppercase tracking-widest mt-4 mb-2">Productos en esta venta</p>
                        <div className="space-y-1.5">
                          {(fiao.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-surface-container-lowest rounded-2xl px-4 py-2.5 border border-amber-100">
                              <div>
                                <span className="font-bold text-sm text-gray-800">{item.nombre}</span>
                                <span className="text-xs text-gray-400 ml-2">x{item.cantidad}</span>
                              </div>
                              <span className="font-black text-sm text-gray-700 font-mono">{formatCurrency(item.total_linea || (item.cantidad * item.precio_unitario))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Fecha
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {activeTab === 'ventas' ? 'Cliente / Ticket' : 
                   activeTab === 'gastos' ? 'Concepto del Gasto' : 
                   activeTab === 'inversiones' ? 'Mercancía / Producto Comprado' : 
                   'Cajero / Turno'}
                </th>
                
                {activeTab === 'inversiones' && (
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Cantidad Entrante
                  </th>
                )}
                
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  {activeTab === 'inversiones' ? 'Inversión Total' : 'Monto'}
                </th>
                
                {activeTab === 'ventas' && (
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ganancia Neta</th>
                )}
                {activeTab === 'cuadres' && (
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Diferencia / Resultado</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTab === 'ventas' && filteredSales.map((sale: any) => (
                <tr 
                  key={sale.id} 
                  onClick={() => handleSelectSale(sale.id)}
                  className="hover:bg-surface transition-all cursor-pointer group"
                  title="Haz clic para ver el cajero de turno, hora exacta y mercancías compradas"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-body-md font-bold text-on-surface-variant group-hover:text-vuttik-blue transition-colors">
                    <ClickableDate date={sale.fecha} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-black text-vuttik-navy flex items-center gap-2">
                          Venta a {sale.cliente}
                          <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-vuttik-blue px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            Ver Ticket
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-mono font-bold">Ticket #{sale.id.slice(-6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-vuttik-blue font-mono">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-emerald-600">+{formatCurrency(sale.ganancia)}</span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Limpio</span>
                      </div>
                      <div className="p-2 text-gray-400 group-hover:text-vuttik-blue group-hover:bg-blue-50 rounded-2xl transition-all">
                        <Eye className="h-4 w-4" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {activeTab === 'gastos' && filteredExpenses.map((expense: any) => (
                <tr key={expense.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-body-md font-bold text-on-surface-variant">
                    <ClickableDate date={expense.fecha} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-vuttik-navy">{expense.descripcion}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-2">
                      {expense.categoria}
                      {expense.pagado_desde_caja && (
                        <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider">
                          SACADO DE CAJA
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-red-600">
                    -{formatCurrency(expense.monto)}
                  </td>
                </tr>
              ))}

              {activeTab === 'inversiones' && filteredInvestments.map((inv: any, idx: number) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-body-md font-bold text-on-surface-variant">
                    <ClickableDate date={inv.fecha} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-vuttik-navy">{inv.producto_nombre}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Registro de Inventario</p>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-vuttik-navy">
                    <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded font-black text-[10px]">
                      +{inv.cantidad} UDS
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-orange-600">
                    -{formatCurrency(inv.monto)}
                  </td>
                </tr>
              ))}

              {activeTab === 'cuadres' && filteredShifts.map((shift: any, index: number) => {
                const nextShift = filteredShifts[index - 1]; // "Next" shift temporally
                const isOpeningDiff = shift.diferencia_apertura !== undefined && shift.diferencia_apertura !== 0;
                
                return (
                <tr 
                  key={shift.id} 
                  onClick={() => setSelectedShift(shift)}
                  className="hover:bg-gray-55 transition-all cursor-pointer group"
                  title="Haz clic para abrir la auditoría con cronología y horas exactas"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-body-md font-bold text-on-surface-variant group-hover:text-vuttik-blue transition-colors">
                    <ClickableDate date={shift.fecha_apertura} />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-black text-vuttik-navy flex items-center gap-2">
                        Turno de {shift.usuario_nombre}
                        <span className="text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 px-2 py-0.2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver Cronología
                        </span>
                      </p>
                      <div className="text-[10px] text-gray-400 font-bold uppercase space-y-0.5 mt-1">
                        <p>
                          Apertura: {format(new Date(shift.fecha_apertura), 'hh:mm a')} | Inicial: <span className={isOpeningDiff ? 'text-red-600 font-black' : ''}>{formatCurrency(shift.monto_inicial)}</span>
                        </p>
                        {shift.fecha_cierre && (
                          <p>
                            Cierre: {format(new Date(shift.fecha_cierre), 'hh:mm a')} | Final: <span>{formatCurrency(shift.monto_contado)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-vuttik-navy font-mono">
                    <span>
                      {shift.monto_contado !== undefined ? formatCurrency(shift.monto_contado) : 'Sin Cerrar/Abierto'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-sm font-black",
                          shift.diferencia === 0 ? "text-emerald-600" :
                          (shift.diferencia && shift.diferencia < 0) ? "text-red-650 font-black" : "text-vuttik-blue"
                        )}>
                          {shift.diferencia === undefined ? 'Turno Abierto' : 
                          shift.diferencia === 0 ? 'Cuadre Perfecto' : 
                          `${shift.diferencia > 0 ? '+' : ''}${formatCurrency(shift.diferencia)}`
                          }
                        </span>
                        <span className="text-[10px] text-gray-450 font-bold uppercase">
                          {shift.estado}
                        </span>
                      </div>
                      <div className="p-2 text-gray-400 group-hover:text-vuttik-blue group-hover:bg-blue-50 rounded-2xl transition-all">
                        <Eye className="h-4 w-4" />
                      </div>
                    </div>
                  </td>
                </tr>
                );
              })}

              {((activeTab === 'ventas' && filteredSales.length === 0) ||
                (activeTab === 'gastos' && filteredExpenses.length === 0) ||
                (activeTab === 'inversiones' && filteredInvestments.length === 0) ||
                (activeTab === 'cuadres' && filteredShifts.length === 0)) && (
                <tr>
                  <td colSpan={activeTab === 'inversiones' ? 4 : 5} className="px-6 py-20 text-center text-gray-400 font-bold italic">
                    {searchQuery ? "No se encontraron movimientos con esa búsqueda." : "No hay registros para este mes en esta categoría."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Detalle de Ticket Modal */}
      <AnimatePresence>
        {selectedSaleDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSaleDetail(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative bg-surface-container-lowest w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-50 border-b border-gray-100 p-8 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-100 text-vuttik-blue rounded-3xl flex items-center justify-center">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-vuttik-navy leading-none">Detalles del Ticket</h2>
                    <p className="font-body-md font-bold text-gray-400 mt-1">Código: <span className="text-vuttik-navy font-mono">#{selectedSaleDetail.codigo_recibo}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSaleDetail(null)}
                  className="p-3 bg-surface-container-lowest hover:bg-gray-100 rounded-3xl border border-gray-100 transition-all text-gray-400 hover:text-vuttik-navy shadow-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto space-y-6">
                {/* Info Cards (Who & When) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cajero / Empleado */}
                  <div className="p-5 bg-surface/50 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-vuttik-blue rounded-2xl flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Cajero de turno</p>
                      <p className="text-base font-black text-vuttik-navy">{selectedSaleDetail.usuario_nombre || 'Desconocido'}</p>
                    </div>
                  </div>

                  {/* Hora y Fecha */}
                  <div className="p-5 bg-surface/50 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Fecha y Hora</p>
                      <p className="text-sm font-black text-vuttik-navy">
                        {selectedSaleDetail.fecha ? format(new Date(selectedSaleDetail.fecha), "d 'de' MMMM, yyyy - h:mm a", { locale: es }) : '---'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status & Payment Method */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2 bg-slate-50 border border-gray-100 rounded-2xl flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Estado:</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      selectedSaleDetail.estado === 'completada' ? "bg-emerald-100 text-emerald-700" :
                      selectedSaleDetail.estado === 'cancelada' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedSaleDetail.estado}
                    </span>
                  </div>

                  <div className="px-4 py-2 bg-slate-50 border border-gray-100 rounded-2xl flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Método de pago:</span>
                    <span className="font-label-md font-black text-vuttik-navy">{selectedSaleDetail.metodo_pago}</span>
                  </div>

                  {selectedSaleDetail.turno_id && (
                    <div className="px-4 py-2 bg-slate-50 border border-gray-100 rounded-2xl flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">ID Turno Caja:</span>
                      <span className="text-xs font-mono font-bold text-vuttik-navy">{selectedSaleDetail.turno_id.replace('shift-', '#')}</span>
                    </div>
                  )}
                </div>

                {/* Products Purchased List */}
                <div className="space-y-3">
                  <h3 className="font-label-md font-black text-gray-400 uppercase tracking-widest">Artículos Comprados</h3>
                  <div className="border border-gray-100 rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-55 border-b border-gray-100">
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Artículo</th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cant.</th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Precio</th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedSaleDetail.items?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-surface transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-black text-vuttik-navy">{item.nombre || 'Producto Desconocido'}</p>
                              {item.unidad_venta && (
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.unidad_venta}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-black text-vuttik-navy">
                              {item.cantidad}
                            </td>
                            <td className="px-6 py-4 text-right font-body-md font-bold text-on-surface-variant font-mono">
                              {formatCurrency(item.precio_unitario || item.precio_venta)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-black text-vuttik-navy font-mono">
                              {formatCurrency(item.total_linea || ((item.precio_unitario || item.precio_venta) * item.cantidad))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary Breakdown */}
                <div className="bg-surface/50 rounded-3xl p-6 border border-gray-100 space-y-3">
                  <div className="flex justify-between font-body-md font-bold text-on-surface-variant">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(selectedSaleDetail.subtotal)}</span>
                  </div>
                  {selectedSaleDetail.descuento > 0 && (
                    <div className="flex justify-between font-body-md font-bold text-red-500">
                      <span>Descuento</span>
                      <span className="font-mono">-{formatCurrency(selectedSaleDetail.descuento)}</span>
                    </div>
                  )}
                  {selectedSaleDetail.impuesto > 0 && (
                    <div className="flex justify-between font-body-md font-bold text-on-surface-variant">
                      <span>Impuestos / ITBIS</span>
                      <span className="font-mono">{formatCurrency(selectedSaleDetail.impuesto)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-vuttik-navy">TOTAL COBRADO</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(selectedSaleDetail.total)}</span>
                  </div>

                  {/* Received & Change Info */}
                  {selectedSaleDetail.monto_recibido !== undefined && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div className="p-3 bg-surface-container-lowest rounded-2xl border border-gray-100">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Efectivo Recibido</span>
                        <span className="text-sm font-black text-gray-800 font-mono">{formatCurrency(selectedSaleDetail.monto_recibido || selectedSaleDetail.total)}</span>
                      </div>
                      <div className="p-3 bg-surface-container-lowest rounded-2xl border border-gray-100">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Cambio Devolución</span>
                        <span className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(selectedSaleDetail.cambio || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 border-t border-gray-100 p-8 flex flex-col sm:flex-row gap-3 shrink-0">
                <button 
                  onClick={() => {
                    printReceipt(selectedSaleDetail);
                  }}
                  className="flex-1 px-6 py-4 bg-vuttik-blue hover:bg-blue-700 text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-pro-hover shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <Printer className="h-5 w-5" />
                  Volver a imprimir ticket
                </button>

                {selectedSaleDetail.estado === 'completada' && (
                  <>
                    <button 
                      onClick={() => {
                        handleRefund(selectedSaleDetail.id);
                      }}
                      className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-pro flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Reembolsar
                    </button>

                    {profile?.rol === UserRole.ADMIN && (
                      <button 
                        onClick={() => {
                          handleCancel(selectedSaleDetail.id);
                        }}
                        className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-pro flex items-center justify-center gap-2"
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

      <AnimatePresence>
        {selectedShift && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-surface-container-lowest p-8 rounded-[3rem] w-full max-w-4xl shadow-2xl my-8 flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6 shrink-0 border-b border-gray-100 pb-6">
                <div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block",
                    selectedShift.estado === 'abierto' && "bg-emerald-100 text-emerald-700",
                    selectedShift.estado === 'cerrado' && "bg-blue-100 text-blue-700",
                    selectedShift.estado === 'aprobado' && "bg-emerald-600 text-white",
                    selectedShift.estado === 'con_diferencia' && "bg-red-600 text-white"
                  )}>
                    Turno {selectedShift.estado}
                  </span>
                  <h3 className="text-3xl font-black text-vuttik-navy tracking-tight leading-tight">
                    Auditoría de Turno: {selectedShift.usuario_nombre}
                  </h3>
                  <p className="text-on-surface-variant font-medium text-sm">
                    Apertura: {format(new Date(selectedShift.fecha_apertura), "PPP 'a las' p", { locale: es })}
                    {selectedShift.fecha_cierre && ` | Cierre: ${format(new Date(selectedShift.fecha_cierre), "p", { locale: es })}`}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedShift(null);
                    setAuditSearchQuery('');
                  }} 
                  className="p-3 bg-surface hover:bg-gray-100 rounded-3xl border border-gray-100 transition-all text-gray-400 hover:text-vuttik-navy shadow-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {loadingShiftDetails ? (
                <div className="flex-1 py-10 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-10 w-10 text-vuttik-blue animate-spin" />
                  <p className="text-on-surface-variant font-black text-sm">Cargando cronología de operaciones...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-8 min-h-0">
                  {/* Financial metrics summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-surface rounded-3xl border border-gray-100">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Saldo Inicial (Cambio)</span>
                      <span className="text-lg font-black text-vuttik-navy font-mono">{formatCurrency(selectedShift.monto_inicial)}</span>
                    </div>
                    <div className="p-4 bg-surface rounded-3xl border border-gray-100">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Ventas Registradas</span>
                      <span className="text-lg font-black text-vuttik-blue font-mono">{formatCurrency(selectedShift.total_ventas)}</span>
                    </div>
                    <div className="p-4 bg-surface rounded-3xl border border-gray-100">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Movimientos Caja (+/-)</span>
                      <span className="text-lg font-black text-purple-600 font-mono">{formatCurrency(selectedShift.total_entradas - selectedShift.total_salidas)}</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-3xl border",
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
                  <div className="bg-slate-900 p-6 rounded-3xl text-white grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          <p className="font-body-md font-bold text-slate-300">
                            {selectedShift.motivo_diferencia || 'Fórmula: Inicial + Ventas Efectivo + Entradas - Salidas. Sin novedades.'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cash breakdown denominations reported */}
                  {selectedShift.desglose_denominaciones && (
                    <div className="space-y-3">
                      <h4 className="font-label-md font-black text-gray-400 uppercase tracking-widest">Desglose Físico de Efectivo Reportado</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {DENOMINATIONS.map(d => {
                          const qty = selectedShift.desglose_denominaciones?.[d.key as any] || 0;
                          if (qty === 0) return null;
                          return (
                            <div key={d.key} className="p-3 bg-surface border border-gray-100 rounded-2xl text-center">
                              <span className="block text-[10px] text-gray-400 font-bold uppercase">{d.label}</span>
                              <span className="text-base font-black text-vuttik-navy">{qty} uds</span>
                              <span className="block text-[9px] text-gray-400 font-mono font-semibold">({formatCurrency(qty * d.value)})</span>
                            </div>
                          );
                        })}
                        {selectedShift.desglose_denominaciones?.otros > 0 && (
                          <div className="p-3 bg-surface border border-gray-100 rounded-2xl text-center col-span-2 sm:col-span-1">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase">Otros Centavos</span>
                            <span className="text-base font-black text-vuttik-navy">{formatCurrency(selectedShift.desglose_denominaciones.otros)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chronology & Auditing Line Timeline list */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="text-lg font-black text-vuttik-navy tracking-tight">Línea de Tiempo de Operaciones (Auditoría de Caja)</h4>
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
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-surface rounded-2xl focus:bg-surface-container-lowest outline-none font-bold text-xs transition-all"
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
                          color: 'bg-blue-50 border-2 border-blue-500 text-vuttik-blue',
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
                              <div className={cn(
                                "absolute -left-[35px] top-1.5 h-7 w-7 rounded-lg flex items-center justify-center shadow-sm z-10 transition-transform group-hover/item:scale-110",
                                ev.color
                              )}>
                                <IconComp className="h-4 w-4" />
                              </div>

                              <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="font-black text-vuttik-navy text-sm leading-tight">{ev.titulo}</h5>
                                    {ev.subt && (
                                      <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-105 text-yellow-800 rounded font-black text-[9px] uppercase tracking-wider">
                                        {ev.subt}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono font-black text-vuttik-navy shrink-0 bg-surface px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                                    {ev.montoStr}
                                  </span>
                                </div>
                                <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-3xl">{ev.descripcion}</p>
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
                  className="px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-pro-hover"
                >
                  Entendido / Cerrar Auditoría
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Sale Detail overlay */}
      {loadingSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-2xl border border-gray-100 flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-vuttik-blue" />
            <span className="font-black text-vuttik-navy text-sm">Cargando detalles de venta...</span>
          </div>
        </div>
      )}

      {/* 1. Centro de Alertas de Inventario Crítico */}
      {lowStockProductsList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/15 to-orange-500/10 border border-amber-500/25 p-6 rounded-[2rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 animate-pulse mb-8">
          <div className="flex items-center gap-4 text-left">
            <div className="bg-amber-500/20 p-3.5 rounded-3xl text-amber-500 border border-amber-500/20 shrink-0">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">¡Alerta de Inventario Crítico!</h4>
              <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed max-w-2xl">
                Tienes {lowStockProductsList.length} producto(s) por debajo del stock mínimo: {lowStockProductsList.slice(0, 3).map(p => `${p.nombre} (${p.cantidad_disponible} left)`).join(', ')}{lowStockProductsList.length > 3 ? '...' : ''}.
              </p>
            </div>
          </div>
          <Link 
            to="/inventory"
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-3xl transition-all shadow-pro-hover shadow-amber-950/20 shrink-0 hover:-translate-y-0.5"
          >
            Reabastecer Ahora
          </Link>
        </div>
      )}

      {/* 2. Visual Analytics Section (Pure CSS/SVG Curves & Gauges) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* SVG Line Chart: Ventas del Mes */}
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-pro border border-gray-150 flex flex-col justify-between">
          <div>
            <h3 className="font-headline-md font-black text-vuttik-navy tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-vuttik-blue" />
              Tendencia de Ventas (Rango Seleccionado)
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Evolución de las ventas totales registradas en el periodo</p>
          </div>
          
          <div className="my-6">
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 font-bold italic border border-dashed border-gray-100 rounded-3xl bg-slate-50/50">
                Sin datos de ventas en este periodo
              </div>
            ) : (() => {
              const salesValues = chartData.map(d => d.sales || 0);
              const maxSales = Math.max(...salesValues, 1000);
              const chartHeight = 180;
              const chartWidth = 500;
              
              // Calculate screen coordinates
              const coords = chartData.map((d, idx) => {
                const x = (idx / Math.max(1, chartData.length - 1)) * (chartWidth - 80) + 50;
                const y = chartHeight - ((d.sales || 0) / maxSales) * (chartHeight - 40) - 20;
                return { x, y, raw: d };
              });
              
              const linePoints = coords.map(c => `${c.x},${c.y}`).join(' ');
              const areaPoints = `50,${chartHeight - 20} ${linePoints} ${coords[coords.length - 1]?.x || 450},${chartHeight - 20}`;

              return (
                <div className="relative">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto max-h-[220px]">
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Gridlines */}
                    <line x1="50" y1="20" x2={chartWidth - 30} y2="20" stroke="#f1f5f9" strokeDasharray="3" />
                    <line x1="50" y1="70" x2={chartWidth - 30} y2="70" stroke="#f1f5f9" strokeDasharray="3" />
                    <line x1="50" y1="120" x2={chartWidth - 30} y2="120" stroke="#f1f5f9" strokeDasharray="3" />
                    <line x1="50" y1="160" x2={chartWidth - 30} y2="160" stroke="#cbd5e1" strokeWidth="1.5" />
                    
                    {/* Area fill */}
                    <polygon points={areaPoints} fill="url(#salesGradient)" />
                    
                    {/* Line */}
                    <polyline points={linePoints} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Points dots */}
                    {coords.map((c, idx) => (
                      <g key={idx} className="group/dot cursor-pointer">
                        <circle cx={c.x} cy={c.y} r="5" fill="#2563eb" stroke="white" strokeWidth="1.5" className="transition-all duration-300 group-hover/dot:r-7" />
                        <title>{`${c.raw.name}: ${formatCurrency(c.raw.sales)}`}</title>
                      </g>
                    ))}

                    {/* Left Y Labels */}
                    <text x="40" y="25" textAnchor="end" fill="#94a3b8" className="text-[8px] font-black font-mono">{formatCurrency(maxSales)}</text>
                    <text x="40" y="90" textAnchor="end" fill="#94a3b8" className="text-[8px] font-black font-mono">{formatCurrency(maxSales / 2)}</text>
                    <text x="40" y="163" textAnchor="end" fill="#94a3b8" className="text-[8px] font-black font-mono">RD$0</text>
                  </svg>
                  
                  {/* Bottom Date Labels */}
                  <div className="flex justify-between px-10 text-[9px] font-black text-slate-400 tracking-wider font-mono mt-2">
                    <span>{chartData[0]?.name || 'Inicio'}</span>
                    <span>{chartData[Math.floor(chartData.length / 2)]?.name || 'Mitad'}</span>
                    <span>{chartData[chartData.length - 1]?.name || 'Fin'}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Top Products and Expenses vs Sales circular Gauge */}
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-pro border border-gray-150 flex flex-col justify-between">
          <div>
            <h3 className="font-headline-md font-black text-vuttik-navy tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              Líderes de Venta y Balance Mensual
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Artículos más vendidos y proporción de egresos vs ingresos</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 items-center">
            
            {/* Horizontal Bar Chart for Top 5 Products */}
            <div className="space-y-3.5 text-left">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Top 5 Artículos Vendidos</h4>
              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold italic py-8">Ningún artículo vendido aún</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, idx) => {
                    const maxQty = Math.max(...topProducts.map(tp => tp.cantidad), 1);
                    const pct = Math.round((p.cantidad / maxQty) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span className="truncate max-w-[120px]" title={p.nombre}>{p.nombre}</span>
                          <span className="font-mono text-slate-500">{p.cantidad} u.</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Circular Gauge for Expenses Ratio */}
            {(() => {
              const totalVendido = stats?.profitStats?.totalVendido || 0;
              const totalGastos = stats?.profitStats?.totalGastos || 0;
              const ratio = totalVendido > 0 ? Math.min(100, Math.round((totalGastos / totalVendido) * 100)) : 0;
              const rCircumference = 2 * Math.PI * 40;
              const dashOffset = rCircumference - (ratio / 100) * rCircumference;
              const isHighRatio = ratio >= 50;

              return (
                <div className="flex flex-col items-center justify-center p-4 border border-slate-50 rounded-3xl bg-slate-50/50">
                  <div className="relative h-28 w-28">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="9" />
                      <circle 
                        cx="56" cy="56" r="40" fill="transparent" 
                        stroke={isHighRatio ? '#ef4444' : '#10b981'} 
                        strokeWidth="9" 
                        strokeDasharray={rCircumference} 
                        strokeDashoffset={dashOffset} 
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-sans">
                      <span className={`text-2xl font-black ${isHighRatio ? 'text-red-500' : 'text-emerald-500'}`}>{ratio}%</span>
                      <span className="text-[7px] text-slate-400 font-extrabold uppercase tracking-widest">Gastos / Ventas</span>
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gasto Total: {formatCurrency(totalGastos)}</p>
                    <p className="text-[9px] font-bold text-slate-500 leading-normal mt-0.5">Ventas Netas: {formatCurrency(totalVendido)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 3. Panel de Copias de Seguridad y Seguridad de Datos */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl text-left text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="font-headline-md font-black text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              Seguridad y Copias de Seguridad (Respaldos)
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed max-w-2xl">
              Tus datos comerciales se guardan localmente para total privacidad y velocidad. Descarga un archivo de respaldo manual en JSON o exporta las tablas a Excel (CSV) para auditar con contadores externos sin conexión a internet.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* JSON Download */}
            <button
              onClick={handleDownloadJSONBackup}
              className="flex-1 md:flex-initial bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-label-md font-black uppercase tracking-wider px-6 py-4 rounded-3xl transition-all shadow-pro-hover shadow-emerald-950/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              RESPALDO BASE DATOS (JSON)
            </button>

            {/* CSV Sales */}
            <button
              onClick={handleExportSalesCSV}
              className="flex-1 md:flex-initial bg-slate-800 hover:bg-slate-700 text-white font-label-md font-black uppercase tracking-wider px-5 py-4 rounded-3xl transition-all border border-white/5 flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4 text-blue-400" />
              EXPORTAR VENTAS (CSV)
            </button>

            {/* CSV Inventory */}
            <button
              onClick={handleExportInventoryCSV}
              className="flex-1 md:flex-initial bg-slate-800 hover:bg-slate-700 text-white font-label-md font-black uppercase tracking-wider px-5 py-4 rounded-3xl transition-all border border-white/5 flex items-center justify-center gap-2"
            >
              <Package className="h-4 w-4 text-amber-400" />
              EXPORTAR INVENTARIO (CSV)
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
              onClick={() => setActiveModal(null)}
            />
            <div className="fixed inset-0 pointer-events-none z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="pointer-events-auto w-full max-w-2xl max-h-[85vh] bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-surface">
                  <h3 className="font-headline-md font-black tracking-tight text-vuttik-navy">
                    Desglose: {
                      activeModal === 'caja' ? 'Estimado en Caja' :
                      activeModal === 'banco' ? 'Ido al Banco (Guardado)' :
                      activeModal === 'inversion' ? 'Inversión Externa' :
                      cards.find(c => c.id === activeModal)?.title
                    }
                  </h3>
                  <button onClick={() => setActiveModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 font-sans">
                  {activeModal === 'cobrado' && (
                    <div>
                      {stats?.details?.todaySalesData?.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 font-bold">No hay cobros registrados hoy.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-400">
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Hora</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Cliente</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Método</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px] text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats?.details?.todaySalesData?.map((sale: any) => (
                              <tr key={sale.id} className="border-b border-gray-50 hover:bg-surface">
                                <td className="py-3 text-on-surface-variant">{new Date(sale.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit' })}</td>
                                <td className="py-3 font-bold text-gray-700">{sale.cliente}</td>
                                <td className="py-3">
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-full font-bold uppercase">{sale.metodo_pago}</span>
                                </td>
                                <td className="py-3 text-right font-black text-emerald-600 font-mono">{formatCurrency(sale.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {activeModal === 'ganancia' && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 mb-6">
                        <p className="font-body-md font-bold text-emerald-800 mb-2">Fórmula de Cálculo:</p>
                        <p className="text-xs text-emerald-600 leading-relaxed">
                          Ingresos de Ventas Cobradas (reales) - Costo Total de la Mercancía Vendida - Gastos Operativos (Luz, agua, sueldos, etc). <br/><br/>
                          <i>No se toma en cuenta el fiado pendiente porque no es dinero real hasta que lo paguen.</i>
                        </p>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600 font-bold">Ingresos (Ventas cobradas)</span>
                        <span className="font-black text-vuttik-navy font-mono">{formatCurrency(stats?.profitStats?.totalVendido || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600 font-bold">Costo de Mercancía Comprada</span>
                        <span className="font-black text-red-500 font-mono">- {formatCurrency(stats?.profitStats?.totalComprasMercancia || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600 font-bold">Gastos Operativos (Salidas)</span>
                        <span className="font-black text-red-500 font-mono">- {formatCurrency(stats?.profitStats?.totalGastosOperativos || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 mt-2">
                        <span className="text-lg font-black text-emerald-600">Ganancia Limpia</span>
                        <span className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(stats?.profitStats?.gananciaNeta || 0)}</span>
                      </div>
                    </div>
                  )}

                  {activeModal === 'faltante' && (
                    <div>
                      {stats?.details?.lowStockData?.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 font-bold">Todos los productos tienen stock suficiente.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-400">
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Producto</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px] text-center">Disponible</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px] text-center">Mínimo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats?.details?.lowStockData?.map((prod: any) => (
                              <tr key={prod.id} className="border-b border-gray-50 hover:bg-surface">
                                <td className="py-3 font-bold text-gray-800">{prod.nombre}</td>
                                <td className="py-3 text-center font-black text-red-500">{prod.cantidad}</td>
                                <td className="py-3 text-center text-on-surface-variant font-bold">{prod.minimo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {activeModal === 'gastos' && (
                    <div>
                      {stats?.details?.expenses?.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 font-bold">No hay gastos registrados en este periodo.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-400">
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Fecha</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Descripción</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Categoría</th>
                              <th className="pb-2 font-bold uppercase tracking-wider text-[10px] text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats?.details?.expenses?.map((exp: any) => (
                              <tr key={exp.id} className="border-b border-gray-50 hover:bg-surface">
                                <td className="py-3 text-on-surface-variant">{new Date(exp.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                                <td className="py-3 font-bold text-gray-700">{exp.descripcion}</td>
                                <td className="py-3 text-on-surface-variant text-xs">{exp.categoria}</td>
                                <td className="py-3 text-right font-black text-red-500 font-mono">{formatCurrency(exp.monto)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {activeModal === 'caja' && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 mb-6">
                        <p className="font-body-md font-bold text-emerald-800 mb-2">Estimado en Caja:</p>
                        <p className="text-xs text-emerald-600 leading-relaxed">
                          Es el dinero que debería haber físicamente en la gaveta o caja registradora en este momento. Refleja el monto esperado del turno abierto actual.
                        </p>
                      </div>
                      <div className="flex justify-between items-center py-4 border-t border-gray-100 mt-4">
                        <span className="text-lg font-black text-emerald-600">Efectivo Físico Esperado</span>
                        <span className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(stats?.financieroStats?.dineroEstimadoCaja || 0)}</span>
                      </div>
                    </div>
                  )}

                  {activeModal === 'banco' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 mb-6">
                        <p className="font-body-md font-bold text-blue-800 mb-2">Fórmula de Cálculo:</p>
                        <p className="text-xs text-vuttik-blue leading-relaxed">
                          Suma del dinero que has transferido desde tu Caja hacia tu Banco + las Ventas pagadas directamente con Tarjeta o Transferencia - cualquier gasto pagado desde el Banco.
                        </p>
                      </div>

                      <details className="group border-b border-gray-100 py-3">
                        <summary className="flex justify-between items-center cursor-pointer list-none select-none">
                          <span className="text-gray-600 font-bold group-open:text-vuttik-blue transition-colors hover:underline">Transferido desde la Caja ▼</span>
                          <span className="font-black text-vuttik-navy font-mono">{formatCurrency(stats?.financieroStats?.bancoDetails?.bancoEntradas || 0)}</span>
                        </summary>
                        <div className="pt-3 pb-1 pl-4 space-y-2 border-l-2 border-blue-100 ml-2 mt-2">
                          {stats?.financieroStats?.bancoDetails?.bancoEntradasItems?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No hay transferencias de caja a banco.</p>
                          ) : (
                            stats?.financieroStats?.bancoDetails?.bancoEntradasItems?.map((t: any) => (
                              <div key={t.id} className="flex justify-between items-center text-xs">
                                <span className="text-on-surface-variant flex items-center gap-2"><ClickableDate date={t.fecha} /> <span className="text-[9px] uppercase tracking-wider font-bold">Transferencia</span></span>
                                <span className="font-mono text-gray-700 font-bold">{formatCurrency(t.monto)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <details className="group border-b border-gray-100 py-3">
                        <summary className="flex justify-between items-center cursor-pointer list-none select-none">
                          <span className="text-gray-600 font-bold group-open:text-vuttik-blue transition-colors hover:underline">Ventas por Tarjeta / Transferencia ▼</span>
                          <span className="font-black text-vuttik-navy font-mono">+ {formatCurrency(stats?.financieroStats?.bancoDetails?.ventasBanco || 0)}</span>
                        </summary>
                        <div className="pt-3 pb-1 pl-4 space-y-2 border-l-2 border-blue-100 ml-2 mt-2">
                          {stats?.financieroStats?.bancoDetails?.ventasBancoItems?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No hay ventas cobradas por banco.</p>
                          ) : (
                            stats?.financieroStats?.bancoDetails?.ventasBancoItems?.map((s: any) => (
                              <div key={s.id} className="flex justify-between items-center text-xs">
                                <span className="text-on-surface-variant flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <ClickableDate date={s.fecha} /> 
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-blue-500">
                                    Venta #{s.id.slice(0, 5)} - {s.metodo_pago}
                                  </span>
                                </span>
                                <span className="font-mono text-gray-700 font-bold">{formatCurrency(s.total)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <details className="group border-b border-gray-100 py-3">
                        <summary className="flex justify-between items-center cursor-pointer list-none select-none">
                          <span className="text-gray-600 font-bold group-open:text-red-600 transition-colors hover:underline">Gastos / Compras pagados por Banco ▼</span>
                          <span className="font-black text-red-500 font-mono">- {formatCurrency(stats?.financieroStats?.bancoDetails?.bancoSalidasGastos || 0)}</span>
                        </summary>
                        <div className="pt-3 pb-1 pl-4 space-y-2 border-l-2 border-red-100 ml-2 mt-2">
                          {stats?.financieroStats?.bancoDetails?.bancoSalidasGastosItems?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No hay gastos pagados desde el banco.</p>
                          ) : (
                            stats?.financieroStats?.bancoDetails?.bancoSalidasGastosItems?.map((e: any) => (
                              <div key={e.id} className="flex justify-between items-center text-xs">
                                <span className="text-on-surface-variant flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <ClickableDate date={e.fecha} /> 
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-red-400 truncate max-w-[150px] sm:max-w-[200px]">
                                    {e.descripcion}
                                  </span>
                                </span>
                                <span className="font-mono text-red-600 font-bold">-{formatCurrency(e.monto)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <div className="flex justify-between items-center pt-4 mt-2">
                        <span className="text-lg font-black text-vuttik-blue">Total Acumulado en Banco</span>
                        <span className="text-2xl font-black text-vuttik-blue font-mono">{formatCurrency(stats?.financieroStats?.totalIdoBanco || 0)}</span>
                      </div>
                    </div>
                  )}

                  {activeModal === 'inversion' && (
                    <div className="space-y-4">
                      <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 mb-6">
                        <p className="font-body-md font-bold text-purple-800 mb-2">Inversión Externa:</p>
                        <p className="text-xs text-purple-600 leading-relaxed">
                          Es el dinero sacado de tu bolsillo (externo al negocio) para inyectar capital, comprar mercancía o cubrir gastos del negocio.
                        </p>
                      </div>

                      <details className="group border-b border-gray-100 py-3">
                        <summary className="flex justify-between items-center cursor-pointer list-none select-none">
                          <span className="text-gray-600 font-bold group-open:text-purple-600 transition-colors hover:underline">Capital Inyectado a Caja/Banco ▼</span>
                          <span className="font-black text-vuttik-navy font-mono">{formatCurrency(stats?.financieroStats?.inversionDetails?.transferenciasDesdeInversion || 0)}</span>
                        </summary>
                        <div className="pt-3 pb-1 pl-4 space-y-2 border-l-2 border-purple-100 ml-2 mt-2">
                          {stats?.financieroStats?.inversionDetails?.transferenciasDesdeInversionItems?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No hay inyecciones de capital.</p>
                          ) : (
                            stats?.financieroStats?.inversionDetails?.transferenciasDesdeInversionItems?.map((t: any) => (
                              <div key={t.id} className="flex justify-between items-center text-xs">
                                <span className="text-on-surface-variant flex items-center gap-2"><ClickableDate date={t.fecha} /> <span className="text-[9px] uppercase tracking-wider font-bold">Inyección</span></span>
                                <span className="font-mono text-gray-700 font-bold">{formatCurrency(t.monto)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <details className="group border-b border-gray-100 py-3">
                        <summary className="flex justify-between items-center cursor-pointer list-none select-none">
                          <span className="text-gray-600 font-bold group-open:text-purple-600 transition-colors hover:underline">Gastos pagados con tu bolsillo ▼</span>
                          <span className="font-black text-vuttik-navy font-mono">+ {formatCurrency(stats?.financieroStats?.inversionDetails?.comprasInversion || 0)}</span>
                        </summary>
                        <div className="pt-3 pb-1 pl-4 space-y-2 border-l-2 border-purple-100 ml-2 mt-2">
                          {stats?.financieroStats?.inversionDetails?.comprasInversionItems?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No hay gastos pagados desde tu bolsillo.</p>
                          ) : (
                            stats?.financieroStats?.inversionDetails?.comprasInversionItems?.map((e: any) => (
                              <div key={e.id} className="flex justify-between items-center text-xs">
                                <span className="text-on-surface-variant flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <ClickableDate date={e.fecha} /> 
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-purple-400 truncate max-w-[150px] sm:max-w-[200px]">
                                    {e.descripcion}
                                  </span>
                                </span>
                                <span className="font-mono text-purple-600 font-bold">+{formatCurrency(e.monto)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <div className="flex justify-between items-center pt-4 mt-2">
                        <span className="text-lg font-black text-purple-600">Total Invertido</span>
                        <span className="text-2xl font-black text-purple-600 font-mono">{formatCurrency(stats?.financieroStats?.totalInversionExterna || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
