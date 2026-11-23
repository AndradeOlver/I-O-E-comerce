import { CategorySlug } from '../types/store.types';

export interface NavMenuLink {
  label: string;
  category: CategorySlug;
  sizeFilter?: string;
}

export interface NavMenuColumn {
  heading: string;
  links: NavMenuLink[];
}

export interface NavMenuItem {
  key: string;
  label: string;
  category: CategorySlug;
  layout: 'mega' | 'dropdown';
  isAccent?: boolean;
  columns: NavMenuColumn[];
}

const STANDARD_SIZES: NavMenuLink[] = [
  { label: 'Small (S)', category: 'todas', sizeFilter: 'S' },
  { label: 'Medium (M)', category: 'todas', sizeFilter: 'M' },
  { label: 'Large (L)', category: 'todas', sizeFilter: 'L' },
];

const STANDARD_COLORS = (cat: CategorySlug): NavMenuLink[] => [
  { label: 'Azul Marino', category: cat },
  { label: 'Beige Arena', category: cat },
  { label: 'Blanco', category: cat },
  { label: 'Negro Carbón', category: cat },
  { label: 'Rojo Vino', category: cat },
  { label: 'Verde Olivo', category: cat },
];

export const NAV_MENU_ITEMS: NavMenuItem[] = [
  {
    key: 'vestidos',
    label: 'VESTIDOS',
    category: 'vestidos',
    layout: 'mega',
    columns: [
      {
        heading: 'TODO VESTIDOS',
        links: [
          { label: 'Nueva Colección', category: 'vestidos' },
          { label: 'Destacados', category: 'vestidos' },
          { label: 'Vestidos Midi', category: 'vestidos' },
          { label: 'Vestidos de Noche', category: 'vestidos' },
        ],
      },
      {
        heading: 'POR TALLAS',
        links: STANDARD_SIZES.map((s) => ({ ...s, category: 'vestidos' })),
      },
      {
        heading: 'POR COLOR',
        links: STANDARD_COLORS('vestidos'),
      },
    ],
  },
  {
    key: 'prendas-superiores',
    label: 'PRENDAS SUPERIORES',
    category: 'prendas-superiores',
    layout: 'mega',
    columns: [
      {
        heading: 'TODO PRENDAS SUPERIORES',
        links: [
          { label: 'Nueva Colección', category: 'prendas-superiores' },
          { label: 'Destacados', category: 'prendas-superiores' },
          { label: 'Polos Pima', category: 'prendas-superiores' },
          { label: 'Camisas & Blusas', category: 'prendas-superiores' },
        ],
      },
      {
        heading: 'POR TALLAS',
        links: STANDARD_SIZES.map((s) => ({ ...s, category: 'prendas-superiores' })),
      },
      {
        heading: 'POR COLOR',
        links: STANDARD_COLORS('prendas-superiores'),
      },
    ],
  },
  {
    key: 'pantalones',
    label: 'PANTALONES',
    category: 'pantalones',
    layout: 'mega',
    columns: [
      {
        heading: 'TODO PANTALONES',
        links: [
          { label: 'Nueva Colección', category: 'pantalones' },
          { label: 'Destacados', category: 'pantalones' },
          { label: 'Jeans Cargo', category: 'pantalones' },
          { label: 'Joggers & Rectos', category: 'pantalones' },
        ],
      },
      {
        heading: 'POR TALLAS',
        links: [
          { label: 'Talla 28', category: 'pantalones', sizeFilter: '28' },
          { label: 'Talla 30', category: 'pantalones', sizeFilter: '30' },
          { label: 'Talla 32', category: 'pantalones', sizeFilter: '32' },
          { label: 'Talla 34', category: 'pantalones', sizeFilter: '34' },
        ],
      },
      {
        heading: 'POR COLOR',
        links: STANDARD_COLORS('pantalones'),
      },
    ],
  },
  {
    key: 'casacas',
    label: 'CASACAS',
    category: 'casacas',
    layout: 'mega',
    columns: [
      {
        heading: 'TODO CASACAS',
        links: [
          { label: 'Nueva Colección', category: 'casacas' },
          { label: 'Destacados', category: 'casacas' },
          { label: 'Bomber Urbanas', category: 'casacas' },
          { label: 'Denim & Abrigos', category: 'casacas' },
        ],
      },
      {
        heading: 'POR TALLAS',
        links: STANDARD_SIZES.map((s) => ({ ...s, category: 'casacas' })),
      },
      {
        heading: 'POR COLOR',
        links: STANDARD_COLORS('casacas'),
      },
    ],
  },
  {
    key: 'conjuntos',
    label: 'CONJUNTOS',
    category: 'conjuntos',
    layout: 'dropdown',
    columns: [
      {
        heading: 'CONJUNTOS',
        links: [
          { label: 'Nueva Colección', category: 'conjuntos' },
          { label: 'Destacados', category: 'conjuntos' },
          { label: 'Sets Urbanos', category: 'conjuntos' },
          { label: 'Sets Casuales', category: 'conjuntos' },
        ],
      },
    ],
  },
  {
    key: 'calzado',
    label: 'CALZADO',
    category: 'calzado',
    layout: 'dropdown',
    columns: [
      {
        heading: 'CALZADO',
        links: [
          { label: 'Nueva Colección', category: 'calzado' },
          { label: 'Destacados', category: 'calzado' },
          { label: 'Zapatillas', category: 'calzado' },
          { label: 'Botines', category: 'calzado' },
          { label: 'Casuales', category: 'calzado' },
        ],
      },
    ],
  },
  {
    key: 'accesorios',
    label: 'ACCESORIOS',
    category: 'accesorios',
    layout: 'dropdown',
    columns: [
      {
        heading: 'ACCESORIOS',
        links: [
          { label: 'Nueva Colección', category: 'accesorios' },
          { label: 'Destacados', category: 'accesorios' },
          { label: 'Gorras', category: 'accesorios' },
          { label: 'Correas', category: 'accesorios' },
          { label: 'Complementos', category: 'accesorios' },
        ],
      },
    ],
  },
  {
    key: 'ofertas',
    label: 'OFERTAS',
    category: 'todas',
    layout: 'mega',
    isAccent: true,
    columns: [
      {
        heading: 'TODO OFERTAS',
        links: [
          { label: 'Todas las Ofertas', category: 'todas' },
          { label: 'Vestidos en Oferta', category: 'vestidos' },
          { label: 'Prendas Superiores', category: 'prendas-superiores' },
          { label: 'Casacas & Calzado', category: 'casacas' },
        ],
      },
      {
        heading: 'POR TALLA',
        links: STANDARD_SIZES,
      },
      {
        heading: 'POR PRECIO',
        links: [
          { label: 'Menos de S/ 200', category: 'todas' },
          { label: 'Menos de S/ 100', category: 'todas' },
          { label: 'Menos de S/ 60', category: 'todas' },
        ],
      },
    ],
  },
];
