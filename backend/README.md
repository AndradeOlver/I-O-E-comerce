# ⚙️ Backend – Sistema Omnicanal I&O (`1.3 backend/`)

> **Estado Actual:** ✅ **Stack Aprobado: Node.js + Express (TypeScript)** — Aprobado el `20/11/2026` en [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md)  
> **Avance de implementación (`27/11/2026`):** Fase 0 iniciada; configuración, SQL Server, errores, JWT/RBAC, autenticación, catálogo y salud implementados. Fase 1 M01 incluye alternativas SKU y creación autenticada de órdenes POS con transacción y auditoría.
> **Contratos API (`docs_api/`):** ✅ Completados (`openapi.yaml`, `MATRIZ_RBAC_ENDPOINTS.md`, `CATALOGO_CODIGOS_RN.md`) y alineados con el `frontend/` implementado y `DB/esquemas/*.sql`.  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**  
> **Fuentes de Verdad:**
> * Reglas y procesos RUP: `../documentos/Model Soft Proyecto/Informacion del negocio/03_Reglas_de_Negocio_IO.md`
> * Requisitos priorizados y accesibilidad WCAG 2.1 AA: `../documentos/Interaccion Humano Com Proyecto/Informacion_IHC/03_Requerimientos_y_Reglas_Accesibles_IO.md`
> * Esquemas físicos SQL Server: `../DB/esquemas/01_esquema_io_sqlserver.sql`, `../DB/esquemas/01_esquema_io_sqlserver_variantes.sql`, `../DB/esquemas/02_extension_catalogo_taxonomia.sql` y `../DB/seeds/01_datos_iniciales_io.sql`
> * Código fuente frontend verificado (solo lectura): `../frontend/*.html` y `../frontend/src/**`

---

## Estado de implementación

La Fase 0 tiene implementados `/api/health`, `/api/config/empresa`, autenticación de empleados y clientes, consulta pública de catálogo y taxonomía, e inventario con JWT y RBAC. En M01 se implementaron las alternativas de SKU y la creación de órdenes en transacción SQL con auditoría. Configura SQL Server y JWT mediante `.env`; aplicar `DB/esquemas/03_auth_cliente_password.sql` a bases existentes antes de habilitar registro de clientes. El cobro y la cola de Caja vía API siguen pendientes.

## 📂 Organización y Árbol Arquitectónico de `backend/`

> **Patrón Arquitectónico Aprobado (`22/11/2026`):** **Monolito Modular por Dominio (*Feature-Sliced*)** en 4 capas por módulo (`*.schema.ts` → `*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts`) con validación **`Zod`**, acceso a datos mediante **`mssql` (`tedious`) parametrizado sin ORM pesado**, hashing de contraseñas (**`bcryptjs`/`argon2`**) + **JWT**, precisión monetaria con **`decimal.js`**, tareas programadas con **`node-cron`** y construcción incremental en **4 Fases (Fase 0 a Fase 3)**.

```text
backend/
├── docs_api/
│   ├── openapi.yaml                   # Contrato REST OpenAPI 3.0.3 (Swagger UI en /api/docs)
│   ├── MATRIZ_RBAC_ENDPOINTS.md       # Matriz 1:1 de permisos (TN01-TN05, AN01, Público, demo respaldo)
│   └── CATALOGO_CODIGOS_RN.md         # Catálogo de 49 RN-* operativas + 6 RN-ACC-* + mapeo SQL Server
├── src/
│   ├── config/
│   │   ├── env.ts                     # Validación estricta de .env y parámetros canónicos con Zod
│   │   ├── db.ts                      # ConnectionPool singleton de mssql + helper withTransaction()
│   │   └── logger.ts                  # Logger estructurado
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.ts            # new BusinessRuleError('RN-PRE-01', '...', 422, 'field')
│   │   │   └── sqlErrorMapper.ts      # Traduce errores 547/2627/2601/50000/515/1205 a códigos RN-*
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # Verifica JWT (Empleado TN01-TN05 o Cliente AN01)
│   │   │   ├── rbac.middleware.ts     # requireRole('Administrador', 'Almacenero') (RN-SEG-01)
│   │   │   ├── validate.middleware.ts # Ejecuta esquemas Zod (body, query, params)
│   │   │   └── error.middleware.ts    # Respuesta JSON uniforme para Poka-Yoke y aria-live
│   │   ├── services/
│   │   │   └── audit.service.ts       # Inserta en dbo.AuditLog dentro de la MISMA transacción (RN-SEG-03)
│   │   └── utils/
│   │       └── money.ts               # Helpers con decimal.js (IGV 18%, desc. <= 10%, flete > S/150, planilla)
│   ├── jobs/
│   │   └── releaseExpiredCarts.job.ts # Cron cada 1 min (node-cron): libera reservas > 15 min (RN-ECO-03)
│   ├── modules/                       # 1 carpeta por dominio (schema, routes, controller, service, repository)
│   │   ├── auth/                      # Login empleados/clientes, registro AN01 con opt-in default 0, /me
│   │   ├── catalogo/                  # Taxonomía 8x30, proyección dual (pública sin stock vs interna), alta modelos
│   │   ├── m01-ventas-pos/            # CUN01: SKU, alternativas, POS promo, abonos, Boleta/Factura/NC, arqueo, Aliados
│   │   ├── m02-ecommerce/             # CUN02: Reserva 15 min, checkout 3 pasos, 6 estados, webhook PCI-DSS (3 reintentos)
│   │   ├── m03-envios/                # CUN03: Picking post-pago, GuiaEnvio tracking, flete S/10 (>S/150 gratis), 2 intentos
│   │   ├── m04-compras/               # CUN04: Alertas stock <= 5, proveedores, OC, reapertura RN-COM-02, recepción, pago
│   │   ├── m05-marketing/             # CUN05: Editorial, hero, colecciones, campañas INDECOPI, baja en 0, opt-in Ley 29733
│   │   ├── m06-prestamos/             # CUN06: Consignación <= 7 días, Constancia Almacenero RN-PRE-01, deterioro RN-PRE-05
│   │   ├── m07-finanzas-planilla/     # CUN07: Cálculo RN-FIN-01, liquidez RN-FIN-02, boleta RN-FIN-03, egreso, cierre inmutable
│   │   └── m08-dashboard/             # KPIs, cola de decisiones por área, analítica multicanal y AuditLog unificado
│   ├── app.ts                         # Configuración Express (Helmet, CORS, rutas /api/*, Swagger, errorHandler)
│   └── server.ts                      # Arranque del servidor, test de pool SQL Server y registro de cron jobs
├── tests/
│   ├── integration/                   # Pruebas de endpoints con Vitest + Supertest
│   └── unit/                          # Pruebas unitarias de reglas críticas (IGV, RN-PRE-01, descuentos, flete)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md                          # Este documento arquitectónico
```

---

## 🗄️ Fuentes de Verdad SQL Server (`DB/`) y Reconciliación con `frontend/`

El servidor `backend/` opera sobre la base de datos **`IO_Ecommerce`** en **Microsoft SQL Server (`mssql` / `tedious`)** con consultas T-SQL parametrizadas (`request.input(...)`) sin ORM pesado, integrando tres scripts de esquema y un script semilla:

1. **`../DB/esquemas/01_esquema_io_sqlserver.sql` (Base 20/11/2026 — 18 tablas):** Define la herencia Tabla-por-Tipo (`Pedido` → `PedidoCliente`/`PedidoProveedor`, `DetallePedido` → `DetallePedidoCliente`/`DetallePedidoProveedor`), columnas calculadas `PERSISTED` (`DetallePedido.subtotal`, `PrestamoProductos.fecha_vencimiento`, `Planilla.sueldo_neto`), índice único filtrado (`UX_Prestamo_Constancia`), triggers inmutables (`TR_Planilla_BloqueoRetroactivo`, `TR_AuditLog_Inmutable`), restricciones `CHECK`/`UNIQUE` y la bitácora `dbo.AuditLog`.
2. **`../DB/esquemas/01_esquema_io_sqlserver_variantes.sql` (Evolución 24/11/2026 — 19 tablas):** Separa el modelo base **`dbo.Producto`** (`producto_id`, `categoria_id`, `nombre`, `marca`, `UQ_Producto_NombreMarca`) de sus variantes físicas por SKU **`dbo.ProductoVariante`** (`variante_id`, `producto_id`, `sku`, `talla`, `color`, `color_textura`, `alt_text`, `precio_compra`, `precio_venta`, `stock`, `stock_minimo`, `IX_ProductoVariante_StockBajo`). `DetallePedido` y `PrestamoProductos` referencian `variante_id`. Esta estructura coincide directamente con `ProductGroup` + `ProductVariant` en `frontend/src/types/store.types.ts`.
3. **`../DB/esquemas/02_extension_catalogo_taxonomia.sql` (Extensión de Taxonomía):** Extiende `dbo.Categoria` con `slug` (`UX_Categoria_Slug`) y `orden` para las **8 categorías oficiales**, crea `dbo.Subcategoria` con exactamente **30 subcategorías** (`aplica_hombre`, `aplica_mujer`, `aplica_ninos`) alineadas 1:1 con `frontend/src/data/catalogData.ts`, agrega `subcategoria_id`, `genero` (`Hombre`/`Mujer`/`Ninos`/`Unisex`) y `rango_edad` (`Bebes`/`Infantil`/`Junior`, con `CK_Producto_NinosEdadObligatoria`) en `dbo.Producto`, incorpora `genero_target`/`rango_edad_target` en `dbo.CampanaMarketing` y define la vista `dbo.vw_OfertasActivas`.
4. **`../DB/seeds/01_datos_iniciales_io.sql`:** Datos semilla iniciales (5 empleados `TN01`–`TN05`, categorías iniciales, productos, 1 proveedor y 1 cliente).

### Notas de Adaptación y Extensiones Aditivas del Esquema en `Fase 0`–`Fase 3`
* **Adaptación obligatoria de `02_extension_catalogo_taxonomia.sql` sobre `01_esquema_io_sqlserver_variantes.sql`:** `02_extension` fue redactado originalmente contra el esquema plano (`01_esquema`), por lo que `vw_OfertasActivas` (líneas 211, 214, 229) e `IX_Producto_Genero_Edad_Subcat` (línea 175) referencian `p.sku`, `p.precio_venta` y `p.stock` sobre `dbo.Producto`. Al desplegar sobre `01_esquema_io_sqlserver_variantes.sql`, el backend/migración debe unir `dbo.ProductoVariante pv ON pv.producto_id = p.producto_id` dentro de `vw_OfertasActivas` (`pv.activo = 1 AND pv.stock > 0`) y proyectar el índice `IX_Producto_Genero_Edad_Subcat` sin columnas de variante.
* **Extensiones aditivas requeridas por los módulos implementados en `frontend/`** (sin romper restricciones existentes):
  * **`M05` CMS / Editorial (`marketingStore.ts`):** Tablas o columnas aditivas para `ProductEditorialOverride` (`frase_corta`, `imagen_url`, `completado_editorial`, `recien_llegado`), `MarketingHeroSlide` y `MarketingCollection`, más columnas `aplica_tienda_fisica`, `incluye_captura_optin`, `optin_verificado`, `scope_type`, `collection_id` y `porcentaje_descuento` en `dbo.CampanaMarketing`.
  * **`M04` Validación de Proveedores (`almacenStore.ts` / `adminMain.ts`):** Columna `estado NVARCHAR(25)` (`pendiente_validacion` | `aprobado` | `rechazado`) y `rubro` / `motivo_rechazo` en `dbo.RegistroProveedor`.
  * **`M01` / `M06` Cuentas de Aliados y Abonos (`posStore.ts`):** Tabla aditiva `dbo.CuentaAliado` (`PosAllyDebt`: vínculo opcional `prestamo_id` → `PrestamoProductos`, `tipo`: `consignacion` | `credito`, `dias_plazo`, `saldo_pendiente`, `estado`) y tabla `dbo.PagoPedido` / `dbo.AbonoAliado` para cobros parciales y arqueo diario.
  * **`M08` Revisión de Decisiones (`adminStore.ts`):** Tabla o registro en `dbo.AuditLog` para persistir `acknowledged` de la cola de decisiones gerenciales (`POST /api/dashboard/decisiones/:id/revisar`).

---

## 🏗️ Arquitectura Interna por Módulo y 5 Mecanismos Transversales

### 1. Capas de cada Módulo (`src/modules/<modulo>/`)
* **`<modulo>.schema.ts` (`Zod`):** Valida `body`, `params` y `query`, infiriendo los DTOs en TypeScript y rechazando campos prohibidos (ej. `pan`/`cvv` por `RN-SEG-02`).
* **`<modulo>.routes.ts`:** Declara endpoints REST y encadena `authenticate`, `requireRole(...)` y `validate(...)`.
* **`<modulo>.controller.ts`:** Extrae datos validados de `req`, invoca al servicio y responde con JSON estandarizado.
* **`<modulo>.service.ts`:** Ejecuta las reglas de negocio (`RN-*`), cálculos exactos con `decimal.js`, coordinación transaccional (`withTransaction`) y auditoría obligatoria (`auditService.log(tx, ...)`).
* **`<modulo>.repository.ts`:** Única capa que ejecuta consultas T-SQL parametrizadas con `mssql` sobre `IO_Ecommerce`.

### 2. Los 5 Mecanismos Transversales Obligatorios (`src/config/` y `src/shared/`)
1. **Wrapper Transaccional ACID (`withTransaction` en `src/config/db.ts`):** Toda escritura que abarque herencia (`Pedido` + subclase), descuento condicional atómico de stock (`UPDATE dbo.ProductoVariante SET stock = stock - @cantidad WHERE variante_id = @varianteId AND stock >= @cantidad AND activo = 1`), emisión de `ComprobantePago`, `MovimientoFinanciero` o `PrestamoProductos` se ejecuta dentro de una única transacción SQL Server (`RN-VEN-06`, `RN-INV-02`).
2. **Auditoría Forense Atómica (`auditService.log(tx, ...)` — `RN-SEG-03`):** Recibe obligatoriamente la transacción activa `tx` e inserta en `dbo.AuditLog` (protegida por `TR_AuditLog_Inmutable`). Obligatoria en Constancia Formal de Préstamo emitida por el Almacenero (`RN-PRE-01`), aprobación/rechazo/reapertura de compras (`RN-COM-01`, `RN-COM-02`, `RN-COM-04`), Notas de Crédito (`RN-TRI-03`), descuentos POS (`RN-VEN-03`) y cierres de planilla (`RN-FIN-05`).
3. **Mapeador de Errores (`sqlErrorMapper.ts` + `AppError.ts`):** Traduce `BusinessRuleError` y errores nativos de SQL Server (`547` `CHECK`/`FK`, `2627` `UNIQUE`, `2601` `UNIQUE INDEX`, `50000` `RAISERROR` de triggers, `515` `NOT NULL`, `1205` deadlock) al contrato JSON uniforme para alertas *Poka-Yoke* y regiones `aria-live` (`RN-ACC-04`, `RN-ACC-06`):
   ```json
   {
     "ok": false,
     "ruleCode": "RN-PRE-01",
     "error": "CONSTANCIA_FORMAL_REQUERIDA",
     "message": "Cuando el Gerente no está disponible, el Almacenero debe consignar el número de Constancia Formal de Préstamo.",
     "field": "numero_constancia_formal"
   }
   ```
4. **Precisión Monetaria (`src/shared/utils/money.ts` con `decimal.js`):** Todo cálculo de **IGV (`18%`, `RN-TRI-01`)**, topes de **descuento (`<= 10%`, `RN-VEN-03`)**, **precios promocionales POS/Web**, **flete urbano (`S/ 10.00` o `S/ 0.00 > S/ 150.00`, `RN-ENV-04`)** y **planilla (`RN-FIN-01`)** usa `Decimal` con redondeo `ROUND_HALF_UP` a 2 decimales.
5. **Job de Reserva de Carrito (`src/jobs/releaseExpiredCarts.job.ts` — `RN-ECO-03`):** Tarea `node-cron` cada 1 minuto que busca `PedidoCliente` con `estado_online = N'Pendiente de pago'` y `reserva_expira_en < SYSDATETIME()`, restituyendo el stock de `ProductoVariante` y actualizando el pedido a `Cancelado` dentro de una transacción ACID.

---

## 🔗 Mapeo Frontend (`frontend/`) ↔ API Backend (`backend/`)

### 1. Correspondencia de las 8 Vistas HTML y Roles (`demoSession.ts`)
| Vista HTML (`frontend/`) | Entrypoint TS | Módulo(s) Backend | Roles Permitidos en Producción (`CK_Empleado_RolRBAC` / Externo) |
|---|---|---|---|
| `index.html` | `src/main.ts` | `catalogo` (público), `m02-ecommerce`, `m05-marketing` (`/publico`), `config` | Público / Invitado y `AN01` (`cliente`) — única vista con `RN-ACC-01..06` completos (`io-mode-colorblind`, tramas SVG, `prefers-contrast: more`) |
| `acceso.html` | `src/auth/accesoMain.ts` | `auth` (`login`, `register`, `me`, `logout`) | Público (login 5 roles internos + registro/login `AN01`; en demo ofrece perfil `respaldo`) |
| `pos-vendedor.html` | `src/pos/vendedorMain.ts` | `catalogo` (`/inventario`), `m01-ventas-pos` (`alternativas`, `ordenes`) | `TN02` (`Vendedor`), `TN01` (`Administrador`) *(demo permite lectura cruzada a `TN05` `Cajero`)* |
| `pos-cajero.html` | `src/pos/cajeroMain.ts` | `m01-ventas-pos` (`ordenes`, `pagos`, `comprobantes`, `nota-credito`, `arqueo`, `aliados`), `config` | `TN05` (`Cajero`), `TN01` (`Administrador`) *(demo permite lectura cruzada a `TN02` `Vendedor`)* |
| `almacen.html` | `src/almacen/almacenMain.ts` | `m03-envios`, `m04-compras`, `m06-prestamos`, `catalogo` (`/inventario`), `config` | `TN04` (`Almacenero`), `TN01` (`Administrador`) *(en `M03` entregas `TN02` también permitido por `RN-ENV-02`)* |
| `marketing.html` | `src/marketing/marketingMain.ts` | `m05-marketing` (`editorial`, `uploads`, `hero`, `colecciones`, `campanas`), `catalogo` (`/inventario`), `m08-dashboard` (`/auditoria` acotada) | `TN03` (`Community Manager`), `TN01` (`Administrador`) *(aprobación `RN-MKT-04` exclusiva de `TN01`)* |
| `admin.html` | `src/admin/adminMain.ts` | `m08-dashboard`, `m07-finanzas-planilla`, `m04-compras` (aprobaciones/pagos), `m05-marketing` (aprobaciones), `catalogo` (`POST /modelos`) | `TN01` (`Administrador`) |
| `zona-preparacion.html` | `src/auth/pendingZoneMain.ts` | `auth` (`/me`), `health` | **Solo demo:** perfil `respaldo` (`?zona=operaciones`) sin acciones operativas ni acceso a `M01`–`M08` |

### 2. Migración de Estado Demo (`localStorage` + `BroadcastChannel`) a Persistencia REST
En el prototipo `frontend/`, la sincronización multi-pestaña opera con 6 llaves de `localStorage` y 5 `BroadcastChannel`s. Al conectar el `backend/`, cada almacenamiento local migra al servidor manteniendo sincronización mediante **polling controlado o Server-Sent Events (SSE) + webhooks**:

| Llave `localStorage` Demo | `BroadcastChannel` Demo | Reemplazo Autoritativo en Backend |
|---|---|---|
| `io_demo_session_v1` *(TTL 8h)* | — | JWT Bearer (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`) |
| `io_custom_catalog_v1` | `io_custom_catalog_ch_v1` | `POST /api/catalogo/modelos` + `GET /api/catalogo/productos` / `inventario` (`dbo.Producto` + `ProductoVariante`) |
| `io_pos_state_v1` | `io_pos_channel_v1` | `m01-ventas-pos` (`/api/pos/ordenes`, `/pagos`, `/arqueo`, `/aliados`, `/nota-credito`) |
| `io_almacen_state_v1` | `io_almacen_channel_v1` | `m03-envios`, `m04-compras`, `m06-prestamos` (`dbo.GuiaEnvio`, `PedidoProveedor`, `PrestamoProductos`) |
| `io_marketing_state_v1` | `io_marketing_sync` | `m05-marketing` (`/api/marketing/editorial`, `/hero`, `/colecciones`, `/campanas`, `/publico`) |
| `io_admin_state_v1` | `io_admin_channel_v1` | `m07-finanzas-planilla` + `m08-dashboard` (`dbo.Planilla`, `MovimientoFinanciero`, `AuditLog`) |

---

## 🛠️ Brechas del Demo y Discrepancias Resueltas por el Backend

La auditoría directa del código `frontend/` frente a las reglas de negocio (`03_Reglas_de_Negocio_IO.md` y `03_Requerimientos_y_Reglas_Accesibles_IO.md`) y los esquemas `DB/` identificó **8 brechas y conflictos concretos** que los contratos de `backend/docs_api/` resuelven de forma autoritativa en servidor:

1. **Checkout E-commerce `CUN02` actualmente stub en `index.html` (`main.ts:1178-1183, 1241-1255`):**
   * *Brecha en demo:* El botón `cart-checkout` solo emite un mensaje estático y el temporizador de 15 min (`RESERVE_DURATION_SECONDS = 900`) corre únicamente en el navegador. No existen formulario de 3 pasos (`RN-ECO-06`), 3 reintentos de pago (`RN-ECO-02`), seguidor de 6 estados (`RN-ECO-04`), cancelación del cliente (`RN-ECO-05`) ni descuento de `CampanaMarketing.stock_consumido` al comprar.
   * *Resolución Backend (`m02-ecommerce`):* Expone `POST /api/ecommerce/carrito/reservar` (bloqueo temporal 15 min + cron `releaseExpiredCarts.job.ts`), `POST /api/ecommerce/pedidos` (checkout completo de 3 pasos), `POST /api/ecommerce/pedidos/:id/pagar` + `POST /api/ecommerce/webhooks/pasarela` (tokenización PCI-DSS sin PAN/CVV `RN-SEG-02`, máximo `3` reintentos `RN-ECO-02` e incremento atómico de `stock_consumido`), `GET /api/ecommerce/pedidos/:id` / `mis-pedidos` (6 estados `RN-ECO-04`) y `POST /api/ecommerce/pedidos/:id/cancelar` (permitido antes de `"En envío"`, `RN-ECO-05`).
2. **Exposición de stock numérico a `AN01` en `index.html` (`productDetailModal.ts:110-112`, `productCatalog.ts:217-220`, `offersCarousel.ts:31`):**
   * *Brecha en demo:* Las vistas públicas muestran unidades exactas de `stock` y cupos de campaña (`remainingUnits/stock_maximo`) al comprador `AN01`, contraviniendo la regla del `24/11/2026` (`03_Requerimientos_y_Reglas_Accesibles_IO.md`).
   * *Resolución Backend (`catalogo` & `m05-marketing`):* Proyección estricta de DTOs duales: `GET /api/catalogo/productos` y `GET /api/marketing/publico` **omiten** cualquier cifra numérica (`stock`, `stock_minimo`, `stock_maximo`, `stock_consumido`) y exponen únicamente `disponible: boolean` (`estado_stock: 'disponible' | 'agotado'`) y `vigente: boolean`. Solo `GET /api/catalogo/inventario` (`TN01`–`TN05`) retorna cantidades numéricas exactas.
3. **Brecha de precio promocional en POS (`posStore.ts:487` vs `vendedorMain.ts:661-672`):**
   * *Brecha en demo:* `vendedorMain.ts` muestra precios promocionales cuando `aplicaEnTiendaFisica = true`, pero `posStore.ts:487` calcula la orden con `base.precio_venta` ignorando la campaña.
   * *Resolución Backend (`m01-ventas-pos`):* `POST /api/pos/ordenes` calcula cada línea en el servidor usando `decimal.js`, aplicando automáticamente `CampanaMarketing.precio_promocional` cuando `aplica_tienda_fisica = 1`, `aprobada_dueno = 1`, `activa = 1` y `stock_consumido < stock_maximo` dentro de vigencia, incrementando atómicamente `stock_consumido` al cobrar y validando `descuento_pct <= 10%` con autorización `TN01` (`RN-VEN-03`).
4. **Falta de `AuditLog` en POS y `NotaCredito` (`RN-TRI-03`) en `posStore.ts:728`:**
   * *Brecha en demo:* `posStore.ts` no registra eventos en `AuditLog` y bloquea anular pedidos en estado `cobrado` (sin emisión de Nota de Crédito).
   * *Resolución Backend (`m01-ventas-pos`):* Todas las operaciones críticas POS (descuentos, cobros, anulaciones, liquidación de Aliados) llaman a `auditService.log(tx, ...)` dentro de la misma transacción SQL (`RN-SEG-03`), y se habilita `POST /api/pos/ordenes/:id/nota-credito` (exclusivo `TN01` Administrador) que exige `motivo_anulacion`, emite `ComprobantePago` tipo `NotaCredito`, restituye stock en `ProductoVariante` y registra `Egreso` en `MovimientoFinanciero`.
5. **Brechas en `M04` Compras, `M05` Semilla muerta y `M04`/`adminMain.ts` Catálogo (`almacenStore.ts`, `marketingStore.ts:50`, `adminMain.ts:1660`):**
   * *Brecha en demo:* Faltan endpoints de reapertura de cotización rechazada (`RN-COM-02`) y pago a proveedor (`RN-COM-05`); `adminMain.ts:1660` ejecuta `adjustSkuStock(v.sku, 0)` (no-op); y `marketingStore.ts:50` referencia el ID inexistente `'hoodie-capas-studio'`.
   * *Resolución Backend (`m04-compras`, `catalogo`, `m05-marketing`):* Se formalizan `GET/POST /api/compras/proveedores` + `/aprobar` + `/rechazar`, `PATCH /api/compras/ordenes/:id/reabrir` (`RN-COM-02`) y `POST /api/compras/ordenes/:id/pagar` (`RN-COM-05`, bloqueado si `bloqueado_por_reclamo = 1` por `RN-COM-04`). Además, `POST /api/catalogo/modelos` crea persistentemente `Producto` + `ProductoVariante` con stock inicial real, eliminando la desincronización de `customCatalogStore.ts` y semillas muertas.
6. **Facturación por deterioro al por mayor en `M06` (`RN-PRE-05`) y enlace `Almacén M06` ↔ `Caja Aliados M01`:**
   * *Brecha en demo:* `almacenStore.ts:889-945` vincula el cierre `liquidado_caja` con `createAllyDebt` en `posStore.ts`, pero calcula el cobro al precio minorista (`precioReferencia`) sin opción diferenciada por deterioro al precio mayorista (`Facturado por Deterioro`, `RN-PRE-05`).
   * *Resolución Backend (`m06-prestamos` + `m01-ventas-pos`):* `POST /api/prestamos/:id/cerrar` soporta tres resoluciones formales alineadas al `CHECK` de SQL Server: `'devuelto'` (`Devuelto Intacto`), `'liquidado_caja'` (`Liquidado` → crea/vincula `CuentaAliado`) y `'deterioro_mayorista'` (`Facturado por Deterioro`, exigiendo `precio_mayorista > 0` y generando deuda/comprobante correspondiente).
7. **Brechas de Nómina en `M07` (`adminStore.ts:241-280`):**
   * *Brecha en demo:* La planilla `PLA-2026-11` usa filas estáticas de 5 empleados, no recalcula por días laborados/comisiones (`RN-FIN-01`), no genera ni registra boleta firmada (`RN-FIN-03`) y no inserta un asiento `Egreso` en `movimientosCaja` al cerrarse (`RN-FIN-04`).
   * *Resolución Backend (`m07-finanzas-planilla`):* Expone `POST /api/finanzas/planillas/calcular` (`RN-FIN-01` con `decimal.js`), `POST /api/finanzas/planillas/:periodo/cerrar` (verifica liquidez `RN-FIN-02`, inserta `MovimientoFinanciero` `Egreso` `RN-FIN-04` y bloquea `cerrada = 1` protegido por `TR_Planilla_BloqueoRetroactivo` `RN-FIN-05`), `GET /api/finanzas/planillas/:periodo/boletas/:empleadoId` + `PATCH .../firmar` (`RN-FIN-03`) y `GET /api/finanzas/movimientos`.
8. **Parámetros canónicos e identidad fiscal del emisor unificados en servidor (`GET /api/config/empresa`):**
   * *Discrepancias en demo:* Flete urbano `S/ 10` (`cartDrawer.ts:5`) vs `S/ 12` (`almacenStore.ts:85,119,145`); ventana de cambios `7 días` (`cajeroMain.ts:515`) vs `15 días` (`footer.ts:20`); Razón Social/RUC `I&O · Lima, Perú` / `10458796321` (`footer.ts`) vs `I&O MODA RETAIL S.A.C.` / `20609988771` (`cajeroMain.ts`, `almacenMain.ts`).
   * *Resolución Backend (`config` + `m01`/`m02`/`m03`):* El servidor es la fuente única de verdad: **tarifa de envío urbano `S/ 10.00`** (gratis `> S/ 150.00`, `RN-ENV-04`), **ventana de cambios `7 días calendario`** (`RN-VEN-05`) e **identidad fiscal `I&O MODA RETAIL S.A.C.` / `RUC 20609988771`** expuesta vía `GET /api/config/empresa` e incrustada en comprobantes, guías y constancias.

---

## 🚀 Modelo de Construcción Incremental por Fases (Hoja de Ruta Actualizada)

> **Nota de conteo normativo:** Aunque los tableros históricos citan *"42 reglas operativas + 6 `RN-ACC` = 48"*, la enumeración directa de `03_Reglas_de_Negocio_IO.md` (§3.1–§3.10) contiene **49 códigos operativos distintos (`RN-VEN-01`..`RN-SEG-04`)** más **6 reglas de accesibilidad (`RN-ACC-01`..`06`)**, sumando **55 códigos** catalogados íntegramente en [docs_api/CATALOGO_CODIGOS_RN.md](./docs_api/CATALOGO_CODIGOS_RN.md).

Para garantizar estabilidad transaccional y trabajo paralelo limpio entre **Olver Andrade** y **Josue Razuri**, el backend se implementa en **4 fases verificables**:

| Fase | Alcance y Entregables en `backend/` | Contratos y Reglas Verificadas | División Sugerida |
|:---:|---|---|---|
| **Fase 0**<br>*(Cimientos, Contratos y Catálogo)* | 1. ✅ Contratos en `docs_api/`: [`openapi.yaml`](./docs_api/openapi.yaml), [`MATRIZ_RBAC_ENDPOINTS.md`](./docs_api/MATRIZ_RBAC_ENDPOINTS.md) y [`CATALOGO_CODIGOS_RN.md`](./docs_api/CATALOGO_CODIGOS_RN.md).<br>2. Inicialización (`package.json`, `tsconfig.json`, `.env.example`), `config/` (`env.ts`, `db.ts` con `withTransaction`), `shared/` (`auth`, `rbac`, `validate`, `sqlErrorMapper`, `audit.service.ts`, `money.ts`), `/api/health` y `/api/config/empresa`.<br>3. `auth/` (`login`, `register`, `me`, `logout`) y `catalogo/` (taxonomía `8x30`, proyección dual pública/interna, `POST /modelos`). | `RN-SEG-01`, `RN-SEG-03`, `RN-SEG-04`, `RN-INV-01`, `RN-MKT-03`, `RN-ACC-02`, `RN-ACC-04`, `RN-ACC-06` | **Conjunta** (Olver & Josue) |
| **Fase 1**<br>*(Núcleo Comercial Omnicanal)* | 1. **`m01-ventas-pos` (`CUN01`):** Alternativas por SKU (`RN-VEN-02`), cálculo POS con campañas vigentes, descuento `<= 10%` con autorización `TN01` (`RN-VEN-03`), abonos parciales, Boleta/Factura/Nota de Crédito (`RN-TRI-01`..`03`), `MovimientoFinanciero`, arqueo diario y cuentas de Aliados.<br>2. **`m02-ecommerce` (`CUN02`):** Reserva de carrito `15 min` + `releaseExpiredCarts.job.ts`, checkout 3 pasos (`RN-ECO-06`), webhook tokenizado PCI-DSS con máx. `3 reintentos` (`RN-ECO-02`, `RN-SEG-02`), máquina de 6 estados (`RN-ECO-04`), cancelación pre-envío (`RN-ECO-05`) e incremento de `stock_consumido`. | `RN-VEN-01`..`07`, `RN-ECO-01`..`06`, `RN-TRI-01`..`04`, `RN-SEG-02`, `RN-ENV-04` | **Olver** (`m01-ventas-pos`) & **Josue** (`m02-ecommerce` + cron) |
| **Fase 2**<br>*(Logística, Compras y Préstamos)* | 1. **`m03-envios` (`CUN03`):** Despacho habilitado solo tras pago (`RN-ECO-01`), verificación SKU, `GuiaEnvio` con tracking único (`RN-ENV-01`), tarifa `S/ 10.00` (gratis `> S/ 150.00`), hasta `2 intentos` con DNI/firma (`RN-ENV-02`, `RN-ENV-03`).<br>2. **`m04-compras` (`CUN04`):** Alertas stock `<= 5` (`RN-INV-03`), onboarding/aprobación de proveedores, `PedidoProveedor`, reapertura (`RN-COM-02`), conformidad física con Guía de Remisión (`RN-COM-03`), bloqueo por reclamo (`RN-COM-04`) y pago (`RN-COM-05`).<br>3. **`m06-prestamos` (`CUN06`):** Consignación `1..7 días` (`RN-PRE-02`), **Constancia Formal por Almacenero en ausencia del gerente (`RN-PRE-01`)** + `AuditLog`, devolución (`RN-PRE-04`), liquidación en Caja Aliados o facturación mayorista por deterioro (`RN-PRE-05`). | `RN-ENV-01`..`04`, `RN-INV-02`..`05`, `RN-COM-01`..`05`, `RN-PRE-01`..`05` | **Olver** (`m06-prestamos` + `m03-envios`) & **Josue** (`m04-compras`) |
| **Fase 3**<br>*(Marketing, Planilla y Analítica KPI)* | 1. **`m05-marketing` (`CUN05`):** Cola editorial (`Recién llegados`), uploads, slides Hero, colecciones curadas y campañas con vigencia + `stock_maximo` INDECOPI, baja automática en stock `0`, aprobación `TN01` (`RN-MKT-04`), pausa y *opt-in* Ley 29733 (`RN-MKT-03`).<br>2. **`m07-finanzas-planilla` (`CUN07`):** Cálculo mensual (`RN-FIN-01`), verificación de liquidez (`RN-FIN-02`), boleta firmada (`RN-FIN-03`), asiento `Egreso` (`RN-FIN-04`) y cierre inmutable (`RN-FIN-05`).<br>3. **`m08-dashboard` (`M08`):** Snapshot pulso + cola de decisiones de 5 áreas con revisión persistente, analítica multicanal y visor unificado de `dbo.AuditLog`. | `RN-MKT-01`..`04`, `RN-FIN-01`..`05`, soporte integral `M08` | **Olver** (`m07-finanzas-planilla` + `m08-dashboard`) & **Josue** (`m05-marketing`) |

---

## 🛡️ Seguridad RBAC y Garantías Técnicas en Servidor

### Control de Acceso Basado en Roles (`RN-SEG-01`) — Ver detalle en [`docs_api/MATRIZ_RBAC_ENDPOINTS.md`](./docs_api/MATRIZ_RBAC_ENDPOINTS.md)
* **`TN01` Administrador (`administrador`):** Gobernanza total (aprobaciones `RN-COM-01`/`RN-MKT-04`, reapertura `RN-COM-02`, descuentos `RN-VEN-03`, Notas de Crédito `RN-TRI-03`, alta de modelos, planilla `RN-FIN-*`, pagos a proveedor y auditoría global).
* **`TN02` Vendedor (`vendedor`):** Inventario interno por SKU, sugeridor de alternativas (`RN-VEN-02`), creación de órdenes POS y confirmación de entrega `M03` junto con `TN04`.
* **`TN03` Community Manager (`community_manager`):** Gestión editorial (`recien_llegados`), hero, colecciones, propuestas/pausa de campañas (`RN-MKT-01`..`03`), lectura de inventario y pedidos web.
* **`TN04` Almacenero (`almacenero`):** Despachos, *picking* y guías `M03` (`RN-ENV-01`..`03`), postulación de proveedores y órdenes de compra + recepción conforme/reclamo `M04` (`RN-COM-03`/`04`), mermas (`RN-INV-04`) y **préstamos en consignación con Constancia Formal en ausencia del gerente (`RN-PRE-01`)**.
* **`TN05` Cajero (`cajero`):** Cobros y abonos POS, actualización de comprobante, emisión de Boletas/Facturas (`RN-TRI-01`/`02`), arqueo diario y cobro de cuentas Aliados (`M06` → `M01`).
* **`AN01` Cliente (`cliente`) y Público:** Catálogo público sin exposición numérica de stock, feed público de marketing, carrito 15 min, checkout 3 pasos, seguimiento de pedidos y cancelación pre-envío (`RN-ECO-05`).
* *Nota sobre perfil demo `respaldo`:* Existe únicamente en `frontend/src/auth/demoSession.ts` para acceder a la vista informativa `zona-preparacion.html`. Está **excluido de `CK_Empleado_RolRBAC`** y no posee permisos operativos en la API de producción (limitado a `GET /api/health` y `GET /api/auth/me`).

### Garantías Técnicas Obligatorias
* **Cero Stock Negativo (`RN-VEN-06`, `RN-INV-02`):** Transacciones ACID con actualización condicional atómica en `dbo.ProductoVariante` para evitar condiciones de carrera entre POS y E-commerce.
* **Cero Custodia de Tarjetas (`RN-SEG-02` — PCI-DSS):** Zod rechaza cualquier campo de PAN o CVV; el backend procesa únicamente `token_pasarela_ref` y webhooks firmados.
* **Protección de Datos y Trazabilidad (`RN-SEG-03`, `RN-SEG-04`):** Hashing con `bcryptjs`/`argon2`, cumplimiento de la **Ley N° 29733** (*opt-in* desmarcado por defecto) y bitácora forense inmutable en `dbo.AuditLog`.

---

## ⚖️ Stack Tecnológico Aprobado

Decisión registrada en la Sección 2.2 de [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md) (`20/11/2026`):
* **Opción A:** **Node.js + Express (TypeScript)** *(✅ Aprobado)* — complementado con `mssql` (`tedious`), `Zod`, `decimal.js`, `node-cron`, `bcryptjs`/`argon2` y `jsonwebtoken`.
* **Opción B:** Python + FastAPI o Django *(⬜ Descartada)*.
* **Opción C:** Java Spring Boot / C# ASP.NET Core *(⬜ Descartada)*.
