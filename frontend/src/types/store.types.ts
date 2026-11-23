export type TexturePatternId =
  | 'jaspeado'
  | 'raya-fina'
  | 'solido'
  | 'diagonal'
  | 'punteado'
  | 'cuadricula';

export type CategorySlug =
  | 'todas'
  | 'vestidos'
  | 'prendas-superiores'
  | 'pantalones'
  | 'casacas'
  | 'conjuntos'
  | 'calzado'
  | 'accesorios';

export interface Categoria {
  categoria_id: number;
  slug: Exclude<CategorySlug, 'todas'>;
  nombre: string;
  descripcion: string;
  imageSlotKey: string;
}

export interface ProductVariant {
  producto_id: number;
  sku: string;
  talla: string;
  color: string;
  colorHex: string;
  color_textura: string;
  patternId: TexturePatternId;
  alt_text: string;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  imageSlotKey: string;
}

export interface ProductGroup {
  groupId: string;
  categoria_id: number;
  categorySlug: Exclude<CategorySlug, 'todas'>;
  nombre: string;
  descripcion: string;
  marca: string;
  variants: ProductVariant[];
}

export interface CampanaOferta {
  campana_id: number;
  titulo: string;
  portadaTexto?: string;
  subtitulo: string;
  badgeTexto: string;
  categoriaTarget: CategorySlug;
  precio_regular: number;
  precio_promocional: number;
  stock_maximo: number;
  stock_consumido: number;
  fecha_inicio: string;
  fecha_fin: string;
  aprobada_dueno: boolean;
  activa: boolean;
  imageSlotKey: string;
  alt_text: string;
}

export interface CartItem {
  producto_id: number;
  sku: string;
  nombre: string;
  marca: string;
  talla: string;
  color: string;
  color_textura: string;
  precio_venta: number;
  cantidad: number;
  maxStock: number;
}
