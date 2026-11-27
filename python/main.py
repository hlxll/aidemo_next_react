from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import demo

import orderPack.order

from orderPack.order import create_order
app = FastAPI(
    title="AI-Demo FastAPI",
    version="0.1.0",
    description="最小 FastAPI 脚手架",
) 

# 允许前端开发服务器跨域调用，按需收紧
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(demo.router, prefix="/api", tags=["demo"])


@app.get("/", tags=["health"])
async def root() -> dict:
    create_order()
    return {"message": "ok", "service": "fastapi"}


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "up"}
