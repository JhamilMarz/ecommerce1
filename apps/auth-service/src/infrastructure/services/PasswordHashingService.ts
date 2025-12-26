import argon2 from 'argon2';
import { IPasswordHashingService } from '../../application/interfaces/IPasswordHashingService';

/**
 * Password Hashing Service Implementation using Argon2
 * Argon2 is the winner of the Password Hashing Competition and recommended by OWASP
 */
export class PasswordHashingService implements IPasswordHashingService {
  private readonly options = {
    type: argon2.argon2id, // Argon2id (hybrid of Argon2i and Argon2d)
    memoryCost: 65536, // 64 MB
    timeCost: 3, // Number of iterations
    parallelism: 4, // Number of threads
  };

  async hash(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.options);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      // If verification fails, return false instead of throwing
      // This prevents timing attacks
      return false;
    }
  }
}
