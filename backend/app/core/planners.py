"""
Path planners for 6-DOF robots.

Planners:
  1. cartesian_lerp  — joint-space linear interpolation (baseline)
  2. rrt_connect     — Bidirectional RRT-Connect (fast, obstacle-aware)
  3. abit_star       — ABIT* (Adaptively Batched Informed Trees*)
                       Best quality/time tradeoff.
                       Combines BIT* heuristic graph search + lazy collision
                       checking + informed ellipsoidal pruning + adaptive
                       batch sizing. Finds a first solution fast (like RRT-Connect)
                       then continuously improves it (like RRT*) until time budget.
"""
from __future__ import annotations
import math, time, random, heapq
from dataclasses import dataclass, field
from typing import Optional
import numpy as np

from .robot_models import RobotPreset
from .kinematics import forward_kinematics, _rotation_matrix_to_rpy
from .collision import check_path_collision, SceneObject, _is_config_collision_free


# ─── Shared helpers ───────────────────────────────────────────────────────────

def _build_waypoint(robot: RobotPreset, q: list[float]) -> dict:
    frames = forward_kinematics(robot, q)
    T = frames[-1]
    return {
        "q": q,
        "tcp_pos": T[:3, 3].tolist(),
        "tcp_rpy": list(_rotation_matrix_to_rpy(T[:3, :3])),
        "frames": [f[:3, 3].tolist() for f in frames],
    }

def _dist(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def _steer(q_near: list[float], q_rand: list[float], step: float) -> list[float]:
    d = _dist(q_near, q_rand)
    if d < 1e-9:
        return q_near
    r = min(step / d, 1.0)
    return [qn + r * (qr - qn) for qn, qr in zip(q_near, q_rand)]

def _clamp(robot: RobotPreset, q: list[float]) -> list[float]:
    return [float(np.clip(q[i], robot.joints[i].q_min, robot.joints[i].q_max))
            for i in range(robot.dof)]

def _edge_collision_free(
    robot: RobotPreset,
    q_a: list[float],
    q_b: list[float],
    obstacles: list[SceneObject],
    margin: float,
    n_checks: int = 8,
) -> bool:
    """Check n_checks interpolated configs along edge for collision."""
    for i in range(1, n_checks + 1):
        t = i / (n_checks + 1)
        q_mid = [a + t * (b - a) for a, b in zip(q_a, q_b)]
        if not _is_config_collision_free(robot, q_mid, obstacles, margin):
            return False
    return True

def _shortcut(
    robot: RobotPreset,
    path: list[list[float]],
    obstacles: list[SceneObject],
    margin: float,
    n_attempts: int = 80,
) -> list[list[float]]:
    path = list(path)
    for _ in range(n_attempts):
        if len(path) <= 2:
            break
        i = random.randint(0, len(path) - 2)
        j = random.randint(i + 1, len(path) - 1)
        if j - i <= 1:
            continue
        if _edge_collision_free(robot, path[i], path[j], obstacles, margin, n_checks=10):
            path = path[:i + 1] + path[j:]
    return path

def _build_result(
    robot: RobotPreset,
    path: list[list[float]],
    obstacles: list[SceneObject],
    planner_name: str,
    elapsed: float,
    message: str,
) -> dict:
    waypoints = [_build_waypoint(robot, q) for q in path]
    frames_list = [forward_kinematics(robot, q) for q in path]
    collision = check_path_collision(frames_list, obstacles, margin=0.0)
    return {
        "success": True,
        "planner": planner_name,
        "waypoints": waypoints,
        "collision": collision,
        "planning_time_s": round(elapsed, 4),
        "message": message,
    }

def _failure(planner_name: str, elapsed: float, msg: str) -> dict:
    return {
        "success": False, "planner": planner_name, "waypoints": [],
        "collision": {"colliding": False, "first_collision_idx": None, "details": []},
        "planning_time_s": round(elapsed, 4), "message": msg,
    }


# ─── 1. Cartesian LERP (baseline) ─────────────────────────────────────────────

def plan_cartesian(
    robot: RobotPreset,
    q_start: list[float],
    q_goal: list[float],
    obstacles: list[SceneObject],
    n_steps: int = 40,
    collision_margin: float = 0.02,
) -> dict:
    t0 = time.perf_counter()
    path = [
        [q_start[j] + (i / n_steps) * (q_goal[j] - q_start[j]) for j in range(robot.dof)]
        for i in range(n_steps + 1)
    ]
    frames_list = [forward_kinematics(robot, q) for q in path]
    collision = check_path_collision(frames_list, obstacles, collision_margin)
    elapsed = time.perf_counter() - t0
    success = not collision["colliding"]
    waypoints = [_build_waypoint(robot, q) for q in path]
    return {
        "success": success,
        "planner": "cartesian_lerp",
        "waypoints": waypoints,
        "collision": collision,
        "planning_time_s": round(elapsed, 4),
        "message": "Linear path clear." if success
                   else f"Collision at waypoint {collision['first_collision_idx']} — try ABIT*.",
    }


# ─── 2. RRT-Connect (fast, obstacle-aware) ────────────────────────────────────

def plan_rrt_connect(
    robot: RobotPreset,
    q_start: list[float],
    q_goal: list[float],
    obstacles: list[SceneObject],
    max_iter: int = 3000,
    step_size: float = 0.15,
    collision_margin: float = 0.02,
    seed: Optional[int] = None,
) -> dict:
    if seed is not None:
        random.seed(seed)
    t0 = time.perf_counter()

    nodesA = [list(q_start)];  parentA = [-1]
    nodesB = [list(q_goal)];   parentB = [-1]

    def nearest(tree, q):
        dists = [_dist(n, q) for n in tree]
        return int(np.argmin(dists))

    def extend(tree, parent, q_rand):
        idx = nearest(tree, q_rand)
        q_new = _steer(tree[idx], q_rand, step_size)
        q_new = _clamp(robot, q_new)
        if not _is_config_collision_free(robot, q_new, obstacles, collision_margin):
            return -1
        if not _edge_collision_free(robot, tree[idx], q_new, obstacles, collision_margin):
            return -1
        tree.append(q_new); parent.append(idx)
        return len(tree) - 1

    def connect(tree, parent, q_target):
        """Greedily extend tree toward q_target until hit or close enough."""
        last = -1
        for _ in range(50):
            idx = nearest(tree, q_target)
            if _dist(tree[idx], q_target) < step_size * 0.5:
                return idx
            new_idx = extend(tree, parent, q_target)
            if new_idx == -1:
                return -1
            last = new_idx
        return last

    def extract(tree, parent, idx):
        path = []
        while idx != -1:
            path.append(tree[idx]); idx = parent[idx]
        return list(reversed(path))

    connected_A = -1; connected_B = -1

    for _ in range(max_iter):
        q_rand = _clamp(robot, [random.uniform(j.q_min, j.q_max) for j in robot.joints])

        idx_a = extend(nodesA, parentA, q_rand)
        if idx_a == -1:
            continue

        idx_b = connect(nodesB, parentB, nodesA[idx_a])
        if idx_b != -1 and _dist(nodesA[idx_a], nodesB[idx_b]) < step_size * 0.6:
            connected_A = idx_a; connected_B = idx_b
            break

        # Swap trees
        nodesA, nodesB = nodesB, nodesA
        parentA, parentB = parentB, parentA

    elapsed = time.perf_counter() - t0

    if connected_A == -1:
        return _failure("rrt_connect", elapsed, f"RRT-Connect failed in {max_iter} iterations.")

    # Reconstruct — trees may have been swapped an even/odd number of times
    # We track which tree is which by checking if nodesA[0] ≈ q_start
    pathA = extract(nodesA, parentA, connected_A)
    pathB = extract(nodesB, parentB, connected_B)
    if _dist(pathA[0], q_start) > _dist(pathA[0], q_goal):
        pathA, pathB = pathB, pathA
    raw = pathA + list(reversed(pathB))
    smooth = _shortcut(robot, raw, obstacles, collision_margin)
    return _build_result(robot, smooth, obstacles, "rrt_connect", elapsed,
                         f"RRT-Connect: {len(smooth)} waypoints after smoothing.")


# ─── 3. ABIT* ─────────────────────────────────────────────────────────────────
#
# Adaptively Batched Informed Trees* (Gammell, Strub & Barfoot, 2020)
# https://arxiv.org/abs/2004.01177
#
# Core ideas:
#   (a) Maintains a sparse random geometric graph (RGG) over C-free.
#   (b) Searches the RGG with an A*-like queue ordered by f = g + h.
#   (c) Uses an admissible heuristic h(v) = dist(v, goal).
#   (d) Lazy collision checking: edges are only checked when popped from queue.
#   (e) Once a solution c_best is found, restricts ALL future samples to the
#       prolate hyperspheroid (informed ellipse) that can improve c_best.
#   (f) Adaptive batching: batch size grows geometrically as solution improves.
#
# This gives:
#   - Fast first solution (sparse graph + A* focus)
#   - Continuous anytime improvement (informed pruning)
#   - Near-optimal final path within a fixed time budget
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(order=True)
class _QItem:
    priority: float
    idx: int = field(compare=False)
    parent_idx: int = field(compare=False)


class _ABITStar:
    """
    ABIT* planner for a single planning query.
    Operates in C-space (joint space) for the robot.
    """

    def __init__(
        self,
        robot: RobotPreset,
        q_start: list[float],
        q_goal: list[float],
        obstacles: list[SceneObject],
        margin: float,
        time_budget: float,
        init_batch: int,
        batch_growth: float,
        r_rgg_scale: float,
        seed: Optional[int],
    ):
        self.robot = robot
        self.q_start = np.array(q_start, dtype=float)
        self.q_goal  = np.array(q_goal,  dtype=float)
        self.obstacles = obstacles
        self.margin = margin
        self.time_budget = time_budget
        self.batch_growth = batch_growth
        self.r_rgg_scale = r_rgg_scale
        self.dof = robot.dof

        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

        # Node store: list of np arrays
        self.nodes: list[np.ndarray] = [self.q_start.copy(), self.q_goal.copy()]
        self.START_IDX = 0
        self.GOAL_IDX  = 1

        # Graph: parent[i] = j means edge j→i is in the tree
        self.parent: dict[int, int] = {}
        # Cost-to-come from start
        self.g: dict[int, float] = {0: 0.0, 1: float("inf")}

        self.c_best = float("inf")          # best solution cost found so far
        self.best_goal_parent: Optional[int] = None

        self.batch_size = init_batch
        self._t0 = time.perf_counter()

        # Informed set: rotation matrix & centre for ellipsoidal sampling
        self._c_min = float(np.linalg.norm(self.q_goal - self.q_start))
        self._x_centre = (self.q_start + self.q_goal) / 2.0
        self._C = self._rotation_to_world()  # dof × dof

        # Precompute joint ranges
        self.q_lo = np.array([j.q_min for j in robot.joints])
        self.q_hi = np.array([j.q_max for j in robot.joints])
        self.q_range = self.q_hi - self.q_lo

    # ── Ellipsoidal sampling (informed set) ───────────────────────────────────

    def _rotation_to_world(self) -> np.ndarray:
        """
        Rotation matrix that maps the unit ball to the prolate hyperspheroid
        aligned with the start→goal axis. Uses the first-column SVD trick.
        """
        d = self.dof
        a1 = (self.q_goal - self.q_start)
        norm = np.linalg.norm(a1)
        if norm < 1e-9:
            return np.eye(d)
        a1 /= norm
        M = np.outer(a1, np.eye(d)[0])
        U, _, Vt = np.linalg.svd(M)
        mid = np.diag([1.0] * (d - 1) + [float(np.linalg.det(U) * np.linalg.det(Vt))])
        return U @ mid @ Vt

    def _sample_informed(self) -> np.ndarray:
        """Sample uniformly from the informed prolate hyperspheroid."""
        d = self.dof
        c_best = max(self.c_best, self._c_min + 1e-6)
        # Semi-axes lengths
        r1 = c_best / 2.0
        ri = math.sqrt(c_best ** 2 - self._c_min ** 2) / 2.0
        L = np.diag([r1] + [ri] * (d - 1))
        # Sample unit ball via Muller method
        x_ball = np.random.randn(d)
        x_ball /= (np.linalg.norm(x_ball) + 1e-12)
        x_ball *= np.random.uniform(0, 1) ** (1.0 / d)
        q = self._C @ L @ x_ball + self._x_centre
        return np.clip(q, self.q_lo, self.q_hi)

    def _sample_uniform(self) -> np.ndarray:
        return np.clip(
            self.q_lo + np.random.rand(self.dof) * self.q_range,
            self.q_lo, self.q_hi,
        )

    def _sample(self) -> np.ndarray:
        if self.c_best < float("inf"):
            return self._sample_informed()
        return self._sample_uniform()

    # ── Heuristics ────────────────────────────────────────────────────────────

    def _h(self, idx: int) -> float:
        """Admissible heuristic: Euclidean distance to goal in C-space."""
        return float(np.linalg.norm(self.nodes[idx] - self.q_goal))

    def _g_hat(self, idx: int) -> float:
        """Lower-bound cost from start (Euclidean distance)."""
        return float(np.linalg.norm(self.nodes[idx] - self.q_start))

    def _f_hat(self, idx: int) -> float:
        return self._g_hat(idx) + self._h(idx)

    # ── RGG radius (shrinking ball) ────────────────────────────────────────────

    def _rgg_radius(self) -> float:
        n = len(self.nodes)
        d = self.dof
        # From BIT*: r = gamma * (log(n)/n)^(1/d)
        gamma = self.r_rgg_scale * 2.0 * (1.0 + 1.0 / d) ** (1.0 / d)
        return gamma * (math.log(max(n, 2)) / n) ** (1.0 / d)

    # ── Main loop ─────────────────────────────────────────────────────────────

    def run(self) -> Optional[list[list[float]]]:
        deadline = self._t0 + self.time_budget

        while time.perf_counter() < deadline:
            # ── Add a new batch of samples ────────────────────────────────────
            new_indices = []
            for _ in range(self.batch_size):
                if time.perf_counter() > deadline:
                    break
                q = self._sample()
                # Prune samples that cannot improve current solution
                if self._g_hat(0) + float(np.linalg.norm(q - self.q_goal)) >= self.c_best:
                    continue
                q_list = q.tolist()
                if not _is_config_collision_free(self.robot, q_list, self.obstacles, self.margin):
                    continue
                self.nodes.append(q)
                idx = len(self.nodes) - 1
                self.g[idx] = float("inf")
                new_indices.append(idx)

            # ── Build edge queue via A*-BIT* ordering ─────────────────────────
            edge_queue: list[_QItem] = []
            r = self._rgg_radius()

            all_indices = list(range(len(self.nodes)))
            for v in all_indices:
                if self.g.get(v, float("inf")) == float("inf") and v != self.START_IDX:
                    continue  # unreached node can be a child but not parent yet
                for w in all_indices:
                    if w == v:
                        continue
                    edge_cost = float(np.linalg.norm(self.nodes[v] - self.nodes[w]))
                    if edge_cost > r:
                        continue
                    # Prune: can this edge improve the solution?
                    g_v = self.g.get(v, float("inf"))
                    f_through = self._g_hat(self.START_IDX) + \
                                self._g_hat(v) + edge_cost + self._h(w)
                    if f_through >= self.c_best:
                        continue
                    g_new = g_v + edge_cost
                    if g_new >= self.g.get(w, float("inf")):
                        continue
                    priority = g_v + edge_cost + self._h(w)
                    heapq.heappush(edge_queue, _QItem(priority, w, v))

            # ── Process queue with lazy collision check ────────────────────────
            while edge_queue and time.perf_counter() < deadline:
                item = heapq.heappop(edge_queue)
                v, w = item.parent_idx, item.idx
                edge_cost = float(np.linalg.norm(self.nodes[v] - self.nodes[w]))
                g_new = self.g.get(v, float("inf")) + edge_cost

                if g_new >= self.g.get(w, float("inf")):
                    continue  # already found better path to w

                # Lazy collision check — only now
                if not _edge_collision_free(
                    self.robot, self.nodes[v].tolist(), self.nodes[w].tolist(),
                    self.obstacles, self.margin, n_checks=12
                ):
                    continue

                # Accept edge
                self.g[w] = g_new
                self.parent[w] = v

                if w == self.GOAL_IDX:
                    self.c_best = g_new
                    self.best_goal_parent = v
                    # Grow next batch adaptively
                    self.batch_size = max(
                        int(self.batch_size * self.batch_growth), self.batch_size + 10
                    )

            # ── Prune nodes outside informed set ──────────────────────────────
            if self.c_best < float("inf"):
                keep = []
                for i, q in enumerate(self.nodes):
                    if i in (self.START_IDX, self.GOAL_IDX):
                        keep.append(i)
                        continue
                    if self._g_hat(i) + self._h(i) < self.c_best:
                        keep.append(i)
                    else:
                        # Remove from tree if it was in there
                        self.parent.pop(i, None)
                        self.g.pop(i, None)
                # Remap indices
                if len(keep) < len(self.nodes):
                    old_to_new = {old: new for new, old in enumerate(keep)}
                    self.nodes = [self.nodes[i] for i in keep]
                    new_g: dict[int,float] = {}
                    new_parent: dict[int,int] = {}
                    for old_i in keep:
                        new_i = old_to_new[old_i]
                        if old_i in self.g:
                            new_g[new_i] = self.g[old_i]
                        if old_i in self.parent and self.parent[old_i] in old_to_new:
                            new_parent[new_i] = old_to_new[self.parent[old_i]]
                    self.g = new_g
                    self.parent = new_parent
                    self.START_IDX = old_to_new[self.START_IDX]
                    self.GOAL_IDX  = old_to_new[self.GOAL_IDX]

        # ── Extract best path found ────────────────────────────────────────────
        if self.GOAL_IDX not in self.parent and self.g.get(self.GOAL_IDX, float("inf")) == float("inf"):
            return None

        path = []
        idx = self.GOAL_IDX
        visited = set()
        while idx != -1 and idx not in visited:
            visited.add(idx)
            path.append(self.nodes[idx].tolist())
            idx = self.parent.get(idx, -1)
        if not path or _dist(path[-1], self.q_start.tolist()) > 0.3:
            return None
        return list(reversed(path))


def plan_abit_star(
    robot: RobotPreset,
    q_start: list[float],
    q_goal: list[float],
    obstacles: list[SceneObject],
    time_budget: float = 3.0,
    collision_margin: float = 0.02,
    init_batch: int = 150,
    batch_growth: float = 1.4,
    r_rgg_scale: float = 1.8,
    seed: Optional[int] = 42,
) -> dict:
    """
    ABIT* planner — best quality/time tradeoff for 6-DOF arms in cluttered scenes.

    Strategy:
      1. Runs within `time_budget` seconds (default 3 s — tune per use case).
      2. Finds a feasible path quickly via heuristic-guided graph search.
      3. Continuously improves path quality using informed ellipsoidal sampling.
      4. Returns the best path found when time expires.
      5. Falls back to RRT-Connect result if ABIT* finds nothing.
    """
    t0 = time.perf_counter()

    # Fast validation: check start and goal are collision-free
    if not _is_config_collision_free(robot, q_start, obstacles, collision_margin):
        return _failure("abit_star", 0.0, "Start configuration is in collision.")
    if not _is_config_collision_free(robot, q_goal, obstacles, collision_margin):
        return _failure("abit_star", 0.0, "Goal configuration is in collision.")

    # Try direct LERP first — if free, return immediately
    direct_ok = True
    for i in range(1, 9):
        t = i / 9.0
        q_mid = [q_start[j] + t * (q_goal[j] - q_start[j]) for j in range(robot.dof)]
        if not _is_config_collision_free(robot, q_mid, obstacles, collision_margin):
            direct_ok = False
            break
    if direct_ok:
        n = 30
        path = [[q_start[j] + (i/n)*(q_goal[j]-q_start[j]) for j in range(robot.dof)] for i in range(n+1)]
        elapsed = time.perf_counter() - t0
        return _build_result(robot, path, obstacles, "abit_star", elapsed,
                             f"ABIT*: direct path clear ({n+1} waypoints).")

    # Run ABIT*
    planner = _ABITStar(
        robot=robot, q_start=q_start, q_goal=q_goal,
        obstacles=obstacles, margin=collision_margin,
        time_budget=time_budget, init_batch=init_batch,
        batch_growth=batch_growth, r_rgg_scale=r_rgg_scale,
        seed=seed,
    )
    path = planner.run()
    elapsed = time.perf_counter() - t0

    if path is None or len(path) < 2:
        # Fallback: RRT-Connect with remaining budget
        remaining = max(1.0, time_budget - elapsed)
        rrt_iters = int(remaining * 1500)
        fb = plan_rrt_connect(robot, q_start, q_goal, obstacles,
                              max_iter=rrt_iters, step_size=0.15,
                              collision_margin=collision_margin, seed=seed)
        fb["message"] = "ABIT* fallback → RRT-Connect: " + fb["message"]
        fb["planner"] = "abit_star"
        fb["planning_time_s"] = round(time.perf_counter() - t0, 4)
        return fb

    # Post-process: shortcut + densify
    smooth = _shortcut(robot, path, obstacles, collision_margin, n_attempts=120)
    smooth = _densify(smooth, target_spacing=0.08)

    cost = sum(_dist(smooth[i], smooth[i+1]) for i in range(len(smooth)-1))
    n_nodes = len(planner.nodes)

    return _build_result(
        robot, smooth, obstacles, "abit_star", elapsed,
        f"ABIT*: {len(smooth)} wpts, cost={cost:.3f}, nodes={n_nodes}, "
        f"time={elapsed*1000:.0f} ms"
    )


def _densify(path: list[list[float]], target_spacing: float = 0.08) -> list[list[float]]:
    """Insert interpolated waypoints so no gap exceeds target_spacing."""
    out = [path[0]]
    for i in range(1, len(path)):
        d = _dist(path[i-1], path[i])
        n = max(1, int(math.ceil(d / target_spacing)))
        for k in range(1, n + 1):
            t = k / n
            out.append([path[i-1][j] + t*(path[i][j]-path[i-1][j]) for j in range(len(path[0]))])
    return out
