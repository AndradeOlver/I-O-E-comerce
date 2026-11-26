import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import '../styles/admin.css';
import {
  approvePurchaseOrder,
  approveSupplier,
  createPurchaseRequest,
  registerSupplier,
  rejectPurchaseOrder,
  rejectSupplier,
  subscribeWarehouseEvents,
} from '../almacen/almacenStore';
import { DemoSession, logoutToAccess, requireZoneRole } from '../auth/demoSession';
import { CATEGORIAS_TIENDA, MARCAS_TIENDA } from '../data/catalogData';
import { addCustomProductModel, subscribeCatalogEvents } from '../data/customCatalogStore';
import {
  approveCampaign,
  rejectCampaign,
  subscribeMarketingEvents,
} from '../marketing/marketingStore';
import {
  adjustSkuStock,
  formatPen,
  formatTimeShort,
  subscribePosEvents,
} from '../pos/posStore';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { CategorySlug, GenderContext } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import {
  acknowledgeDecision,
  adjustBankLiquiditySim,
  buildAdminSnapshot,
  executePayroll,
  recordAdminAudit,
  resetAdminState,
  subscribeAdminEvents,
} from './adminStore';
import {
  ADMIN_AREA_GROUPS,
  AdminAreaGroup,
  AdminDecisionFilter,
  AdminDecisionItem,
  AdminSnapshot,
  AdminTab,
} from './adminTypes';

const activeSession = requireZoneRole('administrador', '/admin.html');
if (!activeSession) {
  throw new Error('Redirigiendo al acceso');
}
const currentSession: DemoSession = activeSession;

interface AdminLocalState {
  activeTab: AdminTab;
  severityFilter: AdminDecisionFilter;
  expandedAreas: Record<AdminAreaGroup, boolean> | null;
  auditAreaFilter: string;
  selectedDecisionId: string | null;
  pendingConfirmAction: string | null;
  rejectReasonDraft: string;
  payrollConfirmChecked: boolean;
  quickRestockSku: string;
  quickRestockQty: number;
  quickRestockApproveNow: boolean;
  feedback: { kind: 'ok' | 'err' | 'warn'; text: string } | null;
}

const local: AdminLocalState = {
  activeTab: 'mesa_control',
  severityFilter: 'todos',
  expandedAreas: null,
  auditAreaFilter: 'todas',
  selectedDecisionId: null,
  pendingConfirmAction: null,
  rejectReasonDraft: '',
  payrollConfirmChecked: false,
  quickRestockSku: '',
  quickRestockQty: 12,
  quickRestockApproveNow: true,
  feedback: null,
};

const rootEl = document.getElementById('admin-root');
if (!rootEl) {
  throw new Error('No se encontró #admin-root');
}
const root: HTMLElement = rootEl;

let latestSnapshot: AdminSnapshot = buildAdminSnapshot();

function formatDateTimeShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 16);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm} ${formatTimeShort(iso)}`;
}

function getFilteredDecisions(snapshot: AdminSnapshot): AdminDecisionItem[] {
  return snapshot.decisions.filter((item) => {
    if (local.severityFilter === 'resueltos') {
      return item.acknowledged;
    }
    if (local.severityFilter === 'todos') {
      return !item.acknowledged;
    }
    return !item.acknowledged && item.severity === local.severityFilter;
  });
}

function getExpandedAreasMap(
  snapshot: AdminSnapshot,
  filtered: AdminDecisionItem[]
): Record<AdminAreaGroup, boolean> {
  if (!local.expandedAreas) {
    const initial = {} as Record<AdminAreaGroup, boolean>;
    for (const area of ADMIN_AREA_GROUPS) {
      const areaItems = snapshot.decisions.filter((d) => !d.acknowledged && d.areaGroup === area);
      initial[area] = areaItems.some((d) => d.severity === 'bloqueante') || areaItems.length > 0;
    }
    local.expandedAreas = initial;
  }

  if (local.severityFilter !== 'todos') {
    const dynamic = { ...local.expandedAreas };
    for (const area of ADMIN_AREA_GROUPS) {
      if (filtered.some((d) => d.areaGroup === area)) {
        dynamic[area] = true;
      }
    }
    return dynamic;
  }

  return local.expandedAreas;
}

function ensureSelectedDecision(filtered: AdminDecisionItem[]): AdminDecisionItem | null {
  if (filtered.length === 0) {
    local.selectedDecisionId = null;
    return null;
  }
  const found = filtered.find((d) => d.id === local.selectedDecisionId);
  if (found) return found;
  local.selectedDecisionId = filtered[0].id;
  local.pendingConfirmAction = null;
  local.rejectReasonDraft = '';
  local.payrollConfirmChecked = false;
  return filtered[0];
}

function renderTopbar(): string {
  return `
    <header class="pos-topbar">
      <div class="pos-topbar-left">
        <span class="pos-brand-mark">${renderBrandMark()}</span>
        <h1 class="pos-topbar-title pos-display">Dirección · Mesa de Control</h1>
        <span class="pos-topbar-staff">
          Administrador: <strong>${escapeHtml(currentSession.displayName)}</strong>
        </span>
      </div>
      <nav class="pos-topbar-right" aria-label="Accesos operativos">
        <a class="pos-nav-pill" href="/pos-vendedor.html">Mostrador</a>
        <a class="pos-nav-pill" href="/pos-cajero.html">Caja</a>
        <a class="pos-nav-pill" href="/almacen.html">Almacén</a>
        <a class="pos-nav-pill" href="/marketing.html">Marketing</a>
        <a class="pos-nav-pill" href="/index.html">Tienda</a>
        <button type="button" class="pos-btn-ghost" data-action="refresh-all" title="Actualizar (R)">
          Actualizar
        </button>
        <button type="button" class="pos-btn-ghost" data-action="logout">
          ${icons.logOut(15)} Salir
        </button>
      </nav>
    </header>
  `;
}

function renderViewTabs(snapshot: AdminSnapshot): string {
  const activeBloq = snapshot.decisions.filter(
    (d) => !d.acknowledged && d.severity === 'bloqueante'
  ).length;
  const pendingSuppliers = snapshot.analytics.proveedoresResumen.pendientes;

  return `
    <div class="adm-view-tabs" role="tablist" aria-label="Vistas de Dirección">
      <button
        type="button"
        role="tab"
        aria-selected="${local.activeTab === 'mesa_control' ? 'true' : 'false'}"
        class="adm-view-tab ${local.activeTab === 'mesa_control' ? 'is-active' : ''}"
        data-action="set-tab"
        data-tab="mesa_control"
      >
        Mesa de Control
        ${activeBloq > 0 ? `<span class="adm-rule-tag io-num">${activeBloq} bloqueantes</span>` : ''}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected="${local.activeTab === 'analitica' ? 'true' : 'false'}"
        class="adm-view-tab ${local.activeTab === 'analitica' ? 'is-active' : ''}"
        data-action="set-tab"
        data-tab="analitica"
      >
        Analítica y Tendencias
      </button>
      <button
        type="button"
        role="tab"
        aria-selected="${local.activeTab === 'altas' ? 'true' : 'false'}"
        class="adm-view-tab ${local.activeTab === 'altas' ? 'is-active' : ''}"
        data-action="set-tab"
        data-tab="altas"
      >
        Catálogo y Proveedores
        ${pendingSuppliers > 0 ? `<span class="adm-rule-tag io-num">${pendingSuppliers} por validar</span>` : ''}
      </button>
    </div>
  `;
}

function renderPulseLayer(snapshot: AdminSnapshot): string {
  const { pulse } = snapshot;
  const coberturaClass = pulse.coberturaOk ? 'is-ok' : 'is-err';
  const coberturaLabel = pulse.coberturaOk ? 'Cobertura holgada' : 'Liquidez ajustada';
  const stockStatusClass =
    pulse.skusAgotadosCount > 0
      ? 'is-err'
      : pulse.skusCriticosCount > 0
        ? 'is-warn'
        : 'is-ok';
  const stockStatusLabel =
    pulse.skusAgotadosCount > 0
      ? `${pulse.skusAgotadosCount} agotados`
      : pulse.skusCriticosCount > 0
        ? 'Requiere reposición'
        : 'Inventario sano';

  const coberturaPct =
    pulse.compromisosInmediatos > 0
      ? Math.min(100, Math.round((pulse.liquidezEfectiva / pulse.compromisosInmediatos) * 100))
      : 100;

  return `
    <section class="adm-pulse-grid" aria-label="Pulso vital del negocio">
      <article class="adm-pulse-card">
        <div class="adm-pulse-head">
          <span class="adm-pulse-kicker">Ritmo comercial omnicanal</span>
          <span class="adm-pulse-status ${pulse.porcentajeMeta >= 70 ? 'is-ok' : 'is-warn'} io-num">
            ${pulse.porcentajeMeta}% de meta (${formatPen(pulse.metaDiaria)})
          </span>
        </div>
        <div class="adm-pulse-value io-num">${formatPen(pulse.totalOmnicanal)}</div>
        <div class="adm-pulse-meter" aria-hidden="true">
          <div class="adm-pulse-meter-fill" style="width: ${pulse.porcentajeMeta}%"></div>
        </div>
        <div class="adm-pulse-breakdown io-num">
          <span>Tienda: <strong>${formatPen(pulse.tiendaCobrado)}</strong></span>
          <span>Web: <strong>${formatPen(pulse.webPagado)}</strong></span>
          <span>Por cobrar POS: <strong>${formatPen(pulse.pendienteCobroPos)}</strong></span>
        </div>
      </article>

      <article class="adm-pulse-card ${pulse.coberturaOk ? '' : 'is-alert'}">
        <div class="adm-pulse-head">
          <span class="adm-pulse-kicker">Liquidez y compromisos inmediatos</span>
          <span class="adm-pulse-status ${coberturaClass}">${coberturaLabel}</span>
        </div>
        <div class="adm-pulse-value io-num">${formatPen(pulse.liquidezEfectiva)}</div>
        <div class="adm-pulse-meter" aria-hidden="true">
          <div
            class="adm-pulse-meter-fill ${pulse.coberturaOk ? 'is-accent' : 'is-err'}"
            style="width: ${coberturaPct}%"
          ></div>
        </div>
        <div class="adm-pulse-breakdown io-num">
          <span>Compromisos: <strong>${formatPen(pulse.compromisosInmediatos)}</strong></span>
          <span>Margen libre: <strong>${formatPen(pulse.margenLiquidez)}</strong></span>
        </div>
      </article>

      <article class="adm-pulse-card">
        <div class="adm-pulse-head">
          <span class="adm-pulse-kicker">Salud de inventario y consignación</span>
          <span class="adm-pulse-status ${stockStatusClass}">${stockStatusLabel}</span>
        </div>
        <div class="adm-pulse-value io-num">${pulse.skusCriticosCount} SKUs en alerta</div>
        <div class="adm-pulse-breakdown io-num">
          <span>Umbral: <strong>≤ 5 u.</strong> (RN-INV-03)</span>
          <span>Consignaciones activas: <strong>${pulse.prestamosActivosCount}</strong> (${formatPen(pulse.capitalConsignacion)})</span>
        </div>
      </article>
    </section>
  `;
}

function renderAreaPanels(
  snapshot: AdminSnapshot,
  filtered: AdminDecisionItem[],
  selected: AdminDecisionItem | null
): string {
  const activeItems = snapshot.decisions.filter((d) => !d.acknowledged);
  const countBloq = activeItems.filter((d) => d.severity === 'bloqueante').length;
  const countAtenc = activeItems.filter((d) => d.severity === 'atencion').length;
  const countObs = activeItems.filter((d) => d.severity === 'observacion').length;
  const countRes = snapshot.decisions.filter((d) => d.acknowledged).length;

  const tabs: { key: AdminDecisionFilter; label: string; count: number }[] = [
    { key: 'todos', label: 'Pendientes', count: activeItems.length },
    { key: 'bloqueante', label: 'Bloqueantes', count: countBloq },
    { key: 'atencion', label: 'Atención', count: countAtenc },
    { key: 'observacion', label: 'Observación', count: countObs },
    { key: 'resueltos', label: 'Revisados', count: countRes },
  ];

  const expandedMap = getExpandedAreasMap(snapshot, filtered);

  const orderedAreas = [...ADMIN_AREA_GROUPS].sort((a, b) => {
    const aItems = filtered.filter((d) => d.areaGroup === a);
    const bItems = filtered.filter((d) => d.areaGroup === b);
    const aBloq = aItems.filter((d) => d.severity === 'bloqueante').length;
    const bBloq = bItems.filter((d) => d.severity === 'bloqueante').length;
    if (aBloq !== bBloq) return bBloq - aBloq;
    return bItems.length - aItems.length;
  });

  const areasHtml = orderedAreas
    .map((area) => {
      const areaItems = filtered.filter((d) => d.areaGroup === area);
      const bloq = areaItems.filter((d) => d.severity === 'bloqueante').length;
      const atenc = areaItems.filter((d) => d.severity === 'atencion').length;
      const isExpanded = expandedMap[area] && areaItems.length > 0;

      const badgesHtml =
        areaItems.length === 0
          ? '<span class="adm-area-empty-line">Sin pendientes en esta vista</span>'
          : `
            ${bloq > 0 ? `<span class="adm-status-pill is-bloqueante io-num">${bloq} bloqueante${bloq > 1 ? 's' : ''}</span>` : ''}
            ${atenc > 0 ? `<span class="adm-status-pill is-atencion io-num">${atenc} atención</span>` : ''}
            ${bloq === 0 && atenc === 0 ? `<span class="adm-status-pill io-num">${areaItems.length} en observación</span>` : ''}
          `;

      const rowsHtml = isExpanded
        ? `
          <div class="adm-area-body">
            <ul class="adm-queue-list" role="listbox" aria-label="Pendientes de ${escapeHtml(area)}">
              ${areaItems
                .map((item) => {
                  const isSelected = selected?.id === item.id;
                  const pillClass = item.acknowledged
                    ? 'is-ok'
                    : item.severity === 'bloqueante'
                      ? 'is-bloqueante'
                      : item.severity === 'atencion'
                        ? 'is-atencion'
                        : '';
                  const statusText = item.acknowledged ? 'Revisado' : item.plazoTexto;
                  return `
                  <li>
                    <button
                      type="button"
                      class="adm-decision-row sev-${item.severity} ${item.acknowledged ? 'is-acknowledged' : ''} ${isSelected ? 'is-selected' : ''}"
                      data-action="select-decision"
                      data-id="${escapeHtml(item.id)}"
                      aria-selected="${isSelected ? 'true' : 'false'}"
                    >
                      <div>
                        <div class="adm-decision-meta-top">
                          <span class="adm-area-tag">${escapeHtml(item.area)}</span>
                          <span class="adm-rule-tag">${escapeHtml(item.ruleCode)}</span>
                        </div>
                        <p class="adm-decision-title">${escapeHtml(item.titulo)}</p>
                        <p class="adm-decision-summary">${escapeHtml(item.resumen)}</p>
                      </div>
                      <div class="adm-decision-right">
                        <span class="adm-decision-impact io-num">${escapeHtml(item.impactoTexto)}</span>
                        <span class="adm-status-pill ${pillClass}">${escapeHtml(statusText)}</span>
                      </div>
                    </button>
                  </li>
                `;
                })
                .join('')}
            </ul>
          </div>
        `
        : '';

      return `
        <article class="adm-area-accordion ${bloq > 0 ? 'has-bloqueante' : ''}">
          <button
            type="button"
            class="adm-area-head"
            data-action="toggle-area"
            data-area="${escapeHtml(area)}"
            aria-expanded="${isExpanded ? 'true' : 'false'}"
          >
            <div class="adm-area-head-left">
              <span class="adm-area-name">${escapeHtml(area)}</span>
              <span class="adm-kbd-hint io-num">(${areaItems.length})</span>
            </div>
            <div class="adm-area-badges">
              ${badgesHtml}
            </div>
          </button>
          ${rowsHtml}
        </article>
      `;
    })
    .join('');

  return `
    <section class="adm-panel" aria-label="Paneles de decisiones y riesgos por área">
      <div class="adm-queue-header">
        <div class="adm-queue-title-row">
          <h2 class="adm-section-title">Decisiones y Riesgos por Área</h2>
          <span class="adm-kbd-hint">Navegar: ↑ / ↓ · Actualizar: R</span>
        </div>
        <div class="adm-filters-row">
          <div class="adm-sev-tabs" role="tablist" aria-label="Filtrar por urgencia">
            ${tabs
              .map(
                (tab) => `
              <button
                type="button"
                role="tab"
                aria-selected="${local.severityFilter === tab.key ? 'true' : 'false'}"
                class="adm-sev-tab ${local.severityFilter === tab.key ? 'is-active' : ''}"
                data-action="set-sev-filter"
                data-filter="${tab.key}"
              >
                ${escapeHtml(tab.label)} <span class="io-num">(${tab.count})</span>
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
      <div class="adm-areas-stack">
        ${areasHtml}
      </div>
    </section>
  `;
}

function renderAckActions(item: AdminDecisionItem): string {
  return `
    <div class="adm-actions-row">
      ${
        !item.acknowledged
          ? `
        <button type="button" class="adm-btn-primary" data-action="acknowledge-item" data-id="${escapeHtml(item.id)}">
          ${icons.checkCircle(16)} Marcar revisado
        </button>
      `
          : `<span class="adm-status-pill is-ok">Toma de conocimiento registrada</span>`
      }
      <a class="adm-btn-secondary" href="${escapeHtml(item.moduleHref)}">${escapeHtml(item.moduleLabel)}</a>
    </div>
  `;
}

function renderContextualDetail(item: AdminDecisionItem | null, snapshot: AdminSnapshot): string {
  if (!item) {
    return `
      <aside class="adm-panel adm-detail-panel" aria-label="Expediente contextual">
        <div class="adm-empty-queue">
          <h3>Sin expedientes pendientes</h3>
          <p>Selecciona un ítem de cualquiera de las 5 áreas para revisar su sustento o aprobar.</p>
        </div>
      </aside>
    `;
  }

  let bodyHtml = '';
  let actionsHtml = '';
  const { meta } = item;

  if (meta.kind === 'campana_mkt') {
    const c = meta.campaign;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Descuento</span>
          <span class="adm-fact-val io-num">${c.porcentajeDescuento}%</span>
        </div>
        <div>
          <span class="adm-fact-label">Tope INDECOPI (RN-MKT-01)</span>
          <span class="adm-fact-val io-num">${c.stock_maximo} unidades</span>
        </div>
        <div>
          <span class="adm-fact-label">Vigencia</span>
          <span class="adm-fact-val io-num">${escapeHtml(c.fecha_inicio)} al ${escapeHtml(c.fecha_fin)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Solicitado por</span>
          <span class="adm-fact-val">${escapeHtml(c.createdBy)}</span>
        </div>
      </div>
      <p class="adm-pokayoke-desc">${escapeHtml(c.descripcion)}</p>
    `;

    if (local.pendingConfirmAction === 'approve_campaign') {
      actionsHtml = `
        <div class="adm-pokayoke-box">
          <p class="adm-pokayoke-title">Confirmar publicación oficial (RN-MKT-04)</p>
          <p class="adm-pokayoke-desc">
            Se activará <strong>"${escapeHtml(c.titulo)}"</strong> con <strong>${c.porcentajeDescuento}%</strong> de descuento y tope de <strong>${c.stock_maximo} u.</strong> hasta el ${escapeHtml(c.fecha_fin)}.
          </p>
          <div class="adm-actions-row">
            <button type="button" class="adm-btn-primary" data-action="confirm-approve-campaign" data-id="${escapeHtml(c.id)}">
              ${icons.checkCircle(16)} Confirmar y publicar
            </button>
            <button type="button" class="adm-btn-secondary" data-action="cancel-confirm">Cancelar</button>
          </div>
        </div>
      `;
    } else if (local.pendingConfirmAction === 'reject_campaign') {
      actionsHtml = `
        <div class="adm-pokayoke-box is-danger">
          <p class="adm-pokayoke-title">Devolver campaña a Marketing</p>
          <label class="form-label small fw-semibold" for="adm-reject-reason">Motivo de devolución (obligatorio)</label>
          <textarea id="adm-reject-reason" class="form-control mb-2" rows="2" placeholder="Ej. Ajustar margen o corregir vigencia..." data-action="input-reject-reason">${escapeHtml(local.rejectReasonDraft)}</textarea>
          <div class="adm-actions-row">
            <button type="button" class="adm-btn-danger-outline" data-action="confirm-reject-campaign" data-id="${escapeHtml(c.id)}">
              Devolver con motivo
            </button>
            <button type="button" class="adm-btn-secondary" data-action="cancel-confirm">Cancelar</button>
          </div>
        </div>
      `;
    } else {
      actionsHtml = `
        <div class="adm-actions-row">
          <button type="button" class="adm-btn-primary" data-action="ask-confirm" data-confirm="approve_campaign">
            ${icons.checkCircle(16)} Aprobar y publicar
          </button>
          <button type="button" class="adm-btn-danger-outline" data-action="ask-confirm" data-confirm="reject_campaign">
            Devolver
          </button>
          <a class="adm-btn-secondary" href="${escapeHtml(item.moduleHref)}">${escapeHtml(item.moduleLabel)}</a>
        </div>
      `;
    }
  } else if (meta.kind === 'editorial_m05') {
    bodyHtml = `
      <p class="adm-pokayoke-desc">
        Los siguientes modelos ya existen en inventario/POS, pero esperan fotografía y copy editorial del Community Manager (TN03) para publicarse en la tienda web:
      </p>
      <table class="adm-subtable">
        <thead><tr><th>Modelo</th><th>Categoría</th><th class="is-num">Variantes</th></tr></thead>
        <tbody>
          ${meta.products
            .slice(0, 6)
            .map(
              (p) => `
            <tr>
              <td><strong>${escapeHtml(p.nombre)}</strong> (${escapeHtml(p.marca)})</td>
              <td>${escapeHtml(p.categorySlug)}</td>
              <td class="is-num">${p.variants.length}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
    actionsHtml = renderAckActions(item);
  } else if (meta.kind === 'proveedor_m04') {
    const sup = meta.supplier;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Razón social</span>
          <span class="adm-fact-val">${escapeHtml(sup.razonSocial)}</span>
        </div>
        <div>
          <span class="adm-fact-label">RUC</span>
          <span class="adm-fact-val io-num">${escapeHtml(sup.ruc)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Contacto</span>
          <span class="adm-fact-val">${escapeHtml(sup.contacto)} (${escapeHtml(sup.telefono)})</span>
        </div>
        <div>
          <span class="adm-fact-label">Rubro</span>
          <span class="adm-fact-val">${escapeHtml(sup.rubro)}</span>
        </div>
      </div>
      <p class="adm-pokayoke-desc">Registrado por ${escapeHtml(sup.creadoPor)}. Validar este proveedor lo habilita para recibir órdenes de compra (RN-COM-01).</p>
    `;

    if (local.pendingConfirmAction === 'approve_supplier') {
      actionsHtml = `
        <div class="adm-pokayoke-box">
          <p class="adm-pokayoke-title">Validar y habilitar proveedor</p>
          <p class="adm-pokayoke-desc">
            Se habilitará a <strong>${escapeHtml(sup.razonSocial)}</strong> (RUC ${escapeHtml(sup.ruc)}) en la cartera oficial de compras.
          </p>
          <div class="adm-actions-row">
            <button type="button" class="adm-btn-primary" data-action="confirm-approve-supplier" data-id="${escapeHtml(sup.id)}">
              ${icons.checkCircle(16)} Confirmar habilitación
            </button>
            <button type="button" class="adm-btn-secondary" data-action="cancel-confirm">Cancelar</button>
          </div>
        </div>
      `;
    } else if (local.pendingConfirmAction === 'reject_supplier') {
      actionsHtml = `
        <div class="adm-pokayoke-box is-danger">
          <p class="adm-pokayoke-title">Rechazar proveedor</p>
          <label class="form-label small fw-semibold" for="adm-reject-reason">Motivo de rechazo (obligatorio)</label>
          <textarea id="adm-reject-reason" class="form-control mb-2" rows="2" placeholder="Ej. RUC no habido o condiciones no aprobadas..." data-action="input-reject-reason">${escapeHtml(local.rejectReasonDraft)}</textarea>
          <div class="adm-actions-row">
            <button type="button" class="adm-btn-danger-outline" data-action="confirm-reject-supplier" data-id="${escapeHtml(sup.id)}">
              Confirmar rechazo
            </button>
            <button type="button" class="adm-btn-secondary" data-action="cancel-confirm">Cancelar</button>
          </div>
        </div>
      `;
    } else {
      actionsHtml = `
        <div class="adm-actions-row">
          <button type="button" class="adm-btn-primary" data-action="ask-confirm" data-confirm="approve_supplier">
            ${icons.checkCircle(16)} Validar proveedor
          </button>
          <button type="button" class="adm-btn-danger-outline" data-action="ask-confirm" data-confirm="reject_supplier">
            Rechazar
          </button>
          <a class="adm-btn-secondary" href="${escapeHtml(item.moduleHref)}">${escapeHtml(item.moduleLabel)}</a>
        </div>
      `;
    }
  } else if (meta.kind === 'compra_oc') {
    const oc = meta.purchase;
    const liquidezRestante = snapshot.pulse.liquidezEfectiva - oc.totalEstimado;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Proveedor</span>
          <span class="adm-fact-val">${escapeHtml(oc.proveedorNombre)}</span>
        </div>
        <div>
          <span class="adm-fact-label">RUC</span>
          <span class="adm-fact-val io-num">${escapeHtml(oc.proveedorRuc)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Monto estimado</span>
          <span class="adm-fact-val io-num">${formatPen(oc.totalEstimado)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Saldo tras autorizar</span>
          <span class="adm-fact-val io-num">${formatPen(liquidezRestante)}</span>
        </div>
      </div>
      <table class="adm-subtable">
        <thead>
          <tr><th>SKU / Prenda</th><th class="is-num">Cant.</th><th class="is-num">Costo u.</th></tr>
        </thead>
        <tbody>
          ${oc.items
            .map(
              (it) => `
            <tr>
              <td><strong>${escapeHtml(it.sku)}</strong> · ${escapeHtml(it.nombre)} (${escapeHtml(it.talla)} / ${escapeHtml(it.color)})</td>
              <td class="is-num">${it.cantidadSolicitada}</td>
              <td class="is-num">${formatPen(it.costoUnitario)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    if (local.pendingConfirmAction === 'approve_oc') {
      actionsHtml = `
        <div class="adm-pokayoke-box">
          <p class="adm-pokayoke-title">Autorizar emisión de Orden de Compra</p>
          <p class="adm-pokayoke-desc">
            Se habilitará la recepción física de <strong>${escapeHtml(oc.id)}</strong> por <strong>${formatPen(oc.totalEstimado)}</strong> para ${escapeHtml(oc.proveedorNombre)}.
          </p>
          <div class="adm-actions-row">
            <button type="button" class="adm-btn-primary" data-action="confirm-approve-oc" data-id="${escapeHtml(oc.id)}">
              ${icons.checkCircle(16)} Confirmar autorización
            </button>
            <button type="button" class="adm-btn-secondary" data-action="cancel-confirm">Cancelar</button>
          </div>
        </div>
      `;
    } else if (local.pendingConfirmAction === 'reject_oc') {
      actionsHtml = `
        <div class="adm-pokayoke-box is-danger">
          <p class="adm-pokayoke-title">Rechazar Orden de Compra</p>
          <label class="form-label small fw-semibold" for="adm-reject-reason">Motivo de rechazo (obligatorio)</label>
          <textarea id="adm-reject-reason" class="form-control mb-2" rows="2" placeholder="Ej. Postergar compra hasta cierre de caja..." data-action="input-reject-reason">${escapeHtml(local.rejectReasonDraft)}</textarea>
          <div class="adm-actions-row">
            <button type="button" class="adm-btn-danger-outline" data-action="confirm-reject-oc" data-id="${escapeHtml(oc.id)}">
              Confirmar rechazo
            </button>
            <button type="button" class="adm-btn-secondary" data-action="cancel-confirm">Cancelar</button>
          </div>
        </div>
      `;
    } else {
      actionsHtml = `
        <div class="adm-actions-row">
          <button type="button" class="adm-btn-primary" data-action="ask-confirm" data-confirm="approve_oc">
            ${icons.checkCircle(16)} Autorizar OC
          </button>
          <button type="button" class="adm-btn-danger-outline" data-action="ask-confirm" data-confirm="reject_oc">
            Rechazar
          </button>
          <a class="adm-btn-secondary" href="${escapeHtml(item.moduleHref)}">${escapeHtml(item.moduleLabel)}</a>
        </div>
      `;
    }
  } else if (meta.kind === 'planilla_m07') {
    const p = meta.payroll;
    const canPay = snapshot.pulse.liquidezEfectiva >= p.totalNeto;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Periodo</span>
          <span class="adm-fact-val">${escapeHtml(p.periodoLabel)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Total neto a desembolsar</span>
          <span class="adm-fact-val io-num">${formatPen(p.totalNeto)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Liquidez verificada (RN-FIN-02)</span>
          <span class="adm-fact-val io-num">${formatPen(snapshot.pulse.liquidezEfectiva)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Estado de cobertura</span>
          <span class="adm-fact-val">${canPay ? 'Liquidez suficiente' : 'Insuficiente — bloqueado'}</span>
        </div>
      </div>
      <table class="adm-subtable">
        <thead>
          <tr><th>Colaborador</th><th>Rol</th><th class="is-num">Neto</th></tr>
        </thead>
        <tbody>
          ${p.empleados
            .map(
              (emp) => `
            <tr>
              <td>${escapeHtml(emp.nombre)}</td>
              <td>${escapeHtml(emp.rolCodigo)} · ${escapeHtml(emp.cargo)}</td>
              <td class="is-num">${formatPen(emp.neto)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <div class="adm-pokayoke-box ${canPay ? '' : 'is-danger'}">
        <p class="adm-pokayoke-title">Inmutabilidad de cierre (RN-FIN-05)</p>
        <p class="adm-pokayoke-desc">
          ${
            canPay
              ? 'Una vez ejecutado el pago, la planilla queda cerrada sin posibilidad de edición retroactiva y se registra en MovimientoFinanciero.'
              : 'No es posible cerrar la planilla hasta contar con liquidez suficiente en cuenta o caja.'
          }
        </p>
        ${
          canPay
            ? `
          <div class="form-check mb-2">
            <input
              class="form-check-input"
              type="checkbox"
              id="adm-payroll-confirm"
              ${local.payrollConfirmChecked ? 'checked' : ''}
              data-action="toggle-payroll-confirm"
            />
            <label class="form-check-label small" for="adm-payroll-confirm">
              Confirmo la verificación de liquidez y la inmutabilidad del cierre de ${escapeHtml(p.periodoLabel)}.
            </label>
          </div>
        `
            : ''
        }
      </div>
    `;

    actionsHtml = `
      <div class="adm-actions-row">
        <button
          type="button"
          class="adm-btn-primary"
          data-action="execute-payroll"
          ${!canPay || !local.payrollConfirmChecked ? 'disabled' : ''}
        >
          ${icons.checkCircle(16)} Ejecutar y cerrar planilla
        </button>
        <a class="adm-btn-secondary" href="${escapeHtml(item.moduleHref)}">${escapeHtml(item.moduleLabel)}</a>
      </div>
    `;
  } else if (meta.kind === 'stock_critico_m04') {
    const items = meta.items;
    const defaultSku = items.some((i) => i.sku === local.quickRestockSku)
      ? local.quickRestockSku
      : items[0]?.sku ?? '';
    local.quickRestockSku = defaultSku;

    bodyHtml = `
      <table class="adm-subtable">
        <thead>
          <tr><th>SKU / Prenda</th><th class="is-num">Stock</th></tr>
        </thead>
        <tbody>
          ${items
            .slice(0, 6)
            .map(
              (it) => `
            <tr>
              <td><strong>${escapeHtml(it.sku)}</strong> · ${escapeHtml(it.nombre)} (${escapeHtml(it.talla)} / ${escapeHtml(it.color)})</td>
              <td class="is-num">${it.stock} u.</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <div class="adm-pokayoke-box">
        <p class="adm-pokayoke-title">Reposición directa desde Dirección (RN-INV-03)</p>
        <div class="row g-2 mb-2">
          <div class="col-12 col-sm-7">
            <label class="form-label small fw-semibold mb-1" for="adm-restock-sku">SKU crítico</label>
            <select id="adm-restock-sku" class="form-select form-select-sm" data-action="set-restock-sku">
              ${items
                .map(
                  (it) => `
                <option value="${escapeHtml(it.sku)}" ${it.sku === defaultSku ? 'selected' : ''}>
                  ${escapeHtml(it.sku)} (${it.stock} u.) — ${escapeHtml(it.nombre)}
                </option>
              `
                )
                .join('')}
            </select>
          </div>
          <div class="col-12 col-sm-5">
            <label class="form-label small fw-semibold mb-1" for="adm-restock-qty">Unidades</label>
            <input
              id="adm-restock-qty"
              type="number"
              min="1"
              max="200"
              class="form-control form-control-sm io-num"
              value="${local.quickRestockQty}"
              data-action="set-restock-qty"
            />
          </div>
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="adm-restock-approve"
            ${local.quickRestockApproveNow ? 'checked' : ''}
            data-action="toggle-restock-approve"
          />
          <label class="form-check-label small" for="adm-restock-approve">
            Aprobar orden inmediatamente para recepción en Almacén
          </label>
        </div>
      </div>
    `;

    actionsHtml = `
      <div class="adm-actions-row">
        <button type="button" class="adm-btn-primary" data-action="create-quick-restock">
          ${icons.checkCircle(16)} Emitir orden de reposición
        </button>
        ${
          !item.acknowledged
            ? `<button type="button" class="adm-btn-secondary" data-action="acknowledge-item" data-id="${escapeHtml(item.id)}">Marcar revisado</button>`
            : ''
        }
        <a class="adm-btn-secondary" href="${escapeHtml(item.moduleHref)}">${escapeHtml(item.moduleLabel)}</a>
      </div>
    `;
  } else if (meta.kind === 'prestamo_m06') {
    const loan = meta.loan;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Constancia</span>
          <span class="adm-fact-val io-num">${escapeHtml(loan.constanciaCodigo)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Autorización</span>
          <span class="adm-fact-val">${loan.gerenteDisponible ? 'Gerente disponible' : 'Emitida por Almacenero (RN-PRE-01)'}</span>
        </div>
        <div>
          <span class="adm-fact-label">Tienda aliada</span>
          <span class="adm-fact-val">${escapeHtml(loan.tiendaAliada)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Plazo límite (máx. 7 d)</span>
          <span class="adm-fact-val io-num">${escapeHtml(loan.fechaLimite)} (${meta.diasRestantes} d)</span>
        </div>
      </div>
      <table class="adm-subtable">
        <thead>
          <tr><th>Prenda</th><th class="is-num">Cant.</th><th class="is-num">Valor ref.</th></tr>
        </thead>
        <tbody>
          ${loan.items
            .map(
              (it) => `
            <tr>
              <td>${escapeHtml(it.sku)} · ${escapeHtml(it.nombre)} (${escapeHtml(it.talla)})</td>
              <td class="is-num">${it.cantidad}</td>
              <td class="is-num">${formatPen(it.precioReferencia * it.cantidad)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
    actionsHtml = renderAckActions(item);
  } else if (meta.kind === 'inconformidad_m04') {
    const oc = meta.purchase;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Orden / Guía</span>
          <span class="adm-fact-val io-num">${escapeHtml(oc.id)} · ${escapeHtml(oc.guiaRemision ?? 'Sin guía')}</span>
        </div>
        <div>
          <span class="adm-fact-label">Monto retenido</span>
          <span class="adm-fact-val io-num">${formatPen(oc.totalEstimado)}</span>
        </div>
      </div>
      <p class="adm-pokayoke-desc"><strong>Observación física:</strong> ${escapeHtml(oc.notaInconformidad ?? 'Diferencia en recepción')}</p>
    `;
    actionsHtml = renderAckActions(item);
  } else if (meta.kind === 'despacho_m03') {
    const d = meta.dispatch;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Pedido / Tracking</span>
          <span class="adm-fact-val io-num">${escapeHtml(d.pedidoRef)} · ${escapeHtml(d.trackingCode ?? 'Pendiente')}</span>
        </div>
        <div>
          <span class="adm-fact-label">Destino</span>
          <span class="adm-fact-val">${escapeHtml(d.distrito)} · ${escapeHtml(d.clienteNombre)}</span>
        </div>
      </div>
      <p class="adm-pokayoke-desc">Dirección: ${escapeHtml(d.direccion)}. Intentos registrados: ${d.intentos.length} de 2 permitidos (RN-ENV-02).</p>
    `;
    actionsHtml = renderAckActions(item);
  } else if (meta.kind === 'anulacion_m01') {
    const o = meta.order;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Orden POS</span>
          <span class="adm-fact-val io-num">${escapeHtml(o.id)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Vendedor</span>
          <span class="adm-fact-val">${escapeHtml(o.vendedorNombre)}</span>
        </div>
      </div>
      <p class="adm-pokayoke-desc">Motivo registrado: ${escapeHtml(o.motivoCancelacion ?? 'Sin detalle')}.</p>
    `;
    actionsHtml = renderAckActions(item);
  } else if (meta.kind === 'aliado_m01') {
    const debt = meta.debt;
    bodyHtml = `
      <div class="adm-facts-grid">
        <div>
          <span class="adm-fact-label">Aliado</span>
          <span class="adm-fact-val">${escapeHtml(debt.negocioNombre)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Saldo pendiente</span>
          <span class="adm-fact-val io-num">${formatPen(debt.saldoPendiente)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Vencimiento</span>
          <span class="adm-fact-val io-num">${escapeHtml(debt.fechaVencimiento)}</span>
        </div>
        <div>
          <span class="adm-fact-label">Autorizó</span>
          <span class="adm-fact-val">${escapeHtml(debt.autorizadoPor)}</span>
        </div>
      </div>
      <p class="adm-pokayoke-desc">${escapeHtml(debt.descripcionPrendas)}</p>
    `;
    actionsHtml = renderAckActions(item);
  }

  return `
    <aside class="adm-panel adm-detail-panel sev-${item.severity}" aria-label="Expediente contextual">
      <div class="adm-detail-head">
        <div>
          <div class="adm-decision-meta-top">
            <span class="adm-area-tag">${escapeHtml(item.areaGroup)}</span>
            <span class="adm-rule-tag">${escapeHtml(item.ruleCode)}</span>
            <span class="adm-area-tag">${formatDateTimeShort(item.timestamp)}</span>
          </div>
          <h3 class="adm-detail-title">${escapeHtml(item.titulo)}</h3>
        </div>
      </div>
      ${bodyHtml}
      ${actionsHtml}
    </aside>
  `;
}

function renderAuditLayer(snapshot: AdminSnapshot): string {
  const entries =
    local.auditAreaFilter === 'todas'
      ? snapshot.unifiedAudit
      : snapshot.unifiedAudit.filter((entry) => entry.area.includes(local.auditAreaFilter));

  return `
    <details class="adm-audit-section" open>
      <summary class="adm-audit-summary">
        <div>
          <h2 class="adm-section-title">Bitácora de Trazabilidad y Cierre</h2>
        </div>
        <span class="adm-kbd-hint io-num">${entries.length} eventos recientes (RN-SEG-03)</span>
      </summary>
      <div class="adm-audit-body">
        <div class="d-flex justify-content-end mb-2">
          <select class="form-select adm-area-select" aria-label="Filtrar bitácora por módulo" data-action="set-audit-filter">
            <option value="todas" ${local.auditAreaFilter === 'todas' ? 'selected' : ''}>Todos los módulos</option>
            <option value="M07" ${local.auditAreaFilter === 'M07' ? 'selected' : ''}>Finanzas / Planilla (M07)</option>
            <option value="M04" ${local.auditAreaFilter === 'M04' ? 'selected' : ''}>Compras (M04)</option>
            <option value="M05" ${local.auditAreaFilter === 'M05' ? 'selected' : ''}>Marketing (M05)</option>
            <option value="M06" ${local.auditAreaFilter === 'M06' ? 'selected' : ''}>Préstamos (M06)</option>
            <option value="M03" ${local.auditAreaFilter === 'M03' ? 'selected' : ''}>Envíos (M03)</option>
          </select>
        </div>
        <div class="adm-audit-table-wrap">
          <table class="adm-audit-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Área</th>
                <th>Regla</th>
                <th>Evento registrado</th>
              </tr>
            </thead>
            <tbody>
              ${entries
                .slice(0, 15)
                .map(
                  (entry) => `
                <tr>
                  <td class="io-num text-nowrap">${formatDateTimeShort(entry.timestamp)}</td>
                  <td>${escapeHtml(entry.actor)}</td>
                  <td>${escapeHtml(entry.area)}</td>
                  <td><span class="adm-rule-tag">${escapeHtml(entry.ruleCode)}</span></td>
                  <td>${escapeHtml(entry.detail)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  `;
}

function renderAnalyticsTab(snapshot: AdminSnapshot): string {
  const { analytics } = snapshot;
  const maxCanal = Math.max(
    1,
    analytics.canalBreakdown.tiendaCobrado,
    analytics.canalBreakdown.webPagado,
    analytics.canalBreakdown.pendientePos
  );
  const maxCatValor = Math.max(1, ...analytics.categorias.map((c) => c.valorInventario));

  return `
    <div class="adm-analytics-grid">
      <article class="adm-chart-card">
        <h3 class="adm-chart-title">Distribución Omnicanal de Ingresos</h3>
        <p class="adm-chart-sub">Comparativa entre ventas cobradas en Tienda Física, E-commerce y órdenes pendientes en Caja.</p>
        <div class="adm-bar-list">
          <div class="adm-bar-row">
            <div class="adm-bar-label-row io-num">
              <span>Tienda Física (POS cobrado)</span>
              <strong>${formatPen(analytics.canalBreakdown.tiendaCobrado)}</strong>
            </div>
            <div class="adm-bar-track">
              <div class="adm-bar-fill" style="width: ${Math.round((analytics.canalBreakdown.tiendaCobrado / maxCanal) * 100)}%"></div>
            </div>
          </div>
          <div class="adm-bar-row">
            <div class="adm-bar-label-row io-num">
              <span>E-commerce (Pago confirmado)</span>
              <strong>${formatPen(analytics.canalBreakdown.webPagado)}</strong>
            </div>
            <div class="adm-bar-track">
              <div class="adm-bar-fill is-terracotta" style="width: ${Math.round((analytics.canalBreakdown.webPagado / maxCanal) * 100)}%"></div>
            </div>
          </div>
          <div class="adm-bar-row">
            <div class="adm-bar-label-row io-num">
              <span>Por cobrar en Caja (POS pendiente)</span>
              <strong>${formatPen(analytics.canalBreakdown.pendientePos)}</strong>
            </div>
            <div class="adm-bar-track">
              <div class="adm-bar-fill is-ok" style="width: ${Math.round((analytics.canalBreakdown.pendientePos / maxCanal) * 100)}%"></div>
            </div>
          </div>
        </div>
      </article>

      <article class="adm-chart-card">
        <h3 class="adm-chart-title">Consumo de Campañas INDECOPI (RN-MKT-01)</h3>
        <p class="adm-chart-sub">Uso del stock máximo autorizado en campañas promocionales activas.</p>
        ${
          analytics.campanasActivas.length === 0
            ? '<p class="adm-pokayoke-desc mb-0">No hay campañas activas en este momento.</p>'
            : `
          <div class="adm-bar-list">
            ${analytics.campanasActivas
              .map(
                (c) => `
              <div class="adm-bar-row">
                <div class="adm-bar-label-row io-num">
                  <span>${escapeHtml(c.titulo)} (-${c.descuento}%)</span>
                  <strong>${c.consumido}/${c.maximo} u. (${c.porcentaje}%)</strong>
                </div>
                <div class="adm-bar-track">
                  <div class="adm-bar-fill is-terracotta" style="width: ${c.porcentaje}%"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </article>

      <article class="adm-chart-card">
        <h3 class="adm-chart-title">Valorización y Riesgo por Categoría</h3>
        <p class="adm-chart-sub">Capital en stock a precio de venta y SKUs en umbral crítico (≤ 5 u.).</p>
        <div class="adm-bar-list">
          ${analytics.categorias
            .map(
              (cat) => `
            <div class="adm-bar-row">
              <div class="adm-bar-label-row io-num">
                <span>${escapeHtml(cat.nombre)} (${cat.stockTotal} u. · ${cat.skusCriticos} crít.)</span>
                <strong>${formatPen(cat.valorInventario)}</strong>
              </div>
              <div class="adm-bar-track">
                <div class="adm-bar-fill" style="width: ${Math.round((cat.valorInventario / maxCatValor) * 100)}%"></div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </article>

      <article class="adm-chart-card">
        <h3 class="adm-chart-title">Consignaciones (M06) y Cartera de Proveedores</h3>
        <p class="adm-chart-sub">Estado consolidado de préstamos a tiendas aliadas y homologación de proveedores.</p>
        <div class="adm-facts-grid mb-2">
          <div>
            <span class="adm-fact-label">Consignaciones activas</span>
            <span class="adm-fact-val io-num">${analytics.consignacionesResumen.activas} (${formatPen(analytics.consignacionesResumen.capitalActivo)})</span>
          </div>
          <div>
            <span class="adm-fact-label">Cerradas (Dev. / Liq.)</span>
            <span class="adm-fact-val io-num">${analytics.consignacionesResumen.devueltas} dev. · ${analytics.consignacionesResumen.liquidadas} liq.</span>
          </div>
          <div>
            <span class="adm-fact-label">Proveedores habilitados</span>
            <span class="adm-fact-val io-num">${analytics.proveedoresResumen.aprobados} aprobados</span>
          </div>
          <div>
            <span class="adm-fact-label">Proveedores por validar</span>
            <span class="adm-fact-val io-num">${analytics.proveedoresResumen.pendientes} pendientes · ${analytics.proveedoresResumen.rechazados} rech.</span>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderAltasTab(snapshot: AdminSnapshot): string {
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  return `
    <div class="adm-altas-grid">
      <section class="adm-chart-card" aria-label="Crear nuevo modelo de ropa">
        <h3 class="adm-chart-title">Nuevo Modelo de Ropa (Paso 1 · Dirección)</h3>
        <p class="adm-chart-sub">
          Crea el modelo y sus SKUs con precio y stock inicial. Quedará disponible de inmediato en <strong>Mostrador POS</strong> y entrará a la cola <strong>Recién llegados</strong> de Marketing para fotos y copy.
        </p>
        <form id="form-admin-new-model" class="d-flex flex-column gap-2">
          <div class="row g-2">
            <div class="col-12 col-sm-7">
              <label for="adm-mod-nombre" class="form-label small fw-semibold mb-1">Nombre del modelo *</label>
              <input id="adm-mod-nombre" type="text" class="form-control form-control-sm" required placeholder="Ej. Blazer Lino Estructurado" />
            </div>
            <div class="col-12 col-sm-5">
              <label for="adm-mod-marca" class="form-label small fw-semibold mb-1">Marca *</label>
              <select id="adm-mod-marca" class="form-select form-select-sm">
                ${MARCAS_TIENDA.map((m) => `<option value="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="row g-2">
            <div class="col-12 col-sm-6">
              <label for="adm-mod-cat" class="form-label small fw-semibold mb-1">Categoría *</label>
              <select id="adm-mod-cat" class="form-select form-select-sm">
                ${CATEGORIAS_TIENDA.map((c) => `<option value="${c.slug}">${escapeHtml(c.nombre)}</option>`).join('')}
              </select>
            </div>
            <div class="col-12 col-sm-6">
              <label for="adm-mod-gen" class="form-label small fw-semibold mb-1">Público / Género *</label>
              <select id="adm-mod-gen" class="form-select form-select-sm">
                <option value="mujer">Mujer</option>
                <option value="hombre">Hombre</option>
                <option value="unisex">Unisex</option>
                <option value="ninos">Niños</option>
              </select>
            </div>
          </div>
          <div class="row g-2">
            <div class="col-6">
              <label for="adm-mod-precio" class="form-label small fw-semibold mb-1">Precio venta (S/) *</label>
              <input id="adm-mod-precio" type="number" min="1" step="0.5" value="149.00" class="form-control form-control-sm io-num" required />
            </div>
            <div class="col-6">
              <label for="adm-mod-stock" class="form-label small fw-semibold mb-1">Stock inicial por talla *</label>
              <input id="adm-mod-stock" type="number" min="0" value="10" class="form-control form-control-sm io-num" required />
            </div>
          </div>
          <div class="row g-2 align-items-end">
            <div class="col-8">
              <label for="adm-mod-color" class="form-label small fw-semibold mb-1">Color principal</label>
              <input id="adm-mod-color" type="text" value="Arena Piedra" class="form-control form-control-sm" />
            </div>
            <div class="col-4">
              <label for="adm-mod-hex" class="form-label small fw-semibold mb-1">Muestra</label>
              <input id="adm-mod-hex" type="color" value="#C9B8A6" class="form-control form-control-sm form-control-color w-100" />
            </div>
          </div>
          <div>
            <span class="form-label small fw-semibold d-block mb-1">Tallas a generar (SKUs) *</span>
            <div class="adm-size-checks">
              ${sizes
                .map(
                  (talla) => `
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="adm-size-${talla}" name="adm-mod-sizes" value="${talla}" ${talla === 'S' || talla === 'M' || talla === 'L' ? 'checked' : ''} />
                  <label class="form-check-label small fw-semibold" for="adm-size-${talla}">${talla}</label>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
          <div>
            <label for="adm-mod-desc" class="form-label small fw-semibold mb-1">Nota base / material (opcional)</label>
            <input id="adm-mod-desc" type="text" class="form-control form-control-sm" placeholder="Ej. Sastrería ligera en mezcla de lino y algodón pima." />
          </div>
          <div class="adm-actions-row">
            <button type="submit" class="adm-btn-primary">
              ${icons.checkCircle(16)} Crear modelo y enviar a Marketing
            </button>
          </div>
        </form>
      </section>

      <section class="adm-chart-card" aria-label="Cartera y alta directa de proveedores">
        <h3 class="adm-chart-title">Cartera de Proveedores (M04)</h3>
        <p class="adm-chart-sub">
          Almacén registra candidatos en estado <em>pendiente</em> y Dirección los valida aquí o da de alta proveedores directos.
        </p>
        <table class="adm-subtable">
          <thead>
            <tr><th>Razón Social / RUC</th><th>Rubro</th><th>Estado</th></tr>
          </thead>
          <tbody>
            ${snapshot.suppliers
              .map((sup) => {
                const pill =
                  sup.status === 'aprobado'
                    ? '<span class="adm-status-pill is-ok">Aprobado</span>'
                    : sup.status === 'pendiente_validacion'
                      ? '<span class="adm-status-pill is-bloqueante">Pendiente</span>'
                      : '<span class="adm-status-pill">Rechazado</span>';
                return `
                <tr>
                  <td><strong>${escapeHtml(sup.razonSocial)}</strong><br/><span class="adm-kbd-hint io-num">RUC ${escapeHtml(sup.ruc)}</span></td>
                  <td>${escapeHtml(sup.rubro)}</td>
                  <td>${pill}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
        <hr class="my-3" />
        <h4 class="h6 fw-bold mb-2">Alta directa de proveedor aprobado</h4>
        <form id="form-admin-new-supplier" class="d-flex flex-column gap-2">
          <div class="row g-2">
            <div class="col-5">
              <label for="adm-sup-ruc" class="form-label small fw-semibold mb-1">RUC (11 dígitos) *</label>
              <input id="adm-sup-ruc" type="text" maxlength="11" class="form-control form-control-sm io-num" required placeholder="20609988776" />
            </div>
            <div class="col-7">
              <label for="adm-sup-razon" class="form-label small fw-semibold mb-1">Razón social *</label>
              <input id="adm-sup-razon" type="text" class="form-control form-control-sm" required placeholder="Ej. Hilandería Peruana SAC" />
            </div>
          </div>
          <div class="row g-2">
            <div class="col-6">
              <label for="adm-sup-contacto" class="form-label small fw-semibold mb-1">Contacto</label>
              <input id="adm-sup-contacto" type="text" class="form-control form-control-sm" placeholder="Nombre" />
            </div>
            <div class="col-6">
              <label for="adm-sup-rubro" class="form-label small fw-semibold mb-1">Rubro</label>
              <input id="adm-sup-rubro" type="text" class="form-control form-control-sm" placeholder="Ej. Lino y sastrería" />
            </div>
          </div>
          <div class="adm-actions-row">
            <button type="submit" class="adm-btn-secondary">
              + Dar de alta proveedor aprobado
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function render(): void {
  latestSnapshot = buildAdminSnapshot();
  const filtered = getFilteredDecisions(latestSnapshot);
  const selected = ensureSelectedDecision(filtered);

  const feedbackHtml = local.feedback
    ? `
      <div class="adm-feedback-banner is-${local.feedback.kind}">
        <span>${escapeHtml(local.feedback.text)}</span>
        <button type="button" class="btn-close" aria-label="Cerrar aviso" data-action="dismiss-feedback"></button>
      </div>
    `
    : '';

  let mainContent = '';
  if (local.activeTab === 'mesa_control') {
    mainContent = `
      ${renderPulseLayer(latestSnapshot)}
      <div class="adm-workspace">
        ${renderAreaPanels(latestSnapshot, filtered, selected)}
        ${renderContextualDetail(selected, latestSnapshot)}
      </div>
      ${renderAuditLayer(latestSnapshot)}
    `;
  } else if (local.activeTab === 'analitica') {
    mainContent = `
      ${renderPulseLayer(latestSnapshot)}
      ${renderAnalyticsTab(latestSnapshot)}
    `;
  } else {
    mainContent = renderAltasTab(latestSnapshot);
  }

  root.innerHTML = `
    ${renderTopbar()}
    <main class="adm-shell">
      <div class="adm-header-meta">
        <div>
          <h2 class="adm-page-title">Mesa de Control por Excepción</h2>
          <p class="adm-page-sub">Supervisión por áreas, autorizaciones con sustento, analítica omnicanal y altas maestras.</p>
        </div>
        <div class="adm-refresh-bar io-num">
          <span>Actualizado: ${formatDateTimeShort(latestSnapshot.lastRefreshedAt)}</span>
        </div>
      </div>
      ${renderViewTabs(latestSnapshot)}
      ${feedbackHtml}
      ${mainContent}
    </main>
  `;

  bindBrandLogo(root);
}

function setFeedback(kind: 'ok' | 'err' | 'warn', text: string): void {
  local.feedback = { kind, text };
}

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'logout') {
    logoutToAccess();
    return;
  }

  if (action === 'refresh-all') {
    setFeedback('ok', 'Pulso y paneles sincronizados con los módulos operativos.');
    render();
    return;
  }

  if (action === 'dismiss-feedback') {
    local.feedback = null;
    render();
    return;
  }

  if (action === 'set-tab') {
    local.activeTab = (target.dataset.tab as AdminTab) ?? 'mesa_control';
    local.pendingConfirmAction = null;
    render();
    return;
  }

  if (action === 'toggle-area') {
    const area = target.dataset.area as AdminAreaGroup | undefined;
    if (!area) return;
    if (!local.expandedAreas) {
      local.expandedAreas = getExpandedAreasMap(latestSnapshot, getFilteredDecisions(latestSnapshot));
    }
    local.expandedAreas[area] = !local.expandedAreas[area];
    render();
    return;
  }

  if (action === 'set-sev-filter') {
    local.severityFilter = (target.dataset.filter as AdminDecisionFilter) ?? 'todos';
    local.pendingConfirmAction = null;
    render();
    return;
  }

  if (action === 'select-decision') {
    local.selectedDecisionId = target.dataset.id ?? null;
    local.pendingConfirmAction = null;
    local.rejectReasonDraft = '';
    local.payrollConfirmChecked = false;
    render();
    return;
  }

  if (action === 'ask-confirm') {
    local.pendingConfirmAction = target.dataset.confirm ?? null;
    local.rejectReasonDraft = '';
    render();
    return;
  }

  if (action === 'cancel-confirm') {
    local.pendingConfirmAction = null;
    local.rejectReasonDraft = '';
    render();
    return;
  }

  if (action === 'confirm-approve-campaign') {
    const id = target.dataset.id ?? '';
    const res = approveCampaign(id, `${currentSession.displayName} (Admin)`);
    local.pendingConfirmAction = null;
    setFeedback(res.ok ? 'ok' : 'err', res.message);
    render();
    return;
  }

  if (action === 'confirm-reject-campaign') {
    const id = target.dataset.id ?? '';
    const res = rejectCampaign(
      id,
      local.rejectReasonDraft,
      `${currentSession.displayName} (Admin)`
    );
    if (res.ok) {
      local.pendingConfirmAction = null;
      local.rejectReasonDraft = '';
    }
    setFeedback(res.ok ? 'warn' : 'err', res.message);
    render();
    return;
  }

  if (action === 'confirm-approve-supplier') {
    const id = target.dataset.id ?? '';
    const res = approveSupplier(id, `${currentSession.displayName} (Admin)`);
    local.pendingConfirmAction = null;
    setFeedback(
      res.ok ? 'ok' : 'err',
      res.ok ? `Proveedor ${res.supplier.razonSocial} validado y habilitado para compras.` : res.error
    );
    render();
    return;
  }

  if (action === 'confirm-reject-supplier') {
    const id = target.dataset.id ?? '';
    const res = rejectSupplier(
      id,
      local.rejectReasonDraft,
      `${currentSession.displayName} (Admin)`
    );
    if (res.ok) {
      local.pendingConfirmAction = null;
      local.rejectReasonDraft = '';
    }
    setFeedback(
      res.ok ? 'warn' : 'err',
      res.ok ? `Proveedor ${res.supplier.razonSocial} rechazado.` : res.error
    );
    render();
    return;
  }

  if (action === 'confirm-approve-oc') {
    const id = target.dataset.id ?? '';
    const res = approvePurchaseOrder(id, `${currentSession.displayName} (Admin)`);
    local.pendingConfirmAction = null;
    setFeedback(
      res.ok ? 'ok' : 'err',
      res.ok ? `Orden ${res.purchase.id} autorizada y enviada a Almacén.` : res.error
    );
    render();
    return;
  }

  if (action === 'confirm-reject-oc') {
    const id = target.dataset.id ?? '';
    const res = rejectPurchaseOrder(
      id,
      local.rejectReasonDraft,
      `${currentSession.displayName} (Admin)`
    );
    if (res.ok) {
      local.pendingConfirmAction = null;
      local.rejectReasonDraft = '';
    }
    setFeedback(
      res.ok ? 'warn' : 'err',
      res.ok ? `Orden ${res.purchase.id} rechazada con trazabilidad.` : res.error
    );
    render();
    return;
  }

  if (action === 'execute-payroll') {
    const res = executePayroll(currentSession.displayName);
    local.payrollConfirmChecked = false;
    setFeedback(
      res.ok ? 'ok' : 'err',
      res.ok
        ? `Planilla ${res.state.payroll.periodoLabel} pagada y cerrada (Ref. ${res.state.payroll.referenciaBanco}).`
        : res.error
    );
    render();
    return;
  }

  if (action === 'create-quick-restock') {
    const approvedSup = latestSnapshot.suppliers.find((s) => s.status === 'aprobado');
    const res = createPurchaseRequest({
      proveedorNombre: approvedSup?.razonSocial ?? 'Textiles Andinos del Sur SAC',
      proveedorRuc: approvedSup?.ruc ?? '20548796321',
      sku: local.quickRestockSku,
      cantidad: local.quickRestockQty,
      usuario: `${currentSession.displayName} (Admin)`,
    });
    if (!res.ok) {
      setFeedback('err', res.error);
      render();
      return;
    }
    if (local.quickRestockApproveNow) {
      approvePurchaseOrder(res.purchase.id, `${currentSession.displayName} (Admin)`);
      setFeedback(
        'ok',
        `Orden ${res.purchase.id} (${local.quickRestockSku} × ${local.quickRestockQty} u.) emitida y aprobada para recepción en Almacén.`
      );
    } else {
      setFeedback('ok', `Solicitud ${res.purchase.id} creada y enviada a bandeja de aprobación.`);
    }
    render();
    return;
  }

  if (action === 'acknowledge-item') {
    const id = target.dataset.id ?? '';
    const item = latestSnapshot.decisions.find((d) => d.id === id);
    acknowledgeDecision(
      id,
      item ? `${item.areaGroup} · ${item.titulo}` : id,
      currentSession.displayName
    );
    setFeedback('ok', 'Toma de conocimiento registrada en la bitácora.');
    render();
  }
});

root.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement | null;
  if (!form) return;

  if (form.id === 'form-admin-new-model') {
    event.preventDefault();
    const nombre = (document.getElementById('adm-mod-nombre') as HTMLInputElement | null)?.value ?? '';
    const marca = (document.getElementById('adm-mod-marca') as HTMLSelectElement | null)?.value ?? 'I&O Studio';
    const categorySlug = (document.getElementById('adm-mod-cat') as HTMLSelectElement | null)?.value as Exclude<CategorySlug, 'todas'>;
    const genero = (document.getElementById('adm-mod-gen') as HTMLSelectElement | null)?.value as GenderContext | 'unisex';
    const precioVenta = Number((document.getElementById('adm-mod-precio') as HTMLInputElement | null)?.value ?? 0);
    const stockInicial = Number((document.getElementById('adm-mod-stock') as HTMLInputElement | null)?.value ?? 0);
    const colorNombre = (document.getElementById('adm-mod-color') as HTMLInputElement | null)?.value ?? 'Arena Piedra';
    const colorHex = (document.getElementById('adm-mod-hex') as HTMLInputElement | null)?.value ?? '#C9B8A6';
    const descripcion = (document.getElementById('adm-mod-desc') as HTMLInputElement | null)?.value ?? '';
    const tallas = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="adm-mod-sizes"]:checked')
    ).map((el) => el.value);

    const res = addCustomProductModel({
      nombre,
      marca,
      categorySlug,
      genero,
      precioVenta,
      stockInicial,
      tallas,
      colorNombre,
      colorHex,
      descripcion,
      creadoPor: currentSession.displayName,
    });
    if (!res.ok) {
      setFeedback('err', res.error);
      render();
      return;
    }

    for (const v of res.product.variants) {
      if (v.stock > 0) {
        adjustSkuStock(v.sku, 0);
      }
    }
    recordAdminAudit(
      currentSession.displayName,
      'Catálogo / Dirección',
      'M05-ReciénLlegado',
      `Modelo "${res.product.nombre}" creado (${res.product.variants.length} SKUs); disponible en POS y enviado a Marketing.`
    );
    setFeedback(
      'ok',
      `Modelo "${res.product.nombre}" creado (${res.product.variants.length} SKUs). Ya está disponible en Mostrador POS y en la cola Recién llegados de Marketing.`
    );
    render();
    return;
  }

  if (form.id === 'form-admin-new-supplier') {
    event.preventDefault();
    const ruc = (document.getElementById('adm-sup-ruc') as HTMLInputElement | null)?.value ?? '';
    const razonSocial = (document.getElementById('adm-sup-razon') as HTMLInputElement | null)?.value ?? '';
    const contacto = (document.getElementById('adm-sup-contacto') as HTMLInputElement | null)?.value ?? '';
    const rubro = (document.getElementById('adm-sup-rubro') as HTMLInputElement | null)?.value ?? '';

    const res = registerSupplier({
      ruc,
      razonSocial,
      contacto,
      telefono: '—',
      rubro,
      usuario: `${currentSession.displayName} (Admin)`,
      autoApprove: true,
    });
    if (!res.ok) {
      setFeedback('err', res.error);
      render();
      return;
    }
    setFeedback('ok', `Proveedor ${res.supplier.razonSocial} dado de alta y aprobado.`);
    render();
  }
});

root.addEventListener('change', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'set-audit-filter') {
    local.auditAreaFilter = (target as HTMLSelectElement).value;
    render();
    return;
  }

  if (action === 'toggle-payroll-confirm') {
    local.payrollConfirmChecked = (target as HTMLInputElement).checked;
    render();
    return;
  }

  if (action === 'set-restock-sku') {
    local.quickRestockSku = (target as HTMLSelectElement).value;
    return;
  }

  if (action === 'toggle-restock-approve') {
    local.quickRestockApproveNow = (target as HTMLInputElement).checked;
  }
});

root.addEventListener('input', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'input-reject-reason') {
    local.rejectReasonDraft = (target as HTMLTextAreaElement).value;
    return;
  }

  if (action === 'set-restock-qty') {
    const parsed = Number.parseInt((target as HTMLInputElement).value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      local.quickRestockQty = parsed;
    }
  }
});

document.addEventListener('keydown', (event) => {
  const tag = (event.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (event.key === 'r' || event.key === 'R') {
    event.preventDefault();
    setFeedback('ok', 'Vista actualizada.');
    render();
    return;
  }

  if (local.activeTab === 'mesa_control' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    const filtered = getFilteredDecisions(latestSnapshot);
    if (filtered.length === 0) return;
    event.preventDefault();
    const currentIdx = filtered.findIndex((d) => d.id === local.selectedDecisionId);
    const nextIdx =
      event.key === 'ArrowDown'
        ? (currentIdx + 1) % filtered.length
        : (currentIdx - 1 + filtered.length) % filtered.length;
    local.selectedDecisionId = filtered[nextIdx].id;
    local.pendingConfirmAction = null;
    local.rejectReasonDraft = '';
    render();
  }
});

subscribePosEvents(() => render());
subscribeWarehouseEvents(() => render());
subscribeMarketingEvents(() => render());
subscribeAdminEvents(() => render());
subscribeCatalogEvents(() => render());

window.IO_ADMIN = {
  estado: () => {
    const snap = buildAdminSnapshot();
    const active = snap.decisions.filter((d) => !d.acknowledged);
    return {
      ...snap.pulse,
      bloqueantes: active.filter((d) => d.severity === 'bloqueante').length,
      atencion: active.filter((d) => d.severity === 'atencion').length,
      observacion: active.filter((d) => d.severity === 'observacion').length,
      planillaEstado:
        active.some((d) => d.kind === 'planilla_m07') ? 'pendiente_cierre' : 'pagada',
    };
  },
  ajustarLiquidez: (monto: number) => {
    const next = adjustBankLiquiditySim(monto, currentSession.displayName);
    render();
    return { ok: true, liquidezBase: next.saldoBancarioBase };
  },
  reiniciar: () => {
    resetAdminState();
    setFeedback('warn', 'Estado de Dirección reiniciado.');
    render();
  },
};

render();
