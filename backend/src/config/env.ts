import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(28800),
  DB_SERVER: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_NAME: z.string().default('IO_Ecommerce'),
  DB_USER: z.string().default('sa'),
  DB_PASSWORD: z.string().default(''),
  DB_ENCRYPT: z.string().default('false'),
  DB_TRUST_SERVER_CERTIFICATE: z.string().default('true')
});

export const env = envSchema.parse(process.env);
