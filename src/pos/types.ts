export enum UserRole {
  ADMIN = 'admin',
  CAJERO = 'cajero',
  SUPERVISOR = 'supervisor',
}

// Dueño registrado en el sistema
export interface Owner {
  id: string;
  nombre: string;
  correo: string;
  password_hash?: string;
  fecha_creacion: string;
}

// Empleado de un negocio
export interface Employee {
  id: string;
  nombre: string;
  username: string;
  password_hash?: string;
  rol: UserRole.CAJERO | UserRole.SUPERVISOR;
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
}

// Negocio creado por un dueño
export interface Business {
  id: string;
  codigo: string; // Ej: SOL-001
  nombre: string;
  owner_id: string;
  employees: Employee[];
  fecha_creacion: string;
}

// Sesión activa (puede ser dueño o empleado)
export interface UserProfile {
  id: string;
  nombre: string;
  correo?: string;
  username?: string;
  rol: UserRole;
  estado: 'activo' | 'inactivo';
  fecha_creacion: any;
  // Contexto del negocio activo
  business_id?: string;
  business_nombre?: string;
  business_codigo?: string;
  owner_id?: string; // Propio (si es dueño) o del negocio (si es empleado)
}



export enum UnitType {
  UNIDAD = 'Unidad',
  PAQUETE = 'Paquete',
  CAJA = 'Caja',
  LIBRA = 'Libra',
  KILOGRAMO = 'Kilogramo',
  LITRO = 'Litro',
}

export interface Product {
  id: string;
  nombre: string;
  codigo_barra: string;
  categoria: string;
  marca: string;
  costo_compra: number;
  precio_venta: number;
  cantidad_disponible: number;
  stock_minimo: number;
  unidad_venta: UnitType;
  estado: 'activo' | 'inactivo';
  fecha_creacion: any;
  fecha_actualizacion: any;
}

export interface Sale {
  id: string;
  codigo_recibo: string;
  usuario_id: string;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  costo_total?: number;
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Mixto' | 'A Crédito (Fiao)';
  monto_recibido: number;
  cambio: number;
  estado: 'completada' | 'cancelada' | 'reembolsada';
  fecha: any;
  turno_id: string;
  cliente_id?: string; // ID del cliente si es fiao o si se vinculó la venta
}

export interface Expense {
  id: string;
  descripcion: string;
  monto: number;
  categoria: 'Salario' | 'Alquiler' | 'Servicios' | 'Mantenimiento' | 'Compras de Mercancía' | 'Otros';
  fecha: any;
  usuario_id: string;
  usuario_nombre?: string;
  pagado_desde_caja?: boolean;
  turno_id?: string;
  fuente_pago?: 'Caja' | 'Banco' | 'Inversion Externa';
  es_compra_mercancia?: boolean;
  producto_id?: string; // Reference to product if it's a purchase
}

export interface DenominationBreakdown {
  b2000: number;
  b1000: number;
  b500: number;
  b200: number;
  b100: number;
  b50: number;
  m25: number;
  m10: number;
  m5: number;
  m1: number;
  otros: number;
}

export enum ShiftStatus {
  ABIERTO = 'abierto',
  CERRADO = 'cerrado',
  REVISADO = 'revisado',
  APROBADO = 'aprobado',
  CON_DIFERENCIA = 'con_diferencia'
}

export interface Shift {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  fecha_apertura: any;
  fecha_cierre?: any;
  monto_inicial: number;
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_mixto: number;
  total_reembolsos: number;
  total_cancelaciones: number;
  total_entradas: number;
  total_salidas: number;
  monto_esperado: number;
  monto_contado?: number;
  diferencia?: number;
  desglose_denominaciones?: DenominationBreakdown;
  motivo_diferencia?: string;
  nota_admin?: string;
  estado: ShiftStatus;
  revisado_por?: string;
  fecha_revision?: any;
  fecha_creacion: any;
  fecha_actualizacion: any;
}

export interface CashMovement {
  id: string;
  turno_id: string;
  usuario_id: string;
  tipo: 'entrada' | 'salida';
  monto: number;
  motivo: string;
  autorizado_por?: string;
  fecha: any;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  limite_credito: number;
  deuda_actual: number;
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
}

export interface PagoCliente {
  id: string;
  cliente_id: string;
  monto: number;
  motivo: string; // ej: "Abono a cuenta", "Pago total"
  usuario_id: string;
  usuario_nombre?: string;
  fecha: string;
}
