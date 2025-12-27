import Joi from 'joi';
import { UserRole } from '../../domain/entities/user';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Must be a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .messages({
      'any.only': `Role must be one of: ${Object.values(UserRole).join(', ')}`,
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Must be a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

export const logoutSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
  logoutAll: Joi.boolean().optional(),
});
