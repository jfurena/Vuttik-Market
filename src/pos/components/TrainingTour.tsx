import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, BookOpen, Award, CheckCircle2, ChevronRight, ChevronLeft, 
  ShoppingCart, Wallet, Package, Shield, MapPin, History, HelpCircle, Play, Info, RotateCcw,
  Receipt, Landmark, CreditCard, Banknote, AlertCircle, Calculator
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { isPracticeModeActive, setPracticeModeActive } from '../services/api';

interface TrainingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrainingTour({ isOpen, onClose }: TrainingTourProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState(0);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tour' | 'modules' | 'sandbox'>('tour');
  const [selectedModule, setSelectedModule] = useState<string | null>('pos');

  // Spotlight and coordinates tracking
  const [spotlightCoords, setSpotlightCoords] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    visible: boolean;
  }>({ top: 0, left: 0, width: 0, height: 0, visible: false });

  // Sandbox Simulator State
  const [simCart, setSimCart] = useState<{ id: number; name: string; price: number; qty: number }[]>([
    { id: 1, name: 'Habichuelas Rojas del País', price: 90, qty: 1 },
    { id: 2, name: 'Gatorade Azúl 500ml', price: 75, qty: 2 }
  ]);
  const [simCashReceived, setSimCashReceived] = useState<string>('300');
  const [simPaid, setSimPaid] = useState(false);
  const [simRefundReason, setSimRefundReason] = useState('');
  const [simRefundPassword, setSimRefundPassword] = useState('');
  const [simRefundSuccess, setSimRefundSuccess] = useState<boolean | null>(null);

  const tourSteps = [
    {
      targetPage: '/pos',
      selector: '',
      title: '¡Bienvenido al Instructor Vuttik! 🎓',
      subtitle: 'Capacitación interactiva para cajeros y personal del colmado.',
      icon: Award,
      description: 'Este asistente te guiará por todas las pantallas del sistema, paso a paso. La barra inferior siempre estará aquí, y una flecha amarilla señalará exactamente qué mirar en la pantalla.',
      tips: [
        'Navegamos automáticamente entre secciones del sistema.',
        'La flecha amarilla parpadeante señala exactamente el botón o área que describes.',
        'Usa los botones "Volver" y "Siguiente" para moverte al ritmo que quieras.'
      ]
    },
    {
      targetPage: '/pos',
      selector: '#pos-search-input',
      title: '1. Buscador de Productos (POS)',
      subtitle: 'Encuentra cualquier artículo al instante.',
      icon: ShoppingCart,
      description: 'Este campo de búsqueda es la entrada principal del punto de venta. Escribe el nombre de cualquier producto y el sistema lo filtra instantáneamente. También funciona con lector de código de barras físico: simplemente pasa el escáner y el producto aparece solo.',
      tips: [
        'F10 en el teclado lleva el cursor aquí de inmediato, sin usar el ratón.',
        'Mientras escribes, los resultados se actualizan letra por letra.',
        'Si el producto tiene stock bajo, verás una alerta roja en su tarjeta.'
      ]
    },
    {
      targetPage: '/pos',
      selector: '#pos-product-list',
      title: '2. Catálogo Visual de Productos',
      subtitle: 'Toca una tarjeta para agregar al carrito.',
      icon: Package,
      description: 'Aquí aparecen todos los productos disponibles en el inventario. Cada tarjeta muestra el nombre, precio y cantidad disponible. Al tocar o hacer clic en una tarjeta, ese producto se agrega automáticamente al carrito de la venta actual.',
      tips: [
        'Las tarjetas con borde rojo indican que el producto está por agotarse.',
        'Puedes tocar la misma tarjeta varias veces para incrementar la cantidad.',
        'Diseñado para funcionar bien en tabletas y pantallas táctiles sobre el mostrador.'
      ]
    },
    {
      targetPage: '/pos',
      selector: '#pos-cart-panel',
      title: '3. Carrito de la Venta',
      subtitle: 'Revisa y ajusta antes de cobrar.',
      icon: ShoppingCart,
      description: 'Aquí se acumulan todos los artículos que el cliente llevará. Puedes ajustar la cantidad con los botones + y −, y si tienes permiso de administrador, puedes tocar el precio de cualquier artículo para modificarlo directamente en el carrito antes de cobrar.',
      tips: [
        'El total se actualiza automáticamente con cada cambio.',
        'Para eliminar un artículo, usa el ícono de basurero rojo que aparece al lado.',
        'Los cambios de precio quedan registrados en la bitácora de auditoría.'
      ]
    },
    {
      targetPage: '/pos',
      selector: '#pos-pay-btn',
      title: '4. Cobrar la Venta',
      subtitle: 'Selecciona el método de pago y cobra.',
      icon: Wallet,
      description: 'Al presionar este botón se abre la pantalla de cobro. Elige el método: Efectivo, Tarjeta, Transferencia, Mixto o Fiao. Si es efectivo, ingresa el monto que da el cliente y el sistema calcula el cambio exacto al instante.',
      tips: [
        'El modo "Mixto" permite que el cliente pague una parte en efectivo y otra por transferencia.',
        'Puedes agregar una nota o referencia bancaria antes de confirmar.',
        'Cada transacción registra la ubicación GPS automáticamente para seguridad.'
      ]
    },
    {
      targetPage: '/pos',
      selector: '#pos-pay-btn',
      title: '5. Venta a Crédito (Fiao)',
      subtitle: 'Fiado con control: busca el cliente y verifica su deuda.',
      icon: CreditCard,
      description: 'Agrega productos al carrito y presiona "COBRAR FACTURA" (este botón). En la ventana de cobro, aparecerá la opción "A Crédito (Fiao)". Al seleccionarla, un buscador te permite encontrar el cliente por nombre y ver su deuda pendiente antes de fiarle.',
      tips: [
        'Solo puedes fiar a clientes registrados previamente en "Clientes y Crédito".',
        'Si la deuda supera el límite, el sistema te alertará antes de confirmar.',
        'El historial de todo lo fiado se ve en el Panel de Administración → pestaña "Fiao".'
      ]
    },
    {
      targetPage: '/shifts',
      selector: '#open-shift-now-btn, #open-shift-btn, #active-shift-card',
      title: '6. Turnos de Caja',
      subtitle: 'Abre la caja antes de vender, ciérrala al terminar.',
      icon: History,
      description: 'Antes de empezar a vender, debes abrir un Turno de Caja declarando el dinero inicial de cambio que tienes disponible. Al cerrar el turno al final del día, el sistema compara lo vendido con el efectivo real que hay en caja y detecta cualquier diferencia (faltante o sobrante).',
      tips: [
        'Puedes registrar movimientos de efectivo durante el turno: entradas o salidas.',
        'El cierre de turno genera un reporte completo billete por billete.',
        'Sin turno abierto, el POS no permite completar ventas en efectivo.'
      ]
    },
    {
      targetPage: '/quotes',
      selector: '#quotations-view-container',
      title: '7. Cotizador de Presupuestos',
      subtitle: 'Crea presupuestos para clientes sin tocar el inventario.',
      icon: Calculator,
      description: 'Usa esta sección para preparar presupuestos de compra antes de vender. Puedes tener varios presupuestos abiertos al mismo tiempo para distintos clientes, editarlos libremente y compartirlos por WhatsApp con un solo clic. Nada de esto afecta el inventario real.',
      tips: [
        'Calcula automáticamente libras a partir de pesos dominicanos.',
        'Los borradores se guardan solos mientras trabajas.',
        'Copia el detalle elegante al portapapeles para enviar por WhatsApp al instante.'
      ]
    },
    {
      targetPage: '/expenses',
      selector: '#add-expense-btn',
      title: '8. Registrar Gastos del Negocio',
      subtitle: 'Anota cada salida de dinero para tener cuentas claras.',
      icon: Wallet,
      description: 'Aquí registras todos los gastos del colmado: luz, agua, alquiler, compras a suplidores, salarios, etc. Al anotar cada gasto, el sistema los resta automáticamente de tus ganancias para mostrarte el dinero real que te queda libre al final del período.',
      tips: [
        'Categoriza cada gasto (Luz, Alquiler, Compra, Otros) para ver reportes claros.',
        'Indica si el dinero salió de la caja registradora o de tu bolsillo personal.',
        'Sin gastos registrados, la ganancia que ves sería inflada y engañosa.'
      ]
    },
    {
      targetPage: '/sales',
      selector: '#sales-list-view',
      title: '9. Historial de Ventas y Reembolsos',
      subtitle: 'Revisa, reimprime o cancela cualquier venta.',
      icon: Receipt,
      description: 'En esta pantalla encuentras un registro completo de todas las ventas realizadas. Haz clic en cualquier boleta para ver su detalle, reimprimir el recibo o iniciar un reembolso. Los reembolsos requieren contraseña y motivo obligatorio, y el inventario se restaura automáticamente.',
      tips: [
        'Usa el buscador para encontrar una venta por número de ticket o nombre del cliente.',
        'El motivo del reembolso queda grabado en la bitácora para auditoría.',
        'La mercancía devuelta regresa al inventario en tiempo real.'
      ]
    },
    {
      targetPage: '/sales',
      selector: '#sales-list-view',
      title: '10. Rastreo GPS de Transacciones',
      subtitle: 'Cada cobro guarda la ubicación exacta.',
      icon: MapPin,
      description: 'Para mayor seguridad, cada venta y reembolso registra automáticamente las coordenadas GPS del dispositivo que hizo la transacción. Desde el historial, el dueño puede ver en un mapa exactamente desde dónde se realizó cada operación, detectando irregularidades.',
      tips: [
        'El empleado no nota ninguna lentitud: el GPS trabaja en segundo plano.',
        'Ideal para detectar si alguien está operando desde fuera del local.',
        'El dueño puede ver el mapa tocando el ícono de mapa en cada boleta.'
      ]
    },
    {
      targetPage: '/audit',
      selector: '#audit-log-view',
      title: '11. Bitácora de Auditoría',
      subtitle: 'Registro permanente e inalterable de todo lo que ocurre.',
      icon: Shield,
      description: 'La bitácora registra automáticamente cada acción importante: quién editó un precio, quién hizo un reembolso, quién cambió el inventario y a qué hora. Este registro no se puede borrar bajo ninguna circunstancia y sirve para mantener la honestidad del personal.',
      tips: [
        'Filtra por fecha o empleado para investigar un incidente específico.',
        'Solo el dueño tiene acceso a esta sección.',
        'Cada entrada muestra usuario, hora exacta, módulo y descripción detallada.'
      ]
    },
    {
      targetPage: '/admin',
      selector: '#admin-stats-cards',
      title: '12. Resumen del Negocio — Las 4 Tarjetas',
      subtitle: 'Un vistazo instantáneo a la salud financiera del colmado.',
      icon: Banknote,
      description: 'Estas 4 tarjetas te muestran lo más importante al abrir el sistema: cuánto cobraste hoy, cuánto te queda libre de ganancia, cuántos productos están por agotarse y cuánto has gastado. Cambia el período con el botón de fecha arriba a la derecha.',
      tips: [
        '"Ganancia Limpia" excluye lo fiado — solo cuenta dinero ya recibido en mano.',
        '"Falta Comprar" te alerta para reponer mercancía antes de quedarte sin nada.',
        'Puedes filtrar por hoy, ayer, esta semana o un rango de fechas personalizado.'
      ]
    },
    {
      targetPage: '/admin',
      selector: '#admin-profit-breakdown',
      title: '13. Desglose de Ganancias Paso a Paso',
      subtitle: 'La fórmula exacta de cuánto ganó el negocio.',
      icon: Banknote,
      description: 'Esta sección te muestra la cuenta completa: ventas cobradas, menos el costo de los productos vendidos, menos los gastos del período, igual a tu Ganancia Limpia real. Así sabes exactamente de dónde viene y a dónde va cada peso.',
      tips: [
        'Si la ganancia sale negativa, los gastos superaron las ventas ese período.',
        'Lo fiado aparece desglosado aparte para que sepas cuánto está pendiente de cobro.',
        'Puedes exportar los datos en CSV usando los botones de exportación.'
      ]
    },
    {
      targetPage: '/admin',
      selector: '#movimientos-seccion',
      title: '14. Detalle de Movimientos — Pestañas',
      subtitle: 'Explora cada tipo de transacción por separado.',
      icon: Banknote,
      description: 'Esta sección divide todos los movimientos del negocio en pestañas: Ventas, Fiao (créditos), Gastos, Inversión, Cuadres de Caja y GPS. Haz clic en cada pestaña para ver el listado completo de ese tipo de registro con fechas y montos.',
      tips: [
        'Usa el buscador que aparece en cada pestaña para encontrar un registro específico.',
        'La pestaña "Cuadres" muestra el historial de cada cierre de caja con diferencias detectadas.',
        'La pestaña "GPS" muestra el mapa de cada transacción registrada.'
      ]
    },
    {
      targetPage: '/admin',
      selector: '#admin-tab-fiado',
      title: '15. Pestaña "Fiao" — Seguimiento de Créditos',
      subtitle: 'Todo lo que te deben, con fecha y nombre de cliente.',
      icon: Banknote,
      description: 'Al tocar esta pestaña verás el historial completo de todas las ventas a crédito: quién se llevó qué, en qué fecha y por cuánto. Cada registro muestra el cliente, los artículos y el monto. Esta información es clave para saber cuánto dinero está pendiente de cobrar.',
      tips: [
        'La deuda pendiente total aparece en el bloque verde de la tarjeta "Lo Fiado".',
        'Cuando un cliente pague, debes registrar el cobro desde el módulo de Clientes.',
        '¡Felicidades! Ya conoces todas las herramientas del sistema Vuttik 🎉'
      ]
    }
  ];

  const modulesHelp = [
    {
      id: 'pos',
      title: 'Punto de Venta (POS)',
      icon: ShoppingCart,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      howTo: [
        'Paso 1: Ve a "Vender Producto" en el menú lateral de la pantalla.',
        'Paso 2: Toca las tarjetas de los artículos para agregarlos al carrito virtual.',
        'Paso 3: Si necesitas editar el precio cobrado por unidad, haz clic sobre el precio del artículo en el carrito, digita el nuevo monto y guárdalo.',
        'Paso 4: Elige si el pago es en "Efectivo" o "Transferencia". Si es transferencia, puedes anotar la referencia bancaria.',
        'Paso 5: Haz clic en "Completar Venta". El software guardará tu coordenada GPS de inmediato.'
      ]
    },
    {
      id: 'shifts',
      title: 'Aperturas y Cierres de Caja',
      icon: History,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      howTo: [
        'Paso 1: Al iniciar el día, ve a "Abrir / Cerrar Caja" en el menú.',
        'Paso 2: Ingresa el "Monto Inicial" de efectivo de cambio (ej. $1,000) y abre la caja.',
        'Paso 3: Durante el turno, usa "Registrar Movimiento" para registrar entradas de cambio extra o retiro para pago a proveedores.',
        'Paso 4: Al finalizar, ingresa en la calculadora de cuadre billete por billete. El sistema calculará automáticamente si tienes faltante u balance perfecto.',
        'Paso 5: Haz clic en "Cerrar Turno". Podrás consultar la cronología detallada de este turno por siempre.'
      ]
    },
    {
      id: 'expenses',
      title: 'Registro de Gastos del Colmado',
      icon: Wallet,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      howTo: [
        'Paso 1: Accede a "Gastos del Colmado" desde el menú del negocio.',
        'Paso 2: Haz clic en "Registrar Gasto [+]" en la esquina superior.',
        'Paso 3: Completa la descripción, el monto en RD$ y la categoría (ej. Luz, Combustible).',
        'Paso 4: Selecciona la fecha exacta en la que ocurrió el gasto para sincronizar los reportes.',
        'Paso 5: Indica si se sacó de la caja registradora o si fue un pago de bolsillo, y guarda.'
      ]
    },
    {
      id: 'refunds',
      title: 'Manejo de Reembolsos de Seguridad',
      icon: RotateCcw,
      color: 'bg-rose-50 text-rose-600 border-rose-100',
      howTo: [
        'Paso 1: Ve a "Ventas de Hoy" o "Histórico de Ventas".',
        'Paso 2: Haz clic en el boleto de venta que deseas revertir para ver su recibo digital.',
        'Paso 3: Toca el botón de "Reembolsar Venta".',
        'Paso 4: En la ventana de seguridad emergente, escribe obligatoriamente el motivo del reembolso para los reportes de auditoría.',
        'Paso 5: Ingresa la contraseña con la que inicias sesión y confirma. El inventario volverá al stock automáticamente.'
      ]
    },
    {
      id: 'fiao',
      title: 'Ventas a Crédito (Lo Fiado)',
      icon: CreditCard,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      howTo: [
        'Paso 1: En el POS, luego de agregar los productos, selecciona "A Crédito (Fiao)" como método de pago.',
        'Paso 2: Escribe el nombre del cliente en el buscador inteligente y selecciónalo de la lista filtrada.',
        'Paso 3: Verifica que su deuda actual sumada al nuevo carrito no exceda su límite de crédito permitido.',
        'Paso 4: Completa la venta. El monto se sumará a su cuenta pendiente y NO se registrará como ganancia libre aún.',
        'Paso 5: Puedes ver el historial de fechas y artículos fiados en el panel de Administración > Resumen > pestaña "Lo Fiado".'
      ]
    }
  ];

  // Effect to navigate and handle step transitions
  useEffect(() => {
    if (!isOpen) return;
    const step = tourSteps[currentStep];
    if (step && step.targetPage && location.pathname !== step.targetPage) {
      // Direct navigation to target page on real system!
      navigate(step.targetPage);
    }
  }, [currentStep, isOpen]);

  // Spotlight locator algorithm
  const updateSpotlight = () => {
    const step = tourSteps[currentStep];
    if (!step || !step.selector) {
      setSpotlightCoords(prev => ({ ...prev, visible: false }));
      return;
    }

    // Try multiple nested selectors or combined commas
    const element = document.querySelector(step.selector);
    if (element) {
      const rect = element.getBoundingClientRect();

      setSpotlightCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        visible: true
      });
    } else {
      setSpotlightCoords(prev => ({ ...prev, visible: false }));
    }
  };

  // Re-calculate spotlight on dimensions modified
  useEffect(() => {
    if (!isOpen) return;

    updateSpotlight();
    // Re-check frequently to handle slow renders / transitions
    const timer = setInterval(updateSpotlight, 400);

    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [currentStep, isOpen]);

  // Simulator helper handlers
  const handleSimAddQty = (id: number) => {
    setSimCart(simCart.map(item => item.id === id ? { ...item, qty: item.qty + 1 } : item));
  };
  const handleSimSubQty = (id: number) => {
    setSimCart(simCart.map(item => item.id === id && item.qty > 1 ? { ...item, qty: item.qty - 1 } : item));
  };
  const handleSimRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simRefundReason.trim() || !simRefundPassword) {
      setSimRefundSuccess(false);
      return;
    }
    if (simRefundPassword === '123456') {
      setSimRefundSuccess(true);
    } else {
      setSimRefundSuccess(false);
    }
  };

  const simSubtotal = simCart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const simChange = parseFloat(simCashReceived) - simSubtotal > 0 ? parseFloat(simCashReceived) - simSubtotal : 0;

  if (!isOpen) return null;

  const currentStepData = tourSteps[currentStep];

  return (
    <>
      {/* 1. SPOTLIGHT HIGHLIGHT RING */}
      {spotlightCoords.visible && (
        <div 
          style={{
            top: `${spotlightCoords.top - 8}px`,
            left: `${spotlightCoords.left - 8}px`,
            width: `${spotlightCoords.width + 16}px`,
            height: `${spotlightCoords.height + 16}px`,
            position: 'fixed',
            borderRadius: '16px',
            zIndex: 9990,
            pointerEvents: 'none',
            border: '3px solid #f59e0b',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.60), 0 0 24px #f59e0b88',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      )}

      {/* Dim overlay when no spotlight */}
      {!spotlightCoords.visible && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] z-[9988] pointer-events-none" />
      )}

      {/* 2. BOUNCING ARROW pointing DOWN toward the highlighted element from above it */}
      {spotlightCoords.visible && (
        <motion.div
          style={{
            position: 'fixed',
            top: `${spotlightCoords.top - 56}px`,
            left: `${spotlightCoords.left + spotlightCoords.width / 2 - 18}px`,
            zIndex: 9995,
            pointerEvents: 'none'
          }}
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="flex flex-col items-center"
        >
          <div className="w-8 h-8 bg-amber-500 border-2 border-white rounded-full shadow-lg shadow-amber-500/50 flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-white rotate-90" />
          </div>
          <div className="w-0.5 h-4 bg-amber-400" />
        </motion.div>
      )}

      {/* 3. BOTTOM BAR — fixed at the very bottom, full width, never covers content above */}
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-slate-900/98 backdrop-blur-lg border-t-2 border-amber-500/40 shadow-2xl font-sans"
      >
        {/* Progress bar at very top of the bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        <div className="flex items-stretch gap-0 min-h-[110px] max-h-[140px]">

          {/* LEFT: Branding + step badge */}
          <div className="bg-gradient-to-b from-amber-500 to-orange-600 px-5 flex flex-col items-center justify-center gap-1 shrink-0 min-w-[100px]">
            <span className="text-2xl">🎓</span>
            <span className="text-white font-black text-[9px] uppercase tracking-widest text-center leading-tight">Instructor<br/>Vuttik</span>
            <span className="bg-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded-full mt-1">
              {currentStep + 1} / {tourSteps.length}
            </span>
          </div>

          {/* CENTER: Content */}
          <div className="flex-1 px-5 py-3 flex flex-col justify-center gap-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black text-xs uppercase tracking-widest truncate">
                {currentStepData.title}
              </span>
              {currentStepData.targetPage === location.pathname ? (
                <span className="text-[8px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded shrink-0">✓ PÁGINA ACTIVA</span>
              ) : (
                <span className="text-[8px] font-black text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded animate-pulse shrink-0">NAVEGANDO...</span>
              )}
            </div>
            <p className="text-slate-200 text-[11px] font-medium leading-snug line-clamp-2">
              {currentStepData.description}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
              {currentStepData.tips.slice(0, 2).map((tip, idx) => (
                <span key={idx} className="text-[10px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  {tip}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT: Navigation buttons + close */}
          <div className="flex flex-col justify-center items-end gap-2 px-4 py-3 shrink-0 border-l border-slate-800">
            <button
              onClick={() => { setCurrentStep(0); onClose(); }}
              className="text-slate-500 hover:text-white transition-colors p-1 rounded cursor-pointer"
              title="Salir del tutorial"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-20 rounded-xl text-[10px] font-black text-slate-200 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all disabled:cursor-default"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Volver
              </button>
              {currentStep < tourSteps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-lg transition-all"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => { setCurrentStep(0); onClose(); }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-lg transition-all animate-pulse"
                >
                  ¡Listo! <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => { setShowSandboxModal(true); setActiveTab('sandbox'); }}
              className="text-[9px] font-black text-slate-500 hover:text-amber-400 uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1"
            >
              <HelpCircle className="h-3 w-3" /> Simulador
            </button>
          </div>
        </div>
      </motion.div>

      {/* 4. SANDBOX POPUP PRACTICING PLAZA */}
      <AnimatePresence>
        {showSandboxModal && (
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[680px] font-sans text-gray-900"
            >
              {/* Sidebar dentro del modal */}
              <div className="md:w-72 bg-gray-50 border-r border-gray-100 p-8 flex flex-col justify-between shrink-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-tight inline-block uppercase bg-gradient-to-r from-amber-500 to-orange-550 bg-clip-text text-transparent">Área de Pruebas</h4>
                      <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Sin Afectar Datos</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab('sandbox')}
                      className={cn(
                        "w-full text-left px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-3",
                        activeTab === 'sandbox' 
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-500/10" 
                          : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                      )}
                    >
                      <HelpCircle className="h-4.5 w-4.5" />
                      Simulador POS
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('modules'); setSelectedModule('pos'); }}
                      className={cn(
                        "w-full text-left px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-3",
                        activeTab === 'modules' 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10" 
                          : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                      )}
                    >
                      <Info className="h-4.5 w-4.5" />
                      Manuales Escritos
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 text-center">
                  <span className="text-[9px] text-gray-400 font-extrabold block">Vuttik Market POS • Simulador Seguro</span>
                </div>
              </div>

              {/* Dynamic core content of modal */}
              <div className="flex-1 flex flex-col h-full bg-white relative">
                <button 
                  onClick={() => setShowSandboxModal(false)}
                  className="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-gray-650 hover:bg-gray-50 transition-all z-10 border-0 cursor-pointer"
                  title="Cerrar Simulador"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Tab 1: Manuales Escritos */}
                {activeTab === 'modules' && (
                  <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto">
                    <div className="mb-6">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                        GUÍAS DE REFERENCIA RÁPIDAS
                      </span>
                      <h2 className="text-2xl font-black text-gray-950 tracking-tight uppercase mt-2">¿Cómo funciona cada módulo?</h2>
                    </div>

                    <div className="flex flex-wrap gap-2.5 mb-6 border-b border-gray-100 pb-4">
                      {modulesHelp.map((mod) => (
                        <button
                          key={mod.id}
                          onClick={() => setSelectedModule(mod.id)}
                          className={cn(
                            "px-4 py-2 bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-wider rounded-xl border border-gray-100 hover:bg-gray-100 cursor-pointer transition-all flex items-center gap-1.5",
                            selectedModule === mod.id && "bg-blue-600 border-blue-600 text-white hover:text-white"
                          )}
                        >
                          {React.createElement(mod.icon, { className: "h-3.5 w-3.5" })}
                          {mod.title}
                        </button>
                      ))}
                    </div>

                    {selectedModule && (
                      <div className="space-y-4">
                        {modulesHelp.map((mod) => {
                          if (mod.id !== selectedModule) return null;
                          return (
                            <div key={mod.id} className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2.5 rounded-xl border shrink-0", mod.color)}>
                                  {React.createElement(mod.icon, { className: "h-5 w-5" })}
                                </div>
                                <span className="text-sm font-black text-gray-800 uppercase tracking-wide">Manual Paso a Paso</span>
                              </div>

                              <div className="bg-slate-50 border border-gray-150 rounded-2.5xl p-6 space-y-4 text-left">
                                {mod.howTo.map((stepText, idx) => (
                                  <div key={idx} className="flex gap-4 items-start">
                                    <span className="h-6 w-6 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-700 leading-relaxed pt-1">{stepText}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Sandbox Playground */}
                {activeTab === 'sandbox' && (
                  <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto justify-between text-left">
                    <div className="space-y-6">
                      <div>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                          ENTORNO DE PRUEBAS COMPLETAMENTE SEGURO
                        </span>
                        <h2 className="text-2xl font-black text-gray-950 tracking-tight uppercase mt-2">Práctica para Empleados nuevos</h2>
                        <p className="text-gray-500 font-medium text-xs mt-1">
                          Los datos alimentados acá son ficticios, diseñados para familiarizarse con las funciones del Colmado.
                        </p>
                      </div>

                      {/* Global App-Wide Simulator Activator Banner */}
                      {isPracticeModeActive() ? (
                        <div className="bg-gradient-to-r from-amber-600 via-amber-550 to-orange-650 rounded-3xl p-6 text-white shadow-lg space-y-4 relative overflow-hidden border border-amber-500/20">
                          <div className="absolute -right-12 -bottom-12 h-36 w-36 bg-white/5 rounded-full blur-xl" />
                          <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-900 text-[8px] font-black uppercase tracking-widest rounded-md animate-pulse">
                                Simulador Activo 🛠️
                              </span>
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Estás operando en el modo de práctica</h3>
                            <p className="text-[11px] text-amber-50 font-medium leading-relaxed">
                              Todo lo que registres en el POS real, inventario o cajas se mantendrá seguro y aislado aquí en tu navegador. Puedes salir en cualquier momento para volver a ver los datos reales de tu tienda.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setPracticeModeActive(false);
                              onClose();
                              navigate('/');
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all border-0 shadow-md cursor-pointer flex items-center justify-center gap-2"
                          >
                            <X className="h-4 w-4 text-amber-950 font-bold shrink-0" />
                            Salir de Práctica (Volver a Modo Real)
                          </button>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-650 to-purple-650 rounded-3xl p-6 text-white shadow-lg space-y-4 relative overflow-hidden">
                          <div className="absolute -right-12 -bottom-12 h-36 w-36 bg-white/5 rounded-full blur-xl" />
                          <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-white/20 text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                                Recomendado 🚀
                              </span>
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Practicar con la aplicación real completa</h3>
                            <p className="text-[11px] text-blue-100 font-medium leading-relaxed">
                              ¿Quieres practicar un día laboral real de forma interactiva? Enciende el <strong>Modo de Práctica Global</strong>. Esto transformará toda la aplicación en una simulación de pruebas segura. Podrás vender en el POS real, ajustar inventario, administrar cajas de efectivo o registrar gastos reales, todo sin alterar la base de datos de producción de la tienda.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setPracticeModeActive(true);
                              onClose();
                              navigate('/pos');
                              window.location.reload();
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-100 active:scale-95 text-blue-900 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all border-0 shadow-md cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Play className="h-4 w-4 fill-current text-blue-950 font-bold shrink-0" />
                            Activar Simulador en Toda la App
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Carrito de Compras de Prueba */}
                        <div className="border border-gray-200 rounded-2.5xl p-5 bg-slate-50/60 flex flex-col justify-between">
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4 text-emerald-500" />
                              Simulador POS (Carrito de Ventas)
                            </h4>

                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                              {simCart.map(item => (
                                <div key={item.id} className="bg-white p-3 border border-gray-100 rounded-xl flex justify-between items-center text-xs">
                                  <div>
                                    <p className="font-extrabold text-gray-800 leading-none mb-1">{item.name}</p>
                                    <p className="font-mono text-gray-400">RD${item.price.toFixed(2)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleSimSubQty(item.id)}
                                      className="h-6 w-6 bg-red-50 text-red-650 hover:bg-red-100 border border-red-100 rounded-lg font-black flex items-center justify-center cursor-pointer transition-all"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-gray-800 w-5 text-center">{item.qty}</span>
                                    <button 
                                      onClick={() => handleSimAddQty(item.id)}
                                      className="h-6 w-6 bg-emerald-50 text-emerald-850 hover:bg-emerald-100 border border-emerald-100 rounded-lg font-black flex items-center justify-center cursor-pointer transition-all"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-200 mt-4 space-y-3">
                            <div className="flex justify-between items-center font-bold text-xs">
                              <span className="text-gray-400 uppercase">Total Factura:</span>
                              <span className="font-mono text-gray-900 text-sm font-black">RD${simSubtotal.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold gap-3">
                              <span className="text-gray-400 uppercase shrink-0">Recibido del cliente:</span>
                              <input
                                type="number"
                                value={simCashReceived}
                                onChange={e => setSimCashReceived(e.target.value)}
                                className="w-24 px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-right font-mono text-xs font-black"
                              />
                            </div>

                            <div className="flex justify-between items-center font-black text-xs p-3 bg-emerald-50 border border-emerald-100/60 rounded-xl">
                              <span className="text-emerald-700 uppercase">Cambio Exacto:</span>
                              <span className="font-mono text-emerald-850">RD${simChange.toFixed(2)}</span>
                            </div>

                            <button
                              onClick={() => {
                                setSimPaid(true);
                                setTimeout(() => setSimPaid(false), 2500);
                              }}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-[10px] uppercase tracking-widest border-0 cursor-pointer transition-all"
                            >
                              {simPaid ? '💰 ¡VENTA FICTICIA COMPLETADA!' : 'Completar Cobro Seguro'}
                            </button>
                          </div>
                        </div>

                        {/* Reembolsos de Seguridad */}
                        <div className="border border-gray-200 rounded-2.5xl p-5 bg-slate-50/60 text-left flex flex-col justify-between">
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <RotateCcw className="h-4 w-4 text-amber-500" />
                              Simulación de Reembolsos de Seguridad
                            </h4>

                            <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                              Por norma contra dolo, los cajeros tienen bloqueadas las devoluciones a menos que digiten el motivo e introduzcan la Contraseña Maestra de autorización: <span className="font-mono font-black text-gray-800 bg-white border border-gray-200 px-1.5 py-0.5 rounded">123456</span>.
                            </p>
                          </div>

                          <form onSubmit={handleSimRefund} className="space-y-3 mt-4">
                            <div>
                              <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Motivo detallado:</span>
                              <input
                                required
                                type="text"
                                value={simRefundReason}
                                onChange={e => setSimRefundReason(e.target.value)}
                                placeholder="Ej: Arroz con piedras, tique duplicado"
                                className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Clave de Seguridad (Clave Maestra: 123456):</span>
                              <input
                                required
                                type="password"
                                value={simRefundPassword}
                                onChange={e => setSimRefundPassword(e.target.value)}
                                placeholder="Escribe la clave secreta..."
                                className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs font-black outline-none font-mono focus:border-blue-500"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black rounded-xl text-[10px] uppercase tracking-widest border-0 cursor-pointer transition-all"
                            >
                              Autorizar Reembolso de Pruebas
                            </button>
                          </form>

                          {simRefundSuccess !== null && (
                            <div className={cn(
                              "p-3 rounded-xl border mt-3 text-xs font-extrabold flex items-center gap-2",
                              simRefundSuccess 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                : "bg-red-50 border-red-100 text-red-650"
                            )}>
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>
                                {simRefundSuccess 
                                  ? "✅ ¡APROBADO! Reembolso simulado en la bitácora." 
                                  : "❌ Clave Incorrecta. Intenta con 123456."}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => setShowSandboxModal(false)}
                        className="px-6 py-3 bg-gray-950 hover:bg-gray-900 text-white font-black rounded-xl text-[10px] uppercase tracking-widest border-0 cursor-pointer transition-all"
                      >
                        Cerrar Simulator y Regresar al Sistema
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
