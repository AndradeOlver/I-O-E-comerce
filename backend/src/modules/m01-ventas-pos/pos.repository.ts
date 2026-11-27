import { getPool, sql, withTransaction } from '../../config/db.js';
import { Decimal } from 'decimal.js';
import { AppError } from '../../shared/errors/AppError.js';

export async function findSkuAlternatives(sku: string) {
  const request = (await getPool()).request();
  request.input('sku', sql.NVarChar(40), sku);
  const result = await request.query(
    `SELECT target.producto_id, target.variante_id, target.sku, target.talla, target.color, target.stock,
            target.stock_minimo, target.precio_venta, target.color_textura, target.nombre, target.marca,
            target.categorySlug, candidate.variante_id AS candidate_variante_id, candidate.sku AS candidate_sku,
            candidate.talla AS candidate_talla, candidate.color AS candidate_color, candidate.stock AS candidate_stock,
            candidate.stock_minimo AS candidate_stock_minimo, candidate.precio_venta AS candidate_precio_venta,
            candidate.color_textura AS candidate_color_textura, candidate.nombre AS candidate_nombre,
            candidate.marca AS candidate_marca, candidate.categorySlug AS candidate_category_slug,
            candidate.producto_id AS candidate_producto_id
     FROM (
       SELECT p.producto_id, pv.variante_id, pv.sku, pv.talla, pv.color, pv.stock, pv.stock_minimo,
              pv.precio_venta, pv.color_textura, p.nombre, p.marca, c.slug AS categorySlug
       FROM dbo.Producto p JOIN dbo.ProductoVariante pv ON pv.producto_id = p.producto_id
       JOIN dbo.Categoria c ON c.categoria_id = p.categoria_id
       WHERE pv.sku = @sku AND pv.activo = 1 AND p.activo = 1
     ) target
     LEFT JOIN (
       SELECT p.producto_id, pv.variante_id, pv.sku, pv.talla, pv.color, pv.stock, pv.stock_minimo,
              pv.precio_venta, pv.color_textura, p.nombre, p.marca, c.slug AS categorySlug
       FROM dbo.Producto p JOIN dbo.ProductoVariante pv ON pv.producto_id = p.producto_id
       JOIN dbo.Categoria c ON c.categoria_id = p.categoria_id
       WHERE pv.activo = 1 AND p.activo = 1 AND pv.stock > 0
     ) candidate ON candidate.sku <> target.sku
     ORDER BY CASE WHEN candidate.producto_id = target.producto_id AND candidate.color = target.color THEN 0
                   WHEN candidate.producto_id = target.producto_id THEN 1
                   WHEN candidate.categorySlug = target.categorySlug THEN 2 ELSE 3 END,
              CASE WHEN candidate.talla = target.talla THEN 0 ELSE 1 END,
              candidate.variante_id`
  );
  return result.recordset;
}

export async function createPosOrder(input: {
  employeeId: number;
  roleName: string;
  customerDoc: string;
  items: Array<{ sku: string; cantidad: number }>;
  discountPct: number;
}) {
  return withTransaction(async (tx) => {
    const customerRequest = new sql.Request(tx);
    customerRequest.input('document', sql.NVarChar(11), input.customerDoc);
    const customerResult = await customerRequest.query<{ cliente_id: number; nombres: string }>(
      'SELECT cliente_id, nombres FROM dbo.RegistroCliente WITH (UPDLOCK, HOLDLOCK) WHERE dni_ruc = @document'
    );
    const customer = customerResult.recordset[0];
    if (!customer) throw new AppError(422, 'POS_CUSTOMER_NOT_FOUND', 'Registra o selecciona al cliente antes de crear la orden.', 'RN-TRI-02', 'cliente_doc');

    const productsRequest = new sql.Request(tx);
    productsRequest.input('skus', sql.NVarChar(sql.MAX), JSON.stringify(input.items.map((item) => item.sku)));
    const productsResult = await productsRequest.query<{
      variante_id: number; sku: string; nombre: string; talla: string; color: string; precio_venta: number; precio_promo_aplicado: boolean; stock: number;
    }>(`
      SELECT pv.variante_id, pv.sku, p.nombre, pv.talla, pv.color,
             COALESCE(campana.precio_promocional, pv.precio_venta) AS precio_venta,
             CONVERT(bit, CASE WHEN campana.campana_id IS NULL THEN 0 ELSE 1 END) AS precio_promo_aplicado,
             pv.stock
      FROM dbo.ProductoVariante pv WITH (UPDLOCK, HOLDLOCK)
      JOIN dbo.Producto p ON p.producto_id = pv.producto_id AND p.activo = 1
      OUTER APPLY (
        SELECT TOP (1) cm.campana_id, cm.precio_promocional
        FROM dbo.CampanaMarketing cm
        WHERE cm.producto_id = p.producto_id AND cm.activa = 1 AND cm.aprobada_dueno = 1
          AND cm.fecha_inicio <= SYSDATETIME() AND cm.fecha_fin > SYSDATETIME()
          AND cm.stock_consumido < cm.stock_maximo
        ORDER BY cm.fecha_inicio DESC, cm.campana_id DESC
      ) campana
      WHERE pv.activo = 1 AND pv.sku IN (SELECT value FROM OPENJSON(@skus))
    `);
    const products = new Map(productsResult.recordset.map((product) => [product.sku, product]));
    if (products.size !== input.items.length) throw new AppError(404, 'POS_SKU_NOT_FOUND', 'Uno o más SKU no están disponibles.', 'RN-VEN-06', 'items');
    for (const item of input.items) {
      const product = products.get(item.sku)!;
      if (product.stock < item.cantidad) throw new AppError(409, 'POS_STOCK_INSUFFICIENT', `Stock insuficiente para ${item.sku}. Disponible: ${product.stock}.`, 'RN-VEN-06', 'items');
    }

    const lines = input.items.map((item) => {
      const product = products.get(item.sku)!;
      const gross = new Decimal(product.precio_venta).times(item.cantidad).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const discount = gross.times(input.discountPct).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      return { ...item, product, gross, discount, subtotal: gross.minus(discount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP), detail_id: 0 };
    });
    const total = lines.reduce((sum, line) => sum.plus(line.subtotal), new Decimal(0)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const baseTotal = lines.reduce((sum, line) => sum.plus(line.gross), new Decimal(0)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const pedidoRequest = new sql.Request(tx);
    pedidoRequest.input('employee', sql.Int, input.employeeId);
    pedidoRequest.input('total', sql.Decimal(12, 2), total.toNumber());
    const pedido = await pedidoRequest.query<{ pedido_id: number }>(`
      INSERT dbo.Pedido (tipo_pedido, estado, total, empleado_id)
      OUTPUT INSERTED.pedido_id
      VALUES ('C', N'pendiente_cobro', @total, @employee)
    `);
    const orderId = pedido.recordset[0].pedido_id;
    const clientOrderRequest = new sql.Request(tx);
    clientOrderRequest.input('orderId', sql.Int, orderId);
    clientOrderRequest.input('customerId', sql.Int, customer.cliente_id);
    clientOrderRequest.input('discountPct', sql.Decimal(5, 2), input.discountPct);
    await clientOrderRequest.query(`
      INSERT dbo.PedidoCliente (pedido_id, cliente_id, canal_venta, modalidad_entrega, descuento_porcentaje)
      VALUES (@orderId, @customerId, N'Tienda', N'Retiro en tienda', @discountPct)
    `);
    for (const line of lines) {
      const detailRequest = new sql.Request(tx);
      detailRequest.input('orderId', sql.Int, orderId);
      detailRequest.input('variantId', sql.Int, line.product.variante_id);
      detailRequest.input('quantity', sql.Int, line.cantidad);
      detailRequest.input('price', sql.Decimal(10, 2), line.product.precio_venta);
      detailRequest.input('discount', sql.Decimal(10, 2), line.discount.toNumber());
      const detailResult = await detailRequest.query<{ detalle_id: number }>(`
        DECLARE @details TABLE (detalle_id INT);
        INSERT dbo.DetallePedido (pedido_id, variante_id, tipo_detalle, cantidad, precio_unitario)
        OUTPUT INSERTED.detalle_id INTO @details VALUES (@orderId, @variantId, 'C', @quantity, @price);
        INSERT dbo.DetallePedidoCliente (detalle_id, descuento_linea)
        SELECT detalle_id, @discount FROM @details;
        SELECT detalle_id FROM @details;
      `);
      line.detail_id = detailResult.recordset[0].detalle_id;
    }
    const auditRequest = new sql.Request(tx);
    auditRequest.input('employee', sql.Int, input.employeeId);
    auditRequest.input('roleName', sql.NVarChar(30), input.roleName);
    auditRequest.input('orderId', sql.NVarChar(50), String(orderId));
    auditRequest.input('detail', sql.NVarChar(sql.MAX), JSON.stringify({ cliente_id: customer.cliente_id, total: total.toNumber(), baseTotal: baseTotal.toNumber(), items: lines.map(({ sku, cantidad }) => ({ sku, cantidad })) }));
    await auditRequest.query(`
      INSERT dbo.AuditLog (empleado_id, rol_usuario, tabla_afectada, accion, registro_id, detalle)
      VALUES (@employee, @roleName, N'Pedido', N'CREAR', @orderId, @detail)
    `);
    return { orderId, total: total.toNumber(), baseTotal: baseTotal.toNumber(), customerName: customer.nombres, lines };
  });
}
