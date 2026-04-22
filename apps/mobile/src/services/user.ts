import { api } from './request'
import type { MeDto } from '../types/auth'
import type { UpdateMeInput } from '../types/upload'

export const userApi = {
  updateMe: (input: UpdateMeInput) => api.patch<MeDto>('/users/me', input),
}
