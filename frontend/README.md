# 🎨 Frontend – Sistema Omnicanal I&O (`frontend/`)

> **Estado Verificado (R1/R3 — `27/11/2026`):** 🟢 **Stack oficial `Vite 5.4 + TypeScript 5.6 + HTML5 Semántico + CSS3 puro + Bootstrap 5.3.3`** — Verificado en código fuente sin modificaciones respecto a la línea base (`78` archivos, `tsc --noEmit` y `vite build` exit `0`).  
> **Identidad Visual Oficial Vigente:** **Espresso & Piedra (Propuesta 5)** en todas las pantallas (comprador y consola interna).  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**  
> **Documentación UI y Auditoría Técnica:**  
> - [docs_ui/guia_estilos_espresso_piedra.md](docs_ui/guia_estilos_espresso_piedra.md) (v2.2 — tokens, accesibilidad, assets y sistema interno)  
> - [docs_ui/VERIFICACION_FRONTEND_R1.md](docs_ui/VERIFICACION_FRONTEND_R1.md) (reporte integral de verificación R1, reglas `CUN`/`RN` y discrepancias)

---

## 📂 Organización Real de esta Carpeta

```text
frontend/
├── docs_ui/
│   ├── guia_estilos_espresso_piedra.md  <-- Guía oficial v2.2 (tokens, WCAG 2.1 AA, assets, vistas internas)
│   └── VERIFICACION_FRONTEND_R1.md      <-- Reporte de verificación R1 (tsc/build, CUN01–07, 42 RN-*, RN-ACC)
├── public/
│   └── img/
│       ├── brand/logo-io.png            <-- Logo activo (8,686 B; no existe logo-io.svg en disco)
│       ├── categorias/*.WebP            <-- 8 imágenes de categorías (extensión .WebP)
│       ├── ofertas/                     <-- oferta-01..03.WebP y oferta-04.png
│       └── productos/.gitkeep           <-- Carpeta vacía (las tarjetas usan respaldo visual con el logo I&O)
├── src/
│   ├── admin/                           <-- M07 Planilla + M08 Mesa de Control, Analítica y Altas (admin.html)
│   │   ├── adminMain.ts
│   │   ├── adminStore.ts
│   │   └── adminTypes.ts
│   ├── almacen/                         <-- M03 Despachos, M04 Compras, M06 Préstamos (almacen.html)
│   │   ├── almacenMain.ts
│   │   ├── almacenStore.ts
│   │   └── almacenTypes.ts
│   ├── auth/                            <-- Acceso unificado, sesión local (7 roles) y zona respaldo
│   │   ├── accesoMain.ts
│   │   ├── demoSession.ts
│   │   └── pendingZoneMain.ts
│   ├── data/                            <-- Catálogo base (49 variantes SKU), navegación, slots y altas personalizadas
│   │   ├── catalogData.ts
│   │   ├── customCatalogStore.ts
│   │   ├── imageSlots.ts
│   │   └── navigationData.ts
│   ├── marketing/                       <-- M05 Portada Hero, Colecciones, Campañas e Inventario Web (marketing.html)
│   │   ├── marketingMain.ts
│   │   ├── marketingStore.ts
│   │   └── marketingTypes.ts
│   ├── pos/                             <-- M01 POS Mostrador Vendedor y Caja Cobro / Aliados
│   │   ├── cajeroMain.ts
│   │   ├── posStore.ts
│   │   ├── posTypes.ts
│   │   └── vendedorMain.ts
│   ├── render/                          <-- Componentes HTML5 de la tienda pública (index.html)
│   │   ├── accountPanels.ts
│   │   ├── brand.ts
│   │   ├── brandsSection.ts
│   │   ├── cartDrawer.ts
│   │   ├── categoryGrid.ts
│   │   ├── categoryPage.ts
│   │   ├── collectionBanners.ts
│   │   ├── footer.ts
│   │   ├── headerNav.ts
│   │   ├── homeShowcase.ts
│   │   ├── imageSlot.ts
│   │   ├── offersCarousel.ts
│   │   ├── productCatalog.ts
│   │   └── productDetailModal.ts
│   ├── styles/                          <-- 7 hojas CSS3 puras sobre tokens Espresso & Piedra
│   │   ├── tokens.css                   <-- 35 variables :root + 11 sobrescrituras Bootstrap 5.3 + prefers-contrast: more
│   │   ├── storefront.css               <-- Estilos de index.html + body.io-storefront.io-mode-colorblind
│   │   ├── access.css                   <-- Estilos de acceso.html y zona-preparacion.html
│   │   ├── pos.css                      <-- Estilos POS y base compartida de vistas internas (@media print)
│   │   ├── almacen.css                  <-- Estilos Almacén maestro-detalle y hoja formal A4 (@page A4)
│   │   ├── marketing.css                <-- Estilos de marketing.html y previsualizadores 16/7, 16/10, 4/3
│   │   └── admin.css                    <-- Estilos Mesa de Control, Analítica (Espresso & Piedra) y Altas
│   ├── types/store.types.ts             <-- Tipos de dominio retail y 6 TexturePatternId
│   ├── utils/icons.ts                   <-- Iconografía SVG de trazo fino y escapeHtml
│   └── main.ts                          <-- Enrutador hash (#/, #/categoria/:slug) y estado de tienda
├── index.html                           <-- Tienda online pública (comprador AN01 / invitado)
├── acceso.html                          <-- Puerta única de ingreso y registro (7 DemoRole)
├── pos-vendedor.html                    <-- Terminal POS Mostrador Vendedor (M01)
├── pos-cajero.html                      <-- Terminal POS Caja, Comprobantes y Aliados (M01 + M06)
├── almacen.html                         <-- Consola Almacén: Despachos, Compras y Préstamos (M03, M04, M06)
├── marketing.html                       <-- Consola Marketing: Recién llegados, Hero, Colecciones, Campañas (M05)
├── admin.html                           <-- Consola Dirección: Mesa de Control, Planilla y Analítica (M04, M05, M07, M08)
├── zona-preparacion.html                <-- Placeholder interno activo únicamente para el rol demo `respaldo`
├── vite.config.ts                       <-- Multi-page build (8 entradas HTML, puerto dev 5173)
├── package.json                         <-- Scripts y dependencias (bootstrap ^5.3.3, ts ^5.6.3, vite ^5.4.11)
├── tsconfig.json                        <-- TypeScript estricto (ES2022, strict: true, noEmit: true)
└── README.md                            <-- Este documento
```

---

## 🚪 Puntos de Entrada HTML y Control de Acceso (`demoSession.ts`)

La autenticación actual opera en modo demostración local mediante `io_demo_session_v1` en `localStorage` (TTL de **8 horas**) y **7 perfiles `DemoRole`** (`src/auth/demoSession.ts:4-103`):

| Archivo HTML | Módulo TS Principal | Roles Permitidos (`canRoleAccessPath`) | Propósito Real en Código |
|---|---|---|---|
| `index.html` | `src/main.ts` | Libre (invitado o `cliente`, más lectura pública) | Tienda E-commerce B2C (`M02`, `M05`). |
| `acceso.html` | `src/auth/accesoMain.ts` | Todos (entrada pública) | Inicio de sesión rápido (7 perfiles demo) y registro de cliente (`opt-in`). |
| `pos-vendedor.html` | `src/pos/vendedorMain.ts` | `vendedor`, `cajero`, `administrador` | Mostrador POS (`M01`): búsqueda/escaneo SKU, alternativas sin stock, envío a Caja. |
| `pos-cajero.html` | `src/pos/cajeroMain.ts` | `cajero`, `vendedor`, `administrador` | Caja POS (`M01` + `M06`): cobro 4 métodos + abonos, Boleta/Factura (18% IGV), Arqueo y Aliados. |
| `almacen.html` | `src/almacen/almacenMain.ts` | `almacenero`, `administrador` | Gestión de Despachos (`M03`), Compras (`M04`) y Préstamos/Consignación (`M06`) con impresión A4. |
| `marketing.html` | `src/marketing/marketingMain.ts` | `community_manager`, `administrador` | Gestión de Recién llegados, Portada Hero, Colecciones, Campañas INDECOPI y Catálogo web (`M05`). |
| `admin.html` | `src/admin/adminMain.ts` | `administrador` | Mesa de Control por Excepción (`M04`/`M05`/`M06`/`M07`), Analítica (`M08`) y Altas de Catálogo/Proveedores. |
| `zona-preparacion.html` | `src/auth/pendingZoneMain.ts` | `respaldo` (`?zona=operaciones`) | Pantalla *placeholder* usada hoy únicamente por el 7.º rol demo `respaldo` (administración, almacén y marketing ya cuentan con sus módulos propios). |

---

## 🧩 Estado Real de los Módulos (`M01`–`M08`: Implementado vs. Demo / Pendiente)

Todas las operaciones actuales persisten en **`localStorage`** del navegador sin backend conectado; a continuación se describe con exactitud lo implementado frente a lo simulado o pendiente:

1. **Tienda E-commerce B2C (`index.html` — `M02`, `M05` — `CUN02`, `CUN05`):**
   - **Implementado:** Catálogo de **8** grupos de producto (**49** variantes SKU por talla y color), **6** marcas, **8** categorías, **30** subcategorías, **4** campañas Hero y **4** banners de colección; filtros por categoría/búsqueda, lista de deseos, bolsa con **temporizador `aria-live` de reserva por 15 minutos** (`RN-ECO-03`) y cálculo de envío gratuito `> S/ 150` (`RN-ENV-04`, tarifa base `S/ 10` en tienda).
   - **Accesibilidad comprador (`24/11/2026`):** Switch **Daltonismo y Lectura Ampliada** (`io-mode-colorblind`), que activa las **6 texturas SVG** (`solido`, `jaspeado`, `raya-fina`, `diagonal`, `punteado`, `cuadricula`) y alto contraste `#000000`/`#FFFF00` (`19.56:1`), además de soporte nativo `@media (prefers-contrast: more)` y `prefers-reduced-motion`.
   - **Pendiente / Stub verificado:** El botón de compra (`cart-checkout` en `main.ts:1178-1183`) es actualmente un **stub informativo** (`"Resumen listo para pago... La pasarela en línea se habilitará al conectar el servicio de pagos"`). Faltan el flujo de checkout en 3 pasos (`RN-ECO-06`), reintentos de pasarela (`RN-ECO-02`), seguimiento de 6 estados en tienda (`RN-ECO-04`), cancelación online (`RN-ECO-05`) y descuento automático de `stock_consumido` de campaña.
2. **Terminal POS en Tienda (`pos-vendedor.html`, `pos-cajero.html` — `M01` — `CUN01`):**
   - **Implementado (demo):** Escaneo/búsqueda de SKU, alternativas en stock 0 (`RN-VEN-02`), bloqueo de descuento $> 10\%$ (`RN-VEN-03`), cobro multi-método y abonos, emisión correlativa de Boleta `B001-*` / Factura `F001-*` con 18% IGV (`RN-TRI-01`), validación DNI/RUC (`RN-TRI-02`), Arqueo de Caja, pestaña de **Aliados (`M06`)** y atajos operativos (`F2`, `F3`, `F4`, `F6`, `F7`, `F8`, `Esc`).
   - **Limitaciones detectadas en R1:** No aplica tarifa mayorista (`RN-VEN-07`), el precio promocional de campaña mostrado en `vendedorMain.ts` no se aplica al total cobrado en `posStore.ts:487`, no emite Nota de Crédito para ventas ya cobradas (`RN-TRI-03`) y `posStore.ts` no escribe en la bitácora unificada `AuditLog`.
3. **Almacén, Compras y Préstamos (`almacen.html` — `M03`, `M04`, `M06` — `CUN03`, `CUN04`, `CUN06`):**
   - **Implementado (demo):** Despachos courier con compuerta de pago (`RN-ECO-01`), verificación SKU, generación de guía A4 (`RN-ENV-01`) y hasta 2 intentos con receptor + DNI de 8 dígitos (`RN-ENV-02`, `RN-ENV-03`); recepción de OCs contra Guía de Remisión (`RN-COM-03`) con bloqueo de pago ante merma (`RN-COM-04`) y acta A4; préstamos de consignación con interruptor `¿Gerente disponible?` (`RN-PRE-01`), tope de 7 días (`RN-PRE-02`), descuento de inventario (`RN-PRE-03`), Constancia Formal A4 y liquidación hacia Caja Aliados (`RN-PRE-04`).
   - **Limitaciones detectadas en R1:** Flete de `S/ 12` en `almacenStore.ts` frente a `S/ 10` en `cartDrawer.ts`; faltan reapertura de cotizaciones rechazadas (`RN-COM-02`), ejecución de pago a proveedor (`RN-COM-05`) y recargo mayorista diferenciado en devolución dañada (`RN-PRE-05`).
4. **Marketing y Catálogo Web (`marketing.html` — `M05` — `CUN05`):**
   - **Implementado (demo):** 5 pestañas (`recien_llegados`, `portada_hero`, `colecciones`, `campanas`, `catalogo`), carga/compresión de imágenes en navegador (WebP/JPEG), límite de stock y vigencia INDECOPI (`RN-MKT-01`), envío a aprobación gerencial (`RN-MKT-04`) y sincronización en tiempo real con `index.html` vía `BroadcastChannel` (`io_marketing_sync`).
5. **Dirección, Planilla y Mesa de Control (`admin.html` — `M07`, `M08` — `CUN07`):**
   - **Implementado (demo):** 3 pestañas (`mesa_control`, `analitica`, `altas`), aprobación/rechazo de OCs, proveedores, campañas y constancias de préstamo, alertas de stock crítico $\le 5$ (`RN-INV-03`), liquidación de planilla para `TN01`–`TN05` con verificación de liquidez (`RN-FIN-02`) y cierre irreversible Poka-Yoke (`RN-FIN-05`), bitácora consolidada y creación de nuevos modelos/variantes SKU (`customCatalogStore.ts`).
   - **Estética (`24/11/2026`):** Usa **Espresso & Piedra** (`admin.css` — `#261e1b`, `#c98a7b`, `#23684a`) sin paleta Okabe-Ito, sin tramas y sin `aria-live`.
   - **Limitaciones detectadas en R1:** Planilla usa asistencia/comisiones sembradas (`RN-FIN-01`), no emite boleta de pago imprimible (`RN-FIN-03`) ni inserta egreso en `movimientosCaja` (`RN-FIN-04`).

---

## 🔄 Persistencia Local, Canales en Tiempo Real y APIs de Consola

| Dominio | Claves `localStorage` | `BroadcastChannel` | API Consola (`window.*`) |
|---|---|---|---|
| **Sesión / Auth** | `io_demo_session_v1` (TTL 8 h) | — | — |
| **Tienda (`index.html`)** | `io_colorblind_mode` (`'1'`/`'0'`) | Escucha `io_marketing_sync` | — |
| **Catálogo Extendido** | `io_custom_catalog_v1` | `io_custom_catalog_ch_v1` | — |
| **POS (`M01`)** | `io_pos_state_v1`, `io_pos_mode_v1` | `io_pos_channel_v1` | `window.IO_POS`, `window.ioPos`, `window.posPago` |
| **Almacén (`M03`/`M04`/`M06`)** | `io_almacen_state_v1` | `io_almacen_channel_v1` | `window.IO_ALMACEN` |
| **Marketing (`M05`)** | `io_marketing_state_v1`, `io_marketing_ui_mode_v1` | `io_marketing_sync` | `window.IO_MARKETING` |
| **Dirección (`M07`/`M08`)** | `io_admin_state_v1` | `io_admin_channel_v1` | `window.IO_ADMIN` |

---

## 🎨 Resumen Visual Espresso & Piedra y Logo

- **Barra superior (`--color-top-strip-bg`):** `#1a1512` | Texto `#faf7f2` (`15.6:1` AAA) — `Envío GRATIS en compras mayores a S/ 150`.
- **Header (`--color-header-bg`):** `#261e1b` | Translúcido `rgba(38, 30, 27, 0.96)` (`blur(10px)`) y `.is-scrolled` `rgba(38, 30, 27, 0.84)` (`blur(16px)`), altura `68px` → `56px`.
- **Fondo y superficies:** `--bg-page: #f4f0ea`, tarjetas `#faf7f2`, blanco `#ffffff`, bordes `#d6cec2` y `#7a6f68` ($\ge 3:1$).
- **Acento y foco:** Terracota `#c98a7b` (`5.76:1` sobre `#261e1b`); `:focus-visible` con `2px solid #c98a7b` + `outline-offset: 2px` + banda interna `0 0 0 2px #261e1b` (`3px solid #ffff00` + `#000000` en `prefers-contrast: more` e `.io-mode-colorblind`).
- **Logo (`frontend/public/img/brand/logo-io.png`):** Archivo PNG activo de `8,686 B` (`logo-io.svg` no existe en disco, aunque `imageSlots.ts` intenta `.svg` y hace fallback automático a `.png`). Alturas reales CSS: `30px` (`26px` al hacer scroll, máx. `150px`) en `storefront.css`, `36px` (máx. `170px`) en `access.css`, y `24px` (máx. `120px`) en `pos.css`.

---

## ⚙️ Scripts de Desarrollo y Compilación (`package.json`)

```bash
cd frontend
npm install
npm run dev        # Servidor Vite en http://localhost:5173
npm run typecheck  # Verificación estricta TypeScript (tsc --noEmit)
npm run build      # Typecheck + compilación multi-página (tsc --noEmit && vite build)
npm run preview    # Previsualización local de dist/
```

> El detalle completo de la verificación R1 (`tsc`, `vite build`, matriz de las 42 reglas `RN-*`, auditoría `RN-ACC-01..06` y las brechas detectadas en el código fuente) se encuentra en [docs_ui/VERIFICACION_FRONTEND_R1.md](docs_ui/VERIFICACION_FRONTEND_R1.md).
