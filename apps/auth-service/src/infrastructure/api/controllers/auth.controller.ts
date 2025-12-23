import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'

import { LoginUseCase } from '../../../application/use-cases/login.use-case'
import { RegisterUseCase } from '../../../application/use-cases/register.use-case'
import { PasswordService } from '../../services/password.service'
import { TokenService } from '../../services/token.service'
import { PostgresUserRepository } from '../../database/repositories/postgres-user.repository'

export const router: Router = Router()

// Initialize dependencies (in real app, use DI container)
const userRepository = new PostgresUserRepository()
const passwordService = new PasswordService()
const tokenService = new TokenService()

const loginUseCase = new LoginUseCase(userRepository, passwordService, tokenService)
const registerUseCase = new RegisterUseCase(userRepository, passwordService)

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['customer', 'seller', 'admin']).optional(),
})

// POST /login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = LoginSchema.parse(req.body)
    const result = await loginUseCase.execute(dto)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// POST /register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = RegisterSchema.parse(req.body)
    const result = await registerUseCase.execute(dto)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

export default router
