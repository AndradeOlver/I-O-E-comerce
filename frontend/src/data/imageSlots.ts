export interface ImageSlotConfig {
  /** Ruta principal de la imagen (en ofertas corresponde a PC panorámica) */
  src: string;
  /** Ruta opcional para celular (< 768px) en <picture> */
  mobileSrc?: string;
  /** Ruta sugerida dentro de frontend/public/ */
  recommendedPath: string;
  /** Ruta sugerida para versión celular */
  mobileRecommendedPath?: string;
  /** Alternativa si `src` no existe (p. ej. PNG cuando no hay SVG). Solo el logo la usa. */
  fallbackSrc?: string;
  dimensions: string;
  slotLabel: string;
}

export const IMAGE_SLOTS: Record<string, ImageSlotConfig> = {
  // Logo institucional sobre el header espresso (#261E1B) y respaldo en tarjetas de producto
  'brand-logo': {
    src: '/img/brand/logo-io.svg',
    fallbackSrc: '/img/brand/logo-io.png',
    recommendedPath: 'public/img/brand/logo-io.svg',
    dimensions: 'Alto 40 px · SVG (o PNG 360 x 80 px @2x)',
    slotLabel: 'Logo',
  },

  // Carrusel hero editorial (conecta las fotografías reales disponibles en public/img/ofertas/)
  'oferta-01': {
    src: '/img/ofertas/oferta-01.WebP',
    mobileSrc: '/img/ofertas/oferta-01.WebP',
    recommendedPath: 'public/img/ofertas/oferta-01.WebP',
    mobileRecommendedPath: 'public/img/ofertas/oferta-01.WebP',
    dimensions: '1920 x 800 px',
    slotLabel: 'Cápsula Algodón Pima',
  },
  'oferta-02': {
    src: '/img/ofertas/oferta-02.WebP',
    mobileSrc: '/img/ofertas/oferta-02.WebP',
    recommendedPath: 'public/img/ofertas/oferta-02.WebP',
    mobileRecommendedPath: 'public/img/ofertas/oferta-02.WebP',
    dimensions: '1920 x 800 px',
    slotLabel: 'Vestidos de Autor',
  },
  'oferta-03': {
    src: '/img/ofertas/oferta-03.WebP',
    mobileSrc: '/img/ofertas/oferta-03.WebP',
    recommendedPath: 'public/img/ofertas/oferta-03.WebP',
    mobileRecommendedPath: 'public/img/ofertas/oferta-03.WebP',
    dimensions: '1920 x 800 px',
    slotLabel: 'Bombers & Sneakers',
  },
  'oferta-04': {
    src: '/img/ofertas/oferta-04.png',
    mobileSrc: '/img/ofertas/oferta-04.png',
    recommendedPath: 'public/img/ofertas/oferta-04.png',
    mobileRecommendedPath: 'public/img/ofertas/oferta-04.png',
    dimensions: '1920 x 800 px',
    slotLabel: 'Archivo Streetwear',
  },

  // Categorías
  'cat-vestidos': {
    src: '/img/categorias/vestidos.WebP',
    recommendedPath: 'public/img/categorias/vestidos.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Vestidos de Autor',
  },
  'cat-prendas-superiores': {
    src: '/img/categorias/prendas-superiores.WebP',
    recommendedPath: 'public/img/categorias/prendas-superiores.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Tops & Esenciales Pima',
  },
  'cat-pantalones': {
    src: '/img/categorias/pantalones.WebP',
    recommendedPath: 'public/img/categorias/pantalones.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Denim & Cortes Cargo',
  },
  'cat-casacas': {
    src: '/img/categorias/casacas.WebP',
    recommendedPath: 'public/img/categorias/casacas.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Bombers & Capas Urbanas',
  },
  'cat-conjuntos': {
    src: '/img/categorias/conjuntos.WebP',
    recommendedPath: 'public/img/categorias/conjuntos.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Total Looks & Sets',
  },
  'cat-calzado': {
    src: '/img/categorias/calzado.WebP',
    recommendedPath: 'public/img/categorias/calzado.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Sneakers & Pisada Urbana',
  },
  'cat-accesorios': {
    src: '/img/categorias/accesorios.WebP',
    recommendedPath: 'public/img/categorias/accesorios.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Acentos & Marroquinería',
  },
  'cat-sports': {
    src: '/img/categorias/sports.WebP',
    recommendedPath: 'public/img/categorias/sports.WebP',
    dimensions: '400 x 500 px',
    slotLabel: 'Active & Movimiento',
  },

  // Banners de colecciones por estilo o público
  'col-hombre': {
    src: '',
    recommendedPath: 'public/img/colecciones/coleccion-hombre.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Colección Hombre',
  },
  'col-mujer': {
    src: '',
    recommendedPath: 'public/img/colecciones/coleccion-mujer.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Colección Mujer',
  },
  'col-ninos': {
    src: '',
    recommendedPath: 'public/img/colecciones/coleccion-ninos.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Moda Infantil',
  },
  'col-sports': {
    src: '',
    recommendedPath: 'public/img/colecciones/coleccion-sports.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Active & Movimiento',
  },

  // Productos de vitrina (cuando src está vacío, la tarjeta muestra automáticamente el logo de I&O)
  'prod-polo-pima': {
    src: '',
    recommendedPath: 'public/img/productos/polo-oversize-pima.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Polo Oversize Pima',
  },
  'prod-jean-cargo': {
    src: '',
    recommendedPath: 'public/img/productos/jean-cargo-urbano.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Jean Cargo Urbano',
  },
  'prod-vestido-midi': {
    src: '',
    recommendedPath: 'public/img/productos/vestido-midi-satinado.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Vestido Midi Satinado',
  },
  'prod-casaca-bomber': {
    src: '',
    recommendedPath: 'public/img/productos/casaca-bomber-urbana.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Casaca Bomber Urbana',
  },
  'prod-conjunto-urbano': {
    src: '',
    recommendedPath: 'public/img/productos/conjunto-urbano-lino.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Conjunto Urbano Lino',
  },
  'prod-polo-dryfit': {
    src: '',
    recommendedPath: 'public/img/productos/polo-dryfit-training.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Polo Dry-Fit Training',
  },
  'prod-zapatilla-urbana': {
    src: '',
    recommendedPath: 'public/img/productos/zapatilla-cuero-urbana.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Zapatilla Urbana',
  },
  'prod-set-infantil': {
    src: '',
    recommendedPath: 'public/img/productos/set-infantil-algodon.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Set Infantil Algodón',
  },
};
