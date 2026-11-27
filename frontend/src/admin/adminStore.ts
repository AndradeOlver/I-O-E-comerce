import { loadWarehouseState } from '../almacen/almacenStore';
import { CATEGORIAS_TIENDA } from '../data/catalogData';
import { getAllCatalogProducts } from '../data/customCatalogStore';
import { isCampaignCurrentlyActive, loadMarketingState } from '../marketing/marketingStore';
import { getInventoryList, loadPosState, roundMoney } from '../pos/posStore';
import {
  AdminAnalyticsData,
  AdminAuditEntry,
  AdminCategoryAnalytic,
  AdminDecisionItem,
  AdminDecisionSeverity,
  AdminPayrollEmployee,
  AdminSnapshot,
  AdminStoreState,
} from './adminTypes';

export const ADMIN_STORAGE_KEY = 'io_admin_state_v1';
const ADMIN_CHANNEL_NAME = 'io_admin_channel_v1';

const adminChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(ADMIN_CHANNEL_NAME) : null;

function createSeedPayrollEmployees(): AdminPayrollEmployee[] {
  const rows: Omit<AdminPayrollEmployee, 'neto'>[] = [
    {
      id: 'EMP-01',
      rolCodigo: 'TN01',
      nombre: 'Lucía Benavides',
      cargo: 'Administradora / Dirección',
      sueldoBase: 3600,
      comision: 0,
      descuento: 0,
    },
    {
      id: 'EMP-02',
      rolCodigo: 'TN02',
      nombre: 'Camila Torres',
      cargo: 'Vendedora Mostrador',
      sueldoBase: 1750,
      comision: 320,
      descuento: 0,
    },
    {
      id: 'EMP-03',
      rolCodigo: 'TN05',
      nombre: 'Diego Salazar',
      cargo: 'Cajero Principal',
      sueldoBase: 1850,
      comision: 0,
      descuento: 50,
    },
    {
      id: 'EMP-04',
      rolCodigo: 'TN04',
      nombre: 'Mateo Quispe',
      cargo: 'Almacenero y Despachos',
      sueldoBase: 1900,
      comision: 0,
      descuento: 0,
    },
    {
      id: 'EMP-05',
      rolCodigo: 'TN03',
      nombre: 'Sofía Ríos',
      cargo: 'Community Manager',
      sueldoBase: 1950,
      comision: 130,
      descuento: 0,
    },
  ];

  return rows.map((row) => ({
    ...row,
    neto: roundMoney(row.sueldoBase + row.comision - row.descuento),
  }));
}

function createInitialAdminState(): AdminStoreState {
  const empleados = createSeedPayrollEmployees();
  const totalNeto = roundMoney(empleados.reduce((acc, item) => acc + item.neto, 0));
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

  return {
    version: 1,
    saldoBancarioBase: 24800,
    metaDiariaVentas: 4500,
    acknowledgedIds: {},
    payroll: {
      id: 'PLA-2026-11',
      periodoLabel: 'Noviembre 2026',
      fechaLimite: '2026-11-30',
      estado: 'pendiente_cierre',
      totalNeto,
      empleados,
    },
    auditLog: [
      {
        id: 'ADM-AUD-01',
        timestamp: twoHoursAgo,
        actor: 'Sistema Finanzas',
        area: 'M07-Planilla',
        ruleCode: 'RN-FIN-01',
        detail: `Cálculo preliminar de planilla Noviembre 2026 listo para verificación de liquidez (S/ ${totalNeto.toFixed(2)}).`,
      },
      {
        id: 'ADM-AUD-02',
        timestamp: fourHoursAgo,
        actor: 'Lucía Benavides',
        area: 'Dirección',
        ruleCode: 'RN-SEG-03',
        detail: 'Apertura de jornada y conciliación de saldo bancario operativo.',
      },
    ],
    lastRefreshedAt: now.toISOString(),
  };
}

export function loadAdminState(): AdminStoreState {
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) {
      const seed = createInitialAdminState();
      saveAdminState(seed, false);
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<AdminStoreState>;
    if (!parsed || parsed.version !== 1 || !parsed.payroll) {
      const seed = createInitialAdminState();
      saveAdminState(seed, false);
      return seed;
    }
    return {
      version: 1,
      saldoBancarioBase:
        typeof parsed.saldoBancarioBase === 'number' ? parsed.saldoBancarioBase : 24800,
      metaDiariaVentas:
        typeof parsed.metaDiariaVentas === 'number' ? parsed.metaDiariaVentas : 4500,
      acknowledgedIds: parsed.acknowledgedIds ?? {},
      payroll: parsed.payroll,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
      lastRefreshedAt: parsed.lastRefreshedAt ?? new Date().toISOString(),
    };
  } catch {
    return createInitialAdminState();
  }
}

export function saveAdminState(state: AdminStoreState, broadcast = true): void {
  state.lastRefreshedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
  if (broadcast) {
    adminChannel?.postMessage({ type: 'ADMIN_SYNC', timestamp: state.lastRefreshedAt });
  }
}

export function resetAdminState(): AdminStoreState {
  const seed = createInitialAdminState();
  saveAdminState(seed, true);
  return seed;
}

export function subscribeAdminEvents(onUpdate: () => void): () => void {
  const onChannel = () => onUpdate();
  const onStorage = (event: StorageEvent) => {
    if (event.key === ADMIN_STORAGE_KEY) {
      onUpdate();
    }
  };
  adminChannel?.addEventListener('message', onChannel);
  window.addEventListener('storage', onStorage);
  return () => {
    adminChannel?.removeEventListener('message', onChannel);
    window.removeEventListener('storage', onStorage);
  };
}

function pushAdminAudit(
  state: AdminStoreState,
  actor: string,
  area: string,
  ruleCode: string,
  detail: string
): void {
  state.auditLog.unshift({
    id: `ADM-AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actor,
    area,
    ruleCode,
    detail,
  });
  state.auditLog = state.auditLog.slice(0, 60);
}

export function recordAdminAudit(
  actor: string,
  area: string,
  ruleCode: string,
  detail: string
): void {
  const state = loadAdminState();
  pushAdminAudit(state, actor, area, ruleCode, detail);
  saveAdminState(state, true);
}

export function acknowledgeDecision(
  decisionId: string,
  detail: string,
  adminName = 'Lucía Benavides'
): AdminStoreState {
  const state = loadAdminState();
  state.acknowledgedIds[decisionId] = new Date().toISOString();
  pushAdminAudit(state, adminName, 'Dirección', 'RN-SEG-03', `Toma de conocimiento: ${detail}`);
  saveAdminState(state, true);
  return state;
}

export function adjustBankLiquiditySim(
  amount: number,
  adminName = 'Lucía Benavides'
): AdminStoreState {
  const state = loadAdminState();
  state.saldoBancarioBase = roundMoney(Math.max(0, amount));
  pushAdminAudit(
    state,
    adminName,
    'M07-Finanzas',
    'RN-FIN-02',
    `Saldo bancario base ajustado en simulación a S/ ${state.saldoBancarioBase.toFixed(2)}.`
  );
  saveAdminState(state, true);
  return state;
}

export function executePayroll(
  adminName = 'Lucía Benavides'
): { ok: true; state: AdminStoreState } | { ok: false; error: string } {
  const state = loadAdminState();
  if (state.payroll.estado === 'pagada') {
    return {
      ok: false,
      error: `La planilla ${state.payroll.periodoLabel} ya fue cerrada y es inmutable (RN-FIN-05).`,
    };
  }

  const posState = loadPosState();
  const ingresosCajaHoy = posState.movimientosCaja.reduce((acc, mov) => acc + mov.monto, 0);
  const liquidezActual = roundMoney(state.saldoBancarioBase + ingresosCajaHoy);

  if (liquidezActual < state.payroll.totalNeto) {
    return {
      ok: false,
      error: `Liquidez insuficiente (S/ ${liquidezActual.toFixed(2)} disponible vs. S/ ${state.payroll.totalNeto.toFixed(2)} requerido) — bloqueo por RN-FIN-02.`,
    };
  }

  const nowIso = new Date().toISOString();
  const refBanco = `BCP-${nowIso.slice(0, 10).replaceAll('-', '')}-${String(Math.floor(100 + Math.random() * 899))}`;
  state.saldoBancarioBase = roundMoney(state.saldoBancarioBase - state.payroll.totalNeto);
  state.payroll.estado = 'pagada';
  state.payroll.pagadoEn = nowIso;
  state.payroll.pagadoPor = adminName;
  state.payroll.referenciaBanco = refBanco;

  pushAdminAudit(
    state,
    adminName,
    'M07-Planilla',
    'RN-FIN-05',
    `Planilla ${state.payroll.periodoLabel} pagada por S/ ${state.payroll.totalNeto.toFixed(2)} (Ref. ${refBanco}). Registro marcado como inmutable.`
  );
  saveAdminState(state, true);
  return { ok: true, state };
}

function daysUntilDate(isoDate: string): number {
  const target = new Date(`${isoDate.slice(0, 10)}T23:59:59`);
  const diffMs = target.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

const SEVERITY_RANK: Record<AdminDecisionSeverity, number> = {
  bloqueante: 0,
  atencion: 1,
  observacion: 2,
};

export function buildAdminSnapshot(): AdminSnapshot {
  const adminState = loadAdminState();
  const posState = loadPosState();
  const whState = loadWarehouseState();
  const mktState = loadMarketingState();
  const allProducts = getAllCatalogProducts();
  const suppliers = whState.suppliers ?? [];

  const tiendaCobrado = roundMoney(
    posState.orders
      .filter((o) => o.status === 'cobrado')
      .reduce((acc, o) => acc + o.total, 0)
  );
  const pendienteCobroPos = roundMoney(
    posState.orders
      .filter((o) => o.status === 'pendiente_cobro')
      .reduce((acc, o) => acc + o.saldoPendiente, 0)
  );
  const webPagado = roundMoney(
    whState.dispatches
      .filter((d) => d.pagoConfirmado)
      .reduce((acc, d) => acc + d.subtotal + d.flete, 0)
  );
  const totalOmnicanal = roundMoney(tiendaCobrado + webPagado);
  const metaDiaria = adminState.metaDiariaVentas;
  const porcentajeMeta =
    metaDiaria > 0 ? Math.min(100, Math.round((totalOmnicanal / metaDiaria) * 100)) : 0;

  const ingresosCajaHoy = roundMoney(
    posState.movimientosCaja.reduce((acc, mov) => acc + mov.monto, 0)
  );
  const liquidezEfectiva = roundMoney(adminState.saldoBancarioBase + ingresosCajaHoy);

  const planillaCompromiso =
    adminState.payroll.estado === 'pendiente_cierre' ? adminState.payroll.totalNeto : 0;
  const comprasCompromiso = roundMoney(
    whState.purchases
      .filter((p) => p.status === 'pendiente_aprobacion' || p.status === 'aprobada')
      .reduce((acc, p) => acc + p.totalEstimado, 0)
  );
  const compromisosInmediatos = roundMoney(planillaCompromiso + comprasCompromiso);
  const margenLiquidez = roundMoney(liquidezEfectiva - compromisosInmediatos);
  const coberturaOk = margenLiquidez >= 0;

  const inventory = getInventoryList(posState);
  const criticalItems = inventory.filter((item) => item.stock <= 5);
  const skusCriticosCount = criticalItems.length;
  const skusAgotadosCount = criticalItems.filter((item) => item.stock <= 0).length;

  const activeLoans = whState.loans.filter((loan) => loan.status === 'en_consignacion');
  const prestamosActivosCount = activeLoans.length;
  const capitalConsignacion = roundMoney(
    activeLoans.reduce((acc, loan) => acc + loan.montoTotal, 0)
  );

  const decisions: AdminDecisionItem[] = [];

                            
  for (const camp of mktState.campaigns) {
    if (camp.status !== 'pendiente_aprobacion') continue;
    decisions.push({
      id: `mkt-camp-${camp.id}`,
      kind: 'campana_mkt',
      severity: 'bloqueante',
      areaGroup: 'Marketing y Catálogo',
      area: 'Marketing',
      ruleCode: 'RN-MKT-04',
      titulo: `Aprobar campaña "${camp.titulo}"`,
      resumen: `${camp.porcentajeDescuento}% dscto · Tope ${camp.stock_maximo} u. · Solicitado por ${camp.createdBy}`,
      impactoTexto: `Vigencia ${camp.fecha_inicio} al ${camp.fecha_fin}`,
      plazoTexto: 'Requiere firma',
      timestamp: camp.updatedAt,
      sourceId: camp.id,
      moduleHref: '/marketing.html',
      moduleLabel: 'Abrir Marketing',
      acknowledged: false,
      meta: { kind: 'campana_mkt', campaign: camp },
    });
  }

  const pendingEditorial = allProducts.filter(
    (p) => p.recienLlegado && !mktState.editorialOverrides[p.groupId]?.completadoEditorial
  );
  if (pendingEditorial.length > 0) {
    const decisionId = `mkt-edit-${pendingEditorial.length}-${pendingEditorial[0].groupId}`;
    decisions.push({
      id: decisionId,
      kind: 'editorial_m05',
      severity: 'atencion',
      areaGroup: 'Marketing y Catálogo',
      area: 'Marketing',
      ruleCode: 'M05-Editorial',
      titulo: `${pendingEditorial.length} modelo(s) recién llegado(s) sin ficha web`,
      resumen: `Pendiente de fotos y copy por Community Manager (TN03) para salir en tienda online`,
      impactoTexto: `${pendingEditorial.length} modelo(s)`,
      plazoTexto: 'En cola web',
      timestamp: adminState.lastRefreshedAt,
      sourceId: 'MKT-EDITORIAL',
      moduleHref: '/marketing.html',
      moduleLabel: 'Ir a Recién llegados',
      acknowledged: Boolean(adminState.acknowledgedIds[decisionId]),
      meta: { kind: 'editorial_m05', products: pendingEditorial },
    });
  }

                            
  for (const sup of suppliers) {
    if (sup.status !== 'pendiente_validacion') continue;
    decisions.push({
      id: `wh-sup-${sup.id}`,
      kind: 'proveedor_m04',
      severity: 'bloqueante',
      areaGroup: 'Compras e Inventario',
      area: 'Proveedores',
      ruleCode: 'RN-COM-01',
      titulo: `Validar nuevo proveedor · ${sup.razonSocial}`,
      resumen: `RUC ${sup.ruc} · ${sup.rubro} · Registrado por ${sup.creadoPor}`,
      impactoTexto: 'Habilita compras',
      plazoTexto: 'Requiere firma',
      timestamp: sup.creadoEn,
      sourceId: sup.id,
      moduleHref: '/almacen.html',
      moduleLabel: 'Abrir Almacén',
      acknowledged: false,
      meta: { kind: 'proveedor_m04', supplier: sup },
    });
  }

  for (const oc of whState.purchases) {
    if (oc.status !== 'pendiente_aprobacion') continue;
    const totalUnidades = oc.items.reduce((acc, i) => acc + i.cantidadSolicitada, 0);
    decisions.push({
      id: `wh-oc-${oc.id}`,
      kind: 'compra_oc',
      severity: 'bloqueante',
      areaGroup: 'Compras e Inventario',
      area: 'Compras',
      ruleCode: 'RN-COM-01',
      titulo: `Autorizar orden ${oc.id} · ${oc.proveedorNombre}`,
      resumen: `${totalUnidades} unidades solicitadas por ${oc.solicitadoPor}`,
      impactoTexto: `S/ ${oc.totalEstimado.toFixed(2)}`,
      plazoTexto: 'Requiere firma',
      timestamp: oc.creadoEn,
      sourceId: oc.id,
      moduleHref: '/almacen.html',
      moduleLabel: 'Abrir Almacén',
      acknowledged: false,
      meta: { kind: 'compra_oc', purchase: oc },
    });
  }

  for (const oc of whState.purchases) {
    if (oc.status !== 'bloqueada_inconformidad') continue;
    const decisionId = `wh-inc-${oc.id}`;
    decisions.push({
      id: decisionId,
      kind: 'inconformidad_m04',
      severity: 'atencion',
      areaGroup: 'Compras e Inventario',
      area: 'Compras',
      ruleCode: 'RN-COM-04',
      titulo: `Pago bloqueado por inconformidad · ${oc.id}`,
      resumen: `${oc.proveedorNombre} · ${oc.notaInconformidad ?? 'Diferencia física en recepción'}`,
      impactoTexto: `S/ ${oc.totalEstimado.toFixed(2)} retenido`,
      plazoTexto: 'Pago bloqueado',
      timestamp: oc.recibidoEn ?? oc.creadoEn,
      sourceId: oc.id,
      moduleHref: '/almacen.html',
      moduleLabel: 'Ver recepción',
      acknowledged: Boolean(adminState.acknowledgedIds[decisionId]),
      meta: { kind: 'inconformidad_m04', purchase: oc },
    });
  }

  if (criticalItems.length > 0) {
    const decisionId = `inv-crit-${criticalItems.map((i) => i.sku).slice(0, 3).join('-')}-${criticalItems.length}`;
    decisions.push({
      id: decisionId,
      kind: 'stock_critico_m04',
      severity: 'atencion',
      areaGroup: 'Compras e Inventario',
      area: 'Inventario',
      ruleCode: 'RN-INV-03',
      titulo: `${criticalItems.length} SKUs en stock crítico (≤ 5 u.)`,
      resumen:
        skusAgotadosCount > 0
          ? `${skusAgotadosCount} agotados en piso/web · Reposición reservada a Dirección`
          : `Umbral preventivo superado · Evaluar reposición directa`,
      impactoTexto: `${criticalItems.length} variantes`,
      plazoTexto: skusAgotadosCount > 0 ? 'Con quiebre activo' : 'Preventivo',
      timestamp: adminState.lastRefreshedAt,
      sourceId: 'STOCK-CRITICO',
      moduleHref: '/almacen.html',
      moduleLabel: 'Ver Compras',
      acknowledged: Boolean(adminState.acknowledgedIds[decisionId]),
      meta: { kind: 'stock_critico_m04', items: criticalItems },
    });
  }

                           
  if (adminState.payroll.estado === 'pendiente_cierre') {
    const canPay = liquidezEfectiva >= adminState.payroll.totalNeto;
    decisions.push({
      id: `fin-pla-${adminState.payroll.id}`,
      kind: 'planilla_m07',
      severity: 'bloqueante',
      areaGroup: 'Finanzas y Planilla',
      area: 'Finanzas',
      ruleCode: canPay ? 'RN-FIN-05' : 'RN-FIN-02',
      titulo: `Cierre de planilla ${adminState.payroll.periodoLabel}`,
      resumen: canPay
        ? `${adminState.payroll.empleados.length} colaboradores listos · Liquidez verificada`
        : `Liquidez insuficiente para cubrir planilla · Revisar caja o saldo`,
      impactoTexto: `S/ ${adminState.payroll.totalNeto.toFixed(2)}`,
      plazoTexto: `Vence ${adminState.payroll.fechaLimite}`,
      timestamp: adminState.lastRefreshedAt,
      sourceId: adminState.payroll.id,
      moduleHref: '/pos-cajero.html',
      moduleLabel: 'Ver Caja',
      acknowledged: false,
      meta: { kind: 'planilla_m07', payroll: adminState.payroll },
    });
  }

                                   
  for (const loan of activeLoans) {
    const dias = daysUntilDate(loan.fechaLimite);
    const sinGerente = !loan.gerenteDisponible;
    const porVencer = dias <= 2;
    if (!sinGerente && !porVencer) continue;

    const decisionId = `wh-loan-${loan.id}`;
    decisions.push({
      id: decisionId,
      kind: 'prestamo_m06',
      severity: 'atencion',
      areaGroup: 'Almacén, Envíos y Préstamos',
      area: 'Préstamos',
      ruleCode: sinGerente ? 'RN-PRE-01' : 'RN-PRE-02',
      titulo: sinGerente
        ? `Constancia por ausencia · ${loan.tiendaAliada}`
        : `Consignación próxima a vencer · ${loan.tiendaAliada}`,
      resumen: `${loan.constanciaCodigo} · Emitida por ${loan.autorizadoPor}`,
      impactoTexto: `S/ ${loan.montoTotal.toFixed(2)} en prendas`,
      plazoTexto: dias < 0 ? `Vencido (${Math.abs(dias)} d)` : `${dias} d restantes`,
      timestamp: loan.fechaEmision,
      sourceId: loan.id,
      moduleHref: '/almacen.html',
      moduleLabel: 'Ver en Almacén',
      acknowledged: Boolean(adminState.acknowledgedIds[decisionId]),
      meta: { kind: 'prestamo_m06', loan, diasRestantes: dias },
    });
  }

  for (const disp of whState.dispatches) {
    if (disp.status !== 'intento_1_fallido' && disp.status !== 'devuelto_almacen') continue;
    const decisionId = `wh-disp-${disp.id}`;
    decisions.push({
      id: decisionId,
      kind: 'despacho_m03',
      severity: 'atencion',
      areaGroup: 'Almacén, Envíos y Préstamos',
      area: 'Envíos',
      ruleCode: 'RN-ENV-02',
      titulo:
        disp.status === 'devuelto_almacen'
          ? `Pedido devuelto a almacén · ${disp.pedidoRef}`
          : `1.er intento fallido · ${disp.pedidoRef}`,
      resumen: `${disp.clienteNombre} (${disp.distrito}) · ${disp.trackingCode ?? 'Sin tracking'}`,
      impactoTexto: `S/ ${(disp.subtotal + disp.flete).toFixed(2)}`,
      plazoTexto: disp.status === 'devuelto_almacen' ? '2 intentos agotados' : 'Reprogramar 2.º',
      timestamp: disp.creadoEn,
      sourceId: disp.id,
      moduleHref: '/almacen.html',
      moduleLabel: 'Gestionar envío',
      acknowledged: Boolean(adminState.acknowledgedIds[decisionId]),
      meta: { kind: 'despacho_m03', dispatch: disp },
    });
  }

                     
  for (const ord of posState.orders) {
    if (ord.status !== 'cancelado') continue;
    const decisionId = `pos-canc-${ord.id}`;
    decisions.push({
      id: decisionId,
      kind: 'anulacion_m01',
      severity: 'observacion',
      areaGroup: 'Ventas y Caja',
      area: 'POS',
      ruleCode: 'RN-TRI-03',
      titulo: `Orden anulada en POS · ${ord.id}`,
      resumen: `${ord.vendedorNombre} · ${ord.motivoCancelacion ?? 'Anulación operativa'}`,
      impactoTexto: `S/ ${ord.total.toFixed(2)}`,
      plazoTexto: 'Trazabilidad',
      timestamp: ord.creadoEn,
      sourceId: ord.id,
      moduleHref: '/pos-cajero.html',
      moduleLabel: 'Ver Caja',
      acknowledged: Boolean(adminState.acknowledgedIds[decisionId]),
      meta: { kind: 'anulacion_m01', order: ord },
    });
  }

  for (const debt of posState.allyDebts) {
    if (debt.status !== 'pendiente') continue;
    const decisionId = `pos-ally-${debt.id}`;
    const dias = daysUntilDate(debt.fechaVencimiento);
    decisions.push({
      id: decisionId,
      kind: 'aliado_m01',
      severity: dias <= 2 ? 'atencion' : 'observacion',
      areaGroup: 'Ventas y Caja',
      area: 'Aliados',
      ruleCode: 'RN-PRE-05',
      titulo: `Saldo por cobrar aliado · ${debt.negocioNombre}`,
      resumen: `${debt.tipo === 'consignacion' ? 'Liquidación consignación' : 'Crédito'} · ${debt.descripcionPrendas}`,
      impactoTexto: `S/ ${debt.saldoPendiente.toFixed(2)} pendiente`,
      plazoTexto: dias < 0 ? `Vencido (${Math.abs(dias)} d)` : `Vence ${debt.fechaVencimiento}`,
      timestamp: debt.fechaEmision,
      sourceId: debt.id,
      moduleHref: '/pos-cajero.html',
      moduleLabel: 'Ir a Aliados en Caja',
      acknowledged: Boolean(adminState.acknowledgedIds[decisionId]),
      meta: { kind: 'aliado_m01', debt },
    });
  }

  decisions.sort((a, b) => {
    const ackDiff = Number(a.acknowledged) - Number(b.acknowledged);
    if (ackDiff !== 0) return ackDiff;
    const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.timestamp.localeCompare(a.timestamp);
  });

                                                       
  const categorias: AdminCategoryAnalytic[] = CATEGORIAS_TIENDA.map((cat) => {
    const models = allProducts.filter((p) => p.categorySlug === cat.slug);
    const catInv = inventory.filter((i) => i.categorySlug === cat.slug);
    const stockTotal = catInv.reduce((acc, i) => acc + i.stock, 0);
    const skusCriticos = catInv.filter((i) => i.stock <= 5).length;
    const valorInventario = roundMoney(
      catInv.reduce((acc, i) => acc + i.stock * i.precio_venta, 0)
    );
    return {
      slug: cat.slug,
      nombre: cat.nombre,
      modelosCount: models.length,
      stockTotal,
      skusCriticos,
      valorInventario,
    };
  }).sort((a, b) => b.valorInventario - a.valorInventario);

  const campanasActivas = mktState.campaigns
    .filter((c) => isCampaignCurrentlyActive(c))
    .map((c) => ({
      id: c.id,
      titulo: c.titulo,
      descuento: c.porcentajeDescuento,
      consumido: c.stock_consumido,
      maximo: c.stock_maximo,
      porcentaje: c.stock_maximo > 0 ? Math.min(100, Math.round((c.stock_consumido / c.stock_maximo) * 100)) : 0,
    }));

  const analytics: AdminAnalyticsData = {
    canalBreakdown: {
      tiendaCobrado,
      webPagado,
      pendientePos: pendienteCobroPos,
    },
    categorias,
    campanasActivas,
    proveedoresResumen: {
      aprobados: suppliers.filter((s) => s.status === 'aprobado').length,
      pendientes: suppliers.filter((s) => s.status === 'pendiente_validacion').length,
      rechazados: suppliers.filter((s) => s.status === 'rechazado').length,
    },
    consignacionesResumen: {
      activas: activeLoans.length,
      devueltas: whState.loans.filter((l) => l.status === 'devuelto').length,
      liquidadas: whState.loans.filter((l) => l.status === 'liquidado_caja').length,
      capitalActivo: capitalConsignacion,
    },
  };

                               
  const unifiedAudit: AdminAuditEntry[] = [
    ...adminState.auditLog,
    ...whState.auditLog.map((entry) => ({
      id: `wh-${entry.id}`,
      timestamp: entry.fecha,
      actor: entry.usuario,
      area: entry.modulo,
      ruleCode: entry.regla,
      detail: entry.detalle,
    })),
    ...mktState.auditLog.map((entry) => ({
      id: `mkt-${entry.id}`,
      timestamp: entry.timestamp,
      actor: entry.actor,
      area: 'M05-Marketing',
      ruleCode: 'RN-MKT',
      detail: `${entry.action} (${entry.target}): ${entry.detail}`,
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    pulse: {
      tiendaCobrado,
      webPagado,
      totalOmnicanal,
      metaDiaria,
      porcentajeMeta,
      pendienteCobroPos,
      liquidezEfectiva,
      compromisosInmediatos,
      coberturaOk,
      margenLiquidez,
      skusCriticosCount,
      skusAgotadosCount,
      prestamosActivosCount,
      capitalConsignacion,
    },
    decisions,
    analytics,
    suppliers,
    unifiedAudit: unifiedAudit.slice(0, 40),
    lastRefreshedAt: adminState.lastRefreshedAt,
  };
}
