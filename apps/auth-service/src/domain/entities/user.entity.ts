export interface User {
  id: string
  email: string
  passwordHash: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

export interface UserProps {
  id: string
  email: string
  passwordHash: string
  role: UserRole
  createdAt?: Date
  updatedAt?: Date
}
