/**
 * 小程序端运行时配置。Taro 在构建时会把 `process.env.NODE_ENV` 替换为字面量，
 * 所以可以用它做 dev / prod 分支。
 *
 * - 本地联调：使用 `pnpm dev:weapp`，NODE_ENV=development，会指向 `DEV_API_BASE`。
 *   需要在微信开发者工具「详情 → 本地设置」中勾选「不校验合法域名」才能访问 localhost。
 * - 正式上线：使用 `pnpm build:weapp`，NODE_ENV=production。必须先把下方 PROD_API_BASE
 *   改成真实线上 HTTPS 域名，并在微信公众平台把该域名加入 request 合法域名白名单。
 */

const DEV_API_BASE = 'http://localhost:3000/api/v1'

// TODO(launch): 正式上线前把下面的占位域名改成真实生产地址，然后删掉这个 throw。
// 保留 throw 是为了避免误把占位地址打进生产包（历史上就出过 net::ERR_CONNECTION_CLOSED 的事故）。
const PROD_API_BASE = 'https://api.momoya.example.com/api/v1'

function resolveApiBase(): string {
  if (process.env.NODE_ENV !== 'production') return DEV_API_BASE
  if (PROD_API_BASE.includes('example.com')) {
    throw new Error(
      '[momoya config] PROD_API_BASE 仍是占位域名，请先在 apps/mobile/src/config/index.ts 改成真实线上地址。',
    )
  }
  return PROD_API_BASE
}

export const API_BASE_URL = resolveApiBase()

export const REQUEST_TIMEOUT_MS = 10_000
