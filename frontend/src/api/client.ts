declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000/api';

export type ApiError = { ok: false; ruleCode?: string; error: string; message: string; field?: string };
export type ApiAuthUser = { id: number; rolCodigo: 'TN01' | 'TN02' | 'TN03' | 'TN04' | 'TN05' | 'AN01'; rol_rbac: string; displayName: string; email: string; destination: string; opt_in_marketing?: boolean };
export type ApiAuthResponse = { ok: true; token: string; expiresAt: number; user: ApiAuthUser };
export type PublicCatalogResponse = { ok: true; items: Array<{ producto_id: number; groupId: string; nombre: string; marca: string; categoriaSlug: string; disponible: boolean; variants: Array<{ sku: string; talla: string; color: string; color_textura: string; alt_text: string; precio_venta: number; disponible: boolean; estado_stock: 'disponible' | 'agotado' }> }> };
export type PosAlternativesResponse = { ok: true; sku: string; disponible: boolean; stock: number; alternativas: Array<{ motivo: string; item: { producto_id: number; variante_id: number; groupId: string; sku: string; nombre: string; marca: string; categorySlug: string; talla: string; color: string; colorHex: string; color_textura: string; precio_venta: number; stock: number; stock_minimo: number } }> };
export type PosCreateOrderResponse = { ok: true; order: { pedido_id: number; code: string; total: number; status: 'pendiente_cobro' } };

export const API_TOKEN_STORAGE_KEY = 'io_api_token_v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(sessionStorage.getItem(API_TOKEN_STORAGE_KEY) ? { Authorization: `Bearer ${sessionStorage.getItem(API_TOKEN_STORAGE_KEY)}` } : {}),
      ...init?.headers
    }
  });
  const body = await response.json() as T | ApiError;
  if (!response.ok) throw body as ApiError;
  return body as T;
}

export const ioApi = {
  health: () => request<{ ok: boolean; status: 'healthy' | 'degraded'; database: 'connected' | 'disconnected' }>('/health'),
  publicCatalog: (query = '') => request<PublicCatalogResponse>(`/catalogo/productos${query ? `?${query}` : ''}`),
  posAlternatives: (sku: string) => request<PosAlternativesResponse>(`/pos/inventario/${encodeURIComponent(sku)}/alternativas`),
  posCreateOrder: (payload: { cliente_referencia: string; cliente_doc: string; cliente_razon_social: string; items: Array<{ sku: string; cantidad: number }>; descuento_pct: number; descuento_autorizado: boolean; autorizacion_admin_id?: number; tipo_comprobante: 'Boleta' | 'Factura' }) => request<PosCreateOrderResponse>('/pos/ordenes', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email: string, password: string) => request<ApiAuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => {
    sessionStorage.removeItem(API_TOKEN_STORAGE_KEY);
  }
};
