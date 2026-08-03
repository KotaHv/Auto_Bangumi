from typing import Annotated

from pydantic import BaseModel, Field


class ResponseModel(BaseModel):
    status: Annotated[bool, Field(examples=[True])]
    status_code: Annotated[int, Field(examples=[200])]
    msg_en: str
    msg_zh: str


class APIResponse(BaseModel):
    status: Annotated[bool, Field(examples=[True])]
    msg_en: Annotated[str, Field(examples=["Success"])]
    msg_zh: Annotated[str, Field(examples=["成功"])]
