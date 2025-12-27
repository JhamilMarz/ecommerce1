import { Router } from 'express';
import { ProductController } from '../controllers/product-controller';
import { jwtValidation } from '../middleware/jwt-validation';
import { requireRole } from '../middleware/rbac';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  // Public routes (read-only for authenticated users)
  router.get('/', jwtValidation, controller.list);
  router.get('/:id', jwtValidation, controller.getById);

  // Admin-only routes
  router.post('/', jwtValidation, requireRole('admin'), controller.create);
  router.put('/:id', jwtValidation, requireRole('admin'), controller.update);
  router.delete('/:id', jwtValidation, requireRole('admin'), controller.delete);

  return router;
}
