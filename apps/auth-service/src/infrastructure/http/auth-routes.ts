import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth-controller';
import { validateRequest } from '../middleware/validate-request';
import { registerSchema, loginSchema, refreshTokenSchema, logoutSchema } from './auth-schemas';
import { config } from '../config';

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  // Public endpoints
  router.post(
    '/register',
    authLimiter,
    validateRequest(registerSchema),
    (req, res, next) => authController.register(req, res, next)
  );

  router.post(
    '/login',
    authLimiter,
    validateRequest(loginSchema),
    (req, res, next) => authController.login(req, res, next)
  );

  router.post(
    '/refresh',
    authLimiter,
    validateRequest(refreshTokenSchema),
    (req, res, next) => authController.refresh(req, res, next)
  );

  // Protected endpoints (require authentication - to be added by API Gateway)
  router.post(
    '/logout',
    validateRequest(logoutSchema),
    (req, res, next) => authController.logout(req, res, next)
  );

  router.get('/me', (req, res, next) => authController.me(req, res, next));

  return router;
}
