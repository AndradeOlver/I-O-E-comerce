import { CATEGORIAS_TIENDA, KIDS_AGE_LABELS, SUBCATEGORIAS_TIENDA } from './catalogData';
import {
  CategorySlug,
  GenderFilter,
  KidsAgeFilter,
  KidsAgeGroup,
} from '../types/store.types';

export interface NavMenuLink {
  label: string;
  category: CategorySlug;
  subcategory?: string;
  gender?: GenderFilter;
  ageGroup?: KidsAgeFilter;
  onlyOffers?: boolean;
  sizeFilter?: string;
}

export interface NavCategoryGroup {
  categoryLabel: string;
  category: CategorySlug;
  gender: GenderFilter;
  ageGroup?: KidsAgeFilter;
  links: NavMenuLink[];
}

export interface NavMenuColumn {
  heading: string;
  category?: CategorySlug;
  gender?: GenderFilter;
  ageGroup?: KidsAgeFilter;
  onlyOffers?: boolean;
  links: NavMenuLink[];
  /** Usado en Niños para respetar la jerarquía Edad -> Categoría -> Subcategoría */
  categoryGroups?: NavCategoryGroup[];
}

export interface NavMenuItem {
  key: string;
  label: string;
  category: CategorySlug;
  gender: GenderFilter;
  onlyOffers?: boolean;
  layout: 'mega' | 'dropdown';
  isAccent?: boolean;
  columns: NavMenuColumn[];
}

function buildGenderColumns(gender: 'hombre' | 'mujer'): NavMenuColumn[] {
  const columns: NavMenuColumn[] = [];

  for (const cat of CATEGORIAS_TIENDA) {
    const subcats = SUBCATEGORIAS_TIENDA.filter(
      (s) =>
        s.categorySlug === cat.slug &&
        (gender === 'hombre' ? s.aplicaHombre : s.aplicaMujer)
    );

    if (subcats.length === 0) continue;

    columns.push({
      heading: cat.nombre,
      category: cat.slug,
      gender,
      links: [
        {
          label: `Todo ${cat.nombre}`,
          category: cat.slug,
          gender,
        },
        ...subcats.map((sub) => ({
          label: sub.nombre,
          category: cat.slug,
          subcategory: sub.slug,
          gender,
        })),
      ],
    });
  }

  return columns;
}

function buildKidsColumns(): NavMenuColumn[] {
  const ageGroups: KidsAgeGroup[] = ['bebes', 'infantil', 'junior'];

  return ageGroups.map((age) => {
    const categoryGroups: NavCategoryGroup[] = [];

    for (const cat of CATEGORIAS_TIENDA) {
      // Para bebés (0-24m) omitimos subcategorías exclusivas de adultos/noche
      const subcats = SUBCATEGORIAS_TIENDA.filter((s) => {
        if (s.categorySlug !== cat.slug || !s.aplicaNinos) return false;
        if (age === 'bebes' && s.slug === 'vestidos-midi') return false;
        return true;
      });

      if (subcats.length === 0) continue;

      categoryGroups.push({
        categoryLabel: cat.nombre,
        category: cat.slug,
        gender: 'ninos',
        ageGroup: age,
        links: subcats.map((sub) => ({
          label: sub.nombre,
          category: cat.slug,
          subcategory: sub.slug,
          gender: 'ninos',
          ageGroup: age,
        })),
      });
    }

    return {
      heading: KIDS_AGE_LABELS[age],
      category: 'todas',
      gender: 'ninos',
      ageGroup: age,
      links: [],
      categoryGroups,
    };
  });
}

export const NAV_MENU_ITEMS: NavMenuItem[] = [
  {
    key: 'hombre',
    label: 'HOMBRE',
    category: 'todas',
    gender: 'hombre',
    layout: 'mega',
    columns: buildGenderColumns('hombre'),
  },
  {
    key: 'mujer',
    label: 'MUJER',
    category: 'todas',
    gender: 'mujer',
    layout: 'mega',
    columns: buildGenderColumns('mujer'),
  },
  {
    key: 'ninos',
    label: 'NIÑOS',
    category: 'todas',
    gender: 'ninos',
    layout: 'mega',
    columns: buildKidsColumns(),
  },
  {
    key: 'ofertas',
    label: 'OFERTAS',
    category: 'todas',
    gender: 'todos',
    onlyOffers: true,
    layout: 'mega',
    isAccent: true,
    columns: [
      {
        heading: 'POR GÉNERO Y EDAD',
        links: [
          { label: 'Todas las Ofertas', category: 'todas', gender: 'todos', onlyOffers: true },
          { label: 'Ofertas Hombre', category: 'todas', gender: 'hombre', onlyOffers: true },
          { label: 'Ofertas Mujer', category: 'todas', gender: 'mujer', onlyOffers: true },
          { label: 'Ofertas Niños · Bebés', category: 'todas', gender: 'ninos', ageGroup: 'bebes', onlyOffers: true },
          { label: 'Ofertas Niños · Infantil', category: 'todas', gender: 'ninos', ageGroup: 'infantil', onlyOffers: true },
          { label: 'Ofertas Niños · Junior', category: 'todas', gender: 'ninos', ageGroup: 'junior', onlyOffers: true },
        ],
      },
      {
        heading: 'POR CATEGORÍA',
        links: CATEGORIAS_TIENDA.map((cat) => ({
          label: `${cat.nombre} en Oferta`,
          category: cat.slug,
          gender: 'todos',
          onlyOffers: true,
        })),
      },
      {
        heading: 'POR TALLA',
        links: [
          { label: 'Small (S)', category: 'todas', gender: 'todos', onlyOffers: true, sizeFilter: 'S' },
          { label: 'Medium (M)', category: 'todas', gender: 'todos', onlyOffers: true, sizeFilter: 'M' },
          { label: 'Large (L)', category: 'todas', gender: 'todos', onlyOffers: true, sizeFilter: 'L' },
        ],
      },
    ],
  },
];
