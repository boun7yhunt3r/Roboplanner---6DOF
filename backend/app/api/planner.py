from fastapi import APIRouter, HTTPException
from ..schemas.planner import PlanRequest, PlanResponse, PathMetrics
from ..core.robot_models import BUILTIN_ROBOTS
from ..core.collision import SceneObject
from ..core.planners import plan_cartesian, plan_rrt_connect, plan_abit_star
from ..core.metrics import compute_path_metrics

router = APIRouter(prefix="/plan", tags=["planner"])


@router.post("/", response_model=PlanResponse)
def run_planner(req: PlanRequest):
    if req.robot_id not in BUILTIN_ROBOTS:
        raise HTTPException(404, "Robot not found.")
    robot = BUILTIN_ROBOTS[req.robot_id]
    obstacles = [SceneObject(**o.model_dump()) for o in req.obstacles]

    if req.planner == "cartesian_lerp":
        result = plan_cartesian(
            robot, req.q_start, req.q_goal, obstacles,
            n_steps=req.n_steps, collision_margin=req.collision_margin,
        )
    elif req.planner == "rrt_connect":
        result = plan_rrt_connect(
            robot, req.q_start, req.q_goal, obstacles,
            max_iter=req.max_iterations, step_size=req.step_size,
            collision_margin=req.collision_margin, seed=req.seed,
        )
    else:  # abit_star (default)
        result = plan_abit_star(
            robot, req.q_start, req.q_goal, obstacles,
            time_budget=req.time_budget,
            collision_margin=req.collision_margin,
            init_batch=req.init_batch,
            batch_growth=req.batch_growth,
            seed=req.seed,
        )

    metrics = PathMetrics(**compute_path_metrics(robot, result["waypoints"], obstacles))
    return PlanResponse(
        success=result["success"], planner=result["planner"],
        waypoints=result["waypoints"], collision=result["collision"],
        metrics=metrics, planning_time_s=result["planning_time_s"],
        message=result["message"],
    )
