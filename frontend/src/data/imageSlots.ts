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
  // Logo institucional sobre el header espresso (#261E1B): subir la versión CLARA/marfil.
  // Archivo esperado: frontend/public/img/brand/logo-io.svg (o logo-io.png si no hay SVG).
  // Mientras no exista ninguno, el header muestra el texto simple "I&O".
  'brand-logo': {
    src: '/img/brand/logo-io.svg',
    fallbackSrc: '/img/brand/logo-io.png',
    recommendedPath: 'public/img/brand/logo-io.svg',
    dimensions: 'Alto 40 px · SVG (o PNG 360 x 80 px @2x)',
    slotLabel: 'Logo',
  },

  // Carrusel de ofertas (2 imágenes: PC panorámica + Celular)
  'oferta-01': {
    src: '',
    mobileSrc: '/img/ofertas/oferta-01.WebP',
    recommendedPath: 'public/img/ofertas/oferta-01-pc.WebP',
    mobileRecommendedPath: 'public/img/ofertas/oferta-01.WebP',
    dimensions: '1920 x 600 px (PC)',
    slotLabel: 'Oferta 1 (PC)',
  },
  'oferta-02': {
    src: '',
    mobileSrc: '/img/ofertas/oferta-02.WebP',
    recommendedPath: 'public/img/ofertas/oferta-02-pc.WebP',
    mobileRecommendedPath: 'public/img/ofertas/oferta-02.WebP',
    dimensions: '1920 x 600 px (PC)',
    slotLabel: 'Oferta 2 (PC)',
  },
  'oferta-03': {
    src: '',
    mobileSrc: '/img/ofertas/oferta-03.WebP',
    recommendedPath: 'public/img/ofertas/oferta-03-pc.WebP',
    mobileRecommendedPath: 'public/img/ofertas/oferta-03.WebP',
    dimensions: '1920 x 600 px (PC)',
    slotLabel: 'Oferta 3 (PC)',
  },

  // Categorías
  'cat-vestidos': {
    src: '/img/categorias/vestidos.WebP',
    recommendedPath: 'public/img/categorias/vestidos.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Vestidos',
  },
  'cat-prendas-superiores': {
    src: '/img/categorias/prendas-superiores.WebP',
    recommendedPath: 'public/img/categorias/prendas-superiores.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Prendas Superiores',
  },
  'cat-pantalones': {
    src: '/img/categorias/pantalones.WebP',
    recommendedPath: 'public/img/categorias/pantalones.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Pantalones',
  },
  'cat-casacas': {
    src: '/img/categorias/casacas.WebP',
    recommendedPath: 'public/img/categorias/casacas.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Casacas',
  },
  'cat-conjuntos': {
    src: '/img/categorias/conjuntos.WebP',
    recommendedPath: 'public/img/categorias/conjuntos.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Conjuntos',
  },
  'cat-calzado': {
    src: '/img/categorias/calzado.WebP',
    recommendedPath: 'public/img/categorias/calzado.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Calzado',
  },
  'cat-accesorios': {
    src: '/img/categorias/accesorios.WebP',
    recommendedPath: 'public/img/categorias/accesorios.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Accesorios',
  },
  'cat-sports': {
    src: '/img/categorias/sports.WebP',
    recommendedPath: 'public/img/categorias/sports.WebP',
    dimensions: '400 x 300 px',
    slotLabel: 'Sports',
  },

  // Banners de colecciones por estilo o público
  'col-hombre': {
    src: '/img/colecciones/coleccion-hombre.WebP',
    recommendedPath: 'public/img/colecciones/coleccion-hombre.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Colección Hombre',
  },
  'col-mujer': {
    src: '/img/colecciones/coleccion-mujer.WebP',
    recommendedPath: 'public/img/colecciones/coleccion-mujer.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Colección Mujer',
  },
  'col-ninos': {
    src: '/img/colecciones/coleccion-ninos.WebP',
    recommendedPath: 'public/img/colecciones/coleccion-ninos.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Moda Infantil',
  },
  'col-sports': {
    src: '/img/colecciones/coleccion-sports.WebP',
    recommendedPath: 'public/img/colecciones/coleccion-sports.WebP',
    dimensions: '960 x 640 px',
    slotLabel: 'Esenciales Sports',
  },

  // Productos de vitrina (fallback limpio hasta subir fotos individuales en public/img/productos/)
  'prod-polo-pima': {
    src: '/img/categorias/prendas-superiores.WebP',
    recommendedPath: 'public/img/productos/polo-oversize-pima.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Polo Oversize Pima',
  },
  'prod-jean-cargo': {
    src: '/img/categorias/pantalones.WebP',
    recommendedPath: 'public/img/productos/jean-cargo-urbano.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Jean Cargo Urbano',
  },
  'prod-vestido-midi': {
    src: '/img/categorias/vestidos.WebP',
    recommendedPath: 'public/img/productos/vestido-midi-satinado.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Vestido Midi Satinado',
  },
  'prod-casaca-bomber': {
    src: '/img/categorias/casacas.WebP',
    recommendedPath: 'public/img/productos/casaca-bomber-urbana.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Casaca Bomber Urbana',
  },
  'prod-conjunto-urbano': {
    src: '/img/categorias/conjuntos.WebP',
    recommendedPath: 'public/img/productos/conjunto-urbano-lino.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Conjunto Urbano Lino',
  },
  'prod-polo-dryfit': {
    src: '/img/categorias/sports.WebP',
    recommendedPath: 'public/img/productos/polo-dryfit-training.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Polo Dry-Fit Training',
  },
  'prod-zapatilla-urbana': {
    src: '/img/categorias/calzado.WebP',
    recommendedPath: 'public/img/productos/zapatilla-cuero-urbana.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Zapatilla Urbana',
  },
  'prod-set-infantil': {
    src: '/img/categorias/conjuntos.WebP',
    recommendedPath: 'public/img/productos/set-infantil-algodon.WebP',
    dimensions: '600 x 800 px',
    slotLabel: 'Set Infantil Algodón',
  },
};
