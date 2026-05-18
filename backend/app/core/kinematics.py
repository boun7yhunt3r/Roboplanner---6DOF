"""
Forward and inverse kinematics using Modified DH convention.

FK:  T = T_0^1 * T_1^2 * ... * T_{n-1}^n
IK:  Jacobian pseudo-inverse numerical solver with damped least-squares fallback.
"""
from __future__ import annotations
import math
import numpy as np
from typing import Optional
from .robot_models import RobotPreset


def _dh_transform(a: float, alpha: float, d: float, theta: float) -> np.ndarray:
    """Return 4x4 Modified DH homogeneous transform matrix."""
    ct, st = math.cos(theta), math.sin(theta)
    ca, sa = math.cos(alpha), math.sin(alpha)
    return np.array([
        [ct,     -st,      0,      a      ],
        [st*ca,   ct*ca,  -sa,    -sa*d   ],
        [st*sa,   ct*sa,   ca,     ca*d   ],
        [0,       0,       0,      1      ],
    ])


def forward_kinematics(robot: RobotPreset, q: list[float]) -> list[np.ndarray]:
    """
    Compute FK for all joints.
    Returns list of 4x4 matrices: [T_base, T_0, T_1, ..., T_tcp]
    Length = dof + 1 (includes base frame and TCP).
    """
    T = np.eye(4)
    frames = [T.copy()]
    for i, joint in enumerate(robot.joints):
        theta = q[i] + joint.theta_offset
        Ti = _dh_transform(joint.a, joint.alpha, joint.d, theta)
        T = T @ Ti
        frames.append(T.copy())
    return frames


def fk_tcp_pose(robot: RobotPreset, q: list[float]) -> tuple[np.ndarray, np.ndarray]:
    """Return (position [3], rotation_matrix [3x3]) for TCP."""
    frames = forward_kinematics(robot, q)
    T = frames[-1]
    return T[:3, 3], T[:3, :3]


def _rotation_matrix_to_rpy(R: np.ndarray) -> tuple[float, float, float]:
    """Convert 3x3 rotation matrix to roll-pitch-yaw (ZYX convention)."""
    sy = math.sqrt(R[0, 0] ** 2 + R[1, 0] ** 2)
    singular = sy < 1e-6
    if not singular:
        roll  = math.atan2(R[2, 1], R[2, 2])
        pitch = math.atan2(-R[2, 0], sy)
        yaw   = math.atan2(R[1, 0], R[0, 0])
    else:
        roll  = math.atan2(-R[1, 2], R[1, 1])
        pitch = math.atan2(-R[2, 0], sy)
        yaw   = 0.0
    return roll, pitch, yaw


def _rpy_to_rotation_matrix(r: float, p: float, y: float) -> np.ndarray:
    """Roll-pitch-yaw → 3x3 rotation matrix (ZYX convention)."""
    cr, sr = math.cos(r), math.sin(r)
    cp, sp = math.cos(p), math.sin(p)
    cy, sy = math.cos(y), math.sin(y)
    return np.array([
        [cy*cp,  cy*sp*sr - sy*cr,  cy*sp*cr + sy*sr],
        [sy*cp,  sy*sp*sr + cy*cr,  sy*sp*cr - cy*sr],
        [-sp,    cp*sr,             cp*cr            ],
    ])


def _geometric_jacobian(robot: RobotPreset, q: list[float]) -> np.ndarray:
    """
    Compute 6×n geometric Jacobian via finite differences (reliable across all DH configs).
    eps step chosen for numerical stability.
    """
    n = robot.dof
    eps = 1e-5
    pos0, _ = fk_tcp_pose(robot, q)
    frames0 = forward_kinematics(robot, q)
    R0 = frames0[-1][:3, :3]

    J = np.zeros((6, n))
    for i in range(n):
        q_eps = list(q)
        q_eps[i] += eps
        pos_eps, _ = fk_tcp_pose(robot, q_eps)
        frames_eps = forward_kinematics(robot, q_eps)
        R_eps = frames_eps[-1][:3, :3]

        # Linear velocity column
        J[:3, i] = (pos_eps - pos0) / eps

        # Angular velocity via skew of R_diff
        R_diff = R_eps @ R0.T
        J[3, i] = (R_diff[2, 1] - R_diff[1, 2]) / (2 * eps)
        J[4, i] = (R_diff[0, 2] - R_diff[2, 0]) / (2 * eps)
        J[5, i] = (R_diff[1, 0] - R_diff[0, 1]) / (2 * eps)

    return J


def inverse_kinematics(
    robot: RobotPreset,
    target_pos: list[float],
    target_rpy: list[float],
    q_init: Optional[list[float]] = None,
    position_only: bool = False,
    max_iter: int = 200,
    tol: float = 1e-4,
    alpha: float = 0.5,
    damping: float = 0.01,
) -> tuple[Optional[list[float]], dict]:
    """
    Damped least-squares Jacobian IK solver.
    Returns (q_solution, info_dict).
    """
    if q_init is None:
        q_init = [0.0] * robot.dof

    q = np.array(q_init, dtype=float)
    target_p = np.array(target_pos)
    R_target = _rpy_to_rotation_matrix(*target_rpy)

    best_q = q.copy()
    best_err = float("inf")

    for iteration in range(max_iter):
        pos, R = fk_tcp_pose(robot, q.tolist())

        # Position error
        ep = target_p - pos

        if position_only:
            e = ep
            J = _geometric_jacobian(robot, q.tolist())[:3, :]
        else:
            # Orientation error via rotation difference
            R_diff = R_target @ R.T
            angle = math.acos(max(-1.0, min(1.0, (np.trace(R_diff) - 1) / 2)))
            if abs(angle) < 1e-8:
                eo = np.zeros(3)
            else:
                eo = angle / (2 * math.sin(angle)) * np.array([
                    R_diff[2, 1] - R_diff[1, 2],
                    R_diff[0, 2] - R_diff[2, 0],
                    R_diff[1, 0] - R_diff[0, 1],
                ])
            e = np.concatenate([ep, eo])
            J = _geometric_jacobian(robot, q.tolist())

        err = float(np.linalg.norm(ep))
        if err < best_err:
            best_err = err
            best_q = q.copy()

        if err < tol:
            break

        # Damped least squares: dq = J^T (J J^T + λ²I)^{-1} e
        n = J.shape[1]
        m = J.shape[0]
        lam2 = damping ** 2
        dq = J.T @ np.linalg.solve(J @ J.T + lam2 * np.eye(m), e)
        q = q + alpha * dq

        # Clamp to joint limits
        for i, joint in enumerate(robot.joints):
            q[i] = float(np.clip(q[i], joint.q_min, joint.q_max))

    converged = best_err < tol
    return (
        best_q.tolist() if best_err < 0.05 else None,
        {"converged": converged, "error": best_err, "iterations": iteration + 1},
    )
