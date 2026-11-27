import {
  CATALOGO_PRODUCTOS,
  COLECCIONES_BANNERS,
  OFERTAS_CARRUSEL,
} from '../data/catalogData';
import { getAllCatalogProducts } from '../data/customCatalogStore';
import {
  CampanaOferta,
  CategorySlug,
  CollectionBanner,
  ProductGroup,
} from '../types/store.types';
import {
  CampaignStatus,
  MarketingAuditEntry,
  MarketingCampaign,
  MarketingCollection,
  MarketingHeroSlide,
  MarketingStoreState,
  MarketingUiMode,
  ProductEditorialOverride,
} from './marketingTypes';

export const MARKETING_STORAGE_KEY = 'io_marketing_state_v1';
export const MARKETING_UI_MODE_KEY = 'io_marketing_ui_mode_v1';
const MARKETING_BROADCAST_CHANNEL = 'io_marketing_sync';

const channel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(MARKETING_BROADCAST_CHANNEL)
    : null;

function todayIsoDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildInitialState(): MarketingStoreState {
  const editorialOverrides: Record<string, ProductEditorialOverride> = {};

  for (const product of CATALOGO_PRODUCTOS) {
    if (product.recienLlegado) {

      const pendingDemo =
        product.groupId === 'set-infantil-algodon' ||
        product.groupId === 'hoodie-capas-studio';
      editorialOverrides[product.groupId] = {
        groupId: product.groupId,
        nombre: product.nombre,
        descripcion: pendingDemo ? '' : product.descripcion,
        fraseCorta: pendingDemo ? '' : product.badgeLabel ?? '',
        badgeLabel: product.badgeLabel,
        alt_text: product.variants[0]?.alt_text ?? product.nombre,
        completadoEditorial: !pendingDemo,
        updatedAt: nowIso(),
        updatedBy: pendingDemo ? 'Almacén / Ingreso automático' : 'Sofía Ríos',
      };
    }
  }

  const collections: MarketingCollection[] = COLECCIONES_BANNERS.map((banner) => {
    const matchedGroups = CATALOGO_PRODUCTOS.filter((p) => {
      if (banner.category !== 'todas' && p.categorySlug !== banner.category) return false;
      if (banner.gender && banner.gender !== 'todos' && p.genero !== banner.gender && p.genero !== 'unisex') {
        return false;
      }
      if (banner.ageGroup && banner.ageGroup !== 'todas' && p.rango_edad !== banner.ageGroup) {
        return false;
      }
      return true;
    }).map((p) => p.groupId);

    return {
      id: banner.id,
      eyebrow: banner.eyebrow,
      titulo: banner.titulo,
      descripcion: banner.descripcion,
      ctaLabel: banner.ctaLabel,
      imageSlotKey: banner.imageSlotKey,
      alt_text: banner.alt_text,
      category: banner.category,
      gender: banner.gender,
      ageGroup: banner.ageGroup,
      onlyOffers: banner.onlyOffers,
      productGroupIds: matchedGroups,
      activa: true,
      updatedAt: nowIso(),
    };
  });

  const campaigns: MarketingCampaign[] = [
    {
      id: 'camp-pima-studio',
      titulo: 'Cápsula Algodón Pima',
      descripcion: 'Descuento especial en polos oversize Pima seleccionados de temporada.',
      porcentajeDescuento: 20,
      fecha_inicio: todayIsoDate(-3),
      fecha_fin: todayIsoDate(7),
      stock_maximo: 30,
      stock_consumido: 18,
      scopeType: 'categoria',
      categoriaTarget: 'prendas-superiores',
      productGroupIds: CATALOGO_PRODUCTOS.filter((p) => p.categorySlug === 'prendas-superiores').map(
        (p) => p.groupId
      ),
      aplicaEnTiendaFisica: true,
      incluyeCapturaOptIn: true,
      optInVerificado: true,
      status: 'aprobada',
      createdBy: 'Sofía Ríos',
      approvedBy: 'Lucía Benavides',
      updatedAt: nowIso(),
    },
    {
      id: 'camp-vestidos-saten',
      titulo: 'Vestidos de Autor en Satén',
      descripcion: 'Beneficio por lanzamiento limitado en vestidos midi satinados.',
      porcentajeDescuento: 15,
      fecha_inicio: todayIsoDate(-2),
      fecha_fin: todayIsoDate(5),
      stock_maximo: 15,
      stock_consumido: 12,
      scopeType: 'categoria',
      categoriaTarget: 'vestidos',
      productGroupIds: CATALOGO_PRODUCTOS.filter((p) => p.categorySlug === 'vestidos').map(
        (p) => p.groupId
      ),
      aplicaEnTiendaFisica: false,
      incluyeCapturaOptIn: false,
      optInVerificado: true,
      status: 'aprobada',
      createdBy: 'Sofía Ríos',
      approvedBy: 'Lucía Benavides',
      updatedAt: nowIso(),
    },
    {
      id: 'camp-bombers-urbanas',
      titulo: 'Drop Urbano Bombers & Sneakers',
      descripcion: 'Propuesta de descuento para capas urbanas y calzado minimalista.',
      porcentajeDescuento: 15,
      fecha_inicio: todayIsoDate(1),
      fecha_fin: todayIsoDate(10),
      stock_maximo: 20,
      stock_consumido: 0,
      scopeType: 'categoria',
      categoriaTarget: 'casacas',
      productGroupIds: CATALOGO_PRODUCTOS.filter((p) => p.categorySlug === 'casacas').map(
        (p) => p.groupId
      ),
      aplicaEnTiendaFisica: true,
      incluyeCapturaOptIn: true,
      optInVerificado: true,
      status: 'pendiente_aprobacion',
      createdBy: 'Sofía Ríos',
      updatedAt: nowIso(),
    },
  ];

  const heroSlides: MarketingHeroSlide[] = OFERTAS_CARRUSEL.map((offer, idx) => {
    const defaultTarget =
      idx === 0
        ? { targetType: 'campana' as const, targetId: 'camp-pima-studio' }
        : idx === 1
          ? { targetType: 'campana' as const, targetId: 'camp-vestidos-saten' }
          : idx === 2
            ? { targetType: 'coleccion' as const, targetId: 'coleccion-hombre' }
            : { targetType: 'coleccion' as const, targetId: 'coleccion-mujer' };

    return {
      id: `hero-${offer.campana_id}`,
      eyebrow: offer.kicker ?? 'Editorial I&O',
      titulo: offer.portadaTexto ?? offer.titulo,
      tituloSecundario: offer.tituloItalico ?? '',
      subtitulo: offer.subtitulo,
      ctaLabel: offer.ctaLabel ?? 'Ver detalles',
      imageSlotKey: offer.imageSlotKey,
      alt_text: offer.alt_text,
      targetType: defaultTarget.targetType,
      targetId: defaultTarget.targetId,
      activa: true,
      orden: idx + 1,
      updatedAt: nowIso(),
    };
  });

  const auditLog: MarketingAuditEntry[] = [
    {
      id: 'aud-mkt-1',
      timestamp: nowIso(),
      actor: 'Sistema I&O',
      action: 'Ingreso automático',
      target: 'Recién llegados',
      detail: 'Se detectaron prendas nuevas pendientes de foto y descripción editorial.',
    },
    {
      id: 'aud-mkt-2',
      timestamp: nowIso(),
      actor: 'Lucía Benavides',
      action: 'Aprobación de campaña',
      target: 'Cápsula Algodón Pima',
      detail: 'Aprobada con vigencia de 10 días y cupo máximo de 30 unidades (RN-MKT-01).',
    },
  ];

  return {
    version: 1,
    editorialOverrides,
    collections,
    heroSlides,
    campaigns,
    auditLog,
  };
}

function normalizeState(raw: MarketingStoreState): MarketingStoreState {
  const today = todayIsoDate(0);
  let mutated = false;
  const campaigns = raw.campaigns.map((c) => {
    if (c.status === 'aprobada' && (c.stock_consumido >= c.stock_maximo || c.fecha_fin < today)) {
      mutated = true;
      return {
        ...c,
        status: (c.stock_consumido >= c.stock_maximo ? 'agotada' : 'pausada') as CampaignStatus,
      };
    }
    return c;
  });

  if (!mutated) return raw;
  return { ...raw, campaigns };
}

export function loadMarketingState(): MarketingStoreState {
  try {
    const raw = window.localStorage.getItem(MARKETING_STORAGE_KEY);
    if (!raw) {
      const initial = buildInitialState();
      saveMarketingState(initial, false);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<MarketingStoreState>;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.collections) ||
      !Array.isArray(parsed.heroSlides) ||
      !Array.isArray(parsed.campaigns)
    ) {
      const initial = buildInitialState();
      saveMarketingState(initial, false);
      return initial;
    }
    return normalizeState({
      version: 1,
      editorialOverrides: parsed.editorialOverrides ?? {},
      collections: parsed.collections,
      heroSlides: parsed.heroSlides,
      campaigns: parsed.campaigns,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    });
  } catch {
    return buildInitialState();
  }
}

export function saveMarketingState(
  state: MarketingStoreState,
  broadcast = true
): { ok: boolean; error?: string } {
  try {
    window.localStorage.setItem(MARKETING_STORAGE_KEY, JSON.stringify(state));
    if (broadcast) {
      channel?.postMessage({ type: 'marketing_updated', at: Date.now() });
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'No se pudo guardar en almacenamiento local (límite de espacio alcanzado). Usa una imagen más ligera.',
    };
  }
}

export function subscribeMarketingEvents(onUpdate: () => void): () => void {
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === MARKETING_STORAGE_KEY || ev.key === MARKETING_UI_MODE_KEY) {
      onUpdate();
    }
  };
  const onChannel = () => onUpdate();
  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onChannel);
  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onChannel);
  };
}

export function getMarketingUiMode(): MarketingUiMode {
  try {
    return window.localStorage.getItem(MARKETING_UI_MODE_KEY) === 'practica'
      ? 'practica'
      : 'operacion';
  } catch {
    return 'operacion';
  }
}

export function setMarketingUiMode(mode: MarketingUiMode): MarketingUiMode {
  try {
    window.localStorage.setItem(MARKETING_UI_MODE_KEY, mode);
    channel?.postMessage({ type: 'marketing_mode_updated', mode });
  } catch {
  }
  return mode;
}

function appendAudit(
  state: MarketingStoreState,
  actor: string,
  action: string,
  target: string,
  detail: string
): MarketingAuditEntry[] {
  const entry: MarketingAuditEntry = {
    id: `aud-mkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso(),
    actor,
    action,
    target,
    detail,
  };
  return [entry, ...state.auditLog].slice(0, 80);
}

export function isCampaignCurrentlyActive(campaign: MarketingCampaign): boolean {
  if (campaign.status !== 'aprobada') return false;
  if (campaign.stock_consumido >= campaign.stock_maximo) return false;
  const today = todayIsoDate(0);
  return campaign.fecha_inicio <= today && campaign.fecha_fin >= today;
}

export function getActiveCampaignForProduct(
  groupId: string,
  categorySlug: CategorySlug,
  state?: MarketingStoreState
): MarketingCampaign | null {
  const current = state ?? loadMarketingState();
  for (const campaign of current.campaigns) {
    if (!isCampaignCurrentlyActive(campaign)) continue;
    if (campaign.scopeType === 'productos' && campaign.productGroupIds.includes(groupId)) {
      return campaign;
    }
    if (campaign.scopeType === 'categoria' && campaign.categoriaTarget === categorySlug) {
      return campaign;
    }
    if (campaign.scopeType === 'coleccion' && campaign.collectionId) {
      const col = current.collections.find((c) => c.id === campaign.collectionId);
      if (col && col.productGroupIds.includes(groupId)) {
        return campaign;
      }
    }
  }
  return null;
}

export function calculatePromotionalPrice(basePrice: number, discountPct: number): number {
  const factor = Math.max(0, Math.min(90, discountPct)) / 100;
  return Math.round(basePrice * (1 - factor) * 100) / 100;
}

export function saveProductEditorial(
  payload: {
    groupId: string;
    nombre: string;
    descripcion: string;
    fraseCorta: string;
    alt_text: string;
    customImageDataUrl?: string;
    completadoEditorial: boolean;
  },
  actor: string
): { ok: boolean; state: MarketingStoreState; error?: string } {
  const state = loadMarketingState();
  const prev = state.editorialOverrides[payload.groupId];
  const next: MarketingStoreState = {
    ...state,
    editorialOverrides: {
      ...state.editorialOverrides,
      [payload.groupId]: {
        groupId: payload.groupId,
        nombre: payload.nombre.trim(),
        descripcion: payload.descripcion.trim(),
        fraseCorta: payload.fraseCorta.trim(),
        badgeLabel: payload.fraseCorta.trim() || prev?.badgeLabel,
        customImageDataUrl:
          payload.customImageDataUrl !== undefined
            ? payload.customImageDataUrl
            : prev?.customImageDataUrl,
        alt_text: payload.alt_text.trim(),
        completadoEditorial: payload.completadoEditorial,
        updatedAt: nowIso(),
        updatedBy: actor,
      },
    },
    auditLog: appendAudit(
      state,
      actor,
      'Publicación editorial directa',
      payload.nombre.trim() || payload.groupId,
      payload.completadoEditorial
        ? 'Ficha editorial completa y publicada en catálogo web.'
        : 'Borrador editorial guardado.'
    ),
  };

  const saved = saveMarketingState(next);
  return { ok: saved.ok, state: saved.ok ? next : state, error: saved.error };
}

export function saveCollection(
  collection: Omit<MarketingCollection, 'updatedAt'>,
  actor: string
): { ok: boolean; state: MarketingStoreState; error?: string } {
  const state = loadMarketingState();
  const exists = state.collections.some((c) => c.id === collection.id);
  const fullCollection: MarketingCollection = {
    ...collection,
    updatedAt: nowIso(),
  };
  const collections = exists
    ? state.collections.map((c) => (c.id === collection.id ? fullCollection : c))
    : [...state.collections, fullCollection];

  const next: MarketingStoreState = {
    ...state,
    collections,
    auditLog: appendAudit(
      state,
      actor,
      exists ? 'Actualización de colección' : 'Nueva colección publicada',
      collection.titulo,
      `${collection.productGroupIds.length} productos vinculados · ${collection.activa ? 'Activa en web' : 'Oculta'}.`
    ),
  };

  const saved = saveMarketingState(next);
  return { ok: saved.ok, state: saved.ok ? next : state, error: saved.error };
}

export function saveHeroSlide(
  slide: Omit<MarketingHeroSlide, 'updatedAt'>,
  actor: string
): { ok: boolean; state: MarketingStoreState; error?: string } {
  const state = loadMarketingState();
  const exists = state.heroSlides.some((s) => s.id === slide.id);
  const fullSlide: MarketingHeroSlide = {
    ...slide,
    updatedAt: nowIso(),
  };
  const heroSlides = exists
    ? state.heroSlides.map((s) => (s.id === slide.id ? fullSlide : s))
    : [...state.heroSlides, fullSlide];

  const next: MarketingStoreState = {
    ...state,
    heroSlides: [...heroSlides].sort((a, b) => a.orden - b.orden),
    auditLog: appendAudit(
      state,
      actor,
      'Publicación directa de Hero',
      slide.titulo,
      `Enlace automático hacia ${slide.targetType === 'coleccion' ? 'Colección' : 'Campaña'} (${slide.targetId}).`
    ),
  };

  const saved = saveMarketingState(next);
  return { ok: saved.ok, state: saved.ok ? next : state, error: saved.error };
}

export function hasCampaignChanges(
  existing: MarketingCampaign,
  draft: Omit<MarketingCampaign, 'updatedAt'>
): boolean {
  return (
    existing.titulo.trim() !== draft.titulo.trim() ||
    existing.descripcion.trim() !== draft.descripcion.trim() ||
    existing.porcentajeDescuento !== draft.porcentajeDescuento ||
    existing.fecha_inicio !== draft.fecha_inicio ||
    existing.fecha_fin !== draft.fecha_fin ||
    existing.stock_maximo !== draft.stock_maximo ||
    existing.scopeType !== draft.scopeType ||
    (existing.collectionId ?? '') !== (draft.collectionId ?? '') ||
    existing.categoriaTarget !== draft.categoriaTarget ||
    existing.aplicaEnTiendaFisica !== draft.aplicaEnTiendaFisica ||
    existing.incluyeCapturaOptIn !== draft.incluyeCapturaOptIn ||
    existing.optInVerificado !== draft.optInVerificado
  );
}

export function saveCampaign(
  campaign: Omit<MarketingCampaign, 'updatedAt'>,
  submitForApproval: boolean,
  actor: string
): { ok: boolean; state: MarketingStoreState; error?: string } {
  if (submitForApproval) {
    if (!campaign.fecha_inicio || !campaign.fecha_fin || campaign.fecha_fin < campaign.fecha_inicio) {
      return {
        ok: false,
        state: loadMarketingState(),
        error: 'RN-MKT-01: Debes definir un rango de fechas válido (fin igual o posterior al inicio).',
      };
    }
    if (!Number.isFinite(campaign.stock_maximo) || campaign.stock_maximo <= 0) {
      return {
        ok: false,
        state: loadMarketingState(),
        error: 'RN-MKT-01: El stock máximo promocional debe ser mayor a 0 unidades.',
      };
    }
    if (campaign.porcentajeDescuento <= 0 || campaign.porcentajeDescuento > 70) {
      return {
        ok: false,
        state: loadMarketingState(),
        error: 'El porcentaje de descuento debe ubicarse entre 1% y 70%.',
      };
    }
    if (campaign.incluyeCapturaOptIn && !campaign.optInVerificado) {
      return {
        ok: false,
        state: loadMarketingState(),
        error: 'RN-MKT-03: Si la campaña captura contactos, debes confirmar consentimiento opt-in explícito sin casillas pre-marcadas.',
      };
    }
  }

  const state = loadMarketingState();
  const existing = state.campaigns.find((c) => c.id === campaign.id);
  const exists = Boolean(existing);

  if (existing && existing.status === 'aprobada' && !hasCampaignChanges(existing, campaign)) {
    return {
      ok: false,
      state,
      error: 'Esta campaña ya está aprobada y en vivo; modifica algún valor antes de volver a enviarla.',
    };
  }

  const nextStatus: CampaignStatus = submitForApproval
    ? 'pendiente_aprobacion'
    : campaign.status === 'aprobada'
      ? 'borrador'
      : campaign.status;

  const fullCampaign: MarketingCampaign = {
    ...campaign,
    status: nextStatus,
    motivoRechazo: submitForApproval ? undefined : campaign.motivoRechazo,
    updatedAt: nowIso(),
  };

  const campaigns = exists
    ? state.campaigns.map((c) => (c.id === campaign.id ? fullCampaign : c))
    : [fullCampaign, ...state.campaigns];

  const next: MarketingStoreState = {
    ...state,
    campaigns,
    auditLog: appendAudit(
      state,
      actor,
      submitForApproval ? 'Solicitud de aprobación de campaña' : 'Borrador de campaña',
      campaign.titulo,
      submitForApproval
        ? `Enviada a Administrador (${campaign.porcentajeDescuento}% · cupo ${campaign.stock_maximo} u. · ${campaign.fecha_inicio} al ${campaign.fecha_fin}).`
        : 'Guardada en borrador sin impacto público.'
    ),
  };

  const saved = saveMarketingState(next);
  return { ok: saved.ok, state: saved.ok ? next : state, error: saved.error };
}

export function approveCampaign(
  campaignId: string,
  adminName: string
): { ok: boolean; state: MarketingStoreState; message: string } {
  const state = loadMarketingState();
  const target = state.campaigns.find((c) => c.id === campaignId);
  if (!target) {
    return { ok: false, state, message: 'No se encontró la campaña indicada.' };
  }

  const next: MarketingStoreState = {
    ...state,
    campaigns: state.campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            status: 'aprobada',
            approvedBy: adminName,
            motivoRechazo: undefined,
            updatedAt: nowIso(),
          }
        : c
    ),
    auditLog: appendAudit(
      state,
      adminName,
      'Aprobación de campaña (RN-MKT-04)',
      target.titulo,
      `Campaña aprobada. Visible en Web${target.aplicaEnTiendaFisica ? ' y aplicable en POS tienda' : ' (solo informativo en POS)'}.`
    ),
  };

  saveMarketingState(next);
  return { ok: true, state: next, message: `Campaña "${target.titulo}" aprobada y activada.` };
}

export function rejectCampaign(
  campaignId: string,
  motivo: string,
  adminName: string
): { ok: boolean; state: MarketingStoreState; message: string } {
  const state = loadMarketingState();
  const target = state.campaigns.find((c) => c.id === campaignId);
  if (!target) {
    return { ok: false, state, message: 'No se encontró la campaña indicada.' };
  }

  const reason = motivo.trim() || 'Ajustar margen o vigencia antes de publicar.';
  const next: MarketingStoreState = {
    ...state,
    campaigns: state.campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            status: 'rechazada',
            motivoRechazo: reason,
            updatedAt: nowIso(),
          }
        : c
    ),
    auditLog: appendAudit(
      state,
      adminName,
      'Observación / Rechazo de campaña',
      target.titulo,
      reason
    ),
  };

  saveMarketingState(next);
  return { ok: true, state: next, message: `Campaña "${target.titulo}" devuelta para ajuste.` };
}

export function toggleCampaignPause(
  campaignId: string,
  actor: string
): { ok: boolean; state: MarketingStoreState; message: string } {
  const state = loadMarketingState();
  const target = state.campaigns.find((c) => c.id === campaignId);
  if (!target) {
    return { ok: false, state, message: 'Campaña no encontrada.' };
  }
  const nextStatus: CampaignStatus = target.status === 'aprobada' ? 'pausada' : 'aprobada';
  const next: MarketingStoreState = {
    ...state,
    campaigns: state.campaigns.map((c) =>
      c.id === campaignId ? { ...c, status: nextStatus, updatedAt: nowIso() } : c
    ),
    auditLog: appendAudit(
      state,
      actor,
      nextStatus === 'pausada' ? 'Pausa de campaña' : 'Reactivación de campaña',
      target.titulo,
      nextStatus === 'pausada'
        ? 'Campaña retirada temporalmente de web y POS.'
        : 'Campaña reactivada dentro de su vigencia aprobada.'
    ),
  };

  saveMarketingState(next);
  return {
    ok: true,
    state: next,
    message:
      nextStatus === 'pausada'
        ? `Campaña "${target.titulo}" pausada.`
        : `Campaña "${target.titulo}" reactivada.`,
  };
}

export function consumeCampaignStockSim(
  campaignId: string,
  units = 1,
  actor = 'Sistema Web / Simulación'
): { ok: boolean; state: MarketingStoreState; message: string } {
  const state = loadMarketingState();
  const target = state.campaigns.find((c) => c.id === campaignId);
  if (!target) {
    return { ok: false, state, message: 'Campaña no encontrada.' };
  }
  const nextConsumed = Math.min(target.stock_maximo, target.stock_consumido + Math.max(1, units));
  const autoClosed = nextConsumed >= target.stock_maximo;
  const next: MarketingStoreState = {
    ...state,
    campaigns: state.campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            stock_consumido: nextConsumed,
            status: autoClosed ? 'agotada' : c.status,
            updatedAt: nowIso(),
          }
        : c
    ),
    auditLog: appendAudit(
      state,
      actor,
      autoClosed ? 'Baja automática por stock 0 (RN-MKT-01)' : 'Consumo de cupo promocional',
      target.titulo,
      `Cupo utilizado: ${nextConsumed}/${target.stock_maximo}.`
    ),
  };

  saveMarketingState(next);
  return {
    ok: true,
    state: next,
    message: autoClosed
      ? `"${target.titulo}" alcanzó su cupo máximo (${nextConsumed}/${target.stock_maximo}) y se dio de baja automáticamente.`
      : `Cupo actualizado: ${nextConsumed}/${target.stock_maximo}.`,
  };
}

export function simulatePendingNewArrival(groupId?: string): {
  ok: boolean;
  state: MarketingStoreState;
  message: string;
} {
  const state = loadMarketingState();
  const allProducts = getAllCatalogProducts();
  const target =
    allProducts.find((p) => p.groupId === groupId) ??
    allProducts.find((p) => p.recienLlegado) ??
    allProducts[0];

  const next: MarketingStoreState = {
    ...state,
    editorialOverrides: {
      ...state.editorialOverrides,
      [target.groupId]: {
        groupId: target.groupId,
        nombre: target.nombre,
        descripcion: '',
        fraseCorta: '',
        badgeLabel: 'Recién llegado',
        alt_text: target.nombre,
        completadoEditorial: false,
        updatedAt: nowIso(),
        updatedBy: 'Almacén / Ingreso automático',
      },
    },
    auditLog: appendAudit(
      state,
      'Almacén / BD',
      'Nuevo ingreso detectado',
      target.nombre,
      'Marcado como recién llegado pendiente de foto y descripción editorial.'
    ),
  };

  saveMarketingState(next);
  return {
    ok: true,
    state: next,
    message: `Simulado ingreso de "${target.nombre}" en cola de Recién llegados.`,
  };
}

export function resetMarketingState(): MarketingStoreState {
  const initial = buildInitialState();
  saveMarketingState(initial);
  return initial;
}

export function compressImageFile(file: File, maxWidth = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        reject(new Error('Archivo de imagen vacío.'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no corresponde a una imagen válida.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/webp', 0.82);
        resolve(compressed.startsWith('data:image/') ? compressed : canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

                                                                                
                                                                 
                                                                                

export function getEffectiveCatalogProducts(state?: MarketingStoreState): ProductGroup[] {
  const current = state ?? loadMarketingState();
  return getAllCatalogProducts().map((product) => {
    const override = current.editorialOverrides[product.groupId];
    const activeCampaign = getActiveCampaignForProduct(
      product.groupId,
      product.categorySlug,
      current
    );

    const basePrice = product.precio_regular ?? product.variants[0]?.precio_venta ?? 0;
    const promoBadge = activeCampaign
      ? `-${activeCampaign.porcentajeDescuento}%`
      : override?.badgeLabel ?? product.badgeLabel;

    const updatedVariants = product.variants.map((variant) => {
      const regularVariantPrice = product.precio_regular ?? variant.precio_venta;
      const nextPrice = activeCampaign
        ? calculatePromotionalPrice(regularVariantPrice, activeCampaign.porcentajeDescuento)
        : variant.precio_venta;

      return {
        ...variant,
        precio_venta: nextPrice,
        alt_text: override?.alt_text || variant.alt_text,
      };
    });

    return {
      ...product,
      nombre: override?.nombre || product.nombre,
      descripcion: override?.descripcion || product.descripcion,
      fraseCorta: override?.fraseCorta || product.fraseCorta,
      badgeLabel: promoBadge,
      customImageUrl: override?.customImageDataUrl || product.customImageUrl,
      precio_regular: activeCampaign ? basePrice : product.precio_regular,
      variants: updatedVariants,
    };
  });
}

export function getEffectiveCollectionBanners(state?: MarketingStoreState): CollectionBanner[] {
  const current = state ?? loadMarketingState();
  return current.collections
    .filter((c) => c.activa)
    .map((c) => ({
      id: c.id,
      eyebrow: c.eyebrow,
      titulo: c.titulo,
      descripcion: c.descripcion,
      ctaLabel: c.ctaLabel,
      imageSlotKey: c.imageSlotKey,
      customImageUrl: c.customImageDataUrl,
      alt_text: c.alt_text,
      category: c.category,
      gender: c.gender,
      ageGroup: c.ageGroup,
      onlyOffers: c.onlyOffers,
      productGroupIds: c.productGroupIds,
    }));
}

export function getEffectiveHeroOffers(state?: MarketingStoreState): CampanaOferta[] {
  const current = state ?? loadMarketingState();
  const activeSlides = current.heroSlides
    .filter((s) => s.activa)
    .sort((a, b) => a.orden - b.orden);

  const mapped: CampanaOferta[] = [];

  activeSlides.forEach((slide, idx) => {
    if (slide.targetType === 'campana') {
      const camp = current.campaigns.find((c) => c.id === slide.targetId);
      if (!camp || !isCampaignCurrentlyActive(camp)) {
        return;
      }
      mapped.push({
        campana_id: idx + 1,
        kicker: slide.eyebrow,
        titulo: slide.titulo,
        portadaTexto: slide.titulo,
        tituloItalico: slide.tituloSecundario,
        subtitulo: slide.subtitulo,
        badgeTexto: `-${camp.porcentajeDescuento}% · Hasta ${camp.fecha_fin}`,
        ctaLabel: slide.ctaLabel,
        categoriaTarget: camp.categoriaTarget,
        generoTarget: 'todos',
        onlyOffersTarget: true,
        collectionTargetId: camp.collectionId,
        precio_regular: 100,
        precio_promocional: 100 - camp.porcentajeDescuento,
        stock_maximo: camp.stock_maximo,
        stock_consumido: camp.stock_consumido,
        fecha_inicio: camp.fecha_inicio,
        fecha_fin: camp.fecha_fin,
        aprobada_dueno: true,
        activa: true,
        imageSlotKey: slide.imageSlotKey,
        customImageUrl: slide.customImageDataUrl,
        alt_text: slide.alt_text,
      });
      return;
    }

    const col = current.collections.find((c) => c.id === slide.targetId && c.activa);
    if (!col) return;

    mapped.push({
      campana_id: idx + 1,
      kicker: slide.eyebrow,
      titulo: slide.titulo,
      portadaTexto: slide.titulo,
      tituloItalico: slide.tituloSecundario,
      subtitulo: slide.subtitulo,
      badgeTexto: col.eyebrow,
      ctaLabel: slide.ctaLabel,
      categoriaTarget: col.category,
      generoTarget: col.gender ?? 'todos',
      rangoEdadTarget: col.ageGroup && col.ageGroup !== 'todas' ? col.ageGroup : undefined,
      collectionTargetId: col.id,
      onlyOffersTarget: Boolean(col.onlyOffers),
      precio_regular: 100,
      precio_promocional: 100,
      stock_maximo: 999,
      stock_consumido: 0,
      fecha_inicio: todayIsoDate(-1),
      fecha_fin: todayIsoDate(30),
      aprobada_dueno: true,
      activa: true,
      imageSlotKey: slide.imageSlotKey,
      customImageUrl: slide.customImageDataUrl,
      alt_text: slide.alt_text,
    });
  });

  return mapped;
}
