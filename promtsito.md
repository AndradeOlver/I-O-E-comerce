Actúa como arquitecto Frontend, diseñador UI/UX senior y especialista en accesibilidad **WCAG 2.1 Nivel AA** dentro de este workspace (`I&O E-Comerce`). Antes de editar, revisa `AGENTS.md`, `ESTADO_GLOBAL_PROYECTO.md` y la estructura actual de `frontend/` (no modifiques nada dentro de `documentos/`).

Tu objetivo es refinar y elevar el diseño de toda la tienda (`frontend/`) tomando como base fiel la estética **Espresso & Piedra** (minimalismo cálido, editorial y contemporáneo), corrigiendo los detalles estructurales pendientes y aplicando micro-interacciones y acabados visuales de alta calidad.

### 1. Paleta Oficial y Estructura Base (WCAG 2.1 AA)
Asegura consistencia total en `frontend/src/styles/tokens.css`, `storefront.css` y todos los módulos de `frontend/src/render/`:
- **Barra superior de anuncios (obligatoria):** Mantén visible la barra superior (`Envío GRATIS mayores a S/ 150`) en espresso tostado profundo (`#1A1512`) con texto marfil (`#FAF7F2`) y separación sutil respecto al navbar.
- **Navbar principal:** Fondo espresso mate (`#261E1B`) con enlaces e iconos de trazo fino en marfil (`#FAF7F2`).
  - **Enlace `OFERTAS`:** En terracota suave (`#C98A7B`, contraste > 5.5:1 sobre `#261E1B`) acompañado de un indicador visual adicional (subrayado sutil, punto o micro-etiqueta) para cumplir WCAG 1.4.1 sin depender solo del color.
  - **Iconos de utilidad (derecha):** Respeta el orden clásico de izquierda a derecha: **Búsqueda, Favoritos, Cuenta y Bolsa/Carrito**, conservando visible el contador numérico del carrito en tono terracota/marfil con buen contraste.
- **Sección Hero / Carrusel:** Degradado lateral cálido desde la izquierda (`rgba(26, 21, 18, 0.78)` hacia transparente) para garantizar lectura nítida del titular en `#FAF7F2`. Botón CTA rectangular de esquinas sutiles (`border-radius: 4px`) en marfil (`#FAF7F2`) con texto `#261E1B` y sombra ligera.
- **Fondo y Tarjetas de Categorías:** Fondo general en beige piedra cálido (`#F4F0EA`). Elimina por completo los bordes grises duros y las cajas blancas inferiores que cortan las fotografías; las tarjetas deben integrarse limpiamente sobre el fondo con esquinas suaves, fotografía protagonista y tipografía en `#261E1B` (con botón `Todas` sobrio de bordes limpios).
- **Vistas internas y componentes:** Extiende la misma coherencia visual a catálogo, página de categoría, drawer del carrito, paneles de cuenta, modales, filtros y botones primarios (`#261E1B` con texto `#FAF7F2`, `border-radius: 4px`), eliminando cualquier rastro de azul marino o amarillo.

### 2. Manejo del Logo (NO diseñar ni inventar logo)
- **Ignora el diseño del logo:** No dibujes un SVG personalizado ni agregues cajas, bordes o adornos alrededor de la marca.
- Deja únicamente el contenedor limpio en la esquina superior izquierda del header conectado a `frontend/src/data/imageSlots.ts` (o directamente a un `<img>` limpio sin marco con un fallback de texto simple `I&O` mientras no exista el archivo).
- **Entregable obligatorio al final:** Indícame explícitamente la **ruta exacta de la carpeta** (por ejemplo, `frontend/public/img/brand/`), el **nombre de archivo exacto** que espera el código, el **formato recomendado** (SVG/PNG transparente) y la **altura o proporción ideal** para que yo solo coloque mi logo ahí y funcione automáticamente.

### 3. Libertad Creativa en Efectos, Micro-interacciones y Detalles
Tienes libertad creativa para elevar la percepción de marca agregando detalles sutiles y pulidos que encajen con una tienda de moda minimalista (siempre respetando `@media (prefers-reduced-motion: reduce)` y sin recargar la interfaz):
- **Header dinámico:** Efecto sutil de translucidez (`backdrop-filter: blur`) o cambio ligero de elevación/altura al hacer scroll.
- **Interacciones de navegación y botones:** Subrayados animados desde el centro o la izquierda en los links del menú, desplazamiento sutil de las flechas (`>` / `→`) en botones y tarjetas, y estados `hover`/`active` con transiciones fluidas (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Tarjetas de categorías y productos:** Zoom suave de la imagen dentro de `overflow: hidden` al hacer hover, aparición fluida de acciones rápidas o indicadores, y profundidad sutil con sombras cálidas en lugar de bordes duros.
- **Carrusel, Drawers y Modales:** Transiciones suaves entre slides del hero, animaciones limpias de apertura/cierre del carrito y paneles, y anillos de enfoque accesibles (`:focus-visible` en `#C98A7B`) bien integrados al estilo.
- Cualquier otro micro-detalle visual (espaciados editoriales, tipografía, divisores finos, estados vacíos o loaders) que haga sentir la tienda como una marca real de moda contemporánea.

### 4. Documentación y Verificación
- Actualiza `frontend/docs_ui/`, `frontend/README.md` y `ESTADO_GLOBAL_PROYECTO.md` para dejar documentada esta paleta oficial, los tokens WCAG 2.1 AA y la ruta configurada para el logo.
- Ejecuta la compilación (`npm run build` / `tsc` en `frontend/`) para verificar cero errores.
- Al terminar, entrégame:
  1. La ruta exacta, nombre de archivo y medidas recomendadas para subir mi logo.
  2. Un resumen breve de los cambios realizados y los efectos/detalles extra que agregaste.