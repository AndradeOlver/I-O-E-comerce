import {
  CATEGORIAS_TIENDA,
  KIDS_AGE_LABELS,
  OFERTAS_CARRUSEL,
  SUBCATEGORIAS_TIENDA,
} from './catalogData';
import {
  CategorySlug,
  GenderFilter,
  KidsAgeFilter,
  KidsAgeGroup,
} from '../types/store.types';

export interface NavMenuLink {
  label: string;
  priceBadge?: string;
  category: CategorySlug;
  subcategory?: string;
  gender?: GenderFilter;
  ageGroup?: KidsAgeFilter;
  onlyOffers?: boolean;
  sizeFilter?: string;
}

export interface NavCategoryNode {
  key: string;
  label: string;
  viewAllLink?: NavMenuLink;
  sublinks: NavMenuLink[];
}

export interface NavAgeNode {
  ageKey: KidsAgeGroup;
  label: string;
  viewAllLink: NavMenuLink;
  categories: NavCategoryNode[];
}

export interface NavMenuItem {
  key: string;
  label: string;
  viewAllLabel: string;
  category: CategorySlug;
  gender: GenderFilter;
  onlyOffers?: boolean;
  isAccent?: boolean;
  /** Lista plana directa sin subcategorías (usado en Ofertas) */
  directLinks?: NavMenuLink[];
  /** Nivel 1 -> Nivel 2 para Hombre y Mujer (Categoría -> Subcategoría) */
  categories?: NavCategoryNode[];
  /** Nivel 1 -> Nivel 2 -> Nivel 3 exclusivo para Niños (Edad -> Categoría -> Subcategoría) */
  ageNodes?: NavAgeNode[];
}

function buildGenderCategoryNodes(gender: 'hombre' | 'mujer'): NavCategoryNode[] {
  const nodes: NavCategoryNode[] = [];

  for (const cat of CATEGORIAS_TIENDA) {
    const subcats = SUBCATEGORIAS_TIENDA.filter(
      (s) =>
        s.categorySlug === cat.slug &&
        (gender === 'hombre' ? s.aplicaHombre : s.aplicaMujer)
    );

    if (subcats.length === 0) continue;

    nodes.push({
      key: cat.slug,
      label: cat.nombre,
      viewAllLink: {
        label: `Ver todo en ${cat.nombre}`,
        category: cat.slug,
        gender,
      },
      sublinks: subcats.map((sub) => ({
        label: sub.nombre,
        category: cat.slug,
        subcategory: sub.slug,
        gender,
      })),
    });
  }

  return nodes;
}

function buildKidsAgeNodes(): NavAgeNode[] {
  const ageGroups: KidsAgeGroup[] = ['bebes', 'infantil', 'junior'];

  return ageGroups.map((age) => {
    const categories: NavCategoryNode[] = [];

    for (const cat of CATEGORIAS_TIENDA) {
      const subcats = SUBCATEGORIAS_TIENDA.filter((s) => {
        if (s.categorySlug !== cat.slug || !s.aplicaNinos) return false;
        if (age === 'bebes' && s.slug === 'vestidos-midi') return false;
        return true;
      });

      if (subcats.length === 0) continue;

      categories.push({
        key: cat.slug,
        label: cat.nombre,
        viewAllLink: {
          label: `Ver todo en ${cat.nombre}`,
          category: cat.slug,
          gender: 'ninos',
          ageGroup: age,
        },
        sublinks: subcats.map((sub) => ({
          label: sub.nombre,
          category: cat.slug,
          subcategory: sub.slug,
          gender: 'ninos',
          ageGroup: age,
        })),
      });
    }

    return {
      ageKey: age,
      label: KIDS_AGE_LABELS[age],
      viewAllLink: {
        label: `Ver todo en ${KIDS_AGE_LABELS[age]}`,
        category: 'todas',
        gender: 'ninos',
        ageGroup: age,
      },
      categories,
    };
  });
}

function buildActiveOfferLinks(): NavMenuLink[] {
  return OFERTAS_CARRUSEL.filter(
    (o) => o.activa && o.aprobada_dueno && o.stock_consumido < o.stock_maximo
  ).map((o) => ({
    label: o.titulo,
    priceBadge: `S/ ${o.precio_promocional.toFixed(2)}`,
    category: o.categoriaTarget,
    gender: o.generoTarget ?? 'todos',
    ageGroup: o.rangoEdadTarget,
    onlyOffers: true,
  }));
}

export const NAV_MENU_ITEMS: NavMenuItem[] = [
  {
    key: 'hombre',
    label: 'HOMBRE',
    viewAllLabel: 'Ver todo Hombre',
    category: 'todas',
    gender: 'hombre',
    categories: buildGenderCategoryNodes('hombre'),
  },
  {
    key: 'mujer',
    label: 'MUJER',
    viewAllLabel: 'Ver todo Mujer',
    category: 'todas',
    gender: 'mujer',
    categories: buildGenderCategoryNodes('mujer'),
  },
  {
    key: 'ninos',
    label: 'NIÑOS',
    viewAllLabel: 'Ver todo Niños',
    category: 'todas',
    gender: 'ninos',
    ageNodes: buildKidsAgeNodes(),
  },
  {
    key: 'ofertas',
    label: 'OFERTAS',
    viewAllLabel: 'Ver todas las Ofertas',
    category: 'todas',
    gender: 'todos',
    onlyOffers: true,
    isAccent: true,
    directLinks: buildActiveOfferLinks(),
  },
];
