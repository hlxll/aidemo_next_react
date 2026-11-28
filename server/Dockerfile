# 基础镜像可通过 --build-arg NODE_IMAGE=... 换成国内镜像源，例如
# docker.m.daocloud.io/library/node:24-bookworm-slim
ARG NODE_IMAGE=node:24-bookworm-slim

# ---------- 1. 安装依赖并编译 ----------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# 国内网络慢时可用 --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry "$NPM_REGISTRY"

COPY package.json package-lock.json ./
# @langchain/community 的可选 peer 依赖要求 typeorm ^0.3，和项目里的 typeorm 1.x 冲突，
# 用 --legacy-peer-deps 跳过 peer 校验（只影响安装校验，不影响运行）
RUN npm ci --legacy-peer-deps

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
# nest build 会按 nest-cli.json 的 assets 把 src/component/*.html、*.png 一起拷进 dist
RUN npm run build

# ---------- 2. 只装生产依赖 ----------
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry "$NPM_REGISTRY"

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# ---------- 3. 运行镜像 ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
# SQLite 放在 /app/data，node 用户可写，也方便用 -v 挂卷持久化
ENV DB_PATH=/app/data/app.sqlite
RUN mkdir -p /app/data && chown -R node:node /app/data

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Node 官方镜像自带非 root 用户 node，避免容器内以 root 跑服务
USER node
EXPOSE 3000

# 项目是 "type": "module"，入口是 dist/main.js
CMD ["node", "dist/main"]
