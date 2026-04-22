import { api } from './request'
import type {
  ChangePasswordInput,
  ChangePasswordResult,
  LoginInput,
  LoginResult,
  LogoutResult,
  MeDto,
} from '../types/auth'

export const authApi = {
  login: (input: LoginInput) =>
    api.post<LoginResult>('/auth/login', input, { skipAuth: true }),

  getMe: () => api.get<MeDto>('/auth/me'),

  changePassword: (input: ChangePasswordInput) =>
    api.post<ChangePasswordResult>('/auth/change-password', input),

  logout: () => api.post<LogoutResult>('/auth/logout'),
}
