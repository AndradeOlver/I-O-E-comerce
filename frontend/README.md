# 🎨 Frontend – Sistema Omnicanal I&O (`1.2 frontend/`)

> **Estado Actual:** ⏳ **Esqueleto Inicializado — Stack Tecnológico por Elegir** *(prohibido crear archivos `.html`, `.css`, `.js`, `.ts`, `.tsx` hasta aprobar el stack en [ESTADO_GLOBAL_PROYECTO.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/ESTADO_GLOBAL_PROYECTO.md))*  
> **Autores Exclusivos:** **ANDRADE CHIRINOS, Olver Daniel (`N00401718`)** y **RAZURI PAREDES, Josue Daniel (`N00421512`)**  
> **Fuente de Verdad UI/UX:** `../documentos/Interaccion Humano Com Proyecto/Informacion_IHC/04_UX_Personas_Estilos_y_Pruebas_IO.md` (Secciones `7.5` a `7.8`)

---

## 📂 Organización de esta Carpeta

```text
frontend/
├── docs_ui/       <-- Mapeo de Guía de Estilos, Tokens WCAG 2.1 AA/AAA, flujos y vistas (sin código fuente aún)
├── .gitkeep
└── README.md      <-- Este documento orientativo
```

---

## 🧩 Módulos de I&O que Irán en `frontend/`

Esta capa alojará las interfaces de usuario centradas en la persona, responsivas (*Mobile-First*, `320px` a `1920px`) y verificadas bajo **W3C WCAG 2.1 Nivel AA**:

1. **Tienda E-commerce B2C Inclusiva (`M02`, `M05` — `CUN02`, `CUN05`):**
   * Catálogo por SKU (modelo + talla + color) con **selector multimodal de color (Nombre Textual + Textura/Patrón)** para usuarios con daltonismo (`RN-ACC-02`, `DD-01`).
   * Bolsa de compras con **temporizador accesible `aria-live` de reserva por 15 minutos** (`RN-ECO-03`) y cálculo transparente de envío gratuito desde `> S/ 150` (`RN-ENV-04`).
   * Checkout progresivo en 3 pasos (`DD-03`) integrado con pasarela tokenizada PCI-DSS (hasta 3 reintentos `RN-ECO-02`), máquina visible de 6 estados (`RN-ECO-04`) y casilla *opt-in* desmarcada por defecto (`RN-MKT-03`, `RN-ACC-06`).
2. **Terminal Punto de Venta — POS en Tienda (`M01` — `CUN01`):**
   * Operabilidad **100% por teclado (`F2` a `F8`, `Tab`, `Enter`, `Esc`)** y botones táctiles $\ge 48\times48\text{ px}$ (`DD-04`, `RN-ACC-03`).
   * Bandeja automática de **prendas y tallas alternativas** cuando un SKU está agotado (`RN-VEN-02`), selector Boleta (DNI) / Factura (RUC 11 dígitos) con IGV `18%` (`RN-TRI-01`) y bloqueo visual de descuentos $> 10\%$ (`RN-VEN-03`).
3. **Panel de Almacén, Compras y Envíos Courier (`M03`, `M04` — `CUN03`, `CUN04`):**
   * Lista de *picking/packing* habilitada únicamente tras pago confirmado (`RN-ECO-01`).
   * Generación en 1 clic de **Guía de Envío** con código de seguimiento único y registro de hasta 2 intentos de entrega (`RN-ENV-01` a `RN-ENV-03`).
   * Lista de chequeo física contra Guía de Remisión para ingreso de `PedidoProveedor` (`RN-COM-03`) y alertas de stock $\le 5$ unidades (`RN-INV-03`).
4. **Módulo de Préstamos en Consignación (`M06` — `CUN06`):**
   * Flujo guiado *Poka-Yoke* (`DD-02`) con conmutador **"¿Gerente disponible?"**: en ausencia del Dueño, habilita al **Almacenero** para emitir la **Constancia Formal de Préstamo (`RN-PRE-01`)** con vencimiento máximo de 30 días (`RN-PRE-02`) y estado *"En Consignación"* (`RN-PRE-03`).
5. **Dashboard Interactivo Gerencial y Planilla (`M07`, `M08` — `CUN07`, `IHC 7.8` & `C3.3`):**
   * Tarjetas KPI en tiempo real, semáforo de préstamos y gráficos con paleta **colorblind-safe Okabe-Ito** + tramas + tablas equivalentes para lectores de pantalla.
   * Módulo de liquidación mensual de planilla con panel de verificación previa de **liquidez bancaria (`RN-FIN-02`)**.
6. **Accesibilidad Universal Nativa WCAG 2.1 AA (`M08` — `RN-ACC-01` a `RN-ACC-06`):**
   * Integrada permanentemente en toda vista sin depender de barras flotantes: contraste AA/AAA verificado + soporte nativo `prefers-contrast: more` (`#000000` / `#FFFF00`, ratio `19.56:1`), codificación multimodal para daltonismo (etiqueta + textura), escalado tipográfico fluido en `rem` (`100%` a `200%`), reducción de animaciones (`prefers-reduced-motion`) y anillo de foco visible `3px` (`#FFC000`).

---

## 🎨 Guía de Estilos y Métricas Objetivo (IHC)

* **Paleta Institucional Verificada:** Azul Marino (`#0F2043`, contraste `16.12:1`), Ámbar Dorado (`#FFC000`, `11.45:1`), Superficie Neutra (`#F8FAFC`, `13.80:1`), Éxito (`#047857`, `5.48:1`), Alerta (`#B45309`, `5.02:1`), Error (`#B91C1C`, `6.42:1`).
* **Tipografía:** `Inter / System-UI` en vistas digitales (`1rem = 16px`, mínimo `0.875rem = 14px`) y `Arial 11 pt` para impresión de comprobantes/guías.
* **Metas de Calidad UX:** Puntaje **SUS $\ge 85.0$** (prototipo validado en `88.5`), **SEQ $\ge 6.0$** (validado en `6.4/7.0`), Tasa de éxito $\ge 95\%$ (validada en `96.4%`) y **100% WCAG 2.1 Nivel AA**.

---

## ⚖️ Opciones de Stack Tecnológico a Elegir

La decisión final se registrará en la Sección 2.1 de [ESTADO_GLOBAL_PROYECTO.md](file:///d:/equipo/Escritorio/I&O%20E-Comerce/ESTADO_GLOBAL_PROYECTO.md):
* **Opción A:** HTML5 Semántico + CSS3 (*Design Tokens*) + JavaScript Vanilla ES6+ + Bootstrap 5.3.
* **Opción B:** React / Next.js + TypeScript + Bootstrap 5.3 / Tailwind CSS.
* **Opción C:** Angular / Vue 3 + TypeScript.
