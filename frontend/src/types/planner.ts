export interface Waypoint {
  q: number[];
  tcp_pos: [number,number,number];
  tcp_rpy: [number,number,number];
  frames: [number,number,number][];
}
export interface CollisionResult {
  colliding: boolean;
  first_collision_idx: number|null;
  details: Array<{waypoint:number;link:number;obstacle:string}>;
}
export interface PathMetrics {
  joint_path_length: number; cartesian_path_length: number;
  smoothness: number; min_clearance: number|null; n_waypoints: number;
}
export interface PlanResult {
  success: boolean; planner: string; waypoints: Waypoint[];
  collision: CollisionResult; metrics: PathMetrics;
  planning_time_s: number; message: string;
}
export interface PlannerSettings {
  planner: string;
  n_steps: number; step_size: number; collision_margin: number;
  smoothing: boolean; seed: number|null;
  max_iterations: number; goal_bias: number;
  // ABIT*
  time_budget: number; init_batch: number; batch_growth: number;
}
export interface PoseSpec {
  mode: 'joint'|'cartesian';
  q: number[];
  position: [number,number,number];
  rpy: [number,number,number];
}
