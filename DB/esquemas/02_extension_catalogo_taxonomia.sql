/* ============================================================================
   SISTEMA OMNICANAL I&O — EXTENSIÓN DE TAXONOMÍA DEL CATÁLOGO (T-SQL)
   8 Categorías Principales + Subcategorías + Género/Edad + Ofertas
   Autores: ANDRADE CHIRINOS, Olver Daniel (N00401718)
            RAZURI PAREDES, Josue Daniel (N00421512)
   Nota: Script aditivo e idempotente. No rompe tablas ni FKs de 01_esquema_io_sqlserver.sql.
   ============================================================================ */

USE IO_Ecommerce;
GO

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

-- Normalizar nombre de categoría 1 si venía como 'Polos' en semillas iniciales
UPDATE dbo.Categoria
SET nombre = N'Prendas Superiores',
    descripcion = N'Polos, camisas, blusas, poleras y tops de temporada',
    slug = N'prendas-superiores',
    orden = 1
WHERE categoria_id = 1;

UPDATE dbo.Categoria SET slug = N'pantalones', orden = 2 WHERE categoria_id = 2;
UPDATE dbo.Categoria SET slug = N'vestidos',   orden = 3 WHERE categoria_id = 3;
UPDATE dbo.Categoria SET slug = N'casacas',    orden = 4 WHERE categoria_id = 4;
UPDATE dbo.Categoria SET slug = N'conjuntos',  orden = 5 WHERE categoria_id = 5;
UPDATE dbo.Categoria SET slug = N'accesorios', orden = 6 WHERE categoria_id = 6;

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE nombre = N'Calzado')
BEGIN
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden)
    VALUES (N'Calzado', N'Zapatillas urbanas, botines, calzado casual y sandalias', N'calzado', 7);
END
ELSE
BEGIN
    UPDATE dbo.Categoria SET slug = N'calzado', orden = 7 WHERE nombre = N'Calzado';
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE nombre = N'Sports')
BEGIN
    INSERT INTO dbo.Categoria (nombre, descripcion, slug, orden)
    VALUES (N'Sports', N'Ropa técnica deportiva, training, running y activewear', N'sports', 8);
END
ELSE
BEGIN
    UPDATE dbo.Categoria SET slug = N'sports', orden = 8 WHERE nombre = N'Sports';
END;
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
    ALTER TABLE dbo.Producto ADD subcategoria_id INT NULL;
    ALTER TABLE dbo.Producto ADD CONSTRAINT FK_Producto_Subcategoria
        FOREIGN KEY (subcategoria_id) REFERENCES dbo.Subcategoria(subcategoria_id);
END;

IF COL_LENGTH('dbo.Producto', 'genero') IS NULL
BEGIN
    ALTER TABLE dbo.Producto ADD genero NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Producto_Genero DEFAULT (N'Unisex');
    ALTER TABLE dbo.Producto ADD CONSTRAINT CK_Producto_Genero
        CHECK (genero IN (N'Hombre', N'Mujer', N'Ninos', N'Unisex'));
END;

IF COL_LENGTH('dbo.Producto', 'rango_edad') IS NULL
BEGIN
    ALTER TABLE dbo.Producto ADD rango_edad NVARCHAR(30) NULL;
    ALTER TABLE dbo.Producto ADD CONSTRAINT CK_Producto_RangoEdad
        CHECK (rango_edad IS NULL OR rango_edad IN (N'Bebes', N'Infantil', N'Junior'));
    ALTER TABLE dbo.Producto ADD CONSTRAINT CK_Producto_NinosEdadObligatoria
        CHECK (genero <> N'Ninos' OR rango_edad IS NOT NULL);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Producto_Genero_Edad_Subcat' AND object_id = OBJECT_ID('dbo.Producto'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Producto_Genero_Edad_Subcat
        ON dbo.Producto (genero, rango_edad, categoria_id, subcategoria_id)
        INCLUDE (nombre, precio_venta, stock, activo);
END;
GO

/* ============================================================================
   4. EXTENSIÓN DE OFERTAS (dbo.CampanaMarketing + Vista dbo.vw_OfertasActivas)
   ============================================================================ */
IF COL_LENGTH('dbo.CampanaMarketing', 'genero_target') IS NULL
BEGIN
    ALTER TABLE dbo.CampanaMarketing ADD genero_target NVARCHAR(20) NULL;
    ALTER TABLE dbo.CampanaMarketing ADD CONSTRAINT CK_Campana_GeneroTarget
        CHECK (genero_target IS NULL OR genero_target IN (N'Hombre', N'Mujer', N'Ninos', N'Todas'));
END;

IF COL_LENGTH('dbo.CampanaMarketing', 'rango_edad_target') IS NULL
BEGIN
    ALTER TABLE dbo.CampanaMarketing ADD rango_edad_target NVARCHAR(30) NULL;
    ALTER TABLE dbo.CampanaMarketing ADD CONSTRAINT CK_Campana_EdadTarget
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
    p.sku,
    p.nombre AS producto_nombre,
    p.precio_venta AS precio_regular,
    p.stock AS stock_producto,
    c.categoria_id,
    c.slug AS categoria_slug,
    c.nombre AS categoria_nombre,
    sc.subcategoria_id,
    sc.slug AS subcategoria_slug,
    sc.nombre AS subcategoria_nombre
FROM dbo.CampanaMarketing cm
INNER JOIN dbo.Producto p       ON p.producto_id = cm.producto_id
INNER JOIN dbo.Categoria c      ON c.categoria_id = p.categoria_id
LEFT  JOIN dbo.Subcategoria sc  ON sc.subcategoria_id = p.subcategoria_id
WHERE cm.activa = 1
  AND cm.aprobada_dueno = 1
  AND cm.stock_consumido < cm.stock_maximo
  AND p.activo = 1
  AND p.stock > 0
  AND SYSDATETIME() BETWEEN cm.fecha_inicio AND cm.fecha_fin;
GO
