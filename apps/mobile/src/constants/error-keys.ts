/**
 * 后端 errorKey 枚举的镜像。与 apps/server/src/common/constants/error-keys.ts 保持一致。
 * 前端据 errorKey 做特定跳转 / toast 文案。
 */
export const ErrorKey = {
  E_VALIDATION: 'E_VALIDATION',
  E_AUTH_INVALID: 'E_AUTH_INVALID',
  E_AUTH_REQUIRED: 'E_AUTH_REQUIRED',
  E_AUTH_EXPIRED: 'E_AUTH_EXPIRED',
  E_SESSION_KICKED: 'E_SESSION_KICKED',
  E_AUTH_WRONG_OLD_PASSWORD: 'E_AUTH_WRONG_OLD_PASSWORD',
  E_FORBIDDEN: 'E_FORBIDDEN',
  E_NOT_FOUND: 'E_NOT_FOUND',
  E_CONFLICT: 'E_CONFLICT',
  E_RATE_LIMIT: 'E_RATE_LIMIT',
  E_INTERNAL: 'E_INTERNAL',
} as const

export type ErrorKeyType = (typeof ErrorKey)[keyof typeof ErrorKey]

/** 是否表示会话不可恢复（必须重新登录）。 */
export function isSessionFatal(errorKey?: string): boolean {
  return (
    errorKey === ErrorKey.E_AUTH_INVALID ||
    errorKey === ErrorKey.E_AUTH_REQUIRED ||
    errorKey === ErrorKey.E_SESSION_KICKED
  )
}
