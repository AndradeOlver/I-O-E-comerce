export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly ruleCode?: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BusinessRuleError extends AppError {
  constructor(ruleCode: string, errorCode: string, message: string, statusCode = 422, field?: string) {
    super(statusCode, errorCode, message, ruleCode, field);
    this.name = 'BusinessRuleError';
  }
}
