/**
 * Password Hashing Service Interface
 * Abstraction for password hashing operations
 */
export interface PasswordHashingService {
  /**
   * Hash a plain text password
   */
  hash(password: string): Promise<string>;

  /**
   * Verify a password against a hash
   */
  verify(hash: string, password: string): Promise<boolean>;
}
