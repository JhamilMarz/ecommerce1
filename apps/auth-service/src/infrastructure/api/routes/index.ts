import { Express } from 'express'

import authController from '../controllers/auth.controller'

export function setupRoutes(app: Express): void {
  app.use('/auth', authController)
}
