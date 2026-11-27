import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { login, logout, me, register } from './auth.controller.js';

export const authRoutes = Router();
authRoutes.post('/login', login);
authRoutes.post('/register', register);
authRoutes.get('/me', authenticate, me);
authRoutes.post('/logout', authenticate, logout);
