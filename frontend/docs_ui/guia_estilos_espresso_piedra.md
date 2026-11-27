# 🎨 Guía de Estilos UI, Tokens de Diseño y Accesibilidad WCAG 2.1 AA — I&O Retail

> **Versión Oficial:** 2.2 (Actualizada y reconciliada con código fuente el `27/11/2026`)  
> **Identidad Visual Oficial:** **Espresso & Piedra (Propuesta 5)** en todo el ecosistema (`index.html`, `acceso.html`, POS, Almacén, Marketing y Dirección)  
> **Alcance de Accesibilidad (`24/11/2026`):** Inclusión visual completa (**W3C WCAG 2.1 Nivel AA** + `prefers-contrast: more` AAA `19.56:1` + Modo Daltonismo `io-mode-colorblind` + texturas SVG + `aria-live`) en la **tienda del comprador (`body.io-storefront`)**; acceso unificado (`acceso.html`) con `.skip-link`, `role="tablist"` y `aria-live`; interfaces internas operativas (`pos-*`, `almacen`, `marketing`, `admin`, `zona-preparacion`) optimizadas para rapidez operativa en Espresso & Piedra sin Okabe-Ito ni Modo Daltonismo.  
> **Autores Exclusivos del Desarrollo Frontend:**  
> 1. **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)**  
> 2. **RAZURI PAREDES, Josue Daniel (`N00421512`)**

---

## 1. Fundamentos de la Identidad Visual (Espresso & Piedra)

La identidad **Espresso & Piedra** proyecta una estética editorial moderna, sobria y operativa para retail de moda femenina, masculina e infantil en Perú. Combina café espresso (`#261E1B` / `#1A1512`), superficies minerales de piedra caliza (`#F4F0EA` / `#FAF7F2`) y acentos terracota (`#C98A7B`), manteniendo coherencia visual entre la vitrina B2C (`index.html`) y las consolas internas (`pos-vendedor.html`, `pos-cajero.html`, `almacen.html`, `marketing.html`, `admin.html`).

Toda definición ejecutable de color, tipografía, radios, foco, movimiento y sobrescrituras Bootstrap 5.3 reside en [`frontend/src/styles/tokens.css`](../src/styles/tokens.css).

---

## 2. Paleta Cromática, Tokens CSS y Sobrescrituras Bootstrap 5.3 (`tokens.css`)

### 2.1 Matriz Principal de Contraste WCAG 2.1 AA/AAA

| Rol de Color / Token | Valor Exacto (`tokens.css`) | Nombre / Uso Semántico | Superficie de Contraste | Ratio Documentado | Cumplimiento WCAG 2.1 |
|---|---|---|---|---|---|
| `--color-top-strip-bg` | `#1a1512` | Espresso tostado profundo (barra superior de anuncios) | Superficie | N/A | Base oscura |
| `--color-top-strip-text` | `#faf7f2` | Marfil cálido (texto barra superior) | Sobre `#1a1512` | **15.6:1** | ✅ AAA |
| `--color-header-bg` | `#261e1b` | Espresso mate institucional (navbar / topbar interna) | Superficie | N/A | Base oscura |
| `--color-header-text` | `#faf7f2` | Marfil cálido (texto e iconos de header) | Sobre `#261e1b` | **13.8:1** | ✅ AAA |
| `--color-accent-terracotta` | `#c98a7b` | Terracota suave (OFERTAS, badges, foco, estados activos) | Sobre `#261e1b` | **5.76:1** | ✅ AA ($\ge 4.5:1$) |
| `--bg-page` | `#f4f0ea` | Beige piedra cálido (fondo general de la aplicación) | Superficie | N/A | Base clara |
| `--color-surface-card` | `#faf7f2` | Marfil cálido (tarjetas, modales, drawers) | Sobre `#f4f0ea` | N/A | Jerarquía visual |
| `--color-border-subtle` | `#d6cec2` | Borde piedra sutil (separadores y contenedores) | Sobre `#faf7f2` / `#f4f0ea` | N/A | Separador |
| `--color-border-strong` | `#7a6f68` | Borde de controles interactivos e inputs | Sobre `#f4f0ea` / `#ffffff` | **3.2:1** | ✅ WCAG 1.4.11 ($\ge 3:1$) |
| `--color-ink` | `#261e1b` | Texto primario sobre fondos claros | Sobre `#f4f0ea` / `#faf7f2` | **14.2:1** | ✅ AAA |
| `--color-ink-muted` | `#574c46` | Texto secundario y leyendas | Sobre `#f4f0ea` / `#faf7f2` | **7.1:1** | ✅ AAA |
| `--color-success-ok` | `#23684a` | Verde bosque accesible (stock normal, envío gratis, OK) | Sobre `#faf7f2` | **> 4.5:1** | ✅ AA |
| `--color-warning-low` | `#8d4f10` | Ámbar tierra accesible (stock bajo $\le 5$, alerta) | Sobre `#faf7f2` | **> 4.5:1** | ✅ AA |
| `--color-danger-err` | `#a32222` | Carmín terroso accesible (agotado, error, bloqueo) | Sobre `#faf7f2` | **> 4.5:1** | ✅ AA |

### 2.2 Tokens Complementarios Verificados en `:root` (`tokens.css:14-101`)

En `:root` se declaran **35 custom properties** propias. Además de los 14 tokens principales anteriores, el sistema utiliza estos 21 tokens adicionales:

| Categoría | Token (`:root`) | Valor Exacto | Línea en `tokens.css` | Uso |
|---|---|---|---|---|
| **Navbar / Transparencia** | `--color-header-bg-translucent` | `rgba(38, 30, 27, 0.96)` | `14` | Fondo inicial de `.io-header` con `blur(10px)` |
| | `--color-header-bg-scrolled` | `rgba(38, 30, 27, 0.84)` | `15` | Fondo de `.io-header.is-scrolled` con `blur(16px)` |
| | `--color-header-text-muted` | `rgba(250, 247, 242, 0.72)` | `18` | Textos secundarios sobre header espresso |
| | `--color-header-divider` | `rgba(250, 247, 242, 0.1)` | `19` | Borde inferior y divisores en header |
| **Primario & Acentos** | `--color-primary-espresso` | `#261e1b` | `22` | Primario institucional y botones principales |
| | `--color-primary-hover` | `#3d312c` | `24` | Hover sobre botones/elementos espresso |
| | `--color-accent-terracotta-hover` | `#b8796a` | `28` | Hover sobre acento terracota |
| | `--color-accent-ink` | `#1a1512` | `29` | Texto oscuro sobre superficie terracota (`::selection`, badges) |
| **Superficies** | `--color-surface-bg` | `#f4f0ea` | `35` | Alias de `--bg-page` |
| | `--color-surface-white` | `#ffffff` | `38` | Inputs, tarjetas activas y hojas de impresión |
| | `--color-surface-subtle` | `#ede7de` | `39` | Cabeceras suaves de tabla y bloques secundarios |
| **Fondos / Bordes Semánticos** | `--color-success-bg` | `#eef5f1` | `57` | Fondo de alerta/etiqueta positiva |
| | `--color-success-border` | `rgba(35, 104, 74, 0.35)` | `58` | Borde de estado positivo |
| | `--color-warning-bg` | `#f8f1e6` | `61` | Fondo de alerta preventiva |
| | `--color-warning-border` | `rgba(141, 79, 16, 0.4)` | `62` | Borde de alerta preventiva |
| | `--color-danger-bg` | `#f9eded` | `65` | Fondo de error / bloqueo |
| | `--color-danger-border` | `rgba(163, 34, 34, 0.38)` | `66` | Borde de error / bloqueo |
| | `--color-terracotta-soft` | `rgba(201, 138, 123, 0.16)` | `67` | Resaltado suave de selección activa |

*(Los tokens de tipografía, geometría, movimiento, sombras, foco y `--header-h` completan los 35 tokens en §5).*

### 2.3 Sobrescrituras Nativas de Bootstrap 5.3 (`tokens.css:104-114`)

Bootstrap `^5.3.3` recibe **11 sobrescrituras** directas en `:root` para evitar estilos azules por defecto:

| Variable Bootstrap | Valor Asignado | Variable Bootstrap | Valor Asignado |
|---|---|---|---|
| `--bs-primary` | `#261e1b` | `--bs-border-radius` | `4px` |
| `--bs-primary-rgb` | `38, 30, 27` | `--bs-border-radius-sm` | `2px` |
| `--bs-body-bg` | `#f4f0ea` | `--bs-border-radius-lg` | `8px` |
| `--bs-body-color` | `#261e1b` | `--bs-link-color` | `#261e1b` |
| `--bs-border-color` | `#d6cec2` | `--bs-link-hover-color` | `#574c46` |
| `--bs-secondary-color` | `#574c46` | | |

> **Nota técnica sobre tokens no declarados en `:root`:** En `tokens.css` **no existen** custom properties `--font-mono`, `--space-*` ni `--z-*`. Las fuentes monoespaciadas usan el valor literal `'ui-monospace, SFMono-Regular, Menlo, monospace'` (`storefront.css:918, 3158` y `pos.css:124, 410`), y el espaciado/`z-index` se declaran localmente por componente (ver §5.2).

---

## 3. Accesibilidad Universal WCAG 2.1 AA y Frontera de Alcance (`24/11/2026`)

### 3.1 Separación por Audiencia (`AN01` Comprador vs. Personal Interno)

Conforme al ajuste de alcance registrado el `24/11/2026` y verificado directamente en CSS/HTML/TS:

| Superficie / Archivo HTML | Clase `<body>` | Inclusión Visual Activa (`RN-ACC-*`) | Exclusiones Verificadas en Código |
|---|---|---|---|
| **Tienda Comprador** (`index.html`) | `io-storefront` | Interruptor **Daltonismo y Lectura Ampliada** (`io-mode-colorblind` guardado en `localStorage` `io_colorblind_mode`), 6 texturas SVG en colores, `@media (prefers-contrast: more)`, regiones `aria-live`, `prefers-reduced-motion`, foco reforzado. | Carece actualmente de `.skip-link` en el DOM (ver §3.2 y reporte R1). |
| **Acceso Unificado** (`acceso.html`) | `io-access-page` | `.skip-link` (`#acceso-principal`), pestañas `role="tablist"` con navegación por flechas (`ArrowLeft/Right/Home/End`), `aria-live="polite"` y `role="alert"`, `prefers-reduced-motion`. | Sin switch de daltonismo, sin texturas SVG, sin `@media (prefers-contrast: more)`. |
| **Vistas Internas** (`pos-vendedor.html`, `pos-cajero.html`, `almacen.html`, `marketing.html`, `admin.html`, `zona-preparacion.html`) | `pos-body io-internal-page` (o `io-internal-page`) | Misma estética **Espresso & Piedra**, foco `:focus-visible`, `@media (prefers-reduced-motion: reduce)` y atajos de teclado operativos (`F2`–`F8`, `Esc`, `R`, `↑/↓`). | **Cero** Okabe-Ito, **cero** `io-mode-colorblind`, **cero** texturas SVG, **cero** `prefers-contrast: more`, **cero** `aria-live` / `role="alert"` / `.skip-link`. |

### 3.2 Principios Implementados y Comportamiento Real Verificado

1. **Uso del Color y Modo Daltonismo (`WCAG 1.4.1` / `RN-ACC-02`):**
   - El enlace **OFERTAS** en el header combina texto, color terracota `--color-accent-terracotta` (`#c98a7b`), punto indicador circular `.io-nav-indicator-dot` y subrayado permanente (`storefront.css`).
   - El selector de color de prendas **siempre** muestra el **Nombre Textual** del color.
   - Las **6 texturas/tramas SVG** (`solido`, `jaspeado`, `raya-fina`, `diagonal`, `punteado`, `cuadricula` en `productCatalog.ts:10-78` y `store.types.ts:1-7`) y las etiquetas textuales `color_textura` se renderizan **únicamente** cuando el usuario activa el interruptor **Daltonismo y Lectura Ampliada** (`body.io-storefront.io-mode-colorblind`).
   - Al activarse `io-mode-colorblind` (`storefront.css:3362-3520`), la tienda aplica fondo `#000000`, texto/bordes/foco `#FFFF00`, texto secundario `#FFFFFF`, incremento tipográfico base a `font-size: 1.125rem; line-height: 1.65;`, bordes de `2px solid`, subrayado `2.5px` (`underline-offset: 4px`) en enlaces y ampliación de muestras (`26px` en tarjeta, `22px` extra, `32px` en modal de detalle).
2. **Contraste No Textual (`WCAG 1.4.11`):**
   - Inputs, selectores y controles Bootstrap heredan `--color-border-strong: #7a6f68` ($\ge 3.0:1$ sobre `#f4f0ea` y `#ffffff`, `tokens.css:181-188`).
3. **Foco Visible Doble (`WCAG 2.4.7` / `RN-ACC-03`):**
   - Modo estándar (`tokens.css:162-178`): `outline: 2px solid #c98a7b` (`--focus-ring`) con `outline-offset: 2px` (`--focus-offset`) y banda interior `box-shadow: 0 0 0 2px #261e1b` (`--focus-inner`) para garantizar contraste $\ge 3:1$ sobre fondos claros y oscuros.
   - En `prefers-contrast: more` e `.io-mode-colorblind` (`tokens.css:249-251`, `storefront.css:3397-3399`): `outline: 3px solid #ffff00` y `--focus-inner: 0 0 0 2px #000000`.
4. **Soporte Nativo de Alto Contraste del SO (`prefers-contrast: more`, `tokens.css:219-293`):**
   - Aplicado exclusivamente a `body.io-storefront` sin barras flotantes: redefine superficies a `#000000`, tinta y bordes a `#FFFF00` (`19.56:1`), texto atenuado a `#FFFFFF`, éxito `#7dffb3`, peligro `#ff8a8a`, elimina sombras (`none`) e invierte `.btn-close`.
5. **Reducción de Movimiento (`prefers-reduced-motion: reduce`, `tokens.css:296-307`):**
   - Regla global para toda la aplicación que fuerza `animation-duration: 0.01ms !important`, `transition-duration: 0.01ms !important` y `scroll-behavior: auto !important`, neutralizando además el zoom Ken Burns del hero (`storefront.css:1027-1032`).
6. **Objetivos Táctiles — Valores Nominales vs. Medición Real en CSS (`WCAG 2.5.5` / `2.5.8`):**
   - Aunque `tokens.css:78-80` define `--touch-min: 44px` y `--touch-tactile: 48px`, la auditoría directa sobre CSS revela controles cumplidores y controles puntuales por debajo de ese umbral:

| Contexto | Controles que SÍ cumplen ($\ge 44\text{ px}$ / $\ge 48\text{ px}$) | Controles medidos por debajo del umbral (Brecha CSS documentada) |
|---|---|---|
| **Tienda (`storefront.css`)** | `.io-size-btn` y `.io-color-option` (`48px` alto), inputs Bootstrap (`.form-control`/`.form-select` `44px`), botones primarios de modal/drawer (`>= 44px`). | `.io-color-circle-btn.is-extra` (`18px` + inset `-11px` = `40×40px`, `L1923,1977`); `.io-cat-chip` (`min-height: 40px`, `L1540`); `.io-showcase-tab` (`min-height: 40px`, `L2625`); `.io-carousel-dot` (área `22×40px` / `38×40px`, `L1300-1318`); `.io-footer-link` / `.io-menu-link` / `.io-link-inline-btn` (sin `min-height: 44px`). |
| **Acceso (`access.css`)** | `.io-access-submit` (`48px`), `.io-role-option` (`min-height: 82px`, `L388`), `.io-access-secondary-btn` y `.io-pending-logout-btn` (`44px`). | Sin brechas críticas en acciones principales. |
| **POS / Interno (`pos.css`, `admin.css`)** | `.pos-btn-lg` y `.pos-method-btn` (`48px`, `--touch-tactile`), botones principales/tabs de `admin.css` (`44px`, `--touch-min`). | `.pos-btn-md` y `.pos-seg-btn` (`38px`); `.pos-topbar-btn` (`36px`); `.pos-qty-btn` (`36×36px`); `.pos-nav-tab` (`34px`); `.pos-color-select` (`32px`); `.pos-variant-pill` (`30px`); `.adm-sev-tab` y `.adm-area-select` (`34px`). *(Botones de `admin.css` operan a `44px`, no `48px`)*. |

---

## 4. Componentes de Tienda (`storefront.css`)

* **Barra de anuncios + Header / Navbar:** barra `#1a1512` con `Envío GRATIS en compras mayores a S/ 150`; navbar `#261e1b` (con `rgba(38,30,27,0.96)` y `blur(10px)`) con enlaces `HOMBRE`, `MUJER`, `NIÑOS` y `OFERTAS` (con `.io-nav-indicator-dot`), más acciones de Búsqueda, Favoritos, Cuenta y Bolsa (con contador `.io-bag-badge`).
* **Hero Banner / Carrusel:** *scrim* lateral degradado `rgba(24,19,16,0.92)` → `rgba(26,21,18,0.78)` → transparente (`storefront.css:1040-1046`) para legibilidad sobre fotografía (`object-fit: contain` en desktop y `cover` en móvil `< 768px` según `L1336`), con titular `Cormorant Garamond` y CTA rectangular marfil `#faf7f2`.
* **Categorías y Vitrinas:** fotografía `4:5`, esquinas `--radius-lg` (`8px`), `--shadow-warm-sm`, título editorial con flecha `→`; tarjetas de producto con botón de favoritos, selector de talla/color y modal de detalle.
* **Bolsa de Compras (Drawer):** temporizador regresivo de 15 minutos (`role="timer"`, actualizado por nodo sin re-renderizar el panel completo), barra de progreso para envío gratis `> S/ 150` y casilla *opt-in* desmarcada por defecto (`RN-MKT-03`).

---

## 5. Tipografía, Geometría, Movimiento y Escala `z-index`

### 5.1 Tokens Verificados (`tokens.css:70-101`)

| Token (`tokens.css`) | Valor Exacto | Uso |
|---|---|---|
| `--font-sans` | `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Interfaz, formularios, tablas, precios, POS/Almacén/Admin |
| `--font-display` | `'Cormorant Garamond', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif` | Titulares editoriales: hero, secciones, títulos de producto, drawers y topbar |
| *(Monoespaciado local)* | `ui-monospace, SFMono-Regular, Menlo, monospace` | Códigos/SKU/correlativos (`storefront.css:918,3158` y `pos.css:124,410`; no es variable `:root`) |
| `--radius-xs` / `--radius-sm` / `--radius-md` / `--radius-lg` | `2px` / `4px` / `4px` / `8px` | Barras de progreso / botones, inputs, chips / tarjetas y modales |
| `--touch-min` / `--touch-tactile` | `44px` / `48px` | Mínimo WCAG general / controles táctiles principales |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Curva única de transición |
| `--dur-fast` / `--dur-base` / `--dur-slow` | `160ms` / `280ms` / `560ms` | Micro-estados / transiciones estándar / entradas de vista |
| `--shadow-warm-sm` / `-md` / `-lg` | Sombras espresso cálidas (`tokens.css:89-91`) | Profundidad por capas en tarjetas, drawers y modales |
| `--focus-color` / `--focus-ring` / `--focus-offset` / `--focus-inner` | `#c98a7b` / `2px solid var(--focus-color)` / `2px` / `0 0 0 2px #261e1b` | Anillo doble `:focus-visible` |
| `--header-h` | `68px` (`56px` en `.io-header.is-scrolled`) | Altura dinámica del header de tienda |

### 5.2 Carga de Google Fonts por Tipo de Vista (`frontend/*.html`)

| Grupo de Páginas HTML | Familias y Pesos Cargados |
|---|---|
| `index.html`, `acceso.html`, `zona-preparacion.html` | `Cormorant Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600` + `Inter:wght@400;500;600;700` |
| `pos-vendedor.html`, `pos-cajero.html`, `almacen.html`, `marketing.html`, `admin.html` | `Cormorant Garamond:wght@500;600;700` + `Inter:wght@400;500;600;700` (sin itálicas) |

### 5.3 Escala `z-index` Verificada en CSS

*(Declarada localmente por componente; no existe `--z-*` en `:root`)*:

| Capa / Selector | Archivo y Línea | `z-index` |
|---|---|---|
| `.skip-link` | `tokens.css:147` | `2000` |
| `.io-modal` | `storefront.css` | `1055` |
| `.io-drawer-panel`, `.io-mobile-nav-drawer` | `storefront.css` | `1050` |
| `.io-drawer-backdrop` | `storefront.css` | `1040` |
| `.io-mobile-bottom-nav` | `storefront.css` | `1030` |
| `.io-header` | `storefront.css:121` | `1020` |
| `.io-megamenu-panel`, `.io-dropdown-panel` | `storefront.css` | `1019` |
| `.alm-doc-backdrop` | `almacen.css:113` | `600` |
| `.pos-modal-backdrop` | `pos.css` | `500` |
| `.pos-drawer-backdrop` | `pos.css` | `450` |
| `.pos-topbar` | `pos.css:47` | `100` |
| `.pos-table th` | `pos.css` | `2` |

---

## 6. Micro-interacciones y Acabados Verificados (`storefront.css`)

* **Header dinámico (`storefront.css:114-145`):** al superar `24px` de scroll adopta `.is-scrolled` (`--header-h: 56px`, fondo `rgba(38, 30, 27, 0.84)`, `backdrop-filter: blur(16px) saturate(1.2)` y sombra cálida); vuelve al estado base (`68px`, `rgba(38, 30, 27, 0.96)`, `blur(10px) saturate(1.1)`) por debajo de `8px`.
* **Navegación:** subrayado animado en enlaces principales y desplazamiento sutil en menús desplegables; **OFERTAS** conserva el punto `.io-nav-indicator-dot` + subrayado permanente.
* **Tarjetas (elevaciones reales):**
  * `.io-category-tile`: `translateY(-3px)` (`storefront.css:1454`).
  * `.io-product-card`: `translateY(-4px)` (`storefront.css:1592`).
  * `.io-brand-card`: `translateY(-2px)` (`storefront.css:2994`).
* **Hero Ken Burns (`storefront.css:1017-1025, 1065-1069`):** zoom lento de `transform: scale(1)` → `scale(1.045)` en `7s linear` (anclado en `transform-origin: right center`), mientras la capa editorial `.io-carousel-overlay` aparece con `transition-delay: 0.25s`.
* **Drawers y modales (`storefront.css:2210-2228`, `main.ts:386`):** cierre animado `.is-closing` de `220ms` en `.io-drawer-panel` / `.io-mobile-nav-drawer` y `200ms` en `.io-drawer-backdrop` / `.io-modal`, bloqueo `io-scroll-lock` en `<body>` y retorno de foco en `main.ts:696-708`.
* **Temporizador de reserva:** nodo dedicado `role="timer"` actualizado sin re-renderizar todo el drawer.

---

## 7. Logo de Marca y Activos Gráficos Reales (`public/img/`)

El logo se conecta a `frontend/src/data/imageSlots.ts` (`IMAGE_SLOTS['brand-logo']`) y es gestionado por `frontend/src/render/brand.ts` (o `<img src="/img/brand/logo-io.png">` directo en vistas operativas como `vendedorMain.ts:219` y `productCatalog.ts:96`).

| Elemento | Realidad Verificada en Disco y CSS |
|---|---|
| **Archivo activo en disco** | `frontend/public/img/brand/logo-io.png` (`8,686 B`). **`logo-io.svg` NO existe en disco** (`brand.ts` intenta `.svg` primero según `imageSlots.ts:19-20` y cae automáticamente a `logo-io.png`). |
| **Alturas y anchos máximos reales en CSS** | • Tienda (`storefront.css:193-195, 204`): `height: 30px` (`26px` en `.is-scrolled`), `max-width: 150px`.<br>• Acceso (`access.css:61-63`): `height: 36px`, `max-width: 170px`.<br>• POS / Interno (`pos.css:65-67`): `height: 24px`, `max-width: 120px`. |
| **Fallback en tarjetas sin foto de producto** | • Tienda (`.io-product-logo-fallback`, `storefront.css:1631`): logo centrado en bloque `84×84px`.<br>• POS (`.pos-thumb-logo-fallback`, `pos.css:794, 808`): `max-height: 28px`. |
| **Categorías (`public/img/categorias/`)** | 8 archivos reales en `.WebP` (extensión en mayúsculas): `accesorios.WebP`, `calzado.WebP`, `casacas.WebP`, `conjuntos.WebP`, `pantalones.WebP`, `prendas-superiores.WebP`, `sports.WebP`, `vestidos.WebP`. |
| **Ofertas Hero (`public/img/ofertas/`)** | 4 archivos reales: `oferta-01.WebP`, `oferta-02.WebP`, `oferta-03.WebP`, `oferta-04.png`. |
| **Productos y Colecciones** | `public/img/productos/` solo contiene `.gitkeep` (vacío); `public/img/colecciones/` **no existe en disco** (`collectionBanners.ts:35` usa fondo tipográfico `.io-collection-architectural-bg`). |

---

## 8. Sistema Interno Operativo y de Impresión (`access.css`, `pos.css`, `almacen.css`, `marketing.css`, `admin.css`)

Las vistas de personal interno mantienen la **misma casa Espresso & Piedra** sin componentes exclusivos del comprador (`io-mode-colorblind`, texturas SVG ni `aria-live`):

1. **`access.css` (`773` líneas — `acceso.html`, `zona-preparacion.html`):**
   - Layout editorial en 2 columnas (`minmax(340px, 42%) 1fr` desde `992px`), panel izquierdo espresso institucional (`#261e1b`) y panel derecho piedra (`#f4f0ea`) con tarjetas de rol `.io-role-option` (`min-height: 82px`).
2. **`pos.css` (`1042` líneas — base común para `pos-vendedor.html`, `pos-cajero.html`, `almacen.html`, `marketing.html`, `admin.html`):**
   - Barra superior compacta `.pos-topbar` (`min-height: 52px`, `z-index: 100`), tipografía base `0.875rem` (`14px`) para alta densidad operativa, tablas con cabeceras sticky (`z-index: 2`), modales (`z-index: 500`) y drawers (`z-index: 450`).
   - Impresión POS (`@media print`, `pos.css:1027-1042`): oculta `.pos-no-print` y prepara `.pos-print-only-target` para emisión de Boleta/Factura/Arqueo.
3. **`almacen.css` (`244` líneas — `almacen.html`):**
   - Franja de pulso de 3 columnas (`.alm-pulse-strip`), espacio maestro-detalle `0.92fr / 1.58fr` con panel de detalle `sticky`.
   - Impresión formal A4: `.alm-doc-backdrop` (`z-index: 600`), `.alm-a4-sheet` (`210mm` × `min-height: 270mm`, padding `16mm 18mm`) y `@page { size: A4 portrait; margin: 12mm; }` para Guía de Envío, Constancia Formal de Préstamo (`RN-PRE-01`) y Acta de Recepción/Reclamo (`RN-COM-04`).
4. **`marketing.css` (`376` líneas — `marketing.html`):**
   - Franja de 5 métricas (`.mkt-pulse-strip`), barra de señales prioritarias y previsualización en proporciones `16/7`, `16/10` y `4/3` (`.mkt-preview-frame`).
   - *Hallazgo registrado en R1:* `marketingMain.ts:1378` utiliza la clase `.alm-doc-backdrop` para el modal de bitácora, pero `marketingMain.ts` no importa `almacen.css` ni `marketing.css` define dicha clase.
5. **`admin.css` (`950` líneas — `admin.html`):**
   - Franja de pulso vital de 3 columnas (`.adm-pulse-grid`), mesa de decisiones `1.15fr / 0.85fr` (`.adm-workspace`), acordeones por área y gráficos de barras en **Espresso (`#261e1b`), Terracota (`#c98a7b`) y Verde Bosque (`#23684a`)**. **No implementa paleta Okabe-Ito ni tramas** en cumplimiento del corte de alcance del `24/11/2026`.
