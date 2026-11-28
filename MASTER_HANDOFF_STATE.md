# ESTADO MAESTRO DEL PROYECTO: `IO E-Comerce`

> **PROTOCOLO DE PRE-VUELO:**
> 1. **Fronteras por Carril:** Respeta estrictamente los directorios de escritura y solo lectura configurados en `orchestrator.config.json`.
> 2. **Gates y Contratos:** Ninguna ola se considera cerrada sin pasar los checks configurados (`verifyCommand`, contratos y auditoria de navegador si aplica).
> 3. **Honestidad Tecnica:** Separa siempre lo verificado en disco/tests de lo que sigue aproximado o pendiente.

---

## 1. ARQUITECTURA Y CAPAS DEL REPOSITORIO (`D:\equipo\Escritorio\IO E-Comerce`)
- **Directorio de reportes:** `reports/`
- **Carriles configurados:**
  - **ANTIGRAVITY** (Antigravity (Single Lane)): writable=`.`, inbox=`.orchestrator/inboxes/INBOX_ANTIGRAVITY.md`

## 2. METRICAS Y ESTADO ACTUAL
- **Estado general:** Inicializado para orquestacion por olas.
- **Ultima ola verificada:** `0`

---

## 3. PROTOCOLO DE AHORRO DE TOKENS
- Lee unicamente los archivos exactos indicados en el prompt; prohibido explorar el repositorio entero.
- Escribe tu reporte de cierre en maximo 15 lineas tipo bullet (hecho, pendiente, rutas/contratos).

---

## 5. BITACORA AUTOMATICA DE OLAS RECIENTES (VENTANA ACOTADA)
