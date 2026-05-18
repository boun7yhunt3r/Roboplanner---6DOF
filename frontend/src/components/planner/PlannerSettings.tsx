import React from 'react';
import { usePlannerStore } from '@/stores/plannerStore';
import { useRobotStore } from '@/stores/robotStore';
import { useSceneStore } from '@/stores/sceneStore';
import { api } from '@/lib/api';

type Planner = 'cartesian_lerp' | 'rrt_connect' | 'abit_star';

const PLANNER_LABELS: Record<Planner, string> = {
  cartesian_lerp: 'LERP',
  rrt_connect:    'RRT-Connect',
  abit_star:      'ABIT★',
};
const PLANNER_DESC: Record<Planner, string> = {
  cartesian_lerp: 'Straight-line joint interpolation. Instant, no obstacle avoidance.',
  rrt_connect:    'Bidirectional RRT-Connect. Fast, collision-aware.',
  abit_star:      'Adaptively Batched Informed Trees*. Best quality/time tradeoff — finds & refines path within time budget.',
};

export function PlannerSettings() {
  const { settings, setSettings, setResult, setIsPlanning, isPlanning, setError, storeComparison } = usePlannerStore();
  const robotId   = useRobotStore(s => s.selectedRobotId);
  const startPose = useRobotStore(s => s.startPose);
  const goalPose  = useRobotStore(s => s.goalPose);
  const objects   = useSceneStore(s => s.objects);

  const planner = (settings.planner ?? 'abit_star') as Planner;

  const handlePlan = async () => {
    if (!robotId) return;
    setIsPlanning(true); setError(null);
    try {
      const result = await api.plan({
        robot_id: robotId, q_start: startPose.q, q_goal: goalPose.q,
        obstacles: objects, ...settings,
      });
      setResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsPlanning(false);
    }
  };

  const Num = ({
    label, val, onChange, step = 1, min, max, dec = 0,
  }: { label: string; val: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; dec?: number }) => (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</span>
      <input type="number" step={step} min={min} max={max}
        value={dec > 0 ? val.toFixed(dec) : val}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="px-2 py-1 text-xs font-mono rounded"
        style={{ background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none' }}
      />
    </label>
  );

  return (
    <div className="space-y-3">

      {/* Planner tabs */}
      <div className="flex gap-1">
        {(Object.keys(PLANNER_LABELS) as Planner[]).map(p => (
          <button key={p} onClick={() => setSettings({ planner: p })}
            className="flex-1 py-1 text-xs rounded border transition-all"
            style={planner === p
              ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
              : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            {PLANNER_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-xs leading-snug" style={{ color: 'var(--color-text-faint)' }}>
        {PLANNER_DESC[planner]}
      </p>

      {/* Settings per planner */}
      <div className="grid grid-cols-2 gap-2">
        {planner === 'cartesian_lerp' && (
          <Num label="Steps" val={settings.n_steps} onChange={v => setSettings({ n_steps: v })} step={5} min={10} max={200} />
        )}

        {planner === 'rrt_connect' && (<>
          <Num label="Max iter" val={settings.max_iterations} onChange={v => setSettings({ max_iterations: v })} step={500} min={500} max={10000} />
          <Num label="Step size" val={settings.step_size} onChange={v => setSettings({ step_size: v })} step={0.05} min={0.05} max={0.5} dec={2} />
          <Num label="Seed" val={settings.seed ?? 42} onChange={v => setSettings({ seed: v })} step={1} min={0} />
        </>)}

        {planner === 'abit_star' && (<>
          <Num label="Time budget (s)" val={settings.time_budget ?? 3.0} onChange={v => setSettings({ time_budget: v })} step={0.5} min={0.5} max={30} dec={1} />
          <Num label="Init batch" val={settings.init_batch ?? 150} onChange={v => setSettings({ init_batch: v })} step={50} min={50} max={1000} />
          <Num label="Batch growth" val={settings.batch_growth ?? 1.4} onChange={v => setSettings({ batch_growth: v })} step={0.1} min={1.0} max={3.0} dec={1} />
          <Num label="Seed" val={settings.seed ?? 42} onChange={v => setSettings({ seed: v })} step={1} min={0} />
        </>)}

        <Num label="Col. margin (m)" val={settings.collision_margin} onChange={v => setSettings({ collision_margin: v })} step={0.005} min={0} max={0.15} dec={3} />
      </div>

      {/* ABIT* quality indicator */}
      {planner === 'abit_star' && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
          style={{ background: 'var(--color-primary-dim)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
          <span>★</span>
          <span>Recommended — obstacle-aware, anytime-optimal</span>
        </div>
      )}

      {/* Run + compare */}
      <div className="flex gap-2">
        <button onClick={handlePlan} disabled={isPlanning || !robotId}
          className="flex-1 py-2 rounded text-sm font-medium transition-all"
          style={isPlanning || !robotId
            ? { background: 'var(--color-surface-offset)', color: 'var(--color-text-faint)', cursor: 'not-allowed' }
            : { background: 'var(--color-primary)', color: '#fff' }}>
          {isPlanning
            ? <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-white rounded-full animate-spin"
                  style={{ borderTopColor: 'transparent' }} />
                Planning…
              </span>
            : '▶ Run Planner'}
        </button>
        <button onClick={storeComparison} title="Store current result for comparison"
          className="px-3 py-2 rounded text-xs border transition-all"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>⊞</button>
      </div>
    </div>
  );
}
