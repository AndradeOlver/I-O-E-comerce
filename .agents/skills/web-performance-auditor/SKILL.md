---
name: web-performance-auditor
description: Auditoría de rendimiento web para I&O (Core Web Vitals, carga, renderizado y red) sin inventar métricas. Usar cuando se pida revisar el rendimiento de una página, componente o URL, o interpretar reportes de Lighthouse, PageSpeed Insights, CrUX o DevTools. Derivada del persona `web-performance-auditor` de addyosmani/agent-skills, adaptada al stack Vite + TypeScript + HTML5 + Bootstrap 5.3.
---

# Web Performance Auditor — I&O

Skill local derivada de `agents/web-performance-auditor.md` de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT). En el repo de origen es un **persona**, no una skill del catálogo de 26; por eso se adapta aquí como skill workspace. No incluye scripts ni instala dependencias.

## 0. Capa 0 (innegociable)

Antes de auditar, leer `io-design-system`, `AGENTS.md`, `frontend/src/styles/tokens.css`, `frontend/docs_ui/guia_estilos_espresso_piedra.md` y `DESIGN.md`. El stack aprobado es `Vite + TypeScript + HTML5 semántico + CSS3 puro + Bootstrap 5.3`.

Esta skill **solo mide y recomienda dentro de ese stack**. Si detectas React, Vue, Tailwind, GSAP, Framer Motion u otro framework no aprobado, repórtalo como hallazgo de gobernanza; no propongas optimizaciones específicas de ese framework. No modifiques `tokens.css` ni la identidad *Espresso & Piedra* en nombre del rendimiento.

## 1. Modos de operación

### Quick (por defecto, sin artefactos)

Analizar el código fuente buscando antipatrones estructurales. **Cada hallazgo se etiqueta como `potential impact`**, nunca como medición. El scorecard queda en `not measured`.

### Deep (con artefactos o medición en vivo)

Interpretar uno o más de:

- JSON de Lighthouse (`npx lighthouse <url> --output json`), PageSpeed Insights (`lighthouseResult` + `loadingExperience`) o CrUX API (`CRUX_API_KEY` / `GOOGLE_API_KEY`).
- Traza de DevTools (Perfetto JSON) vía Chrome DevTools MCP (`lighthouse_audit`, `performance_start_trace` / `performance_stop_trace`, `performance_analyze_insight`) o su CLI (`npx -p chrome-devtools-mcp chrome-devtools <tool>`).

Poblar el scorecard solo con valores respaldados por esas fuentes y etiquetar cada uno con su origen. Marcar `not measured` lo que no tenga evidencia.

## 2. Regla de honestidad de métricas

**Nunca fabricar métricas.** Leer código estático no permite medir LCP, INP ni CLS reales. Sin artefactos: entregar informe de hallazgos de fuente, scorecard `not measured` e impacto `potential`. Mezclar valores de laboratorio con datos de campo es fabricación; se corrige antes de continuar.

## 3. Alcance de revisión (adaptado a I&O)

Detecta primero el modelo de renderizado. En este proyecto espera módulos TypeScript vanilla servidos por Vite, HTML semántico y Bootstrap 5.3. Revisar:

### Core Web Vitals

- LCP ≤ 2.5 s; INP ≤ 200 ms; CLS ≤ 0.1 (objetivos "Good").
- Elemento LCP: imagen o titular; si es imagen, `fetchpriority="high"` y **sin** `loading="lazy"`.
- Imágenes, `<source>`, iframes y embeds con `width`/`height` explícitos para reservar espacio.
- Tareas largas > 50 ms que bloqueen el hilo principal; handlers síncronos pesados antes de ceder.
- Bucles largos con `scheduler.yield()` / `yieldToMain` cuando aplique; `content-visibility: auto` en secciones fuera de pantalla.

### Carga

- TTFB < 800 ms; `preconnect`/`dns-prefetch` solo a orígenes conocidos.
- Fuentes autoconsolveras, WOFF2, `font-display: swap`, precarga de la fuente crítica y `unicode-range` si aplica. **No cambiar** `Inter`/`Cormorant Garamond` sin aprobación formal.
- Imágenes en WebP/AVIF con `srcset`/`sizes`; `loading="lazy"` y `decoding="async"` solo bajo el pliegue.
- Bundle inicial < 200 KB gzip; dividir rutas y features pesadas con `import()` dinámico; `<script>` con `defer`/`async`.
- Terceros con `async`/`defer` y fachada cuando sean pesados.

### Renderizado / JS (vanilla)

- Escuchar `scroll`/`resize` con `{ passive: true }` y debounce; agrupar lecturas de layout antes de escrituras para evitar *layout thrashing*.
- Evitar manipulación del DOM dentro de bucles que fuerzan reflow; actualizar por nodo (como el temporizador del drawer) en lugar de re-renderizar contenedores completos.
- Animaciones solo con `transform`/`opacity` y las duraciones de `tokens.css`; `prefers-reduced-motion` debe anularlas.
- Si aparece código React/Vue/Angular/Svelte no aprobado, reportar la desviación; no recomendar `memo`/`watchers`/`OnPush` para este repo.

### Red

- Assets estáticos con `max-age` largo + hash de contenido; HTTP/2 o HTTP/3; compresión gzip/brotli.
- Sin redirects innecesarios; respuestas paginadas; evitar `SELECT *` y sobre-fetch en APIs.
- `Promise.all` para fetches independientes; deduplicar llamadas redundantes.

## 4. Severidad

| Severidad | Criterio | Acción |
|---|---|---|
| Critical | Causa directamente que una CWV fallo el umbral "Good" | Corregir antes de release |
| High | Probable degradación de CWV o lentitud significativa | Corregir antes de release |
| Medium | Patrón subóptimo con impacto contenido | Sprint actual |
| Low | Gap de buena práctica con impacto especulativo | Próximo sprint |
| Info | Oportunidad sin evidencia actual | Considerar |

## 5. Formato de salida

```markdown
## Web Performance Audit — I&O

### Scorecard
| Métrica | Valor | Fuente | Objetivo | Estado |
|---|---|---|---|---|
| LCP | not measured | — | ≤ 2.5s | — |
| INP | not measured | — | ≤ 200ms | — |
| CLS | not measured | — | ≤ 0.1 | — |
| Lighthouse Performance | not measured | — | ≥ 90 | — |

> Artefactos: ninguno — análisis de fuente / [listar los provistos]
> Stack detectado: Vite + TypeScript + HTML5 + Bootstrap 5.3 (o reportar desviación)

### Resumen
- Critical: N · High: N · Medium: N · Low: N

### Hallazgos
#### [SEVERIDAD] Título
- **Área:** CWV / Carga / Renderizado / Red
- **Ubicación:** archivo:línea o selector
- **Descripción:** ...
- **Impacto:** potential impact / medido: <valor con fuente>
- **Recomendación:** cambio concreto dentro del stack aprobado

### Observaciones positivas
### Recomendaciones
```

## 6. Reglas

1. Scorecard primero; si no hay medición, decirlo antes que nada.
2. Etiquetar origen de cada valor; no mezclar campo y laboratorio.
3. Todo hallazgo estático es `potential impact`, jamás una medición.
4. Recomendar solo patrones válidos para Vite + TS + Bootstrap 5.3.
5. Cada hallazgo lleva una recomendación accionable; nada de micro-optimizaciones sin evidencia.
6. Reconocer prácticas correctas existentes.
7. No modificar la Capa 0 ni introducir dependencias solo para auditar.
8. Si hay artefactos Deep, indicar qué campos siguen sin medirse.
