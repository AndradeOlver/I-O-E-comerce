import * as repository from './pos.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthUser } from '../../shared/middlewares/auth.middleware.js';
import { Decimal } from 'decimal.js';
import { createPosOrderSchema } from './pos.schema.js';

type AlternativeRow = Awaited<ReturnType<typeof repository.findSkuAlternatives>>[number];

function sizeDistance(left: string, right: string): number {
  const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const leftIndex = sizes.indexOf(left.trim().toUpperCase());
  const rightIndex = sizes.indexOf(right.trim().toUpperCase());
  if (leftIndex >= 0 && rightIndex >= 0) return Math.abs(leftIndex - rightIndex);
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) ? Math.abs(leftNumber - rightNumber) : 99;
}

function inventoryItem(row: AlternativeRow, candidate = false) {
  const prefix = candidate ? 'candidate_' : '';
  return {
    producto_id: candidate ? row.candidate_producto_id : row.producto_id,
    variante_id: candidate ? row.candidate_variante_id : row.variante_id,
    groupId: String(candidate ? row.candidate_producto_id : row.producto_id),
    sku: candidate ? row.candidate_sku : row.sku,
    nombre: candidate ? row.candidate_nombre : row.nombre,
    marca: candidate ? row.candidate_marca : row.marca,
    categorySlug: candidate ? row.candidate_category_slug : row.categorySlug,
    talla: candidate ? row.candidate_talla : row.talla,
    color: candidate ? row.candidate_color : row.color,
    colorHex: '#8C817A',
    color_textura: candidate ? row.candidate_color_textura : row.color_textura,
    precio_venta: Number(candidate ? row.candidate_precio_venta : row.precio_venta),
    stock: candidate ? row.candidate_stock : row.stock,
    stock_minimo: candidate ? row.candidate_stock_minimo : row.stock_minimo
  };
}

export async function getAlternatives(sku: string) {
  const rows = await repository.findSkuAlternatives(sku);
  if (!rows.length) throw new AppError(404, 'SKU_NOT_FOUND', 'No se encontró el SKU solicitado.', 'RN-VEN-02');
  const target = inventoryItem(rows[0]);
  const candidates = rows.filter((row) => row.candidate_sku).map((row) => ({
    row,
    item: inventoryItem(row, true)
  }));
  const used = new Set<string>();
  const alternativas: Array<{ motivo: string; item: ReturnType<typeof inventoryItem> }> = [];
  const append = (items: typeof candidates, motivo: (item: ReturnType<typeof inventoryItem>) => string) => {
    for (const candidate of items) {
      if (used.has(candidate.item.sku)) continue;
      alternativas.push({ motivo: motivo(candidate.item), item: candidate.item });
      used.add(candidate.item.sku);
    }
  };
  const bySize = (left: typeof candidates[number], right: typeof candidates[number]) =>
    sizeDistance(left.item.talla, target.talla) - sizeDistance(right.item.talla, target.talla);
  append(candidates.filter(({ item }) => item.groupId === target.groupId && item.color === target.color).sort(bySize), () => 'Talla similar disponible');
  append(candidates.filter(({ item }) => item.groupId === target.groupId).sort(bySize), (item) =>
    item.talla.trim().toUpperCase() === target.talla.trim().toUpperCase() ? 'Misma talla en otro color' : 'Otro color disponible'
  );
  append(candidates.filter(({ item }) => item.categorySlug === target.categorySlug).sort(bySize).slice(0, 4), () => 'Prenda similar disponible');
  return { ok: true, sku, disponible: target.stock > 0, stock: target.stock, alternativas };
}

export async function createOrder(payload: unknown, user: AuthUser) {
  const parsed = createPosOrderSchema.safeParse(payload);
  if (!parsed.success) throw new AppError(400, 'INVALID_REQUEST', 'Revisa los datos de la orden y los SKU ingresados.', 'RN-VEN-06', parsed.error.issues[0]?.path.join('.'));
  const body = parsed.data;
  const discountPct = body.descuento_pct;
  const receipt = body.tipo_comprobante;
  const customerDoc = body.cliente_doc;
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 10) {
    throw new AppError(422, 'DISCOUNT_LIMIT', 'El descuento permitido está entre 0% y 10%.', 'RN-VEN-03', 'descuento_pct');
  }
  if (discountPct > 0 && (user.rolCodigo !== 'TN01' || body.descuento_autorizado !== true || Number(body.autorizacion_admin_id) !== user.id)) {
    throw new AppError(403, 'DISCOUNT_AUTHORIZATION_REQUIRED', 'El descuento requiere autorización autenticada de un Administrador.', 'RN-VEN-03', 'descuento_autorizado');
  }
  if (receipt !== 'Boleta' && receipt !== 'Factura') throw new AppError(422, 'RECEIPT_TYPE_INVALID', 'Selecciona Boleta o Factura.', 'RN-TRI-02', 'tipo_comprobante');
  if (receipt === 'Factura' && (!/^\d{11}$/.test(customerDoc) || !body.cliente_razon_social.trim())) {
    throw new AppError(422, 'INVOICE_DATA_REQUIRED', 'La Factura requiere RUC de 11 dígitos y razón social.', 'RN-TRI-02', 'cliente_doc');
  }
  const cleanItems = body.items;
  if (new Set(cleanItems.map((item) => item.sku)).size !== cleanItems.length) throw new AppError(422, 'DUPLICATE_SKU', 'Consolida las cantidades de SKU repetidos antes de enviar la orden.', 'RN-VEN-06', 'items');
  const roleName = user.rolCodigo === 'TN01' ? 'Administrador' : 'Vendedor';
  const created = await repository.createPosOrder({ employeeId: user.id, roleName, customerDoc, items: cleanItems, discountPct });
  const opGravada = new Decimal(created.total).div(1.18).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  const igv = new Decimal(created.total).minus(opGravada).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  return {
    ok: true,
    order: {
      pedido_id: created.orderId,
      code: `POS-${String(created.orderId).padStart(8, '0')}`,
      status: 'pendiente_cobro',
      vendedor_nombre: user.displayName,
      cliente_referencia: body.cliente_referencia || created.customerName,
      tipo_comprobante: receipt,
      cliente_doc: customerDoc,
      cliente_razon_social: receipt === 'Factura' ? body.cliente_razon_social : null,
      metodo_pago_solicitado: body.metodo_pago_solicitado ?? null,
      descuento_pct: discountPct,
      descuento_autorizado: discountPct > 0,
      op_gravada: opGravada,
      igv,
      total: created.total,
      monto_pagado: 0,
      saldo_pendiente: created.total,
      items: created.lines.map((line) => ({
        detalle_id: line.detail_id,
        variante_id: line.product.variante_id,
        sku: line.sku,
        nombre: line.product.nombre,
        talla: line.product.talla,
        color: line.product.color,
        cantidad: line.cantidad,
        precio_unitario: Number(line.product.precio_venta),
        precio_promo_aplicado: line.product.precio_promo_aplicado,
        descuento_linea: line.discount.toNumber(),
        subtotal: line.subtotal.toNumber()
      })),
      created_at: new Date().toISOString()
    }
  };
}
