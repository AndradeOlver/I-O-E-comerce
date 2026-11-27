import { z } from 'zod';

export const loginSchema = z.object({ email: z.string().email().max(120), password: z.string().min(6).max(72) });
export const registerSchema = z.object({
  nombres: z.string().trim().min(3).max(140),
  email: z.string().email().max(120),
  password: z.string().min(6).max(72),
  dni_ruc: z.string().regex(/^(\d{8}|\d{11})$/).optional(),
  telefono: z.string().regex(/^\d{7,9}$/).optional(),
  direccion: z.string().max(250).optional(),
  opt_in_marketing: z.boolean().default(false)
});
