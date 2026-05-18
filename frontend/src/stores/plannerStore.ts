import { create } from 'zustand';
import type { PlanResult, PlannerSettings } from '@/types/planner';

interface AnimState { playing:boolean; frame:number; speed:number; showTcpTrail:boolean; }

interface PlannerState {
  settings: PlannerSettings; result:PlanResult|null; isPlanning:boolean; error:string|null;
  anim: AnimState; comparisonResult:PlanResult|null;
  setSettings:(s:Partial<PlannerSettings>)=>void; setResult:(r:PlanResult|null)=>void;
  setIsPlanning:(v:boolean)=>void; setError:(e:string|null)=>void;
  setAnim:(a:Partial<AnimState>)=>void; storeComparison:()=>void;
}

export const usePlannerStore = create<PlannerState>((set,get) => ({
  settings:{
    planner:'abit_star',
    n_steps:40, step_size:0.15, collision_margin:0.02,
    smoothing:true, seed:42, max_iterations:3000, goal_bias:0.15,
    time_budget:3.0, init_batch:150, batch_growth:1.4,
  },
  result:null, isPlanning:false, error:null, comparisonResult:null,
  anim:{ playing:false, frame:0, speed:1.0, showTcpTrail:true },
  setSettings: s => set(st=>({settings:{...st.settings,...s}})),
  setResult: r => set({result:r, anim:{playing:false,frame:0,speed:1.0,showTcpTrail:true}}),
  setIsPlanning: isPlanning => set({isPlanning}),
  setError: error => set({error}),
  setAnim: a => set(s=>({anim:{...s.anim,...a}})),
  storeComparison: () => set(s=>({comparisonResult:s.result})),
}));
