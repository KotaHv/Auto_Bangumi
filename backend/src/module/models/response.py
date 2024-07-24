from pydantic import BaseModel, Field


class ResponseModel(BaseModel):
    status: bool = Field(..., examples=[True])
    status_code: int = Field(..., examples=[200])
    msg_en: str
    msg_zh: str


class APIResponse(BaseModel):
    status: bool = Field(..., examples=[True])
    msg_en: str = Field(..., examples=["Success"])
    msg_zh: str = Field(..., examples=["成功"])
