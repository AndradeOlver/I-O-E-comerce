import { z } from 'zod';

export const createPosOrderSchema = z.object({
  cliente_referencia: z.string().trim().max(140).optional().default(''),
  cliente_doc: z.string().trim().regex(/^\d{8}(\d{3})?$/),
  cliente_razon_social: z.string().trim().max(150).optional().default(''),
  items: z.array(z.object({ sku: z.string().trim().min(1).max(40), cantidad: z.number().int().positive() })).min(1),
  descuento_pct: z.number().min(0).max(10),
  descuento_autorizado: z.boolean(),
  autorizacion_admin_id: z.number().int().positive().optional(),
  tipo_comprobante: z.enum(['Boleta', 'Factura']),
  metodo_pago_solicitado: z.enum(['efectivo', 'tarjeta', 'yape_plin', 'transferencia']).optional()
});
