import { CATALOGO_PRODUCTOS } from '../data/catalogData';
import {
  PosAlternativeSuggestion,
  PosBroadcastEvent,
  PosCashMovement,
  PosDailySummary,
  PosInventoryItem,
  PosOrder,
  PosOrderItem,
  PosPaymentMethod,
  PosPaymentRecord,
  PosReceiptType,
  PosStoreState,
} from './posTypes';

const STORAGE_KEY = 'io_pos_state_v1';
const CHANNEL_NAME = 'io_pos_channel_v1';

export const POS_PAYMENT_LABELS: Record<PosPaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta (POS)',
  yape_plin: 'Yape / Plin',
  transferencia: 'Transferencia',
};

const BASE_INVENTORY: PosInventoryItem[] = CATALOGO_PRODUCTOS.flatMap((group) =>
  group.variants.map((variant) => ({
    producto_id: variant.producto_id,
    groupId: group.groupId,
    sku: variant.sku,
    nombre: group.nombre,
    marca: group.marca,
    categorySlug: group.categorySlug,
    talla: variant.talla,
    color: variant.color,
    colorHex: variant.colorHex,
    imageSlotKey: variant.imageSlotKey,
    alt_text: variant.alt_text,
    precio_venta: variant.precio_venta,
    stock: variant.stock,
    stock_minimo: variant.stock_minimo,
  }))
);

const BASE_BY_SKU = new Map<string, PosInventoryItem>(
  BASE_INVENTORY.map((item) => [item.sku, item])
);

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatPen(value: number): string {
  return `S/ ${roundMoney(value).toFixed(2)}`;
}

export function formatTimeShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildInitialInventoryMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of BASE_INVENTORY) {
    map[item.sku] = item.stock;
  }
  return map;
}

function createInitialState(): PosStoreState {
  return {
    version: 1,
    dayKey: getTodayKey(),
    nextOrderSeq: 1,
    nextBoletaSeq: 1,
    nextFacturaSeq: 1,
    inventory: buildInitialInventoryMap(),
    orders: [],
    movimientosCaja: [],
  };
}

let sharedChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!sharedChannel) {
    sharedChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return sharedChannel;
}

function emitEvent(event: PosBroadcastEvent): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage(event);
  }
}

export function loadPosState(): PosStoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<PosStoreState>;
    if (parsed.version !== 1 || !parsed.inventory || !Array.isArray(parsed.orders)) {
      const reset = createInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
      return reset;
    }
    const mergedInventory = buildInitialInventoryMap();
    for (const [sku, qty] of Object.entries(parsed.inventory)) {
      if (BASE_BY_SKU.has(sku) && typeof qty === 'number' && qty >= 0) {
        mergedInventory[sku] = qty;
      }
    }
    return {
      version: 1,
      dayKey: typeof parsed.dayKey === 'string' ? parsed.dayKey : getTodayKey(),
      nextOrderSeq: typeof parsed.nextOrderSeq === 'number' ? parsed.nextOrderSeq : 1,
      nextBoletaSeq: typeof parsed.nextBoletaSeq === 'number' ? parsed.nextBoletaSeq : 1,
      nextFacturaSeq: typeof parsed.nextFacturaSeq === 'number' ? parsed.nextFacturaSeq : 1,
      inventory: mergedInventory,
      orders: parsed.orders,
      movimientosCaja: Array.isArray(parsed.movimientosCaja) ? parsed.movimientosCaja : [],
    };
  } catch {
    return createInitialState();
  }
}

function savePosState(state: PosStoreState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function subscribePosEvents(callback: (event: PosBroadcastEvent) => void): () => void {
  const ch = getChannel();
  const handleChannel = (ev: MessageEvent<PosBroadcastEvent>) => {
    if (ev.data && typeof ev.data.type === 'string') {
      callback(ev.data);
    }
  };
  const handleStorage = (ev: StorageEvent) => {
    if (ev.key === STORAGE_KEY) {
      callback({ type: 'STATE_SYNC', timestamp: new Date().toISOString() });
    }
  };

  ch?.addEventListener('message', handleChannel);
  window.addEventListener('storage', handleStorage);

  return () => {
    ch?.removeEventListener('message', handleChannel);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getInventoryList(state: PosStoreState): PosInventoryItem[] {
  return BASE_INVENTORY.map((item) => ({
    ...item,
    stock: state.inventory[item.sku] ?? item.stock,
  }));
}

export function getSkuStock(state: PosStoreState, sku: string): number {
  if (sku in state.inventory) {
    return state.inventory[sku];
  }
  return BASE_BY_SKU.get(sku)?.stock ?? 0;
}

export function calculateOrderTotals(
  items: Pick<PosOrderItem, 'precio_unitario' | 'cantidad'>[],
  descuentoPct: number
): {
  subtotalBruto: number;
  descuentoMonto: number;
  total: number;
  opGravada: number;
  igv: number;
} {
  const subtotalBruto = roundMoney(
    items.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0)
  );
  const clampedPct = Math.max(0, Math.min(10, descuentoPct));
  const descuentoMonto = roundMoney(subtotalBruto * (clampedPct / 100));
  const total = roundMoney(Math.max(0, subtotalBruto - descuentoMonto));
  const opGravada = roundMoney(total / 1.18);
  const igv = roundMoney(total - opGravada);
  return { subtotalBruto, descuentoMonto, total, opGravada, igv };
}

export function findAlternativesForSku(
  sku: string,
  state: PosStoreState
): PosAlternativeSuggestion[] {
  const target = BASE_BY_SKU.get(sku);
  if (!target) return [];

  const all = getInventoryList(state).filter((item) => item.sku !== sku && item.stock > 0);
  const suggestions: PosAlternativeSuggestion[] = [];
  const usedSkus = new Set<string>();

  // 1. Otras tallas disponibles del mismo modelo y color
  for (const item of all) {
    if (item.groupId === target.groupId && item.color === target.color) {
      suggestions.push({ motivo: 'Otra talla disponible', item });
      usedSkus.add(item.sku);
    }
  }

  // 2. Otros colores del mismo modelo (priorizando misma talla)
  const sameModelOtherColor = all
    .filter((item) => item.groupId === target.groupId && !usedSkus.has(item.sku))
    .sort((a, b) => {
      const aMatch = a.talla === target.talla ? 0 : 1;
      const bMatch = b.talla === target.talla ? 0 : 1;
      return aMatch - bMatch;
    });
  for (const item of sameModelOtherColor) {
    suggestions.push({ motivo: 'Otro color disponible', item });
    usedSkus.add(item.sku);
  }

  // 3. Prendas similares de la misma categoría
  const sameCategory = all
    .filter((item) => item.categorySlug === target.categorySlug && !usedSkus.has(item.sku))
    .slice(0, 4);
  for (const item of sameCategory) {
    suggestions.push({ motivo: 'Prenda similar disponible', item });
    usedSkus.add(item.sku);
  }

  return suggestions;
}

export interface CreateOrderPayload {
  vendedorNombre: string;
  clienteReferencia: string;
  items: { sku: string; cantidad: number }[];
  descuentoPct: number;
  descuentoAutorizado: boolean;
  tipoComprobante?: PosReceiptType;
  clienteDoc?: string;
  clienteRazonSocial?: string;
  metodoPagoSolicitado?: PosPaymentMethod;
}

export function createAndSendOrder(
  payload: CreateOrderPayload
): { ok: true; order: PosOrder } | { ok: false; error: string } {
  const state = loadPosState();

  if (payload.items.length === 0) {
    return { ok: false, error: 'Agrega al menos una prenda antes de enviar a caja.' };
  }

  if (payload.descuentoPct < 0 || payload.descuentoPct > 10) {
    return { ok: false, error: 'El descuento máximo permitido en tienda es 10% (RN-VEN-03).' };
  }

  if (payload.descuentoPct > 0 && !payload.descuentoAutorizado) {
    return {
      ok: false,
      error: 'Marca la autorización del Dueño/Admin para aplicar descuento (RN-VEN-03).',
    };
  }

  const orderItems: PosOrderItem[] = [];
  for (const line of payload.items) {
    const base = BASE_BY_SKU.get(line.sku);
    if (!base) {
      return { ok: false, error: `SKU no encontrado: ${line.sku}` };
    }
    const available = getSkuStock(state, line.sku);
    if (line.cantidad <= 0) {
      return { ok: false, error: `Cantidad inválida para ${base.sku}.` };
    }
    if (available <= 0 || line.cantidad > available) {
      return {
        ok: false,
        error: `Stock insuficiente para ${base.sku} (${base.talla} / ${base.color}). Disponible: ${available}.`,
      };
    }
    orderItems.push({
      producto_id: base.producto_id,
      sku: base.sku,
      nombre: base.nombre,
      marca: base.marca,
      talla: base.talla,
      color: base.color,
      colorHex: base.colorHex,
      precio_unitario: base.precio_venta,
      cantidad: line.cantidad,
      subtotal: roundMoney(base.precio_venta * line.cantidad),
    });
  }

  const totals = calculateOrderTotals(orderItems, payload.descuentoPct);
  const orderId = `ORD-${String(state.nextOrderSeq).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const order: PosOrder = {
    id: orderId,
    creadoEn: now,
    vendedorNombre: payload.vendedorNombre.trim() || 'Vendedor Mostrador',
    clienteReferencia: payload.clienteReferencia.trim() || 'Cliente mostrador',
    items: orderItems,
    subtotalBruto: totals.subtotalBruto,
    descuentoPct: roundMoney(payload.descuentoPct),
    descuentoMonto: totals.descuentoMonto,
    descuentoAutorizado: payload.descuentoAutorizado,
    total: totals.total,
    opGravada: totals.opGravada,
    igv: totals.igv,
    status: 'pendiente_cobro',
    tipoComprobante: payload.tipoComprobante ?? 'boleta',
    clienteDoc: (payload.clienteDoc ?? '').trim(),
    clienteRazonSocial: (payload.clienteRazonSocial ?? '').trim() || 'Cliente Varios',
    metodoPagoSolicitado: payload.metodoPagoSolicitado,
    pagos: [],
    montoPagado: 0,
    saldoPendiente: totals.total,
    vuelto: 0,
  };

  if (order.tipoComprobante === 'factura') {
    const billingError = validateBillingForReceipt(order);
    if (billingError) {
      return { ok: false, error: billingError };
    }
  }

  state.nextOrderSeq += 1;
  state.orders.unshift(order);
  savePosState(state);
  emitEvent({ type: 'ORDER_CREATED', orderId: order.id, timestamp: now });

  return { ok: true, order };
}

export function updateOrderBilling(
  orderId: string,
  billing: {
    tipoComprobante: PosReceiptType;
    clienteDoc: string;
    clienteRazonSocial: string;
  }
): { ok: true; order: PosOrder } | { ok: false; error: string } {
  const state = loadPosState();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) {
    return { ok: false, error: `Orden ${orderId} no encontrada.` };
  }
  if (order.status !== 'pendiente_cobro') {
    return { ok: false, error: `La orden ${orderId} ya no está pendiente de cobro.` };
  }

  order.tipoComprobante = billing.tipoComprobante;
  order.clienteDoc = billing.clienteDoc.trim();
  order.clienteRazonSocial = billing.clienteRazonSocial.trim();
  savePosState(state);
  emitEvent({ type: 'STATE_SYNC', timestamp: new Date().toISOString() });
  return { ok: true, order };
}

function buildSimulatedRef(metodo: PosPaymentMethod): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  switch (metodo) {
    case 'efectivo':
      return `CAJA-EF-${rand}`;
    case 'tarjeta':
      return `SIM-POS-${rand}`;
    case 'yape_plin':
      return `SIM-YAPE-${rand}`;
    case 'transferencia':
      return `SIM-TRF-${rand}`;
  }
}

export function validateBillingForReceipt(order: PosOrder): string | null {
  const doc = order.clienteDoc.trim();
  const nombre = order.clienteRazonSocial.trim();
  if (order.tipoComprobante === 'factura') {
    if (!/^\d{11}$/.test(doc)) {
      return 'Para Factura ingresa un RUC válido de 11 dígitos (RN-TRI-02).';
    }
    if (nombre.length < 3) {
      return 'Para Factura ingresa la Razón Social del cliente (RN-TRI-02).';
    }
  } else {
    if (doc.length > 0 && !/^\d{8}$/.test(doc)) {
      return 'El DNI para Boleta debe tener 8 dígitos (o déjalo vacío para Cliente Varios).';
    }
  }
  return null;
}

export function recordPaymentOrAbono(params: {
  orderId: string;
  monto: number;
  metodo: PosPaymentMethod;
  tipo: 'pago' | 'abono_cuenta';
  nota?: string;
  cajeroNombre?: string;
}): { ok: true; order: PosOrder; settled: boolean } | { ok: false; error: string } {
  const state = loadPosState();
  const order = state.orders.find((o) => o.id === params.orderId);
  if (!order) {
    return { ok: false, error: `Orden ${params.orderId} no encontrada.` };
  }
  if (order.status !== 'pendiente_cobro') {
    return { ok: false, error: `La orden ${order.id} ya se encuentra en estado ${order.status}.` };
  }

  const monto = roundMoney(params.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: 'Ingresa un monto mayor a S/ 0.00.' };
  }

  const billingError = validateBillingForReceipt(order);
  if (billingError && roundMoney(order.montoPagado + monto) >= order.total) {
    return { ok: false, error: billingError };
  }

  // Verificar stock real antes de liquidar (RN-VEN-06)
  const willSettle = roundMoney(order.montoPagado + monto) >= order.total;
  if (willSettle) {
    for (const line of order.items) {
      const available = getSkuStock(state, line.sku);
      if (available < line.cantidad) {
        return {
          ok: false,
          error: `Stock insuficiente al cerrar cobro para ${line.sku}. Disponible: ${available}, requerido: ${line.cantidad}.`,
        };
      }
    }
  }

  const now = new Date().toISOString();
  const ref = buildSimulatedRef(params.metodo);
  const paymentRecord: PosPaymentRecord = {
    id: `PAY-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    fecha: now,
    metodo: params.metodo,
    monto,
    tipo: params.tipo,
    referencia: ref,
    nota: params.nota,
  };

  order.pagos.push(paymentRecord);
  const totalRecibido = roundMoney(order.montoPagado + monto);
  order.montoPagado = totalRecibido;

  let vuelto = 0;
  let ingresoNetoMovimiento = monto;

  if (willSettle) {
    if (totalRecibido > order.total) {
      if (params.metodo === 'efectivo') {
        vuelto = roundMoney(totalRecibido - order.total);
        ingresoNetoMovimiento = roundMoney(monto - vuelto);
      } else {
        vuelto = roundMoney(totalRecibido - order.total);
        ingresoNetoMovimiento = roundMoney(monto - vuelto);
      }
    }
    order.vuelto = vuelto;
    order.saldoPendiente = 0;
    order.status = 'cobrado';
    order.cobradoEn = now;
    order.cajeroNombre = params.cajeroNombre?.trim() || 'Diego Salazar';

    if (order.tipoComprobante === 'factura') {
      order.numeroComprobante = `F001-${String(state.nextFacturaSeq).padStart(6, '0')}`;
      state.nextFacturaSeq += 1;
    } else {
      order.numeroComprobante = `B001-${String(state.nextBoletaSeq).padStart(6, '0')}`;
      state.nextBoletaSeq += 1;
    }

    // Descuento definitivo de stock por SKU (RN-VEN-06)
    for (const line of order.items) {
      const current = getSkuStock(state, line.sku);
      state.inventory[line.sku] = Math.max(0, current - line.cantidad);
    }
  } else {
    order.saldoPendiente = roundMoney(order.total - totalRecibido);
  }

  const movement: PosCashMovement = {
    id: `MOV-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    fecha: now,
    orderId: order.id,
    numeroComprobante: order.numeroComprobante,
    tipo: willSettle ? 'ingreso_venta' : 'abono_cuenta',
    metodo: params.metodo,
    monto: ingresoNetoMovimiento,
    referencia: ref,
    nota: params.nota,
  };
  state.movimientosCaja.unshift(movement);

  savePosState(state);
  if (willSettle && order.numeroComprobante) {
    emitEvent({
      type: 'ORDER_PAID',
      orderId: order.id,
      numeroComprobante: order.numeroComprobante,
      timestamp: now,
    });
  } else {
    emitEvent({
      type: 'ORDER_ABONO',
      orderId: order.id,
      monto,
      timestamp: now,
    });
  }

  return { ok: true, order, settled: willSettle };
}

export function cancelOrder(
  orderId: string,
  motivo = 'Cancelada en caja'
): { ok: true; order: PosOrder } | { ok: false; error: string } {
  const state = loadPosState();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) {
    return { ok: false, error: `Orden ${orderId} no encontrada.` };
  }
  if (order.status === 'cobrado') {
    return { ok: false, error: 'No se puede cancelar una orden ya cobrada.' };
  }
  order.status = 'cancelado';
  order.motivoCancelacion = motivo;
  savePosState(state);
  emitEvent({ type: 'ORDER_CANCELLED', orderId: order.id, timestamp: new Date().toISOString() });
  return { ok: true, order };
}

export function emitSimulatedRejection(orderId: string, motivo: string): void {
  emitEvent({
    type: 'PAYMENT_REJECTED_SIM',
    orderId,
    motivo,
    timestamp: new Date().toISOString(),
  });
}

export function resetPosDay(): PosStoreState {
  const fresh = createInitialState();
  savePosState(fresh);
  emitEvent({ type: 'STATE_SYNC', timestamp: new Date().toISOString() });
  return fresh;
}

export function getDailySummary(state: PosStoreState): PosDailySummary {
  const porMetodo: Record<PosPaymentMethod, number> = {
    efectivo: 0,
    tarjeta: 0,
    yape_plin: 0,
    transferencia: 0,
  };

  for (const mov of state.movimientosCaja) {
    porMetodo[mov.metodo] = roundMoney(porMetodo[mov.metodo] + mov.monto);
  }

  const cobradas = state.orders.filter((o) => o.status === 'cobrado');
  const pendientes = state.orders.filter((o) => o.status === 'pendiente_cobro');

  const totalCobrado = roundMoney(
    state.movimientosCaja.reduce((acc, mov) => acc + mov.monto, 0)
  );
  const totalPendiente = roundMoney(
    pendientes.reduce((acc, o) => acc + o.saldoPendiente, 0)
  );
  const totalAbonosEnPendientes = roundMoney(
    pendientes.reduce((acc, o) => acc + o.montoPagado, 0)
  );
  const igvTotal = roundMoney(cobradas.reduce((acc, o) => acc + o.igv, 0));

  return {
    totalCobrado,
    cantidadVentas: cobradas.length,
    totalPendiente,
    cantidadPendientes: pendientes.length,
    porMetodo,
    totalAbonosEnPendientes,
    igvTotal,
  };
}

export function pickRandomAvailableItem(
  state: PosStoreState,
  reservedBySku?: Record<string, number>
): PosInventoryItem | null {
  const candidates = getInventoryList(state).filter(
    (item) => item.stock - (reservedBySku?.[item.sku] ?? 0) > 0
  );
  if (candidates.length === 0) return null;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] ?? null;
}
