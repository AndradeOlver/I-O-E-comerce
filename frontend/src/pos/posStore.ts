import { CATALOGO_PRODUCTOS } from '../data/catalogData';
import {
  PosAllyDebt,
  PosAllyDebtType,
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
  PosUiMode,
} from './posTypes';

const STORAGE_KEY = 'io_pos_state_v1';
const MODE_STORAGE_KEY = 'io_pos_mode_v1';
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

function addDaysIso(offsetDays: number): string {
  const dt = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return dt.toISOString();
}

function buildInitialAllyDebts(): PosAllyDebt[] {
  return [
    {
      id: 'ALI-001',
      negocioNombre: 'Boutique Miraflores Moda S.A.C.',
      ruc: '20601234567',
      contacto: 'Valeria Paredes · 987 452 110',
      tipo: 'consignacion',
      fechaEmision: addDaysIso(-4),
      fechaVencimiento: addDaysIso(3),
      descripcionPrendas: '6× Polo Oversize Pima Studio, 2× Casaca Bomber Urbano',
      autorizadoPor: 'Mateo Quispe (Almacén · RN-PRE-01)',
      montoTotal: 480,
      montoPagado: 0,
      saldoPendiente: 480,
      status: 'pendiente',
      pagos: [],
    },
    {
      id: 'ALI-002',
      negocioNombre: 'Galería Sur Textil E.I.R.L.',
      ruc: '20559876543',
      contacto: 'Carlos Mendoza · 991 330 812',
      tipo: 'consignacion',
      fechaEmision: addDaysIso(-9),
      fechaVencimiento: addDaysIso(-2),
      descripcionPrendas: '4× Camisa Lino Clásica, 2× Pantalón Cargo Índigo',
      autorizadoPor: 'Lucía Benavides (Admin)',
      montoTotal: 320,
      montoPagado: 120,
      saldoPendiente: 200,
      status: 'pendiente',
      pagos: [
        {
          id: 'PAY-INIT-001',
          fecha: addDaysIso(-3),
          metodo: 'transferencia',
          monto: 120,
          tipo: 'abono_cuenta',
          referencia: 'TRF-ALI-1024',
          nota: 'Primer abono parcial',
        },
      ],
    },
    {
      id: 'ALI-003',
      negocioNombre: 'Atelier Barranco Asociados S.A.C.',
      ruc: '20608877661',
      contacto: 'Andrea Rivas · 955 218 409',
      tipo: 'credito',
      fechaEmision: addDaysIso(-3),
      fechaVencimiento: addDaysIso(12),
      descripcionPrendas: '5× Vestido Midi Satén, 3× Blusa Seda Minimal',
      autorizadoPor: 'Lucía Benavides (Admin)',
      montoTotal: 750,
      montoPagado: 250,
      saldoPendiente: 500,
      status: 'pendiente',
      pagos: [
        {
          id: 'PAY-INIT-002',
          fecha: addDaysIso(-1),
          metodo: 'yape_plin',
          monto: 250,
          tipo: 'abono_cuenta',
          referencia: 'YAPE-ALI-8841',
          nota: 'Adelanto inicial',
        },
      ],
    },
  ];
}

function createInitialState(): PosStoreState {
  return {
    version: 1,
    dayKey: getTodayKey(),
    nextOrderSeq: 1,
    nextBoletaSeq: 1,
    nextFacturaSeq: 1,
    nextAllySeq: 4,
    inventory: buildInitialInventoryMap(),
    orders: [],
    allyDebts: buildInitialAllyDebts(),
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
      nextAllySeq: typeof parsed.nextAllySeq === 'number' ? parsed.nextAllySeq : 4,
      inventory: mergedInventory,
      orders: parsed.orders,
      allyDebts: Array.isArray(parsed.allyDebts) ? parsed.allyDebts : buildInitialAllyDebts(),
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

export function getPosUiMode(): PosUiMode {
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY) === 'practica' ? 'practica' : 'operacion';
  } catch {
    return 'operacion';
  }
}

export function setPosUiMode(mode: PosUiMode): PosUiMode {
  const normalized: PosUiMode = mode === 'practica' ? 'practica' : 'operacion';
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, normalized);
  } catch {
    // Ignorar si localStorage está restringido
  }
  const now = new Date().toISOString();
  emitEvent({ type: 'MODE_CHANGED', mode: normalized, timestamp: now });
  window.dispatchEvent(new CustomEvent<PosUiMode>('io-pos-mode-change', { detail: normalized }));
  return normalized;
}

export function subscribePosMode(listener: (mode: PosUiMode) => void): () => void {
  const ch = getChannel();
  const handleCustom = (ev: Event) => {
    const custom = ev as CustomEvent<PosUiMode>;
    listener(custom.detail === 'practica' ? 'practica' : 'operacion');
  };
  const handleStorage = (ev: StorageEvent) => {
    if (ev.key === MODE_STORAGE_KEY) {
      listener(getPosUiMode());
    }
  };
  const handleChannel = (ev: MessageEvent<PosBroadcastEvent>) => {
    if (ev.data?.type === 'MODE_CHANGED') {
      listener(ev.data.mode);
    }
  };

  window.addEventListener('io-pos-mode-change', handleCustom);
  window.addEventListener('storage', handleStorage);
  ch?.addEventListener('message', handleChannel);

  return () => {
    window.removeEventListener('io-pos-mode-change', handleCustom);
    window.removeEventListener('storage', handleStorage);
    ch?.removeEventListener('message', handleChannel);
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

const ALPHA_SIZE_SCALE = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

function getSizeDistance(a: string, b: string): number {
  const normA = a.trim().toUpperCase();
  const normB = b.trim().toUpperCase();
  if (normA === normB) return 0;

  const numA = Number(normA);
  const numB = Number(normB);
  if (Number.isFinite(numA) && Number.isFinite(numB) && normA !== '' && normB !== '') {
    return Math.abs(numA - numB);
  }

  const idxA = ALPHA_SIZE_SCALE.indexOf(normA as (typeof ALPHA_SIZE_SCALE)[number]);
  const idxB = ALPHA_SIZE_SCALE.indexOf(normB as (typeof ALPHA_SIZE_SCALE)[number]);
  if (idxA !== -1 && idxB !== -1) {
    return Math.abs(idxA - idxB);
  }

  return 99;
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

  // 1. Tallas más cercanas del mismo modelo y color
  const sameColorBySize = all
    .filter((item) => item.groupId === target.groupId && item.color === target.color)
    .sort((a, b) => getSizeDistance(a.talla, target.talla) - getSizeDistance(b.talla, target.talla));
  for (const item of sameColorBySize) {
    suggestions.push({ motivo: 'Talla similar disponible', item });
    usedSkus.add(item.sku);
  }

  // 2. Otros colores del mismo modelo (primero misma talla, luego talla más cercana)
  const sameModelOtherColor = all
    .filter((item) => item.groupId === target.groupId && !usedSkus.has(item.sku))
    .sort((a, b) => getSizeDistance(a.talla, target.talla) - getSizeDistance(b.talla, target.talla));
  for (const item of sameModelOtherColor) {
    const isExactSize = item.talla.trim().toUpperCase() === target.talla.trim().toUpperCase();
    suggestions.push({
      motivo: isExactSize ? 'Misma talla en otro color' : 'Otro color disponible',
      item,
    });
    usedSkus.add(item.sku);
  }

  // 3. Prendas similares de la misma categoría ordenadas por talla más cercana
  const sameCategory = all
    .filter((item) => item.categorySlug === target.categorySlug && !usedSkus.has(item.sku))
    .sort((a, b) => getSizeDistance(a.talla, target.talla) - getSizeDistance(b.talla, target.talla))
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
  const pendingAllies = state.allyDebts.filter((d) => d.status === 'pendiente');
  const totalDeudaAliados = roundMoney(
    pendingAllies.reduce((acc, d) => acc + d.saldoPendiente, 0)
  );

  return {
    totalCobrado,
    cantidadVentas: cobradas.length,
    totalPendiente,
    cantidadPendientes: pendientes.length,
    porMetodo,
    totalAbonosEnPendientes,
    igvTotal,
    totalDeudaAliados,
    cantidadDeudasAliados: pendingAllies.length,
  };
}

export function createAllyDebt(payload: {
  negocioNombre: string;
  ruc: string;
  contacto: string;
  tipo: PosAllyDebtType;
  diasPlazo: number;
  descripcionPrendas: string;
  montoTotal: number;
  autorizadoPor: string;
}): { ok: true; debt: PosAllyDebt } | { ok: false; error: string } {
  const negocioNombre = payload.negocioNombre.trim();
  const ruc = payload.ruc.trim();
  const descripcionPrendas = payload.descripcionPrendas.trim();
  const montoTotal = roundMoney(payload.montoTotal);

  if (negocioNombre.length < 3) {
    return { ok: false, error: 'Ingresa el nombre o razón social del negocio aliado.' };
  }
  if (!/^\d{11}$/.test(ruc)) {
    return { ok: false, error: 'El RUC del negocio aliado debe tener 11 dígitos.' };
  }
  if (descripcionPrendas.length < 3) {
    return { ok: false, error: 'Detalla las prendas entregadas en préstamo o crédito.' };
  }
  if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
    return { ok: false, error: 'Ingresa un monto total mayor a S/ 0.00.' };
  }
  if (payload.tipo === 'consignacion' && (payload.diasPlazo < 1 || payload.diasPlazo > 7)) {
    return {
      ok: false,
      error: 'Los préstamos en consignación tienen un plazo máximo de 7 días calendario (RN-PRE-02).',
    };
  }

  const effectiveDays = Math.max(1, Math.min(payload.tipo === 'consignacion' ? 7 : 60, payload.diasPlazo));
  const state = loadPosState();
  const id = `ALI-${String(state.nextAllySeq).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const debt: PosAllyDebt = {
    id,
    negocioNombre,
    ruc,
    contacto: payload.contacto.trim() || 'Sin contacto registrado',
    tipo: payload.tipo,
    fechaEmision: now,
    fechaVencimiento: addDaysIso(effectiveDays),
    descripcionPrendas,
    autorizadoPor: payload.autorizadoPor.trim() || 'Colaborador I&O',
    montoTotal,
    montoPagado: 0,
    saldoPendiente: montoTotal,
    status: 'pendiente',
    pagos: [],
  };

  state.nextAllySeq += 1;
  state.allyDebts.unshift(debt);
  savePosState(state);
  emitEvent({ type: 'STATE_SYNC', timestamp: now });
  return { ok: true, debt };
}

export function recordAllyDebtPayment(params: {
  debtId: string;
  monto: number;
  metodo: PosPaymentMethod;
  nota?: string;
}): { ok: true; debt: PosAllyDebt; settled: boolean } | { ok: false; error: string } {
  const state = loadPosState();
  const debt = state.allyDebts.find((d) => d.id === params.debtId);
  if (!debt) {
    return { ok: false, error: `Cuenta ${params.debtId} no encontrada.` };
  }
  if (debt.status !== 'pendiente') {
    return { ok: false, error: `La cuenta ${debt.id} ya está liquidada.` };
  }

  const requested = roundMoney(params.monto);
  if (!Number.isFinite(requested) || requested <= 0) {
    return { ok: false, error: 'Ingresa un monto válido mayor a S/ 0.00.' };
  }

  const applied = Math.min(requested, debt.saldoPendiente);
  const now = new Date().toISOString();
  const ref = buildSimulatedRef(params.metodo);

  debt.pagos.push({
    id: `PAY-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    fecha: now,
    metodo: params.metodo,
    monto: applied,
    tipo: 'abono_cuenta',
    referencia: ref,
    nota: params.nota?.trim() || undefined,
  });

  debt.montoPagado = roundMoney(debt.montoPagado + applied);
  debt.saldoPendiente = roundMoney(Math.max(0, debt.montoTotal - debt.montoPagado));
  const settled = debt.saldoPendiente <= 0;
  if (settled) {
    debt.status = 'pagado';
  }

  state.movimientosCaja.unshift({
    id: `MOV-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    fecha: now,
    orderId: debt.id,
    tipo: 'abono_aliado',
    metodo: params.metodo,
    monto: applied,
    referencia: ref,
    nota: `${debt.negocioNombre}${params.nota ? ` · ${params.nota}` : ''}`,
  });

  savePosState(state);
  emitEvent({ type: 'STATE_SYNC', timestamp: now });
  return { ok: true, debt, settled };
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
