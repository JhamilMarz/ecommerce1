import { RefreshTokenRepository } from '../../domain/repositories/refresh-token-repository';
import { EventPublisher } from '../interfaces/event-publisher';

export interface LogoutUserInput {
  userId: string;
  refreshToken: string;
  logoutAll?: boolean; // Logout from all devices
}

/**
 * Logout User Use Case
 * Handles user logout by revoking refresh tokens
 */
export class LogoutUserUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(input: LogoutUserInput): Promise<void> {
    if (input.logoutAll) {
      // Revoke all tokens for this user (logout from all devices)
      await this.refreshTokenRepository.revokeAllByUserId(input.userId);

      await this.eventPublisher.publish('auth.events', 'user.logged_out_all', {
        userId: input.userId,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Revoke only the provided refresh token (logout from current device)
      await this.refreshTokenRepository.revoke(input.refreshToken);

      await this.eventPublisher.publish('auth.events', 'user.logged_out', {
        userId: input.userId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
