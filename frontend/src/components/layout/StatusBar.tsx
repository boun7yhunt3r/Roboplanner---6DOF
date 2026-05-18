import React from 'react';
import { usePlannerStore } from '@/stores/plannerStore';

export function StatusBar() {
  const result = usePlannerStore(s=>s.result);
  const isPlanning = usePlannerStore(s=>s.isPlanning);
  const error = usePlannerStore(s=>s.error);

  if (isPlanning) return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
        style={{borderColor:'var(--color-primary)',borderTopColor:'transparent'}} />
      <span className="text-xs" style={{color:'var(--color-text-muted)'}}>Planning…</span>
    </div>
  );
  if (error) return <span className="text-xs" style={{color:'var(--color-error)'}}>✕ {error}</span>;
  if (!result) return <span className="text-xs" style={{color:'var(--color-text-faint)'}}>Configure robot, scene, poses → Run Planner</span>;

  const m = result.metrics;
  const Pill = ({label,value,color}:{label:string;value:string;color?:string}) => (
    <div className="flex flex-col items-center leading-none">
      <span className="uppercase tracking-wide" style={{fontSize:'9px',color:'var(--color-text-faint)'}}>{label}</span>
      <span className="text-xs font-mono font-semibold tabular-nums mt-0.5" style={{color:color??'var(--color-text)'}}>{value}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-5">
      <Pill label="Status" value={result.success?'SUCCESS':'COLLISION'} color={result.success?'var(--color-success)':'var(--color-error)'} />
      <Pill label="Time" value={`${(result.planning_time_s*1000).toFixed(1)}ms`} />
      <Pill label="Waypoints" value={String(m.n_waypoints)} />
      <Pill label="Cart dist" value={`${m.cartesian_path_length.toFixed(3)}m`} />
      <Pill label="Smoothness" value={m.smoothness.toFixed(4)} />
      {m.min_clearance!=null && <Pill label="Clearance" value={`${m.min_clearance.toFixed(3)}m`} />}
    </div>
  );
}
