# Design Canónico — I&O Retail

> Referencia ligera y obligatoria para agentes, skills y cualquier cambio de UI en el workspace raíz.  
> **No redefine el sistema visual:** solo apunta a las fuentes aprobadas y fija la jerarquía de conflictos.

## 1. Fuentes de verdad (Capa 0)

Ante cualquier duda de diseño, stacks o accesibilidad, consulta y respeta **en este orden**:

1. `AGENTS.md` (raíz): gobernanza, stacks aprobados y reglas de negocio/accesibilidad.
2. `frontend/src/styles/tokens.css`: tokens ejecutables de color, tipografía, movimiento, foco y alto contraste.
3. `frontend/docs_ui/guia_estilos_espresso_piedra.md`: guía visual oficial v2.1 (identidad, componentes, micro-interacciones y logo).

**Regla de precedencia:** si una skill, plantilla, librería o recomendación externa contradice estas tres fuentes, **ganan siempre `AGENTS.md`, `tokens.css` y la guía oficial**. Ante un conflicto, detén el cambio y reporta la contradicción; no improvises una paleta, tipografía ni stack alterno.

## 2. Identidad visual oficial: Espresso & Piedra

Retail de moda femenina y unisex en Perú: estética editorial moderna, sobria y premium. Tonos crema, serif editorial y terracota **son identidad oficial**, no un cliché a eliminar.

| Rol | Token / Valor |
|---|---|
| Espresso institucional | `--color-primary-espresso: #261E1B` |
| Espresso tostado (barra superior) | `--color-top-strip-bg: #1A1512` |
| Terracota suave (acentos y OFERTAS) | `--color-accent-terracotta: #C98A7B` |
| Beige piedra cálido (fondo) | `--bg-page: #F4F0EA` |
| Marfil cálido (superficies/texto claro) | `--color-surface-card / --color-header-text: #FAF7F2` |
| Borde fuerte interactivo | `--color-border-strong: #7A6F68` (≥ 3:1) |
| Texto primario sobre claro | `--color-ink: #261E1B` |
| Tipografía de interfaz | `--font-sans: Inter` |
| Tipografía editorial | `--font-display: Cormorant Garamond` |
| Movimiento | `--ease-out`, `--dur-fast/base/slow`; reducir con `prefers-reduced-motion` |

Accesibilidad (WCAG 2.1 AA estricto, con soporte AAA nativo): contraste ≥ 4.5:1 en texto normal; selector de color **Nombre Textual + Textura** (`RN-ACC-02`); foco visible terracota + banda espresso; objetivos táctiles ≥ 44×44 px (48×48 px en POS/Almacén); `aria-live` y operación por teclado donde aplique; escalado fluido en `rem` hasta 200% sin scroll horizontal. En `prefers-contrast: more`, `tokens.css` aplica fondo `#000000`, textos/acentos `#FFFF00` (19.56:1) **sin barras flotantes**.

> Alcance: las reglas de inclusión descritas arriba aplican a páginas del comprador (`AN01`). Las ventanas internas (POS `M01`, almacén, envíos, etc.) priorizan rapidez operativa y no incorporan Modo Daltonismo, texturas ni anuncios `aria-live`, según `ESTADO_GLOBAL_PROYECTO.md` e `inicio.txt`.

## 3. Stack y límites tecnológicos

Stack aprobado y verificado en `frontend/package.json`:

- **Vite 5 + TypeScript 5.6**
- **HTML5 semántico + CSS3 puro**
- **Bootstrap 5.3** (tokens propios sobrescritos en `tokens.css`)

**Prohibido introducir** Tailwind CSS, React, Framer Motion, GSAP, Three.js u otros frameworks/librerías de animación o 3D, salvo aprobación formal de Olver Andrade y Josue Razuri registrada en `ESTADO_GLOBAL_PROYECTO.md`. **No sobreescribir `tokens.css`** con valores de otra paleta ni reemplazar Cormorant Garamond/Inter por tipografías de terceros.

## 4. Uso por skills

Toda skill de diseño o frontend debe iniciar leyendo este archivo y las tres fuentes de la Capa 0. Si una skill externa trae su propio `DESIGN.md`, paleta, tipografía o stack, se ignora esa parte y se conservan solo sus ideas de proceso (auditoría, checklist, pasos de revisión) siempre que no contradigan este documento.
