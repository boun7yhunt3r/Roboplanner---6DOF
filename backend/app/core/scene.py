"""Scene serialization and built-in presets."""
from __future__ import annotations
from .collision import SceneObject

def scene_to_dict(objects: list[SceneObject]) -> dict:
    return {"objects": [o.__dict__ for o in objects]}

def scene_from_dict(data: dict) -> list[SceneObject]:
    return [SceneObject(**o) for o in data.get("objects", [])]

EXAMPLE_SCENES = {
    "simple": {"objects": [
        {"id":"box1","name":"Table","type":"box","position":[0.3,0,0.1],"rotation":[0,0,0],"size":[0.4,0.6,0.05],"color":"#bb8855","visible":True},
        {"id":"sph1","name":"Cup","type":"sphere","position":[0.3,0.05,0.14],"rotation":[0,0,0],"size":[0.04,0.04,0.04],"color":"#4f98a3","visible":True},
    ]},
    "cluttered": {"objects": [
        {"id":"b1","name":"Shelf L","type":"box","position":[0.0,-0.35,0.3],"rotation":[0,0,0],"size":[0.6,0.04,0.6],"color":"#8a7560","visible":True},
        {"id":"b2","name":"Shelf R","type":"box","position":[0.0,0.35,0.3],"rotation":[0,0,0],"size":[0.6,0.04,0.6],"color":"#8a7560","visible":True},
        {"id":"cyl1","name":"Pipe A","type":"cylinder","position":[0.3,0.0,0.2],"rotation":[0,0,0],"size":[0.04,0.04,0.4],"color":"#6a6a7a","visible":True},
        {"id":"cyl2","name":"Pipe B","type":"cylinder","position":[0.2,0.2,0.15],"rotation":[0,90,0],"size":[0.03,0.03,0.3],"color":"#6a6a7a","visible":True},
        {"id":"s1","name":"Sensor","type":"sphere","position":[0.4,-0.1,0.25],"rotation":[0,0,0],"size":[0.06,0.06,0.06],"color":"#d163a7","visible":True},
    ]},
    "empty": {"objects": []},
}
