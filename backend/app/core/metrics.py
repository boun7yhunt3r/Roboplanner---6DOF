"""Path quality metrics."""
from __future__ import annotations
import math
import numpy as np
from .robot_models import RobotPreset
from .kinematics import forward_kinematics
from .collision import _aabb_from_obstacle, LINK_RADII, SceneObject


def compute_path_metrics(robot: RobotPreset, waypoints: list[dict], obstacles: list[SceneObject]) -> dict:
    if len(waypoints) < 2:
        return {"joint_path_length": 0.0, "cartesian_path_length": 0.0,
                "smoothness": 0.0, "min_clearance": None, "n_waypoints": len(waypoints)}
    qs = [wp["q"] for wp in waypoints]
    tcps = [wp["tcp_pos"] for wp in waypoints]
    joint_len = sum(math.sqrt(sum((a-b)**2 for a,b in zip(qs[i],qs[i+1]))) for i in range(len(qs)-1))
    cart_len  = sum(math.sqrt(sum((a-b)**2 for a,b in zip(tcps[i],tcps[i+1]))) for i in range(len(tcps)-1))
    if len(qs) >= 3:
        accs = [math.sqrt(sum((qs[i+1][j]-2*qs[i][j]+qs[i-1][j])**2 for j in range(len(qs[0]))))
                for i in range(1, len(qs)-1)]
        smoothness = sum(accs)/len(accs)
    else:
        smoothness = 0.0
    min_c = _min_clearance(robot, qs, obstacles)
    return {"joint_path_length": round(joint_len,4), "cartesian_path_length": round(cart_len,4),
            "smoothness": round(smoothness,6), "min_clearance": round(min_c,4) if min_c else None,
            "n_waypoints": len(waypoints)}


def _min_clearance(robot, qs, obstacles, every=3):
    if not obstacles: return None
    min_d = float("inf")
    for i,q in enumerate(qs):
        if i % every != 0: continue
        frames = forward_kinematics(robot, q)
        for li in range(min(6,len(frames)-1)):
            a = np.array(frames[li][:3,3]); b = np.array(frames[li+1][:3,3])
            r = LINK_RADII[li] if li < len(LINK_RADII) else 0.03
            for obj in obstacles:
                if not obj.visible: continue
                bb_min, bb_max = _aabb_from_obstacle(obj)
                center = (bb_min+bb_max)/2
                for t in np.linspace(0,1,5):
                    pt = a + t*(b-a)
                    d = float(np.linalg.norm(pt-center)) - float(np.max((bb_max-bb_min)/2)) - r
                    min_d = min(min_d, d)
    return min_d if min_d < float("inf") else None
