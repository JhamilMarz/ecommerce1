import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  CreateOrderUseCase,
  GetOrderUseCase,
  ListUserOrdersUseCase,
  UpdateOrderStatusUseCase,
  GetOrderHistoryUseCase,
} from '@/application/use-cases';
import { logger } from '@/infrastructure/observability/logger';

/**
 * Order Controller
 * 
 * Architecture: Infrastructure Layer - HTTP
 * Handles HTTP requests for order endpoints
 */
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly listUserOrdersUseCase: ListUserOrdersUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly getOrderHistoryUseCase: GetOrderHistoryUseCase,
  ) {}

  /**
   * POST /orders
   * Create a new order
   */
  createOrder = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const correlationId = req.headers['x-correlation-id'] as string;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto = {
        userId,
        items: req.body.items,
        correlationId,
      };

      logger.info('Creating order', { userId, correlationId });

      const order = await this.createOrderUseCase.execute(dto);

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders/:id
   * Get order by ID
   */
  getOrder = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const orderId = req.params.id;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      logger.info('Getting order', { orderId, userId, isAdmin });

      const order = await this.getOrderUseCase.execute(
        orderId,
        userId,
        isAdmin,
      );

      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders/user/:userId
   * List orders for a user (paginated)
   */
  listUserOrders = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const targetUserId = req.params.userId;
      const requestingUserId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      if (!requestingUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // RBAC: Users can only list their own orders, admins can list any
      if (!isAdmin && targetUserId !== requestingUserId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only view your own orders',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      logger.info('Listing user orders', { targetUserId, page, limit });

      const result = await this.listUserOrdersUseCase.execute(
        targetUserId,
        page,
        limit,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /orders/:id/status
   * Update order status (admin only)
   */
  updateOrderStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const orderId = req.params.id;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      logger.info('Updating order status', {
        orderId,
        userId,
        isAdmin,
        newStatus: req.body.newStatus,
      });

      const order = await this.updateOrderStatusUseCase.execute(
        orderId,
        req.body,
        userId,
        isAdmin,
      );

      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders/:id/history
   * Get order status change history
   */
  getOrderHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const orderId = req.params.id;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // First check if user can access this order
      await this.getOrderUseCase.execute(orderId, userId, isAdmin);

      logger.info('Getting order history', { orderId, userId });

      const history = await this.getOrderHistoryUseCase.execute(orderId);

      res.status(200).json(history);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /health
   * Health check endpoint
   */
  healthCheck = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Could add database health check here
      res.status(200).json({
        status: 'healthy',
        service: 'order-service',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
