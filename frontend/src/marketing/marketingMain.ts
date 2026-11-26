import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/tokens.css';
import '../styles/pos.css';
import '../styles/marketing.css';
import { DemoSession, logoutToAccess, requireAnyZoneRole } from '../auth/demoSession';
import { CATEGORIAS_TIENDA } from '../data/catalogData';
import { getAllCatalogProducts, subscribeCatalogEvents } from '../data/customCatalogStore';
import { IMAGE_SLOTS } from '../data/imageSlots';
import { loadPosState } from '../pos/posStore';
import { bindBrandLogo, renderBrandMark } from '../render/brand';
import { CategorySlug, GenderFilter } from '../types/store.types';
import { escapeHtml } from '../utils/icons';
import {
  approveCampaign,
  compressImageFile,
  consumeCampaignStockSim,
  getMarketingUiMode,
  hasCampaignChanges,
  isCampaignCurrentlyActive,
  loadMarketingState,
  rejectCampaign,
  resetMarketingState,
  saveCampaign,
  saveCollection,
  saveHeroSlide,
  saveProductEditorial,
  setMarketingUiMode,
  simulatePendingNewArrival,
  subscribeMarketingEvents,
  toggleCampaignPause,
} from './marketingStore';
import {
  CampaignStatus,
  MarketingCampaign,
  MarketingCollection,
  MarketingConsoleApi,
  MarketingHeroSlide,
  MarketingStoreState,
  MarketingTab,
  MarketingUiMode,
} from './marketingTypes';

interface MarketingLocalState {
  uiMode: MarketingUiMode;
  activeTab: MarketingTab;
  searchQuery: string;
  selectedProductGroupId: string;
  selectedHeroId: string;
  selectedCollectionId: string;
  selectedCampaignId: string;
  creatingNewFor: 'hero' | 'coleccion' | 'campana' | null;
  draftHeroTargetType: 'coleccion' | 'campana' | null;
  draftHeroTargetId: string | null;
  colProdQuery: string;
  colProdCategory: string;
  colProdOnlySelected: boolean;
  draftCollectionProductIds: Set<string> | null;
  campaignFilter: 'todas' | CampaignStatus;
  pendingImageDataUrl: string | undefined;
  pendingImageCleared: boolean;
  isAuditModalOpen: boolean;
  feedback: { kind: 'ok' | 'err' | 'warn'; text: string } | null;
}

const activeSession = requireAnyZoneRole(
  ['community_manager', 'administrador'],
  '/marketing.html'
);
if (!activeSession) {
  throw new Error('Redirigiendo al acceso');
}
const currentSession: DemoSession = activeSession;

let mktState: MarketingStoreState = loadMarketingState();

function getInitialPendingArrivalId(state: MarketingStoreState): string {
  const arrivals = getAllCatalogProducts().filter((p) => p.recienLlegado);
  const incomplete = arrivals.find((p) => !state.editorialOverrides[p.groupId]?.completadoEditorial);
  return incomplete?.groupId ?? arrivals[0]?.groupId ?? getAllCatalogProducts()[0].groupId;
}

const local: MarketingLocalState = {
  uiMode: getMarketingUiMode(),
  activeTab: 'recien_llegados',
  searchQuery: '',
  selectedProductGroupId: getInitialPendingArrivalId(mktState),
  selectedHeroId: mktState.heroSlides[0]?.id ?? '',
  selectedCollectionId: mktState.collections[0]?.id ?? '',
  selectedCampaignId: mktState.campaigns[0]?.id ?? '',
  creatingNewFor: null,
  draftHeroTargetType: null,
  draftHeroTargetId: null,
  colProdQuery: '',
  colProdCategory: 'todas',
  colProdOnlySelected: false,
  draftCollectionProductIds: null,
  campaignFilter: 'todas',
  pendingImageDataUrl: undefined,
  pendingImageCleared: false,
  isAuditModalOpen: false,
  feedback: null,
};

const rootEl = document.getElementById('marketing-root');
if (!rootEl) {
  throw new Error('No se encontró #marketing-root');
}
const root: HTMLElement = rootEl;

function getProductStockSummary(groupId: string): {
  totalStock: number;
  criticalCount: number;
  zeroCount: number;
} {
  const posState = loadPosState();
  const product = getAllCatalogProducts().find((p) => p.groupId === groupId);
  if (!product) return { totalStock: 0, criticalCount: 0, zeroCount: 0 };

  let totalStock = 0;
  let criticalCount = 0;
  let zeroCount = 0;
  for (const v of product.variants) {
    const qty = posState.inventory[v.sku] ?? v.stock;
    totalStock += qty;
    if (qty <= 0) zeroCount += 1;
    else if (qty <= v.stock_minimo) criticalCount += 1;
  }
  return { totalStock, criticalCount, zeroCount };
}

function getStockBadgeHtml(groupId: string): string {
  const { totalStock, criticalCount, zeroCount } = getProductStockSummary(groupId);
  if (totalStock <= 0) {
    return '<span class="mkt-badge is-err pos-num">Agotado · 0 u.</span>';
  }
  if (criticalCount > 0 || zeroCount > 0) {
    return `<span class="mkt-badge is-warn pos-num">Stock crítico (${totalStock} u.)</span>`;
  }
  return `<span class="mkt-badge is-ok pos-num">Disponible · ${totalStock} u.</span>`;
}

function resolveProductPreviewImage(groupId: string): string {
  const override = mktState.editorialOverrides[groupId];
  if (override?.customImageDataUrl) return override.customImageDataUrl;
  const product = getAllCatalogProducts().find((p) => p.groupId === groupId);
  const slotKey = product?.variants[0]?.imageSlotKey ?? '';
  return IMAGE_SLOTS[slotKey]?.src ?? '';
}

function getPendingNewArrivalsCount(): number {
  return getAllCatalogProducts().filter(
    (p) => p.recienLlegado && !mktState.editorialOverrides[p.groupId]?.completadoEditorial
  ).length;
}

function getCampaignStatusBadge(status: CampaignStatus): string {
  switch (status) {
    case 'aprobada':
      return '<span class="mkt-badge is-ok">Aprobada · En vivo</span>';
    case 'pendiente_aprobacion':
      return '<span class="mkt-badge is-warn">Pendiente aprobación</span>';
    case 'rechazada':
      return '<span class="mkt-badge is-err">Observada</span>';
    case 'agotada':
      return '<span class="mkt-badge is-err">Baja auto · Stock 0</span>';
    case 'pausada':
      return '<span class="mkt-badge is-neutral">Pausada / Vencida</span>';
    default:
      return '<span class="mkt-badge is-neutral">Borrador</span>';
  }
}

function renderStaticShell(): void {
  root.innerHTML = `
    <header class="pos-topbar pos-no-print">
      <div class="pos-topbar-left">
        <span class="pos-brand-mark">${renderBrandMark()}</span>
        <h1 class="pos-topbar-title pos-display">Marketing y Catálogo Web</h1>
        <span class="pos-topbar-staff">${escapeHtml(currentSession.displayName)} (${currentSession.role === 'administrador' ? 'Administrador' : 'Community Manager'})</span>
      </div>
      <div class="pos-topbar-right">
        <div class="pos-shortcuts-strip d-none d-xl-flex">
          <span><span class="pos-kbd">F2</span> Buscar</span>
          <span><span class="pos-kbd">Esc</span> Cerrar</span>
        </div>
        <a href="/index.html" target="_blank" rel="noopener noreferrer" class="pos-topbar-btn text-decoration-none">
          Ver tienda web
        </a>
        ${
          currentSession.role === 'administrador'
            ? '<a href="/admin.html" class="pos-topbar-btn text-decoration-none">Dirección</a>'
            : ''
        }
        <button type="button" id="btn-open-audit" class="pos-topbar-btn">Bitácora</button>
        <button type="button" id="btn-mkt-logout" class="pos-topbar-btn">Cerrar sesión</button>
      </div>
    </header>

    <main class="pos-shell pos-no-print">
      <div id="mkt-feedback-slot"></div>
      <div id="mkt-practice-slot"></div>
      <div id="mkt-pulse-slot"></div>
      <div id="mkt-signals-slot"></div>

      <div class="pos-panel mb-2">
        <div class="pos-panel-body py-2">
          <div class="row g-2 align-items-center">
            <div class="col-12 col-md-7">
              <input
                id="mkt-search-input"
                type="search"
                class="form-control"
                placeholder="Buscar prenda, colección, campaña o slide del Hero (F2)..."
                autocomplete="off"
              />
            </div>
            <div class="col-12 col-md-5 d-flex justify-content-md-end gap-2 flex-wrap" id="mkt-top-actions"></div>
          </div>
        </div>
      </div>

      <div id="mkt-workspace-slot"></div>
    </main>

    <div id="mkt-modal-slot" class="pos-no-print"></div>
  `;

  bindBrandLogo(root);
}

function renderFeedback(): void {
  const slot = document.getElementById('mkt-feedback-slot');
  if (!slot) return;
  if (!local.feedback) {
    slot.innerHTML = '';
    return;
  }
  const kindClass =
    local.feedback.kind === 'ok'
      ? 'is-ok'
      : local.feedback.kind === 'warn'
        ? 'is-warn'
        : 'is-err';
  slot.innerHTML = `
    <div class="pos-banner ${kindClass}">
      <span>${escapeHtml(local.feedback.text)}</span>
      <button type="button" class="btn-close btn-sm" id="btn-close-feedback" aria-label="Cerrar aviso"></button>
    </div>
  `;
}

function renderPracticeBar(): void {
  const slot = document.getElementById('mkt-practice-slot');
  if (!slot) return;
  if (local.uiMode !== 'practica') {
    slot.innerHTML = '';
    return;
  }
  slot.innerHTML = `
    <div class="pos-practice-bar">
      <div>
        <strong>Modo Práctica activo:</strong>
        <span>Consola: <code>IO_MARKETING.estado()</code> · <code>IO_MARKETING.simularRecienLlegado()</code> · <code>IO_MARKETING.aprobarCampana(id)</code> · <code>IO_MARKETING.modo('operacion')</code></span>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button type="button" id="btn-sim-arrival" class="pos-btn-md pos-btn-secondary">
          Simular recién llegado
        </button>
        <button type="button" id="btn-reset-mkt" class="pos-btn-md pos-btn-secondary">
          Reiniciar demo
        </button>
      </div>
    </div>
  `;
}

function renderPulseStrip(): void {
  const slot = document.getElementById('mkt-pulse-slot');
  if (!slot) return;

  const pendingArrivals = getPendingNewArrivalsCount();
  const activeHeroes = mktState.heroSlides.filter((s) => s.activa).length;
  const activeCollections = mktState.collections.filter((c) => c.activa).length;
  const activeCampaigns = mktState.campaigns.filter((c) => isCampaignCurrentlyActive(c)).length;
  const pendingApproval = mktState.campaigns.filter(
    (c) => c.status === 'pendiente_aprobacion'
  ).length;

  slot.innerHTML = `
    <div class="mkt-pulse-strip">
      <button type="button" class="mkt-pulse-btn ${local.activeTab === 'recien_llegados' ? 'is-active' : ''}" data-mkt-tab="recien_llegados">
        <div>
          <div class="mkt-pulse-label">Recién llegados</div>
          <div class="mkt-pulse-sub">Por vestir (foto/copy)</div>
        </div>
        <span class="mkt-pulse-count pos-num ${pendingArrivals > 0 ? 'is-warn' : 'is-ok'}">${pendingArrivals}</span>
      </button>

      <button type="button" class="mkt-pulse-btn ${local.activeTab === 'portada_hero' ? 'is-active' : ''}" data-mkt-tab="portada_hero">
        <div>
          <div class="mkt-pulse-label">Portada Web · Hero</div>
          <div class="mkt-pulse-sub">Publicación directa</div>
        </div>
        <span class="mkt-pulse-count pos-num">${activeHeroes}</span>
      </button>

      <button type="button" class="mkt-pulse-btn ${local.activeTab === 'colecciones' ? 'is-active' : ''}" data-mkt-tab="colecciones">
        <div>
          <div class="mkt-pulse-label">Colecciones</div>
          <div class="mkt-pulse-sub">Agrupaciones activas</div>
        </div>
        <span class="mkt-pulse-count pos-num">${activeCollections}</span>
      </button>

      <button type="button" class="mkt-pulse-btn ${local.activeTab === 'campanas' ? 'is-active' : ''}" data-mkt-tab="campanas">
        <div>
          <div class="mkt-pulse-label">Campañas descuento</div>
          <div class="mkt-pulse-sub">${pendingApproval > 0 ? `${pendingApproval} por aprobar` : 'Aprobación Admin'}</div>
        </div>
        <span class="mkt-pulse-count pos-num ${activeCampaigns > 0 ? 'is-ok' : ''}">${activeCampaigns}</span>
      </button>

      <button type="button" class="mkt-pulse-btn ${local.activeTab === 'catalogo' ? 'is-active' : ''}" data-mkt-tab="catalogo">
        <div>
          <div class="mkt-pulse-label">Catálogo Web</div>
          <div class="mkt-pulse-sub">Fichas y disponibilidad</div>
        </div>
        <span class="mkt-pulse-count pos-num">${getAllCatalogProducts().length}</span>
      </button>
    </div>
  `;
}

function renderPrioritySignals(): void {
  const slot = document.getElementById('mkt-signals-slot');
  if (!slot) return;

  const signals: { kind: 'warn' | 'err' | 'ok'; text: string; tab: MarketingTab; id: string }[] = [];

  for (const p of getAllCatalogProducts()) {
    if (p.recienLlegado && !mktState.editorialOverrides[p.groupId]?.completadoEditorial) {
      signals.push({
        kind: 'warn',
        text: `Recién llegado sin completar: ${p.nombre}`,
        tab: 'recien_llegados',
        id: p.groupId,
      });
    }
  }

  for (const c of mktState.campaigns) {
    if (c.status === 'pendiente_aprobacion') {
      signals.push({
        kind: 'warn',
        text: `Esperando aprobación Admin: ${c.titulo}`,
        tab: 'campanas',
        id: c.id,
      });
    } else if (c.status === 'rechazada') {
      signals.push({
        kind: 'err',
        text: `Campaña observada: ${c.titulo}`,
        tab: 'campanas',
        id: c.id,
      });
    } else if (isCampaignCurrentlyActive(c)) {
      const remaining = c.stock_maximo - c.stock_consumido;
      if (remaining <= Math.max(3, Math.ceil(c.stock_maximo * 0.25))) {
        signals.push({
          kind: 'warn',
          text: `Cupo promo bajo (${remaining}/${c.stock_maximo}): ${c.titulo}`,
          tab: 'campanas',
          id: c.id,
        });
      }
    }
  }

  if (signals.length === 0) {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = `
    <section class="mkt-signals-bar" aria-label="Atención prioritaria">
      <div class="mkt-signals-title">Requiere tu criterio hoy</div>
      <div class="mkt-signals-list">
        ${signals
          .slice(0, 6)
          .map(
            (sig) => `
          <button
            type="button"
            class="mkt-signal-pill"
            data-signal-tab="${sig.tab}"
            data-signal-id="${escapeHtml(sig.id)}"
          >
            <span class="mkt-signal-dot is-${sig.kind}"></span>
            <span>${escapeHtml(sig.text)}</span>
          </button>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderTopActions(): void {
  const slot = document.getElementById('mkt-top-actions');
  if (!slot) return;

  if (local.activeTab === 'portada_hero') {
    slot.innerHTML = `
      <button type="button" id="btn-new-hero" class="pos-btn-md pos-btn-primary">
        + Nuevo slide Hero
      </button>
    `;
    return;
  }
  if (local.activeTab === 'colecciones') {
    slot.innerHTML = `
      <button type="button" id="btn-new-collection" class="pos-btn-md pos-btn-primary">
        + Nueva colección
      </button>
    `;
    return;
  }
  if (local.activeTab === 'campanas') {
    slot.innerHTML = `
      <button type="button" id="btn-new-campaign" class="pos-btn-md pos-btn-primary">
        + Nueva campaña de descuento
      </button>
    `;
    return;
  }

  slot.innerHTML = `
    <span class="small pos-text-muted align-self-center">
      Recién llegados y Lo más pedido se calculan automáticamente desde BD.
    </span>
  `;
}

// =============================================================================
// Vista 1 & 5: Recién llegados por vestir / Catálogo Web
// =============================================================================

function renderProductEditorialWorkspace(onlyNewArrivals: boolean): string {
  const q = local.searchQuery.trim().toLowerCase();
  const list = getAllCatalogProducts().filter((p) => {
    if (onlyNewArrivals && !p.recienLlegado) return false;
    if (!q) return true;
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      p.categorySlug.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    const aDone = Boolean(mktState.editorialOverrides[a.groupId]?.completadoEditorial);
    const bDone = Boolean(mktState.editorialOverrides[b.groupId]?.completadoEditorial);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return a.nombre.localeCompare(b.nombre);
  });

  const selected =
    list.find((p) => p.groupId === local.selectedProductGroupId) ??
    list[0] ??
    getAllCatalogProducts()[0];
  local.selectedProductGroupId = selected.groupId;

  const override = mktState.editorialOverrides[selected.groupId];
  const displayName = override?.nombre || selected.nombre;
  const displayDesc =
    override?.descripcion !== undefined ? override.descripcion : selected.descripcion;
  const displayFrase =
    override?.fraseCorta !== undefined ? override.fraseCorta : selected.badgeLabel ?? '';
  const displayAlt =
    override?.alt_text || selected.variants[0]?.alt_text || selected.nombre;
  const currentImg = local.pendingImageCleared
    ? ''
    : local.pendingImageDataUrl ?? resolveProductPreviewImage(selected.groupId);

  const listHtml =
    list.length === 0
      ? '<div class="pos-subbox p-3 text-center pos-text-muted">No hay prendas coincidentes.</div>'
      : list
          .map((item) => {
            const ov = mktState.editorialOverrides[item.groupId];
            const isComplete = ov?.completadoEditorial ?? !item.recienLlegado;
            const thumbSrc = resolveProductPreviewImage(item.groupId);
            const isSelected = item.groupId === selected.groupId;
            return `
              <button
                type="button"
                class="mkt-queue-item ${isSelected ? 'is-selected' : ''}"
                data-select-product="${escapeHtml(item.groupId)}"
              >
                <div class="mkt-item-thumb">
                  ${
                    thumbSrc
                      ? `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(item.nombre)}" />`
                      : '<span>Sin foto</span>'
                  }
                </div>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex justify-content-between align-items-start gap-2">
                    <div class="fw-semibold text-truncate">${escapeHtml(ov?.nombre || item.nombre)}</div>
                    ${
                      isComplete
                        ? '<span class="mkt-badge is-ok">Completa</span>'
                        : '<span class="mkt-badge is-warn">Por vestir</span>'
                    }
                  </div>
                  <div class="small pos-text-muted">
                    ${escapeHtml(item.marca)} · ${escapeHtml(item.categorySlug)}
                    ${item.recienLlegado ? ' · <strong>Recién llegado (BD)</strong>' : ''}
                    ${item.destacado ? ' · <strong>Lo más pedido (BD)</strong>' : ''}
                  </div>
                  <div class="mt-1">${getStockBadgeHtml(item.groupId)}</div>
                </div>
              </button>
            `;
          })
          .join('');

  return `
    <div class="mkt-workspace-grid">
      <section class="pos-panel">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">
            ${onlyNewArrivals ? 'Cola: Recién llegados' : 'Catálogo editorial web'}
          </h2>
          <span class="small pos-text-muted pos-num">${list.length} prendas</span>
        </div>
        <div class="pos-panel-body">
          <div class="mkt-queue-list">${listHtml}</div>
        </div>
      </section>

      <section class="pos-panel mkt-detail-sticky">
        <div class="pos-panel-header">
          <div>
            <h2 class="pos-panel-title pos-display">Ficha editorial del producto</h2>
            <div class="small pos-text-muted">
              Publicación directa en catálogo web · Sin aprobación requerida
            </div>
          </div>
          ${getStockBadgeHtml(selected.groupId)}
        </div>
        <div class="pos-panel-body">
          <form id="form-product-editorial" class="d-flex flex-column gap-3">
            <div class="mkt-auto-route-box">
              <strong>Clasificación automática (BD):</strong>
              ${selected.recienLlegado ? 'Incluido en <em>Recién Llegados</em>' : 'No marcado como recién llegado'}
              ${selected.destacado ? ' · Incluido en <em>Lo Más Pedido</em>' : ''}
              <div class="small pos-text-muted mt-1">
                El sistema decide la pertenencia a estas secciones; aquí completas foto, nombre y copy.
              </div>
            </div>

            <div>
              <label class="form-label small fw-bold mb-1">Fotografía principal del producto</label>
              <div class="mkt-preview-frame is-product">
                ${
                  currentImg
                    ? `<img src="${escapeHtml(currentImg)}" alt="${escapeHtml(displayAlt)}" />`
                    : '<div class="mkt-preview-empty">Sin fotografía cargada. Sube una imagen para vestir esta prenda.</div>'
                }
              </div>
              <div class="mkt-upload-bar">
                <label class="pos-btn-md pos-btn-secondary mb-0" style="cursor: pointer;">
                  Subir foto desde equipo
                  <input type="file" accept="image/*" id="input-product-image" class="d-none" />
                </label>
                ${
                  currentImg
                    ? '<button type="button" id="btn-clear-product-image" class="pos-btn-md pos-btn-secondary">Quitar foto subida</button>'
                    : ''
                }
              </div>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-7">
                <label class="form-label small fw-bold mb-1" for="ed-nombre">Nombre comercial</label>
                <input id="ed-nombre" class="form-control" value="${escapeHtml(displayName)}" required />
              </div>
              <div class="col-12 col-md-5">
                <label class="form-label small fw-bold mb-1" for="ed-frase">Frase corta / Etiqueta</label>
                <input id="ed-frase" class="form-control" placeholder="Ej. Fibra Pima · Nuevo ingreso" value="${escapeHtml(displayFrase)}" />
              </div>
            </div>

            <div>
              <label class="form-label small fw-bold mb-1" for="ed-desc">Descripción editorial</label>
              <textarea id="ed-desc" class="form-control" rows="3" placeholder="Describe caída, material y ocasión de uso...">${escapeHtml(displayDesc)}</textarea>
            </div>

            <div>
              <label class="form-label small fw-bold mb-1" for="ed-alt">Texto alternativo (accesibilidad web)</label>
              <input id="ed-alt" class="form-control" value="${escapeHtml(displayAlt)}" />
            </div>

            <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap pt-1">
              <span class="small pos-text-muted">
                Última actualización: ${escapeHtml(override?.updatedBy ?? 'Catálogo base')}
              </span>
              <button type="submit" class="pos-btn-md pos-btn-primary">
                Publicar ficha en catálogo web
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;
}

// =============================================================================
// Vista 2: Portada Web (Hero) con enlace automático
// =============================================================================

function renderHeroWorkspace(): string {
  const q = local.searchQuery.trim().toLowerCase();
  const slides = mktState.heroSlides.filter((s) => {
    if (!q) return true;
    return s.titulo.toLowerCase().includes(q) || s.eyebrow.toLowerCase().includes(q);
  });

  const isCreatingHero = local.creatingNewFor === 'hero';
  const selected: MarketingHeroSlide =
    (!isCreatingHero ? slides.find((s) => s.id === local.selectedHeroId) ?? slides[0] : undefined) ?? {
      id: isCreatingHero ? local.selectedHeroId : `hero-${Date.now()}`,
      eyebrow: 'Nueva portada',
      titulo: '',
      tituloSecundario: '',
      subtitulo: '',
      ctaLabel: 'Explorar',
      imageSlotKey: isCreatingHero ? '' : 'oferta-01',
      alt_text: 'Imagen de portada I&O',
      targetType: 'coleccion',
      targetId: mktState.collections[0]?.id ?? '',
      activa: true,
      orden: mktState.heroSlides.length + 1,
      updatedAt: new Date().toISOString(),
    };
  local.selectedHeroId = selected.id;

  const previewSrc = local.pendingImageCleared
    ? ''
    : local.pendingImageDataUrl ??
      selected.customImageDataUrl ??
      IMAGE_SLOTS[selected.imageSlotKey]?.src ??
      '';

  const effectiveTargetType = local.draftHeroTargetType ?? selected.targetType;
  const effectiveTargetId = local.draftHeroTargetId ?? selected.targetId;

  const targetOptionsHtml =
    effectiveTargetType === 'campana'
      ? mktState.campaigns
          .map(
            (c) => `
            <option value="${escapeHtml(c.id)}" ${c.id === effectiveTargetId ? 'selected' : ''}>
              ${escapeHtml(c.titulo)} (${isCampaignCurrentlyActive(c) ? 'Aprobada y vigente' : c.status})
            </option>
          `
          )
          .join('')
      : mktState.collections
          .map(
            (col) => `
            <option value="${escapeHtml(col.id)}" ${col.id === effectiveTargetId ? 'selected' : ''}>
              ${escapeHtml(col.titulo)} (${col.productGroupIds.length} prendas)
            </option>
          `
          )
          .join('');

  const resolvedTargetLabel =
    effectiveTargetType === 'campana'
      ? mktState.campaigns.find((c) => c.id === effectiveTargetId)?.titulo ?? 'Sin campaña'
      : mktState.collections.find((c) => c.id === effectiveTargetId)?.titulo ?? 'Sin colección';

  return `
    <div class="mkt-workspace-grid">
      <section class="pos-panel">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Slides del Hero (Portada Web)</h2>
          <span class="small pos-text-muted pos-num">${slides.length} slides</span>
        </div>
        <div class="pos-panel-body">
          <div class="mkt-queue-list">
            ${slides
              .map((slide) => {
                const thumb =
                  slide.customImageDataUrl || IMAGE_SLOTS[slide.imageSlotKey]?.src || '';
                const isSel = slide.id === selected.id;
                return `
                  <button
                    type="button"
                    class="mkt-queue-item ${isSel ? 'is-selected' : ''}"
                    data-select-hero="${escapeHtml(slide.id)}"
                  >
                    <div class="mkt-item-thumb is-wide">
                      ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(slide.titulo)}" />` : '<span>Sin foto</span>'}
                    </div>
                    <div class="flex-grow-1 min-w-0">
                      <div class="d-flex justify-content-between align-items-start gap-2">
                        <div class="fw-semibold text-truncate">${escapeHtml(slide.titulo)}</div>
                        ${
                          slide.activa
                            ? '<span class="mkt-badge is-ok">En vivo</span>'
                            : '<span class="mkt-badge is-neutral">Oculto</span>'
                        }
                      </div>
                      <div class="small pos-text-muted">
                        Orden #${slide.orden} · Destino: ${slide.targetType === 'campana' ? 'Campaña' : 'Colección'}
                      </div>
                    </div>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      </section>

      <section class="pos-panel mkt-detail-sticky">
        <div class="pos-panel-header">
          <div>
            <h2 class="pos-panel-title pos-display">Editor de Hero</h2>
            <div class="small pos-text-muted">
              Publicación directa · La web genera el enlace automático según el destino elegido
            </div>
          </div>
          ${selected.activa ? '<span class="mkt-badge is-ok">Visible en portada</span>' : '<span class="mkt-badge is-neutral">Oculto</span>'}
        </div>
        <div class="pos-panel-body">
          <form id="form-hero-slide" class="d-flex flex-column gap-3">
            <div>
              <label class="form-label small fw-bold mb-1">Fotografía panorámica del Hero (16:7)</label>
              <div class="mkt-preview-frame is-hero">
                ${
                  previewSrc
                    ? `<img src="${escapeHtml(previewSrc)}" alt="${escapeHtml(selected.alt_text)}" />`
                    : '<div class="mkt-preview-empty">Sube una imagen panorámica para este slide del Hero.</div>'
                }
              </div>
              <div class="mkt-upload-bar">
                <label class="pos-btn-md pos-btn-secondary mb-0" style="cursor: pointer;">
                  Subir imagen Hero
                  <input type="file" accept="image/*" id="input-hero-image" class="d-none" />
                </label>
                <span class="small pos-text-muted">Recomendado: 1920 × 800 px</span>
              </div>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-4">
                <label class="form-label small fw-bold mb-1" for="hero-eyebrow">Antetítulo</label>
                <input id="hero-eyebrow" class="form-control" value="${escapeHtml(selected.eyebrow)}" />
              </div>
              <div class="col-12 col-md-5">
                <label class="form-label small fw-bold mb-1" for="hero-titulo">Titular principal</label>
                <input id="hero-titulo" class="form-control" value="${escapeHtml(selected.titulo)}" required />
              </div>
              <div class="col-12 col-md-3">
                <label class="form-label small fw-bold mb-1" for="hero-orden">Orden</label>
                <input id="hero-orden" type="number" min="1" max="20" class="form-control pos-num" value="${selected.orden}" />
              </div>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-6">
                <label class="form-label small fw-bold mb-1" for="hero-sub">Segunda línea (itálica)</label>
                <input id="hero-sub" class="form-control" value="${escapeHtml(selected.tituloSecundario ?? '')}" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label small fw-bold mb-1" for="hero-cta">Texto del botón</label>
                <input id="hero-cta" class="form-control" value="${escapeHtml(selected.ctaLabel)}" />
              </div>
            </div>

            <div>
              <label class="form-label small fw-bold mb-1" for="hero-frase">Frase de apoyo</label>
              <input id="hero-frase" class="form-control" value="${escapeHtml(selected.subtitulo)}" />
            </div>

            <div class="mkt-auto-route-box">
              <div class="fw-bold mb-2">Destino automático del Hero (sin enlaces manuales)</div>
              <div class="row g-2">
                <div class="col-12 col-md-5">
                  <label class="form-label small fw-semibold mb-1" for="hero-target-type">Tipo de destino</label>
                  <select id="hero-target-type" class="form-select">
                    <option value="coleccion" ${effectiveTargetType === 'coleccion' ? 'selected' : ''}>Colección</option>
                    <option value="campana" ${effectiveTargetType === 'campana' ? 'selected' : ''}>Campaña de descuento</option>
                  </select>
                </div>
                <div class="col-12 col-md-7">
                  <label class="form-label small fw-semibold mb-1" for="hero-target-id">Elemento vinculado</label>
                  <select id="hero-target-id" class="form-select">
                    ${targetOptionsHtml}
                  </select>
                </div>
              </div>
              <div class="small pos-text-muted mt-2">
                Ruta generada automáticamente por la web hacia: <strong>${escapeHtml(resolvedTargetLabel)}</strong>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="hero-activa" ${selected.activa ? 'checked' : ''} />
                <label class="form-check-label small fw-semibold" for="hero-activa">
                  Mostrar este slide en la portada web
                </label>
              </div>
              <button type="submit" class="pos-btn-md pos-btn-primary">
                Publicar Hero en web
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;
}

// =============================================================================
// Vista 3: Colecciones
// =============================================================================

function renderCollectionsWorkspace(): string {
  const q = local.searchQuery.trim().toLowerCase();
  const cols = mktState.collections.filter((c) => {
    if (!q) return true;
    return c.titulo.toLowerCase().includes(q) || c.eyebrow.toLowerCase().includes(q);
  });

  const isCreatingCollection = local.creatingNewFor === 'coleccion';
  const selected: MarketingCollection =
    (!isCreatingCollection
      ? cols.find((c) => c.id === local.selectedCollectionId) ?? cols[0]
      : undefined) ?? {
      id: isCreatingCollection ? local.selectedCollectionId : `col-${Date.now()}`,
      eyebrow: 'Nueva colección',
      titulo: '',
      descripcion: '',
      ctaLabel: 'Explorar colección',
      imageSlotKey: isCreatingCollection ? '' : 'col-hombre',
      alt_text: 'Colección I&O',
      category: 'todas',
      gender: 'todos',
      productGroupIds: [],
      activa: true,
      updatedAt: new Date().toISOString(),
    };
  local.selectedCollectionId = selected.id;

  const previewSrc = local.pendingImageCleared
    ? ''
    : local.pendingImageDataUrl ??
      selected.customImageDataUrl ??
      IMAGE_SLOTS[selected.imageSlotKey]?.src ??
      '';

  return `
    <div class="mkt-workspace-grid">
      <section class="pos-panel">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Colecciones de la tienda</h2>
          <span class="small pos-text-muted pos-num">${cols.length} colecciones</span>
        </div>
        <div class="pos-panel-body">
          <div class="mkt-queue-list">
            ${cols
              .map((col) => {
                const thumb = col.customImageDataUrl || IMAGE_SLOTS[col.imageSlotKey]?.src || '';
                const isSel = col.id === selected.id;
                return `
                  <button
                    type="button"
                    class="mkt-queue-item ${isSel ? 'is-selected' : ''}"
                    data-select-collection="${escapeHtml(col.id)}"
                  >
                    <div class="mkt-item-thumb is-wide">
                      ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(col.titulo)}" />` : '<span>Tipográfica</span>'}
                    </div>
                    <div class="flex-grow-1 min-w-0">
                      <div class="d-flex justify-content-between align-items-start gap-2">
                        <div class="fw-semibold text-truncate">${escapeHtml(col.titulo)}</div>
                        ${
                          col.activa
                            ? '<span class="mkt-badge is-ok">Activa</span>'
                            : '<span class="mkt-badge is-neutral">Oculta</span>'
                        }
                      </div>
                      <div class="small pos-text-muted">
                        ${escapeHtml(col.eyebrow)} · ${col.productGroupIds.length} prendas
                      </div>
                    </div>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      </section>

      <section class="pos-panel mkt-detail-sticky">
        <div class="pos-panel-header">
          <div>
            <h2 class="pos-panel-title pos-display">Editor de Colección</h2>
            <div class="small pos-text-muted">
              Publicación directa · Disponible automáticamente para enlazar desde el Hero
            </div>
          </div>
        </div>
        <div class="pos-panel-body">
          <form id="form-collection" class="d-flex flex-column gap-3">
            <div>
              <label class="form-label small fw-bold mb-1">Imagen de portada de colección (16:10)</label>
              <div class="mkt-preview-frame is-collection">
                ${
                  previewSrc
                    ? `<img src="${escapeHtml(previewSrc)}" alt="${escapeHtml(selected.alt_text)}" />`
                    : '<div class="mkt-preview-empty">Sin imagen subida (usará tarjeta editorial tipográfica o foto al subirla).</div>'
                }
              </div>
              <div class="mkt-upload-bar">
                <label class="pos-btn-md pos-btn-secondary mb-0" style="cursor: pointer;">
                  Subir foto de colección
                  <input type="file" accept="image/*" id="input-collection-image" class="d-none" />
                </label>
              </div>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-5">
                <label class="form-label small fw-bold mb-1" for="col-eyebrow">Etiqueta superior</label>
                <input id="col-eyebrow" class="form-control" value="${escapeHtml(selected.eyebrow)}" required />
              </div>
              <div class="col-12 col-md-7">
                <label class="form-label small fw-bold mb-1" for="col-titulo">Nombre de la colección</label>
                <input id="col-titulo" class="form-control" value="${escapeHtml(selected.titulo)}" required />
              </div>
            </div>

            <div>
              <label class="form-label small fw-bold mb-1" for="col-desc">Frase o descripción editorial</label>
              <textarea id="col-desc" class="form-control" rows="2">${escapeHtml(selected.descripcion)}</textarea>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-4">
                <label class="form-label small fw-bold mb-1" for="col-cta">Texto botón</label>
                <input id="col-cta" class="form-control" value="${escapeHtml(selected.ctaLabel)}" />
              </div>
              <div class="col-6 col-md-4">
                <label class="form-label small fw-bold mb-1" for="col-cat">Categoría base</label>
                <select id="col-cat" class="form-select">
                  <option value="todas" ${selected.category === 'todas' ? 'selected' : ''}>Todas</option>
                  ${CATEGORIAS_TIENDA.map(
                    (cat) => `<option value="${cat.slug}" ${selected.category === cat.slug ? 'selected' : ''}>${escapeHtml(cat.nombre)}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="col-6 col-md-4">
                <label class="form-label small fw-bold mb-1" for="col-gender">Público</label>
                <select id="col-gender" class="form-select">
                  <option value="todos" ${(selected.gender ?? 'todos') === 'todos' ? 'selected' : ''}>Todos</option>
                  <option value="hombre" ${selected.gender === 'hombre' ? 'selected' : ''}>Hombre</option>
                  <option value="mujer" ${selected.gender === 'mujer' ? 'selected' : ''}>Mujer</option>
                  <option value="ninos" ${selected.gender === 'ninos' ? 'selected' : ''}>Niños</option>
                </select>
              </div>
            </div>

            <div>
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                <label class="form-label small fw-bold mb-0">
                  Prendas incluidas en esta colección (<span id="col-selected-count">${(() => {
                    const set = local.draftCollectionProductIds ?? new Set(selected.productGroupIds);
                    local.draftCollectionProductIds = set;
                    return set.size;
                  })()}</span> seleccionadas)
                </label>
                <div class="d-flex gap-1 flex-wrap">
                  <button type="button" id="btn-col-suggest-new" class="pos-btn-sm pos-btn-secondary">+ Recién llegados</button>
                  <button type="button" id="btn-col-suggest-featured" class="pos-btn-sm pos-btn-secondary">+ Lo más pedido</button>
                  <button type="button" id="btn-col-clear-prods" class="pos-btn-sm pos-btn-secondary">Limpiar</button>
                </div>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-12 col-md-5">
                  <input
                    id="col-prod-search"
                    type="search"
                    class="form-control form-control-sm"
                    placeholder="Buscar prenda, marca o SKU..."
                    value="${escapeHtml(local.colProdQuery)}"
                  />
                </div>
                <div class="col-7 col-md-4">
                  <select id="col-prod-cat" class="form-select form-select-sm">
                    <option value="todas" ${local.colProdCategory === 'todas' ? 'selected' : ''}>Todas las categorías</option>
                    ${CATEGORIAS_TIENDA.map(
                      (cat) => `<option value="${cat.slug}" ${local.colProdCategory === cat.slug ? 'selected' : ''}>${escapeHtml(cat.nombre)}</option>`
                    ).join('')}
                  </select>
                </div>
                <div class="col-5 col-md-3 d-flex align-items-center">
                  <div class="form-check mb-0">
                    <input class="form-check-input" type="checkbox" id="col-prod-only-selected" ${local.colProdOnlySelected ? 'checked' : ''} />
                    <label class="form-check-label small fw-semibold" for="col-prod-only-selected">
                      Solo incluidas
                    </label>
                  </div>
                </div>
              </div>
              <div class="mkt-product-picker" id="col-product-picker-list">
                ${(() => {
                  const selectedSet = local.draftCollectionProductIds ?? new Set(selected.productGroupIds);
                  const pq = local.colProdQuery.trim().toLowerCase();
                  const filtered = getAllCatalogProducts().filter((prod) => {
                    if (local.colProdOnlySelected && !selectedSet.has(prod.groupId)) return false;
                    if (local.colProdCategory !== 'todas' && prod.categorySlug !== local.colProdCategory) return false;
                    if (!pq) return true;
                    return (
                      prod.nombre.toLowerCase().includes(pq) ||
                      prod.marca.toLowerCase().includes(pq) ||
                      prod.variants.some((v) => v.sku.toLowerCase().includes(pq))
                    );
                  });
                  if (filtered.length === 0) {
                    return '<div class="p-3 text-center small pos-text-muted">Sin prendas coincidentes para este filtro.</div>';
                  }
                  return filtered
                    .map((prod) => {
                      const checked = selectedSet.has(prod.groupId);
                      const thumb = resolveProductPreviewImage(prod.groupId);
                      return `
                        <label class="mkt-product-pick-row" style="cursor: pointer;">
                          <span class="d-flex align-items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              class="form-check-input mt-0"
                              name="col-products"
                              value="${escapeHtml(prod.groupId)}"
                              ${checked ? 'checked' : ''}
                            />
                            <span class="mkt-pick-thumb">
                              ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(prod.nombre)}" />` : '<span>S/F</span>'}
                            </span>
                            <span class="min-w-0">
                              <span class="fw-semibold d-block text-truncate">${escapeHtml(prod.nombre)}</span>
                              <span class="small pos-text-muted">${escapeHtml(prod.marca)} · ${escapeHtml(prod.categorySlug)}</span>
                            </span>
                          </span>
                          ${getStockBadgeHtml(prod.groupId)}
                        </label>
                      `;
                    })
                    .join('');
                })()}
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="col-activa" ${selected.activa ? 'checked' : ''} />
                <label class="form-check-label small fw-semibold" for="col-activa">
                  Colección activa en la tienda web
                </label>
              </div>
              <button type="submit" class="pos-btn-md pos-btn-primary">
                Publicar colección en web
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;
}

// =============================================================================
// Vista 4: Campañas de descuento (Único flujo con aprobación Admin)
// =============================================================================

function renderCampaignsWorkspace(): string {
  const q = local.searchQuery.trim().toLowerCase();
  const list = mktState.campaigns.filter((c) => {
    if (local.campaignFilter !== 'todas' && c.status !== local.campaignFilter) return false;
    if (!q) return true;
    return c.titulo.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q);
  });

  const isCreatingCampaign = local.creatingNewFor === 'campana';
  const selected: MarketingCampaign =
    (!isCreatingCampaign
      ? list.find((c) => c.id === local.selectedCampaignId) ?? list[0]
      : undefined) ?? {
      id: isCreatingCampaign ? local.selectedCampaignId : `camp-${Date.now()}`,
      titulo: '',
      descripcion: '',
      porcentajeDescuento: 15,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      stock_maximo: 20,
      stock_consumido: 0,
      scopeType: 'categoria',
      categoriaTarget: 'prendas-superiores',
      productGroupIds: [],
      aplicaEnTiendaFisica: true,
      incluyeCapturaOptIn: false,
      optInVerificado: true,
      status: 'borrador',
      createdBy: currentSession.displayName,
      updatedAt: new Date().toISOString(),
    };
  local.selectedCampaignId = selected.id;

  const affectedProducts = getAllCatalogProducts().filter((p) => {
    if (selected.scopeType === 'categoria') {
      return selected.categoriaTarget === 'todas' || p.categorySlug === selected.categoriaTarget;
    }
    if (selected.scopeType === 'coleccion' && selected.collectionId) {
      const col = mktState.collections.find((c) => c.id === selected.collectionId);
      return col ? col.productGroupIds.includes(p.groupId) : false;
    }
    return selected.productGroupIds.includes(p.groupId);
  });

  const criticalInScope = affectedProducts.filter(
    (p) => getProductStockSummary(p.groupId).criticalCount > 0 || getProductStockSummary(p.groupId).zeroCount > 0
  );
  const canApproveDirectly = currentSession.role === 'administrador' || local.uiMode === 'practica';

  return `
    <div class="mkt-workspace-grid">
      <section class="pos-panel">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Campañas de descuento</h2>
          <select id="camp-status-filter" class="form-select form-select-sm" style="width: auto;">
            <option value="todas" ${local.campaignFilter === 'todas' ? 'selected' : ''}>Todas</option>
            <option value="aprobada" ${local.campaignFilter === 'aprobada' ? 'selected' : ''}>Aprobadas</option>
            <option value="pendiente_aprobacion" ${local.campaignFilter === 'pendiente_aprobacion' ? 'selected' : ''}>Por aprobar</option>
            <option value="borrador" ${local.campaignFilter === 'borrador' ? 'selected' : ''}>Borradores</option>
            <option value="rechazada" ${local.campaignFilter === 'rechazada' ? 'selected' : ''}>Observadas</option>
          </select>
        </div>
        <div class="pos-panel-body">
          <div class="mkt-queue-list">
            ${
              list.length === 0
                ? '<div class="pos-subbox p-3 text-center pos-text-muted">Sin campañas en este estado.</div>'
                : list
                    .map((camp) => {
                      const isSel = camp.id === selected.id;
                      return `
                        <button
                          type="button"
                          class="mkt-queue-item ${isSel ? 'is-selected' : ''}"
                          data-select-campaign="${escapeHtml(camp.id)}"
                        >
                          <div class="flex-grow-1 min-w-0">
                            <div class="d-flex justify-content-between align-items-start gap-2">
                              <div class="fw-semibold">${escapeHtml(camp.titulo)}</div>
                              ${getCampaignStatusBadge(camp.status)}
                            </div>
                            <div class="small pos-text-muted mt-1 pos-num">
                              -${camp.porcentajeDescuento}% · Cupo ${camp.stock_consumido}/${camp.stock_maximo} u. · ${escapeHtml(camp.fecha_inicio)} al ${escapeHtml(camp.fecha_fin)}
                            </div>
                            <div class="small pos-text-muted">
                              ${camp.aplicaEnTiendaFisica ? 'Web + Aplica en POS tienda' : 'Solo Web (informativo en POS)'}
                            </div>
                          </div>
                        </button>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>
      </section>

      <section class="pos-panel mkt-detail-sticky">
        <div class="pos-panel-header">
          <div>
            <h2 class="pos-panel-title pos-display">Preparación y Pre-vuelo de Campaña</h2>
            <div class="small pos-text-muted">
              Requiere aprobación del Administrador (RN-MKT-04) · Vigencia y tope INDECOPI (RN-MKT-01)
            </div>
          </div>
          ${getCampaignStatusBadge(selected.status)}
        </div>
        <div class="pos-panel-body">
          ${
            selected.status === 'rechazada' && selected.motivoRechazo
              ? `<div class="pos-banner is-err mb-3"><span><strong>Observación de Administración:</strong> ${escapeHtml(selected.motivoRechazo)}</span></div>`
              : ''
          }

          <form id="form-campaign" class="d-flex flex-column gap-3">
            <div class="row g-2">
              <div class="col-12 col-md-8">
                <label class="form-label small fw-bold mb-1" for="camp-titulo">Nombre de campaña</label>
                <input id="camp-titulo" class="form-control" value="${escapeHtml(selected.titulo)}" required />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label small fw-bold mb-1" for="camp-pct">Descuento (%)</label>
                <input id="camp-pct" type="number" min="1" max="70" class="form-control pos-num" value="${selected.porcentajeDescuento}" required />
              </div>
            </div>

            <div>
              <label class="form-label small fw-bold mb-1" for="camp-desc">Condiciones / descripción visible</label>
              <textarea id="camp-desc" class="form-control" rows="2">${escapeHtml(selected.descripcion)}</textarea>
            </div>

            <div class="row g-2">
              <div class="col-6 col-md-4">
                <label class="form-label small fw-bold mb-1" for="camp-inicio">Inicio vigencia</label>
                <input id="camp-inicio" type="date" class="form-control pos-num" value="${escapeHtml(selected.fecha_inicio)}" required />
              </div>
              <div class="col-6 col-md-4">
                <label class="form-label small fw-bold mb-1" for="camp-fin">Fin vigencia</label>
                <input id="camp-fin" type="date" class="form-control pos-num" value="${escapeHtml(selected.fecha_fin)}" required />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label small fw-bold mb-1" for="camp-stock-max">Stock máximo promo (u.)</label>
                <input id="camp-stock-max" type="number" min="1" max="9999" class="form-control pos-num" value="${selected.stock_maximo}" required />
              </div>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-5">
                <label class="form-label small fw-bold mb-1" for="camp-scope">Alcance de productos</label>
                <select id="camp-scope" class="form-select">
                  <option value="categoria" ${selected.scopeType === 'categoria' ? 'selected' : ''}>Por categoría</option>
                  <option value="coleccion" ${selected.scopeType === 'coleccion' ? 'selected' : ''}>Por colección</option>
                </select>
              </div>
              <div class="col-12 col-md-7">
                ${
                  selected.scopeType === 'coleccion'
                    ? `
                      <label class="form-label small fw-bold mb-1" for="camp-collection">Colección objetivo</label>
                      <select id="camp-collection" class="form-select">
                        ${mktState.collections
                          .map(
                            (col) => `<option value="${escapeHtml(col.id)}" ${col.id === selected.collectionId ? 'selected' : ''}>${escapeHtml(col.titulo)}</option>`
                          )
                          .join('')}
                      </select>
                    `
                    : `
                      <label class="form-label small fw-bold mb-1" for="camp-cat">Categoría objetivo</label>
                      <select id="camp-cat" class="form-select">
                        ${CATEGORIAS_TIENDA.map(
                          (cat) => `<option value="${cat.slug}" ${selected.categoriaTarget === cat.slug ? 'selected' : ''}>${escapeHtml(cat.nombre)}</option>`
                        ).join('')}
                      </select>
                    `
                }
              </div>
            </div>

            <div class="d-flex flex-column gap-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="camp-pos-apply" ${selected.aplicaEnTiendaFisica ? 'checked' : ''} />
                <label class="form-check-label small fw-semibold" for="camp-pos-apply">
                  Hacer aplicable en Mostrador POS (si se desmarca, el vendedor la verá solo como aviso "Precio web")
                </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="camp-optin-req" ${selected.incluyeCapturaOptIn ? 'checked' : ''} />
                <label class="form-check-label small" for="camp-optin-req">
                  Incluye captura de leads/newsletter (requiere consentimiento opt-in explícito RN-MKT-03)
                </label>
              </div>
              <div class="form-check ms-3">
                <input class="form-check-input" type="checkbox" id="camp-optin-ok" ${selected.optInVerificado ? 'checked' : ''} />
                <label class="form-check-label small" for="camp-optin-ok">
                  Confirmo que no existen casillas pre-marcadas en el formulario web
                </label>
              </div>
            </div>

            <div class="mkt-preflight-box">
              <div class="small fw-bold text-uppercase mb-1" style="color: var(--color-ink-muted);">
                Chequeo Pre-vuelo (Inventario + Reglas)
              </div>
              <div class="mkt-preflight-item">
                <span>Prendas cubiertas por este alcance</span>
                <strong class="pos-num">${affectedProducts.length} modelos</strong>
              </div>
              <div class="mkt-preflight-item">
                <span>Modelos con SKUs en stock crítico (≤ 5 u.) o agotado</span>
                <strong class="pos-num ${criticalInScope.length > 0 ? 'pos-text-warn' : ''}">
                  ${criticalInScope.length} modelo${criticalInScope.length === 1 ? '' : 's'}
                </strong>
              </div>
              <div class="mkt-preflight-item">
                <span>Baja automática al agotar cupo o vencer fecha</span>
                <span class="mkt-badge is-ok">Activa (RN-MKT-01)</span>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-1">
              <div class="d-flex gap-2 flex-wrap align-items-center">
                <button
                  type="button"
                  id="btn-save-camp-draft"
                  class="pos-btn-md pos-btn-secondary"
                  ${selected.status === 'aprobada' ? 'disabled' : ''}
                >
                  Guardar borrador
                </button>
                <button
                  type="submit"
                  id="btn-submit-camp-approval"
                  class="pos-btn-md pos-btn-primary"
                  ${selected.status === 'aprobada' || selected.status === 'pendiente_aprobacion' ? 'disabled' : ''}
                >
                  ${selected.status === 'aprobada' ? 'Enviar cambios a aprobación' : 'Enviar a aprobación del Administrador'}
                </button>
                ${
                  selected.status === 'aprobada'
                    ? '<span id="camp-approval-hint" class="small pos-text-muted">En vivo sin cambios; edita algún campo para reenviar.</span>'
                    : selected.status === 'pendiente_aprobacion'
                      ? '<span id="camp-approval-hint" class="small pos-text-muted">Ya enviada a revisión; edita si necesitas actualizarla.</span>'
                      : ''
                }
              </div>

              ${
                selected.status === 'aprobada'
                  ? `<button type="button" id="btn-toggle-camp-pause" class="pos-btn-md pos-btn-secondary">Pausar campaña</button>`
                  : selected.status === 'pausada'
                    ? `<button type="button" id="btn-toggle-camp-pause" class="pos-btn-md pos-btn-secondary">Reactivar campaña</button>`
                    : ''
              }
            </div>

            ${
              canApproveDirectly && selected.status === 'pendiente_aprobacion'
                ? `
                  <div class="mkt-auto-route-box d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span><strong>Acción de Administrador ${local.uiMode === 'practica' ? '(habilitada en Modo Práctica)' : ''}:</strong></span>
                    <div class="d-flex gap-2">
                      <button type="button" id="btn-approve-camp" class="pos-btn-md pos-btn-primary">Aprobar y activar</button>
                      <button type="button" id="btn-reject-camp" class="pos-btn-md pos-btn-secondary">Observar / Rechazar</button>
                    </div>
                  </div>
                `
                : ''
            }
          </form>
        </div>
      </section>
    </div>
  `;
}

function renderAuditModal(): void {
  const slot = document.getElementById('mkt-modal-slot');
  if (!slot) return;
  if (!local.isAuditModalOpen) {
    slot.innerHTML = '';
    return;
  }

  slot.innerHTML = `
    <div class="alm-doc-backdrop" role="dialog" aria-modal="true" aria-label="Bitácora de Marketing">
      <div class="pos-panel" style="width: min(760px, 100%);">
        <div class="pos-panel-header">
          <h2 class="pos-panel-title pos-display">Bitácora de Marketing y Catálogo</h2>
          <button type="button" id="btn-close-audit" class="pos-btn-md pos-btn-secondary">Cerrar (Esc)</button>
        </div>
        <div class="pos-panel-body" style="max-height: 70vh; overflow-y: auto;">
          <div class="pos-table-wrap">
            <table class="pos-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Actor</th>
                  <th>Acción</th>
                  <th>Elemento</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                ${mktState.auditLog
                  .map(
                    (entry) => `
                    <tr>
                      <td class="pos-num small">${escapeHtml(new Date(entry.timestamp).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }))}</td>
                      <td class="small fw-semibold">${escapeHtml(entry.actor)}</td>
                      <td class="small">${escapeHtml(entry.action)}</td>
                      <td class="small fw-semibold">${escapeHtml(entry.target)}</td>
                      <td class="small pos-text-muted">${escapeHtml(entry.detail)}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWorkspace(): void {
  const slot = document.getElementById('mkt-workspace-slot');
  if (!slot) return;

  if (local.activeTab === 'recien_llegados') {
    slot.innerHTML = renderProductEditorialWorkspace(true);
  } else if (local.activeTab === 'catalogo') {
    slot.innerHTML = renderProductEditorialWorkspace(false);
  } else if (local.activeTab === 'portada_hero') {
    slot.innerHTML = renderHeroWorkspace();
  } else if (local.activeTab === 'colecciones') {
    slot.innerHTML = renderCollectionsWorkspace();
  } else {
    slot.innerHTML = renderCampaignsWorkspace();
  }

  bindDynamicForms();
}

function renderAll(): void {
  renderFeedback();
  renderPracticeBar();
  renderPulseStrip();
  renderPrioritySignals();
  renderTopActions();
  renderWorkspace();
  renderAuditModal();
}

function resetPendingImage(): void {
  local.pendingImageDataUrl = undefined;
  local.pendingImageCleared = false;
}

function bindDynamicForms(): void {
  const prodInput = document.getElementById('input-product-image') as HTMLInputElement | null;
  prodInput?.addEventListener('change', async () => {
    const file = prodInput.files?.[0];
    if (!file) return;
    try {
      local.pendingImageDataUrl = await compressImageFile(file, 960);
      local.pendingImageCleared = false;
      renderWorkspace();
    } catch (err) {
      local.feedback = {
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al procesar imagen.',
      };
      renderFeedback();
    }
  });

  document.getElementById('btn-clear-product-image')?.addEventListener('click', () => {
    local.pendingImageDataUrl = undefined;
    local.pendingImageCleared = true;
    renderWorkspace();
  });

  document.getElementById('form-product-editorial')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nombre = (document.getElementById('ed-nombre') as HTMLInputElement).value;
    const fraseCorta = (document.getElementById('ed-frase') as HTMLInputElement).value;
    const descripcion = (document.getElementById('ed-desc') as HTMLTextAreaElement).value;
    const alt_text = (document.getElementById('ed-alt') as HTMLInputElement).value;

    const result = saveProductEditorial(
      {
        groupId: local.selectedProductGroupId,
        nombre,
        fraseCorta,
        descripcion,
        alt_text,
        customImageDataUrl: local.pendingImageCleared
          ? ''
          : local.pendingImageDataUrl,
        completadoEditorial: true,
      },
      currentSession.displayName
    );

    if (!result.ok) {
      local.feedback = { kind: 'err', text: result.error ?? 'No se pudo guardar.' };
    } else {
      mktState = result.state;
      resetPendingImage();
      local.feedback = {
        kind: 'ok',
        text: `Ficha editorial de "${nombre}" publicada directamente en la tienda web.`,
      };
    }
    renderAll();
  });

  // Hero
  const heroInput = document.getElementById('input-hero-image') as HTMLInputElement | null;
  heroInput?.addEventListener('change', async () => {
    const file = heroInput.files?.[0];
    if (!file) return;
    try {
      local.pendingImageDataUrl = await compressImageFile(file, 1600);
      local.pendingImageCleared = false;
      renderWorkspace();
    } catch (err) {
      local.feedback = {
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al procesar imagen.',
      };
      renderFeedback();
    }
  });

  const targetTypeSelect = document.getElementById('hero-target-type') as HTMLSelectElement | null;
  targetTypeSelect?.addEventListener('change', () => {
    const nextType = targetTypeSelect.value as 'coleccion' | 'campana';
    const nextTargetId =
      nextType === 'campana'
        ? mktState.campaigns[0]?.id ?? ''
        : mktState.collections[0]?.id ?? '';
    local.draftHeroTargetType = nextType;
    local.draftHeroTargetId = nextTargetId;
    renderWorkspace();
  });

  document.getElementById('hero-target-id')?.addEventListener('change', (ev) => {
    local.draftHeroTargetId = (ev.target as HTMLSelectElement).value;
    renderWorkspace();
  });

  document.getElementById('form-hero-slide')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const existing = mktState.heroSlides.find((s) => s.id === local.selectedHeroId);
    const targetType = (document.getElementById('hero-target-type') as HTMLSelectElement)
      .value as 'coleccion' | 'campana';
    const targetId = (document.getElementById('hero-target-id') as HTMLSelectElement).value;

    const result = saveHeroSlide(
      {
        id: local.selectedHeroId,
        eyebrow: (document.getElementById('hero-eyebrow') as HTMLInputElement).value.trim(),
        titulo: (document.getElementById('hero-titulo') as HTMLInputElement).value.trim(),
        tituloSecundario: (document.getElementById('hero-sub') as HTMLInputElement).value.trim(),
        subtitulo: (document.getElementById('hero-frase') as HTMLInputElement).value.trim(),
        ctaLabel: (document.getElementById('hero-cta') as HTMLInputElement).value.trim() || 'Explorar',
        imageSlotKey: existing?.imageSlotKey ?? 'oferta-01',
        customImageDataUrl: local.pendingImageDataUrl ?? existing?.customImageDataUrl,
        alt_text: (document.getElementById('hero-titulo') as HTMLInputElement).value.trim(),
        targetType,
        targetId,
        activa: (document.getElementById('hero-activa') as HTMLInputElement).checked,
        orden: Number((document.getElementById('hero-orden') as HTMLInputElement).value) || 1,
      },
      currentSession.displayName
    );

    if (!result.ok) {
      local.feedback = { kind: 'err', text: result.error ?? 'Error al guardar Hero.' };
    } else {
      mktState = result.state;
      local.creatingNewFor = null;
      local.draftHeroTargetType = null;
      local.draftHeroTargetId = null;
      resetPendingImage();
      local.feedback = {
        kind: 'ok',
        text: 'Slide de Hero publicado con enlace automático hacia su destino.',
      };
    }
    renderAll();
  });

  // Colecciones
  const colInput = document.getElementById('input-collection-image') as HTMLInputElement | null;
  colInput?.addEventListener('change', async () => {
    const file = colInput.files?.[0];
    if (!file) return;
    try {
      local.pendingImageDataUrl = await compressImageFile(file, 1280);
      local.pendingImageCleared = false;
      renderWorkspace();
    } catch (err) {
      local.feedback = {
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al procesar imagen.',
      };
      renderFeedback();
    }
  });

  const refreshCollectionPickerList = (): void => {
    const picker = document.getElementById('col-product-picker-list');
    const countEl = document.getElementById('col-selected-count');
    const selectedSet = local.draftCollectionProductIds ?? new Set<string>();
    if (countEl) countEl.textContent = String(selectedSet.size);
    if (!picker) return;

    const pq = local.colProdQuery.trim().toLowerCase();
    const filtered = getAllCatalogProducts().filter((prod) => {
      if (local.colProdOnlySelected && !selectedSet.has(prod.groupId)) return false;
      if (local.colProdCategory !== 'todas' && prod.categorySlug !== local.colProdCategory) return false;
      if (!pq) return true;
      return (
        prod.nombre.toLowerCase().includes(pq) ||
        prod.marca.toLowerCase().includes(pq) ||
        prod.variants.some((v) => v.sku.toLowerCase().includes(pq))
      );
    });

    if (filtered.length === 0) {
      picker.innerHTML =
        '<div class="p-3 text-center small pos-text-muted">Sin prendas coincidentes para este filtro.</div>';
      return;
    }

    picker.innerHTML = filtered
      .map((prod) => {
        const checked = selectedSet.has(prod.groupId);
        const thumb = resolveProductPreviewImage(prod.groupId);
        return `
          <label class="mkt-product-pick-row" style="cursor: pointer;">
            <span class="d-flex align-items-center gap-2 min-w-0">
              <input
                type="checkbox"
                class="form-check-input mt-0"
                name="col-products"
                value="${escapeHtml(prod.groupId)}"
                ${checked ? 'checked' : ''}
              />
              <span class="mkt-pick-thumb">
                ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(prod.nombre)}" />` : '<span>S/F</span>'}
              </span>
              <span class="min-w-0">
                <span class="fw-semibold d-block text-truncate">${escapeHtml(prod.nombre)}</span>
                <span class="small pos-text-muted">${escapeHtml(prod.marca)} · ${escapeHtml(prod.categorySlug)}</span>
              </span>
            </span>
            ${getStockBadgeHtml(prod.groupId)}
          </label>
        `;
      })
      .join('');
  };

  document.getElementById('col-prod-search')?.addEventListener('input', (ev) => {
    local.colProdQuery = (ev.target as HTMLInputElement).value;
    refreshCollectionPickerList();
  });

  document.getElementById('col-prod-cat')?.addEventListener('change', (ev) => {
    local.colProdCategory = (ev.target as HTMLSelectElement).value;
    refreshCollectionPickerList();
  });

  document.getElementById('col-prod-only-selected')?.addEventListener('change', (ev) => {
    local.colProdOnlySelected = (ev.target as HTMLInputElement).checked;
    refreshCollectionPickerList();
  });

  document.getElementById('col-product-picker-list')?.addEventListener('change', (ev) => {
    const input = ev.target as HTMLInputElement | null;
    if (!input || input.name !== 'col-products') return;
    const set = local.draftCollectionProductIds ?? new Set<string>();
    if (input.checked) set.add(input.value);
    else set.delete(input.value);
    local.draftCollectionProductIds = set;
    const countEl = document.getElementById('col-selected-count');
    if (countEl) countEl.textContent = String(set.size);
  });

  document.getElementById('btn-col-suggest-new')?.addEventListener('click', () => {
    const set = local.draftCollectionProductIds ?? new Set<string>();
    for (const p of getAllCatalogProducts()) {
      if (p.recienLlegado) set.add(p.groupId);
    }
    local.draftCollectionProductIds = set;
    refreshCollectionPickerList();
  });

  document.getElementById('btn-col-suggest-featured')?.addEventListener('click', () => {
    const set = local.draftCollectionProductIds ?? new Set<string>();
    for (const p of getAllCatalogProducts()) {
      if (p.destacado) set.add(p.groupId);
    }
    local.draftCollectionProductIds = set;
    refreshCollectionPickerList();
  });

  document.getElementById('btn-col-clear-prods')?.addEventListener('click', () => {
    local.draftCollectionProductIds = new Set<string>();
    refreshCollectionPickerList();
  });

  document.getElementById('form-collection')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const existing = mktState.collections.find((c) => c.id === local.selectedCollectionId);
    const checkedProducts = Array.from(local.draftCollectionProductIds ?? []);

    const titulo = (document.getElementById('col-titulo') as HTMLInputElement).value.trim();
    const result = saveCollection(
      {
        id: local.selectedCollectionId,
        eyebrow: (document.getElementById('col-eyebrow') as HTMLInputElement).value.trim(),
        titulo,
        descripcion: (document.getElementById('col-desc') as HTMLTextAreaElement).value.trim(),
        ctaLabel: (document.getElementById('col-cta') as HTMLInputElement).value.trim() || 'Explorar',
        imageSlotKey: existing?.imageSlotKey ?? 'col-hombre',
        customImageDataUrl: local.pendingImageDataUrl ?? existing?.customImageDataUrl,
        alt_text: titulo,
        category: (document.getElementById('col-cat') as HTMLSelectElement).value as CategorySlug,
        gender: (document.getElementById('col-gender') as HTMLSelectElement).value as GenderFilter,
        productGroupIds: checkedProducts,
        activa: (document.getElementById('col-activa') as HTMLInputElement).checked,
      },
      currentSession.displayName
    );

    if (!result.ok) {
      local.feedback = { kind: 'err', text: result.error ?? 'Error al guardar colección.' };
    } else {
      mktState = result.state;
      local.creatingNewFor = null;
      local.draftCollectionProductIds = null;
      resetPendingImage();
      local.feedback = {
        kind: 'ok',
        text: `Colección "${titulo}" publicada y disponible para enlazar en el Hero.`,
      };
    }
    renderAll();
  });

  // Campañas
  document.getElementById('camp-status-filter')?.addEventListener('change', (ev) => {
    local.campaignFilter = (ev.target as HTMLSelectElement).value as 'todas' | CampaignStatus;
    renderWorkspace();
  });

  document.getElementById('camp-scope')?.addEventListener('change', (ev) => {
    const camp = mktState.campaigns.find((c) => c.id === local.selectedCampaignId);
    if (camp) {
      camp.scopeType = (ev.target as HTMLSelectElement).value as 'coleccion' | 'categoria';
      if (camp.scopeType === 'coleccion' && !camp.collectionId) {
        camp.collectionId = mktState.collections[0]?.id;
      }
    }
    renderWorkspace();
  });

  const collectCampaignPayload = (): Omit<MarketingCampaign, 'updatedAt'> => {
    const existing = mktState.campaigns.find((c) => c.id === local.selectedCampaignId);
    const scopeType = (document.getElementById('camp-scope') as HTMLSelectElement).value as
      | 'coleccion'
      | 'categoria';
    const collectionId =
      scopeType === 'coleccion'
        ? (document.getElementById('camp-collection') as HTMLSelectElement | null)?.value
        : undefined;
    const categoriaTarget =
      scopeType === 'categoria'
        ? ((document.getElementById('camp-cat') as HTMLSelectElement | null)?.value as CategorySlug)
        : mktState.collections.find((c) => c.id === collectionId)?.category ?? 'todas';

    return {
      id: local.selectedCampaignId,
      titulo: (document.getElementById('camp-titulo') as HTMLInputElement).value.trim(),
      descripcion: (document.getElementById('camp-desc') as HTMLTextAreaElement).value.trim(),
      porcentajeDescuento:
        Number((document.getElementById('camp-pct') as HTMLInputElement).value) || 0,
      fecha_inicio: (document.getElementById('camp-inicio') as HTMLInputElement).value,
      fecha_fin: (document.getElementById('camp-fin') as HTMLInputElement).value,
      stock_maximo:
        Number((document.getElementById('camp-stock-max') as HTMLInputElement).value) || 0,
      stock_consumido: existing?.stock_consumido ?? 0,
      scopeType,
      collectionId,
      categoriaTarget,
      productGroupIds: existing?.productGroupIds ?? [],
      aplicaEnTiendaFisica: (document.getElementById('camp-pos-apply') as HTMLInputElement).checked,
      incluyeCapturaOptIn: (document.getElementById('camp-optin-req') as HTMLInputElement).checked,
      optInVerificado: (document.getElementById('camp-optin-ok') as HTMLInputElement).checked,
      status: existing?.status ?? 'borrador',
      createdBy: existing?.createdBy ?? currentSession.displayName,
      approvedBy: existing?.approvedBy,
    };
  };

  const syncCampaignApprovalButtons = (): void => {
    const existing = mktState.campaigns.find((c) => c.id === local.selectedCampaignId);
    const submitBtn = document.getElementById('btn-submit-camp-approval') as HTMLButtonElement | null;
    const draftBtn = document.getElementById('btn-save-camp-draft') as HTMLButtonElement | null;
    const hintEl = document.getElementById('camp-approval-hint');
    if (!existing || (existing.status !== 'aprobada' && existing.status !== 'pendiente_aprobacion')) {
      return;
    }
    const dirty = hasCampaignChanges(existing, collectCampaignPayload());
    if (submitBtn) submitBtn.disabled = !dirty;
    if (draftBtn && existing.status === 'aprobada') draftBtn.disabled = !dirty;
    if (hintEl) {
      hintEl.textContent = dirty
        ? 'Cambios detectados: ya puedes enviar esta versión a aprobación.'
        : existing.status === 'aprobada'
          ? 'En vivo sin cambios; edita algún campo para reenviar.'
          : 'Ya enviada a revisión; edita si necesitas actualizarla.';
    }
  };

  const campForm = document.getElementById('form-campaign');
  campForm?.addEventListener('input', syncCampaignApprovalButtons);
  campForm?.addEventListener('change', syncCampaignApprovalButtons);

  document.getElementById('btn-save-camp-draft')?.addEventListener('click', () => {
    const res = saveCampaign(collectCampaignPayload(), false, currentSession.displayName);
    if (!res.ok) {
      local.feedback = { kind: 'err', text: res.error ?? 'Error al guardar borrador.' };
    } else {
      mktState = res.state;
      local.creatingNewFor = null;
      local.feedback = { kind: 'ok', text: 'Campaña guardada como borrador.' };
    }
    renderAll();
  });

  document.getElementById('form-campaign')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const res = saveCampaign(collectCampaignPayload(), true, currentSession.displayName);
    if (!res.ok) {
      local.feedback = { kind: 'err', text: res.error ?? 'Revisa las reglas de campaña.' };
    } else {
      mktState = res.state;
      local.creatingNewFor = null;
      local.feedback = {
        kind: 'ok',
        text: 'Campaña enviada a aprobación del Administrador (RN-MKT-04).',
      };
    }
    renderAll();
  });

  document.getElementById('btn-approve-camp')?.addEventListener('click', () => {
    const res = approveCampaign(local.selectedCampaignId, currentSession.displayName);
    mktState = res.state;
    local.feedback = { kind: res.ok ? 'ok' : 'err', text: res.message };
    renderAll();
  });

  document.getElementById('btn-reject-camp')?.addEventListener('click', () => {
    const res = rejectCampaign(
      local.selectedCampaignId,
      'Revisar margen promocional y fechas antes de activar.',
      currentSession.displayName
    );
    mktState = res.state;
    local.feedback = { kind: res.ok ? 'warn' : 'err', text: res.message };
    renderAll();
  });

  document.getElementById('btn-toggle-camp-pause')?.addEventListener('click', () => {
    const res = toggleCampaignPause(local.selectedCampaignId, currentSession.displayName);
    mktState = res.state;
    local.feedback = { kind: res.ok ? 'ok' : 'err', text: res.message };
    renderAll();
  });
}

function attachGlobalListeners(): void {
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('#btn-mkt-logout')) {
      logoutToAccess();
      return;
    }
    if (target.closest('#btn-close-feedback')) {
      local.feedback = null;
      renderFeedback();
      return;
    }
    if (target.closest('#btn-open-audit')) {
      local.isAuditModalOpen = true;
      renderAuditModal();
      return;
    }
    if (target.closest('#btn-close-audit')) {
      local.isAuditModalOpen = false;
      renderAuditModal();
      return;
    }
    if (target.closest('#btn-sim-arrival')) {
      const res = simulatePendingNewArrival();
      mktState = res.state;
      local.feedback = { kind: 'ok', text: res.message };
      renderAll();
      return;
    }
    if (target.closest('#btn-reset-mkt')) {
      mktState = resetMarketingState();
      resetPendingImage();
      local.feedback = { kind: 'ok', text: 'Estado demo de Marketing reiniciado.' };
      renderAll();
      return;
    }

    const tabBtn = target.closest<HTMLElement>('[data-mkt-tab]');
    if (tabBtn?.dataset.mktTab) {
      local.activeTab = tabBtn.dataset.mktTab as MarketingTab;
      local.creatingNewFor = null;
      local.draftHeroTargetType = null;
      local.draftHeroTargetId = null;
      local.draftCollectionProductIds = null;
      resetPendingImage();
      renderAll();
      return;
    }

    const signalBtn = target.closest<HTMLElement>('[data-signal-tab]');
    if (signalBtn?.dataset.signalTab) {
      const nextTab = signalBtn.dataset.signalTab as MarketingTab;
      const nextId = signalBtn.dataset.signalId ?? '';
      local.activeTab = nextTab;
      local.creatingNewFor = null;
      local.draftHeroTargetType = null;
      local.draftHeroTargetId = null;
      local.draftCollectionProductIds = null;
      if (nextTab === 'recien_llegados' || nextTab === 'catalogo') {
        local.selectedProductGroupId = nextId;
      } else if (nextTab === 'campanas') {
        local.selectedCampaignId = nextId;
      }
      resetPendingImage();
      renderAll();
      return;
    }

    const prodBtn = target.closest<HTMLElement>('[data-select-product]');
    if (prodBtn?.dataset.selectProduct) {
      local.selectedProductGroupId = prodBtn.dataset.selectProduct;
      local.creatingNewFor = null;
      resetPendingImage();
      renderWorkspace();
      return;
    }

    const heroBtn = target.closest<HTMLElement>('[data-select-hero]');
    if (heroBtn?.dataset.selectHero) {
      local.selectedHeroId = heroBtn.dataset.selectHero;
      local.creatingNewFor = null;
      local.draftHeroTargetType = null;
      local.draftHeroTargetId = null;
      resetPendingImage();
      renderWorkspace();
      return;
    }

    const colBtn = target.closest<HTMLElement>('[data-select-collection]');
    if (colBtn?.dataset.selectCollection) {
      local.selectedCollectionId = colBtn.dataset.selectCollection;
      local.creatingNewFor = null;
      local.draftCollectionProductIds = null;
      local.colProdQuery = '';
      local.colProdCategory = 'todas';
      local.colProdOnlySelected = false;
      resetPendingImage();
      renderWorkspace();
      return;
    }

    const campBtn = target.closest<HTMLElement>('[data-select-campaign]');
    if (campBtn?.dataset.selectCampaign) {
      local.selectedCampaignId = campBtn.dataset.selectCampaign;
      local.creatingNewFor = null;
      renderWorkspace();
      return;
    }

    if (target.closest('#btn-new-hero')) {
      local.selectedHeroId = `hero-${Date.now()}`;
      local.creatingNewFor = 'hero';
      local.draftHeroTargetType = null;
      local.draftHeroTargetId = null;
      resetPendingImage();
      renderWorkspace();
      return;
    }
    if (target.closest('#btn-new-collection')) {
      local.selectedCollectionId = `col-${Date.now()}`;
      local.creatingNewFor = 'coleccion';
      local.draftCollectionProductIds = new Set<string>();
      local.colProdQuery = '';
      local.colProdCategory = 'todas';
      local.colProdOnlySelected = false;
      resetPendingImage();
      renderWorkspace();
      return;
    }
    if (target.closest('#btn-new-campaign')) {
      local.selectedCampaignId = `camp-${Date.now()}`;
      local.creatingNewFor = 'campana';
      renderWorkspace();
      return;
    }
  });

  document.getElementById('mkt-search-input')?.addEventListener('input', (ev) => {
    local.searchQuery = (ev.target as HTMLInputElement).value;
    renderWorkspace();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'F2') {
      ev.preventDefault();
      document.getElementById('mkt-search-input')?.focus();
    } else if (ev.key === 'Escape' && local.isAuditModalOpen) {
      local.isAuditModalOpen = false;
      renderAuditModal();
    }
  });
}

subscribeMarketingEvents(() => {
  mktState = loadMarketingState();
  local.uiMode = getMarketingUiMode();
  renderAll();
});

subscribeCatalogEvents(() => {
  renderAll();
});

const consoleApi: MarketingConsoleApi = {
  estado: () => ({
    pendientesEditorial: getPendingNewArrivalsCount(),
    heroActivos: mktState.heroSlides.filter((s) => s.activa).length,
    coleccionesActivas: mktState.collections.filter((c) => c.activa).length,
    campanasActivas: mktState.campaigns.filter((c) => isCampaignCurrentlyActive(c)).length,
    campanasPendientes: mktState.campaigns.filter((c) => c.status === 'pendiente_aprobacion').length,
    uiMode: local.uiMode,
  }),
  modo: (nextMode) => {
    local.uiMode = setMarketingUiMode(nextMode);
    renderAll();
    return local.uiMode;
  },
  aprobarCampana: (campaignId, adminName = 'Lucía Benavides') => {
    const res = approveCampaign(campaignId, adminName);
    mktState = res.state;
    renderAll();
    return { ok: res.ok, message: res.message };
  },
  rechazarCampana: (campaignId, motivo = 'Ajustar vigencia', adminName = 'Lucía Benavides') => {
    const res = rejectCampaign(campaignId, motivo, adminName);
    mktState = res.state;
    renderAll();
    return { ok: res.ok, message: res.message };
  },
  consumirStockCampana: (campaignId, units = 1) => {
    const res = consumeCampaignStockSim(campaignId, units);
    mktState = res.state;
    renderAll();
    return { ok: res.ok, message: res.message };
  },
  simularRecienLlegado: (groupId) => {
    const res = simulatePendingNewArrival(groupId);
    mktState = res.state;
    renderAll();
    return { ok: res.ok, message: res.message };
  },
  reiniciar: () => {
    mktState = resetMarketingState();
    resetPendingImage();
    renderAll();
  },
};

(window as unknown as { IO_MARKETING: MarketingConsoleApi }).IO_MARKETING = consoleApi;

renderStaticShell();
attachGlobalListeners();
renderAll();
