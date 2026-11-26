import {
  adjustSkuStock,
  createAllyDebt,
  getInventoryList,
  loadPosState,
  roundMoney,
} from '../pos/posStore';
import { PosInventoryItem } from '../pos/posTypes';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  WarehouseAuditEntry,
  WarehouseDispatch,
  WarehouseLoan,
  WarehouseLoanItem,
  WarehouseStoreState,
  WarehouseSupplier,
} from './almacenTypes';

const STORAGE_KEY = 'io_almacen_state_v1';
const CHANNEL_NAME = 'io_almacen_channel_v1';

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

function emitSync(): void {
  getChannel()?.postMessage({ type: 'ALMACEN_SYNC', timestamp: new Date().toISOString() });
}

function addDaysIso(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();
}

function addAudit(
  state: WarehouseStoreState,
  usuario: string,
  modulo: WarehouseAuditEntry['modulo'],
  regla: string,
  detalle: string
): void {
  state.auditLog.unshift({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    fecha: new Date().toISOString(),
    usuario: usuario.trim() || 'Mateo Quispe',
    modulo,
    regla,
    detalle,
  });
  if (state.auditLog.length > 80) {
    state.auditLog.length = 80;
  }
}

function buildSeedDispatches(inv: PosInventoryItem[]): WarehouseDispatch[] {
  const byIndex = (idx: number): PosInventoryItem => inv[idx % inv.length];
  const p0 = byIndex(0);
  const p1 = byIndex(3);
  const p2 = byIndex(6);
  const p3 = byIndex(9);

  const sub1 = roundMoney(p0.precio_venta * 2 + p1.precio_venta);
  const sub2 = roundMoney(p2.precio_venta);
  const sub3 = roundMoney(p3.precio_venta * 2);

  return [
    {
      id: 'DSP-001',
      pedidoRef: 'WEB-2026-0412',
      canal: 'E-commerce',
      clienteNombre: 'Valeria Mendoza',
      clienteDni: '72849103',
      distrito: 'Miraflores',
      direccion: 'Av. José Pardo 640, Dpto 402',
      creadoEn: addDaysIso(-0.2),
      subtotal: sub1,
      flete: sub1 > 150 ? 0 : 12,
      envioGratis: sub1 > 150,
      pagoConfirmado: true,
      status: 'listo_empaque',
      items: [
        {
          sku: p0.sku,
          nombre: p0.nombre,
          talla: p0.talla,
          color: p0.color,
          cantidad: 2,
          verificado: false,
        },
        {
          sku: p1.sku,
          nombre: p1.nombre,
          talla: p1.talla,
          color: p1.color,
          cantidad: 1,
          verificado: false,
        },
      ],
      intentos: [],
    },
    {
      id: 'DSP-002',
      pedidoRef: 'WEB-2026-0415',
      canal: 'E-commerce',
      clienteNombre: 'Rodrigo Salgado',
      clienteDni: '45912038',
      distrito: 'Surco',
      direccion: 'Jr. Monte Rosa 218',
      creadoEn: addDaysIso(-0.08),
      subtotal: sub2,
      flete: sub2 > 150 ? 0 : 12,
      envioGratis: sub2 > 150,
      pagoConfirmado: false,
      status: 'esperando_pago',
      items: [
        {
          sku: p2.sku,
          nombre: p2.nombre,
          talla: p2.talla,
          color: p2.color,
          cantidad: 1,
          verificado: false,
        },
      ],
      intentos: [],
    },
    {
      id: 'DSP-003',
      pedidoRef: 'WEB-2026-0401',
      canal: 'E-commerce',
      clienteNombre: 'Camila Navarro',
      clienteDni: '70123844',
      distrito: 'San Isidro',
      direccion: 'Calle Los Libertadores 315',
      creadoEn: addDaysIso(-1),
      subtotal: sub3,
      flete: sub3 > 150 ? 0 : 12,
      envioGratis: sub3 > 150,
      pagoConfirmado: true,
      status: 'despachado',
      trackingCode: 'IO-TRK-884120',
      courier: 'Olva / Urbano Express',
      guiaGeneradaEn: addDaysIso(-0.8),
      items: [
        {
          sku: p3.sku,
          nombre: p3.nombre,
          talla: p3.talla,
          color: p3.color,
          cantidad: 2,
          verificado: true,
        },
      ],
      intentos: [],
    },
  ];
}

function buildSeedPurchases(inv: PosInventoryItem[]): PurchaseOrder[] {
  const lowItems = inv.filter((i) => i.stock <= i.stock_minimo);
  const a = lowItems[0] ?? inv[0];
  const b = lowItems[1] ?? inv[4];
  const c = inv[2];

  const est1 = roundMoney(a.precio_venta * 0.55 * 10 + b.precio_venta * 0.55 * 8);
  const est2 = roundMoney(c.precio_venta * 0.55 * 12);

  return [
    {
      id: 'OC-2026-019',
      proveedorNombre: 'Textiles Pima Perú S.A.C.',
      proveedorRuc: '20541122334',
      creadoEn: addDaysIso(-2),
      solicitadoPor: 'Mateo Quispe',
      aprobadoPor: 'Lucía Benavides (Admin)',
      aprobadoEn: addDaysIso(-1.5),
      pagoBloqueado: false,
      status: 'aprobada',
      totalEstimado: est1,
      items: [
        {
          sku: a.sku,
          nombre: a.nombre,
          talla: a.talla,
          color: a.color,
          cantidadSolicitada: 10,
          cantidadRecibida: 10,
          cantidadDanada: 0,
          costoUnitario: roundMoney(a.precio_venta * 0.55),
        },
        {
          sku: b.sku,
          nombre: b.nombre,
          talla: b.talla,
          color: b.color,
          cantidadSolicitada: 8,
          cantidadRecibida: 8,
          cantidadDanada: 0,
          costoUnitario: roundMoney(b.precio_venta * 0.55),
        },
      ],
    },
    {
      id: 'OC-2026-020',
      proveedorNombre: 'Confecciones Andinas E.I.R.L.',
      proveedorRuc: '20603344551',
      creadoEn: addDaysIso(-0.3),
      solicitadoPor: 'Mateo Quispe',
      pagoBloqueado: false,
      status: 'pendiente_aprobacion',
      totalEstimado: est2,
      items: [
        {
          sku: c.sku,
          nombre: c.nombre,
          talla: c.talla,
          color: c.color,
          cantidadSolicitada: 12,
          cantidadRecibida: 0,
          cantidadDanada: 0,
          costoUnitario: roundMoney(c.precio_venta * 0.55),
        },
      ],
    },
  ];
}

function buildSeedLoans(inv: PosInventoryItem[]): WarehouseLoan[] {
  const p1 = inv[1] ?? inv[0];
  const p2 = inv[5] ?? inv[0];
  const m1 = roundMoney(p1.precio_venta * 3);
  const m2 = roundMoney(p2.precio_venta * 2);

  return [
    {
      id: 'PRE-001',
      constanciaCodigo: 'CONST-PRE-001',
      tiendaAliada: 'Boutique Miraflores Moda S.A.C.',
      ruc: '20601234567',
      contacto: 'Valeria Paredes · 987 452 110',
      fechaEmision: addDaysIso(-3),
      fechaLimite: addDaysIso(4),
      gerenteDisponible: false,
      autorizadoPor: 'Mateo Quispe (Almacenero · RN-PRE-01)',
      observacion: 'Reposición de exhibición fin de semana (gerente en reunión externa).',
      status: 'en_consignacion',
      montoTotal: m1,
      items: [
        {
          sku: p1.sku,
          nombre: p1.nombre,
          talla: p1.talla,
          color: p1.color,
          cantidad: 3,
          precioReferencia: p1.precio_venta,
        },
      ],
    },
    {
      id: 'PRE-002',
      constanciaCodigo: 'CONST-PRE-002',
      tiendaAliada: 'Galería Sur Textil E.I.R.L.',
      ruc: '20559876543',
      contacto: 'Carlos Mendoza · 991 330 812',
      fechaEmision: addDaysIso(-8),
      fechaLimite: addDaysIso(-1),
      gerenteDisponible: true,
      autorizadoPor: 'Lucía Benavides (Admin / Gerente)',
      observacion: 'Consignación comercial de 7 días.',
      status: 'en_consignacion',
      montoTotal: m2,
      items: [
        {
          sku: p2.sku,
          nombre: p2.nombre,
          talla: p2.talla,
          color: p2.color,
          cantidad: 2,
          precioReferencia: p2.precio_venta,
        },
      ],
    },
  ];
}

function createSeedSuppliers(): WarehouseSupplier[] {
  return [
    {
      id: 'PROV-001',
      ruc: '20548796321',
      razonSocial: 'Textiles Andinos del Sur SAC',
      contacto: 'Rosa Valverde',
      telefono: '987654321',
      rubro: 'Algodón Pima y tejido de punto',
      status: 'aprobado',
      creadoPor: 'Lucía Benavides (Admin)',
      creadoEn: addDaysIso(-3),
      validadoPor: 'Lucía Benavides (Admin)',
      validadoEn: addDaysIso(-3),
    },
    {
      id: 'PROV-002',
      ruc: '20601234567',
      razonSocial: 'Confecciones Lima Centro EIRL',
      contacto: 'Carlos Paredes',
      telefono: '991234567',
      rubro: 'Denim, cargos y casacas urbanas',
      status: 'aprobado',
      creadoPor: 'Mateo Quispe (Almacenero)',
      creadoEn: addDaysIso(-2),
      validadoPor: 'Lucía Benavides (Admin)',
      validadoEn: addDaysIso(-2),
    },
    {
      id: 'PROV-003',
      ruc: '20601984512',
      razonSocial: 'Confecciones Miraflores EIRL',
      contacto: 'Elena Chávez',
      telefono: '984512369',
      rubro: 'Vestidos satinados y sastrería femenina',
      status: 'pendiente_validacion',
      creadoPor: 'Mateo Quispe (Almacenero)',
      creadoEn: addDaysIso(0),
    },
  ];
}

function createInitialState(): WarehouseStoreState {
  const inv = getInventoryList(loadPosState());
  return {
    version: 1,
    nextDispatchSeq: 4,
    nextPurchaseSeq: 21,
    nextLoanSeq: 3,
    nextSupplierSeq: 4,
    dispatches: buildSeedDispatches(inv),
    purchases: buildSeedPurchases(inv),
    loans: buildSeedLoans(inv),
    suppliers: createSeedSuppliers(),
    auditLog: [
      {
        id: 'AUD-INIT-01',
        fecha: addDaysIso(-3),
        usuario: 'Mateo Quispe',
        modulo: 'M06-Prestamos',
        regla: 'RN-PRE-01',
        detalle: 'Constancia CONST-PRE-001 emitida por Almacenero en ausencia de Gerente (plazo 7 días).',
      },
    ],
  };
}

export function loadWarehouseState(): WarehouseStoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<WarehouseStoreState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.dispatches)) {
      const fresh = createInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return {
      version: 1,
      nextDispatchSeq: typeof parsed.nextDispatchSeq === 'number' ? parsed.nextDispatchSeq : 4,
      nextPurchaseSeq: typeof parsed.nextPurchaseSeq === 'number' ? parsed.nextPurchaseSeq : 21,
      nextLoanSeq: typeof parsed.nextLoanSeq === 'number' ? parsed.nextLoanSeq : 3,
      nextSupplierSeq: typeof parsed.nextSupplierSeq === 'number' ? parsed.nextSupplierSeq : 4,
      dispatches: parsed.dispatches,
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      suppliers:
        Array.isArray(parsed.suppliers) && parsed.suppliers.length > 0
          ? parsed.suppliers
          : createSeedSuppliers(),
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    };
  } catch {
    return createInitialState();
  }
}

function saveWarehouseState(state: WarehouseStoreState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emitSync();
}

export function resetWarehouseState(): WarehouseStoreState {
  const fresh = createInitialState();
  saveWarehouseState(fresh);
  return fresh;
}

export function subscribeWarehouseEvents(listener: () => void): () => void {
  const ch = getChannel();
  const onMsg = () => listener();
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === STORAGE_KEY) listener();
  };
  ch?.addEventListener('message', onMsg);
  window.addEventListener('storage', onStorage);
  return () => {
    ch?.removeEventListener('message', onMsg);
    window.removeEventListener('storage', onStorage);
  };
}

export function verifyDispatchSku(
  dispatchId: string,
  rawSku: string
): { ok: true; dispatch: WarehouseDispatch; sku: string } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const dispatch = state.dispatches.find((d) => d.id === dispatchId);
  if (!dispatch) return { ok: false, error: 'Despacho no encontrado.' };
  if (!dispatch.pagoConfirmado) {
    return {
      ok: false,
      error: 'No se puede empacar ni despachar un pedido sin pago confirmado (RN-ECO-01).',
    };
  }

  const normalized = rawSku.trim().toLowerCase();
  const line = dispatch.items.find((i) => i.sku.toLowerCase() === normalized);
  if (!line) {
    return { ok: false, error: `El SKU "${rawSku.trim()}" no pertenece al pedido ${dispatch.pedidoRef}.` };
  }
  line.verificado = true;
  saveWarehouseState(state);
  return { ok: true, dispatch, sku: line.sku };
}

export function verifyNextDispatchItem(
  dispatchId: string
): { ok: true; dispatch: WarehouseDispatch; sku: string } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const dispatch = state.dispatches.find((d) => d.id === dispatchId);
  if (!dispatch) return { ok: false, error: 'Despacho no encontrado.' };
  if (!dispatch.pagoConfirmado) {
    return { ok: false, error: 'El pedido aún no tiene pago confirmado (RN-ECO-01).' };
  }
  const next = dispatch.items.find((i) => !i.verificado);
  if (!next) {
    return { ok: false, error: 'Todas las prendas del pedido ya están verificadas.' };
  }
  next.verificado = true;
  saveWarehouseState(state);
  return { ok: true, dispatch, sku: next.sku };
}

export function confirmDispatchPaymentSim(
  dispatchId: string,
  usuario: string
): { ok: true; dispatch: WarehouseDispatch } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const dispatch = state.dispatches.find((d) => d.id === dispatchId);
  if (!dispatch) return { ok: false, error: 'Despacho no encontrado.' };
  if (dispatch.pagoConfirmado) {
    return { ok: false, error: 'El pedido ya tenía el pago confirmado.' };
  }
  dispatch.pagoConfirmado = true;
  dispatch.status = 'listo_empaque';
  addAudit(
    state,
    usuario,
    'M03-Despachos',
    'RN-ECO-01',
    `Pago confirmado para ${dispatch.pedidoRef} (${dispatch.id}); habilitado para picking/packing.`
  );
  saveWarehouseState(state);
  return { ok: true, dispatch };
}

export function generateDispatchGuide(
  dispatchId: string,
  courier: string,
  usuario: string
): { ok: true; dispatch: WarehouseDispatch } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const dispatch = state.dispatches.find((d) => d.id === dispatchId);
  if (!dispatch) return { ok: false, error: 'Despacho no encontrado.' };
  if (!dispatch.pagoConfirmado) {
    return { ok: false, error: 'Bloqueado por RN-ECO-01: falta confirmación de pago.' };
  }
  const unverified = dispatch.items.filter((i) => !i.verificado);
  if (unverified.length > 0) {
    return {
      ok: false,
      error: `Verifica físicamente los ${unverified.length} SKU(s) pendiente(s) antes de generar la guía.`,
    };
  }

  const rand = Math.floor(100000 + Math.random() * 899999);
  dispatch.trackingCode = `IO-TRK-${rand}`;
  dispatch.courier = courier.trim() || 'Olva / Urbano Express';
  dispatch.guiaGeneradaEn = new Date().toISOString();
  dispatch.status = 'despachado';

  addAudit(
    state,
    usuario,
    'M03-Despachos',
    'RN-ENV-01',
    `Guía ${dispatch.trackingCode} generada para ${dispatch.pedidoRef} (${dispatch.courier}).`
  );
  saveWarehouseState(state);
  return { ok: true, dispatch };
}

export function recordDeliveryAttempt(params: {
  dispatchId: string;
  resultado: 'entregado' | 'fallido';
  receptorNombre?: string;
  receptorDni?: string;
  observacion?: string;
  usuario: string;
}): { ok: true; dispatch: WarehouseDispatch } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const dispatch = state.dispatches.find((d) => d.id === params.dispatchId);
  if (!dispatch) return { ok: false, error: 'Despacho no encontrado.' };
  if (dispatch.status !== 'despachado' && dispatch.status !== 'intento_1_fallido') {
    return { ok: false, error: 'El pedido debe estar despachado para registrar entrega.' };
  }

  const nextNum = (dispatch.intentos.length + 1) as 1 | 2;
  if (nextNum > 2) {
    return { ok: false, error: 'Ya se registraron los 2 intentos máximos permitidos (RN-ENV-03).' };
  }

  if (params.resultado === 'entregado') {
    const nombre = (params.receptorNombre ?? '').trim();
    const dni = (params.receptorDni ?? '').trim();
    if (nombre.length < 3) {
      return { ok: false, error: 'Ingresa el nombre y firma de quien recibe (RN-ENV-02).' };
    }
    if (!/^\d{8}$/.test(dni)) {
      return { ok: false, error: 'El DNI del receptor debe tener 8 dígitos (RN-ENV-02).' };
    }
    dispatch.intentos.push({
      numero: nextNum,
      fecha: new Date().toISOString(),
      resultado: 'entregado',
      receptorNombre: nombre,
      receptorDni: dni,
      observacion: params.observacion?.trim() || undefined,
    });
    dispatch.status = 'entregado';
    addAudit(
      state,
      params.usuario,
      'M03-Despachos',
      'RN-ENV-02',
      `Entrega confirmada en intento ${nextNum} para ${dispatch.pedidoRef} (DNI ${dni}).`
    );
  } else {
    dispatch.intentos.push({
      numero: nextNum,
      fecha: new Date().toISOString(),
      resultado: 'fallido',
      observacion: params.observacion?.trim() || 'Cliente ausente en domicilio',
    });
    dispatch.status = nextNum === 1 ? 'intento_1_fallido' : 'devuelto_almacen';
    addAudit(
      state,
      params.usuario,
      'M03-Despachos',
      'RN-ENV-03',
      nextNum === 1
        ? `Intento 1 fallido en ${dispatch.pedidoRef}; reprogramar segundo intento.`
        : `Intento 2 fallido en ${dispatch.pedidoRef}; paquete retornado a almacén.`
    );
  }

  saveWarehouseState(state);
  return { ok: true, dispatch };
}

export function createPurchaseRequest(payload: {
  proveedorNombre: string;
  proveedorRuc: string;
  sku: string;
  cantidad: number;
  costoUnitario?: number;
  usuario: string;
}): { ok: true; purchase: PurchaseOrder } | { ok: false; error: string } {
  const nombreProv = payload.proveedorNombre.trim();
  const ruc = payload.proveedorRuc.trim();
  if (nombreProv.length < 3) {
    return { ok: false, error: 'Ingresa la razón social del proveedor.' };
  }
  if (!/^\d{11}$/.test(ruc)) {
    return { ok: false, error: 'El RUC del proveedor debe tener 11 dígitos.' };
  }
  if (!Number.isFinite(payload.cantidad) || payload.cantidad <= 0) {
    return { ok: false, error: 'La cantidad solicitada debe ser mayor a 0.' };
  }

  const inv = getInventoryList(loadPosState());
  const item = inv.find((i) => i.sku === payload.sku);
  if (!item) {
    return { ok: false, error: 'SKU no encontrado en el catálogo.' };
  }

  const costo = roundMoney(
    payload.costoUnitario && payload.costoUnitario > 0
      ? payload.costoUnitario
      : item.precio_venta * 0.55
  );
  const qty = Math.round(payload.cantidad);

  const state = loadWarehouseState();
  const id = `OC-2026-${String(state.nextPurchaseSeq).padStart(3, '0')}`;
  state.nextPurchaseSeq += 1;

  const purchase: PurchaseOrder = {
    id,
    proveedorNombre: nombreProv,
    proveedorRuc: ruc,
    creadoEn: new Date().toISOString(),
    solicitadoPor: payload.usuario,
    pagoBloqueado: false,
    status: 'pendiente_aprobacion',
    totalEstimado: roundMoney(costo * qty),
    items: [
      {
        sku: item.sku,
        nombre: item.nombre,
        talla: item.talla,
        color: item.color,
        cantidadSolicitada: qty,
        cantidadRecibida: 0,
        cantidadDanada: 0,
        costoUnitario: costo,
      },
    ],
  };

  state.purchases.unshift(purchase);
  addAudit(
    state,
    payload.usuario,
    'M04-Compras',
    'RN-COM-01',
    `Solicitud ${id} creada para ${item.sku} (${qty} u.) — enviada a aprobación del Administrador.`
  );
  saveWarehouseState(state);
  return { ok: true, purchase };
}

export function approvePurchaseOrder(
  purchaseId: string,
  adminNombre = 'Lucía Benavides (Admin)'
): { ok: true; purchase: PurchaseOrder } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const purchase = state.purchases.find((p) => p.id === purchaseId);
  if (!purchase) return { ok: false, error: 'Orden de compra no encontrada.' };
  if (purchase.status !== 'pendiente_aprobacion') {
    return { ok: false, error: `La orden ${purchase.id} no está pendiente de aprobación.` };
  }

  purchase.status = 'aprobada';
  purchase.aprobadoPor = adminNombre;
  purchase.aprobadoEn = new Date().toISOString();
  addAudit(
    state,
    adminNombre,
    'M04-Compras',
    'RN-SEG-03',
    `Orden ${purchase.id} aprobada por Administrador desde Dashboard.`
  );
  saveWarehouseState(state);
  return { ok: true, purchase };
}

export function rejectPurchaseOrder(
  purchaseId: string,
  motivo: string,
  adminNombre = 'Lucía Benavides (Admin)'
): { ok: true; purchase: PurchaseOrder } | { ok: false; error: string } {
  const cleanReason = motivo.trim();
  if (cleanReason.length < 5) {
    return { ok: false, error: 'Indica un motivo de rechazo de al menos 5 caracteres.' };
  }

  const state = loadWarehouseState();
  const purchase = state.purchases.find((p) => p.id === purchaseId);
  if (!purchase) return { ok: false, error: 'Orden de compra no encontrada.' };
  if (purchase.status !== 'pendiente_aprobacion') {
    return { ok: false, error: `La orden ${purchase.id} no está pendiente de aprobación.` };
  }

  purchase.status = 'rechazada';
  purchase.notaInconformidad = cleanReason;
  addAudit(
    state,
    adminNombre,
    'M04-Compras',
    'RN-COM-01',
    `Orden ${purchase.id} rechazada desde Dashboard. Motivo: ${cleanReason}`
  );
  saveWarehouseState(state);
  return { ok: true, purchase };
}

export function receivePurchaseOrder(params: {
  purchaseId: string;
  guiaRemision: string;
  itemsResult: { sku: string; cantidadRecibida: number; cantidadDanada: number }[];
  notaInconformidad: string;
  usuario: string;
}): { ok: true; purchase: PurchaseOrder } | { ok: false; error: string } {
  const guia = params.guiaRemision.trim();
  if (guia.length < 4) {
    return { ok: false, error: 'Ingresa el número de Guía de Remisión física (RN-COM-03).' };
  }

  const state = loadWarehouseState();
  const purchase = state.purchases.find((p) => p.id === params.purchaseId);
  if (!purchase) return { ok: false, error: 'Orden de compra no encontrada.' };
  if (purchase.status !== 'aprobada') {
    return {
      ok: false,
      error: 'Solo pueden recibirse órdenes aprobadas previamente por el Administrador.',
    };
  }

  let hasIssue = false;
  const updatedItems: PurchaseOrderItem[] = purchase.items.map((line) => {
    const match = params.itemsResult.find((r) => r.sku === line.sku);
    const rec = Math.max(0, Math.round(match?.cantidadRecibida ?? line.cantidadSolicitada));
    const dan = Math.max(0, Math.round(match?.cantidadDanada ?? 0));
    if (rec !== line.cantidadSolicitada || dan > 0) {
      hasIssue = true;
    }
    return {
      ...line,
      cantidadRecibida: rec,
      cantidadDanada: dan,
    };
  });

  const nota = params.notaInconformidad.trim();
  if (nota.length > 0) {
    hasIssue = true;
  }

  if (hasIssue && nota.length < 4) {
    return {
      ok: false,
      error: 'Describe el motivo de la inconformidad o merma detectada (RN-COM-04).',
    };
  }

  purchase.items = updatedItems;
  purchase.guiaRemision = guia;
  purchase.recibidoEn = new Date().toISOString();

  if (hasIssue) {
    purchase.status = 'bloqueada_inconformidad';
    purchase.pagoBloqueado = true;
    purchase.notaInconformidad = nota;
    addAudit(
      state,
      params.usuario,
      'M04-Compras',
      'RN-COM-04',
      `Recepción ${purchase.id} (Guía ${guia}) bloqueada para pago por inconformidad: ${nota}.`
    );
  } else {
    purchase.status = 'recibida_conforme';
    purchase.pagoBloqueado = false;
    purchase.notaInconformidad = undefined;
    for (const line of purchase.items) {
      adjustSkuStock(line.sku, line.cantidadRecibida);
    }
    addAudit(
      state,
      params.usuario,
      'M04-Compras',
      'RN-COM-03',
      `Recepción conforme de ${purchase.id} (Guía ${guia}); stock incrementado en inventario.`
    );
  }

  saveWarehouseState(state);
  return { ok: true, purchase };
}

export function createWarehouseLoan(payload: {
  tiendaAliada: string;
  ruc: string;
  contacto: string;
  diasPlazo: number;
  gerenteDisponible: boolean;
  sku: string;
  cantidad: number;
  observacion: string;
  usuario: string;
}): { ok: true; loan: WarehouseLoan } | { ok: false; error: string } {
  const tienda = payload.tiendaAliada.trim();
  const ruc = payload.ruc.trim();
  if (tienda.length < 3) {
    return { ok: false, error: 'Ingresa el nombre o razón social de la tienda aliada.' };
  }
  if (!/^\d{11}$/.test(ruc)) {
    return { ok: false, error: 'El RUC de la tienda aliada debe tener 11 dígitos.' };
  }
  if (!Number.isFinite(payload.diasPlazo) || payload.diasPlazo < 1 || payload.diasPlazo > 7) {
    return {
      ok: false,
      error: 'El plazo máximo de préstamo en consignación es de 7 días calendario (RN-PRE-02).',
    };
  }

  const posState = loadPosState();
  const invItem = getInventoryList(posState).find((i) => i.sku === payload.sku);
  if (!invItem) return { ok: false, error: 'SKU no encontrado.' };

  const qty = Math.round(payload.cantidad);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: 'La cantidad a prestar debe ser mayor a 0.' };
  }
  if (invItem.stock < qty) {
    return {
      ok: false,
      error: `Stock insuficiente para ${invItem.sku}. Disponible: ${invItem.stock}.`,
    };
  }

  const state = loadWarehouseState();
  const seq = String(state.nextLoanSeq).padStart(3, '0');
  state.nextLoanSeq += 1;
  const id = `PRE-${seq}`;
  const constanciaCodigo = `CONST-PRE-${seq}`;

  const autorizadoPor = payload.gerenteDisponible
    ? 'Gerente / Administrador en turno'
    : `${payload.usuario} (Almacenero · Constancia Formal RN-PRE-01)`;

  const loanItem: WarehouseLoanItem = {
    sku: invItem.sku,
    nombre: invItem.nombre,
    talla: invItem.talla,
    color: invItem.color,
    cantidad: qty,
    precioReferencia: invItem.precio_venta,
  };

  const loan: WarehouseLoan = {
    id,
    constanciaCodigo,
    tiendaAliada: tienda,
    ruc,
    contacto: payload.contacto.trim() || 'Sin contacto registrado',
    fechaEmision: new Date().toISOString(),
    fechaLimite: addDaysIso(payload.diasPlazo),
    gerenteDisponible: payload.gerenteDisponible,
    autorizadoPor,
    observacion: payload.observacion.trim() || undefined,
    status: 'en_consignacion',
    montoTotal: roundMoney(invItem.precio_venta * qty),
    items: [loanItem],
  };

  adjustSkuStock(invItem.sku, -qty);
  state.loans.unshift(loan);
  addAudit(
    state,
    payload.usuario,
    'M06-Prestamos',
    payload.gerenteDisponible ? 'RN-PRE-02' : 'RN-PRE-01',
    `${constanciaCodigo} emitida para ${tienda} (${qty}× ${invItem.sku}, ${payload.diasPlazo} días).`
  );
  saveWarehouseState(state);
  return { ok: true, loan };
}

export function closeWarehouseLoan(params: {
  loanId: string;
  resolution: 'devuelto' | 'liquidado_caja';
  nota: string;
  usuario: string;
}): { ok: true; loan: WarehouseLoan } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const loan = state.loans.find((l) => l.id === params.loanId);
  if (!loan) return { ok: false, error: 'Préstamo no encontrado.' };
  if (loan.status !== 'en_consignacion') {
    return { ok: false, error: 'Este préstamo ya fue cerrado.' };
  }

  loan.cerradoEn = new Date().toISOString();
  loan.cierreNota = params.nota.trim() || undefined;

  if (params.resolution === 'devuelto') {
    for (const item of loan.items) {
      adjustSkuStock(item.sku, item.cantidad);
    }
    loan.status = 'devuelto';
    addAudit(
      state,
      params.usuario,
      'M06-Prestamos',
      'RN-PRE-04',
      `Devolución física registrada para ${loan.constanciaCodigo}; stock reingresado.`
    );
  } else {
    const desc = loan.items.map((i) => `${i.cantidad}× ${i.nombre} (${i.sku})`).join(', ');
    const allyRes = createAllyDebt({
      negocioNombre: loan.tiendaAliada,
      ruc: loan.ruc,
      contacto: loan.contacto,
      tipo: 'consignacion',
      diasPlazo: 7,
      descripcionPrendas: `${loan.constanciaCodigo}: ${desc}`,
      montoTotal: loan.montoTotal,
      autorizadoPor: loan.autorizadoPor,
    });
    if (!allyRes.ok) {
      return { ok: false, error: allyRes.error };
    }
    loan.status = 'liquidado_caja';
    loan.allyDebtId = allyRes.debt.id;
    addAudit(
      state,
      params.usuario,
      'M06-Prestamos',
      'RN-PRE-05',
      `${loan.constanciaCodigo} liquidado y enviado a Caja → Aliados (${allyRes.debt.id}).`
    );
  }

  saveWarehouseState(state);
  return { ok: true, loan };
}

export function registerSupplier(payload: {
  ruc: string;
  razonSocial: string;
  contacto: string;
  telefono: string;
  rubro: string;
  usuario: string;
  autoApprove?: boolean;
}): { ok: true; supplier: WarehouseSupplier } | { ok: false; error: string } {
  const ruc = payload.ruc.trim();
  const razonSocial = payload.razonSocial.trim();
  const contacto = payload.contacto.trim();
  const telefono = payload.telefono.trim();
  const rubro = payload.rubro.trim();

  if (!/^\d{11}$/.test(ruc)) {
    return { ok: false, error: 'El RUC del proveedor debe tener exactamente 11 dígitos.' };
  }
  if (razonSocial.length < 3) {
    return { ok: false, error: 'Ingresa la razón social del proveedor (mín. 3 caracteres).' };
  }

  const state = loadWarehouseState();
  const list = state.suppliers ?? createSeedSuppliers();
  if (list.some((s) => s.ruc === ruc)) {
    return { ok: false, error: `Ya existe un proveedor registrado con el RUC ${ruc}.` };
  }

  const seq = state.nextSupplierSeq ?? list.length + 1;
  state.nextSupplierSeq = seq + 1;
  const now = new Date().toISOString();
  const supplier: WarehouseSupplier = {
    id: `PROV-${String(seq).padStart(3, '0')}`,
    ruc,
    razonSocial,
    contacto: contacto || 'Sin contacto asignado',
    telefono: telefono || '—',
    rubro: rubro || 'Confección general',
    status: payload.autoApprove ? 'aprobado' : 'pendiente_validacion',
    creadoPor: payload.usuario,
    creadoEn: now,
    ...(payload.autoApprove ? { validadoPor: payload.usuario, validadoEn: now } : {}),
  };

  state.suppliers = [supplier, ...list];
  addAudit(
    state,
    payload.usuario,
    'M04-Compras',
    'RN-COM-01',
    payload.autoApprove
      ? `Proveedor ${supplier.razonSocial} (${supplier.ruc}) dado de alta y aprobado por Dirección.`
      : `Proveedor ${supplier.razonSocial} (${supplier.ruc}) registrado por Almacén — pendiente de validación.`
  );
  saveWarehouseState(state);
  return { ok: true, supplier };
}

export function approveSupplier(
  supplierId: string,
  adminNombre = 'Lucía Benavides (Admin)'
): { ok: true; supplier: WarehouseSupplier } | { ok: false; error: string } {
  const state = loadWarehouseState();
  const list = state.suppliers ?? createSeedSuppliers();
  const supplier = list.find((s) => s.id === supplierId);
  if (!supplier) return { ok: false, error: 'Proveedor no encontrado.' };
  if (supplier.status !== 'pendiente_validacion') {
    return { ok: false, error: `El proveedor ${supplier.razonSocial} no está pendiente.` };
  }

  supplier.status = 'aprobado';
  supplier.validadoPor = adminNombre;
  supplier.validadoEn = new Date().toISOString();
  state.suppliers = list;
  addAudit(
    state,
    adminNombre,
    'M04-Compras',
    'RN-SEG-03',
    `Proveedor ${supplier.razonSocial} (${supplier.ruc}) validado y habilitado para compras.`
  );
  saveWarehouseState(state);
  return { ok: true, supplier };
}

export function rejectSupplier(
  supplierId: string,
  motivo: string,
  adminNombre = 'Lucía Benavides (Admin)'
): { ok: true; supplier: WarehouseSupplier } | { ok: false; error: string } {
  const cleanReason = motivo.trim();
  if (cleanReason.length < 5) {
    return { ok: false, error: 'Indica el motivo de rechazo (mín. 5 caracteres).' };
  }
  const state = loadWarehouseState();
  const list = state.suppliers ?? createSeedSuppliers();
  const supplier = list.find((s) => s.id === supplierId);
  if (!supplier) return { ok: false, error: 'Proveedor no encontrado.' };
  if (supplier.status !== 'pendiente_validacion') {
    return { ok: false, error: `El proveedor ${supplier.razonSocial} no está pendiente.` };
  }

  supplier.status = 'rechazado';
  supplier.motivoRechazo = cleanReason;
  supplier.validadoPor = adminNombre;
  supplier.validadoEn = new Date().toISOString();
  state.suppliers = list;
  addAudit(
    state,
    adminNombre,
    'M04-Compras',
    'RN-COM-01',
    `Proveedor ${supplier.razonSocial} rechazado. Motivo: ${cleanReason}`
  );
  saveWarehouseState(state);
  return { ok: true, supplier };
}
