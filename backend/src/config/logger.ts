type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...context });
  if (level === 'error') process.stderr.write(`${entry}\n`);
  else process.stdout.write(`${entry}\n`);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context)
};
