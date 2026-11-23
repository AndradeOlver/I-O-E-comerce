import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/tokens.css';
import './styles/storefront.css';
import {
  CATALOGO_PRODUCTOS,
  CATEGORIAS_TIENDA,
  OFERTAS_CARRUSEL,
} from './data/catalogData';
import { renderLoginModal, renderWishlistDrawer } from './render/accountPanels';
import { renderCartDrawer } from './render/cartDrawer';
import { renderCategoryGrid } from './render/categoryGrid';
import { renderCategoryPage } from './render/categoryPage';
import { renderHeaderNav } from './render/headerNav';
import { renderOffersCarousel } from './render/offersCarousel';
import { CartItem, CategorySlug } from './types/store.types';
import { escapeHtml, icons } from './utils/icons';

const RESERVE_DURATION_SECONDS = 15 * 60;

type AppView = 'home' | 'category';

interface StoreState {
  view: AppView;
  searchQuery: string;
  selectedCategory: CategorySlug;
  selectedSize: string;
  sortBy: 'relevancia' | 'precio-asc' | 'precio-desc';
  carouselIndex: number;
  carouselPaused: boolean;
  selectedVariants: Record<string, number>;
  cart: CartItem[];
  wishlistCount: number;
  secondsRemaining: number;
  isCartOpen: boolean;
  isWishlistOpen: boolean;
  isLoginOpen: boolean;
  loginFeedback: string;
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;
  optInMarketing: boolean;
  liveFeedback: string;
}

const VALID_SLUGS = new Set<CategorySlug>([
  'todas',
  ...CATEGORIAS_TIENDA.map((c) => c.slug),
]);

function parseRouteFromHash(): { view: AppView; category: CategorySlug } {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (raw.startsWith('categoria/')) {
    const slug = raw.slice('categoria/'.length) as CategorySlug;
    if (VALID_SLUGS.has(slug)) {
      return { view: 'category', category: slug };
    }
    return { view: 'category', category: 'todas' };
  }
  return { view: 'home', category: 'todas' };
}

const initialRoute = parseRouteFromHash();

const state: StoreState = {
  view: initialRoute.view,
  searchQuery: '',
  selectedCategory: initialRoute.category,
  selectedSize: 'todas',
  sortBy: 'relevancia',
  carouselIndex: 0,
  carouselPaused: false,
  selectedVariants: {},
  cart: [],
  wishlistCount: 0,
  secondsRemaining: RESERVE_DURATION_SECONDS,
  isCartOpen: false,
  isWishlistOpen: false,
  isLoginOpen: false,
  loginFeedback: '',
  isSearchOpen: false,
  isMobileMenuOpen: false,
  optInMarketing: false,
  liveFeedback: '',
};

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('No se encontró el contenedor #root');
}
const root: HTMLElement = rootEl;

function getAvailableSizes(): string[] {
  const sizes = new Set<string>();
  for (const p of CATALOGO_PRODUCTOS) {
    for (const v of p.variants) sizes.add(v.talla);
  }
  return Array.from(sizes);
}

function getFilteredProducts() {
  const q = state.searchQuery.trim().toLowerCase();

  const matches = CATALOGO_PRODUCTOS.filter((product) => {
    if (state.selectedCategory !== 'todas' && product.categorySlug !== state.selectedCategory) {
      return false;
    }
    if (state.selectedSize !== 'todas' && !product.variants.some((v) => v.talla === state.selectedSize)) {
      return false;
    }
    if (!q) return true;

    return (
      product.nombre.toLowerCase().includes(q) ||
      product.marca.toLowerCase().includes(q) ||
      product.descripcion.toLowerCase().includes(q) ||
      product.variants.some(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.color.toLowerCase().includes(q) ||
          v.talla.toLowerCase().includes(q)
      )
    );
  });

  if (state.sortBy === 'precio-asc') {
    return [...matches].sort(
      (a, b) => (a.variants[0]?.precio_venta ?? 0) - (b.variants[0]?.precio_venta ?? 0)
    );
  }
  if (state.sortBy === 'precio-desc') {
    return [...matches].sort(
      (a, b) => (b.variants[0]?.precio_venta ?? 0) - (a.variants[0]?.precio_venta ?? 0)
    );
  }
  return matches;
}

function attachImageFallbacks(): void {
  root.querySelectorAll<HTMLImageElement>('img[data-slot-img]').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        const slotContainer = img.closest('.io-image-slot');
        const fallback = slotContainer?.querySelector('[data-slot-fallback-hidden]');
        if (slotContainer && fallback) {
          slotContainer.innerHTML = fallback.innerHTML;
        }
      },
      { once: true }
    );
  });

  const logoImg = root.querySelector<HTMLImageElement>('img[data-logo-img]');
  if (logoImg) {
    logoImg.addEventListener(
      'error',
      () => {
        logoImg.classList.add('d-none');
        const fallback = logoImg.parentElement?.querySelector('[data-logo-fallback]');
        fallback?.classList.remove('d-none');
      },
      { once: true }
    );
  }
}

function syncHeaderMenuDom(openKey: string | null): void {
  root.querySelectorAll<HTMLElement>('.io-nav-item[data-nav-key]').forEach((item) => {
    const isMatch = openKey !== null && item.dataset.navKey === openKey;
    item.classList.toggle('is-open', isMatch);
  });
}

function syncCarouselDom(): void {
  const slides = root.querySelectorAll<HTMLElement>('.io-carousel-slide[data-slide-index]');
  const dots = root.querySelectorAll<HTMLElement>('.io-carousel-dot[data-index]');

  slides.forEach((slide) => {
    const idx = Number(slide.dataset.slideIndex ?? -1);
    const active = idx === state.carouselIndex;
    slide.classList.toggle('is-active', active);
    slide.setAttribute('aria-hidden', String(!active));
  });

  dots.forEach((dot) => {
    const idx = Number(dot.dataset.index ?? -1);
    const active = idx === state.carouselIndex;
    dot.classList.toggle('is-active', active);
    if (active) {
      dot.setAttribute('aria-current', 'true');
    } else {
      dot.removeAttribute('aria-current');
    }
  });
}

function navigateToHome(): void {
  state.view = 'home';
  state.selectedCategory = 'todas';
  state.selectedSize = 'todas';
  state.isMobileMenuOpen = false;
  if (window.location.hash !== '#/' && window.location.hash !== '') {
    window.location.hash = '#/';
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateToCategory(slug: CategorySlug, sizeFilter?: string): void {
  state.view = 'category';
  state.selectedCategory = slug;
  state.selectedSize = sizeFilter ?? 'todas';
  state.isMobileMenuOpen = false;
  const targetHash = `#/categoria/${slug}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderApp(): void {
  const activeElement = document.activeElement as HTMLElement | null;
  const restoreFocusId = activeElement?.id || '';
  const selectionStart =
    activeElement instanceof HTMLInputElement ? activeElement.selectionStart : null;

  const cartCount = state.cart.reduce((acc, item) => acc + item.cantidad, 0);
  const filteredProducts = getFilteredProducts();
  const currentCategoryObj =
    CATEGORIAS_TIENDA.find((c) => c.slug === state.selectedCategory) ?? null;

  const mainContentHtml =
    state.view === 'home'
      ? `
        ${renderOffersCarousel(OFERTAS_CARRUSEL, state.carouselIndex, state.carouselPaused)}

        <div class="container-xl py-4">
          ${
            state.liveFeedback
              ? `
                <div class="alert alert-light border d-flex justify-content-between align-items-center mb-4" role="status" aria-live="polite" style="border-color: var(--color-primary-navy)">
                  <span class="small fw-semibold">${escapeHtml(state.liveFeedback)}</span>
                  <button type="button" class="btn-close" data-action="dismiss-feedback" aria-label="Ocultar notificación"></button>
                </div>
              `
              : ''
          }

          ${renderCategoryGrid(CATEGORIAS_TIENDA, CATALOGO_PRODUCTOS, state.selectedCategory)}
        </div>
      `
      : renderCategoryPage({
          categories: CATEGORIAS_TIENDA,
          currentCategory: currentCategoryObj,
          selectedCategory: state.selectedCategory,
          products: filteredProducts,
          totalCatalogCount: CATALOGO_PRODUCTOS.length,
          selectedSize: state.selectedSize,
          sortBy: state.sortBy,
          availableSizes: getAvailableSizes(),
          selectedVariants: state.selectedVariants,
        });

  root.innerHTML = `
    <div class="d-flex flex-column min-vh-100">
      ${renderHeaderNav({
        selectedCategory: state.selectedCategory,
        isHome: state.view === 'home',
        cartCount,
        wishlistCount: state.wishlistCount,
        isSearchOpen: state.isSearchOpen,
        isMobileMenuOpen: state.isMobileMenuOpen,
        searchQuery: state.searchQuery,
      })}

      <main id="contenido-principal" class="flex-grow-1">
        ${mainContentHtml}
      </main>

      <footer class="border-top bg-white py-3 mt-5">
        <div class="container-xl d-flex flex-wrap justify-content-between align-items-center gap-2 small" style="color: var(--color-ink-muted)">
          <strong style="color: var(--color-primary-navy)">I&amp;O · Lima, Perú</strong>
          <span>Precios con IGV incluido</span>
        </div>
      </footer>

      <nav class="io-mobile-bottom-nav d-md-none" aria-label="Navegación rápida móvil">
        <a href="#/" class="io-mobile-nav-btn text-decoration-none" data-action="go-home">
          ${icons.home(18)}
          <span>Inicio</span>
        </a>
        <a href="#/categoria/todas" class="io-mobile-nav-btn text-decoration-none" data-action="go-category" data-category="todas">
          ${icons.grid(18)}
          <span>Categorías</span>
        </a>
        <button type="button" class="io-mobile-nav-btn" data-action="open-cart">
          ${icons.bag(18)}
          <span>Bolsa (${cartCount})</span>
        </button>
      </nav>

      ${renderCartDrawer(state.isCartOpen, state.cart, state.secondsRemaining, state.optInMarketing)}
      ${renderWishlistDrawer(state.isWishlistOpen)}
      ${renderLoginModal(state.isLoginOpen, state.loginFeedback)}
    </div>
  `;

  attachImageFallbacks();

  if (restoreFocusId === 'buscador-catalogo') {
    const input = document.getElementById('buscador-catalogo') as HTMLInputElement | null;
    if (input) {
      input.focus();
      if (selectionStart !== null) {
        input.setSelectionRange(selectionStart, selectionStart);
      }
    }
  }
}

// Sincronizar navegación Atrás/Adelante del navegador
window.addEventListener('hashchange', () => {
  const route = parseRouteFromHash();
  state.view = route.view;
  state.selectedCategory = route.category;
  renderApp();
  window.scrollTo({ top: 0 });
});

// Mega-menú y dropdown dinámico en desktop (hover + foco + Escape)
root.addEventListener('mouseover', (event) => {
  const navItem = (event.target as HTMLElement | null)?.closest<HTMLElement>('.io-nav-item[data-nav-key]');
  if (navItem) {
    syncHeaderMenuDom(navItem.dataset.navKey ?? null);
    return;
  }
  const inHeader = (event.target as HTMLElement | null)?.closest('#io-site-header');
  if (!inHeader) {
    syncHeaderMenuDom(null);
  }
});

root.addEventListener('focusin', (event) => {
  const navItem = (event.target as HTMLElement | null)?.closest<HTMLElement>('.io-nav-item[data-nav-key]');
  if (navItem) {
    syncHeaderMenuDom(navItem.dataset.navKey ?? null);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    syncHeaderMenuDom(null);
    if (state.isSearchOpen || state.isCartOpen || state.isWishlistOpen || state.isLoginOpen || state.isMobileMenuOpen) {
      state.isSearchOpen = false;
      state.isCartOpen = false;
      state.isWishlistOpen = false;
      state.isLoginOpen = false;
      state.isMobileMenuOpen = false;
      renderApp();
    }
  }
});

// Delegación global de clics
root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const validOffersCount = OFERTAS_CARRUSEL.filter(
    (o) => o.activa && o.aprobada_dueno && o.stock_consumido < o.stock_maximo
  ).length;

  switch (action) {
    case 'go-home':
      event.preventDefault();
      navigateToHome();
      break;
    case 'go-category': {
      event.preventDefault();
      const slug = (target.dataset.category as CategorySlug) ?? 'todas';
      const sizeFilter = target.dataset.filterSize;
      navigateToCategory(slug, sizeFilter);
      break;
    }
    case 'toggle-search':
      state.isSearchOpen = !state.isSearchOpen;
      renderApp();
      if (state.isSearchOpen) {
        (document.getElementById('buscador-catalogo') as HTMLInputElement | null)?.focus();
      }
      break;
    case 'close-search':
      state.isSearchOpen = false;
      renderApp();
      break;
    case 'open-mobile-menu':
      state.isMobileMenuOpen = true;
      renderApp();
      break;
    case 'close-mobile-menu':
      state.isMobileMenuOpen = false;
      renderApp();
      break;
    case 'open-wishlist':
      state.isWishlistOpen = true;
      renderApp();
      break;
    case 'close-wishlist':
      state.isWishlistOpen = false;
      renderApp();
      break;
    case 'open-login':
      state.isLoginOpen = true;
      state.loginFeedback = '';
      renderApp();
      break;
    case 'close-login':
      state.isLoginOpen = false;
      renderApp();
      break;
    case 'dismiss-feedback':
      state.liveFeedback = '';
      renderApp();
      break;
    case 'carousel-dot':
      state.carouselIndex = Number(target.dataset.index ?? 0);
      syncCarouselDom();
      resetCarouselTimer();
      break;
    case 'carousel-prev':
      if (validOffersCount > 0) {
        state.carouselIndex = (state.carouselIndex - 1 + validOffersCount) % validOffersCount;
        syncCarouselDom();
        resetCarouselTimer();
      }
      break;
    case 'carousel-next':
      if (validOffersCount > 0) {
        state.carouselIndex = (state.carouselIndex + 1) % validOffersCount;
        syncCarouselDom();
        resetCarouselTimer();
      }
      break;
    case 'carousel-toggle':
      state.carouselPaused = !state.carouselPaused;
      renderApp();
      resetCarouselTimer();
      break;
    case 'reset-filters':
      state.searchQuery = '';
      state.selectedCategory = 'todas';
      state.selectedSize = 'todas';
      state.sortBy = 'relevancia';
      renderApp();
      break;
    case 'select-color': {
      const groupId = target.dataset.group ?? '';
      const color = target.dataset.color ?? '';
      const product = CATALOGO_PRODUCTOS.find((p) => p.groupId === groupId);
      if (!product) break;
      const matching = product.variants.filter((v) => v.color === color);
      const chosen = matching.find((v) => v.stock > 0) ?? matching[0];
      if (chosen) {
        state.selectedVariants[groupId] = chosen.producto_id;
        renderApp();
      }
      break;
    }
    case 'select-size-variant': {
      if (target.getAttribute('aria-disabled') === 'true') break;
      const groupId = target.dataset.group ?? '';
      const variantId = Number(target.dataset.variantId ?? 0);
      state.selectedVariants[groupId] = variantId;
      renderApp();
      break;
    }
    case 'add-to-cart': {
      const groupId = target.dataset.group ?? '';
      const variantId = Number(target.dataset.variantId ?? 0);
      const product = CATALOGO_PRODUCTOS.find((p) => p.groupId === groupId);
      const variant = product?.variants.find((v) => v.producto_id === variantId);
      if (!product || !variant || variant.stock <= 0) break;

      const existing = state.cart.find((item) => item.producto_id === variant.producto_id);
      if (existing) {
        existing.cantidad = Math.min(existing.cantidad + 1, variant.stock);
      } else {
        state.cart.push({
          producto_id: variant.producto_id,
          sku: variant.sku,
          nombre: product.nombre,
          marca: product.marca,
          talla: variant.talla,
          color: variant.color,
          color_textura: variant.color_textura,
          precio_venta: variant.precio_venta,
          cantidad: 1,
          maxStock: variant.stock,
        });
      }
      state.secondsRemaining = RESERVE_DURATION_SECONDS;
      state.liveFeedback = `${product.nombre} talla ${variant.talla} (${variant.color}) agregado a la bolsa.`;
      renderApp();
      break;
    }
    case 'open-cart':
      state.isCartOpen = true;
      renderApp();
      break;
    case 'close-cart':
      state.isCartOpen = false;
      renderApp();
      break;
    case 'cart-qty': {
      const productoId = Number(target.dataset.productoId ?? 0);
      const delta = Number(target.dataset.delta ?? 0);
      state.cart = state.cart
        .map((item) => {
          if (item.producto_id !== productoId) return item;
          const next = item.cantidad + delta;
          if (next <= 0) return null;
          return { ...item, cantidad: Math.min(next, item.maxStock) };
        })
        .filter((item): item is CartItem => item !== null);
      renderApp();
      break;
    }
    case 'cart-remove': {
      const productoId = Number(target.dataset.productoId ?? 0);
      state.cart = state.cart.filter((item) => item.producto_id !== productoId);
      renderApp();
      break;
    }
    case 'cart-clear':
      state.cart = [];
      state.secondsRemaining = RESERVE_DURATION_SECONDS;
      renderApp();
      break;
    case 'cart-checkout': {
      const total = target.dataset.total ?? '0.00';
      window.alert(`Resumen listo para Checkout: ${state.cart.length} ítem(s) por S/ ${total}.`);
      break;
    }
  }
});

// Delegación de inputs, selects y formularios
root.addEventListener('input', (event) => {
  const target = event.target as HTMLElement;
  if (target.id === 'buscador-catalogo') {
    state.searchQuery = (target as HTMLInputElement).value;
    if (state.view === 'home' && state.searchQuery.trim().length > 0) {
      state.view = 'category';
      state.selectedCategory = 'todas';
      window.location.hash = '#/categoria/todas';
    }
    renderApp();
  }
});

root.addEventListener('change', (event) => {
  const target = event.target as HTMLElement;
  if (target.id === 'filtro-talla') {
    state.selectedSize = (target as HTMLSelectElement).value;
    renderApp();
  } else if (target.id === 'orden-catalogo') {
    state.sortBy = (target as HTMLSelectElement).value as 'relevancia' | 'precio-asc' | 'precio-desc';
    renderApp();
  } else if (target.id === 'opt-in-marketing') {
    state.optInMarketing = (target as HTMLInputElement).checked;
  }
});

root.addEventListener('submit', (event) => {
  const form = event.target as HTMLElement;
  if (form.id === 'form-busqueda') {
    event.preventDefault();
  } else if (form.id === 'form-login') {
    event.preventDefault();
    state.loginFeedback = 'Inicio de sesión disponible al conectar el backend.';
    renderApp();
  }
});

let carouselTimerId: number | undefined;

function resetCarouselTimer(): void {
  if (carouselTimerId !== undefined) {
    window.clearInterval(carouselTimerId);
  }
  carouselTimerId = window.setInterval(() => {
    if (state.view !== 'home' || state.carouselPaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const count = OFERTAS_CARRUSEL.filter(
      (o) => o.activa && o.aprobada_dueno && o.stock_consumido < o.stock_maximo
    ).length;
    if (count > 1) {
      state.carouselIndex = (state.carouselIndex + 1) % count;
      syncCarouselDom();
    }
  }, 10000);
}

resetCarouselTimer();

// Temporizador de reserva de carrito de 15 min (RN-ECO-03)
window.setInterval(() => {
  if (state.cart.length === 0) return;
  if (state.secondsRemaining <= 1) {
    state.cart = [];
    state.secondsRemaining = RESERVE_DURATION_SECONDS;
    state.liveFeedback = 'Tu reserva temporal de 15 minutos expiró y el stock fue liberado.';
    renderApp();
  } else {
    state.secondsRemaining -= 1;
    if (state.isCartOpen) {
      renderApp();
    }
  }
}, 1000);

renderApp();
