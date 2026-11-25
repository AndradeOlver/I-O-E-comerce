---
name: arquitectura-backend-io
description: Guía arquitectónica y modelo de construcción incremental por fases (Fase 0 a Fase 3) para el backend Node.js + Express + TypeScript conectado a Microsoft SQL Server del Sistema Omnicanal I&O. Úsala siempre que se diseñen contratos en backend/docs_api/, se inicialice el servidor o se implementen/revisen los módulos M01 a M08.
---

# ⚙️ Skill: Arquitectura y Construcción Incremental del Backend I&O (`backend/`)

Esta skill define el estándar obligatorio para diseñar, inicializar y construir el servidor `backend/` del **Sistema Omnicanal I&O**, desarrollado exclusivamente por **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**.

---

## 1. Decisiones Arquitectónicas Nucleares

1. **Monolito Modular por Dominio (*Feature-Sliced*):**
   * Un único servidor **Node.js + Express (TypeScript)** conectado al pool de **Microsoft SQL Server (`IO_Ecommerce`)**, organizado por módulos de negocio independientes en `backend/src/modules/`.
   * Cada módulo encapsula sus 4 capas:
     * `*.schema.ts` (**Zod** — validación de entrada y tipado DTO)
     * `*.routes.ts` (definición de rutas + middlewares `authenticate`, `requireRole`, `validate`)
     * `*.controller.ts` (adaptador HTTP limpio)
     * `*.service.ts` (reglas de negocio `RN-*`, cálculos con `decimal.js`, transacciones y auditoría)
     * `*.repository.ts` (consultas T-SQL parametrizadas contra SQL Server)
2. **Acceso a Datos con `mssql` (`tedious`) Parametrizado (Sin ORM Pesado):**
   * El esquema oficial en `DB/esquemas/01_esquema_io_sqlserver.sql` implementa **herencia Tabla-por-Tipo (`Pedido` → `PedidoCliente`/`PedidoProveedor` y `DetallePedido` → `DetallePedidoCliente`/`DetallePedidoProveedor`)**, **columnas calculadas `PERSISTED`** (`subtotal`, `fecha_vencimiento`, `sueldo_neto`), **índices únicos filtrados** (`UX_Prestamo_Constancia`) y **triggers** (`TR_Planilla_BloqueoRetroactivo`, `TR_AuditLog_Inmutable`).
   * Todas las consultas deben usar parámetros tipados (`request.input('nombre', sql.Int, valor)`) — **prohibido concatenar strings SQL**.

---

## 2. Los 5 Mecanismos Transversales Obligatorios (`src/config/` y `src/shared/`)

1. **Wrapper Transaccional ACID (`withTransaction` en `src/config/db.ts`):**
   * Toda escritura que abarque herencia (`Pedido` + subclase), descuento de `Producto.stock`, emisión de `ComprobantePago`, `MovimientoFinanciero` o `PrestamoProductos` debe ejecutarse dentro de una única transacción SQL Server.
   * Al descontar stock (`RN-VEN-06`), usar actualización condicional atómica:
     ```sql
     UPDATE dbo.Producto
     SET stock = stock - @cantidad, actualizado_en = SYSDATETIME()
     WHERE producto_id = @productoId AND stock >= @cantidad AND activo = 1;
     ```
     Si `rowsAffected[0] === 0`, lanzar `BusinessRuleError('RN-VEN-06', ...)` y revertir la transacción.
2. **Auditoría Forense Atómica (`src/shared/services/audit.service.ts` — `RN-SEG-03`):**
   * `auditService.log(tx, payload)` recibe obligatoriamente la transacción activa `tx`.
   * Es obligatorio invocarlo en: emisión de **Constancia Formal de Préstamo por Almacenero en ausencia del gerente (`RN-PRE-01`)**, aprobación/rechazo de `PedidoProveedor` (`RN-COM-01`, `RN-COM-04`), anulaciones con Nota de Crédito (`RN-TRI-03`), descuentos especiales (`RN-VEN-03`) y cierre de `Planilla` (`RN-FIN-05`).
3. **Mapeador de Errores de Reglas de Negocio (`sqlErrorMapper.ts` + `AppError.ts`):**
   * Convierte errores de dominio y errores nativos de SQL Server (`547` `CHECK`/`FK`, `2627`/`2601` `UNIQUE`, `50000` `RAISERROR` de triggers) al contrato JSON estándar consumido por las alertas accesibles (`aria-live`) del frontend:
     ```json
     {
       "ok": false,
       "ruleCode": "RN-PRE-01",
       "error": "CONSTANCIA_FORMAL_REQUERIDA",
       "message": "Cuando el Gerente no está disponible, el Almacenero debe consignar el número de Constancia Formal de Préstamo.",
       "field": "numero_constancia_formal"
     }
     ```
4. **Precisión Monetaria (`src/shared/utils/money.ts` con `decimal.js`):**
   * Todo cálculo de **IGV (`18%`, `RN-TRI-01`)**, topes de **descuento (`<= 10%`, `RN-VEN-03`)**, **flete gratuito (`> S/ 150`, `RN-ENV-04`)** y **planilla (`RN-FIN-01`)** debe realizarse con `Decimal` redondeando a 2 decimales (`ROUND_HALF_UP`).
5. **Job de Reserva de Carrito (`src/jobs/releaseExpiredCarts.job.ts` — `RN-ECO-03`):**
   * Tarea `node-cron` cada minuto que busca `PedidoCliente` con `estado_online = N'Pendiente de pago'` y `reserva_expira_en < SYSDATETIME()`, restituyendo el stock de sus líneas y pasando el pedido a `Cancelado` dentro de una transacción.

---

## 3. Protocolo de Construcción Incremental por Fases

Nunca generes todo el código del backend de golpe sin verificar cada capa. Avanza siempre fase por fase y actualiza `ESTADO_GLOBAL_PROYECTO.md` al completar cada una:

### Fase 0: Cimientos, Contratos y Catálogo Base
1. Documentar en `backend/docs_api/`:
   * `openapi.yaml` (OpenAPI 3.0)
   * `MATRIZ_RBAC_ENDPOINTS.md` (5 roles internos `TN01`–`TN05` + `AN01` Cliente)
   * `CATALOGO_CODIGOS_RN.md` (las 42 reglas operativas + códigos HTTP)
2. Inicializar `backend/package.json`, `tsconfig.json`, `.env.example` y estructura `src/`.
3. Implementar `config/` (`env.ts`, `db.ts`, `logger.ts`), `shared/` (middlewares JWT, RBAC, Zod, errores, `audit.service.ts`, `money.ts`) y `/api/health`.
4. Implementar `modules/auth/` y `modules/catalogo/` (exponiendo `color_textura` y `alt_text` para WCAG 2.1 AA `RN-ACC-02` y `RN-ACC-04`).
5. Verificar compilación TypeScript (`tsc --noEmit`) y pruebas de humo antes de pasar a la Fase 1.

### Fase 1: Núcleo Comercial Omnicanal (`M01` y `M02`)
1. `modules/m01-ventas-pos/` (`CUN01`): consulta SKU, sugerencia de alternativas (`RN-VEN-02`), descuento $\le 10\%$ (`RN-VEN-03`), emisión correlativa de Boleta/Factura/Nota de Crédito con IGV `18%` (`RN-TRI-01`..`03`) e ingreso en `MovimientoFinanciero` (`RN-VEN-04`).
2. `modules/m02-ecommerce/` (`CUN02`) + `releaseExpiredCarts.job.ts`: reserva temporal de 15 min (`RN-ECO-03`), máquina de 6 estados (`RN-ECO-04`), cancelación previa a `"En envío"` (`RN-ECO-05`) y webhook tokenizado PCI-DSS con límite de 3 reintentos (`RN-ECO-02`, `RN-SEG-02`).

### Fase 2: Operación Interna, Logística y Préstamos (`M03`, `M04` y `M06`)
1. `modules/m03-envios/` (`CUN03`): habilitación tras pago aprobado (`RN-ECO-01`), flete gratis $> \text{S/ } 150$ (`RN-ENV-04`), `GuiaEnvio` con tracking único (`RN-ENV-01`) y hasta 2 intentos con DNI/firma (`RN-ENV-02`, `RN-ENV-03`).
2. `modules/m04-compras/` (`CUN04`): alerta de stock $\le 5$ (`RN-INV-03`), `PedidoProveedor` aprobado por Dueño (`RN-COM-01`), conformidad física contra Guía de Remisión (`RN-COM-03`) y bloqueo de pago por reclamo (`RN-COM-04`).
3. `modules/m06-prestamos/` (`CUN06`): consignación a tienda aliada con **plazo máximo de 7 días (`RN-PRE-02`)**, validación de `gerente_disponible` que exige **Constancia Formal emitida por el Almacenero en ausencia del gerente (`RN-PRE-01`)** con `AuditLog` atómico, estado `"En Consignación"` (`RN-PRE-03`) y devolución o facturación por deterioro (`RN-PRE-04`, `RN-PRE-05`).

### Fase 3: Marketing, Planilla y Dashboard KPI (`M05`, `M07` y `M08`)
1. `modules/m05-marketing/` (`CUN05`): campañas con vigencia y stock máximo obligatorio INDECOPI (`RN-MKT-01`), baja automática en stock `0`, aprobación del Dueño (`RN-MKT-04`) y *opt-in* explícito (`RN-MKT-03`).
2. `modules/m07-finanzas-planilla/` (`CUN07`): cálculo mensual (`RN-FIN-01`), verificación previa de liquidez bancaria (`RN-FIN-02`), asiento de egreso en `MovimientoFinanciero` (`RN-FIN-04`) y cierre inmutable (`RN-FIN-05`).
3. `modules/m08-dashboard/` (`M08`): endpoints agregados para tarjetas KPI, gráficos Okabe-Ito, semáforo de préstamos por vencer (7 días) y visor de `AuditLog`.
