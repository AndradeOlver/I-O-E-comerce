import { NAV_MENU_ITEMS, NavMenuLink } from '../data/navigationData';
import { CategorySlug, GenderFilter } from '../types/store.types';
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
  isMobileMenuOpen: boolean;
  expandedMobileKey: string | null;
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

export function renderHeaderNav({
  selectedGender,
  onlyOffers,
  isHome,
  cartCount,
  wishlistCount,
  isSearchOpen,
  isMobileMenuOpen,
  expandedMobileKey,
  searchQuery,
}: HeaderNavOptions): string {
  const navItemsHtml = NAV_MENU_ITEMS.map((item) => {
    const isActive =
      !isHome &&
      ((item.onlyOffers && onlyOffers) ||
        (!item.onlyOffers && !onlyOffers && item.gender === selectedGender));

    const columnsHtml = item.columns
      .map((col) => {
        const headingHtml = col.category
          ? `<a
               href="#/categoria/${escapeHtml(col.category)}"
               class="io-menu-col-heading d-block text-decoration-none"
               data-action="go-category"
               data-category="${escapeHtml(col.category)}"
               ${col.gender ? `data-filter-gender="${escapeHtml(col.gender)}"` : ''}
               ${col.ageGroup ? `data-filter-age="${escapeHtml(col.ageGroup)}"` : ''}
               ${col.onlyOffers ? `data-filter-offers="true"` : ''}
             >${escapeHtml(col.heading)}</a>`
          : `<div class="io-menu-col-heading">${escapeHtml(col.heading)}</div>`;

        // Caso especial Niños: Edad -> Categoría -> Subcategoría
        if (col.categoryGroups && col.categoryGroups.length > 0) {
          const groupsHtml = col.categoryGroups
            .map(
              (grp) => `
                <div class="io-menu-subcat-group mb-2">
                  <a
                    href="#/categoria/${escapeHtml(grp.category)}"
                    class="io-menu-link fw-semibold"
                    data-action="go-category"
                    data-category="${escapeHtml(grp.category)}"
                    data-filter-gender="${escapeHtml(grp.gender)}"
                    ${grp.ageGroup ? `data-filter-age="${escapeHtml(grp.ageGroup)}"` : ''}
                  >
                    ${escapeHtml(grp.categoryLabel)}
                  </a>
                  <ul class="io-menu-col-list ps-2 border-start border-secondary border-opacity-25 ms-1">
                    ${grp.links
                      .map(
                        (link) => `
                          <li>
                            <a class="io-menu-link" ${renderLinkAttributes(link)}>
                              ${escapeHtml(link.label)}
                            </a>
                          </li>
                        `
                      )
                      .join('')}
                  </ul>
                </div>
              `
            )
            .join('');

          return `
            <div class="io-menu-col">
              ${headingHtml}
              <div class="io-kids-groups-wrap">${groupsHtml}</div>
            </div>
          `;
        }

        return `
          <div class="io-menu-col">
            ${headingHtml}
            <ul class="io-menu-col-list">
              ${col.links
                .map(
                  (link) => `
                    <li>
                      <a class="io-menu-link" ${renderLinkAttributes(link)}>
                        ${escapeHtml(link.label)}
                      </a>
                    </li>
                  `
                )
                .join('')}
            </ul>
          </div>
        `;
      })
      .join('');

    const gridColsClass =
      item.columns.length >= 4
        ? 'io-megamenu-grid io-megamenu-grid--4'
        : 'io-megamenu-grid';

    return `
      <li class="io-nav-item" data-nav-key="${escapeHtml(item.key)}">
        <a
          href="#/categoria/${escapeHtml(item.category)}"
          class="io-nav-trigger ${item.isAccent ? 'is-accent' : ''} ${isActive ? 'is-current' : ''}"
          data-action="go-category"
          data-category="${escapeHtml(item.category)}"
          data-filter-gender="${escapeHtml(item.gender)}"
          ${item.onlyOffers ? 'data-filter-offers="true"' : ''}
        >
          ${item.isAccent ? '<span class="io-nav-indicator-dot" aria-hidden="true"></span>' : ''}
          <span>${escapeHtml(item.label)}</span>
        </a>
        <div class="io-megamenu-panel" data-menu-panel="${escapeHtml(item.key)}">
          <div class="container-xl ${gridColsClass}">
            ${columnsHtml}
          </div>
        </div>
      </li>
    `;
  }).join('');

  const mobileNavItemsHtml = NAV_MENU_ITEMS.map((item) => {
    const isExpanded = expandedMobileKey === item.key;

    const mobileSublinksHtml = item.columns
      .map((col) => {
        if (col.categoryGroups && col.categoryGroups.length > 0) {
          return `
            <div class="px-3 pt-2 pb-1 text-uppercase small opacity-75 fw-semibold">${escapeHtml(col.heading)}</div>
            ${col.categoryGroups
              .map(
                (grp) => `
                  <a
                    href="#/categoria/${escapeHtml(grp.category)}"
                    class="io-mobile-sublink fw-semibold"
                    data-action="go-category"
                    data-category="${escapeHtml(grp.category)}"
                    data-filter-gender="${escapeHtml(grp.gender)}"
                    ${grp.ageGroup ? `data-filter-age="${escapeHtml(grp.ageGroup)}"` : ''}
                  >
                    ${escapeHtml(grp.categoryLabel)}
                  </a>
                  ${grp.links
                    .map(
                      (l) => `
                        <a class="io-mobile-sublink ps-4" ${renderLinkAttributes(l)}>
                          · ${escapeHtml(l.label)}
                        </a>
                      `
                    )
                    .join('')}
                `
              )
              .join('')}
          `;
        }

        return `
          <div class="px-3 pt-2 pb-1 text-uppercase small opacity-75 fw-semibold">${escapeHtml(col.heading)}</div>
          ${col.links
            .map(
              (l) => `
                <a class="io-mobile-sublink" ${renderLinkAttributes(l)}>
                  ${escapeHtml(l.label)}
                </a>
              `
            )
            .join('')}
        `;
      })
      .join('');

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
          <a
            href="#/categoria/${escapeHtml(item.category)}"
            class="io-mobile-sublink fw-bold"
            data-action="go-category"
            data-category="${escapeHtml(item.category)}"
            data-filter-gender="${escapeHtml(item.gender)}"
            ${item.onlyOffers ? 'data-filter-offers="true"' : ''}
          >
            Ver todo en ${escapeHtml(item.label)} →
          </a>
          ${mobileSublinksHtml}
        </div>
      </div>
    `;
  }).join('');

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
