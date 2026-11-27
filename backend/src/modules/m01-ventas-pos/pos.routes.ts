import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { createOrder, getAlternatives } from './pos.controller.js';

export const posRoutes = Router();
posRoutes.get('/inventario/:sku/alternativas', authenticate, requireRole('TN01', 'TN02', 'TN03', 'TN04', 'TN05'), getAlternatives);
posRoutes.post('/ordenes', authenticate, requireRole('TN01', 'TN02'), createOrder);
