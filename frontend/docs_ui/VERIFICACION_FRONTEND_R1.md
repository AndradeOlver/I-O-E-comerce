# 📋 Reporte de Verificación Técnica R1 — `frontend/` I&O Retail

> **Alcance:** Verificación integral **estrictamente de solo lectura** sobre el código fuente implementado en `frontend/` (sin alterar HTML, TypeScript, CSS, activos gráficos ni archivos de configuración).  
> **Fecha de Verificación:** `27/11/2026`  
> **Workspace:** `d:\equipo\Escritorio\IO E-Comerce\frontend`  
> **Autores Exclusivos del Proyecto y Desarrollo Frontend:**  
> 1. **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)**  
> 2. **RAZURI PAREDES, Josue Daniel (`N00421512`)**

---

## 1. Metodología y Regla de Inmutabilidad (R1)

La verificación se ejecutó directamente sobre los archivos reales de `frontend/` (`*.html`, `src/**`, `public/**`, `package.json`, `tsconfig.json`, `vite.config.ts`), contrastándolos contra:
- Los **7 Casos de Uso de Negocio (`CUN01`–`CUN07`)** y las **42 Reglas de Negocio (`RN-*`)** (`documentos/Model Soft Proyecto/Informacion del negocio/03_Reglas_de_Negocio_IO.md`).
- Las **6 Reglas de Accesibilidad (`RN-ACC-01`–`RN-ACC-06`)** y el corte de alcance comprador vs. vistas internas del `24/11/2026` (`documentos/Interaccion Humano Com Proyecto/Informacion_IHC/03_Requerimientos_y_Reglas_Accesibles_IO.md`).
- Los **tokens ejecutables** de [`frontend/src/styles/tokens.css`](../src/styles/tokens.css).

En cumplimiento de R1, **no se modificó ningún archivo fuente, HTML, CSS, activo ni configuración**; únicamente se actualizaron/generaron los artefactos documentales en `frontend/README.md`, `frontend/docs_ui/guia_estilos_espresso_piedra.md` y el presente reporte.

---

## 2. Integridad de Línea Base y Verificación de Compilación

### 2.1 Integridad de Archivos Fuente (`git` + SHA-256)
- **Control Git de código fuente:** `git -C "d:\equipo\Escritorio\IO E-Comerce" status --porcelain -- frontend/` confirma **0 modificaciones** en `*.html`, `src/**`, `public/**`, `package.json`, `package-lock.json`, `tsconfig.json` y `vite.config.ts` (solo figuran los 3 documentos autorizados de M1).
- **Verificación SHA-256 contra línea base (`frontend_hashes.json`):** `78` archivos base verificados (`76` archivos de código fuente, HTML, CSS, configuración, activos y `.gitkeep` intactos al `100%` con `0` diferencias; únicamente cambiaron los `2` documentos base editados en M1: `frontend/README.md` y `frontend/docs_ui/guia_estilos_espresso_piedra.md`, además de la creación de este archivo nuevo `frontend/docs_ui/VERIFICACION_FRONTEND_R1.md`).

### 2.2 Configuración de Toolchain
- **`frontend/package.json`:** `name: "io-ecommerce-frontend"`, `version: "0.1.0"`, `type: "module"`; scripts `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `preview` (`vite preview`), `typecheck` (`tsc --noEmit`); dependencias `bootstrap: "^5.3.3"`, `typescript: "^5.6.3"`, `vite: "^5.4.11"`.
- **`frontend/tsconfig.json`:** `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `noEmit: true`, `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`, `include: ["src"]`.
- **`frontend/vite.config.ts`:** `server.port: 5173`, `server.open: false`; `build.rollupOptions.input` con **8 puntos de entrada HTML** (`main`, `acceso`, `zonaPreparacion`, `posVendedor`, `posCajero`, `almacen`, `marketing`, `admin`).

### 2.3 Resultados de Ejecución (`npx tsc --noEmit` y `npx vite build`)

| Comprobación | Comando (`cwd: frontend/`) | Código de Salida | Duración | Resumen de Salida |
|---|---|---|---|---|
| **Typecheck TS** | `npx tsc --noEmit` | `0` | `2,474 ms` | `0` errores, `0` advertencias |
| **Build Producción** | `npx vite build` | `0` | `2,583 ms` (`1.19 s` Vite interno) | `vite v5.4.21 building for production...`, `50 modules transformed`, **28** artefactos emitidos en `dist/` (`8` HTML + `7` CSS + `13` JS) |

**Artefactos emitidos en `dist/` (excluyendo imágenes estáticas copiadas de `public/`):**
- **HTML (8):** `dist/zona-preparacion.html` (`1.13 kB`), `dist/pos-cajero.html` (`1.19 kB`), `dist/acceso.html` (`1.20 kB`), `dist/pos-vendedor.html` (`1.28 kB`), `dist/almacen.html` (`1.35 kB`), `dist/marketing.html` (`1.37 kB`), `dist/index.html` (`1.38 kB`), `dist/admin.html` (`1.44 kB`).
- **CSS (7):** `almacen-*.css` (`3.66 kB`), `marketing-*.css` (`6.31 kB`), `access-*.css` (`13.12 kB`), `admin-*.css` (`15.70 kB`), `posStore-*.css` (`18.52 kB`), `main-*.css` (`65.39 kB`), `demoSession-*.css` (`237.71 kB`, incluye Bootstrap 5.3.3).
- **JS (13):** `zonaPreparacion-*.js` (`2.36 kB`), `posStore-*.js` (`15.25 kB`), `marketingStore-*.js` (`15.83 kB`), `demoSession-*.js` (`16.63 kB`), `acceso-*.js` (`17.06 kB`), `almacenStore-*.js` (`18.20 kB`), `customCatalogStore-*.js` (`30.50 kB`), `posVendedor-*.js` (`34.95 kB`), `posCajero-*.js` (`49.84 kB`), `almacen-*.js` (`53.00 kB`), `marketing-*.js` (`63.73 kB`), `admin-*.js` (`69.42 kB`), `main-*.js` (`101.58 kB`).

---

## 3. Inventario Completo Implementado

### 3.1 Matriz de los 8 Puntos de Entrada HTML

*(Común a los 8 HTML: `<html lang="es-PE">`, `<link rel="icon" type="image/png" href="/img/brand/logo-io.png" />` y Google Fonts `Cormorant Garamond` + `Inter` — con variantes itálicas en `index`, `acceso`, `zona-preparacion`, y sin itálicas en las 5 consolas operativas).*

| Archivo HTML | `<title>` | Clases `<body>` | Root ID | Módulo TS + CSS Importados | `.skip-link` | `<h1>` | `aria-live` | Roles Permitidos y Alcance `24/11` |
|---|---|---|---|---|---|---|---|---|
| `index.html` | `I&O · Moda Contemporánea & Atelier Urbano` | `io-storefront` | `#root` | `main.ts` (`bootstrap`, `tokens`, `storefront`) | ❌ No | ⚠️ Home solo en slide 0 (`offersCarousel.ts:25`); Categoría `categoryPage.ts:229` | ✅ Sí (`main`, `cartDrawer`, `productCatalog`, `productDetailModal`) | Libre / `cliente`. Comprador `AN01`: Daltonismo, SVG texturas, `prefers-contrast: more`. |
| `acceso.html` | `I&O · Iniciar sesión` | `io-access-page` | `#acceso-root` | `auth/accesoMain.ts` (`bootstrap`, `tokens`, `access`) | ✅ Sí (`#acceso-principal`, `L20`) | ✅ `accesoMain.ts:469` | ✅ Sí (`role="status"`, `role="alert"`) | Acceso público (7 `DemoRole`). Sin Daltonismo / texturas / `prefers-contrast`. |
| `pos-vendedor.html` | `I&O POS · Mostrador Vendedor` | `pos-body io-internal-page` | `#pos-vendedor-root` | `pos/vendedorMain.ts` (`bootstrap`, `tokens`, `pos`) | ❌ No | ✅ `vendedorMain.ts:341` | ❌ No | `vendedor`, `cajero`, `administrador`. Interno (`24/11`). |
| `pos-cajero.html` | `I&O POS · Caja y Cobro` | `pos-body io-internal-page` | `#pos-cajero-root` | `pos/cajeroMain.ts` (`bootstrap`, `tokens`, `pos`) | ❌ No | ❌ **Ausente** (usa `<h2>`/`<h3>`) | ❌ No | `cajero`, `vendedor`, `administrador`. Interno (`24/11`). |
| `almacen.html` | `I&O Almacén · Gestión Operativa` | `pos-body io-internal-page` | `#almacen-root` | `almacen/almacenMain.ts` (`bootstrap`, `tokens`, `pos`, `almacen`) | ❌ No | ✅ `almacenMain.ts:117` | ❌ No | `almacenero`, `administrador`. Interno (`24/11`). |
| `marketing.html` | `I&O Marketing · Catálogo y Portada Web` | `pos-body io-internal-page` | `#marketing-root` | `marketing/marketingMain.ts` (`bootstrap`, `tokens`, `pos`, `marketing`) | ❌ No | ✅ `marketingMain.ts:178` | ❌ No | `community_manager`, `administrador`. Interno (`24/11`). |
| `admin.html` | `I&O Dirección · Mesa de Control y Decisiones` | `pos-body io-internal-page` | `#admin-root` | `admin/adminMain.ts` (`bootstrap`, `tokens`, `pos`, `admin`) | ❌ No | ✅ `adminMain.ts:158` | ❌ No | `administrador`. Interno (`24/11`, Espresso & Piedra). |
| `zona-preparacion.html` | `I&O · Espacio Interno` | `io-internal-page` | `#pending-zone-root` | `auth/pendingZoneMain.ts` (`bootstrap`, `tokens`, `access`) | ❌ No | ✅ `pendingZoneMain.ts:56` | ❌ No | Placeholder solo para `respaldo` (`?zona=operaciones`). Interno (`24/11`). |

### 3.2 Conteos Verificados del Catálogo y Roles (`src/data/`, `src/auth/`, `src/types/`)
- **`MARCAS_TIENDA`:** **6** marcas (`catalogData.ts:17-66`).
- **`CATEGORIAS_TIENDA`:** **8** categorías (`catalogData.ts:68-133`).
- **`SUBCATEGORIAS_TIENDA`:** **30** subcategorías (`catalogData.ts:135-181`).
- **`OFERTAS_CARRUSEL`:** **4** campañas Hero (`catalogData.ts:183-272`).
- **`COLECCIONES_BANNERS`:** **4** banners de colección (`catalogData.ts:274-320`).
- **`CATALOGO_PRODUCTOS`:** **8** grupos de producto con **49 variantes SKU totales** (`7 + 6 + 6 + 6 + 6 + 6 + 6 + 6 = 49` en `catalogData.ts:323-1142`).
- **`TexturePatternId`:** **6** patrones (`jaspeado`, `raya-fina`, `solido`, `diagonal`, `punteado`, `cuadricula`, `store.types.ts:1-7`).
- **`NAV_MENU_ITEMS`:** **4** elementos (`hombre`, `mujer`, `ninos`, `ofertas`, `navigationData.ts:148-183`).
- **`DEMO_ROLE_PROFILES`:** **7** roles (`cliente`, `vendedor`, `cajero`, `administrador`, `almacenero`, `community_manager`, `respaldo`, `demoSession.ts:4-103`, TTL 8 h en `io_demo_session_v1`).

### 3.3 Persistencia Local, Canales, APIs `window.*` y Atajos de Teclado
- **Claves `localStorage` (`8` principales):** `io_demo_session_v1`, `io_colorblind_mode`, `io_custom_catalog_v1`, `io_pos_state_v1`, `io_pos_mode_v1`, `io_almacen_state_v1`, `io_marketing_state_v1`, `io_marketing_ui_mode_v1`, `io_admin_state_v1`.
- **Canales `BroadcastChannel` (`5`):** `io_custom_catalog_ch_v1`, `io_pos_channel_v1`, `io_almacen_channel_v1`, `io_marketing_sync`, `io_admin_channel_v1`.
- **APIs de Consola (`4`):** `window.IO_POS` / `window.ioPos` / `window.posPago` (`vendedorMain.ts:1454-1456`, `cajeroMain.ts:1811-1813`), `window.IO_ALMACEN` (`almacenMain.ts:1808`), `window.IO_MARKETING` (`marketingMain.ts:2092`), `window.IO_ADMIN` (`adminMain.ts:1781`).
- **Atajos de Teclado por Vista:**
  - `index.html`: `Escape` cierra mega-menú o overlay activo (`main.ts:749-773`).
  - `acceso.html`: `ArrowLeft`, `ArrowRight`, `Home`, `End` sobre `[role="tab"]` (`accesoMain.ts:614-638`).
  - `pos-vendedor.html`: `F2` buscar, `F3` escanear aleatorio (`practica`), `F4` abrir drawer / enviar a Caja, `F8` limpiar borrador, `Escape` cerrar drawer/alertas, `Enter` agregar SKU en `#pos-search-input` (`vendedorMain.ts:1085-1105, 1353-1386`).
  - `pos-cajero.html`: `F2` primer pendiente, `F4` cobrar efectivo, `F6` abrir/cerrar Arqueo, `F7` imprimir comprobante/Arqueo, `Escape` cerrar modal/alertas (`cajeroMain.ts:1768-1801`).
  - `almacen.html`: `F2` buscar, `F3` escanear (`practica` + `despachos`), `Escape` cerrar vista A4/modales, `Enter` verificar SKU en `#alm-dispatch-sku-scan` (`almacenMain.ts:1272-1289, 1695-1723`).
  - `marketing.html`: `F2` buscar, `Escape` cerrar modal de bitácora (`marketingMain.ts:2026-2034`).
  - `admin.html`: `R`/`r` refrescar, `ArrowDown`/`ArrowUp` navegar decisiones en `mesa_control` (`adminMain.ts:1748-1773`).

---

## 4. Matriz de Cumplimiento de Negocio (`CUN01`–`CUN07` y las 42 `RN-*`)

### 4.1 Procesos de Negocio (`CUN01`–`CUN07`)

| Proceso | Estado en `frontend/` | Vistas / Módulos | Observación Verificada |
|---|---|---|---|
| `CUN01` Venta en Tienda | 🟡 **Implementado (Demo)** | `pos-vendedor.html`, `pos-cajero.html` | Búsqueda/escaneo SKU, alternativas sin stock, cobro 4 métodos + abonos, Boleta/Factura 18% IGV, Arqueo. **Brechas:** sin precio mayorista (`RN-VEN-07`), descuento de campaña no se aplica al total (`posStore.ts:487`), sin Nota de Crédito (`RN-TRI-03`) ni `auditLog` en POS (`RN-SEG-03`). |
| `CUN02` Venta Online | 🟠 **Parcial (Checkout Stub)** | `index.html`, `acceso.html` | Catálogo, filtros, deseos, timer 15 min (`main.ts:36,1241-1255`), envío gratis > S/ 150 (`cartDrawer.ts:4,18`), *opt-in*. **Faltante:** checkout 3 pasos (`RN-ECO-06`), pasarela 3 reintentos (`RN-ECO-02`), tracker 6 estados en tienda (`RN-ECO-04`), cancelación online (`RN-ECO-05`) y consumo de stock de campaña. |
| `CUN03` Envíos | 🟡 **Implementado (Demo)** | `almacen.html` | Compuerta pago (`RN-ECO-01`), verificación SKU, courier, guía A4 (`RN-ENV-01`), 2 intentos + DNI 8 dígitos (`RN-ENV-02`, `RN-ENV-03`). **Discrepancia:** flete `S/ 12` vs `S/ 10` en `cartDrawer.ts`. |
| `CUN04` Compra de Mercadería | 🟠 **Parcial (Demo)** | `almacen.html`, `admin.html` | Aprobación/rechazo OCs y proveedores en `admin.html`; recepción contra Guía de Remisión (`RN-COM-03`) y bloqueo por merma (`RN-COM-04`) con acta A4. **Faltante:** reapertura UI de cotización rechazada (`RN-COM-02`) y pago efectivo a proveedor (`RN-COM-05`). |
| `CUN05` Marketing | 🟡 **Implementado (Demo)** | `marketing.html`, `admin.html`, `index.html` | 5 pestañas, aprobación gerencial (`RN-MKT-04`), vigencia y cupo INDECOPI (`RN-MKT-01`), sincronía `BroadcastChannel`. **Brechas:** checkout web no consume `stock_consumido`; modo daltonismo Hero expone stock numérico (`offersCarousel.ts:31`). |
| `CUN06` Préstamo de Productos | 🟡 **Implementado (Demo)** | `almacen.html`, `pos-cajero.html`, `admin.html` | Switch `¿Gerente disponible?` (`RN-PRE-01`), tope 7 días (`RN-PRE-02`), descuento stock (`RN-PRE-03`), Constancia A4 y liquidación a Caja Aliados (`RN-PRE-04`). **Brecha:** falta recargo mayorista diferenciado por daño (`RN-PRE-05`). |
| `CUN07` Pago de Planilla | 🟠 **Parcial (Demo)** | `admin.html` | Nómina `TN01`–`TN05` (`adminStore.ts:23-76`), compuerta liquidez (`RN-FIN-02`), cierre Poka-Yoke (`RN-FIN-05`) y auditoría. **Brechas:** datos sembrados (`RN-FIN-01`), sin boleta firmada imprimible (`RN-FIN-03`) ni fila en `movimientosCaja` (`RN-FIN-04`). |

### 4.2 Verificación Exhaustiva de las 42 Reglas de Negocio (`RN-*`)

| Regla | Estado | Evidencia Directa (`file:line`) y Hallazgo |
|---|---|---|
| `RN-VEN-01` | ✅ Implementado | `posStore.ts:469-478, 622-632`; verificación/escaneo físico en `vendedorMain.ts:796-822, 1085-1105`. |
| `RN-VEN-02` | ✅ Implementado | `posStore.ts:384-428` (`findAlternativesForSku`), `vendedorMain.ts:460-516, 945-952`. |
| `RN-VEN-03` | ✅ Implementado (Demo) | `posStore.ts:354, 451-460`; `vendedorMain.ts:829-853, 1155-1168` (tope 10% + confirmación demo). |
| `RN-VEN-04` | ✅ Implementado | `posStore.ts:669-697` emite `B001`/`F001` correlativo y registra en `movimientosCaja`. |
| `RN-VEN-05` | ⚠️ Discrepancia Texto | `cajeroMain.ts:515` indica **7 días calendario** vs. `footer.ts:20` que indica **15 días calendario**. |
| `RN-VEN-06` | ✅ Implementado | `posStore.ts:473, 625, 680`, `main.ts:1107`, `almacenStore.ts:834` impiden stock negativo. |
| `RN-VEN-07` | ❌ Faltante | Validación RUC en `posStore.ts:578-584`, sin lista de precios corporativa/mayorista. |
| `RN-ECO-01` | ⚠️ Parcial | Exigido en `almacenStore.ts:427-432, 493-495`; sin checkout real en `main.ts:1178-1183`. |
| `RN-ECO-02` | ❌ Faltante | `main.ts:1178-1183` es stub estático (solo POS Caja tiene `simularRechazo`). |
| `RN-ECO-03` | ✅ Implementado (Local) | `main.ts:36, 1126, 1241-1255`, `cartDrawer.ts:102-112` (15 min en memoria del navegador). |
| `RN-ECO-04` | ⚠️ Parcial | 6 estados existen en Almacén (`almacenTypes.ts:5-11`); faltan en `index.html` para el cliente. |
| `RN-ECO-05` | ❌ Faltante | Mencionado en `footer.ts:23`; sin flujo UI de cancelación en `index.html`. |
| `RN-ECO-06` | ❌ Faltante | Sin formulario de envío en `index.html`; campos presentes en `WarehouseDispatch` (`almacenTypes.ts:35-38`). |
| `RN-INV-01` | ⚠️ **Violación en `index.html`** | Inventario por SKU en tiendas/almacén, pero **expone stock numérico a `AN01`** en `productDetailModal.ts:110-112`, `productCatalog.ts:217-220` y `offersCarousel.ts:31`. |
| `RN-INV-02` | ⚠️ Casi Completo | `posStore.ts:678-681`, `almacenStore.ts:784-786, 876, 906-908`. (`adminMain.ts:1660` llama `adjustSkuStock(v.sku, 0)` sin efecto; `almacenStore.ts:472` no descuenta stock al simular pago). |
| `RN-INV-03` | ✅ Implementado | `adminStore.ts:339-341, 468-491` (umbral `stock <= 5`), `adminMain.ts:289-291, 805-888`. |
| `RN-INV-04` | ⚠️ Parcial | `cantidadDanada` en `almacenStore.ts:742-751` bloquea ingreso OC; falta flujo independiente de merma en tienda. |
| `RN-INV-05` | ❌ Faltante | Sin interfaz de conteo físico mensual ni reporte de diferencias. |
| `RN-COM-01` | ✅ Implementado | `almacenStore.ts:589-684`, `adminMain.ts:572-721`. |
| `RN-COM-02` | ⚠️ Parcial | `rejectPurchaseOrder` (`almacenStore.ts:686-714`) marca `rechazada`; falta UI para reabrir/editar cotización. |
| `RN-COM-03` | ✅ Implementado | `almacenStore.ts:716-798` exige `guiaRemision` ($\ge 4$ caracteres) previo al ingreso de stock. |
| `RN-COM-04` | ✅ Implementado | `almacenStore.ts:769-780` (`pagoBloqueado = true`), `almacenMain.ts:1164-1193` (acta A4). |
| `RN-COM-05` | ❌ Faltante | Sin ejecución de pago a proveedor ni registro de egreso en caja. |
| `RN-ENV-01` | ✅ Implementado | `almacenStore.ts:485-519` (`IO-TRK-*`), `almacenMain.ts:1098-1127` (guía A4). |
| `RN-ENV-02` | ✅ Implementado (Nota rol) | `almacenStore.ts:541-565` valida `receptorNombre` ($\ge 3$) + `receptorDni` (8 dígitos) en `almacen.html`. |
| `RN-ENV-03` | ✅ Implementado | `almacenStore.ts:536-539, 566-583` (`intento_1_fallido` → `devuelto_almacen` al 2.º fallo). |
| `RN-ENV-04` | ⚠️ Discrepancia Tarifa | Gratis $> \text{S/ } 150$ en ambos, pero `cartDrawer.ts:4-5,18-20` cobra `S/ 10` y `almacenStore.ts:85,119,145` cobra `S/ 12`. |
| `RN-MKT-01` | ⚠️ Fuga y Sin Consumo | `marketingStore.ts:219-235, 511-525, 699-740` valida fechas/cupo/baja en 0. **Brechas:** `offersCarousel.ts:31` muestra stock numérico en daltonismo; checkout web no decrementa `stock_consumido`. |
| `RN-MKT-02` | ✅ Implementado | `footer.ts:28-46` (guía de tallas en cm), `marketingMain.ts:449-618` (fotos, descripciones, `alt_text`). |
| `RN-MKT-03` | ✅ Implementado | `accesoMain.ts:124, 427-438`, `main.ts:140`, `cartDrawer.ts:161-171`, `marketingStore.ts:533-539` (desmarcada por defecto). |
| `RN-MKT-04` | ✅ Implementado | `marketingStore.ts:554-558, 589-623`, `adminMain.ts:482-547`. |
| `RN-PRE-01` | ✅ Implementado | `almacenStore.ts:847-849, 878-884`, `almacenMain.ts:964-970, 1128-1158`, `adminStore.ts:519-546`. |
| `RN-PRE-02` | ✅ Implementado | `almacenStore.ts:819-824`, `posStore.ts:824-829` (1 a 7 días calendario). |
| `RN-PRE-03` | ✅ Implementado | `almacenStore.ts:871, 876` (`en_consignacion` + `adjustSkuStock(invItem.sku, -qty)`). |
| `RN-PRE-04` | ✅ Implementado | `almacenStore.ts:889-945` (`devuelto` reingresa stock; `liquidado_caja` genera `PosAllyDebt`). |
| `RN-PRE-05` | ⚠️ Parcial | Liquida al `precioReferencia` retail; sin flujo diferenciado de recargo mayorista por prenda dañada. |
| `RN-FIN-01` | ⚠️ Datos Sembrados | `adminStore.ts:23-76` calcula `neto` desde filas semilla (sin vínculo dinámico a asistencia ni comisiones POS). |
| `RN-FIN-02` | ✅ Implementado | `adminStore.ts:252-261`, `adminMain.ts:724-804`. |
| `RN-FIN-03` | ⚠️ Parcial | Genera referencia `BCP-...` (`adminStore.ts:264`); sin boleta de pago imprimible/firmada. |
| `RN-FIN-04` | ⚠️ Parcial | Descuenta `saldoBancarioBase` y registra `adminState.auditLog` (`adminStore.ts:265-277`), sin insertar egreso en `movimientosCaja`. |
| `RN-FIN-05` | ✅ Implementado | `adminStore.ts:245-250` impide re-ejecución; checkbox Poka-Yoke en `adminMain.ts:774-785`. |
| `RN-TRI-01` | ✅ Implementado (JS Number) | `posStore.ts:357-358, 669-675` (`B001-######` / `F001-######`, IGV 18% con `roundMoney`). |
| `RN-TRI-02` | ✅ Implementado | `posStore.ts:575-591` (DNI 8 dígitos opcional en Boleta; RUC 11 dígitos + Razón Social obligatorios en Factura). |
| `RN-TRI-03` | ⚠️ Parcial | `posStore.ts:719-736` solo anula `pendiente_cobro`; bloquea anulación de `cobrado` (`L728-730`) sin flujo de Nota de Crédito. |
| `RN-TRI-04` | ⚠️ LocalStorage | Persistido en `io_pos_state_v1`; solo `window.print()` (sin archivo digital XML/PDF). |
| `RN-SEG-01` | ✅ Implementado (Demo) | `demoSession.ts:309-371` valida RBAC; incluye 7.º rol `respaldo` y cruce `vendedor`/`cajero` en `pos-*`. |
| `RN-SEG-02` | ✅ Implementado | Cero campos PAN/CVV en todo `frontend/src/`. |
| `RN-SEG-03` | ✅ Implementado (salvo POS) | `almacenStore.ts:43-61`, `marketingStore.ts:323-339`, `adminStore.ts:183-210`, unificados en `adminStore.ts:682-700`. `posStore.ts` no posee arreglo `auditLog`. |
| `RN-SEG-04` | ✅ Implementado (Demo) | Modal privacidad (`footer.ts:69-76`), `demoSession.ts:201-213` omite correo/teléfono/opt-in de `io_demo_session_v1`. |

---

## 5. Accesibilidad (`RN-ACC-01..06` y Corte `24/11/2026`)

| Regla | Estado Real en Código | Evidencia y Brechas |
|---|---|---|
| `RN-ACC-01` (Contraste y Alto Contraste) | ✅ Cumplido en tienda / ⚠️ Acotado | Paleta `tokens.css` cumple AA/AAA; `@media (prefers-contrast: more)` (`tokens.css:219-293`) e `.io-mode-colorblind` (`storefront.css:3362-3520`) aplican `#000000`/`#FFFF00` (`19.56:1`) solo a `body.io-storefront` (`24/11/2026`). |
| `RN-ACC-02` (Color no único / Daltonismo) | ⚠️ Parcial (solo en modo activo) | Nombre textual siempre visible; las **6 texturas SVG** (`productCatalog.ts:10-78`) y descripciones `color_textura` se muestran solo si `colorblindMode === true`. El enlace **OFERTAS** conserva punto indicador + subrayado permanente. |
| `RN-ACC-03` (Teclado, foco y objetivos táctiles) | ⚠️ Brechas puntuales | Anillo doble `:focus-visible` (`2px solid #c98a7b` + `0 0 0 2px #261e1b`) implementado. **Brechas:** `index.html` sin `.skip-link`; **0 trampas `Tab`/`Shift+Tab`** en modales/drawers; botones `< 44px` en tienda (`.io-color-circle-btn.is-extra` `40×40px`, `.io-cat-chip`/`.io-showcase-tab` `40px`, `.io-carousel-dot` `22×40px`/`38×40px`, links pie/menú) y `< 48px` en POS/Admin (`.pos-btn-md`/`.pos-seg-btn` `38px`, `.pos-qty-btn` `36×36px`, `.pos-nav-tab`/`.adm-sev-tab` `34px`, `.pos-variant-pill` `30px`). |
| `RN-ACC-04` (WAI-ARIA, `<h1>`, `aria-live`) | ⚠️ Brechas puntuales | `aria-live` activo en `index.html` y `acceso.html` (excluido de las 6 rutas internas por corte `24/11/2026`). **Brechas:** `pos-cajero.html` sin `<h1>`; `index.html` Home sin `<h1>` si 0 ofertas activas (`offersCarousel.ts:25`); `brandsSection.ts:40` usa `role="list"` con `<button>` sin `role="listitem"`. |
| `RN-ACC-05` (Escalado `rem` y `reduced-motion`) | ✅ Cumplido | Tipografía en `rem`, `io-mode-colorblind` eleva base a `1.125rem` (`line-height: 1.65`) y `@media (prefers-reduced-motion: reduce)` (`tokens.css:296-307`) anula animaciones en toda la app. |
| `RN-ACC-06` (Poka-Yoke y consentimiento) | ✅ Cumplido | Confirmación explícita en cierre de planilla (`adminMain.ts:774-785`), anulación y préstamos; casilla *opt-in* desmarcada por defecto (`cartDrawer.ts:161-171`, `accesoMain.ts:427-438`). |

---

## 6. Discrepancias Verificadas entre Código y Documentación

### 6.1 Discrepancias Funcionales, Cross-Módulo y UI/CSS (17 Hallazgos Verificados)
1. **Exposición numérica de stock al comprador `AN01` (`index.html`):** `productDetailModal.ts:110-112` (modo normal y daltonismo), `productCatalog.ts:217-220` (modo daltonismo) y `offersCarousel.ts:31` (modo daltonismo) muestran cifras exactas de inventario, contradiciendo la regla del `24/11/2026`.
2. **Tarifa de envío urbano inconsistente:** `cartDrawer.ts:5` cobra `FLAT_URBAN_SHIPPING = 10` (`S/ 10.00`), mientras `almacenStore.ts:85, 119, 145` usa `flete: 12` (`S/ 12.00`).
3. **Plazo de cambios/devoluciones inconsistente:** `cajeroMain.ts:515` imprime **7 días calendario (`RN-VEN-05`)**, mientras `footer.ts:20` indica **15 días calendario**.
4. **Razón Social y RUC inconsistentes:** `footer.ts:65, 83-84, 255, 259-260` muestra `I&O · Lima, Perú` / `Comercializadora Retail I&O` y `RUC 10458796321`, mientras `cajeroMain.ts:420-421` y `almacenMain.ts:1209-1210` muestran `I&O MODA RETAIL S.A.C.` y `RUC 20609988771`.
5. **Precio promocional POS vs. total cobrado vs. tienda:** `vendedorMain.ts:661-672` muestra `-20%` sobre `active.precio_venta` (`S/ 47.92`), pero `vendedorMain.ts:287, 726` y `posStore.ts:487` cobran `base.precio_venta` (`S/ 59.90`) ignorando el descuento; paralelamente `marketingStore.ts:847-849` calcula `-20%` sobre `product.precio_regular` (`S/ 63.92` en `index.html`).
6. **Carrusel Hero `onlyOffers` omite `productoIds`:** `marketingStore.ts:907-931` no propaga `productoIds` al mapear `CampanaOferta` para Hero, haciendo que `main.ts:168-181, 252-260` filtre solo por `categoriaTarget`.
7. **Semilla muerta en Marketing:** `marketingStore.ts:50` referencia `product.groupId === 'hoodie-capas-studio'`, inexistente en `CATALOGO_PRODUCTOS`.
8. **Llamada sin efecto al crear modelo desde Dirección:** `adminMain.ts:1660` invoca `adjustSkuStock(v.sku, 0)`, que siempre retorna `false` (`posStore.ts:322`); además `vendedorMain.ts` no se suscribe a `subscribeCatalogEvents()`.
9. **Claves heredadas en `PENDING_ZONE_CONFIG`:** `demoSession.ts:105-126` conserva `administracion`, `almacen` y `marketing` pese a que esos roles ya poseen HTML dedicados.
10. **Semillas independientes POS Aliados vs. Almacén Préstamos:** `posStore.ts:94-137` (`ALI-001`, `ALI-002`) y `almacenStore.ts:242-291` (`PRE-001`, `PRE-002`) mantienen semillas separadas para las mismas empresas.
11. **Compromisos inmediatos en Dirección:** `adminStore.ts:330-333` suma OCs en estado `pendiente_aprobacion` dentro de `compromisosInmediatos`.
12. **Sincronía incompleta de catálogo nuevo en Tienda:** `main.ts:1259` escucha `subscribeMarketingEvents` pero no `subscribeCatalogEvents` (`customCatalogStore.ts:41`).
13. **Bug CSS `.alm-doc-backdrop` en Marketing:** `marketingMain.ts:1378` usa `<div class="alm-doc-backdrop">` para su modal de Bitácora, pero no importa `almacen.css` ni `marketing.css` define esa clase.
14. **Ausencia de `<h1>` en `pos-cajero.html` y `<h1>` condicional en Home:** `cajeroMain.ts` salta a `<h2>`; `index.html` en Home carece de `<h1>` si no hay ofertas vigentes (`offersCarousel.ts:25`).
15. **Semántica ARIA en marcas y modal pie de página:** `brandsSection.ts:40` coloca `<button>` directo bajo `role="list"` sin `role="listitem"`; `footer.ts:275` usa `.io-modal-wrap` sin regla CSS.
16. **Falta de `.skip-link` en `index.html` y trampa `Tab` en modales:** `tokens.css:143` define `.skip-link` pero solo `acceso.html:20` lo usa; ningún modal/drawer atrapa `Tab`/`Shift+Tab`.
17. **Controles táctiles `< 44px` en tienda y `< 48px` en POS/Admin:** Ver matriz detallada en `guia_estilos_espresso_piedra.md` §3.2.

### 6.2 Discrepancias Corregidas en la Documentación M1 (`README.md` y `guia_estilos_espresso_piedra.md` previos)
- Se actualizó el inventario de `5` a **8 HTML**, `4` a **7 CSS**, añadiendo `vite.config.ts`, `almacen/`, `marketing/`, `admin/` y `customCatalogStore.ts`.
- Se corrigió la afirmación de checkout 3 pasos/pasarela en `index.html` (stub en `main.ts:1178-1183`) y de Okabe-Ito en `M07/M08` (`admin.css` usa Espresso & Piedra).
- Se corrigió el logo (`logo-io.png` activo en disco, alturas reales `30px`/`26px`, `36px`, `24px`), header RGBA (`0.96`/`0.84`), hero Ken Burns (`scale(1.045)`, delay `0.25s`), elevaciones (`-3px`/`-4px`/`-2px`), `.is-closing` (`220ms`/`200ms`) y los 35 tokens `:root` + 11 overrides `--bs-*`.

---

## 7. Backlog Priorizado de Remediación (Fuera del Alcance R1/R3)

1. **Prioridad Alta — Consistencia Financiera y Negocio:** Unificar Razón Social/RUC (`I&O MODA RETAIL S.A.C.` / `20609988771`), tarifa de envío (`S/ 10` vs `S/ 12`), ventana de cambios (`7` vs `15` días), cálculo de precio promocional en `posStore.ts` + `marketingStore.ts`, e incorporar `auditLog` en POS y `NotaCredito` (`RN-TRI-03`).
2. **Prioridad Alta — Accesibilidad y Regla `AN01`:** Ocultar stock numérico al comprador en `productDetailModal.ts`, `productCatalog.ts` y `offersCarousel.ts`; añadir `.skip-link` en `index.html`, `<h1>` fijo en `pos-cajero.html` y Home, `role="listitem"` en `brandsSection.ts` y trampa de foco `Tab` en modales/drawers.
3. **Prioridad Media — Bugs UI/Sincronía:** Definir `.alm-doc-backdrop` en `marketing.css` (o unificar modal compartido), propagar `productoIds` en `getEffectiveHeroOffers`, suscribir `main.ts` y `vendedorMain.ts` a `subscribeCatalogEvents()`, y ajustar alturas mínimas de botones `< 44px`/`48px`.
4. **Prioridad Baja — Integración Backend (`M01`–`M08`):** Reemplazar el stub `cart-checkout` por checkout 3 pasos (`RN-ECO-06`) con pasarela tokenizada (`RN-ECO-02`), tracker 6 estados (`RN-ECO-04`), cancelación online (`RN-ECO-05`), pago a proveedores (`RN-COM-05`) y boletas de planilla (`RN-FIN-03`).
