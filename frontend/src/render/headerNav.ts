import { IMAGE_SLOTS } from '../data/imageSlots';
import { NAV_MENU_ITEMS } from '../data/navigationData';
import { CategorySlug } from '../types/store.types';
import { escapeHtml, icons } from '../utils/icons';

interface HeaderNavOptions {
  selectedCategory: CategorySlug;
  isHome: boolean;
  cartCount: number;
  wishlistCount: number;
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;
  expandedMobileKey: string | null;
  searchQuery: string;
}

function renderBrandLogo(): string {
  const logoSlot = IMAGE_SLOTS['brand-logo'];
  const src = logoSlot?.src?.trim() ?? '';

  if (src) {
    return `
      <a href="#/" class="io-brand-logo-link" data-action="go-home" aria-label="Inicio I&O">
        <img src="${escapeHtml(src)}" alt="I&O" class="io-brand-logo-img" data-logo-img />
        <span class="io-logo-placeholder d-none" data-logo-fallback>
          ${icons.imagePlus(18)}
          <span>Logo</span>
        </span>
      </a>
    `;
  }

  return `
    <a href="#/" class="io-brand-logo-link" data-action="go-home" aria-label="Inicio I&O">
      <span class="io-logo-placeholder" title="${escapeHtml(logoSlot?.recommendedPath ?? 'public/img/brand/logo-io.png')}">
        ${icons.imagePlus(18)}
        <span>Logo</span>
      </span>
    </a>
  `;
}

export function renderHeaderNav({
  selectedCategory,
  isHome,
  cartCount,
  wishlistCount,
  isSearchOpen,
  isMobileMenuOpen,
  expandedMobileKey,
  searchQuery,
}: HeaderNavOptions): string {
  const navItemsHtml = NAV_MENU_ITEMS.map((item) => {
    const isActive = !isHome && item.category === selectedCategory && !item.isAccent;
    const columnsHtml = item.columns
      .map(
        (col) => `
          <div class="io-menu-col">
            <div class="io-menu-col-heading">${escapeHtml(col.heading)}</div>
            <ul class="io-menu-col-list">
              ${col.links
                .map(
                  (link) => `
                    <li>
                      <a
                        href="#/categoria/${escapeHtml(link.category)}"
                        class="io-menu-link"
                        data-action="go-category"
                        data-category="${escapeHtml(link.category)}"
                        ${link.sizeFilter ? `data-filter-size="${escapeHtml(link.sizeFilter)}"` : ''}
                      >
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

    const panelClass =
      item.layout === 'mega' ? 'io-megamenu-panel' : 'io-dropdown-panel';

    return `
      <li class="io-nav-item ${item.layout === 'dropdown' ? 'is-dropdown' : ''}" data-nav-key="${escapeHtml(item.key)}">
        <a
          href="#/categoria/${escapeHtml(item.category)}"
          class="io-nav-trigger ${item.isAccent ? 'is-accent' : ''} ${isActive ? 'is-current' : ''}"
          data-action="go-category"
          data-category="${escapeHtml(item.category)}"
        >
          <span>${escapeHtml(item.label)}</span>
        </a>
        <div class="${panelClass}" data-menu-panel="${escapeHtml(item.key)}">
          <div class="${item.layout === 'mega' ? 'container-xl io-megamenu-grid' : 'io-dropdown-inner'}">
            ${columnsHtml}
          </div>
        </div>
      </li>
    `;
  }).join('');

  const mobileNavHtml = isMobileMenuOpen
    ? `
      <div class="io-drawer-backdrop" data-action="close-mobile-menu" aria-hidden="true"></div>
      <aside class="io-mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Menú de categorías">
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
          <span class="fw-bold text-white">Categorías</span>
          <button type="button" class="io-icon-action-btn" data-action="close-mobile-menu" aria-label="Cerrar menú">
            ${icons.x(20)}
          </button>
        </div>
        <nav class="p-3 overflow-auto flex-grow-1" aria-label="Categorías móvil">
          <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
            ${NAV_MENU_ITEMS.map((item) => {
              const isExpanded = expandedMobileKey === item.key;
              const subColumnsHtml = item.columns
                .map(
                  (col) => `
                    <div class="io-mobile-subgroup">
                      <div class="io-mobile-subheading">${escapeHtml(col.heading)}</div>
                      <ul class="list-unstyled d-flex flex-column gap-1 mb-0">
                        ${col.links
                          .map(
                            (link) => `
                              <li>
                                <a
                                  href="#/categoria/${escapeHtml(link.category)}"
                                  class="io-mobile-sublink"
                                  data-action="go-category"
                                  data-category="${escapeHtml(link.category)}"
                                  ${link.sizeFilter ? `data-filter-size="${escapeHtml(link.sizeFilter)}"` : ''}
                                >
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
                <li>
                  <button
                    type="button"
                    class="io-mobile-drawer-link ${item.isAccent ? 'is-accent' : ''} ${isExpanded ? 'is-expanded' : ''}"
                    data-action="toggle-mobile-cat"
                    data-nav-key="${escapeHtml(item.key)}"
                    aria-expanded="${isExpanded}"
                  >
                    <span>${escapeHtml(item.label)}</span>
                    <span class="io-mobile-chevron">${icons.chevronDown(16)}</span>
                  </button>
                  <div class="io-mobile-subpanel ${isExpanded ? 'is-open' : ''}">
                    ${subColumnsHtml}
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </nav>
      </aside>
    `
    : '';

  const searchBarHtml = isSearchOpen
    ? `
      <div class="io-search-overlay">
        <div class="container-xl py-2">
          <form role="search" aria-label="Buscar prendas en el catálogo" id="form-busqueda" class="d-flex align-items-center gap-2">
            <label for="buscador-catalogo" class="visually-hidden">Buscar prenda</label>
            <div class="input-group flex-grow-1">
              <span class="input-group-text bg-white border-0">${icons.search(18)}</span>
              <input
                id="buscador-catalogo"
                type="search"
                class="form-control border-0"
                style="min-height: 44px"
                placeholder="Buscar..."
                value="${escapeHtml(searchQuery)}"
              />
            </div>
            <button type="button" class="io-icon-action-btn" data-action="close-search" aria-label="Cerrar buscador">
              ${icons.x(20)}
            </button>
          </form>
        </div>
      </div>
    `
    : '';

  return `
    <a class="skip-link" href="#contenido-principal">Saltar al contenido principal</a>

    <div class="io-top-strip py-1">
      <div class="container-xl text-center">
        <span>Envío GRATIS mayores a S/ 150</span>
      </div>
    </div>

    <header class="io-header" id="io-site-header">
      <div class="container-fluid px-3 px-xl-4">
        <div class="io-header-inner">
          <div class="io-header-left">
            <button
              type="button"
              class="io-icon-action-btn d-lg-none"
              data-action="open-mobile-menu"
              aria-label="Abrir menú de categorías"
            >
              ${icons.menu(22)}
            </button>
            ${renderBrandLogo()}
          </div>

          <nav class="io-header-center d-none d-lg-flex" aria-label="Categorías principales">
            <ul class="io-nav-list">
              ${navItemsHtml}
            </ul>
          </nav>

          <div class="io-header-right">
            <button
              type="button"
              class="io-icon-action-btn"
              data-action="toggle-search"
              aria-label="Buscar prendas"
              aria-expanded="${isSearchOpen}"
            >
              ${icons.search(20)}
            </button>

            <button
              type="button"
              class="io-icon-action-btn position-relative"
              data-action="open-wishlist"
              aria-label="Lista de deseados"
            >
              ${icons.heart(20)}
              ${wishlistCount > 0 ? `<span class="io-bag-badge">${wishlistCount}</span>` : ''}
            </button>

            <button
              type="button"
              class="io-icon-action-btn"
              data-action="open-login"
              aria-label="Iniciar sesión"
            >
              ${icons.user(20)}
            </button>

            <button
              type="button"
              class="io-icon-action-btn position-relative"
              data-action="open-cart"
              aria-label="Abrir bolsa de compras, ${cartCount} prendas"
            >
              ${icons.bag(20)}
              <span class="io-bag-badge" aria-live="polite">${cartCount}</span>
            </button>
          </div>
        </div>
      </div>

      ${searchBarHtml}
    </header>

    ${mobileNavHtml}
  `;
}
