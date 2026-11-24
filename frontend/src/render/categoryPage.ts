import { KIDS_AGE_LABELS, SUBCATEGORIAS_TIENDA } from '../data/catalogData';
import {
  Categoria,
  CategorySlug,
  GenderFilter,
  KidsAgeFilter,
  KidsAgeGroup,
  ProductGroup,
} from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderProductCatalog } from './productCatalog';

interface CategoryPageOptions {
  categories: Categoria[];
  currentCategory: Categoria | null;
  selectedCategory: CategorySlug;
  selectedSubcategory: string;
  selectedGender: GenderFilter;
  selectedAgeGroup: KidsAgeFilter;
  onlyOffers: boolean;
  products: ProductGroup[];
  totalCatalogCount: number;
  selectedSize: string;
  sortBy: 'relevancia' | 'precio-asc' | 'precio-desc';
  availableSizes: string[];
  selectedVariants: Record<string, number>;
  colorblindMode: boolean;
}

const GENDER_LABELS: Record<GenderFilter, string> = {
  todos: 'Todos',
  hombre: 'Hombre',
  mujer: 'Mujer',
  ninos: 'Niños',
};

export function renderCategoryPage({
  categories,
  currentCategory,
  selectedCategory,
  selectedSubcategory,
  selectedGender,
  selectedAgeGroup,
  onlyOffers,
  products,
  totalCatalogCount,
  selectedSize,
  sortBy,
  availableSizes,
  selectedVariants,
  colorblindMode,
}: CategoryPageOptions): string {
  const eyebrowParts = ['Tienda'];
  if (onlyOffers) eyebrowParts.push('Ofertas');
  if (selectedGender !== 'todos') eyebrowParts.push(GENDER_LABELS[selectedGender]);
  if (selectedGender === 'ninos' && selectedAgeGroup !== 'todas') {
    eyebrowParts.push(KIDS_AGE_LABELS[selectedAgeGroup]);
  }

  const pageTitle = currentCategory
    ? currentCategory.nombre
    : onlyOffers
      ? 'Ofertas y Campañas Activas'
      : selectedGender !== 'todos'
        ? `Colección ${GENDER_LABELS[selectedGender]}`
        : 'Todas las categorías';

  // Excluir categorías sin subcategorías aplicables al género (ej. Vestidos en Hombre)
  const visibleCategories = categories.filter((cat) => {
    if (selectedGender === 'hombre' && cat.slug === 'vestidos') return false;
    return true;
  });

  const genderChipsHtml = (['todos', 'hombre', 'mujer', 'ninos'] as GenderFilter[])
    .map(
      (g) => `
        <button
          type="button"
          class="io-cat-chip ${selectedGender === g && !onlyOffers ? 'is-active' : ''}"
          data-action="filter-gender"
          data-gender="${g}"
        >
          ${escapeHtml(GENDER_LABELS[g])}
        </button>
      `
    )
    .concat(
      `
        <button
          type="button"
          class="io-cat-chip ${onlyOffers ? 'is-active' : ''}"
          data-action="toggle-offers-filter"
        >
          Ofertas Activas
        </button>
      `
    )
    .join('');

  const ageChipsHtml =
    selectedGender === 'ninos'
      ? `
        <nav aria-label="Filtrar por edad en Niños" class="d-flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            class="io-cat-chip ${selectedAgeGroup === 'todas' ? 'is-active' : ''}"
            data-action="filter-age"
            data-age="todas"
          >
            Todas las edades
          </button>
          ${(['bebes', 'infantil', 'junior'] as KidsAgeGroup[])
            .map(
              (age) => `
                <button
                  type="button"
                  class="io-cat-chip ${selectedAgeGroup === age ? 'is-active' : ''}"
                  data-action="filter-age"
                  data-age="${age}"
                >
                  ${escapeHtml(KIDS_AGE_LABELS[age])}
                </button>
              `
            )
            .join('')}
        </nav>
      `
      : '';

  const categoryChipsHtml = [
    `<a href="#/categoria/todas" class="io-cat-chip ${selectedCategory === 'todas' ? 'is-active' : ''}" data-action="go-category" data-category="todas" data-filter-gender="${escapeHtml(selectedGender)}" ${onlyOffers ? 'data-filter-offers="true"' : ''}>Todas</a>`,
    ...visibleCategories.map(
      (cat) => `
        <a
          href="#/categoria/${escapeHtml(cat.slug)}"
          class="io-cat-chip ${selectedCategory === cat.slug ? 'is-active' : ''}"
          data-action="go-category"
          data-category="${escapeHtml(cat.slug)}"
          data-filter-gender="${escapeHtml(selectedGender)}"
          ${selectedGender === 'ninos' && selectedAgeGroup !== 'todas' ? `data-filter-age="${escapeHtml(selectedAgeGroup)}"` : ''}
          ${onlyOffers ? 'data-filter-offers="true"' : ''}
        >
          ${escapeHtml(cat.nombre)}
        </a>
      `
    ),
  ].join('');

  const availableSubcats =
    selectedCategory !== 'todas'
      ? SUBCATEGORIAS_TIENDA.filter((sub) => {
          if (sub.categorySlug !== selectedCategory) return false;
          if (selectedGender === 'hombre' && !sub.aplicaHombre) return false;
          if (selectedGender === 'mujer' && !sub.aplicaMujer) return false;
          if (selectedGender === 'ninos' && !sub.aplicaNinos) return false;
          return true;
        })
      : [];

  const subcatChipsHtml =
    availableSubcats.length > 0
      ? `
        <nav aria-label="Filtrar por subcategoría" class="d-flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            class="io-cat-chip ${selectedSubcategory === 'todas' ? 'is-active' : ''}"
            data-action="filter-subcategory"
            data-subcategory="todas"
          >
            Todas las subcategorías
          </button>
          ${availableSubcats
            .map(
              (sub) => `
                <button
                  type="button"
                  class="io-cat-chip ${selectedSubcategory === sub.slug ? 'is-active' : ''}"
                  data-action="filter-subcategory"
                  data-subcategory="${escapeHtml(sub.slug)}"
                >
                  ${escapeHtml(sub.nombre)}
                </button>
              `
            )
            .join('')}
        </nav>
      `
      : '';

  return `
    <div class="container-xl py-4">
      <div class="mb-3">
        <a
          href="#/"
          class="io-btn-outline text-decoration-none"
          data-action="go-home"
        >
          ${icons.chevronLeft(18)}
          <span>Volver al inicio</span>
        </a>
      </div>

      <header class="io-section-head flex-column align-items-start">
        <div>
          <span class="io-eyebrow">${escapeHtml(eyebrowParts.join(' · '))}</span>
          <h1 class="io-display io-section-title">${escapeHtml(pageTitle)}</h1>
        </div>

        <nav aria-label="Contexto de público y ofertas" class="d-flex flex-wrap gap-2">
          ${genderChipsHtml}
        </nav>
        ${ageChipsHtml}

        <nav aria-label="Cambiar de categoría" class="d-flex flex-wrap gap-2 mt-2">
          ${categoryChipsHtml}
        </nav>
        ${subcatChipsHtml}
      </header>

      ${renderProductCatalog(
        products,
        totalCatalogCount,
        selectedCategory,
        selectedSize,
        sortBy,
        availableSizes,
        selectedVariants,
        colorblindMode
      )}
    </div>
  `;
}
