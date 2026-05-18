import { create } from 'zustand';
import type { RobotSummary } from '@/types/robot';
import type { PoseSpec } from '@/types/planner';

const defaultPose = (dof=6): PoseSpec => ({ mode:'joint', q:Array(dof).fill(0), position:[0.3,0,0.4], rpy:[0,0,0] });

interface RobotState {
  robots: RobotSummary[]; selectedRobotId: string|null; selectedRobot: RobotSummary|null;
  startPose: PoseSpec; goalPose: PoseSpec; currentQ: number[];
  setRobots:(r:RobotSummary[])=>void; selectRobot:(id:string,r:RobotSummary)=>void;
  setStartPose:(p:Partial<PoseSpec>)=>void; setGoalPose:(p:Partial<PoseSpec>)=>void;
  setCurrentQ:(q:number[])=>void; swapPoses:()=>void;
}

export const useRobotStore = create<RobotState>((set,get) => ({
  robots:[], selectedRobotId:null, selectedRobot:null,
  startPose: defaultPose(),
  goalPose: { mode:'joint', q:[0,-1.2,1.2,0,0.5,0], position:[0.5,0.2,0.3], rpy:[0,0,0] },
  currentQ: Array(6).fill(0),
  setRobots: robots => set({robots}),
  selectRobot: (id,robot) => set({ selectedRobotId:id, selectedRobot:robot,
    startPose:defaultPose(robot.dof),
    goalPose:{mode:'joint',q:Array(robot.dof).fill(0).map((_,i)=>i===1?-1.2:i===2?1.2:0),position:[0.5,0.2,0.3],rpy:[0,0,0]},
    currentQ:Array(robot.dof).fill(0) }),
  setStartPose: p => set(s=>({startPose:{...s.startPose,...p}})),
  setGoalPose:  p => set(s=>({goalPose:{...s.goalPose,...p}})),
  setCurrentQ:  q => set({currentQ:q}),
  swapPoses: () => set(s=>({startPose:s.goalPose,goalPose:s.startPose})),
}));
