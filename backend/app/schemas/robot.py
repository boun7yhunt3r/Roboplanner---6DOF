from pydantic import BaseModel
from typing import Optional

class DHJointSchema(BaseModel):
    name: str; a: float; alpha: float; d: float
    theta_offset: float = 0.0; q_min: float = -3.14159; q_max: float = 3.14159
    joint_type: str = "revolute"

class RobotSummaryResponse(BaseModel):
    id: str; name: str; description: str; reach: float; dof: int
    tcp_offset: list[float]; base_offset: list[float]; joints: list[DHJointSchema]

class FKRequest(BaseModel):
    robot_id: str; q: list[float]

class FKResponse(BaseModel):
    tcp_pos: list[float]; tcp_rpy: list[float]; frames: list[list[float]]

class IKRequest(BaseModel):
    robot_id: str; target_pos: list[float]; target_rpy: list[float]
    q_init: Optional[list[float]] = None; position_only: bool = False

class IKResponse(BaseModel):
    q: Optional[list[float]]; converged: bool; error: float; iterations: int
