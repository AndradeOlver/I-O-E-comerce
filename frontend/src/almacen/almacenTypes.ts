import { PosUiMode } from '../pos/posTypes';

export type WarehouseTab = 'despachos' | 'compras' | 'prestamos';

export type WarehouseDispatchStatus =
  | 'esperando_pago'
  | 'listo_empaque'
  | 'despachado'
  | 'intento_1_fallido'
  | 'entregado'
  | 'devuelto_almacen';

export interface WarehouseDispatchItem {
  sku: string;
  nombre: string;
  talla: string;
  color: string;
  cantidad: number;
  verificado: boolean;
}

export interface WarehouseDeliveryAttempt {
  numero: 1 | 2;
  fecha: string;
  resultado: 'entregado' | 'fallido';
  receptorNombre?: string;
  receptorDni?: string;
  observacion?: string;
}

export interface WarehouseDispatch {
  id: string;
  pedidoRef: string;
  canal: 'E-commerce' | 'Corporativo';
  clienteNombre: string;
  clienteDni: string;
  distrito: string;
  direccion: string;
  creadoEn: string;
  subtotal: number;
  flete: number;
  envioGratis: boolean;
  pagoConfirmado: boolean;
  status: WarehouseDispatchStatus;
  trackingCode?: string;
  courier?: string;
  guiaGeneradaEn?: string;
  items: WarehouseDispatchItem[];
  intentos: WarehouseDeliveryAttempt[];
}

export type PurchaseOrderStatus =
  | 'pendiente_aprobacion'
  | 'aprobada'
  | 'rechazada'
  | 'recibida_conforme'
  | 'bloqueada_inconformidad';

export interface PurchaseOrderItem {
  sku: string;
  nombre: string;
  talla: string;
  color: string;
  cantidadSolicitada: number;
  cantidadRecibida: number;
  cantidadDanada: number;
  costoUnitario: number;
}

export interface PurchaseOrder {
  id: string;
  proveedorNombre: string;
  proveedorRuc: string;
  creadoEn: string;
  solicitadoPor: string;
  aprobadoPor?: string;
  aprobadoEn?: string;
  guiaRemision?: string;
  recibidoEn?: string;
  pagoBloqueado: boolean;
  notaInconformidad?: string;
  status: PurchaseOrderStatus;
  totalEstimado: number;
  items: PurchaseOrderItem[];
}

export type WarehouseLoanStatus = 'en_consignacion' | 'devuelto' | 'liquidado_caja';

export type WarehouseSupplierStatus = 'pendiente_validacion' | 'aprobado' | 'rechazado';

export interface WarehouseSupplier {
  id: string;
  ruc: string;
  razonSocial: string;
  contacto: string;
  telefono: string;
  rubro: string;
  status: WarehouseSupplierStatus;
  creadoPor: string;
  creadoEn: string;
  validadoPor?: string;
  validadoEn?: string;
  motivoRechazo?: string;
}

export interface WarehouseLoanItem {
  sku: string;
  nombre: string;
  talla: string;
  color: string;
  cantidad: number;
  precioReferencia: number;
}

export interface WarehouseLoan {
  id: string;
  constanciaCodigo: string;
  tiendaAliada: string;
  ruc: string;
  contacto: string;
  fechaEmision: string;
  fechaLimite: string;
  gerenteDisponible: boolean;
  autorizadoPor: string;
  observacion?: string;
  status: WarehouseLoanStatus;
  montoTotal: number;
  items: WarehouseLoanItem[];
  cierreNota?: string;
  cerradoEn?: string;
  allyDebtId?: string;
}

export interface WarehouseAuditEntry {
  id: string;
  fecha: string;
  usuario: string;
  modulo: 'M03-Despachos' | 'M04-Compras' | 'M06-Prestamos' | 'Sistema';
  regla: string;
  detalle: string;
}

export interface WarehouseStoreState {
  version: 1;
  nextDispatchSeq: number;
  nextPurchaseSeq: number;
  nextLoanSeq: number;
  nextSupplierSeq?: number;
  dispatches: WarehouseDispatch[];
  purchases: PurchaseOrder[];
  loans: WarehouseLoan[];
  suppliers?: WarehouseSupplier[];
  auditLog: WarehouseAuditEntry[];
}

export type WarehousePrintDoc =
  | { kind: 'guia'; id: string }
  | { kind: 'constancia_prestamo'; id: string }
  | { kind: 'acta_compra'; id: string };

export interface WarehouseConsoleApi {
  modo: (nuevoModo?: PosUiMode) => PosUiMode;
  ayuda: () => void;
  estado: () => Record<string, unknown>;
  aprobarCompra: (purchaseId?: string, adminNombre?: string) => Record<string, unknown>;
  simularPagoDespacho: (dispatchId?: string) => Record<string, unknown>;
  escanearSiguiente: (dispatchId?: string) => Record<string, unknown>;
  reiniciarAlmacen: () => Record<string, unknown>;
}

declare global {
  interface Window {
    IO_ALMACEN?: WarehouseConsoleApi;
  }
}
