export interface ImageSlotConfig {
  /** Ruta principal de la imagen (en ofertas corresponde a PC panorámica) */
  src: string;
  /** Ruta opcional para celular (< 768px) en <picture> */
  mobileSrc?: string;
  /** Ruta sugerida dentro de frontend/public/ */
  recommendedPath: string;
  /** Ruta sugerida para versión celular */
  mobileRecommendedPath?: string;
  dimensions: string;
  slotLabel: string;
}

export const IMAGE_SLOTS: Record<string, ImageSlotConfig> = {
  // Logo institucional en el header azul
  'brand-logo': {
    src: '',
    recommendedPath: 'public/img/brand/logo-io.png',
    dimensions: '180 x 48 px',
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
};
