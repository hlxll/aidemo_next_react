from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class EchoIn(BaseModel):
    message: str
    name: Optional[str] = None


class EchoOut(BaseModel):
    echo: str
    name: Optional[str] = None


@router.get("/demo")
async def demo_get(name: str = "world") -> dict:
    return {"message": f"hello, {name}"}


@router.post("/demo/echo", response_model=EchoOut)
async def demo_echo(body: EchoIn) -> EchoOut:
    return EchoOut(echo=body.message, name=body.name)
