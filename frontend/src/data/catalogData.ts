import {
  CampanaOferta,
  Categoria,
  KidsAgeGroup,
  ProductGroup,
  Subcategoria,
} from '../types/store.types';

export const KIDS_AGE_LABELS: Record<KidsAgeGroup, string> = {
  bebes: 'Bebés (0 - 24 meses)',
  infantil: 'Infantil (2 - 7 años)',
  junior: 'Junior (8 - 14 años)',
};

export const CATEGORIAS_TIENDA: Categoria[] = [
  {
    categoria_id: 1,
    slug: 'prendas-superiores',
    nombre: 'Prendas Superiores',
    descripcion: 'Polos, camisas, blusas, poleras y tops de temporada',
    imageSlotKey: 'cat-prendas-superiores',
  },
  {
    categoria_id: 2,
    slug: 'pantalones',
    nombre: 'Pantalones',
    descripcion: 'Jeans cargo, joggers, pantalones de vestir y shorts',
    imageSlotKey: 'cat-pantalones',
  },
  {
    categoria_id: 3,
    slug: 'vestidos',
    nombre: 'Vestidos',
    descripcion: 'Vestidos casuales, midi y de noche',
    imageSlotKey: 'cat-vestidos',
  },
  {
    categoria_id: 4,
    slug: 'casacas',
    nombre: 'Casacas',
    descripcion: 'Bomber urbanas, denim, abrigos, cortavientos y chalecos',
    imageSlotKey: 'cat-casacas',
  },
  {
    categoria_id: 5,
    slug: 'conjuntos',
    nombre: 'Conjuntos',
    descripcion: 'Sets coordinados urbanos, casuales e infantiles',
    imageSlotKey: 'cat-conjuntos',
  },
  {
    categoria_id: 6,
    slug: 'accesorios',
    nombre: 'Accesorios',
    descripcion: 'Gorras, correas, mochilas y complementos',
    imageSlotKey: 'cat-accesorios',
  },
  {
    categoria_id: 7,
    slug: 'calzado',
    nombre: 'Calzado',
    descripcion: 'Zapatillas urbanas, botines, calzado casual y sandalias',
    imageSlotKey: 'cat-calzado',
  },
  {
    categoria_id: 8,
    slug: 'sports',
    nombre: 'Sports',
    descripcion: 'Ropa técnica deportiva, training, running y activewear',
    imageSlotKey: 'cat-sports',
  },
];

export const SUBCATEGORIAS_TIENDA: Subcategoria[] = [
  // 1. Prendas Superiores
  { subcategoria_id: 101, categoria_id: 1, categorySlug: 'prendas-superiores', slug: 'polos-pima', nombre: 'Polos Pima', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 102, categoria_id: 1, categorySlug: 'prendas-superiores', slug: 'camisas-blusas', nombre: 'Camisas & Blusas', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 103, categoria_id: 1, categorySlug: 'prendas-superiores', slug: 'poleras-hoodies', nombre: 'Poleras & Hoodies', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 104, categoria_id: 1, categorySlug: 'prendas-superiores', slug: 'tops-bodies', nombre: 'Tops & Bodies', aplicaHombre: false, aplicaMujer: true, aplicaNinos: true },

  // 2. Pantalones
  { subcategoria_id: 201, categoria_id: 2, categorySlug: 'pantalones', slug: 'jeans-cargo', nombre: 'Jeans Cargo', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 202, categoria_id: 2, categorySlug: 'pantalones', slug: 'joggers-buzos', nombre: 'Joggers & Buzos', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 203, categoria_id: 2, categorySlug: 'pantalones', slug: 'pantalones-vestir', nombre: 'Pantalones de Vestir', aplicaHombre: true, aplicaMujer: true, aplicaNinos: false },
  { subcategoria_id: 204, categoria_id: 2, categorySlug: 'pantalones', slug: 'shorts-bermudas', nombre: 'Shorts & Bermudas', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },

  // 3. Vestidos (excluye Hombre)
  { subcategoria_id: 301, categoria_id: 3, categorySlug: 'vestidos', slug: 'vestidos-midi', nombre: 'Vestidos Midi', aplicaHombre: false, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 302, categoria_id: 3, categorySlug: 'vestidos', slug: 'vestidos-noche', nombre: 'Vestidos de Noche', aplicaHombre: false, aplicaMujer: true, aplicaNinos: false },
  { subcategoria_id: 303, categoria_id: 3, categorySlug: 'vestidos', slug: 'vestidos-casuales', nombre: 'Vestidos Casuales', aplicaHombre: false, aplicaMujer: true, aplicaNinos: true },

  // 4. Casacas
  { subcategoria_id: 401, categoria_id: 4, categorySlug: 'casacas', slug: 'bomber-urbanas', nombre: 'Bomber Urbanas', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 402, categoria_id: 4, categorySlug: 'casacas', slug: 'denim-abrigos', nombre: 'Denim & Abrigos', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 403, categoria_id: 4, categorySlug: 'casacas', slug: 'cortavientos', nombre: 'Cortavientos', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 404, categoria_id: 4, categorySlug: 'casacas', slug: 'chalecos', nombre: 'Chalecos', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },

  // 5. Conjuntos
  { subcategoria_id: 501, categoria_id: 5, categorySlug: 'conjuntos', slug: 'sets-urbanos', nombre: 'Sets Urbanos', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 502, categoria_id: 5, categorySlug: 'conjuntos', slug: 'sets-casuales', nombre: 'Sets Casuales', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 503, categoria_id: 5, categorySlug: 'conjuntos', slug: 'sets-bebe-infantil', nombre: 'Sets Bebé & Infantil', aplicaHombre: false, aplicaMujer: false, aplicaNinos: true },

  // 6. Accesorios
  { subcategoria_id: 601, categoria_id: 6, categorySlug: 'accesorios', slug: 'gorras-sombreros', nombre: 'Gorras & Sombreros', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 602, categoria_id: 6, categorySlug: 'accesorios', slug: 'correas-billeteras', nombre: 'Correas & Billeteras', aplicaHombre: true, aplicaMujer: true, aplicaNinos: false },
  { subcategoria_id: 603, categoria_id: 6, categorySlug: 'accesorios', slug: 'mochilas-bolsos', nombre: 'Mochilas & Bolsos', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 604, categoria_id: 6, categorySlug: 'accesorios', slug: 'medias-complementos', nombre: 'Medias & Complementos', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },

  // 7. Calzado
  { subcategoria_id: 701, categoria_id: 7, categorySlug: 'calzado', slug: 'zapatillas-urbanas', nombre: 'Zapatillas Urbanas', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 702, categoria_id: 7, categorySlug: 'calzado', slug: 'botines-botas', nombre: 'Botines & Botas', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 703, categoria_id: 7, categorySlug: 'calzado', slug: 'calzado-casual', nombre: 'Calzado Casual', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 704, categoria_id: 7, categorySlug: 'calzado', slug: 'sandalias', nombre: 'Sandalias', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },

  // 8. Sports
  { subcategoria_id: 801, categoria_id: 8, categorySlug: 'sports', slug: 'polos-dry-fit', nombre: 'Polos Dry-Fit', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 802, categoria_id: 8, categorySlug: 'sports', slug: 'leggings-shorts', nombre: 'Leggings & Shorts', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 803, categoria_id: 8, categorySlug: 'sports', slug: 'buzos-training', nombre: 'Buzos Training', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
  { subcategoria_id: 804, categoria_id: 8, categorySlug: 'sports', slug: 'zapatillas-running', nombre: 'Zapatillas Running', aplicaHombre: true, aplicaMujer: true, aplicaNinos: true },
];

export const OFERTAS_CARRUSEL: CampanaOferta[] = [
  {
    campana_id: 1,
    titulo: 'Polos Oversize Algodón Pima',
    portadaTexto: 'Ofertas · Polos Pima',
    subtitulo: '',
    badgeTexto: '',
    categoriaTarget: 'prendas-superiores',
    generoTarget: 'hombre',
    precio_regular: 79.9,
    precio_promocional: 59.9,
    stock_maximo: 30,
    stock_consumido: 12,
    fecha_inicio: '2026-11-20',
    fecha_fin: '2026-11-30',
    aprobada_dueno: true,
    activa: true,
    imageSlotKey: 'oferta-01',
    alt_text: 'Oferta en polos oversize de algodón pima',
  },
  {
    campana_id: 2,
    titulo: 'Vestidos de Temporada',
    portadaTexto: 'Ofertas · Vestidos de Temporada',
    subtitulo: '',
    badgeTexto: '',
    categoriaTarget: 'vestidos',
    generoTarget: 'mujer',
    precio_regular: 179.9,
    precio_promocional: 149.9,
    stock_maximo: 15,
    stock_consumido: 12,
    fecha_inicio: '2026-11-21',
    fecha_fin: '2026-12-02',
    aprobada_dueno: true,
    activa: true,
    imageSlotKey: 'oferta-02',
    alt_text: 'Oferta en vestidos de temporada',
  },
  {
    campana_id: 3,
    titulo: 'Casacas y Calzado Urbano',
    portadaTexto: 'Ofertas · Casacas y Calzado',
    subtitulo: '',
    badgeTexto: '',
    categoriaTarget: 'casacas',
    generoTarget: 'todos',
    precio_regular: 199.9,
    precio_promocional: 169.9,
    stock_maximo: 20,
    stock_consumido: 6,
    fecha_inicio: '2026-11-22',
    fecha_fin: '2026-12-05',
    aprobada_dueno: true,
    activa: true,
    imageSlotKey: 'oferta-03',
    alt_text: 'Oferta en casacas y calzado urbano',
  },
];

// Catálogo vacío hasta conectar con la base de datos SQL Server
export const CATALOGO_PRODUCTOS: ProductGroup[] = [];
