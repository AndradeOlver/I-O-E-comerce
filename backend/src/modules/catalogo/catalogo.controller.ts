import type { Request, Response, NextFunction } from 'express';
import * as service from './catalogo.service.js';

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, items: await service.getProducts(req.query) }); } catch (error) { next(error); }
}
export async function getTaxonomy(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, ...await service.getTaxonomy() }); } catch (error) { next(error); }
}
export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, items: await service.getInventory(req.query) }); } catch (error) { next(error); }
}
