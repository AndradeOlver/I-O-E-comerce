# Reporte de Cambios — Repositorio Raíz (`IO E-Comerce`)

> **Fecha de corte:** 2026-11-26 22:06 (Rama activa: `main`)  
> **Estado de `frontend/` (código fuente):** Intacto — `0` modificaciones en `frontend/*.html`, `frontend/src/**`, `frontend/package.json` y `frontend/tsconfig.json`. Verificado con `npx tsc --noEmit` y `npx vite build` (código de salida `0`, 8 puntos de entrada HTML).

---

## 1. Realizados completamente

- **`frontend/README.md`** — Actualizado con las 8 vistas HTML, módulos y funcionalidades reales implementadas en `frontend/`.
- **`frontend/docs_ui/guia_estilos_espresso_piedra.md`** — Guía de estilos actualizada conforme a la implementación real de la UI.
- **`frontend/docs_ui/VERIFICACION_FRONTEND_R1.md`** — Informe de verificación del `frontend/` (`tsc`/`vite build`, inventario de vistas y contraste frente a `CUN01`–`CUN07`, 49 `RN-*` y `RN-ACC-01..06`).
- **`backend/README.md`** — Actualizado conforme a los módulos, flujos y roles detectados en el `frontend/` implementado.
- **`backend/docs_api/openapi.yaml`** — Contrato OpenAPI generado según los flujos y entidades del `frontend/` real.
- **`backend/docs_api/MATRIZ_RBAC_ENDPOINTS.md`** — Matriz RBAC de endpoints alineada a los roles del `frontend/` y reglas de negocio.
- **`backend/docs_api/CATALOGO_CODIGOS_RN.md`** — Catálogo de errores tipados (`49` `RN-*` operativas + `6` `RN-ACC-*` + mapeo SQL Server `sqlErrorMapper.ts`).
- **`ESTADO_GLOBAL_PROYECTO.md`** — Actualizado con el cierre de verificación R1/R3, contratos `docs_api/` completos y aprobaciones en `documentos/`.
- **`inicio.txt`** — Actualizado con los siguientes pasos hacia `backend/src/` (Fases 0–3) y backlog de `VERIFICACION_FRONTEND_R1.md`.

---

## 2. Realizados a medias

- *(Ninguno — todos los entregables documentales de la raíz están completos).*

---

## 3. Faltantes (fuera del alcance documental actual)

- **Implementación de `backend/src/` (Fases 0–3)** y **remediación de código `frontend/`** listada en `frontend/docs_ui/VERIFICACION_FRONTEND_R1.md` §7.
- **`git commit` y `git push origin main`** de esta segunda tanda de cambios (`CATALOGO_CODIGOS_RN.md`, `ESTADO_GLOBAL_PROYECTO.md`, `inicio.txt` y este reporte).
