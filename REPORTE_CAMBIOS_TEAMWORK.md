# Reporte de Cambios — Repositorio Raíz (`IO E-Comerce`)

> **Fecha de corte:** 2026-11-26 21:17 (Rama activa: `main`)  
> **Estado de `frontend/` (código fuente):** Intacto — `0` modificaciones en `frontend/*.html`, `frontend/src/**`, `frontend/package.json` y `frontend/tsconfig.json`. Verificado con `npx tsc --noEmit` y `npx vite build` (código de salida `0`, 8 puntos de entrada HTML).

---

## 1. Realizados completamente

- **`frontend/README.md`** *(modificado: 212 líneas cambiadas)* — Actualizado con las vistas HTML, módulos y funcionalidades reales implementadas en `frontend/` (incluyendo `almacen`, `marketing`, `admin`, `zona-preparacion`, `pos-vendedor`, `pos-cajero`, `acceso`, `index`).
- **`frontend/docs_ui/guia_estilos_espresso_piedra.md`** *(modificado: 262 líneas cambiadas)* — Guía de estilos actualizada conforme a la implementación real de la UI.
- **`frontend/docs_ui/VERIFICACION_FRONTEND_R1.md`** *(creado: 28,536 bytes)* — Informe de verificación del `frontend/` (compilación `tsc` / `vite build`, inventario de vistas y contraste frente a reglas `CUN01`–`CUN07`, 42 `RN-*` y `RN-ACC-01..06`).
- **`backend/README.md`** *(modificado: 222 líneas cambiadas)* — Actualizado conforme a los módulos, flujos y roles detectados en el `frontend/` implementado.
- **`backend/docs_api/openapi.yaml`** *(creado: 128,564 bytes)* — Contrato OpenAPI generado según los flujos y entidades del `frontend/` real.
- **`backend/docs_api/MATRIZ_RBAC_ENDPOINTS.md`** *(creado: 19,746 bytes)* — Matriz RBAC de endpoints alineada a los roles del `frontend/` y reglas de negocio.

---

## 2. Realizados a medias

- **Contratos completos en `backend/docs_api/`:** Se crearon `openapi.yaml` y `MATRIZ_RBAC_ENDPOINTS.md`, pero quedó pendiente el tercer archivo planificado (`CATALOGO_CODIGOS_RN.md`).

---

## 3. Faltantes

- **`backend/docs_api/CATALOGO_CODIGOS_RN.md`** — Catálogo de códigos de error tipados (`RN-*`) para respuestas del backend y alertas *Poka-Yoke* / `aria-live` en el frontend.
- **`ESTADO_GLOBAL_PROYECTO.md`** — Pendiente de actualizar con el registro de esta verificación documental de `frontend/`, `backend/docs_api/` y alineación de `documentos/`.
- **`inicio.txt` (raíz)** — Pendiente de actualizar con el estado vigente tras los cambios documentales.
- **Commit en Git (`main`):** Todos los cambios anteriores permanecen en el árbol de trabajo sin `git commit`.
