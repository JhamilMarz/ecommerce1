import { UserRepository } from '../../domain/repositories/user.repository'
import { UserRole } from '../../domain/entities/user.entity'
import { RegisterDto, RegisterResultDto } from '../dtos/register.dto'
import { PasswordService } from '../../infrastructure/services/password.service'
import { ConflictError } from '../../infrastructure/errors/conflict.error'

export class RegisterUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService
  ) {}

  async execute(dto: RegisterDto): Promise<RegisterResultDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email)
    if (existingUser) {
      throw new ConflictError('User already exists')
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password)

    // Create user
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      role: (dto.role as UserRole) || UserRole.CUSTOMER,
    })

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }
  }
}
