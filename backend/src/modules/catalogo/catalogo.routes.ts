import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { getInventory, getProducts, getTaxonomy } from './catalogo.controller.js';

export const catalogoRoutes = Router();
catalogoRoutes.get('/productos', getProducts);
catalogoRoutes.get('/taxonomia', getTaxonomy);
catalogoRoutes.get('/inventario', authenticate, requireRole('TN01', 'TN02', 'TN03', 'TN04', 'TN05'), getInventory);
