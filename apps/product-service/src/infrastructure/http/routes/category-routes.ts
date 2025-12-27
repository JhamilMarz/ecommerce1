import { Router } from 'express';
import { CategoryController } from '../controllers/category-controller';
import { jwtValidation } from '../middleware/jwt-validation';
import { requireRole } from '../middleware/rbac';

export function createCategoryRoutes(controller: CategoryController): Router {
  const router = Router();

  // Public routes (read-only for authenticated users)
  router.get('/', jwtValidation, controller.list);

  // Admin-only routes
  router.post('/', jwtValidation, requireRole('admin'), controller.create);

  return router;
}
