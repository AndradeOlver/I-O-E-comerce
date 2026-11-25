/* ============================================================================
   SISTEMA OMNICANAL I&O — ESQUEMA FÍSICO MICROSOFT SQL SERVER (T-SQL)
   Patrón: Producto Base + Variantes (SKU)
   Autores: ANDRADE CHIRINOS, Olver Daniel (N00401718)
            RAZURI PAREDES, Josue Daniel (N00421512)
   Base Documental: MAN v2.1 (EN01-EN12), 42 Reglas I&O + 6 Reglas RN-ACC
   Fecha: 24/11/2026
   ============================================================================ */

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'IO_Ecommerce')
BEGIN
    CREATE DATABASE IO_Ecommerce;
END
GO

USE IO_Ecommerce;
GO

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
