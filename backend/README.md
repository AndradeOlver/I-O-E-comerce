# ⚙️ Backend – Sistema Omnicanal I&O (`1.3 backend/`)

> **Estado Actual:** ✅ **Stack Aprobado: Node.js + Express (TypeScript)** — Aprobado el `20/11/2026` en [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md)  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**  
> **Fuentes de Verdad:**  
> * Reglas y procesos RUP: `../documentos/Model Soft Proyecto/Informacion del negocio/03_Reglas_de_Negocio_IO.md`  
> * Requisitos priorizados: `../documentos/Interaccion Humano Com Proyecto/Informacion_IHC/03_Requerimientos_y_Reglas_Accesibles_IO.md`

---

## 📂 Organización y Árbol Arquitectónico de `backend/`

> **Patrón Arquitectónico Aprobado (`22/11/2026`):** **Monolito Modular por Dominio (*Feature-Sliced*)** en 4 capas (`Routes → Controller → Service → Repository`) con validación **`Zod`**, acceso a datos mediante **`mssql` (`tedious`) parametrizado sin ORM pesado**, precisión monetaria con **`decimal.js`** y construcción incremental en **4 Fases (Fase 0 a Fase 3)**.

```text
backend/
├── docs_api/
│   ├── openapi.yaml                   # Contrato REST OpenAPI 3.0 (Swagger UI en /api/docs)
│   ├── MATRIZ_RBAC_ENDPOINTS.md       # Permisos por rol (TN01-TN05 + AN01 Cliente)
│   └── CATALOGO_CODIGOS_RN.md         # Mapeo RN-* -> HTTP Status + mensaje Poka-Yoke
├── src/
│   ├── config/
│   │   ├── env.ts                     # Validación estricta de .env al arrancar con Zod
│   │   ├── db.ts                      # ConnectionPool singleton de mssql + helper withTransaction()
│   │   └── logger.ts                  # Logger estructurado
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.ts            # new BusinessRuleError('RN-PRE-01', '...', 422, 'field')
│   │   │   └── sqlErrorMapper.ts      # Traduce CHECK/UNIQUE/Triggers de SQL Server a códigos RN-*
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # Verifica JWT (Empleado interno o Cliente externo)
│   │   │   ├── rbac.middleware.ts     # requireRole('Administrador', 'Almacenero') (RN-SEG-01)
│   │   │   ├── validate.middleware.ts # Ejecuta esquemas Zod (body, query, params)
│   │   │   └── error.middleware.ts    # Respuesta JSON uniforme para alertas aria-live en React
│   │   ├── services/
│   │   │   └── audit.service.ts       # Inserta en dbo.AuditLog dentro de la MISMA transacción (RN-SEG-03)
│   │   └── utils/
│   │       └── money.ts               # Helpers con decimal.js (IGV 18%, descuento <= 10%, planilla)
│   ├── jobs/
│   │   └── releaseExpiredCarts.job.ts # Cron cada 1 min: libera reservas > 15 min (RN-ECO-03)
│   ├── modules/                       # 1 carpeta por dominio (routes, controller, service, repository, schema)
│   │   ├── auth/                      # Login empleados (TN01-TN05), clientes (AN01) y perfil
│   │   ├── catalogo/                  # Categorías y Productos SKU (incluye color_textura y alt_text WCAG)
│   │   ├── m01-ventas-pos/            # CUN01: Venta en tienda, alternativas (RN-VEN-02), Boleta/Factura/NC
│   │   ├── m02-ecommerce/             # CUN02: Carrito 15 min, checkout 6 estados, webhook PCI-DSS (3 reintentos)
│   │   ├── m03-envios/                # CUN03: Picking post-pago, GuiaEnvio tracking, flete > S/150, 2 intentos
│   │   ├── m04-compras/               # CUN04: Alertas stock <= 5, PedidoProveedor, conformidad Guía Remisión
│   │   ├── m05-marketing/             # CUN05: CampanaMarketing INDECOPI, baja en stock 0, opt-in Ley 29733
│   │   ├── m06-prestamos/             # CUN06: PrestamoProductos (máx. 7 días RN-PRE-02, Constancia RN-PRE-01)
│   │   ├── m07-finanzas-planilla/     # CUN07: Liquidez bancaria, Planilla cerrada inmutable, MovimientoFinanciero
│   │   └── m08-dashboard/             # KPIs en tiempo real, semáforo de préstamos y auditoría para Gerencia
│   ├── app.ts                         # Configuración de Express (Helmet, CORS, rutas, Swagger, errorHandler)
│   └── server.ts                      # Arranque del servidor, test de pool SQL Server y registro de cron jobs
├── tests/
│   ├── integration/                   # Pruebas de endpoints con Vitest + Supertest
│   └── unit/                          # Pruebas unitarias de reglas críticas (IGV, RN-PRE-01, descuentos)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md                          # Este documento orientativo
```

---

## 🏗️ Arquitectura Interna por Módulo y Acceso a Datos

### 1. Capas de cada Módulo (`src/modules/<modulo>/`)
* **`<modulo>.schema.ts` (`Zod`):** Valida `body`, `params` y `query`, infiriendo los tipos DTO en TypeScript.
* **`<modulo>.routes.ts`:** Declara endpoints REST y encadena `authenticate`, `requireRole(...)` y `validate(...)`.
* **`<modulo>.controller.ts`:** Extrae datos validados de `req`, invoca al servicio y responde con JSON estandarizado.
* **`<modulo>.service.ts`:** Ejecuta las **42 reglas de negocio (`RN-*`)**, cálculos exactos con `decimal.js`, coordinación transaccional (`withTransaction`) y auditoría obligatoria (`auditService.log(tx, ...)`).
* **`<modulo>.repository.ts`:** Única capa que ejecuta consultas T-SQL parametrizadas con `mssql` sobre `IO_Ecommerce`.

### 2. ¿Por qué `mssql` parametrizado con Repositorios Tipados en vez de ORM pesado?
* Respeta sin fricción la **herencia Tabla-por-Tipo (`Pedido` → `PedidoCliente`/`PedidoProveedor` y `DetallePedido` → `DetallePedidoCliente`/`DetallePedidoProveedor`)**, las **columnas calculadas `PERSISTED`** (`subtotal`, `fecha_vencimiento`, `sueldo_neto`), los **índices únicos filtrados** (`UX_Prestamo_Constancia`) y los **triggers** (`TR_Planilla_BloqueoRetroactivo`, `TR_AuditLog_Inmutable`) definidos en `DB/esquemas/01_esquema_io_sqlserver.sql`.
* Permite control explícito de transacciones ACID y bloqueos de fila (`UPDLOCK, ROWLOCK`) al descontar `Producto.stock`.

### 3. Contrato Uniforme de Errores de Reglas de Negocio (Soporte *Poka-Yoke* y `aria-live`)
Todo rechazo por regla de negocio o restricción `CHECK`/`UNIQUE`/`TRIGGER` de SQL Server devuelve una estructura uniforme para que el frontend React anuncie el error con claridad accesible:

```json
{
  "ok": false,
  "ruleCode": "RN-PRE-01",
  "error": "CONSTANCIA_FORMAL_REQUERIDA",
  "message": "Cuando el Gerente no está disponible, el Almacenero debe consignar el número de Constancia Formal de Préstamo.",
  "field": "numero_constancia_formal"
}
```

---

## 🚀 Modelo de Construcción Incremental por Fases (Hoja de Ruta)

Para garantizar estabilidad de las 42 reglas de negocio y permitir trabajo paralelo limpio entre **Olver Andrade** y **Josue Razuri**, el backend se construye de forma incremental en **4 fases**:

| Fase | Alcance y Entregables en `backend/` | Reglas y Garantías Verificadas | División Sugerida |
|:---:|---|---|---|
| **Fase 0**<br>*(Cimientos y Contratos)* | 1. Contratos en `docs_api/` (`openapi.yaml`, matriz RBAC, catálogo `RN-*`).<br>2. Inicialización (`package.json`, `tsconfig.json`, `.env.example`).<br>3. `config/db.ts` (`mssql` pool + `withTransaction`), `shared/` (`auth` JWT, `rbac`, `sqlErrorMapper`, `audit.service.ts`, `money.ts`) y `/api/health`.<br>4. Módulo `auth/` y `catalogo/` (incluyendo `color_textura` y `alt_text`). | `RN-SEG-01`, `RN-SEG-03`, `RN-SEG-04`, `RN-INV-01`, `RN-ACC-02`, `RN-ACC-04` | **Conjunta** (Olver & Josue) |
| **Fase 1**<br>*(Núcleo Comercial Omnicanal)* | 1. **`m01-ventas-pos` (`CUN01`):** Venta en tienda, alternativas (`RN-VEN-02`), descuento $\le 10\%$, Boleta/Factura/Nota de Crédito con IGV `18%` y asiento en `MovimientoFinanciero`.<br>2. **`m02-ecommerce` (`CUN02`):** Carrito con reserva de `15 min` + job `releaseExpiredCarts.job.ts`, máquina de 6 estados y webhook PCI-DSS (`token_pasarela_ref`, máx. 3 reintentos). | `RN-VEN-01`..`07`, `RN-ECO-01`..`06`, `RN-TRI-01`..`04`, `RN-SEG-02` | **Olver** (`m01-ventas-pos`) & **Josue** (`m02-ecommerce` + cron job) |
| **Fase 2**<br>*(Operación Interna y Consignación)* | 1. **`m03-envios` (`CUN03`):** *Picking* post-pago, `GuiaEnvio` con tracking único, flete gratis $> \text{S/ } 150$ y hasta 2 intentos con DNI/firma.<br>2. **`m04-compras` (`CUN04`):** Alertas stock $\le 5$, `PedidoProveedor` aprobado por Dueño, conformidad con Guía de Remisión y bloqueo por reclamo.<br>3. **`m06-prestamos` (`CUN06`):** Salida a tienda aliada (máx. `7 días`), conmutador `gerente_disponible` con **Constancia Formal por Almacenero (`RN-PRE-01`)** + `AuditLog` atómico y liquidación/merma. | `RN-ENV-01`..`04`, `RN-INV-02`..`04`, `RN-COM-01`..`05`, `RN-PRE-01`..`05` | **Olver** (`m06-prestamos` + `m03-envios`) & **Josue** (`m04-compras`) |
| **Fase 3**<br>*(Marketing, Planilla y Analítica KPI)* | 1. **`m05-marketing` (`CUN05`):** Campañas con vigencia y stock tope INDECOPI, baja automática en stock `0`, aprobación del Dueño y *opt-in* Ley 29733.<br>2. **`m07-finanzas-planilla` (`CUN07`):** Cálculo mensual, verificación previa de liquidez bancaria, cierre inmutable (`TR_Planilla_BloqueoRetroactivo`) y asiento en `MovimientoFinanciero`.<br>3. **`m08-dashboard`:** Endpoints agregados de KPIs, alertas de stock $\le 5$, semáforo de préstamos y consulta de `AuditLog`. | `RN-MKT-01`..`04`, `RN-FIN-01`..`05`, soporte datos `M08` | **Olver** (`m07-finanzas-planilla` + `m08-dashboard`) & **Josue** (`m05-marketing`) |

---

## 🧩 Los 7 Módulos de Negocio (+ Analítica KPI) a Exponer

El servidor implementará la lógica transaccional y APIs de los **7 Casos de Uso del Negocio (`CUN01`–`CUN07`)** más la capa transversal de tablero e identidad:

1. **Módulo `M01` – Ventas en Tienda (`CUN01`):** Consulta instantánea por SKU (`Producto` + talla + color), sugeridor de prendas/tallas alternativas (`RN-VEN-02`), cálculo de IGV `18%`, emisión correlativa de Boletas/Facturas/Notas de Crédito (`RN-TRI-01` a `RN-TRI-03`) y control de descuentos máx. `10%` (`RN-VEN-03`).
2. **Módulo `M02` – Venta Online E-commerce (`CUN02`):** Reserva temporal de stock en carrito por `15 minutos` (`RN-ECO-03`), gestión de máquina de 6 estados del pedido (`RN-ECO-04`), integración con webhooks de pasarela externa (Yape/Culqi/Niubiz) con hasta `3 reintentos` (`RN-ECO-02`) y cancelación previa a `"En envío"` (`RN-ECO-05`).
3. **Módulo `M03` – Envíos y Courier (`CUN03`):** Desbloqueo de empaque solo tras pago aprobado (`RN-ECO-01`), cálculo de flete urbano y exoneración `> S/ 150` (`RN-ENV-04`), emisión de `GuiaEnvio` con código de seguimiento único (`RN-ENV-01`) y control de hasta `2 intentos` de entrega con firma/DNI (`RN-ENV-02`, `RN-ENV-03`).
4. **Módulo `M04` – Compras de Mercadería e Inventario (`CUN04`):** Alerta automática cuando cualquier SKU cae a `<= 5 unidades` (`RN-INV-03`), flujo de cotizaciones y aprobación de `PedidoProveedor` (`RN-COM-01`, `RN-COM-02`), ingreso a stock condicionado a conformidad física con Guía de Remisión (`RN-COM-03`) y bloqueo de pago ante reclamos (`RN-COM-04`).
5. **Módulo `M05` – Marketing y Catálogo (`CUN05`):** Gestión de campañas con vigencia y stock límite obligatorio (INDECOPI Ley 29571, `RN-MKT-01`), ocultamiento/baja automática al llegar stock a `0`, visto bueno del Dueño (`RN-MKT-04`) y registro de consentimiento *opt-in* (Ley 29733, `RN-MKT-03`).
6. **Módulo `M06` – Préstamos y Consignación (`CUN06`):** Control de salidas a `Otra Tienda` con plazo máximo de `7 días` (`RN-PRE-02`), transición de stock a `"En Consignación"` (`RN-PRE-03`), **regla crítica `RN-PRE-01` (autorización delegada al Almacenero para emitir Constancia Formal de Préstamo en ausencia del Gerente)**, devolución o liquidación/facturación por merma (`RN-PRE-04`, `RN-PRE-05`).
7. **Módulo `M07` – Pago de Planilla y Finanzas (`CUN07`):** Cálculo automático de haberes, comisiones y deducciones (`RN-FIN-01`), verificación previa de liquidez bancaria (`RN-FIN-02`), generación de boleta y asiento en `MovimientoFinanciero` (`RN-FIN-04`) e inmutabilidad de cierres históricos (`RN-FIN-05`).
8. **Módulo `M08` – Autenticación, Auditoría y Endpoints KPI:** Emisión de métricas agregadas para el Dashboard gerencial y registro forense inmutable de operaciones críticas (`RN-SEG-03`).

---

## 🛡️ Seguridad RBAC (5 Roles) y Las 42 Reglas de Negocio a Validar

### Control de Acceso Basado en Roles (`RN-SEG-01`)
* **`TN01` Administrador / Dueño:** Control total (aprobación de compras `RN-COM-01`, descuentos `> 10%` o especiales `RN-VEN-03`, anulaciones/Notas de Crédito `RN-TRI-03`, planilla `RN-FIN-*`, auditoría `RN-PRE-01` y reportes financieros).
* **`TN02` Vendedor:** Consulta de inventario por SKU, registro de pre-venta en tienda y consulta de alternativas (`RN-VEN-02`).
* **`TN03` Community Manager:** Administración de catálogo, campañas con *opt-in* (`RN-MKT-01` a `04`) y consulta de pedidos web.
* **`TN04` Almacenero:** Recepción conforme de compras (`RN-COM-03`), *picking/packing*, emisión de `GuiaEnvio` (`RN-ENV-01`), gestión de mermas (`RN-INV-04`) y **emisión de Constancia Formal de Préstamo en ausencia del gerente (`RN-PRE-01`)**.
* **`TN05` Cajero:** Registro de cobros presenciales, arqueo de caja y emisión de Boletas/Facturas (`RN-VEN-04`, `RN-TRI-01`, `RN-TRI-02`).
* *(Además del perfil externo **`AN01` Cliente** para compra web, historial y cancelación previa al envío).*

### Garantías Técnicas Obligatorias en Servidor
* **Cero Stock Negativo (`RN-VEN-06`, `RN-INV-02`):** Transacciones atómicas ACID en base de datos para impedir *race conditions* entre ventas simultáneas en tienda física y E-commerce.
* **Cero Custodia de Tarjetas (`RN-SEG-02` — PCI-DSS):** Prohibido recibir, procesar o guardar PAN o CVV en el backend; únicamente *tokens* efímeros y webhooks firmados de la pasarela externa.
* **Protección de Datos y Trazabilidad (`RN-SEG-03`, `RN-SEG-04`):** Hashing seguro de contraseñas (`bcrypt`/`Argon2`), cifrado de datos personales conforme a la **Ley N° 29733** y bitácora inmutable (*Audit Log*: usuario, rol, timestamp, entidad, acción) en toda operación sensible.

---

## ⚖️ Stack Tecnológico Aprobado

Decisión registrada en la Sección 2.2 de [ESTADO_GLOBAL_PROYECTO.md](../ESTADO_GLOBAL_PROYECTO.md) (`20/11/2026`):
* **Opción A:** **Node.js + Express (TypeScript)** *(✅ Aprobado)*.
* **Opción B:** Python + FastAPI o Django *(⬜ Descartada)*.
* **Opción C:** Java Spring Boot / C# ASP.NET Core *(⬜ Descartada)*.
