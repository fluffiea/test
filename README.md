# momoya

情侣日常记录小程序（monorepo）。

- `apps/server`：NestJS 11 服务端（MongoDB + Socket.io，M1 仅基建）
- `apps/mobile`：Taro 4.2（Vite）+ React 18 + Tailwind v4 + weapp-tailwindcss

## 快速开始（M1）

```powershell
# 1. 安装依赖
pnpm install

# 2. 准备后端 .env（首次）
Copy-Item apps/server/.env.example apps/server/.env

# 3. 启动开发用 MongoDB（Docker 方式，推荐）
pnpm docker:dev:up

# 4. 同时启动后端与小程序构建
pnpm dev
```

也可以分别运行：

```powershell
pnpm dev:server   # 仅后端
pnpm dev:weapp    # 仅小程序
```

> 如果你本机已经装了 MongoDB 7+，也可以跳过第 3 步，直接让服务端连 `mongodb://127.0.0.1:27017`。

## M1 验收

- 后端：`GET http://localhost:3000/api/v1/health` 返回 `{ code: 0, data: { status: 'ok', mongo: 'up' }, msg: 'ok' }`。
- 种子用户：启动日志含 `[seed] created initial users: jiangjiang, mengmeng`（或 `[seed] users exist, skipped`）。账号密码：`jiangjiang / 251212`、`mengmeng / 251212`，互为 partner。
- 小程序：用微信开发者工具打开 `apps/mobile/dist`，首页浅粉背景 + 居中显示粉色 `momoya` 标题，Tailwind 工具类全部生效（`dist/app-origin.wxss` 含 `bg-pink-50` 等类且 `rpx` 单位已替换 `rem`）。

## Docker 使用

本仓库提供两份 compose 文件，分别服务于**开发**和**生产部署**。

### 开发（只起 MongoDB，NestJS / Taro 在本机跑）

```powershell
pnpm docker:dev:up        # 后台启动 mongo:7 + mongo-express
pnpm docker:dev:logs      # 查看日志
pnpm docker:dev:down      # 停止但保留数据
pnpm docker:dev:reset     # 停止并清空数据卷（清库重来）
```

- MongoDB 监听 `localhost:27017`，无鉴权，开箱即可用于 `pnpm dev:server`。
- `mongo-express` 打开 `http://localhost:8081` 可视化查看数据库。
- 数据保存在具名卷 `momoya-dev_mongo-dev-data`，`docker:dev:down` 不会删除；只有 `docker:dev:reset` 会清空。

### 生产（整套 server + mongo）

1. 复制并编辑环境变量：

   ```powershell
   Copy-Item .env.docker.example .env.docker
   # 必须修改的三项：MONGO_ROOT_PASSWORD、MOMOYA_APP_PASSWORD、JWT_ACCESS_SECRET
   ```

2. 构建并启动：

   ```powershell
   pnpm docker:prod:build    # 多阶段构建 momoya-server 镜像
   pnpm docker:prod:up       # 启动 mongo + server
   pnpm docker:prod:logs     # 观察日志，直到看到 "momoya server listening on ..."
   ```

3. 升级：

   ```powershell
   pnpm docker:prod:build
   pnpm docker:prod:restart  # 仅重启 server，不动 mongo
   ```

4. 下线：

   ```powershell
   pnpm docker:prod:down
   ```

- `mongo` 容器启用了鉴权：root 账号仅用于初始化与运维，应用通过最小权限账号 `momoya_app`（仅对 `momoya` 库 `readWrite`）连接。
- 应用上传目录在具名卷 `server-uploads` 中持久化，重建镜像不会丢失。
- 健康检查：容器内每 30s 调 `/api/v1/health`，连续 3 次失败自动重启。

### 常见运维命令

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker ps
docker compose -f docker-compose.prod.yml --env-file .env.docker exec mongo mongosh -u root -p <ROOT_PWD> --authenticationDatabase admin
docker compose -f docker-compose.prod.yml --env-file .env.docker exec server node -v
```

### 目录速览（与 Docker 相关）

```
.
├── docker-compose.yml              开发用：仅 mongo + mongo-express
├── docker-compose.prod.yml         生产用：mongo（带鉴权）+ server
├── .dockerignore                   镜像构建上下文排除清单
├── .env.docker.example             生产 env 模板（复制为 .env.docker 后改值）
├── docker/
│   └── mongo-init/
│       └── 01-create-app-user.js   首次初始化创建应用低权账号
└── apps/server/
    ├── Dockerfile                  多阶段构建：deps → builder → runtime
    └── .dockerignore
```

## 目录结构

```
.
├── apps/
│   ├── server/    # NestJS 11
│   └── mobile/    # Taro 4.2 + React 18 + Tailwind v4
├── docker/        # MongoDB 初始化脚本等
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.docker.example
├── package.json   # 根工作区
└── pnpm-workspace.yaml
```

## 常见问题

- **微信开发者工具未显示 Tailwind 样式**：关闭开发者工具里的"自动热重载"后重新编译。
- **bcrypt / weapp-tailwindcss 的构建脚本被 pnpm 忽略**：根 `package.json` 已在 `pnpm.onlyBuiltDependencies` 中显式放行，正常 `pnpm install` 即可。
- **Taro 报 `Cannot find package '@babel/plugin-proposal-decorators'`**：`apps/mobile` 已显式加入该依赖以适配 pnpm 严格解析。
- **`docker:prod:up` 起不来，日志说鉴权失败**：通常是改过 `MOMOYA_APP_PASSWORD` 但没清库——密码只在首次创建容器时写入。清 `docker volume rm momoya-prod_mongo-prod-data` 或手动 `db.updateUser` 改密。
