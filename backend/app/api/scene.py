from fastapi import APIRouter, HTTPException
from ..schemas.scene import SceneSaveRequest
from ..core.scene import EXAMPLE_SCENES

router = APIRouter(prefix="/scene", tags=["scene"])
_saved: dict[str,dict] = {}

@router.get("/examples")
def list_examples(): return {"scenes": list(EXAMPLE_SCENES.keys())}

@router.get("/examples/{name}")
def get_example(name: str):
    if name not in EXAMPLE_SCENES: raise HTTPException(404)
    return EXAMPLE_SCENES[name]

@router.post("/save")
def save_scene(req: SceneSaveRequest):
    _saved[req.name] = req.model_dump(); return {"ok": True, "name": req.name}

@router.get("/load/{name}")
def load_scene(name: str):
    if name not in _saved: raise HTTPException(404)
    return _saved[name]
