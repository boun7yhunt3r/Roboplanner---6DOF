import React from 'react';
import { usePlannerStore } from '@/stores/plannerStore';
import { useRobotStore } from '@/stores/robotStore';

export function AnimationBar() {
  const result = usePlannerStore(s=>s.result);
  const anim = usePlannerStore(s=>s.anim);
  const setAnim = usePlannerStore(s=>s.setAnim);
  const setCurrentQ = useRobotStore(s=>s.setCurrentQ);

  const total = result ? result.waypoints.length-1 : 0;

  if (!result) return (
    <div className="flex items-center justify-center h-full text-xs" style={{color:'var(--color-text-faint)'}}>
      Run planner to enable animation
    </div>
  );

  const scrub = (f:number) => { setAnim({frame:f,playing:false}); if(result.waypoints[f]) setCurrentQ(result.waypoints[f].q); };
  const reset = () => { setAnim({playing:false,frame:0}); if(result.waypoints[0]) setCurrentQ(result.waypoints[0].q); };
  const exportCSV = () => {
    const csv=['frame,'+result.waypoints[0].q.map((_,i)=>`q${i}`).join(',')+',tcp_x,tcp_y,tcp_z',
      ...result.waypoints.map((wp,i)=>[i,...wp.q.map(q=>q.toFixed(5)),...wp.tcp_pos.map(p=>p.toFixed(5))].join(','))].join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='path.csv'; a.click();
  };

  const wp = result.waypoints[Math.min(anim.frame, total)];

  return (
    <div className="flex items-center gap-3 h-full px-3">
      <button onClick={reset} className="p-1 text-sm transition-all" style={{color:'var(--color-text-muted)'}} title="Reset">⏮</button>
      <button onClick={()=>setAnim({playing:!anim.playing})}
        className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all"
        style={anim.playing?{background:'var(--color-primary)',color:'#fff'}:{color:'var(--color-text)'}}>
        {anim.playing?'⏸':'▶'}
      </button>
      <span className="text-xs font-mono tabular-nums w-16 shrink-0" style={{color:'var(--color-text-faint)'}}>
        {anim.frame}/{total}
      </span>
      <input type="range" min={0} max={total} value={anim.frame} onChange={e=>scrub(parseInt(e.target.value))}
        className="flex-1 h-1" style={{accentColor:'var(--color-path)'}} />
      <select value={anim.speed} onChange={e=>setAnim({speed:parseFloat(e.target.value)})}
        className="text-xs rounded px-1 py-0.5"
        style={{background:'var(--color-surface-offset)',border:'1px solid var(--color-border)',color:'var(--color-text)'}}>
        {[0.25,0.5,1,2,4].map(s=><option key={s} value={s}>{s}×</option>)}
      </select>
      <button onClick={()=>setAnim({showTcpTrail:!anim.showTcpTrail})}
        className="text-xs px-2 py-0.5 rounded border transition-all"
        style={anim.showTcpTrail?{borderColor:'var(--color-path)',color:'var(--color-path)'}:{borderColor:'var(--color-border)',color:'var(--color-text-faint)'}}>
        Trail
      </button>
      {wp && (
        <span className="text-xs font-mono tabular-nums hidden xl:inline" style={{color:'var(--color-text-muted)'}}>
          TCP [{wp.tcp_pos.map(v=>v.toFixed(3)).join(', ')}]
        </span>
      )}
      <button onClick={exportCSV} className="text-xs px-2 py-0.5 rounded border transition-all shrink-0"
        style={{borderColor:'var(--color-border)',color:'var(--color-text-muted)'}}>↓ CSV</button>
    </div>
  );
}
