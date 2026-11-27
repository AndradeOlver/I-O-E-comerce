import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { mapSqlError } from '../errors/sqlErrorMapper.js';
import { logger } from '../../config/logger.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    res.status(400).json({ ok: false, ruleCode: 'RN-ACC-03', error: 'VALIDATION_ERROR', message: first?.message ?? 'Revisa los datos ingresados.', field: first?.path.join('.') });
    return;
  }
  const mapped = mapSqlError(error);
  if (mapped) {
    res.status(mapped.statusCode).json({ ok: false, ruleCode: mapped.ruleCode, error: mapped.errorCode, message: mapped.message, field: mapped.field });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ ok: false, ruleCode: error.ruleCode, error: error.errorCode, message: error.message, field: error.field });
    return;
  }
  logger.error('Unhandled request error', { message: error instanceof Error ? error.message : 'Unknown error' });
  res.status(500).json({ ok: false, error: 'INTERNAL_SERVER_ERROR', message: 'Ocurrió un error interno.' });
};
