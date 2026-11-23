# 🎨 Guía de Estilos UI, Tokens de Diseño y Accesibilidad WCAG 2.1 AA — I&O Retail

> **Versión Oficial:** 2.1 (Aprobada `23/11/2026` — refinamiento visual, micro-interacciones y contrato del logo)  
> **Identidad Visual Oficial:** **Espresso & Piedra (Propuesta 5)**  
> **Cumplimiento de Accesibilidad:** **W3C WCAG 2.1 Nivel AA Estricto** (con soporte nativo `prefers-contrast: more` AAA `19.56:1`)  
> **Autores Exclusivos del Desarrollo Frontend:**  
> 1. **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)**  
> 2. **RAZURI PAREDES, Josue Daniel (`N00421512`)**

---

## 1. Fundamentos de la Identidad Visual (Espresso & Piedra)

La identidad **Espresso & Piedra** proyecta una estética editorial moderna, sobria y premium para retail de moda femenina y unisex en Perú. Combina la calidez orgánica del café espresso con superficies minerales de piedra caliza y toques terracota, garantizando ergonomía de lectura, ausencia de fatiga visual y cumplimiento de accesibilidad universal sin alterar la sofisticación de la marca.

---

## 2. Paleta Cromática y Matriz de Verificación WCAG 2.1 AA

| Rol de Color / Token | Hexadecimal | Nombre / Uso Semántico | Superficie de Contraste | Ratio de Contraste | Cumplimiento WCAG 2.1 |
|---|---|---|---|---|---|
| `--color-top-strip-bg` | `#1A1512` | Espresso tostado profundo (Barra superior de anuncios) | Sobre fondo | N/A | Superficie |
| `--color-top-strip-text` | `#FAF7F2` | Marfil cálido | Sobre `#1A1512` | **15.6:1** | ✅ Pasa WCAG AAA |
| `--color-header-bg` | `#261E1B` | Espresso mate institucional (Navbar) | Sobre fondo | N/A | Superficie |
| `--color-header-text` | `#FAF7F2` | Marfil cálido (Texto e iconos header) | Sobre `#261E1B` | **13.8:1** | ✅ Pasa WCAG AAA |
| `--color-accent-terracotta` | `#C98A7B` | Terracota suave (OFERTAS, badges, estados activos) | Sobre `#261E1B` | **5.76:1** | ✅ Pasa WCAG AA (Req. $\ge 4.5:1$) |
| `--bg-page` | `#F4F0EA` | Beige piedra cálido (Fondo general de la aplicación) | N/A | N/A | Superficie base |
| `--color-surface-card` | `#FAF7F2` | Marfil cálido (Tarjetas, modales, drawers) | Sobre `#F4F0EA` | N/A | Jerarquía visual |
| `--color-border-subtle` | `#D6CEC2` | Borde piedra sutil (Contenedores) | Sobre `#FAF7F2` / `#F4F0EA` | N/A | Separador |
| `--color-border-strong` | `#7A6F68` | Borde de controles interactivos e inputs | Sobre `#F4F0EA` / `#FFFFFF` | **3.2:1** | ✅ Pasa WCAG 1.4.11 ($\ge 3:1$) |
| `--color-ink` | `#261E1B` | Texto primario sobre fondos claros | Sobre `#F4F0EA` / `#FAF7F2` | **14.2:1** | ✅ Pasa WCAG AAA |
| `--color-ink-muted` | `#574C46` | Texto secundario y leyendas | Sobre `#F4F0EA` / `#FAF7F2` | **7.1:1** | ✅ Pasa WCAG AAA |
| `--color-success-ok` | `#23684A` | Verde bosque accesible (Stock normal, envío gratis) | Sobre `#FAF7F2` | **5.5:1** | ✅ Pasa WCAG AA |
| `--color-warning-low` | `#8D4F10` | Ámbar tierra accesible (Stock bajo $\le 5$) | Sobre `#FAF7F2` | **5.1:1** | ✅ Pasa WCAG AA |
| `--color-danger-err` | `#A32222` | Carmín terroso accesible (Agotado, eliminar) | Sobre `#FAF7F2` | **5.9:1** | ✅ Pasa WCAG AA |

---

## 3. Principios de Accesibilidad Estricta (WCAG 2.1 AA)

1. **Uso del Color (WCAG 1.4.1):**  
   * Ningún estado ni distinción recae únicamente en el color.
   * El enlace destacado **OFERTAS** en el menú cuenta con el color terracota acompañado de un **punto indicador circular visible (`.io-nav-indicator-dot`)** y subrayado dinámico.
   * La selección de colores de prendas en el catálogo implementa el **patrón multimodal** (`RN-ACC-02`): **Nombre Textual + Textura/Trama SVG visible** (jaspeado, raya fina, diagonal, punteado, cuadrícula) para usuarios con daltonismo (protanopia, deuteranopia, tritanopia).
2. **Contraste de Elementos No Textuales (WCAG 1.4.11):**  
   * Los bordes de inputs, botones de tallas, opciones de color y controles interactivos emplean `--color-border-strong: #7A6F68` con ratio $\ge 3.0:1$ sobre los fondos de superficie.
3. **Foco Visible Inconfundible (WCAG 2.4.7 / RN-ACC-03):**  
   * Anillo uniforme `:focus-visible` de `2px solid #C98A7B` con `outline-offset: 2px` en enlaces, botones, inputs y selectores.
4. **Objetivos Táctiles y Ergonómicos (WCAG 2.5.5 / 2.5.8):**  
   * Altura y anchura mínima interactiva $\ge 44\times44\text{ px}$ en toda la tienda e-commerce y $\ge 48\times48\text{ px}$ en selectores de talla, color y controles clave.
5. **Geometría Minimalista Rectangular:**  
   * Eliminación de botones píldora circulares amarillos en favor de rectángulos de bordes refinados con esquinas sutiles (`border-radius: 4px`).
6. **Soporte Nativo de Alto Contraste del Sistema Operativo (`prefers-contrast: more`):**  
   * Fondo `#000000`, textos e hipervínculos `#FFFF00` (contraste extremo `19.56:1` AAA) sin requerir widgets ni barras flotantes adicionales.
7. **Reducción de Movimiento (`prefers-reduced-motion: reduce`):**  
   * Desactivación inmediata de zoom y transiciones del carrusel para prevenir mareo o desorientación en usuarios con sensibilidad vestibular.

---

## 4. Componentes Rediseñados

* **Barra de anuncios + Header / Navbar:** barra `#1A1512` con `Envío GRATIS en compras mayores a S/ 150`; navbar `#261E1B` con iconos de trazo fino en el orden Búsqueda, Favoritos, Cuenta y Bolsa (con contador visible). El logo es un contenedor limpio (ver sección 7).
* **Hero Banner / Carrusel:** Scrim lateral `rgba(26,21,18,0.78)` → transparente para contraste perfecto de titulares en serif editorial, y botón de acción rectangular marfil `#FAF7F2` con texto `#261E1B` que invierte colores con suavidad al interactuar.
* **Categorías:** Fotografía protagonista (`4:5`) sin bordes grises ni cajas blancas, esquinas `8px`, sombra cálida, zoom con *overflow hidden* y título serif `#261E1B` con flecha `→`; botón `Todas` sobrio de borde limpio.
* **Bolsa de Compras (Drawer):** Temporizador regresivo de 15 minutos sincronizado con `aria-live`, indicador de envío gratis $\ge \text{S/ } 150$ (`RN-ENV-04`) y casilla *opt-in* desmarcada por defecto (`RN-MKT-03`).

---

## 5. Tokens de Movimiento, Profundidad y Tipografía (v2.1 — `23/11/2026`)

| Token (`tokens.css`) | Valor | Uso |
|---|---|---|
| `--font-sans` | `Inter` | Interfaz, botones, formularios, precios. |
| `--font-display` | `Cormorant Garamond` (500/600/700) | Titulares editoriales: hero, secciones, títulos de producto, drawers y estados vacíos. |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Curva única de todas las transiciones (hover, drawers, menús). |
| `--dur-fast` / `--dur-base` / `--dur-slow` | `160ms` / `280ms` / `560ms` | Micro-estados / transiciones estándar / entradas de vista y drawers. |
| `--shadow-warm-sm` / `-md` / `-lg` | Sombras espresso con baja opacidad | Profundidad de tarjetas y overlays en lugar de bordes duros. |
| `--radius-sm` | `4px` | Botones, inputs y chips. |
| `--radius-lg` | `8px` | Tarjetas de categoría/producto, modales. |
| `--focus-color` / `--focus-inner` | `#C98A7B` / `0 0 0 2px #261E1B` | Anillo de foco doble: terracota exterior + banda espresso interior (asegura $\ge 3:1$ también sobre `#F4F0EA`). |
| `--header-h` | `68px` → `56px` al hacer scroll | Altura dinámica del header. |

> Todas las animaciones y transiciones se reducen a `0.01ms` con `@media (prefers-reduced-motion: reduce)` (definido en `tokens.css`).

---

## 6. Micro-interacciones y Acabados (v2.1)

* **Header dinámico:** al superar 24 px de scroll adopta `.is-scrolled` (altura `56px`, fondo `rgba(38,30,27,0.84)`, `backdrop-filter: blur(16px)` y sombra cálida); vuelve a su estado normal por debajo de 8 px (histéresis anti-parpadeo).
* **Navegación:** subrayado animado desde el centro en los enlaces principales y desde la izquierda en los enlaces de los menús desplegables, con desplazamiento sutil `translateX(3px)`. **OFERTAS** mantiene punto indicador + subrayado permanente (WCAG 1.4.1).
* **Botones:** las flechas (`›`/`→`) se desplazan `4px` en hover; elevación `translateY(-1px)` con sombra cálida en el primario; `:active` con escala `0.985`.
* **Categorías y productos:** zoom de imagen (`1.06x` / `1.05x`) dentro de contenedor `overflow: hidden`, elevación `-3px`, sombra cálida y revelado escalonado (`io-rise`) solo al cambiar de vista.
* **Hero:** fundido de 1.2 s entre slides y zoom lento hacia adentro (`1 → 1.07` en 7 s, estilo Ken Burns) mientras cada slide está visible; el titular y el CTA aparecen con retardo (`0.35s`) al activarse cada slide.
* **Drawers y modales:** apertura con deslizamiento + fundido y **cierre animado** (`.is-closing`, 220 ms) antes de desmontar; bloqueo de scroll del cuerpo (`io-scroll-lock`), foco automático al botón de cierre y retorno del foco al control que abrió el panel.
* **Carga y estados vacíos:** *shimmer* discreto bajo las fotografías mientras cargan; estados vacíos (bolsa, deseados, sin resultados) con icono, título editorial y acción de salida.
* **Temporizador de reserva (RN-ECO-03):** se actualiza por nodo (`role="timer"`), sin re-renderizar el drawer, por lo que no pierde el foco ni repite animaciones.

---

## 7. Logo de Marca (sin diseño propio — contenedor listo)

El logo **no está diseñado** en el código: el header solo contiene un contenedor limpio, sin marco ni adornos, conectado a `frontend/src/data/imageSlots.ts` (`IMAGE_SLOTS['brand-logo']`) y renderizado por `frontend/src/render/brand.ts`.

| Elemento | Valor |
|---|---|
| **Carpeta** | `frontend/public/img/brand/` |
| **Archivo principal esperado** | `logo-io.svg` (servido como `/img/brand/logo-io.svg`) |
| **Alternativa automática** | `logo-io.png` (se usa si no existe el SVG) |
| **Formato recomendado** | SVG con fondo transparente; si es PNG, transparente a `360 x 80 px` (@2x) |
| **Altura renderizada** | `40 px` (`34 px` con el header compacto), ancho automático, máximo `180 px` |
| **Proporción ideal** | Horizontal, entre `3:1` y `4.5:1` (p. ej. `180 x 40`) |
| **Color** | Versión **clara/marfil** (`#FAF7F2`): el header es espresso `#261E1B` |
| **Fallback** | Si no existe ningún archivo, se muestra el texto simple `I&O` |
