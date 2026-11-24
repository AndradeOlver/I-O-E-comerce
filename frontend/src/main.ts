import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/tokens.css';
import './styles/storefront.css';
import {
  CATALOGO_PRODUCTOS,
  CATEGORIAS_TIENDA,
  COLECCIONES_BANNERS,
  OFERTAS_CARRUSEL,
} from './data/catalogData';
import { renderLoginModal, renderWishlistDrawer } from './render/accountPanels';
import { renderCartDrawer } from './render/cartDrawer';
import { renderCategoryGrid } from './render/categoryGrid';
import { renderCategoryPage } from './render/categoryPage';
import { renderCollectionBanners } from './render/collectionBanners';
import { FooterInfoTopic, renderFooter, renderFooterInfoModal } from './render/footer';
import { renderHeaderNav } from './render/headerNav';
import { renderHomeShowcase } from './render/homeShowcase';
import { bindBrandLogo } from './render/brand';
import { renderOffersCarousel } from './render/offersCarousel';
import {
  CartItem,
  CategorySlug,
  GenderFilter,
  HomeShowcaseTab,
  KidsAgeFilter,
  KidsAgeGroup,
} from './types/store.types';
import { escapeHtml, icons } from './utils/icons';

const RESERVE_DURATION_SECONDS = 15 * 60;

type AppView = 'home' | 'category';

interface StoreState {
  view: AppView;
  searchQuery: string;
  selectedCategory: CategorySlug;
  selectedSubcategory: string;
  selectedGender: GenderFilter;
  selectedAgeGroup: KidsAgeFilter;
  onlyOffers: boolean;
  selectedSize: string;
  showcaseTab: HomeShowcaseTab;
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
  footerInfoTopic: FooterInfoTopic | null;
  isSearchOpen: boolean;
  openNavKey: string | null;
  activeMenuAge: KidsAgeGroup | null;
  activeMenuCategory: string | null;
  isMobileMenuOpen: boolean;
  expandedMobileKey: string | null;
  mobileAgeKey: KidsAgeGroup | null;
  mobileCategoryKey: string | null;
  colorblindMode: boolean;
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

function loadSavedColorblindMode(): boolean {
  try {
    return window.localStorage.getItem('io_colorblind_mode') === '1';
  } catch {
    return false;
  }
}

const state: StoreState = {
  view: initialRoute.view,
  searchQuery: '',
  selectedCategory: initialRoute.category,
  selectedSubcategory: 'todas',
  selectedGender: 'todos',
  selectedAgeGroup: 'todas',
  onlyOffers: false,
  selectedSize: 'todas',
  showcaseTab: 'destacados',
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
  footerInfoTopic: null,
  isSearchOpen: false,
  openNavKey: null,
  activeMenuAge: null,
  activeMenuCategory: null,
  isMobileMenuOpen: false,
  expandedMobileKey: null,
  mobileAgeKey: null,
  mobileCategoryKey: null,
  colorblindMode: loadSavedColorblindMode(),
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

function getActiveOfferProductIds(): Set<number> {
  const ids = new Set<number>();
  for (const campana of OFERTAS_CARRUSEL) {
    if (
      campana.activa &&
      campana.aprobada_dueno &&
      campana.stock_consumido < campana.stock_maximo &&
      campana.productoIds
    ) {
      for (const id of campana.productoIds) ids.add(id);
    }
  }
  return ids;
}

function getActiveOfferCategories(): Set<CategorySlug> {
  const cats = new Set<CategorySlug>();
  for (const campana of OFERTAS_CARRUSEL) {
    if (
      campana.activa &&
      campana.aprobada_dueno &&
      campana.stock_consumido < campana.stock_maximo
    ) {
      cats.add(campana.categoriaTarget);
    }
  }
  return cats;
}

function getFilteredProducts() {
  const q = state.searchQuery.trim().toLowerCase();
  const activeOfferIds = state.onlyOffers ? getActiveOfferProductIds() : null;
  const activeOfferCats = state.onlyOffers ? getActiveOfferCategories() : null;

  const matches = CATALOGO_PRODUCTOS.filter((product) => {
    if (state.selectedGender !== 'todos') {
      if (state.selectedGender === 'ninos') {
        if (product.genero !== 'ninos') return false;
        if (
          state.selectedAgeGroup !== 'todas' &&
          product.rango_edad !== state.selectedAgeGroup
        ) {
          return false;
        }
      } else if (
        product.genero !== state.selectedGender &&
        product.genero !== 'unisex'
      ) {
        return false;
      }
    }

    if (
      state.selectedCategory !== 'todas' &&
      product.categorySlug !== state.selectedCategory
    ) {
      return false;
    }

    if (
      state.selectedSubcategory !== 'todas' &&
      product.subcategorySlug !== state.selectedSubcategory
    ) {
      return false;
    }

    if (state.onlyOffers && activeOfferIds && activeOfferCats) {
      const matchesProductOffer = product.variants.some((v) =>
        activeOfferIds.has(v.producto_id)
      );
      const matchesCategoryOffer = activeOfferCats.has(product.categorySlug);
      if (!matchesProductOffer && !matchesCategoryOffer) {
        return false;
      }
    }

    if (
      state.selectedSize !== 'todas' &&
      !product.variants.some((v) => v.talla === state.selectedSize)
    ) {
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
          slotContainer.classList.remove('is-filled');
          slotContainer.innerHTML = fallback.innerHTML;
        }
      },
      { once: true }
    );
  });

  bindBrandLogo(root);
}

// ---------------------------------------------------------------------------
// Utilidades de presentación: header con scroll, overlays y cierre animado
// ---------------------------------------------------------------------------
let headerScrolled = false;
let lastOverlayKey = 'none';
let lastViewKey = '';
let overlayOpenerAction: string | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function syncHeaderScroll(): void {
  const y = window.scrollY;
  // Histéresis para evitar parpadeo cerca del umbral
  if (!headerScrolled && y > 24) headerScrolled = true;
  else if (headerScrolled && y < 8) headerScrolled = false;
  root.querySelector('.io-header')?.classList.toggle('is-scrolled', headerScrolled);
}

function getOverlayKey(): string {
  if (state.isCartOpen) return 'cart';
  if (state.isWishlistOpen) return 'wishlist';
  if (state.isLoginOpen) return 'login';
  if (state.footerInfoTopic !== null) return 'footer-info';
  if (state.isMobileMenuOpen) return 'mobile';
  return 'none';
}

/** Anima el cierre de drawers/modales antes de desmontarlos. */
function animateClose(done: () => void): void {
  const targets = root.querySelectorAll<HTMLElement>(
    '.io-drawer-backdrop, .io-drawer-panel, .io-modal, .io-mobile-nav-drawer'
  );
  if (prefersReducedMotion() || targets.length === 0) {
    done();
    return;
  }
  targets.forEach((el) => el.classList.add('is-closing'));
  window.setTimeout(done, 220);
}

function resetDesktopMenuState(): void {
  state.openNavKey = null;
  state.activeMenuAge = null;
  state.activeMenuCategory = null;
}

function closeAllOverlays(): void {
  state.isSearchOpen = false;
  state.isCartOpen = false;
  state.isWishlistOpen = false;
  state.isLoginOpen = false;
  state.footerInfoTopic = null;
  resetDesktopMenuState();
  state.isMobileMenuOpen = false;
  state.expandedMobileKey = null;
  state.mobileAgeKey = null;
  state.mobileCategoryKey = null;
}

function formatReserveTime(totalSeconds: number): string {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs} min`;
}

function syncCarouselDom(): void {
  const slides = root.querySelectorAll<HTMLElement>('.io-carousel-slide[data-slide-index]');
  const dots = root.querySelectorAll<HTMLElement>('.io-carousel-dot[data-index]');

  slides.forEach((slide) => {
    const idx = Number(slide.dataset.slideIndex ?? -1);
    const active = idx === state.carouselIndex;
    slide.classList.toggle('is-active', active);
    slide.classList.toggle('is-zooming', active);
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
  state.selectedSubcategory = 'todas';
  state.selectedGender = 'todos';
  state.selectedAgeGroup = 'todas';
  state.onlyOffers = false;
  state.selectedSize = 'todas';
  resetDesktopMenuState();
  state.isMobileMenuOpen = false;
  state.expandedMobileKey = null;
  state.mobileAgeKey = null;
  state.mobileCategoryKey = null;
  if (window.location.hash !== '#/' && window.location.hash !== '') {
    window.location.hash = '#/';
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

interface NavigateCategoryFilters {
  gender?: GenderFilter;
  ageGroup?: KidsAgeFilter;
  subcategory?: string;
  onlyOffers?: boolean;
  sizeFilter?: string;
}

function navigateToCategory(
  slug: CategorySlug,
  filters: NavigateCategoryFilters = {}
): void {
  state.view = 'category';
  state.selectedCategory = slug;
  state.selectedGender = filters.gender ?? 'todos';
  state.selectedAgeGroup =
    state.selectedGender === 'ninos' ? (filters.ageGroup ?? 'todas') : 'todas';
  state.selectedSubcategory = filters.subcategory ?? 'todas';
  state.onlyOffers = filters.onlyOffers ?? false;
  state.selectedSize = filters.sizeFilter ?? 'todas';
  resetDesktopMenuState();
  state.isMobileMenuOpen = false;
  state.expandedMobileKey = null;
  state.mobileAgeKey = null;
  state.mobileCategoryKey = null;
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

        <div class="container-xl pt-5 pb-2">
          ${
            state.liveFeedback
              ? `
                <div class="io-alert" role="status" aria-live="polite">
                  <span>${escapeHtml(state.liveFeedback)}</span>
                  <button type="button" class="btn-close" data-action="dismiss-feedback" aria-label="Ocultar notificación"></button>
                </div>
              `
              : ''
          }

          ${renderCategoryGrid(CATEGORIAS_TIENDA, CATALOGO_PRODUCTOS, state.selectedCategory)}

          ${renderHomeShowcase({
            products: CATALOGO_PRODUCTOS,
            activeTab: state.showcaseTab,
            selectedVariants: state.selectedVariants,
            colorblindMode: state.colorblindMode,
          })}

          ${renderCollectionBanners(COLECCIONES_BANNERS)}
        </div>
      `
      : renderCategoryPage({
          categories: CATEGORIAS_TIENDA,
          currentCategory: currentCategoryObj,
          selectedCategory: state.selectedCategory,
          selectedSubcategory: state.selectedSubcategory,
          selectedGender: state.selectedGender,
          selectedAgeGroup: state.selectedAgeGroup,
          onlyOffers: state.onlyOffers,
          products: filteredProducts,
          totalCatalogCount: CATALOGO_PRODUCTOS.length,
          selectedSize: state.selectedSize,
          sortBy: state.sortBy,
          availableSizes: getAvailableSizes(),
          selectedVariants: state.selectedVariants,
          colorblindMode: state.colorblindMode,
        });

  root.innerHTML = `
    <div class="d-flex flex-column min-vh-100">
      ${renderHeaderNav({
        selectedCategory: state.selectedCategory,
        selectedGender: state.selectedGender,
        onlyOffers: state.onlyOffers,
        isHome: state.view === 'home',
        cartCount,
        wishlistCount: state.wishlistCount,
        isSearchOpen: state.isSearchOpen,
        openNavKey: state.openNavKey,
        activeMenuAge: state.activeMenuAge,
        activeMenuCategory: state.activeMenuCategory,
        isMobileMenuOpen: state.isMobileMenuOpen,
        expandedMobileKey: state.expandedMobileKey,
        mobileAgeKey: state.mobileAgeKey,
        mobileCategoryKey: state.mobileCategoryKey,
        searchQuery: state.searchQuery,
        colorblindMode: state.colorblindMode,
      })}

      <main id="contenido-principal" class="flex-grow-1">
        ${mainContentHtml}
      </main>

      ${renderFooter(CATEGORIAS_TIENDA, state.colorblindMode)}

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

      ${renderCartDrawer(state.isCartOpen, state.cart, state.secondsRemaining, state.optInMarketing, state.colorblindMode)}
      ${renderWishlistDrawer(state.isWishlistOpen)}
      ${renderLoginModal(state.isLoginOpen, state.loginFeedback)}
      ${renderFooterInfoModal(state.footerInfoTopic)}
    </div>
  `;

  attachImageFallbacks();

  // Las animaciones de entrada solo corren al cambiar de vista u overlay, no en re-renders menores
  const overlayKey = getOverlayKey();
  const viewKey = `${state.view}:${state.selectedCategory}`;
  root.classList.toggle('io-steady-overlay', overlayKey !== 'none' && overlayKey === lastOverlayKey);
  root.classList.toggle('io-steady-view', viewKey === lastViewKey);
  document.body.classList.toggle('io-scroll-lock', overlayKey !== 'none');

  if (overlayKey !== 'none' && overlayKey !== lastOverlayKey) {
    // Foco al botón de cierre del panel recién abierto
    root
      .querySelector<HTMLElement>(
        '.io-drawer-panel [data-action^="close"], .io-modal [data-action^="close"], .io-mobile-nav-drawer [data-action^="close"]'
      )
      ?.focus();
  } else if (overlayKey === 'none' && lastOverlayKey !== 'none' && overlayOpenerAction) {
    // Devuelve el foco al control que abrió el panel
    const opener = Array.from(
      root.querySelectorAll<HTMLElement>(`[data-action="${overlayOpenerAction}"]`)
    ).find((el) => el.offsetParent !== null);
    opener?.focus();
    overlayOpenerAction = null;
  }

  lastOverlayKey = overlayKey;
  lastViewKey = viewKey;
  syncHeaderScroll();

  // Zoom lento del hero: se activa tras el primer frame para que la transición arranque en escala 1
  if (state.view === 'home') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.querySelector('.io-carousel-slide.is-active')?.classList.add('is-zooming');
      });
    });
  }

  if (restoreFocusId === 'buscador-catalogo') {
    const input = document.getElementById('buscador-catalogo') as HTMLInputElement | null;
    if (input) {
      input.focus();
      if (selectionStart !== null) {
        input.setSelectionRange(selectionStart, selectionStart);
      }
    }
  } else if (
    restoreFocusId.startsWith('nav-trigger-') ||
    restoreFocusId.startsWith('menu-age-') ||
    restoreFocusId.startsWith('menu-cat-') ||
    restoreFocusId.startsWith('switch-daltonismo-')
  ) {
    document.getElementById(restoreFocusId)?.focus();
  }
}

// Sincronizar navegación Atrás/Adelante del navegador
window.addEventListener('hashchange', () => {
  const route = parseRouteFromHash();
  state.view = route.view;
  state.selectedCategory = route.category;
  resetDesktopMenuState();
  renderApp();
  window.scrollTo({ top: 0 });
});

// Cerrar menú desplegable del header con Escape o clic fuera del header
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (state.openNavKey !== null) {
      const triggerId = `nav-trigger-${state.openNavKey}`;
      resetDesktopMenuState();
      renderApp();
      document.getElementById(triggerId)?.focus();
      return;
    }
    if (state.isSearchOpen || state.isCartOpen || state.isWishlistOpen || state.isLoginOpen || state.footerInfoTopic !== null || state.isMobileMenuOpen) {
      animateClose(() => {
        closeAllOverlays();
        renderApp();
      });
    }
  }
});

// Delegación global de clics
root.addEventListener('click', (event) => {
  const rawTarget = event.target as HTMLElement | null;
  if (state.openNavKey !== null && !rawTarget?.closest('#io-site-header')) {
    resetDesktopMenuState();
    renderApp();
  }

  const target = rawTarget?.closest<HTMLElement>('[data-action]');
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
      const gender = target.dataset.filterGender as GenderFilter | undefined;
      const ageGroup = target.dataset.filterAge as KidsAgeFilter | undefined;
      const subcategory = target.dataset.filterSubcategory;
      const onlyOffers = target.dataset.filterOffers === 'true';
      const sizeFilter = target.dataset.filterSize;
      navigateToCategory(slug, {
        gender,
        ageGroup,
        subcategory,
        onlyOffers,
        sizeFilter,
      });
      break;
    }
    case 'filter-gender': {
      const gender = (target.dataset.gender as GenderFilter) ?? 'todos';
      state.selectedGender = gender;
      if (gender !== 'ninos') state.selectedAgeGroup = 'todas';
      if (gender === 'hombre' && state.selectedCategory === 'vestidos') {
        state.selectedCategory = 'todas';
      }
      state.selectedSubcategory = 'todas';
      renderApp();
      break;
    }
    case 'filter-age': {
      state.selectedGender = 'ninos';
      state.selectedAgeGroup = (target.dataset.age as KidsAgeFilter) ?? 'todas';
      renderApp();
      break;
    }
    case 'filter-subcategory': {
      state.selectedSubcategory = target.dataset.subcategory ?? 'todas';
      renderApp();
      break;
    }
    case 'toggle-offers-filter': {
      state.onlyOffers = !state.onlyOffers;
      renderApp();
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
    case 'toggle-desktop-nav': {
      const key = target.dataset.navKey ?? null;
      if (state.openNavKey === key) {
        resetDesktopMenuState();
      } else {
        state.openNavKey = key;
        state.activeMenuAge = null;
        state.activeMenuCategory = null;
      }
      renderApp();
      break;
    }
    case 'select-menu-age': {
      const navKey = target.dataset.navKey ?? null;
      const ageKey = (target.dataset.ageKey as KidsAgeGroup | undefined) ?? null;
      if (navKey) state.openNavKey = navKey;
      state.activeMenuAge = state.activeMenuAge === ageKey ? null : ageKey;
      state.activeMenuCategory = null;
      renderApp();
      break;
    }
    case 'select-menu-cat': {
      const navKey = target.dataset.navKey ?? null;
      const catKey = target.dataset.catKey ?? null;
      if (navKey) state.openNavKey = navKey;
      state.activeMenuCategory = state.activeMenuCategory === catKey ? null : catKey;
      renderApp();
      break;
    }
    case 'open-mobile-menu':
    case 'toggle-mobile-menu':
      overlayOpenerAction = 'toggle-mobile-menu';
      state.isMobileMenuOpen = true;
      state.expandedMobileKey = null;
      state.mobileAgeKey = null;
      state.mobileCategoryKey = null;
      renderApp();
      break;
    case 'close-mobile-menu':
      animateClose(() => {
        state.isMobileMenuOpen = false;
        state.expandedMobileKey = null;
        state.mobileAgeKey = null;
        state.mobileCategoryKey = null;
        renderApp();
      });
      break;
    case 'toggle-mobile-item':
    case 'toggle-mobile-cat': {
      const key = target.dataset.navKey ?? null;
      state.expandedMobileKey = state.expandedMobileKey === key ? null : key;
      state.mobileAgeKey = null;
      state.mobileCategoryKey = null;
      renderApp();
      break;
    }
    case 'toggle-mobile-age': {
      const ageKey = (target.dataset.ageKey as KidsAgeGroup | undefined) ?? null;
      state.mobileAgeKey = state.mobileAgeKey === ageKey ? null : ageKey;
      state.mobileCategoryKey = null;
      renderApp();
      break;
    }
    case 'toggle-mobile-subcat': {
      const catKey = target.dataset.catKey ?? null;
      state.mobileCategoryKey = state.mobileCategoryKey === catKey ? null : catKey;
      renderApp();
      break;
    }
    case 'open-wishlist':
      overlayOpenerAction = 'open-wishlist';
      state.isWishlistOpen = true;
      renderApp();
      break;
    case 'close-wishlist':
      animateClose(() => {
        state.isWishlistOpen = false;
        renderApp();
      });
      break;
    case 'open-login':
      overlayOpenerAction = 'open-login';
      state.isMobileMenuOpen = false;
      state.isLoginOpen = true;
      state.loginFeedback = '';
      renderApp();
      break;
    case 'close-login':
      animateClose(() => {
        state.isLoginOpen = false;
        renderApp();
      });
      break;
    case 'toggle-colorblind-mode': {
      state.colorblindMode = !state.colorblindMode;
      try {
        window.localStorage.setItem('io_colorblind_mode', state.colorblindMode ? '1' : '0');
      } catch {
        // Ignorar si localStorage está restringido
      }
      state.liveFeedback = state.colorblindMode
        ? 'Modo Daltonismo activado: texturas y tramas visibles en los selectores de color.'
        : 'Modo Daltonismo desactivado: vista de colores estándar.';
      renderApp();
      break;
    }
    case 'switch-showcase-tab': {
      const tab = (target.dataset.tab as HomeShowcaseTab | undefined) ?? 'destacados';
      state.showcaseTab = tab;
      renderApp();
      break;
    }
    case 'open-footer-info': {
      const topic = (target.dataset.topic as FooterInfoTopic | undefined) ?? null;
      if (topic) {
        state.footerInfoTopic = topic;
        renderApp();
      }
      break;
    }
    case 'close-footer-info':
      animateClose(() => {
        state.footerInfoTopic = null;
        renderApp();
      });
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
      state.selectedSubcategory = 'todas';
      state.selectedGender = 'todos';
      state.selectedAgeGroup = 'todas';
      state.onlyOffers = false;
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
      overlayOpenerAction = 'open-cart';
      state.isCartOpen = true;
      renderApp();
      break;
    case 'close-cart':
      animateClose(() => {
        state.isCartOpen = false;
        renderApp();
      });
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
  }, 6000);
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
      const timerEl = root.querySelector<HTMLElement>('[data-cart-timer]');
      if (timerEl) timerEl.textContent = formatReserveTime(state.secondsRemaining);
    }
  }
}, 1000);

renderApp();

// Header dinámico: se compacta y se vuelve translúcido al hacer scroll
let scrollTicking = false;
window.addEventListener(
  'scroll',
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      syncHeaderScroll();
      scrollTicking = false;
    });
  },
  { passive: true }
);
