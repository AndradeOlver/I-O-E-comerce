# 🎨 Frontend – Sistema Omnicanal I&O (`1.2 frontend/`)

> **Estado Actual:** 🟢 **En desarrollo activo — Stack: Vite + TypeScript + HTML5 Semántico + CSS3 puro + Bootstrap 5.3** — Actualizado el `23/11/2026` en [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md)  
> **Identidad Visual Oficial Vigente:** **Espresso & Piedra (Propuesta 5)** con cumplimiento estricto **W3C WCAG 2.1 Nivel AA**.  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**  
> **Documentación UI Aprobada:** [docs_ui/guia_estilos_espresso_piedra.md](docs_ui/guia_estilos_espresso_piedra.md)

---

## 📂 Organización de esta Carpeta

```text
frontend/
├── docs_ui/                 <-- Guía de Estilos y Tokens WCAG 2.1 AA (Espresso & Piedra)
│   └── guia_estilos_espresso_piedra.md
├── public/                  <-- Activos estáticos, imágenes de categorías y ofertas
│   └── img/
├── src/
│   ├── data/                <-- Datos del catálogo simulado, menú y slots de imagen
│   ├── render/              <-- Módulos de renderizado HTML5 accesible (Header, Hero, Grid, Catálogo, Drawer)
│   ├── styles/
│   │   ├── tokens.css       <-- Variables CSS Espresso & Piedra y sobrescritura Bootstrap 5.3
│   │   └── storefront.css   <-- Reglas de estilo para componentes, carrusel, tarjetas y drawers
│   ├── types/               <-- Tipos e interfaces TypeScript del dominio retail
│   ├── utils/               <-- Iconografía SVG y funciones utilitarias
│   └── main.ts              <-- Enrutador hash, máquina de estados y orquestación UI
├── index.html               <-- Punto de entrada HTML5 semántico
├── package.json             <-- Scripts y dependencias
├── tsconfig.json            <-- Configuración estricta de TypeScript
└── README.md                <-- Este documento
```

---

## 🧩 Módulos de I&O que Integran la Nueva Estética

Esta capa aloja las interfaces de usuario centradas en la persona, responsivas (*Mobile-First*, `320px` a `1920px`) y verificadas bajo **W3C WCAG 2.1 Nivel AA**:

1. **Tienda E-commerce B2C Inclusiva (`M02`, `M05` — `CUN02`, `CUN05`):**
   * Paleta **Espresso & Piedra**: Fondos `#F4F0EA`, tarjetas `#FAF7F2`, texto institucional `#261E1B` (contraste 14.2:1) y acentos en Terracota suave `#C98A7B` (contraste 5.8:1 sobre `#261E1B`).
   * Catálogo por SKU (modelo + talla + color) con **selector multimodal de color (Nombre Textual + Textura/Patrón SVG)** para usuarios con daltonismo (`RN-ACC-02`, `DD-01`).
   * Enlace **OFERTAS** con diferenciador multimodal (color `#C98A7B` + punto indicador visual `.io-nav-indicator-dot` + subrayado) en estricto cumplimiento de **WCAG 1.4.1 (Uso del color)**.
   * Bolsa de compras con **temporizador accesible `aria-live` de reserva por 15 minutos** (`RN-ECO-03`) y cálculo transparente de envío gratuito desde `> S/ 150` (`RN-ENV-04`).
   * Checkout progresivo en 3 pasos (`DD-03`) integrado con pasarela tokenizada PCI-DSS (hasta 3 reintentos `RN-ECO-02`), máquina visible de 6 estados (`RN-ECO-04`) y casilla *opt-in* desmarcada por defecto (`RN-MKT-03`, `RN-ACC-06`).
2. **Terminal Punto de Venta — POS en Tienda (`M01` — `CUN01`):**
   * Operabilidad **100% por teclado (`F2` a `F8`, `Tab`, `Enter`, `Esc`)** y botones táctiles $\ge 48\times48\text{ px}$ (`DD-04`, `RN-ACC-03`).
   * Bloqueo visual de descuentos $> 10\%$ (`RN-VEN-03`) y selector Boleta/Factura con IGV 18% (`RN-TRI-01`).
3. **Panel de Almacén, Compras y Envíos Courier (`M03`, `M04` — `CUN03`, `CUN04`):**
   * Generación de Guía de Envío (`RN-ENV-01`), lista de chequeo de remisión (`RN-COM-03`) y alertas de stock bajo $\le 5$ unidades (`RN-INV-03`).
4. **Módulo de Préstamos en Consignación (`M06` — `CUN06`):**
   * Emisión por Almacenero de la **Constancia Formal de Préstamo (`RN-PRE-01`)** en ausencia del gerente, plazo máx. 7 días (`RN-PRE-02`).
5. **Dashboard Interactivo Gerencial y Planilla (`M07`, `M08` — `CUN07`, `IHC 7.8` & `C3.3`):**
   * Tarjetas KPI en tiempo real con paleta colorblind-safe Okabe-Ito + tramas y tablas para lectores de pantalla.
6. **Accesibilidad Universal Nativa WCAG 2.1 AA (`M08` — `RN-ACC-01` a `RN-ACC-06`):**
   * Contraste AA/AAA verificado en toda la jerarquía cromática, soporte de alto contraste del SO `prefers-contrast: more` (`#000000` / `#FFFF00`, ratio `19.56:1`), foco visible `2px solid #C98A7B` (`outline-offset: 2px`) y reducción de animaciones `prefers-reduced-motion`.

---

## 🎨 Resumen de la Paleta Oficial Espresso & Piedra

* **Barra superior de anuncios:** Fondo `#1A1512` | Texto `#FAF7F2` (15.6:1 AAA) — `Envío GRATIS en compras mayores a S/ 150`.
* **Header / Navbar:** Fondo `#261E1B` (con opción translúcida `rgba(38,30,27,0.94)` + `backdrop-filter: blur(10px)`) | Texto `#FAF7F2` (13.8:1 AAA).
* **Acentos (OFERTAS, badges, estados):** Terracota `#C98A7B` (5.76:1 AA sobre `#261E1B`).
* **Tipografía:** `Cormorant Garamond` (titulares editoriales) + `Inter` (interfaz).
* **Fondo general (`--bg-page`):** Beige piedra cálido `#F4F0EA`.
* **Superficies (Tarjetas, Drawers):** Marfil cálido `#FAF7F2` / Blanco `#FFFFFF`.
* **Bordes:** `#D6CEC2` (estructurales) y `#7A6F68` (controles interactivos e inputs $\ge 3:1$).
* **Textos sobre fondo claro:** Primario `#261E1B` (14.2:1 AAA), Secundario `#574C46` (7.1:1 AAA).
* **Foco accesible (`:focus-visible`):** Anillo de `2px solid #C98A7B` con `outline-offset: 2px` más banda interior espresso (contraste $\ge 3:1$ sobre fondos claros).

---

## 🖼️ Logo de la Marca (listo para colocar)

El logo **no se diseña en código**. El header contiene solo un contenedor limpio (sin marco ni adornos) conectado a [`src/data/imageSlots.ts`](src/data/imageSlots.ts) y [`src/render/brand.ts`](src/render/brand.ts):

* **Carpeta:** `frontend/public/img/brand/`
* **Archivo esperado:** `logo-io.svg` (si no existe, se prueba automáticamente `logo-io.png`; si tampoco, se muestra el texto simple `I&O`).
* **Formato:** SVG transparente (recomendado) o PNG transparente de `360 x 80 px` (@2x).
* **Medidas:** se renderiza a `40 px` de alto (`34 px` con el header compacto), ancho automático, máx. `180 px`. Proporción ideal `3:1`–`4.5:1`.
* **Color:** versión clara/marfil (`#FAF7F2`), porque el header es espresso `#261E1B`.

## ✨ Micro-interacciones (resumen)

Header translúcido y compacto al hacer scroll, subrayados animados en el menú, flechas que se desplazan en botones y tarjetas, zoom suave de fotografías, revelado escalonado al cambiar de vista, drawers y modales con apertura/cierre animado, *shimmer* de carga y estados vacíos editoriales. Todo se desactiva con `prefers-reduced-motion: reduce`. Detalle completo en [docs_ui/guia_estilos_espresso_piedra.md](docs_ui/guia_estilos_espresso_piedra.md).
