---
name: io-design-system
description: Fuente de verdad operativa para diseñar, revisar o corregir cualquier interfaz del proyecto I&O (web, POS, tienda, dashboard). Usar SIEMPRE antes de escribir CSS/HTML/TS de UI, elegir colores, tipografías, espaciado, iconos, estados o movimiento, y al auditar una pantalla que parezca genérica. Garantiza la identidad Espresso & Piedra, el stack Vite + TypeScript + Bootstrap 5.3 y WCAG 2.1 AA sin importar skills externas.
---

# io-design-system — I&O Retail

Skill propia del workspace. No es un catálogo de estilos: es el **contrato** que impide que una skill externa, un modelo o una plantilla redefina la identidad del proyecto.

## 0. Precedencia / Capa 0 (innegociable)

Antes de cualquier decisión visual o de stack, **leer y respetar**:

1. `AGENTS.md` (raíz) — gobernanza, stacks, CUN/RN y reglas de accesibilidad.
2. `frontend/src/styles/tokens.css` — tokens ejecutables (color, tipografía, foco, movimiento, alto contraste).
3. `frontend/docs_ui/guia_estilos_espresso_piedra.md` — guía oficial v2.1 (Espresso & Piedra).
4. `DESIGN.md` (raíz) — resumen puente y jerarquía de conflictos.

**Regla de resolución:** si cualquier regla externa (otra skill, `frontend-design`, Addy Osmani, plantillas, librerías, referencias de internet) contradice tokens, guía, `DESIGN.md` o el stack aprobado, **prevalecen siempre los tokens y la guía oficial**. No se negocia: se detiene el cambio y se reporta el conflicto. Nunca se inventa una paleta, tipografía o framework alterno.

## 1. Stack permitido

`Vite + TypeScript + HTML5 semántico + CSS3 puro + Bootstrap 5.3` (verificado en `frontend/package.json`).

Prohibido introducir sin aprobación formal: **Tailwind CSS, React, Framer Motion, GSAP, Three.js**, Angular, Vue, u otras librerías de animación/3D. No sobreescribir `tokens.css` con otra paleta ni sustituir `Inter` / `Cormorant Garamond`. Usar los tokens de Bootstrap ya sobrescritos en `tokens.css`.

## 2. Identidad Espresso & Piedra (resumen operativo)

- Espresso institucional `#261E1B`; barra superior `#1A1512`; terracota `#C98A7B`; fondo piedra `#F4F0EA`; marfil `#FAF7F2`; borde fuerte `#7A6F68`.
- Tipografías: `Inter` (UI) y `Cormorant Garamond` (display/editorial).
- **Tonos crema, serif y terracota son la identidad aprobada**: no se tratan como clichés ni se prohíben.
- Foco: anillo terracota + banda espresso (`:focus-visible`). Esquinas `4px` en controles y `8px` en tarjetas. Sombras cálidas, no bordes duros ni glows.
- Movimiento: una sola curva (`--ease-out`), sin `animate-pulse` decorativo, sin rebotes; `prefers-reduced-motion` anula transiciones.
- Alto contraste nativo (`prefers-contrast: more`): fondo `#000000`, textos/acentos `#FFFF00` (19.56:1), sin widgets flotantes. `#000000` **es obligatorio** en ese modo; no se prohíbe.
- Accesibilidad buyer (`AN01`): contraste ≥ 4.5:1, selector multimodal **Nombre + Textura** (`RN-ACC-02`), teclado + WAI-ARIA/`aria-live`, targets ≥ 44×44 px (48×48 en POS/Almacén), escalado `rem` al 200%.
- Alcance: reglas de inclusión aplican a páginas del comprador. Ventanas internas (POS `M01`, almacén, etc.) priorizan rapidez: sin Modo Daltonismo, texturas ni `aria-live`.

## 3. Flujo de trabajo

### 3.1 Tesis visual antes de tocar código

Escribe 3–5 líneas: (1) qué es la pantalla y para quién, (2) carácter concreto (no "limpio/moderno/mínimo"), (3) acento derivado de la identidad, (4) detalle distintivo I&O, (5) patrón a rechazar (ej. "tres tarjetas iguales", "hero centrado genérico"). Si el usuario propone una dirección que contradice la Capa 0, explícalo y respeta la guía.

### 3.2 Checklist pre-emisión (web / POS / tienda)

Revisar **antes** de entregar cualquier cambio de UI:

- [ ] Leí `tokens.css` y la guía; no introduje hex, fuentes ni espaciados arbitrarios fuera del sistema.
- [ ] No hay gradientes purple/índigo, glows, blobs, 3D decorativo ni `backdrop-filter` ornamental (el blur del header es el único autorizado por la guía).
- [ ] No hay "card soup", tres tarjetas idénticas ni hero centrado con tres features; jerarquía basada en contenido real.
- [ ] Iconos: una sola familia (trazo fino consistente); cero emoji como icono; targets del tamaño correcto por audiencia.
- [ ] Copy: verbos concretos, sin "Supercharge/Unlock/Welcome back/AI-powered", sin signos de exclamación ni datos inventados.
- [ ] Tipografía: `Inter` para UI y `Cormorant Garamond` para display; una jerarquía h1→h2→h3 sin saltos; sin versales espaciadas decorativas.
- [ ] Layout: revisado a 375/768/1280 px; sin scroll horizontal al 200% de zoom; densidad POS vs. tienda coherente.
- [ ] Estados: vacío, carga, error, éxito y permisos definidos; errores de negocio en `aria-live`/Poka-Yoke solo donde aplique.
- [ ] Movimiento: una curva, `transform/opacity`, sin pulso decorativo; respeta `prefers-reduced-motion`.
- [ ] Accesibilidad: contraste, color no único indicador, foco visible, teclado, `aria-*`; `#000000`/`#FFFF00` intactos en alto contraste.
- [ ] Stack: sin Tailwind/React/GSAP/Framer/Three; `npm run typecheck` y `npm run build` (o el que exista) ejecutados o declarados como no ejecutables.

### 3.3 Revisión en 8 pasos (audit-first)

Cuando se pida pulir, des-slopear o revisar una pantalla existente, recorrer **en orden**, sin saltar:

1. **Espaciado** — valores a la escala del proyecto (`rem`/tokens), no arbitrarios; padding consistente.
2. **Color** — solo paleta Espresso & Piedra; quitar glows/degradados; verificar contraste real.
3. **Iconografía** — familia única, trazo consistente, sin emoji; `aria-label` en iconos solitarios.
4. **Copy** — eliminar hype y datos inventados; CTAs = verbo + resultado específico; sin mayúsculas decorativas.
5. **Tipografía** — jerarquía y pesos del sistema; sin cursivas en titulares; números tabulares en datos.
6. **Layout** — romper patrones de plantilla; anidar radios correctamente; revisar 375/768/1280.
7. **Estados** — vacío, carga, error, éxito y foco; teclado y lector de pantalla.
8. **Movimiento** — propiedades específicas, una curva, una entrada como máximo; reduced-motion.

Tras los 8 pasos, repetir el checklist. Reportar: hallazgos, corregidos, pendientes y por qué se conserva cada uno.

### 3.4 Aprobación

Pedir aprobación antes de cambios amplios (rediseño de varias vistas, nuevos componentes, cambios de paleta/tipografía o cualquier propuesta que se acerque a la Capa 0). Los ajustes menores y localizados dentro de los tokens pueden aplicarse directamente y reportarse al final.

## 4. Nota sobre skills externas

Las skills técnicas externas (por ejemplo `frontend-ui-engineering` y `web-performance-auditor` de Addy Osmani) aportan **proceso**: verificación, accesibilidad, medición antes de optimizar. Sin embargo, sus ejemplos usan TSX/React/Tailwind y sus checklists pueden citar WCAG 2.2 o targets de 24 px. En I&O esos ejemplos **no son prescriptivos**: se traducen a HTML semántico + CSS3 + Bootstrap 5.3 y se aplica WCAG 2.1 AA con los umbrales de `AGENTS.md` (`RN-ACC-01`–`RN-ACC-06`). Nunca se copia un patrón de framework ajeno al stack.
