import { CategorySlug } from '../types/store.types';

export type PosPaymentMethod = 'efectivo' | 'tarjeta' | 'yape_plin' | 'transferencia';
export type PosReceiptType = 'boleta' | 'factura';
export type PosOrderStatus = 'pendiente_cobro' | 'cobrado' | 'cancelado';
export type PosUiMode = 'operacion' | 'practica';
export type PosAllyDebtType = 'consignacion' | 'credito';
export type PosAllyDebtStatus = 'pendiente' | 'pagado';

export interface PosInventoryItem {
  producto_id: number;
  groupId: string;
  sku: string;
  nombre: string;
  marca: string;
  categorySlug: Exclude<CategorySlug, 'todas'>;
  talla: string;
  color: string;
  colorHex: string;
  imageSlotKey: string;
  alt_text: string;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
}

export interface PosOrderItem {
  producto_id: number;
  sku: string;
  nombre: string;
  marca: string;
  talla: string;
  color: string;
  colorHex: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface PosPaymentRecord {
  id: string;
  fecha: string;
  metodo: PosPaymentMethod;
  monto: number;
  tipo: 'pago' | 'abono_cuenta';
  referencia: string;
  nota?: string;
}

export interface PosOrder {
  id: string;
  creadoEn: string;
  vendedorNombre: string;
  clienteReferencia: string;
  items: PosOrderItem[];
  subtotalBruto: number;
  descuentoPct: number;
  descuentoMonto: number;
  descuentoAutorizado: boolean;
  total: number;
  opGravada: number;
  igv: number;
  status: PosOrderStatus;
  tipoComprobante: PosReceiptType;
  clienteDoc: string;
  clienteRazonSocial: string;
  metodoPagoSolicitado?: PosPaymentMethod;
  numeroComprobante?: string;
  pagos: PosPaymentRecord[];
  montoPagado: number;
  saldoPendiente: number;
  vuelto: number;
  cobradoEn?: string;
  cajeroNombre?: string;
  motivoCancelacion?: string;
}

export interface PosAllyDebt {
  id: string;
  negocioNombre: string;
  ruc: string;
  contacto: string;
  tipo: PosAllyDebtType;
  fechaEmision: string;
  fechaVencimiento: string;
  descripcionPrendas: string;
  autorizadoPor: string;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  status: PosAllyDebtStatus;
  pagos: PosPaymentRecord[];
}

export interface PosCashMovement {
  id: string;
  fecha: string;
  orderId: string;
  numeroComprobante?: string;
  tipo: 'ingreso_venta' | 'abono_cuenta' | 'abono_aliado';
  metodo: PosPaymentMethod;
  monto: number;
  referencia: string;
  nota?: string;
}

export interface PosStoreState {
  version: 1;
  dayKey: string;
  nextOrderSeq: number;
  nextBoletaSeq: number;
  nextFacturaSeq: number;
  nextAllySeq: number;
  inventory: Record<string, number>;
  orders: PosOrder[];
  allyDebts: PosAllyDebt[];
  movimientosCaja: PosCashMovement[];
}

export type PosBroadcastEvent =
  | { type: 'ORDER_CREATED'; orderId: string; timestamp: string }
  | { type: 'ORDER_ABONO'; orderId: string; monto: number; timestamp: string }
  | { type: 'ORDER_PAID'; orderId: string; numeroComprobante: string; timestamp: string }
  | { type: 'ORDER_CANCELLED'; orderId: string; timestamp: string }
  | { type: 'PAYMENT_REJECTED_SIM'; orderId: string; motivo: string; timestamp: string }
  | { type: 'MODE_CHANGED'; mode: PosUiMode; timestamp: string }
  | { type: 'STATE_SYNC'; timestamp: string };

export interface PosDailySummary {
  totalCobrado: number;
  cantidadVentas: number;
  totalPendiente: number;
  cantidadPendientes: number;
  porMetodo: Record<PosPaymentMethod, number>;
  totalAbonosEnPendientes: number;
  igvTotal: number;
  totalDeudaAliados: number;
  cantidadDeudasAliados: number;
}

export interface PosAlternativeSuggestion {
  motivo:
    | 'Talla similar disponible'
    | 'Misma talla en otro color'
    | 'Otro color disponible'
    | 'Prenda similar disponible';
  item: PosInventoryItem;
}

export interface PosConsoleApi {
  modo: (nuevoModo?: PosUiMode) => PosUiMode;
  ayuda: () => void;
  estado: () => Record<string, unknown>;
  pagar: (monto?: number, metodo?: PosPaymentMethod, ordenId?: string) => Record<string, unknown>;
  abonar: (
    monto: number,
    metodo?: PosPaymentMethod,
    ordenId?: string,
    nota?: string
  ) => Record<string, unknown>;
  simularRechazo: (motivo?: string, ordenId?: string) => Record<string, unknown>;
  reiniciarDia: () => Record<string, unknown>;
}

declare global {
  interface Window {
    IO_POS?: PosConsoleApi;
    posPago?: PosConsoleApi;
    ioPos?: PosConsoleApi;
  }
}
