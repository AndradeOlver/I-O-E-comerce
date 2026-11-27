import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

export type RoleCode = 'TN01' | 'TN02' | 'TN03' | 'TN04' | 'TN05' | 'AN01';
export type AuthUser = { id: number; rolCodigo: RoleCode; rol_rbac: string; displayName: string; email: string; destination: string; opt_in_marketing?: boolean };
declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export function signToken(user: AuthUser): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + env.JWT_TTL_SECONDS * 1000;
  const token = jwt.sign(user, env.JWT_SECRET, { expiresIn: env.JWT_TTL_SECONDS });
  return { token, expiresAt };
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.', 'RN-SEG-01'));
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'La sesión no es válida o expiró.', 'RN-SEG-01'));
  }
}

export function requireRole(...roles: RoleCode[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rolCodigo)) return next(new AppError(403, 'RBAC_FORBIDDEN', 'No tienes permisos para esta operación.', 'RN-SEG-01'));
    next();
  };
}
