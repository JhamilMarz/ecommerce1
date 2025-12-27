import { UserRepository } from '../../domain/repositories/user-repository';

export interface GetCurrentUserInput {
  userId: string;
}

export interface GetCurrentUserOutput {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Get Current User Use Case
 * Retrieves authenticated user information
 */
export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
