import React, { useState } from 'react';
import { RobotSelector } from '@/components/robot/RobotSelector';
import { SceneEditor } from '@/components/scene/SceneEditor';
import { PoseEditor } from '@/components/planner/PoseEditor';
import { PlannerSettings } from '@/components/planner/PlannerSettings';

type S = 'robot'|'scene'|'start'|'goal'|'planner';
const SECTIONS: {key:S;label:string;icon:string}[] = [
  {key:'robot',   label:'Robot',      icon:'🤖'},
  {key:'scene',   label:'Scene',      icon:'📦'},
  {key:'start',   label:'Start Pose', icon:'⬤'},
  {key:'goal',    label:'Goal Pose',  icon:'◎'},
  {key:'planner', label:'Planner',    icon:'⚙'},
];

export function LeftPanel() {
  const [open, setOpen] = useState<S[]>(['robot','planner']);
  const toggle = (s:S) => setOpen(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  return (
    <div className="flex flex-col">
      {SECTIONS.map(({key,label,icon})=>(
        <div key={key} className="border-b" style={{borderColor:'var(--color-divider)'}}>
          <button onClick={()=>toggle(key)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-all"
            style={{color:'var(--color-text)'}}>
            <span className="flex items-center gap-2 text-sm font-medium">
              <span>{icon}</span>{label}
            </span>
            <span className="text-xs" style={{color:'var(--color-text-faint)'}}>{open.includes(key)?'▾':'▸'}</span>
          </button>
          {open.includes(key) && (
            <div className="px-4 pb-4 pt-1">
              {key==='robot'   && <RobotSelector />}
              {key==='scene'   && <SceneEditor />}
              {key==='start'   && <PoseEditor label="Start" color="var(--color-start)" />}
              {key==='goal'    && <PoseEditor label="Goal"  color="var(--color-goal)"  />}
              {key==='planner' && <PlannerSettings />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
