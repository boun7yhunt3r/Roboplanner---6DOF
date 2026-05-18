from pydantic import BaseModel
from typing import Optional


class SceneObjectSchema(BaseModel):
    id: str; name: str; type: str
    position: list[float]; rotation: list[float]; size: list[float]
    color: str = "#4f98a3"; visible: bool = True


class PlanRequest(BaseModel):
    robot_id: str
    q_start: list[float]
    q_goal: list[float]
    obstacles: list[SceneObjectSchema] = []
    planner: str = "abit_star"          # "cartesian_lerp" | "rrt_connect" | "abit_star"
    # Shared
    collision_margin: float = 0.02
    seed: Optional[int] = 42
    # LERP
    n_steps: int = 40
    # RRT-Connect
    max_iterations: int = 3000
    step_size: float = 0.15
    goal_bias: float = 0.15
    smoothing: bool = True
    # ABIT*
    time_budget: float = 3.0
    init_batch: int = 150
    batch_growth: float = 1.4


class WaypointSchema(BaseModel):
    q: list[float]; tcp_pos: list[float]; tcp_rpy: list[float]; frames: list[list[float]]


class CollisionDetail(BaseModel):
    waypoint: int; link: int; obstacle: str


class CollisionResult(BaseModel):
    colliding: bool
    first_collision_idx: Optional[int]
    details: list[CollisionDetail]


class PathMetrics(BaseModel):
    joint_path_length: float; cartesian_path_length: float
    smoothness: float; min_clearance: Optional[float]; n_waypoints: int


class PlanResponse(BaseModel):
    success: bool; planner: str
    waypoints: list[WaypointSchema]
    collision: CollisionResult; metrics: PathMetrics
    planning_time_s: float; message: str
