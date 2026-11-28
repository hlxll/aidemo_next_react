#!/usr/bin/env bash
# 构建 NestJS 服务端镜像
#
# 用法：
#   ./build-image.sh                                  # 默认 ai-demo-server:<package.json 版本>
#   IMAGE_NAME=my-api TAG=v1 ./build-image.sh          # 自定义镜像名/标签
#   NPM_REGISTRY=https://registry.npmmirror.com ./build-image.sh   # 改 npm 源
#   PLATFORM=linux/amd64 ./build-image.sh              # 交叉构建（需 buildx）
#   NODE_IMAGE=node:24-bookworm-slim ./build-image.sh  # 用官方基础镜像（默认走 daocloud 镜像源）

set -euo pipefail
cd "$(dirname "$0")"

IMAGE_NAME="${IMAGE_NAME:-ai-demo-server}"
TAG="${TAG:-$(node -p "require('./package.json').version")}"
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmmirror.com}"
PLATFORM="${PLATFORM:-}"
# 国内直连 docker.io 基本拉不动，默认换 daocloud 的镜像源
NODE_IMAGE="${NODE_IMAGE:-docker.m.daocloud.io/library/node:24-bookworm-slim}"

if ! command -v docker >/dev/null 2>&1; then
  echo "未找到 docker 命令，请先安装 Docker Desktop（或 colima），并确认 docker info 可用" >&2
  exit 1
fi

# 空数组在 bash 3.2（macOS 自带）下配合 set -u 会报错，用 +"..." 写法兜底
BUILD_ARGS=()
[[ -n "$PLATFORM" ]] && BUILD_ARGS+=("--platform" "$PLATFORM")
[[ -n "$NPM_REGISTRY" ]] && BUILD_ARGS+=("--build-arg" "NPM_REGISTRY=$NPM_REGISTRY")
[[ -n "$NODE_IMAGE" ]] && BUILD_ARGS+=("--build-arg" "NODE_IMAGE=$NODE_IMAGE")

echo "==> 构建镜像 ${IMAGE_NAME}:${TAG}（同时打 latest）"
docker build "${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"}" \
  -t "${IMAGE_NAME}:${TAG}" \
  -t "${IMAGE_NAME}:latest" \
  .

echo
echo "==> 构建完成"
docker images --filter "reference=$IMAGE_NAME" --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}'
echo
echo "启动示例（环境变量用 server/.env，端口 3000）："
echo "  docker run --rm -p 3000:3000 --env-file .env $IMAGE_NAME:latest"
echo "需要保留 SQLite 数据时，把数据库目录挂出来："
echo "  docker run --rm -p 3000:3000 --env-file .env -v \"\$PWD/data:/app/data\" $IMAGE_NAME:latest"
