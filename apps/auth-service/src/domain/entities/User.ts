/**
 * User Role enum
 * Defines the roles available in the system
 */
export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

/**
 * User Domain Entity
 * Represents a user in the authentication system
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly role: UserRole,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Factory method to create a new user
   */
  static create(email: string, passwordHash: string, role: UserRole = UserRole.CUSTOMER): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      email,
      passwordHash,
      role,
      isActive: true,
    };
  }

  /**
   * Deactivate user account
   */
  deactivate(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      false,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Check if user is administrator
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
