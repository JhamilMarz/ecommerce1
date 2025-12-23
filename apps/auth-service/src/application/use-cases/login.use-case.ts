import { UserRepository } from '../../domain/repositories/user.repository'
import { LoginDto, LoginResultDto } from '../dtos/login.dto'
import { PasswordService } from '../../infrastructure/services/password.service'
import { TokenService } from '../../infrastructure/services/token.service'
import { UnauthorizedError } from '../../infrastructure/errors/unauthorized.error'

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService
  ) {}

  async execute(dto: LoginDto): Promise<LoginResultDto> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email)
    if (!user) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await this.passwordService.compare(dto.password, user.passwordHash)
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const refreshToken = this.tokenService.generateRefreshToken({
      userId: user.id,
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }
  }
}
