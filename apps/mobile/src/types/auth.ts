export interface MeDto {
  id: string
  username: string
  nickname: string
  avatar: string
  bio: string
  partnerId: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number
  refreshExpiresIn: number
}

export interface LoginResult extends TokenPair {
  user: MeDto
}

export interface ChangePasswordResult extends TokenPair {
  ok: boolean
}

export interface LogoutResult {
  ok: boolean
}

export interface LoginInput {
  username: string
  password: string
}

export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
}
