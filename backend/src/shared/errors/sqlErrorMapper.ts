import { AppError, BusinessRuleError } from './AppError.js';

export function mapSqlError(error: unknown): AppError | undefined {
  if (error instanceof AppError) return error;
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { number?: number; message?: string; originalError?: { info?: { message?: string } } };
  const message = candidate.originalError?.info?.message ?? candidate.message ?? '';
  if (candidate.number === 2627 || candidate.number === 2601) {
    return new BusinessRuleError('RN-INV-01', 'DUPLICATE_RESOURCE', 'El registro ya existe.', 409);
  }
  if (candidate.number === 547) {
    return new BusinessRuleError('RN-VEN-06', 'DOMAIN_CONSTRAINT_VIOLATION', 'Los datos no cumplen una regla del negocio.', 422);
  }
  if (candidate.number === 1205) {
    return new BusinessRuleError('RN-VEN-06', 'CONCURRENCY_RETRY', 'La operación tuvo concurrencia. Inténtalo nuevamente.', 503);
  }
  if (candidate.number === 50000) {
    const ruleCode = message.match(/RN-[A-Z]+-\d+/)?.[0] ?? 'RN-SEG-03';
    return new BusinessRuleError(ruleCode, 'BUSINESS_RULE_VIOLATION', 'La operación fue bloqueada por una regla del negocio.', 409);
  }
  return undefined;
}
