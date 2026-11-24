import {
  NAV_MENU_ITEMS,
  NavCategoryNode,
  NavMenuItem,
  NavMenuLink,
} from '../data/navigationData';
import { CategorySlug, GenderFilter, KidsAgeGroup } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';
import { renderBrandMark } from './brand';

interface HeaderNavOptions {
  selectedCategory: CategorySlug;
  selectedGender: GenderFilter;
  onlyOffers: boolean;
  isHome: boolean;
  cartCount: number;
  wishlistCount: number;
  isSearchOpen: boolean;
  openNavKey: string | null;
  activeMenuAge: KidsAgeGroup | null;
  activeMenuCategory: string | null;
  isMobileMenuOpen: boolean;
  expandedMobileKey: string | null;
  mobileAgeKey: KidsAgeGroup | null;
  mobileCategoryKey: string | null;
  searchQuery: string;
}

function renderBrandLogo(): string {
  return `
    <a
      href="#/"
      class="io-brand-logo-link"
      data-action="go-home"
      aria-label="Inicio I&O"
    >
      ${renderBrandMark()}
    </a>
  `;
}

function renderLinkAttributes(link: NavMenuLink): string {
  const attrs = [
    `href="#/categoria/${escapeHtml(link.category)}"`,
    `data-action="go-category"`,
    `data-category="${escapeHtml(link.category)}"`,
  ];
  if (link.gender) attrs.push(`data-filter-gender="${escapeHtml(link.gender)}"`);
  if (link.ageGroup) attrs.push(`data-filter-age="${escapeHtml(link.ageGroup)}"`);
  if (link.subcategory) attrs.push(`data-filter-subcategory="${escapeHtml(link.subcategory)}"`);
  if (link.onlyOffers) attrs.push(`data-filter-offers="true"`);
  if (link.sizeFilter) attrs.push(`data-filter-size="${escapeHtml(link.sizeFilter)}"`);
  return attrs.join(' ');
}

function renderSubcategoryColumn(activeCat: NavCategoryNode, contextLabel?: string): string {
  const heading = contextLabel
    ? `${activeCat.label} · ${contextLabel}`
    : activeCat.label;

  return `
    <div class="io-cascade-col io-cascade-col--entered" aria-label="Subcategorías de ${escapeHtml(activeCat.label)}">
      <div class="io-menu-col-heading">${escapeHtml(heading)}</div>
      <ul class="io-menu-col-list">
        ${
          activeCat.viewAllLink
            ? `
              <li class="mb-1">
                <a class="io-menu-link io-menu-link--all" ${renderLinkAttributes(activeCat.viewAllLink)}>
                  <span>${escapeHtml(activeCat.viewAllLink.label)}</span>
                  <span aria-hidden="true">→</span>
                </a>
              </li>
            `
            : ''
        }
        ${activeCat.sublinks
          .map(
            (sub) => `
              <li>
                <a class="io-menu-link" ${renderLinkAttributes(sub)}>
                  ${escapeHtml(sub.label)}
                </a>
              </li>
            `
          )
          .join('')}
      </ul>
    </div>
  `;
}

function renderDesktopCascadePanel(
  item: NavMenuItem,
  isOpen: boolean,
  activeMenuAge: KidsAgeGroup | null,
  activeMenuCategory: string | null
): string {
  const viewAllRootAttrs = renderLinkAttributes({
    label: item.viewAllLabel,
    category: item.category,
    gender: item.gender,
    onlyOffers: item.onlyOffers,
  });

  // Flujo Niños: Nivel 1 (Edad) -> clic -> Nivel 2 (Categoría) -> clic -> Nivel 3 (Subcategoría)
  if (item.ageNodes && item.ageNodes.length > 0) {
    const selectedAgeNode =
      (isOpen && activeMenuAge
        ? item.ageNodes.find((a) => a.ageKey === activeMenuAge)
        : null) ?? null;

    const selectedCatNode =
      (selectedAgeNode && activeMenuCategory
        ? selectedAgeNode.categories.find((c) => c.key === activeMenuCategory)
        : null) ?? null;

    const ageColHtml = `
      <div class="io-cascade-col">
        <div class="io-menu-col-heading d-flex justify-content-between align-items-center gap-3">
          <span>1. Selecciona Edad</span>
          <a class="io-cascade-all-inline" ${viewAllRootAttrs}>${escapeHtml(item.viewAllLabel)} →</a>
        </div>
        <ul class="io-cascade-list" role="list">
          ${item.ageNodes
            .map((ageNode) => {
              const isAgeSelected = selectedAgeNode?.ageKey === ageNode.ageKey;
              return `
                <li>
                  <button
                    type="button"
                    id="menu-age-${escapeHtml(item.key)}-${escapeHtml(ageNode.ageKey)}"
                    class="io-cascade-step-btn ${isAgeSelected ? 'is-selected' : ''}"
                    data-action="select-menu-age"
                    data-nav-key="${escapeHtml(item.key)}"
                    data-age-key="${escapeHtml(ageNode.ageKey)}"
                    aria-expanded="${isAgeSelected}"
                  >
                    <span>${escapeHtml(ageNode.label)}</span>
                    ${icons.chevronRight(16)}
                  </button>
                </li>
              `;
            })
            .join('')}
        </ul>
      </div>
    `;

    const catColHtml = selectedAgeNode
      ? `
        <div class="io-cascade-col io-cascade-col--entered" aria-label="Categorías para ${escapeHtml(selectedAgeNode.label)}">
          <div class="io-menu-col-heading d-flex justify-content-between align-items-center gap-3">
            <span>2. Categorías · ${escapeHtml(selectedAgeNode.label)}</span>
            <a class="io-cascade-all-inline" ${renderLinkAttributes(selectedAgeNode.viewAllLink)}>Ver todo →</a>
          </div>
          <ul class="io-cascade-list" role="list">
            ${selectedAgeNode.categories
              .map((catNode) => {
                const isCatSelected = selectedCatNode?.key === catNode.key;
                return `
                  <li>
                    <button
                      type="button"
                      id="menu-cat-${escapeHtml(item.key)}-${escapeHtml(catNode.key)}"
                      class="io-cascade-step-btn ${isCatSelected ? 'is-selected' : ''}"
                      data-action="select-menu-cat"
                      data-nav-key="${escapeHtml(item.key)}"
                      data-cat-key="${escapeHtml(catNode.key)}"
                      aria-expanded="${isCatSelected}"
                    >
                      <span>${escapeHtml(catNode.label)}</span>
                      ${icons.chevronRight(16)}
                    </button>
                  </li>
                `;
              })
              .join('')}
          </ul>
        </div>
      `
      : '';

    const subcatColHtml =
      selectedAgeNode && selectedCatNode
        ? renderSubcategoryColumn(selectedCatNode, selectedAgeNode.label)
        : '';

    return `
      <div class="io-cascade-stage io-cascade-stage--kids">
        ${ageColHtml}
        ${catColHtml}
        ${subcatColHtml}
      </div>
    `;
  }

  // Flujo Hombre, Mujer y Ofertas: Nivel 1 (Categoría) -> clic -> Nivel 2 (Subcategoría)
  const categories = item.categories ?? [];
  const selectedCatNode =
    (isOpen && activeMenuCategory
      ? categories.find((c) => c.key === activeMenuCategory)
      : null) ?? null;

  const catColHtml = `
    <div class="io-cascade-col">
      <div class="io-menu-col-heading d-flex justify-content-between align-items-center gap-3">
        <span>${item.onlyOffers ? 'Filtrar Ofertas' : `Categorías · ${item.label}`}</span>
        <a class="io-cascade-all-inline" ${viewAllRootAttrs}>${escapeHtml(item.viewAllLabel)} →</a>
      </div>
      <ul class="io-cascade-list ${categories.length > 5 ? 'io-cascade-list--two-col' : ''}" role="list">
        ${categories
          .map((catNode) => {
            const isCatSelected = selectedCatNode?.key === catNode.key;
            return `
              <li>
                <button
                  type="button"
                  id="menu-cat-${escapeHtml(item.key)}-${escapeHtml(catNode.key)}"
                  class="io-cascade-step-btn ${isCatSelected ? 'is-selected' : ''}"
                  data-action="select-menu-cat"
                  data-nav-key="${escapeHtml(item.key)}"
                  data-cat-key="${escapeHtml(catNode.key)}"
                  aria-expanded="${isCatSelected}"
                >
                  <span>${escapeHtml(catNode.label)}</span>
                  ${icons.chevronRight(16)}
                </button>
              </li>
            `;
          })
          .join('')}
      </ul>
    </div>
  `;

  const subcatColHtml = selectedCatNode
    ? renderSubcategoryColumn(selectedCatNode)
    : '';

  return `
    <div class="io-cascade-stage">
      ${catColHtml}
      ${subcatColHtml}
    </div>
  `;
}

function renderMobileDrawerItem(
  item: NavMenuItem,
  expandedMobileKey: string | null,
  mobileAgeKey: KidsAgeGroup | null,
  mobileCategoryKey: string | null
): string {
  const isExpanded = expandedMobileKey === item.key;
  const viewAllRootAttrs = renderLinkAttributes({
    label: item.viewAllLabel,
    category: item.category,
    gender: item.gender,
    onlyOffers: item.onlyOffers,
  });

  let innerLevelsHtml = '';

  if (isExpanded) {
    if (item.ageNodes && item.ageNodes.length > 0) {
      // Móvil Niños: Edad -> Categoría -> Subcategoría
      innerLevelsHtml = item.ageNodes
        .map((ageNode) => {
          const isAgeOpen = mobileAgeKey === ageNode.ageKey;
          return `
            <div class="io-mobile-nested-group">
              <button
                type="button"
                class="io-mobile-step-btn ${isAgeOpen ? 'is-expanded' : ''}"
                data-action="toggle-mobile-age"
                data-age-key="${escapeHtml(ageNode.ageKey)}"
                aria-expanded="${isAgeOpen}"
              >
                <span>${escapeHtml(ageNode.label)}</span>
                <span class="io-mobile-chevron" aria-hidden="true">${icons.chevronDown(16)}</span>
              </button>
              ${
                isAgeOpen
                  ? `
                    <div class="io-mobile-nested-panel">
                      <a class="io-mobile-sublink io-mobile-sublink--all" ${renderLinkAttributes(ageNode.viewAllLink)}>
                        ${escapeHtml(ageNode.viewAllLink.label)} →
                      </a>
                      ${ageNode.categories
                        .map((catNode) => {
                          const isCatOpen = mobileCategoryKey === catNode.key;
                          return `
                            <div class="io-mobile-nested-group">
                              <button
                                type="button"
                                class="io-mobile-step-btn io-mobile-step-btn--l2 ${isCatOpen ? 'is-expanded' : ''}"
                                data-action="toggle-mobile-subcat"
                                data-cat-key="${escapeHtml(catNode.key)}"
                                aria-expanded="${isCatOpen}"
                              >
                                <span>${escapeHtml(catNode.label)}</span>
                                <span class="io-mobile-chevron" aria-hidden="true">${icons.chevronDown(15)}</span>
                              </button>
                              ${
                                isCatOpen
                                  ? `
                                    <div class="io-mobile-nested-panel ps-3">
                                      ${
                                        catNode.viewAllLink
                                          ? `<a class="io-mobile-sublink io-mobile-sublink--all" ${renderLinkAttributes(catNode.viewAllLink)}>${escapeHtml(catNode.viewAllLink.label)} →</a>`
                                          : ''
                                      }
                                      ${catNode.sublinks
                                        .map(
                                          (sub) =>
                                            `<a class="io-mobile-sublink" ${renderLinkAttributes(sub)}>${escapeHtml(sub.label)}</a>`
                                        )
                                        .join('')}
                                    </div>
                                  `
                                  : ''
                              }
                            </div>
                          `;
                        })
                        .join('')}
                    </div>
                  `
                  : ''
              }
            </div>
          `;
        })
        .join('');
    } else {
      // Móvil Hombre, Mujer y Ofertas: Categoría -> Subcategoría
      innerLevelsHtml = (item.categories ?? [])
        .map((catNode) => {
          const isCatOpen = mobileCategoryKey === catNode.key;
          return `
            <div class="io-mobile-nested-group">
              <button
                type="button"
                class="io-mobile-step-btn ${isCatOpen ? 'is-expanded' : ''}"
                data-action="toggle-mobile-subcat"
                data-cat-key="${escapeHtml(catNode.key)}"
                aria-expanded="${isCatOpen}"
              >
                <span>${escapeHtml(catNode.label)}</span>
                <span class="io-mobile-chevron" aria-hidden="true">${icons.chevronDown(16)}</span>
              </button>
              ${
                isCatOpen
                  ? `
                    <div class="io-mobile-nested-panel">
                      ${
                        catNode.viewAllLink
                          ? `<a class="io-mobile-sublink io-mobile-sublink--all" ${renderLinkAttributes(catNode.viewAllLink)}>${escapeHtml(catNode.viewAllLink.label)} →</a>`
                          : ''
                      }
                      ${catNode.sublinks
                        .map(
                          (sub) =>
                            `<a class="io-mobile-sublink" ${renderLinkAttributes(sub)}>${escapeHtml(sub.label)}</a>`
                        )
                        .join('')}
                    </div>
                  `
                  : ''
              }
            </div>
          `;
        })
        .join('');
    }
  }

  return `
    <div class="border-bottom border-secondary border-opacity-25">
      <button
        type="button"
        class="io-mobile-drawer-link ${item.isAccent ? 'is-accent' : ''} ${isExpanded ? 'is-expanded' : ''}"
        data-action="toggle-mobile-cat"
        data-nav-key="${escapeHtml(item.key)}"
        aria-expanded="${isExpanded}"
      >
        <span class="d-inline-flex align-items-center gap-2">
          ${item.isAccent ? '<span class="io-nav-indicator-dot" aria-hidden="true"></span>' : ''}
          <span>${escapeHtml(item.label)}</span>
        </span>
        <span class="io-mobile-chevron" aria-hidden="true">
          ${icons.chevronDown(18)}
        </span>
      </button>

      <div class="io-mobile-subpanel ${isExpanded ? 'is-open' : ''}">
        <a class="io-mobile-sublink io-mobile-sublink--all" ${viewAllRootAttrs}>
          ${escapeHtml(item.viewAllLabel)} →
        </a>
        ${innerLevelsHtml}
      </div>
    </div>
  `;
}

export function renderHeaderNav({
  selectedGender,
  onlyOffers,
  isHome,
  cartCount,
  wishlistCount,
  isSearchOpen,
  openNavKey,
  activeMenuAge,
  activeMenuCategory,
  isMobileMenuOpen,
  expandedMobileKey,
  mobileAgeKey,
  mobileCategoryKey,
  searchQuery,
}: HeaderNavOptions): string {
  const navItemsHtml = NAV_MENU_ITEMS.map((item) => {
    const isOpen = openNavKey === item.key;
    const isActive =
      !isHome &&
      ((item.onlyOffers && onlyOffers) ||
        (!item.onlyOffers && !onlyOffers && item.gender === selectedGender));

    return `
      <li class="io-nav-item ${isOpen ? 'is-open' : ''}" data-nav-key="${escapeHtml(item.key)}">
        <button
          type="button"
          id="nav-trigger-${escapeHtml(item.key)}"
          class="io-nav-trigger ${item.isAccent ? 'is-accent' : ''} ${isActive ? 'is-current' : ''}"
          data-action="toggle-desktop-nav"
          data-nav-key="${escapeHtml(item.key)}"
          aria-expanded="${isOpen}"
          aria-controls="menu-panel-${escapeHtml(item.key)}"
        >
          ${item.isAccent ? '<span class="io-nav-indicator-dot" aria-hidden="true"></span>' : ''}
          <span>${escapeHtml(item.label)}</span>
          <span class="io-nav-trigger-chevron" aria-hidden="true">${icons.chevronDown(14)}</span>
        </button>
        <div
          id="menu-panel-${escapeHtml(item.key)}"
          class="io-megamenu-panel"
          data-menu-panel="${escapeHtml(item.key)}"
          role="region"
          aria-label="Submenú ${escapeHtml(item.label)}"
        >
          <div class="container-xl">
            ${renderDesktopCascadePanel(item, isOpen, activeMenuAge, activeMenuCategory)}
          </div>
        </div>
      </li>
    `;
  }).join('');

  const mobileNavItemsHtml = NAV_MENU_ITEMS.map((item) =>
    renderMobileDrawerItem(item, expandedMobileKey, mobileAgeKey, mobileCategoryKey)
  ).join('');

  const bagBadge = `<span class="io-bag-badge ${cartCount === 0 ? 'is-empty' : ''}" aria-hidden="true">${cartCount}</span>`;

  return `
    <div class="io-top-strip">
      <p>
        ${icons.truck(16)}
        <span><strong>Envío GRATIS</strong> en compras mayores a S/ 150</span>
      </p>
    </div>

    <header class="io-header" id="io-site-header" role="banner">
      <div class="container-xl io-header-inner">
        <div class="io-header-left">
          <button
            type="button"
            class="io-icon-action-btn d-lg-none"
            data-action="toggle-mobile-menu"
            aria-label="Abrir menú de navegación"
            aria-expanded="${isMobileMenuOpen}"
          >
            ${icons.menu(22)}
          </button>
          ${renderBrandLogo()}
        </div>

        <nav class="io-header-center d-none d-lg-flex" aria-label="Navegación principal por público y ofertas">
          <ul class="io-nav-list">
            ${navItemsHtml}
          </ul>
        </nav>

        <div class="io-header-right">
          <button
            type="button"
            class="io-icon-action-btn"
            data-action="toggle-search"
            aria-label="Buscar productos"
            aria-expanded="${isSearchOpen}"
          >
            ${icons.search(20)}
          </button>

          <button
            type="button"
            class="io-icon-action-btn"
            data-action="open-wishlist"
            aria-label="Prendas deseadas (${wishlistCount})"
          >
            ${icons.heart(20)}
            ${wishlistCount > 0 ? `<span class="io-bag-badge" aria-hidden="true">${wishlistCount}</span>` : ''}
          </button>

          <button
            type="button"
            class="io-icon-action-btn d-none d-md-inline-flex"
            data-action="open-login"
            aria-label="Iniciar sesión o mi cuenta"
          >
            ${icons.user(20)}
          </button>

          <button
            type="button"
            class="io-icon-action-btn"
            data-action="open-cart"
            aria-label="Bolsa de compras (${cartCount} prendas)"
          >
            ${icons.bag(20)}
            ${bagBadge}
          </button>
        </div>
      </div>

      ${
        isSearchOpen
          ? `
            <div class="io-search-overlay py-2 px-3" role="search">
              <div class="container-xl d-flex align-items-center gap-2">
                <label for="buscador-catalogo" class="visually-hidden">Buscar en catálogo</label>
                <input
                  id="buscador-catalogo"
                  type="search"
                  class="form-control"
                  placeholder="Buscar vestido, pantalón, casaca, sports..."
                  value="${escapeHtml(searchQuery)}"
                  autocomplete="off"
                />
                <button
                  type="button"
                  class="io-btn-outline"
                  data-action="toggle-search"
                  aria-label="Cerrar búsqueda"
                >
                  ${icons.x(18)}
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          `
          : ''
      }
    </header>

    ${
      isMobileMenuOpen
        ? `
          <div class="io-drawer-backdrop" data-action="close-mobile-menu" aria-hidden="true"></div>
          <nav
            class="io-mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú móvil de categorías"
          >
            <div class="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary border-opacity-25">
              ${renderBrandMark()}
              <button
                type="button"
                class="io-icon-action-btn"
                data-action="close-mobile-menu"
                aria-label="Cerrar menú"
              >
                ${icons.x(22)}
              </button>
            </div>
            <div class="overflow-auto flex-grow-1 p-2">
              ${mobileNavItemsHtml}
            </div>
            <div class="p-3 border-top border-secondary border-opacity-25">
              <button
                type="button"
                class="io-btn-primary w-100"
                data-action="open-login"
              >
                ${icons.user(18)}
                <span>Iniciar sesión</span>
              </button>
            </div>
          </nav>
        `
        : ''
    }
  `;
}
