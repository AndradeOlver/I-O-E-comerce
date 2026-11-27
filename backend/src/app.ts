import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { getPool } from './config/db.js';
import { errorHandler } from './shared/middlewares/error.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogoRoutes } from './modules/catalogo/catalogo.routes.js';
import { posRoutes } from './modules/m01-ventas-pos/pos.routes.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', async (_req, res) => {
  try {
    await getPool();
    res.json({ ok: true, status: 'healthy', service: 'io-omnicanal-backend', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: true, status: 'degraded', service: 'io-omnicanal-backend', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});
app.get('/api/config/empresa', (_req, res) => res.json({ ok: true, empresa: {
  razon_social: 'I&O MODA RETAIL S.A.C.', ruc: '20609988771', direccion_fiscal: 'Av. Larco 450, Miraflores, Lima, Perú', tarifa_envio_urbano: 10, umbral_envio_gratis: 150, dias_cambio_tienda: 7, umbral_stock_bajo: 5, plazo_max_prestamo_dias: 7, descuento_max_pos_pct: 10, igv_pct: 18, ttl_reserva_carrito_min: 15, max_reintentos_pago: 3, max_intentos_envio: 2
} }));
app.use('/api/auth', authRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/pos', posRoutes);
app.use(errorHandler);
