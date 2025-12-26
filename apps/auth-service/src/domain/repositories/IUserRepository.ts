import { User } from '../entities/User';

/**
 * User Repository Interface
 * Defines the contract for user persistence operations
 */
export interface IUserRepository {
  /**
   * Find a user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Create a new user
   */
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;

  /**
   * Update an existing user
   */
  update(user: User): Promise<User>;

  /**
   * Delete a user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if email already exists
   */
  emailExists(email: string): Promise<boolean>;
}
