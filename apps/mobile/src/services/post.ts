import type {
  CreatePostInputDto,
  EvaluationDto,
  ListPostsQueryDto,
  MarkReadResultDto,
  PostActionResultDto,
  PostDto,
  PostListDto,
  UpdatePostInputDto,
  UpsertEvaluationInputDto,
} from '@momoya/shared'
import { api } from './request'

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const entries: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    entries.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  }
  return entries.length ? `?${entries.join('&')}` : ''
}

export const postApi = {
  list(query: ListPostsQueryDto) {
    const qs = buildQuery({
      type: query.type,
      filter: query.filter,
      cursor: query.cursor,
      limit: query.limit,
    })
    return api.get<PostListDto>(`/posts${qs}`)
  },
  detail(id: string) {
    return api.get<PostDto>(`/posts/${id}`)
  },
  create(input: CreatePostInputDto) {
    return api.post<PostDto>('/posts', input)
  },
  update(id: string, input: UpdatePostInputDto) {
    return api.patch<PostDto>(`/posts/${id}`, input)
  },
  remove(id: string) {
    return api.delete<PostActionResultDto>(`/posts/${id}`)
  },
  markRead(id: string) {
    return api.post<MarkReadResultDto>(`/posts/${id}/read`, {})
  },
  upsertEvaluation(id: string, input: UpsertEvaluationInputDto) {
    return api.put<EvaluationDto>(`/posts/${id}/evaluation`, input)
  },
}
