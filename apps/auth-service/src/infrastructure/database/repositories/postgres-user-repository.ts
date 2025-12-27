import { User } from '../../../domain/entities/user';
import { UserRepository, CreateUserData } from '../../../domain/repositories/user-repository';
import { UserModel } from '../models/user-model';

/**
 * User Repository Implementation using Sequelize
 */
export class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const userModel = await UserModel.findByPk(id);
    return userModel ? userModel.toDomainEntity() : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userModel = await UserModel.findOne({
      where: { email: email.toLowerCase() },
    });
    return userModel ? userModel.toDomainEntity() : null;
  }

  async create(user: CreateUserData): Promise<User> {
    const userModel = await UserModel.create({
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as any,
      isActive: user.isActive,
    });
    return userModel.toDomainEntity();
  }

  async update(user: User): Promise<User> {
    await UserModel.update(
      {
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
      },
      {
        where: { id: user.id },
      }
    );

    const updatedUser = await this.findById(user.id);
    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    await UserModel.destroy({
      where: { id },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await UserModel.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }
}
