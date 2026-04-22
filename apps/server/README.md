# @momoya/server

momoya 项目的 NestJS 11 服务端。

## 运行环境

- Node.js 20 LTS
- pnpm 10.x（由根仓库的 `packageManager` 字段锁定）
- MongoDB 7.x，本地默认 `mongodb://127.0.0.1:27017/momoya`

## M1 启动步骤

1. 启动本地 MongoDB。推荐用仓库自带的开发 compose：

   ```powershell
   # 在仓库根目录
   pnpm docker:dev:up
   ```

   也可以使用本机 `mongod` 或其他 MongoDB 7 实例。
2. 复制环境变量示例文件：

   ```powershell
   Copy-Item .env.example .env
   ```

3. 在仓库根目录执行一次 `pnpm install`（保证 workspace 依赖齐备）。
4. 启动后端：

   ```powershell
   pnpm dev:server
   ```

   首次启动时 `SeedService` 会自动插入两个初始用户（幂等）：

   | username   | password | 备注                       |
   |------------|----------|----------------------------|
   | jiangjiang | 251212   | 与 mengmeng 互为 partner   |
   | mengmeng   | 251212   | 与 jiangjiang 互为 partner |

   密码以 bcrypt(10) 哈希存储。控制台会打印 `[seed] created initial users: ...` 或 `[seed] users exist, skipped`。

## 健康检查

```
GET http://localhost:3000/api/v1/health
```

响应：

```json
{ "code": 0, "data": { "status": "ok", "mongo": "up" }, "msg": "ok" }
```

## Swagger / Apifox 对接

启动成功后，开发环境下默认挂好：

- Swagger UI：`http://localhost:3000/api/docs`
- OpenAPI JSON：`http://localhost:3000/api/docs-json`

开关由 `SWAGGER_ENABLED` 控制：`NODE_ENV=production` 时**默认关闭**，其他情况默认开启；显式设置 `SWAGGER_ENABLED=true|false` 可覆盖。路径可通过 `SWAGGER_PATH` 自定义（默认 `api/docs`）。

### Apifox 一次性配置

1. 在 Apifox 项目里点左侧 **设置 → 数据管理 → 导入数据**
2. 选择 **OpenAPI / Swagger** → **URL 导入**
3. 填入 `http://localhost:3000/api/docs-json`
4. 勾选 **"自动同步"**（可设置定时任务，例如每 5 分钟），保存

之后服务端只要改动接口定义（Controller / DTO 的 `@Api*` 装饰器），Apifox 会自动拉到最新 schema，无需手工维护接口列表。

### 新增接口时的 Swagger 写法约定

所有接口请按以下样板写，避免 AI / 他人漏装饰器：

```ts
@ApiTags('模块中文名')
@Controller('xxx')
export class XxxController {
  @Post('do-something')
  @ApiOperation({ summary: '操作简述', description: '更详细的行为说明' })
  @ApiBody({ type: DoSomethingDto })
  @ApiOkResponse({ type: ApiResponseOf(DoSomethingResultDto) })
  @ApiBearerAuth('access-token')  // 需要登录态的接口加上
  async do(@Body() dto: DoSomethingDto) { /* ... */ }
}
```

- `ApiResponseOf(DataDto)` 来自 `src/common/dto/api-response.dto.ts`，会把 `{ code, data, msg }` 的统一外壳和 `DataDto` 拼起来。
- DTO 字段用 `@ApiProperty({ example, description, enum, required, nullable })` 描述。
- 登录相关接口用 `@ApiBearerAuth('access-token')`，与 `setup-swagger.ts` 里声明的 security scheme 对应。

## 目录结构

```
src/
├── main.ts                     入口，全局前缀 /api/v1、helmet、全局管道/拦截器/过滤器
├── app.module.ts               Config/Mongoose/Throttler/Winston/业务模块装配
├── common/                     跨模块基础设施
│   ├── constants/error-keys.ts errorKey 与 code 映射
│   ├── dto/                    ApiResponseOf 响应外壳 DTO 工厂
│   ├── interceptors/           统一响应拦截器
│   ├── filters/                HttpException 过滤器
│   ├── swagger/                Swagger 挂载
│   └── utils/                  时长解析等工具
├── config/                     ConfigModule 配置（含 Joi 校验）
├── modules/
│   ├── health/                 健康检查
│   ├── user/                   用户 schema 与基础仓储服务（M1）
│   └── auth/                   登录鉴权（M2）：JWT access+refresh、严格单设备挤占
└── seed/                       OnApplicationBootstrap 种子数据
```

## M2 登录鉴权

鉴权策略：

- **双 Token**：登录下发 `accessToken`（2h） + `refreshToken`（14d），`access/refresh` 使用不同的 secret。
- **严格单设备**：登录/改密时生成新的 `sessionId` 写入 `user.currentSessionId`；所有 token payload 都带 `sid`，请求时比对，不一致即 `E_SESSION_KICKED`（同一账号无法多端在线）。
- **错误语义**：
  - 账号或密码错误 → `E_AUTH_INVALID` (40101)
  - 缺失/非法 access token → `E_AUTH_REQUIRED` (40102)
  - access/refresh 过期 → `E_AUTH_EXPIRED` (40103)
  - 被其他设备顶号 → `E_SESSION_KICKED` (40104)
  - 改密时旧密码错 → `E_AUTH_WRONG_OLD_PASSWORD` (40105)

接口清单（均挂在 `/api/v1` 下）：

| 方法 | 路径                 | 鉴权 | 说明                                             |
|------|----------------------|------|--------------------------------------------------|
| POST | `/auth/login`        | 无   | 用户名密码登录，返回 tokens + user                |
| POST | `/auth/refresh`      | 无*  | body 带 `refreshToken` 换新 token 对（session 不变）|
| GET  | `/auth/me`           | access | 返回当前登录用户基本信息                        |
| POST | `/auth/change-password` | access | 旧密码校验 → 改密 → 新 session + 新 tokens      |
| POST | `/auth/logout`       | access | 清空服务端 session（旧 token 立即失效）          |

> `*` refresh 虽不需要 access header，但要求 body 的 refreshToken 有效且匹配当前 `currentSessionId`。

详细的 DTO / 示例直接在 Swagger UI (`/api/docs`) 里看。

种子用户默认密码 `251212`，可用以下 PowerShell 做一次端到端冒烟：

```powershell
$base = "http://localhost:3000/api/v1"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
  -Body (@{ username = "jiangjiang"; password = "251212" } | ConvertTo-Json)
$at = $login.data.accessToken
$rt = $login.data.refreshToken
Invoke-RestMethod -Uri "$base/auth/me" -Headers @{ Authorization = "Bearer $at" }
Invoke-RestMethod -Method Post -Uri "$base/auth/refresh" -ContentType "application/json" `
  -Body (@{ refreshToken = $rt } | ConvertTo-Json)
```

## 统一响应约定

- 成功：`{ code: 0, data, msg: 'ok' }`
- 失败：`{ code, data: null, msg, errorKey }`；HTTP 状态码与 errorKey 见 `src/common/constants/error-keys.ts`。

## 环境变量

全部变量见 `.env.example`。当前会用到：

- `PORT`、`MONGODB_URI`
- `SWAGGER_ENABLED`、`SWAGGER_PATH`（调试接口用）
- `JWT_ACCESS_SECRET` / `JWT_ACCESS_TTL`（默认 `2h`）
- `JWT_REFRESH_SECRET` / `JWT_REFRESH_TTL`（默认 `14d`）
  - **access / refresh 两个 secret 必须不同**，至少 32 字节随机串；否则 refresh token 可以被直接拿去打业务接口，会绕过 TTL 策略。

`UPLOAD_*` 会在 M3 静态资源相关里才生效。

## Docker 生产镜像

`Dockerfile` 采用多阶段构建（deps → builder → runtime），在仓库根目录执行：

```powershell
# 构建（必须以仓库根为构建上下文，因为要用 workspace 清单）
docker build -f apps/server/Dockerfile -t momoya-server:latest .

# 单独跑（依赖外部 MongoDB）
docker run --rm -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/momoya \
  -e JWT_ACCESS_SECRET=$(openssl rand -hex 32) \
  momoya-server:latest
```

生产推荐直接使用根目录的 `docker-compose.prod.yml`，它会同时起 Mongo（带鉴权）+ server，并通过只读 init 脚本创建最小权限应用账号。详见根 README 的 "Docker 使用" 章节。
