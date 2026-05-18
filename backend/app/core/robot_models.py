"""
Robot model definitions (Modified DH convention).

Supports:
  - Built-in presets (UR5, KUKA KR6, ABB IRB120, Generic 6R)
  - Custom DH robots created at runtime via from_dh_dict()
  - Any N-DOF robot — all planners are DOF-agnostic

Custom DH format (JSON / dict):
  {
    "id": "my_robot",
    "name": "My Custom Robot",
    "description": "...",
    "tcp_offset": [0, 0, 0.05],
    "base_offset": [0, 0, 0],
    "joints": [
      { "name": "J1", "a": 0.0, "alpha": 1.5708, "d": 0.1,
        "theta_offset": 0.0, "q_min": -3.14159, "q_max": 3.14159,
        "joint_type": "revolute" },
      ...
    ]
  }
"""
from __future__ import annotations
from dataclasses import dataclass, field
import math


@dataclass
class DHJoint:
    name:          str
    a:             float          # link length (m)
    alpha:         float          # link twist (rad)
    d:             float          # link offset (m)
    theta_offset:  float = 0.0
    q_min:         float = -math.pi
    q_max:         float = math.pi
    joint_type:    str   = "revolute"


@dataclass
class RobotPreset:
    id:          str
    name:        str
    description: str
    joints:      list[DHJoint]
    tcp_offset:  list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    base_offset: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])

    @property
    def dof(self) -> int:
        return len(self.joints)

    @property
    def reach(self) -> float:
        return sum(abs(j.a) + abs(j.d) for j in self.joints) * 0.6


def from_dh_dict(data: dict) -> RobotPreset:
    """
    Build a RobotPreset from a plain dict / parsed JSON.
    Used by the /robots/custom endpoint to register user-defined robots.
    """
    joints = []
    for jd in data["joints"]:
        joints.append(DHJoint(
            name         = jd.get("name", f"J{len(joints)+1}"),
            a            = float(jd["a"]),
            alpha        = float(jd["alpha"]),
            d            = float(jd["d"]),
            theta_offset = float(jd.get("theta_offset", 0.0)),
            q_min        = float(jd.get("q_min", -math.pi)),
            q_max        = float(jd.get("q_max",  math.pi)),
            joint_type   = str(jd.get("joint_type", "revolute")),
        ))
    return RobotPreset(
        id          = str(data.get("id", "custom")),
        name        = str(data.get("name", "Custom Robot")),
        description = str(data.get("description", "User-defined robot")),
        tcp_offset  = list(data.get("tcp_offset",  [0, 0, 0])),
        base_offset = list(data.get("base_offset", [0, 0, 0])),
        joints      = joints,
    )


# ── UR5-style ────────────────────────────────────────────────────────────────
UR5 = RobotPreset(
    id="ur5", name="UR5-style",
    description="Universal Robots UR5-inspired 6R arm. 850 mm reach, ±360° joints.",
    joints=[
        DHJoint("J1", a=0.0,      alpha=math.pi/2,  d=0.089159, q_min=-2*math.pi, q_max=2*math.pi),
        DHJoint("J2", a=-0.42500, alpha=0.0,         d=0.0,      q_min=-2*math.pi, q_max=2*math.pi),
        DHJoint("J3", a=-0.39225, alpha=0.0,         d=0.0,      q_min=-2*math.pi, q_max=2*math.pi),
        DHJoint("J4", a=0.0,      alpha=math.pi/2,  d=0.10915,  q_min=-2*math.pi, q_max=2*math.pi),
        DHJoint("J5", a=0.0,      alpha=-math.pi/2, d=0.09465,  q_min=-2*math.pi, q_max=2*math.pi),
        DHJoint("J6", a=0.0,      alpha=0.0,         d=0.08230,  q_min=-2*math.pi, q_max=2*math.pi),
    ],
)

# ── KUKA KR6-style ───────────────────────────────────────────────────────────
KUKA_KR6 = RobotPreset(
    id="kuka_kr6", name="KUKA KR6-style",
    description="KUKA KR6 R900-inspired compact 6R arm. ~900 mm reach.",
    joints=[
        DHJoint("A1", a=0.025,  alpha=-math.pi/2, d=0.400, q_min=math.radians(-170), q_max=math.radians(170)),
        DHJoint("A2", a=0.315,  alpha=0.0,         d=0.0,   q_min=math.radians(-190), q_max=math.radians(45)),
        DHJoint("A3", a=0.035,  alpha=math.pi/2,  d=0.0,   q_min=math.radians(-120), q_max=math.radians(156)),
        DHJoint("A4", a=0.0,    alpha=-math.pi/2, d=0.365, q_min=math.radians(-185), q_max=math.radians(185)),
        DHJoint("A5", a=0.0,    alpha=math.pi/2,  d=0.0,   q_min=math.radians(-120), q_max=math.radians(120)),
        DHJoint("A6", a=0.0,    alpha=0.0,         d=0.080, q_min=math.radians(-350), q_max=math.radians(350)),
    ],
)

# ── ABB IRB120-style ──────────────────────────────────────────────────────────
ABB_IRB120 = RobotPreset(
    id="abb_irb120", name="ABB IRB120-style",
    description="ABB IRB 120-inspired small 6R arm. ~580 mm reach.",
    joints=[
        DHJoint("J1", a=0.0,   alpha=-math.pi/2, d=0.290, q_min=math.radians(-165), q_max=math.radians(165)),
        DHJoint("J2", a=0.270, alpha=0.0,         d=0.0,   q_min=math.radians(-110), q_max=math.radians(110)),
        DHJoint("J3", a=0.070, alpha=-math.pi/2, d=0.0,   q_min=math.radians(-110), q_max=math.radians(70)),
        DHJoint("J4", a=0.0,   alpha=math.pi/2,  d=0.302, q_min=math.radians(-160), q_max=math.radians(160)),
        DHJoint("J5", a=0.0,   alpha=-math.pi/2, d=0.0,   q_min=math.radians(-120), q_max=math.radians(120)),
        DHJoint("J6", a=0.0,   alpha=0.0,         d=0.072, q_min=math.radians(-400), q_max=math.radians(400)),
    ],
)

# ── Generic 6R ───────────────────────────────────────────────────────────────
GENERIC_6R = RobotPreset(
    id="generic_6r", name="Generic 6R",
    description="Generic 6-axis research arm with uniform link lengths.",
    joints=[
        DHJoint("J1", a=0.0,  alpha=math.pi/2,  d=0.10),
        DHJoint("J2", a=0.30, alpha=0.0,         d=0.0),
        DHJoint("J3", a=0.25, alpha=0.0,         d=0.0),
        DHJoint("J4", a=0.0,  alpha=math.pi/2,  d=0.08),
        DHJoint("J5", a=0.0,  alpha=-math.pi/2, d=0.08),
        DHJoint("J6", a=0.0,  alpha=0.0,         d=0.06),
    ],
)

# Runtime registry — custom robots are added here via API
BUILTIN_ROBOTS: dict[str, RobotPreset] = {
    r.id: r for r in [UR5, KUKA_KR6, ABB_IRB120, GENERIC_6R]
}

# Mutable registry that also includes user-registered custom robots
ROBOT_REGISTRY: dict[str, RobotPreset] = dict(BUILTIN_ROBOTS)
