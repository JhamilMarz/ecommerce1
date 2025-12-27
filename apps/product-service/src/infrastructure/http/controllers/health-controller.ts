import { Request, Response } from 'express';
import { sequelize } from '../../database/connection';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'product-service',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'product-service',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
