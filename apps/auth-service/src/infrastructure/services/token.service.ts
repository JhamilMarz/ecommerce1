import jwt from 'jsonwebtoken'

import { config } from '../config'

interface AccessTokenPayload {
  userId: string
  email: string
  role: string
}

interface RefreshTokenPayload {
  userId: string
}

export class TokenService {
  generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiresIn,
    })
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshTokenExpiresIn,
    })
  }

  verifyToken<T>(token: string): T {
    return jwt.verify(token, config.jwt.secret) as T
  }
}
