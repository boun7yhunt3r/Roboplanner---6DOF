from pydantic import BaseModel
class SceneSaveRequest(BaseModel):
    name: str; objects: list[dict]
