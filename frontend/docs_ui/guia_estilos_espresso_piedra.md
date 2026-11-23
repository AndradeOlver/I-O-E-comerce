# 🎨 Guía de Estilos UI, Tokens de Diseño y Accesibilidad WCAG 2.1 AA — I&O Retail

> **Versión Oficial:** 2.0 (Aprobada `23/11/2026`)  
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
| `--color-accent-terracotta` | `#C98A7B` | Terracota suave (OFERTAS, badges, estados activos) | Sobre `#261E1B` | **5.8:1** | ✅ Pasa WCAG AA (Req. $\ge 4.5:1$) |
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

* **Header / Navbar:** Logo institucional `I&O` limpio en sans-serif geométrica (#FAF7F2) sin bordes ficticios, navegación compacta y menú desplegable accesible.
* **Hero Banner / Carrusel:** Scrim lateral degradado con origen en `#1A1512` para contraste perfecto de titulares, y botón de acción rectangular marfil `#FAF7F2` con texto `#261E1B` que invierte colores con suavidad al interactuar.
* **Categorías:** Fotografía limpia con efecto *overflow hidden*, zoom delicado `1.03x` y tipografía inferior `#261E1B` con flecha `→`.
* **Bolsa de Compras (Drawer):** Temporizador regresivo de 15 minutos sincronizado con `aria-live`, indicador de envío gratis $\ge \text{S/ } 150$ (`RN-ENV-04`) y casilla *opt-in* desmarcada por defecto (`RN-MKT-03`).
