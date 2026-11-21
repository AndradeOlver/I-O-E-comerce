/* ============================================================================
   SISTEMA OMNICANAL I&O — DATOS SEMILLA INICIALES (MICROSOFT SQL SERVER)
   Autores: ANDRADE CHIRINOS, Olver Daniel (N00401718)
            RAZURI PAREDES, Josue Daniel (N00421512)
   Fecha: 20/11/2026
   ============================================================================ */

USE IO_Ecommerce;
GO

-- 1. Categorías base (EN02)
INSERT INTO dbo.Categoria (nombre, descripcion) VALUES
(N'Polos',      N'Polos básicos y estampados de algodón peruano'),
(N'Pantalones', N'Jeans, joggers y pantalones cargo de temporada'),
(N'Vestidos',   N'Vestidos casuales y de noche en cortes modernos'),
(N'Casacas',    N'Casacas denim, bomber y abrigos urbanos'),
(N'Conjuntos',  N'Conjuntos coordinados deportivos y casuales'),
(N'Accesorios', N'Gorras, correas y complementos de moda');
GO

-- 2. Empleados internos / 5 roles RBAC TN01-TN05 (EN10)
-- Nota: password_hash de desarrollo; reemplazar con hash bcrypt/argon2 en backend
INSERT INTO dbo.Empleado (dni, nombres, rol_rbac, email, password_hash, sueldo_base, fecha_ingreso) VALUES
('40123456', N'Roberto Vargas Mendoza',  N'Administrador',     N'admin@io-moda.pe',     N'$2b$10$DEV_HASH_REEMPLAZAR', 3500.00, '2024-01-10'),
('41234567', N'Camila Torres Quispe',    N'Vendedor',          N'ventas@io-moda.pe',    N'$2b$10$DEV_HASH_REEMPLAZAR', 1500.00, '2024-06-01'),
('42345678', N'Sofía Paredes Luna',      N'Community Manager', N'marketing@io-moda.pe', N'$2b$10$DEV_HASH_REEMPLAZAR', 1800.00, '2025-02-15'),
('43456789', N'Carlos Rojas Huamán',     N'Almacenero',        N'almacen@io-moda.pe',   N'$2b$10$DEV_HASH_REEMPLAZAR', 1650.00, '2024-03-20'),
('44567890', N'Diego Salazar Ríos',      N'Cajero',            N'caja@io-moda.pe',      N'$2b$10$DEV_HASH_REEMPLAZAR', 1550.00, '2024-08-12');
GO

-- 3. Productos de muestra por SKU con codificación multimodal RN-ACC-02 / RN-ACC-04 (EN01)
INSERT INTO dbo.Producto (categoria_id, sku, nombre, descripcion, marca, talla, color, color_textura, alt_text, precio_compra, precio_venta, stock, stock_minimo) VALUES
(1, N'IO-POL-M-OLI', N'Polo Oversize Pima',   N'Polo de algodón pima peruano corte oversize', N'I&O Studio', N'M', N'Verde Olivo', N'Textura Jaspeada', N'Polo oversize de algodón pima color verde olivo con textura jaspeada y cuello redondo', 28.00, 59.90, 14, 5),
(1, N'IO-POL-L-AZN', N'Polo Oversize Pima',   N'Polo de algodón pima peruano corte oversize', N'I&O Studio', N'L', N'Azul Marino', N'Trama Raya Fina',  N'Polo oversize de algodón pima color azul marino con trama de raya fina', 28.00, 59.90, 4,  5),
(2, N'IO-PAN-32-NEG',N'Jean Cargo Urbano',    N'Jean cargo corte recto con bolsillos laterales', N'I&O Denim', N'32', N'Negro Carbón', N'Trama Sólida', N'Pantalón jean cargo corte recto color negro carbón con bolsillos laterales', 55.00, 119.90, 10, 5),
(3, N'IO-VES-S-VIN', N'Vestido Midi Satinado',N'Vestido midi caída fluida cuello drapeado',   N'I&O Gala',   N'S', N'Rojo Vino',    N'Trama Diagonal', N'Vestido midi satinado color rojo vino de caída fluida y cuello drapeado', 62.00, 149.90, 3,  5),
(4, N'IO-CAS-M-BEI', N'Casaca Bomber Urbana', N'Casaca bomber impermeable ligera',            N'I&O Street', N'M', N'Beige Arena',  N'Trama Punteada', N'Casaca bomber urbana color beige arena impermeable con cierre frontal', 75.00, 169.90, 8,  5);
GO

-- 4. Proveedor y Cliente de prueba (EN07, EN06)
INSERT INTO dbo.RegistroProveedor (ruc, razon_social, contacto, telefono, email) VALUES
('20601234561', N'Confecciones Textiles Gamarra S.A.C.', N'Luis Herrera', N'987654321', N'pedidos@textilesgamarra.pe');

INSERT INTO dbo.RegistroCliente (dni_ruc, nombres, telefono, email, direccion, opt_in_marketing) VALUES
('71234568', N'Lucía Fernández Díaz', N'999111222', N'lucia.fernandez@ejemplo.pe', N'Av. Larco 450, Miraflores, Lima', 0);
GO
