"""
Collision checking between robot links (capsule approximation) and scene obstacles.
"""
from __future__ import annotations
import math
from dataclasses import dataclass
import numpy as np

LINK_RADII = [0.055, 0.050, 0.045, 0.038, 0.033, 0.028]


@dataclass
class SceneObject:
    id: str
    name: str
    type: str
    position: list[float]
    rotation: list[float]
    size: list[float]
    color: str = "#4f98a3"
    visible: bool = True


def _aabb_from_obstacle(obj: SceneObject) -> tuple[np.ndarray, np.ndarray]:
    p = np.array(obj.position, dtype=float)
    s = np.array(obj.size, dtype=float)
    if obj.type == "sphere":
        r = s[0]
        return p - r, p + r
    elif obj.type == "box":
        half = s / 2
        rx, ry, rz = [math.radians(a) for a in obj.rotation]
        corners = np.array([
            [dx*half[0], dy*half[1], dz*half[2]]
            for dx in [-1,1] for dy in [-1,1] for dz in [-1,1]
        ])
        Rx = np.array([[1,0,0],[0,math.cos(rx),-math.sin(rx)],[0,math.sin(rx),math.cos(rx)]])
        Ry = np.array([[math.cos(ry),0,math.sin(ry)],[0,1,0],[-math.sin(ry),0,math.cos(ry)]])
        Rz = np.array([[math.cos(rz),-math.sin(rz),0],[math.sin(rz),math.cos(rz),0],[0,0,1]])
        R = Rz @ Ry @ Rx
        rotated = (R @ corners.T).T + p
        return rotated.min(axis=0), rotated.max(axis=0)
    else:  # cylinder
        r, h = s[0], s[2]
        return p - np.array([r, r, h/2]), p + np.array([r, r, h/2])


def _closest_point_on_segment(a: np.ndarray, b: np.ndarray, p: np.ndarray) -> np.ndarray:
    """Return closest point on segment a→b to point p."""
    ab = b - a
    len_sq = float(np.dot(ab, ab))
    if len_sq < 1e-12:
        return a.copy()
    t = float(np.clip(np.dot(p - a, ab) / len_sq, 0.0, 1.0))
    return a + t * ab


def _capsule_aabb_collision(
    a: np.ndarray, b: np.ndarray, r: float,
    bb_min: np.ndarray, bb_max: np.ndarray,
) -> bool:
    """
    True if capsule (segment a→b, radius r) intersects AABB [bb_min, bb_max].
    Uses closest-point-on-segment to AABB-clamped point method.
    """
    # Clamp segment samples to AABB and find minimum distance
    for t in np.linspace(0.0, 1.0, 10):
        pt = a + t * (b - a)
        # Closest point on AABB surface to pt
        clamped = np.clip(pt, bb_min, bb_max)
        dist = float(np.linalg.norm(pt - clamped))
        if dist < r:
            return True
    return False


def check_config_collision(
    frames: list,
    obstacles: list[SceneObject],
    margin: float = 0.02,
) -> bool:
    """Return True if this single configuration collides with any obstacle."""
    for li in range(min(6, len(frames) - 1)):
        a = np.array(frames[li][:3, 3], dtype=float)
        b = np.array(frames[li+1][:3, 3], dtype=float)
        # Link radius only — no double-margin
        r = (LINK_RADII[li] if li < len(LINK_RADII) else 0.03) + margin
        for obj in obstacles:
            if not obj.visible:
                continue
            bb_min, bb_max = _aabb_from_obstacle(obj)
            if _capsule_aabb_collision(a, b, r, bb_min, bb_max):
                return True
    return False


def check_path_collision(
    frames_per_waypoint: list,
    obstacles: list[SceneObject],
    margin: float = 0.02,
) -> dict:
    """Check all waypoints. Returns full collision report."""
    details = []
    first_idx = None

    for wi, frames in enumerate(frames_per_waypoint):
        for li in range(min(6, len(frames) - 1)):
            a = np.array(frames[li][:3, 3], dtype=float)
            b = np.array(frames[li+1][:3, 3], dtype=float)
            r = (LINK_RADII[li] if li < len(LINK_RADII) else 0.03) + margin
            for obj in obstacles:
                if not obj.visible:
                    continue
                bb_min, bb_max = _aabb_from_obstacle(obj)
                if _capsule_aabb_collision(a, b, r, bb_min, bb_max):
                    details.append({"waypoint": wi, "link": li, "obstacle": obj.name})
                    if first_idx is None:
                        first_idx = wi

    return {
        "colliding": len(details) > 0,
        "first_collision_idx": first_idx,
        "details": details,
    }


def _is_config_collision_free(
    robot,
    q: list[float],
    obstacles: list[SceneObject],
    margin: float,
) -> bool:
    """Convenience: FK then collision check for a single config."""
    from .kinematics import forward_kinematics
    if not obstacles:
        return True
    frames = forward_kinematics(robot, q)
    return not check_config_collision(frames, obstacles, margin)
