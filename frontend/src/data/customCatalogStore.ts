import { ProductGroup, CategorySlug, GenderContext } from '../types/store.types';
import { CATALOGO_PRODUCTOS, CATEGORIAS_TIENDA } from './catalogData';

export const CUSTOM_CATALOG_STORAGE_KEY = 'io_custom_catalog_v1';
const CUSTOM_CATALOG_CHANNEL_NAME = 'io_custom_catalog_ch_v1';

const catalogChannel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(CUSTOM_CATALOG_CHANNEL_NAME)
    : null;

export interface CreateCustomModelPayload {
  nombre: string;
  marca: string;
  categorySlug: Exclude<CategorySlug, 'todas'>;
  genero: GenderContext | 'unisex';
  precioVenta: number;
  stockInicial: number;
  tallas: string[];
  colorNombre: string;
  colorHex: string;
  descripcion?: string;
  creadoPor: string;
}

export function loadCustomProducts(): ProductGroup[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_CATALOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductGroup[]) : [];
  } catch {
    return [];
  }
}

export function getAllCatalogProducts(): ProductGroup[] {
  return [...loadCustomProducts(), ...CATALOGO_PRODUCTOS];
}

export function subscribeCatalogEvents(onUpdate: () => void): () => void {
  const onChannel = () => onUpdate();
  const onStorage = (event: StorageEvent) => {
    if (event.key === CUSTOM_CATALOG_STORAGE_KEY) {
      onUpdate();
    }
  };
  catalogChannel?.addEventListener('message', onChannel);
  window.addEventListener('storage', onStorage);
  return () => {
    catalogChannel?.removeEventListener('message', onChannel);
    window.removeEventListener('storage', onStorage);
  };
}

export function addCustomProductModel(
  payload: CreateCustomModelPayload
): { ok: true; product: ProductGroup } | { ok: false; error: string } {
  const nombre = payload.nombre.trim();
  const marca = payload.marca.trim() || 'I&O Studio';
  const colorNombre = payload.colorNombre.trim() || 'Espresso';
  const colorHex = /^#[0-9a-f]{6}$/i.test(payload.colorHex) ? payload.colorHex : '#261E1B';

  if (nombre.length < 3) {
    return { ok: false, error: 'El nombre del modelo debe tener al menos 3 caracteres.' };
  }
  if (!Number.isFinite(payload.precioVenta) || payload.precioVenta <= 0) {
    return { ok: false, error: 'El precio de venta debe ser mayor a S/ 0.00.' };
  }
  if (!Array.isArray(payload.tallas) || payload.tallas.length === 0) {
    return { ok: false, error: 'Selecciona al menos una talla para generar SKUs.' };
  }
  if (!Number.isFinite(payload.stockInicial) || payload.stockInicial < 0) {
    return { ok: false, error: 'El stock inicial no puede ser negativo.' };
  }

  const existing = loadCustomProducts();
  const catObj =
    CATEGORIAS_TIENDA.find((c) => c.slug === payload.categorySlug) ?? CATEGORIAS_TIENDA[0];
  const stamp = Date.now();
  const prefix = payload.categorySlug.slice(0, 3).toUpperCase();
  const suffix = String(stamp).slice(-4);
  const baseProdId = 9000 + existing.length * 10 + (stamp % 10);
  const stockQty = Math.round(payload.stockInicial);
  const precio = Math.round((payload.precioVenta + Number.EPSILON) * 100) / 100;

  const variants = payload.tallas.map((talla, idx) => {
    const cleanTalla = talla.trim().toUpperCase();
    return {
      producto_id: baseProdId + idx,
      sku: `IO-${prefix}-${cleanTalla}-${suffix}`,
      talla: cleanTalla,
      color: colorNombre,
      colorHex,
      color_textura: 'solido',
      patternId: 'solido' as const,
      alt_text: `${nombre} en color ${colorNombre}, talla ${cleanTalla}`,
      precio_venta: precio,
      stock: stockQty,
      stock_minimo: 5,
      imageSlotKey: catObj.imageSlotKey,
    };
  });

  const product: ProductGroup = {
    groupId: `custom-${stamp}`,
    categoria_id: catObj.categoria_id,
    categorySlug: catObj.slug,
    genero: payload.genero,
    recienLlegado: true,
    badgeLabel: 'Nuevo',
    fraseCorta: `Alta de dirección por ${payload.creadoPor}`,
    nombre,
    descripcion:
      payload.descripcion?.trim() ||
      `${nombre} de ${marca}. Pendiente de fotografía y ficha editorial en Marketing.`,
    marca,
    variants,
  };

  const next = [product, ...existing];
  try {
    window.localStorage.setItem(CUSTOM_CATALOG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return { ok: false, error: 'No se pudo guardar el nuevo modelo en almacenamiento local.' };
  }
  catalogChannel?.postMessage({ type: 'CATALOG_ADDED', groupId: product.groupId });
  return { ok: true, product };
}
