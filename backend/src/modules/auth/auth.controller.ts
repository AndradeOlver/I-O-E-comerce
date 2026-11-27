import type { Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema } from './auth.schema.js';
import * as service from './auth.service.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await service.login(loginSchema.parse(req.body))); } catch (error) { next(error); }
}
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json(await service.register(registerSchema.parse(req.body))); } catch (error) { next(error); }
}
export function me(req: Request, res: Response): void { res.json({ ok: true, user: req.user }); }
export function logout(_req: Request, res: Response): void { res.json({ ok: true }); }
