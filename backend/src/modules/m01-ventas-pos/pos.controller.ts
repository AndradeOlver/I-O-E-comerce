import type { NextFunction, Request, Response } from 'express';
import * as service from './pos.service.js';

export async function getAlternatives(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.getAlternatives(String(req.params.sku)));
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await service.createOrder(req.body, req.user!));
  } catch (error) {
    next(error);
  }
}
