import type {
  CreateMomentInputDto,
  MomentActionResultDto,
  MomentDto,
  MomentListDto,
} from '@momoya/shared'
import { api } from './request'

export const momentApi = {
  list(cursor?: string | null, limit = 20) {
    const params: string[] = []
    if (cursor) params.push(`cursor=${encodeURIComponent(cursor)}`)
    if (limit) params.push(`limit=${limit}`)
    const qs = params.length ? `?${params.join('&')}` : ''
    return api.get<MomentListDto>(`/moments${qs}`)
  },
  create(input: CreateMomentInputDto) {
    return api.post<MomentDto>('/moments', input)
  },
  remove(id: string) {
    return api.delete<MomentActionResultDto>(`/moments/${id}`)
  },
}
