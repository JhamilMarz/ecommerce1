export interface LoginDto {
  email: string
  password: string
}

export interface LoginResultDto {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: string
  }
}
