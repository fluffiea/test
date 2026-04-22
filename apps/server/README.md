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

## 目录结构（M1）

```
src/
├── main.ts                     入口，全局前缀 /api/v1、helmet、全局管道/拦截器/过滤器
├── app.module.ts               Config/Mongoose/Throttler/Winston/业务模块装配
├── common/                     跨模块基础设施
│   ├── constants/error-keys.ts errorKey 与 code 映射
│   ├── interceptors/           统一响应拦截器
│   └── filters/                HttpException 过滤器
├── config/                     ConfigModule 配置（含 Joi 校验）
├── modules/
│   ├── health/                 健康检查
│   └── user/                   用户 schema 与基础仓储服务
└── seed/                       OnApplicationBootstrap 种子数据
```

## 统一响应约定

- 成功：`{ code: 0, data, msg: 'ok' }`
- 失败：`{ code, data: null, msg, errorKey }`；HTTP 状态码与 errorKey 见 `src/common/constants/error-keys.ts`。

## 环境变量

全部变量见 `.env.example`。M1 实际会用到：

- `PORT`、`MONGODB_URI`

其余 `JWT_*`、`UPLOAD_*` 会在 M2 及之后生效。

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
