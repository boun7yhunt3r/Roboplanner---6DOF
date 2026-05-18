import React, { useState } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import { cn } from '@/lib/utils';
import { radToDeg } from '@/lib/utils';

export function RobotSelector() {
  const { robots, selectedRobotId, selectRobot } = useRobotStore();
  const [step, setStep] = useState(0);
  const robot = robots.find(r=>r.id===selectedRobotId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 text-xs">
        {['Source','Configure','Review'].map((s,i)=>(
          <React.Fragment key={s}>
            <button onClick={()=>setStep(i)}
              className="px-1.5 py-0.5 rounded transition-all"
              style={step===i?{background:'var(--color-primary)',color:'#fff'}
                :step>i?{color:'var(--color-primary)'}:{color:'var(--color-text-faint)'}}>
              {i+1}. {s}
            </button>
            {i<2 && <span style={{color:'var(--color-text-faint)'}}>›</span>}
          </React.Fragment>
        ))}
      </div>

      {step===0 && (
        <div className="space-y-2">
          <button onClick={()=>setStep(1)}
            className="w-full text-left px-3 py-2 rounded border text-sm transition-all"
            style={{borderColor:'var(--color-primary)',background:'var(--color-primary-dim)',color:'var(--color-primary)'}}>
            📦 Built-in preset
          </button>
          <div className="px-3 py-2 rounded border text-sm opacity-40 cursor-not-allowed"
            style={{borderColor:'var(--color-border)',color:'var(--color-text-muted)'}}>
            📄 Custom DH table (v2)
          </div>
          <div className="px-3 py-2 rounded border text-sm opacity-40 cursor-not-allowed"
            style={{borderColor:'var(--color-border)',color:'var(--color-text-muted)'}}>
            🗂 URDF import (v2)
          </div>
        </div>
      )}

      {step===1 && (
        <div className="space-y-2">
          {robots.map(r=>(
            <button key={r.id} onClick={()=>{selectRobot(r.id,r);setStep(2);}}
              className="w-full text-left px-3 py-2 rounded border transition-all"
              style={selectedRobotId===r.id
                ?{borderColor:'var(--color-primary)',background:'var(--color-primary-dim)'}
                :{borderColor:'var(--color-border)',background:'var(--color-surface-offset)'}}>
              <div className="text-sm font-medium" style={{color:'var(--color-text)'}}>{r.name}</div>
              <div className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>
                Reach: {(r.reach*1000).toFixed(0)} mm · {r.dof} DOF
              </div>
            </button>
          ))}
        </div>
      )}

      {step===2 && robot && (
        <div className="space-y-2">
          <div className="px-3 py-2 rounded border" style={{borderColor:'var(--color-border)',background:'var(--color-surface-offset)'}}>
            <div className="text-sm font-semibold" style={{color:'var(--color-text)'}}>{robot.name}</div>
            <div className="text-xs mt-1" style={{color:'var(--color-text-muted)'}}>{robot.description}</div>
            <div className="flex gap-4 mt-2">
              {[['Reach',`${(robot.reach*1000).toFixed(0)} mm`],['DOF',String(robot.dof)]].map(([l,v])=>(
                <div key={l}>
                  <div className="text-xs" style={{color:'var(--color-text-faint)'}}>{l}</div>
                  <div className="text-sm font-semibold tabular-nums" style={{color:'var(--color-text)'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b" style={{borderColor:'var(--color-divider)',color:'var(--color-text-faint)'}}>
                <th className="text-left py-1">J</th><th className="text-right">a</th>
                <th className="text-right">α°</th><th className="text-right">d</th>
                <th className="text-right">range°</th>
              </tr>
            </thead>
            <tbody>
              {robot.joints.map((j,i)=>(
                <tr key={i} className="border-b" style={{borderColor:'var(--color-divider)',color:'var(--color-text-muted)'}}>
                  <td className="py-0.5" style={{color:'var(--color-text)'}}>{j.name}</td>
                  <td className="text-right">{j.a.toFixed(3)}</td>
                  <td className="text-right">{(j.alpha*180/Math.PI).toFixed(0)}</td>
                  <td className="text-right">{j.d.toFixed(3)}</td>
                  <td className="text-right">{(j.q_min*180/Math.PI).toFixed(0)}…{(j.q_max*180/Math.PI).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={()=>setStep(1)} className="text-xs" style={{color:'var(--color-text-muted)'}}>← Change robot</button>
        </div>
      )}
    </div>
  );
}
