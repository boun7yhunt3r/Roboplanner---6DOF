from fastapi import APIRouter, HTTPException
from ..schemas.robot import RobotSummaryResponse, DHJointSchema, FKRequest, FKResponse, IKRequest, IKResponse
from ..core.robot_models import BUILTIN_ROBOTS
from ..core.kinematics import forward_kinematics, inverse_kinematics, _rotation_matrix_to_rpy

router = APIRouter(prefix="/robots", tags=["robots"])

def _summary(rid):
    if rid not in BUILTIN_ROBOTS: raise HTTPException(404, f"Robot '{rid}' not found.")
    r = BUILTIN_ROBOTS[rid]
    return RobotSummaryResponse(id=rid, name=r.name, description=r.description, reach=r.reach,
        dof=r.dof, tcp_offset=r.tcp_offset, base_offset=r.base_offset,
        joints=[DHJointSchema(name=j.name,a=j.a,alpha=j.alpha,d=j.d,theta_offset=j.theta_offset,
                              q_min=j.q_min,q_max=j.q_max,joint_type=j.joint_type) for j in r.joints])

@router.get("/", response_model=list[RobotSummaryResponse])
def list_robots(): return [_summary(rid) for rid in BUILTIN_ROBOTS]

@router.get("/{robot_id}", response_model=RobotSummaryResponse)
def get_robot(robot_id: str): return _summary(robot_id)

@router.post("/fk", response_model=FKResponse)
def compute_fk(req: FKRequest):
    if req.robot_id not in BUILTIN_ROBOTS: raise HTTPException(404)
    frames = forward_kinematics(BUILTIN_ROBOTS[req.robot_id], req.q)
    T = frames[-1]
    return FKResponse(tcp_pos=T[:3,3].tolist(), tcp_rpy=list(_rotation_matrix_to_rpy(T[:3,:3])),
                      frames=[f[:3,3].tolist() for f in frames])

@router.post("/ik", response_model=IKResponse)
def compute_ik(req: IKRequest):
    if req.robot_id not in BUILTIN_ROBOTS: raise HTTPException(404)
    q, info = inverse_kinematics(BUILTIN_ROBOTS[req.robot_id], req.target_pos, req.target_rpy,
                                  q_init=req.q_init, position_only=req.position_only)
    return IKResponse(q=q, converged=info["converged"], error=info["error"], iterations=info["iterations"])
