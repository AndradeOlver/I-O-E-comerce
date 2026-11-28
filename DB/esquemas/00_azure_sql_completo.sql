/* ============================================================================
   SISTEMA OMNICANAL I&O — SCRIPT CONSOLIDADO PARA AZURE SQL DATABASE (T-SQL)
   Incluye:
     1) 01_esquema_io_sqlserver_variantes.sql (19 tablas con ProductoVariante)
     2) 02_extension_catalogo_taxonomia.sql (8 Categorias + 30 Subcategorias + vw_OfertasActivas)
     3) 03_auth_cliente_password.sql (password_hash en RegistroCliente)
     4) Empleados TN01-TN05, Proveedor y Cliente demo iniciales
   Instrucciones Azure SQL:
     - Crear la BD IO_Ecommerce en el portal de Azure.
     - Conectarse directamente a IO_Ecommerce y ejecutar este unico script.
   ============================================================================ */

/* ============================================================================
   SISTEMA OMNICANAL I&O — ESQUEMA FÍSICO MICROSOFT SQL SERVER (T-SQL)
   Patrón: Producto Base + Variantes (SKU)
   Autores: ANDRADE CHIRINOS, Olver Daniel (N00401718)
            RAZURI PAREDES, Josue Daniel (N00421512)
   Base Documental: MAN v2.1 (EN01-EN12), 42 Reglas I&O + 6 Reglas RN-ACC
   Fecha: 24/11/2026
   ============================================================================ */

-- [Azure SQL] Ejecutar conectado directamente a la base de datos IO_Ecommerce

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ============================================================================
   1. CATÁLOGO E INVENTARIO (EN02: Categoria, EN01: Producto + ProductoVariante)
   ============================================================================ */

CREATE TABLE dbo.Categoria (
    categoria_id INT IDENTITY(1,1) NOT NULL,
    nombre       NVARCHAR(80)      NOT NULL,
    descripcion  NVARCHAR(250)     NULL,
    activo       BIT               NOT NULL CONSTRAINT DF_Categoria_Activo DEFAULT (1),
    creado_en    DATETIME2(0)      NOT NULL CONSTRAINT DF_Categoria_Creado DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Categoria PRIMARY KEY CLUSTERED (categoria_id),
    CONSTRAINT UQ_Categoria_Nombre UNIQUE (nombre)
);
GO

CREATE TABLE dbo.Producto (
    producto_id  INT IDENTITY(1,1) NOT NULL,
    categoria_id INT               NOT NULL,
    nombre       NVARCHAR(120)     NOT NULL,
    descripcion  NVARCHAR(500)     NULL,
    marca        NVARCHAR(80)      NOT NULL,
    activo       BIT               NOT NULL CONSTRAINT DF_Producto_Activo DEFAULT (1),
    creado_en    DATETIME2(0)      NOT NULL CONSTRAINT DF_Producto_Creado DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Producto PRIMARY KEY CLUSTERED (producto_id),
    CONSTRAINT FK_Producto_Categoria FOREIGN KEY (categoria_id) REFERENCES dbo.Categoria(categoria_id),
    CONSTRAINT UQ_Producto_NombreMarca UNIQUE (nombre, marca)
);
GO

CREATE TABLE dbo.ProductoVariante (
    variante_id    INT IDENTITY(1,1) NOT NULL,
    producto_id    INT               NOT NULL,
    sku            NVARCHAR(40)      NOT NULL,
    talla          NVARCHAR(20)      NOT NULL,
    color          NVARCHAR(50)      NOT NULL,
    color_textura  NVARCHAR(60)      NOT NULL, -- RN-ACC-02: Etiqueta + textura para daltonismo
    alt_text       NVARCHAR(300)     NOT NULL, -- RN-ACC-04: Descripción textil para lector de pantalla
    precio_compra  DECIMAL(10,2)     NOT NULL,
    precio_venta   DECIMAL(10,2)     NOT NULL,
    stock          INT               NOT NULL CONSTRAINT DF_ProductoVariante_Stock DEFAULT (0),
    stock_minimo   INT               NOT NULL CONSTRAINT DF_ProductoVariante_StockMin DEFAULT (5), -- RN-INV-03
    activo         BIT               NOT NULL CONSTRAINT DF_ProductoVariante_Activo DEFAULT (1),
    actualizado_en DATETIME2(0)      NOT NULL CONSTRAINT DF_ProductoVariante_Actualizado DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_ProductoVariante PRIMARY KEY CLUSTERED (variante_id),
    CONSTRAINT FK_ProductoVariante_Producto FOREIGN KEY (producto_id) REFERENCES dbo.Producto(producto_id),
    CONSTRAINT UQ_ProductoVariante_SKU UNIQUE (sku),
    CONSTRAINT UQ_ProductoVariante_ModeloTallaColor UNIQUE (producto_id, talla, color), -- RN-INV-01
    CONSTRAINT CK_ProductoVariante_StockNoNegativo CHECK (stock >= 0),                  -- RN-VEN-06
    CONSTRAINT CK_ProductoVariante_StockMinimo CHECK (stock_minimo >= 0),
    CONSTRAINT CK_ProductoVariante_Precios CHECK (precio_compra >= 0 AND precio_venta > 0)
);
GO

/* ============================================================================
   2. ACTORES INTERNOS Y EXTERNOS (EN10: Empleado, EN06: RegistroCliente, EN07: RegistroProveedor)
   ============================================================================ */

CREATE TABLE dbo.Empleado (
    empleado_id   INT IDENTITY(1,1) NOT NULL,
    dni           CHAR(8)           NOT NULL,
    nombres       NVARCHAR(120)     NOT NULL,
    rol_rbac      NVARCHAR(30)      NOT NULL, -- RN-SEG-01: 5 roles internos TN01-TN05
    email         NVARCHAR(120)     NOT NULL,
    password_hash NVARCHAR(255)     NOT NULL,
    sueldo_base   DECIMAL(10,2)     NOT NULL,
    fecha_ingreso DATE              NOT NULL,
    activo        BIT               NOT NULL CONSTRAINT DF_Empleado_Activo DEFAULT (1),
    CONSTRAINT PK_Empleado PRIMARY KEY CLUSTERED (empleado_id),
    CONSTRAINT UQ_Empleado_DNI UNIQUE (dni),
    CONSTRAINT UQ_Empleado_Email UNIQUE (email),
    CONSTRAINT CK_Empleado_RolRBAC CHECK (
        rol_rbac IN (N'Administrador', N'Vendedor', N'Community Manager', N'Almacenero', N'Cajero')
    ),
    CONSTRAINT CK_Empleado_Sueldo CHECK (sueldo_base > 0)
);
GO

CREATE TABLE dbo.RegistroCliente (
    cliente_id       INT IDENTITY(1,1) NOT NULL,
    dni_ruc          NVARCHAR(11)      NOT NULL,
    nombres          NVARCHAR(140)     NOT NULL,
    telefono         NVARCHAR(20)      NULL,
    email            NVARCHAR(120)     NULL,
    password_hash    NVARCHAR(255)     NULL,
    direccion        NVARCHAR(250)     NULL,
    opt_in_marketing BIT               NOT NULL CONSTRAINT DF_Cliente_OptIn DEFAULT (0), -- RN-MKT-03 / RN-ACC-06
    fecha_registro   DATETIME2(0)      NOT NULL CONSTRAINT DF_Cliente_Fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_RegistroCliente PRIMARY KEY CLUSTERED (cliente_id),
    CONSTRAINT UQ_RegistroCliente_DniRuc UNIQUE (dni_ruc),
    CONSTRAINT CK_RegistroCliente_DocLen CHECK (LEN(dni_ruc) IN (8, 11))
);
GO

CREATE TABLE dbo.RegistroProveedor (
    proveedor_id INT IDENTITY(1,1) NOT NULL,
    ruc          CHAR(11)          NOT NULL,
    razon_social NVARCHAR(150)     NOT NULL,
    contacto     NVARCHAR(120)     NOT NULL,
    telefono     NVARCHAR(20)      NOT NULL,
    email        NVARCHAR(120)     NULL,
    activo       BIT               NOT NULL CONSTRAINT DF_Proveedor_Activo DEFAULT (1),
    CONSTRAINT PK_RegistroProveedor PRIMARY KEY CLUSTERED (proveedor_id),
    CONSTRAINT UQ_RegistroProveedor_RUC UNIQUE (ruc)
);
GO

/* ============================================================================
   3. HERENCIA DE PEDIDOS (EN03: Pedido -> EN03.1: PedidoCliente, EN03.2: PedidoProveedor)
   ============================================================================ */

CREATE TABLE dbo.Pedido (
    pedido_id   INT IDENTITY(1,1) NOT NULL,
    tipo_pedido CHAR(1)           NOT NULL, -- 'C' = PedidoCliente, 'P' = PedidoProveedor
    fecha       DATETIME2(0)      NOT NULL CONSTRAINT DF_Pedido_Fecha DEFAULT (SYSDATETIME()),
    estado      NVARCHAR(30)      NOT NULL,
    total       DECIMAL(12,2)     NOT NULL CONSTRAINT DF_Pedido_Total DEFAULT (0),
    empleado_id INT               NULL,
    CONSTRAINT PK_Pedido PRIMARY KEY CLUSTERED (pedido_id),
    CONSTRAINT FK_Pedido_Empleado FOREIGN KEY (empleado_id) REFERENCES dbo.Empleado(empleado_id),
    CONSTRAINT CK_Pedido_Tipo CHECK (tipo_pedido IN ('C', 'P')),
    CONSTRAINT CK_Pedido_Total CHECK (total >= 0)
);
GO

CREATE TABLE dbo.PedidoCliente (
    pedido_id            INT           NOT NULL,
    cliente_id           INT           NOT NULL,
    canal_venta          NVARCHAR(15)  NOT NULL, -- 'Tienda' (CUN01) | 'Online' (CUN02)
    direccion_envio      NVARCHAR(250) NULL,
    modalidad_entrega    NVARCHAR(30)  NOT NULL, -- 'Retiro en tienda' | 'Envío courier'
    costo_envio          DECIMAL(10,2) NOT NULL CONSTRAINT DF_PedidoCliente_Envio DEFAULT (0), -- RN-ENV-04
    descuento_porcentaje DECIMAL(5,2)  NOT NULL CONSTRAINT DF_PedidoCliente_Desc DEFAULT (0),  -- RN-VEN-03
    reintentos_pago      TINYINT       NOT NULL CONSTRAINT DF_PedidoCliente_Reintentos DEFAULT (0), -- RN-ECO-02
    reserva_expira_en    DATETIME2(0)  NULL,     -- RN-ECO-03: +15 minutos en carrito online
    token_pasarela_ref   NVARCHAR(120) NULL,     -- RN-SEG-02: Solo token PCI-DSS (cero PAN/CVV)
    estado_online        NVARCHAR(25)  NOT NULL CONSTRAINT DF_PedidoCliente_Estado DEFAULT (N'Pendiente de pago'),
    CONSTRAINT PK_PedidoCliente PRIMARY KEY CLUSTERED (pedido_id),
    CONSTRAINT FK_PedidoCliente_Pedido FOREIGN KEY (pedido_id) REFERENCES dbo.Pedido(pedido_id),
    CONSTRAINT FK_PedidoCliente_Cliente FOREIGN KEY (cliente_id) REFERENCES dbo.RegistroCliente(cliente_id),
    CONSTRAINT CK_PedidoCliente_Canal CHECK (canal_venta IN (N'Tienda', N'Online')),
    CONSTRAINT CK_PedidoCliente_Descuento CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 10.00), -- RN-VEN-03
    CONSTRAINT CK_PedidoCliente_Reintentos CHECK (reintentos_pago BETWEEN 0 AND 3), -- RN-ECO-02
    CONSTRAINT CK_PedidoCliente_EstadoOnline CHECK (
        estado_online IN (
            N'Pendiente de pago',
            N'Pago rechazado',
            N'En preparación',
            N'En envío',
            N'Entregado',
            N'Cancelado'
        )
    ) -- RN-ECO-04
);
GO

CREATE TABLE dbo.PedidoProveedor (
    pedido_id             INT           NOT NULL,
    proveedor_id          INT           NOT NULL,
    fecha_entrega_pactada DATE          NOT NULL,
    condiciones_pago      NVARCHAR(120) NOT NULL,
    aprobado_dueno        BIT           NOT NULL CONSTRAINT DF_PedidoProv_Aprob DEFAULT (0), -- RN-COM-01
    conformidad_almacen   BIT           NOT NULL CONSTRAINT DF_PedidoProv_Conf DEFAULT (0),  -- RN-COM-03
    numero_guia_remision  NVARCHAR(40)  NULL,
    bloqueado_por_reclamo BIT           NOT NULL CONSTRAINT DF_PedidoProv_Bloq DEFAULT (0),  -- RN-COM-04
    CONSTRAINT PK_PedidoProveedor PRIMARY KEY CLUSTERED (pedido_id),
    CONSTRAINT FK_PedidoProveedor_Pedido FOREIGN KEY (pedido_id) REFERENCES dbo.Pedido(pedido_id),
    CONSTRAINT FK_PedidoProveedor_Proveedor FOREIGN KEY (proveedor_id) REFERENCES dbo.RegistroProveedor(proveedor_id)
);
GO

/* ============================================================================
   4. HERENCIA DE DETALLE PEDIDO (EN04 -> EN04.1, EN04.2)
   ============================================================================ */

CREATE TABLE dbo.DetallePedido (
    detalle_id      INT IDENTITY(1,1) NOT NULL,
    pedido_id       INT               NOT NULL,
    variante_id     INT               NOT NULL, -- Referencia al SKU físico (RN-VEN-06)
    tipo_detalle    CHAR(1)           NOT NULL, -- 'C' = Cliente, 'P' = Proveedor
    cantidad        INT               NOT NULL,
    precio_unitario DECIMAL(10,2)     NOT NULL,
    subtotal        AS (CAST(cantidad * precio_unitario AS DECIMAL(12,2))) PERSISTED,
    CONSTRAINT PK_DetallePedido PRIMARY KEY CLUSTERED (detalle_id),
    CONSTRAINT FK_DetallePedido_Pedido FOREIGN KEY (pedido_id) REFERENCES dbo.Pedido(pedido_id),
    CONSTRAINT FK_DetallePedido_ProductoVariante FOREIGN KEY (variante_id) REFERENCES dbo.ProductoVariante(variante_id),
    CONSTRAINT CK_DetallePedido_Tipo CHECK (tipo_detalle IN ('C', 'P')),
    CONSTRAINT CK_DetallePedido_Cantidad CHECK (cantidad > 0),
    CONSTRAINT CK_DetallePedido_Precio CHECK (precio_unitario >= 0)
);
GO

CREATE TABLE dbo.DetallePedidoCliente (
    detalle_id      INT           NOT NULL,
    descuento_linea DECIMAL(10,2) NOT NULL CONSTRAINT DF_DetCli_Desc DEFAULT (0),
    CONSTRAINT PK_DetallePedidoCliente PRIMARY KEY CLUSTERED (detalle_id),
    CONSTRAINT FK_DetallePedidoCliente_Base FOREIGN KEY (detalle_id) REFERENCES dbo.DetallePedido(detalle_id),
    CONSTRAINT CK_DetCli_Desc CHECK (descuento_linea >= 0)
);
GO

CREATE TABLE dbo.DetallePedidoProveedor (
    detalle_id        INT NOT NULL,
    cantidad_recibida INT NOT NULL CONSTRAINT DF_DetProv_Rec DEFAULT (0),
    lote_conforme     BIT NOT NULL CONSTRAINT DF_DetProv_Conf DEFAULT (0),
    CONSTRAINT PK_DetallePedidoProveedor PRIMARY KEY CLUSTERED (detalle_id),
    CONSTRAINT FK_DetallePedidoProveedor_Base FOREIGN KEY (detalle_id) REFERENCES dbo.DetallePedido(detalle_id),
    CONSTRAINT CK_DetProv_Rec CHECK (cantidad_recibida >= 0)
);
GO

/* ============================================================================
   5. FACTURACIÓN Y LOGÍSTICA (EN05: ComprobantePago, EN08: GuiaEnvio)
   ============================================================================ */

CREATE TABLE dbo.ComprobantePago (
    comprobante_id    INT IDENTITY(1,1) NOT NULL,
    pedido_cliente_id INT               NOT NULL,
    numero            NVARCHAR(25)      NOT NULL, -- RN-TRI-01: Correlativo único SUNAT
    tipo              NVARCHAR(20)      NOT NULL, -- Boleta | Factura | NotaCredito
    fecha             DATETIME2(0)      NOT NULL CONSTRAINT DF_Comprobante_Fecha DEFAULT (SYSDATETIME()),
    subtotal_gravado  DECIMAL(12,2)     NOT NULL,
    igv               DECIMAL(12,2)     NOT NULL, -- 18% SUNAT
    total             DECIMAL(12,2)     NOT NULL,
    motivo_anulacion  NVARCHAR(250)     NULL,     -- RN-TRI-03
    CONSTRAINT PK_ComprobantePago PRIMARY KEY CLUSTERED (comprobante_id),
    CONSTRAINT FK_Comprobante_PedidoCliente FOREIGN KEY (pedido_cliente_id) REFERENCES dbo.PedidoCliente(pedido_id),
    CONSTRAINT UQ_Comprobante_Numero UNIQUE (numero),
    CONSTRAINT CK_Comprobante_Tipo CHECK (tipo IN (N'Boleta', N'Factura', N'NotaCredito')),
    CONSTRAINT CK_Comprobante_Montos CHECK (subtotal_gravado >= 0 AND igv >= 0 AND total >= 0)
);
GO

CREATE TABLE dbo.GuiaEnvio (
    guia_id            INT IDENTITY(1,1) NOT NULL,
    pedido_cliente_id  INT               NOT NULL,
    codigo_seguimiento NVARCHAR(40)      NOT NULL, -- RN-ENV-01
    empresa_courier    NVARCHAR(80)      NOT NULL,
    direccion_destino  NVARCHAR(250)     NOT NULL,
    estado_envio       NVARCHAR(30)      NOT NULL CONSTRAINT DF_Guia_Estado DEFAULT (N'En preparación'),
    intentos_entrega   TINYINT           NOT NULL CONSTRAINT DF_Guia_Intentos DEFAULT (0), -- RN-ENV-03
    dni_receptor       CHAR(8)           NULL,     -- RN-ENV-02
    firma_recepcion    NVARCHAR(120)     NULL,     -- RN-ENV-02
    actualizado_en     DATETIME2(0)      NOT NULL CONSTRAINT DF_Guia_Act DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_GuiaEnvio PRIMARY KEY CLUSTERED (guia_id),
    CONSTRAINT FK_GuiaEnvio_PedidoCliente FOREIGN KEY (pedido_cliente_id) REFERENCES dbo.PedidoCliente(pedido_id),
    CONSTRAINT UQ_GuiaEnvio_Pedido UNIQUE (pedido_cliente_id),
    CONSTRAINT UQ_GuiaEnvio_Tracking UNIQUE (codigo_seguimiento),
    CONSTRAINT CK_GuiaEnvio_Intentos CHECK (intentos_entrega BETWEEN 0 AND 2),
    CONSTRAINT CK_GuiaEnvio_Estado CHECK (
        estado_envio IN (N'En preparación', N'En envío', N'Primer intento fallido', N'Entregado', N'Retornado a almacén')
    )
);
GO

/* ============================================================================
   6. PRÉSTAMOS EN CONSIGNACIÓN (EN09: PrestamoProductos — RN-PRE-01 a RN-PRE-05)
   ============================================================================ */

CREATE TABLE dbo.PrestamoProductos (
    prestamo_id              INT IDENTITY(1,1) NOT NULL,
    variante_id              INT               NOT NULL, -- Movimiento físico por SKU
    empleado_autorizador_id  INT               NOT NULL,
    tienda_aliada            NVARCHAR(120)     NOT NULL,
    cantidad                 INT               NOT NULL,
    fecha_salida             DATETIME2(0)      NOT NULL CONSTRAINT DF_Prestamo_Salida DEFAULT (SYSDATETIME()),
    plazo_dias               TINYINT           NOT NULL CONSTRAINT DF_Prestamo_Plazo DEFAULT (7), -- RN-PRE-02: máx. 7 días (1 semana)
    fecha_vencimiento        AS (DATEADD(DAY, plazo_dias, CAST(fecha_salida AS DATE))) PERSISTED,
    estado                   NVARCHAR(30)      NOT NULL CONSTRAINT DF_Prestamo_Estado DEFAULT (N'En Consignación'),
    gerente_disponible       BIT               NOT NULL CONSTRAINT DF_Prestamo_Gerente DEFAULT (1),
    numero_constancia_formal NVARCHAR(40)      NULL, -- Obligatorio cuando gerente_disponible = 0 (RN-PRE-01)
    dni_receptor_tienda      CHAR(8)           NOT NULL,
    observaciones            NVARCHAR(300)     NULL,
    CONSTRAINT PK_PrestamoProductos PRIMARY KEY CLUSTERED (prestamo_id),
    CONSTRAINT FK_Prestamo_ProductoVariante FOREIGN KEY (variante_id) REFERENCES dbo.ProductoVariante(variante_id),
    CONSTRAINT FK_Prestamo_Empleado FOREIGN KEY (empleado_autorizador_id) REFERENCES dbo.Empleado(empleado_id),
    CONSTRAINT CK_Prestamo_Cantidad CHECK (cantidad > 0),
    CONSTRAINT CK_Prestamo_Plazo CHECK (plazo_dias BETWEEN 1 AND 7), -- RN-PRE-02: máx. 7 días (1 semana)
    CONSTRAINT CK_Prestamo_Estado CHECK (
        estado IN (N'En Consignación', N'Devuelto Intacto', N'Liquidado', N'Facturado por Deterioro')
    ),
    CONSTRAINT CK_Prestamo_ConstanciaRNPRE01 CHECK (
        gerente_disponible = 1 OR (gerente_disponible = 0 AND numero_constancia_formal IS NOT NULL AND LEN(LTRIM(RTRIM(numero_constancia_formal))) > 0)
    )
);
GO

CREATE UNIQUE NONCLUSTERED INDEX UX_Prestamo_Constancia
    ON dbo.PrestamoProductos (numero_constancia_formal)
    WHERE numero_constancia_formal IS NOT NULL;
GO

/* ============================================================================
   7. PLANILLA Y MOVIMIENTOS FINANCIEROS (EN11: Planilla, EN12: MovimientoFinanciero)
   ============================================================================ */

CREATE TABLE dbo.Planilla (
    planilla_id         INT IDENTITY(1,1) NOT NULL,
    empleado_id         INT               NOT NULL,
    periodo             CHAR(7)           NOT NULL, -- Formato YYYY-MM
    dias_laborados      TINYINT           NOT NULL,
    remuneracion_base   DECIMAL(10,2)     NOT NULL,
    bonificaciones      DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Planilla_Bonif DEFAULT (0),
    descuentos          DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Planilla_Desc DEFAULT (0),
    sueldo_neto         AS (CAST(remuneracion_base + bonificaciones - descuentos AS DECIMAL(10,2))) PERSISTED,
    liquidez_verificada BIT               NOT NULL CONSTRAINT DF_Planilla_Liq DEFAULT (0), -- RN-FIN-02
    boleta_firmada      BIT               NOT NULL CONSTRAINT DF_Planilla_Firm DEFAULT (0), -- RN-FIN-03
    cerrada             BIT               NOT NULL CONSTRAINT DF_Planilla_Cerrada DEFAULT (0), -- RN-FIN-05
    fecha_pago          DATETIME2(0)      NULL,
    CONSTRAINT PK_Planilla PRIMARY KEY CLUSTERED (planilla_id),
    CONSTRAINT FK_Planilla_Empleado FOREIGN KEY (empleado_id) REFERENCES dbo.Empleado(empleado_id),
    CONSTRAINT UQ_Planilla_EmpleadoPeriodo UNIQUE (empleado_id, periodo),
    CONSTRAINT CK_Planilla_Dias CHECK (dias_laborados BETWEEN 0 AND 31),
    CONSTRAINT CK_Planilla_Montos CHECK (remuneracion_base >= 0 AND bonificaciones >= 0 AND descuentos >= 0)
);
GO

CREATE TABLE dbo.MovimientoFinanciero (
    movimiento_id INT IDENTITY(1,1) NOT NULL,
    pedido_id     INT               NULL,
    planilla_id   INT               NULL,
    fecha         DATETIME2(0)      NOT NULL CONSTRAINT DF_MovFin_Fecha DEFAULT (SYSDATETIME()),
    tipo          NVARCHAR(15)      NOT NULL, -- 'Ingreso' | 'Egreso'
    concepto      NVARCHAR(200)     NOT NULL,
    monto         DECIMAL(12,2)     NOT NULL,
    CONSTRAINT PK_MovimientoFinanciero PRIMARY KEY CLUSTERED (movimiento_id),
    CONSTRAINT FK_MovFin_Pedido FOREIGN KEY (pedido_id) REFERENCES dbo.Pedido(pedido_id),
    CONSTRAINT FK_MovFin_Planilla FOREIGN KEY (planilla_id) REFERENCES dbo.Planilla(planilla_id),
    CONSTRAINT CK_MovFin_Tipo CHECK (tipo IN (N'Ingreso', N'Egreso')),
    CONSTRAINT CK_MovFin_Monto CHECK (monto > 0)
);
GO

/* ============================================================================
   8. TABLAS TRANSVERSALES: MARKETING (RN-MKT-01/04) Y BITÁCORA INMUTABLE (RN-SEG-03)
   ============================================================================ */

CREATE TABLE dbo.CampanaMarketing (
    campana_id         INT IDENTITY(1,1) NOT NULL,
    producto_id        INT               NOT NULL, -- Promociona el modelo base (todas sus variantes)
    titulo             NVARCHAR(140)     NOT NULL,
    precio_promocional DECIMAL(10,2)     NOT NULL,
    stock_maximo       INT               NOT NULL, -- RN-MKT-01 (INDECOPI)
    stock_consumido    INT               NOT NULL CONSTRAINT DF_Campana_Cons DEFAULT (0),
    fecha_inicio       DATETIME2(0)      NOT NULL,
    fecha_fin          DATETIME2(0)      NOT NULL,
    aprobada_dueno     BIT               NOT NULL CONSTRAINT DF_Campana_Aprob DEFAULT (0), -- RN-MKT-04
    activa             BIT               NOT NULL CONSTRAINT DF_Campana_Activa DEFAULT (1),
    CONSTRAINT PK_CampanaMarketing PRIMARY KEY CLUSTERED (campana_id),
    CONSTRAINT FK_Campana_Producto FOREIGN KEY (producto_id) REFERENCES dbo.Producto(producto_id),
    CONSTRAINT CK_Campana_Stock CHECK (stock_maximo > 0 AND stock_consumido BETWEEN 0 AND stock_maximo),
    CONSTRAINT CK_Campana_Fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT CK_Campana_Precio CHECK (precio_promocional > 0)
);
GO

CREATE TABLE dbo.AuditLog (
    audit_id       BIGINT IDENTITY(1,1) NOT NULL,
    empleado_id    INT                  NULL,
    rol_usuario    NVARCHAR(30)         NOT NULL,
    tabla_afectada NVARCHAR(60)         NOT NULL,
    accion         NVARCHAR(30)         NOT NULL,
    registro_id    NVARCHAR(50)         NOT NULL,
    detalle        NVARCHAR(MAX)        NOT NULL,
    fecha_hora     DATETIME2(0)         NOT NULL CONSTRAINT DF_AuditLog_Fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (audit_id),
    CONSTRAINT FK_AuditLog_Empleado FOREIGN KEY (empleado_id) REFERENCES dbo.Empleado(empleado_id)
);
GO

/* ============================================================================
   9. TRIGGERS DE INTEGRIDAD (RN-FIN-05 INMUTABILIDAD PLANILLA, RN-SEG-03 AUDITLOG)
   ============================================================================ */

CREATE OR ALTER TRIGGER dbo.TR_Planilla_BloqueoRetroactivo
ON dbo.Planilla
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted WHERE cerrada = 1)
    BEGIN
        RAISERROR (N'RN-FIN-05: No se permite modificar ni eliminar una planilla cerrada.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_AuditLog_Inmutable
ON dbo.AuditLog
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    RAISERROR (N'RN-SEG-03: La bitácora de auditoría (AuditLog) es estrictamente inmutable.', 16, 1);
END;
GO

/* ============================================================================
   10. ÍNDICES DE RENDIMIENTO (< 1.5s EN CONSULTAS SKU, PEDIDOS Y PRÉSTAMOS)
   ============================================================================ */

CREATE NONCLUSTERED INDEX IX_Producto_Categoria_Activo
    ON dbo.Producto (categoria_id, activo)
    INCLUDE (nombre, marca);

CREATE NONCLUSTERED INDEX IX_ProductoVariante_Producto_Talla_Color
    ON dbo.ProductoVariante (producto_id, talla, color)
    INCLUDE (sku, precio_venta, stock, color_textura, activo);

CREATE NONCLUSTERED INDEX IX_ProductoVariante_StockBajo
    ON dbo.ProductoVariante (stock, stock_minimo)
    INCLUDE (producto_id, sku, talla, color)
    WHERE activo = 1;

CREATE NONCLUSTERED INDEX IX_PedidoCliente_Estado
    ON dbo.PedidoCliente (estado_online, canal_venta);

CREATE NONCLUSTERED INDEX IX_Prestamo_Estado_Vencimiento
    ON dbo.PrestamoProductos (estado, fecha_vencimiento);

CREATE NONCLUSTERED INDEX IX_AuditLog_Tabla_Fecha
    ON dbo.AuditLog (tabla_afectada, fecha_hora DESC);
GO

/* ============================================================================
   SISTEMA OMNICANAL I&O — EXTENSIÓN DE TAXONOMÍA DEL CATÁLOGO (T-SQL)
   8 Categorías Principales + Subcategorías + Género/Edad + Ofertas
   Autores: ANDRADE CHIRINOS, Olver Daniel (N00401718)
            RAZURI PAREDES, Josue Daniel (N00421512)
   Nota: Script aditivo e idempotente. No rompe tablas ni FKs de 01_esquema_io_sqlserver.sql.
   ============================================================================ */


/* ============================================================================
   1. EXTENSIÓN DE dbo.Categoria (8 Categorías Base + Slug + Orden)
   ============================================================================ */
IF COL_LENGTH('dbo.Categoria', 'slug') IS NULL
BEGIN
    ALTER TABLE dbo.Categoria ADD slug NVARCHAR(80) NULL;
END;
IF COL_LENGTH('dbo.Categoria', 'orden') IS NULL
BEGIN
    ALTER TABLE dbo.Categoria ADD orden INT NOT NULL CONSTRAINT DF_Categoria_Orden DEFAULT (0);
END;
GO

-- Semilla idempotente de las 8 categorías oficiales (funciona en BD vacía o con semillas previas)
IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'prendas-superiores' OR nombre IN (N'Prendas Superiores', N'Polos'))
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Prendas Superiores', N'Polos, camisas, blusas, poleras y tops de temporada', N'prendas-superiores', 1);
ELSE
    UPDATE dbo.Categoria SET nombre = N'Prendas Superiores', descripcion = N'Polos, camisas, blusas, poleras y tops de temporada', slug = N'prendas-superiores', orden = 1 WHERE nombre IN (N'Prendas Superiores', N'Polos') OR slug = N'prendas-superiores';

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'pantalones' OR nombre = N'Pantalones')
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Pantalones', N'Jeans, joggers y pantalones cargo de temporada', N'pantalones', 2);
ELSE
    UPDATE dbo.Categoria SET slug = N'pantalones', orden = 2 WHERE nombre = N'Pantalones' OR slug = N'pantalones';

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'vestidos' OR nombre = N'Vestidos')
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Vestidos', N'Vestidos casuales y de noche en cortes modernos', N'vestidos', 3);
ELSE
    UPDATE dbo.Categoria SET slug = N'vestidos', orden = 3 WHERE nombre = N'Vestidos' OR slug = N'vestidos';

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'casacas' OR nombre = N'Casacas')
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Casacas', N'Casacas denim, bomber y abrigos urbanos', N'casacas', 4);
ELSE
    UPDATE dbo.Categoria SET slug = N'casacas', orden = 4 WHERE nombre = N'Casacas' OR slug = N'casacas';

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'conjuntos' OR nombre = N'Conjuntos')
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Conjuntos', N'Conjuntos coordinados deportivos y casuales', N'conjuntos', 5);
ELSE
    UPDATE dbo.Categoria SET slug = N'conjuntos', orden = 5 WHERE nombre = N'Conjuntos' OR slug = N'conjuntos';

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'accesorios' OR nombre = N'Accesorios')
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Accesorios', N'Gorras, correas y complementos de moda', N'accesorios', 6);
ELSE
    UPDATE dbo.Categoria SET slug = N'accesorios', orden = 6 WHERE nombre = N'Accesorios' OR slug = N'accesorios';

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'calzado' OR nombre = N'Calzado')
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Calzado', N'Zapatillas urbanas, botines, calzado casual y sandalias', N'calzado', 7);
ELSE
    UPDATE dbo.Categoria SET slug = N'calzado', orden = 7 WHERE nombre = N'Calzado' OR slug = N'calzado';

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE slug = N'sports' OR nombre = N'Sports')
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden) VALUES (N'Sports', N'Ropa técnica deportiva, training, running y activewear', N'sports', 8);
ELSE
    UPDATE dbo.Categoria SET slug = N'sports', orden = 8 WHERE nombre = N'Sports' OR slug = N'sports';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Categoria_Slug' AND object_id = OBJECT_ID('dbo.Categoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_Categoria_Slug
        ON dbo.Categoria (slug)
        WHERE slug IS NOT NULL;
END;
GO

/* ============================================================================
   2. NUEVA TABLA dbo.Subcategoria (Variedad por Categoría + Reglas de Contexto)
   ============================================================================ */
IF OBJECT_ID('dbo.Subcategoria', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Subcategoria (
        subcategoria_id INT IDENTITY(1,1) NOT NULL,
        categoria_id    INT               NOT NULL,
        slug            NVARCHAR(80)      NOT NULL,
        nombre          NVARCHAR(100)     NOT NULL,
        aplica_hombre   BIT               NOT NULL CONSTRAINT DF_Subcat_Hombre DEFAULT (1),
        aplica_mujer    BIT               NOT NULL CONSTRAINT DF_Subcat_Mujer  DEFAULT (1),
        aplica_ninos    BIT               NOT NULL CONSTRAINT DF_Subcat_Ninos  DEFAULT (1),
        orden           INT               NOT NULL CONSTRAINT DF_Subcat_Orden  DEFAULT (0),
        activo          BIT               NOT NULL CONSTRAINT DF_Subcat_Activo DEFAULT (1),
        CONSTRAINT PK_Subcategoria PRIMARY KEY CLUSTERED (subcategoria_id),
        CONSTRAINT FK_Subcategoria_Categoria FOREIGN KEY (categoria_id) REFERENCES dbo.Categoria(categoria_id),
        CONSTRAINT UQ_Subcategoria_Cat_Slug UNIQUE (categoria_id, slug)
    );
END;
GO

-- Semilla de subcategorías coherentes para las 8 categorías principales
;WITH SubcatSeed AS (
    SELECT c.categoria_id, v.slug, v.nombre, v.aplica_hombre, v.aplica_mujer, v.aplica_ninos, v.orden
    FROM (VALUES
        -- 1. Prendas Superiores
        (N'prendas-superiores', N'polos-pima',        N'Polos Pima',         1, 1, 1, 1),
        (N'prendas-superiores', N'camisas-blusas',    N'Camisas & Blusas',   1, 1, 1, 2),
        (N'prendas-superiores', N'poleras-hoodies',   N'Poleras & Hoodies',  1, 1, 1, 3),
        (N'prendas-superiores', N'tops-bodies',       N'Tops & Bodies',      0, 1, 1, 4),
        -- 2. Pantalones
        (N'pantalones',         N'jeans-cargo',       N'Jeans Cargo',        1, 1, 1, 1),
        (N'pantalones',         N'joggers-buzos',     N'Joggers & Buzos',    1, 1, 1, 2),
        (N'pantalones',         N'pantalones-vestir', N'Pantalones de Vestir',1,1, 0, 3),
        (N'pantalones',         N'shorts-bermudas',   N'Shorts & Bermudas',  1, 1, 1, 4),
        -- 3. Vestidos (excluye Hombre)
        (N'vestidos',           N'vestidos-midi',     N'Vestidos Midi',      0, 1, 1, 1),
        (N'vestidos',           N'vestidos-noche',    N'Vestidos de Noche',  0, 1, 0, 2),
        (N'vestidos',           N'vestidos-casuales', N'Vestidos Casuales',  0, 1, 1, 3),
        -- 4. Casacas
        (N'casacas',            N'bomber-urbanas',    N'Bomber Urbanas',     1, 1, 1, 1),
        (N'casacas',            N'denim-abrigos',     N'Denim & Abrigos',    1, 1, 1, 2),
        (N'casacas',            N'cortavientos',      N'Cortavientos',       1, 1, 1, 3),
        (N'casacas',            N'chalecos',          N'Chalecos',           1, 1, 1, 4),
        -- 5. Conjuntos
        (N'conjuntos',          N'sets-urbanos',      N'Sets Urbanos',       1, 1, 1, 1),
        (N'conjuntos',          N'sets-casuales',     N'Sets Casuales',      1, 1, 1, 2),
        (N'conjuntos',          N'sets-bebe-infantil',N'Sets Bebé & Infantil',0,0, 1, 3),
        -- 6. Accesorios
        (N'accesorios',         N'gorras-sombreros',  N'Gorras & Sombreros', 1, 1, 1, 1),
        (N'accesorios',         N'correas-billeteras',N'Correas & Billeteras',1,1, 0, 2),
        (N'accesorios',         N'mochilas-bolsos',   N'Mochilas & Bolsos',  1, 1, 1, 3),
        (N'accesorios',         N'medias-complementos',N'Medias & Complementos',1,1,1,4),
        -- 7. Calzado
        (N'calzado',            N'zapatillas-urbanas',N'Zapatillas Urbanas', 1, 1, 1, 1),
        (N'calzado',            N'botines-botas',     N'Botines & Botas',    1, 1, 1, 2),
        (N'calzado',            N'calzado-casual',    N'Calzado Casual',     1, 1, 1, 3),
        (N'calzado',            N'sandalias',         N'Sandalias',          1, 1, 1, 4),
        -- 8. Sports
        (N'sports',             N'polos-dry-fit',     N'Polos Dry-Fit',      1, 1, 1, 1),
        (N'sports',             N'leggings-shorts',   N'Leggings & Shorts',  1, 1, 1, 2),
        (N'sports',             N'buzos-training',    N'Buzos Training',     1, 1, 1, 3),
        (N'sports',             N'zapatillas-running',N'Zapatillas Running', 1, 1, 1, 4)
    ) AS v(cat_slug, slug, nombre, aplica_hombre, aplica_mujer, aplica_ninos, orden)
    INNER JOIN dbo.Categoria c ON c.slug = v.cat_slug
)
MERGE dbo.Subcategoria AS tgt
USING SubcatSeed AS src
   ON tgt.categoria_id = src.categoria_id AND tgt.slug = src.slug
WHEN NOT MATCHED THEN
    INSERT (categoria_id, slug, nombre, aplica_hombre, aplica_mujer, aplica_ninos, orden)
    VALUES (src.categoria_id, src.slug, src.nombre, src.aplica_hombre, src.aplica_mujer, src.aplica_ninos, src.orden);
GO

/* ============================================================================
   3. EXTENSIÓN DE dbo.Producto (Subcategoría + Género + Rango de Edad Niños)
   ============================================================================ */
IF COL_LENGTH('dbo.Producto', 'subcategoria_id') IS NULL
BEGIN
    ALTER TABLE dbo.Producto ADD subcategoria_id INT NULL
        CONSTRAINT FK_Producto_Subcategoria
        FOREIGN KEY (subcategoria_id) REFERENCES dbo.Subcategoria(subcategoria_id);
END;
GO

IF COL_LENGTH('dbo.Producto', 'genero') IS NULL
BEGIN
    ALTER TABLE dbo.Producto ADD genero NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Producto_Genero DEFAULT (N'Unisex')
        CONSTRAINT CK_Producto_Genero CHECK (genero IN (N'Hombre', N'Mujer', N'Ninos', N'Unisex'));
END;
GO

IF COL_LENGTH('dbo.Producto', 'rango_edad') IS NULL
BEGIN
    ALTER TABLE dbo.Producto ADD rango_edad NVARCHAR(30) NULL
        CONSTRAINT CK_Producto_RangoEdad CHECK (rango_edad IS NULL OR rango_edad IN (N'Bebes', N'Infantil', N'Junior'));
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Producto_NinosEdadObligatoria')
BEGIN
    ALTER TABLE dbo.Producto ADD CONSTRAINT CK_Producto_NinosEdadObligatoria
        CHECK (genero <> N'Ninos' OR rango_edad IS NOT NULL);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Producto_Genero_Edad_Subcat' AND object_id = OBJECT_ID('dbo.Producto'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Producto_Genero_Edad_Subcat
        ON dbo.Producto (genero, rango_edad, categoria_id, subcategoria_id)
        INCLUDE (nombre, marca, activo);
END;
GO

/* ============================================================================
   4. EXTENSIÓN DE OFERTAS (dbo.CampanaMarketing + Vista dbo.vw_OfertasActivas)
   ============================================================================ */
IF COL_LENGTH('dbo.CampanaMarketing', 'genero_target') IS NULL
BEGIN
    ALTER TABLE dbo.CampanaMarketing ADD genero_target NVARCHAR(20) NULL
        CONSTRAINT CK_Campana_GeneroTarget
        CHECK (genero_target IS NULL OR genero_target IN (N'Hombre', N'Mujer', N'Ninos', N'Todas'));
END;
GO

IF COL_LENGTH('dbo.CampanaMarketing', 'rango_edad_target') IS NULL
BEGIN
    ALTER TABLE dbo.CampanaMarketing ADD rango_edad_target NVARCHAR(30) NULL
        CONSTRAINT CK_Campana_EdadTarget
        CHECK (rango_edad_target IS NULL OR rango_edad_target IN (N'Bebes', N'Infantil', N'Junior'));
END;
GO

CREATE OR ALTER VIEW dbo.vw_OfertasActivas
AS
SELECT
    cm.campana_id,
    cm.titulo,
    cm.precio_promocional,
    cm.stock_maximo,
    cm.stock_consumido,
    (cm.stock_maximo - cm.stock_consumido) AS stock_promocional_disponible,
    cm.fecha_inicio,
    cm.fecha_fin,
    COALESCE(cm.genero_target, p.genero) AS genero_efectivo,
    COALESCE(cm.rango_edad_target, p.rango_edad) AS rango_edad_efectivo,
    p.producto_id,
    pv.variante_id,
    pv.sku,
    p.nombre AS producto_nombre,
    pv.precio_venta AS precio_regular,
    pv.stock AS stock_producto,
    c.categoria_id,
    c.slug AS categoria_slug,
    c.nombre AS categoria_nombre,
    sc.subcategoria_id,
    sc.slug AS subcategoria_slug,
    sc.nombre AS subcategoria_nombre
FROM dbo.CampanaMarketing cm
INNER JOIN dbo.Producto p          ON p.producto_id = cm.producto_id
INNER JOIN dbo.ProductoVariante pv ON pv.producto_id = p.producto_id
INNER JOIN dbo.Categoria c         ON c.categoria_id = p.categoria_id
LEFT  JOIN dbo.Subcategoria sc     ON sc.subcategoria_id = p.subcategoria_id
WHERE cm.activa = 1
  AND cm.aprobada_dueno = 1
  AND cm.stock_consumido < cm.stock_maximo
  AND p.activo = 1
  AND pv.activo = 1
  AND pv.stock > 0
  AND SYSDATETIME() BETWEEN cm.fecha_inicio AND cm.fecha_fin;
GO

IF COL_LENGTH('dbo.RegistroCliente', 'password_hash') IS NULL
BEGIN
    ALTER TABLE dbo.RegistroCliente
    ADD password_hash NVARCHAR(255) NULL;
END;
GO


/* ============================================================================
   5. DATOS INICIALES MINIMOS (Empleados RBAC TN01-TN05, Proveedor, Cliente)
   ============================================================================ */
IF NOT EXISTS (SELECT 1 FROM dbo.Empleado)
BEGIN
    INSERT INTO dbo.Empleado (dni, nombres, rol_rbac, email, password_hash, sueldo_base, fecha_ingreso) VALUES
    ('40123456', N'Roberto Vargas Mendoza',  N'Administrador',     N'admin@io-moda.pe',     N'', 3500.00, '2024-01-10'),
    ('41234567', N'Camila Torres Quispe',    N'Vendedor',          N'ventas@io-moda.pe',    N'', 1500.00, '2024-06-01'),
    ('42345678', N'Sofía Paredes Luna',      N'Community Manager', N'marketing@io-moda.pe', N'', 1800.00, '2025-02-15'),
    ('43456789', N'Carlos Rojas Huamán',     N'Almacenero',        N'almacen@io-moda.pe',   N'', 1650.00, '2024-03-20'),
    ('44567890', N'Diego Salazar Ríos',      N'Cajero',            N'caja@io-moda.pe',      N'', 1550.00, '2024-08-12');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.RegistroProveedor)
BEGIN
    INSERT INTO dbo.RegistroProveedor (ruc, razon_social, contacto, telefono, email) VALUES
    ('20601234561', N'Confecciones Textiles Gamarra S.A.C.', N'Luis Herrera', N'987654321', N'pedidos@textilesgamarra.pe');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.RegistroCliente)
BEGIN
    INSERT INTO dbo.RegistroCliente (dni_ruc, nombres, telefono, email, direccion, opt_in_marketing) VALUES
    ('71234568', N'Lucía Fernández Díaz', N'999111222', N'lucia.fernandez@ejemplo.pe', N'Av. Larco 450, Miraflores, Lima', 0);
END;
GO
