import { CategorySlug, GenderFilter, KidsAgeFilter } from '../types/store.types';

export type MarketingTab =
  | 'recien_llegados'
  | 'portada_hero'
  | 'colecciones'
  | 'campanas'
  | 'catalogo';

export type CampaignStatus =
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'aprobada'
  | 'rechazada'
  | 'pausada'
  | 'agotada';

export type MarketingUiMode = 'operacion' | 'practica';

export interface ProductEditorialOverride {
  groupId: string;
  nombre?: string;
  descripcion?: string;
  fraseCorta?: string;
  badgeLabel?: string;
  customImageDataUrl?: string;
  alt_text?: string;
  completadoEditorial: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface MarketingCollection {
  id: string;
  eyebrow: string;
  titulo: string;
  descripcion: string;
  ctaLabel: string;
  imageSlotKey: string;
  customImageDataUrl?: string;
  alt_text: string;
  category: CategorySlug;
  gender?: GenderFilter;
  ageGroup?: KidsAgeFilter;
  onlyOffers?: boolean;
  productGroupIds: string[];
  activa: boolean;
  updatedAt: string;
}

export interface MarketingHeroSlide {
  id: string;
  eyebrow: string;
  titulo: string;
  tituloSecundario?: string;
  subtitulo: string;
  ctaLabel: string;
  imageSlotKey: string;
  customImageDataUrl?: string;
  alt_text: string;
  targetType: 'coleccion' | 'campana';
  targetId: string;
  activa: boolean;
  orden: number;
  updatedAt: string;
}

export interface MarketingCampaign {
  id: string;
  titulo: string;
  descripcion: string;
  porcentajeDescuento: number;
  fecha_inicio: string;
  fecha_fin: string;
  stock_maximo: number;
  stock_consumido: number;
  scopeType: 'coleccion' | 'categoria' | 'productos';
  collectionId?: string;
  categoriaTarget: CategorySlug;
  productGroupIds: string[];
  aplicaEnTiendaFisica: boolean;
  incluyeCapturaOptIn: boolean;
  optInVerificado: boolean;
  status: CampaignStatus;
  motivoRechazo?: string;
  createdBy: string;
  approvedBy?: string;
  updatedAt: string;
}

export interface MarketingAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface MarketingStoreState {
  version: 1;
  editorialOverrides: Record<string, ProductEditorialOverride>;
  collections: MarketingCollection[];
  heroSlides: MarketingHeroSlide[];
  campaigns: MarketingCampaign[];
  auditLog: MarketingAuditEntry[];
}

export interface MarketingConsoleApi {
  estado: () => {
    pendientesEditorial: number;
    heroActivos: number;
    coleccionesActivas: number;
    campanasActivas: number;
    campanasPendientes: number;
    uiMode: MarketingUiMode;
  };
  modo: (nextMode: MarketingUiMode) => MarketingUiMode;
  aprobarCampana: (campaignId: string, adminName?: string) => { ok: boolean; message: string };
  rechazarCampana: (campaignId: string, motivo?: string, adminName?: string) => { ok: boolean; message: string };
  consumirStockCampana: (campaignId: string, units?: number) => { ok: boolean; message: string };
  simularRecienLlegado: (groupId?: string) => { ok: boolean; message: string };
  reiniciar: () => void;
}
