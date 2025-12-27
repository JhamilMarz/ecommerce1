export interface RegisterDto {
  email: string
  password: string
  role?: string
}

export interface RegisterResultDto {
  id: string
  email: string
  role: string
  createdAt: Date
}
