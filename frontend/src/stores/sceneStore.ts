import { create } from 'zustand';
import type { SceneObject } from '@/types/scene';

let _id = 0;
const nid = () => `obj_${++_id}_${Date.now()}`;

// Default spawn positions are in the robot's visible workspace so user can see & drag them immediately
const DEFAULTS: Record<SceneObject['type'], Omit<SceneObject,'id'|'name'>> = {
  box:      {type:'box',      position:[0.25, 0.10, 0.15], rotation:[0,0,0], size:[0.12,0.12,0.12], color:'#8a7560', visible:true},
  sphere:   {type:'sphere',   position:[0.25, 0.10, 0.20], rotation:[0,0,0], size:[0.06,0.06,0.06], color:'#4f98a3', visible:true},
  cylinder: {type:'cylinder', position:[0.25, 0.10, 0.20], rotation:[0,0,0], size:[0.04,0.04,0.30], color:'#6a6a7a', visible:true},
};

interface SceneState {
  objects: SceneObject[];
  selectedId: string | null;
  showGrid: boolean;
  showAxes: boolean;
  cameraPreset: 'iso' | 'top' | 'front' | 'side';

  addObject: (t: SceneObject['type']) => void;
  updateObject: (id: string, p: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  setObjects: (o: SceneObject[]) => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  setCameraPreset: (p: SceneState['cameraPreset']) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: [],
  selectedId: null,
  showGrid: true,
  showAxes: true,
  cameraPreset: 'iso',

  addObject: type => {
    const id = nid();
    const n = get().objects.filter(o => o.type === type).length + 1;
    // Offset each new object slightly so they don't stack on top of each other
    const offset = (get().objects.length * 0.07) % 0.3;
    const base = { ...DEFAULTS[type] };
    const pos: [number,number,number] = [
      base.position[0] + offset,
      base.position[1],
      base.position[2],
    ];
    set(s => ({
      objects: [...s.objects, { id, name: `${type} ${n}`, ...base, position: pos }],
      selectedId: id,
    }));
  },

  updateObject: (id, p) =>
    set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, ...p } : o) })),

  removeObject: id =>
    set(s => ({
      objects: s.objects.filter(o => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  duplicateObject: id => {
    const o = get().objects.find(x => x.id === id);
    if (!o) return;
    const no: SceneObject = {
      ...o, id: nid(), name: `${o.name} copy`,
      position: [o.position[0] + 0.07, o.position[1] + 0.07, o.position[2]],
    };
    set(s => ({ objects: [...s.objects, no], selectedId: no.id }));
  },

  selectObject: id => set({ selectedId: id }),
  setObjects: objects => set({ objects }),
  toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
  toggleAxes: () => set(s => ({ showAxes: !s.showAxes })),
  setCameraPreset: cameraPreset => set({ cameraPreset }),
}));
