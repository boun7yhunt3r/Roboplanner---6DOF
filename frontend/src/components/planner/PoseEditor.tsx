import React, { useState } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import { api } from '@/lib/api';
import { radToDeg, degToRad } from '@/lib/utils';

/**
 * PoseEditor — two modes:
 *
 * JOINT SPACE: user drags sliders for each of the 6 joint angles (q1..q6).
 *   The robot moves to those exact joint angles. FK button computes where TCP ends up.
 *   Research use: studying C-space trajectories, joint limit behaviour, planner node distribution.
 *
 * TASK SPACE (Cartesian): user picks a TARGET POINT in 3D space [X, Y, Z].
 *   This is the pick-and-place / reach mode — "I want the hand to reach THIS point."
 *   A visual marker appears in the 3D viewport at that XYZ.
 *   IK solves the joint angles needed to reach it.
 *   Orientation (RPY) is optional — toggle it for orientation-constrained tasks.
 *   Research use: task-space planning, reachability analysis, IK solver evaluation.
 */
export function PoseEditor({ label, color }: { label: 'Start' | 'Goal'; color: string }) {
  const robot = useRobotStore(s => s.selectedRobot);
  const robotId = useRobotStore(s => s.selectedRobotId);
  const startPose = useRobotStore(s => s.startPose);
  const goalPose = useRobotStore(s => s.goalPose);
  const setStartPose = useRobotStore(s => s.setStartPose);
  const setGoalPose = useRobotStore(s => s.setGoalPose);

  const pose = label === 'Start' ? startPose : goalPose;
  const setPose = label === 'Start' ? setStartPose : setGoalPose;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);

  if (!robot) return (
    <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>No robot selected</div>
  );

  const inputStyle = {
    background: 'var(--color-surface-offset)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    outline: 'none',
  };

  const runFK = async () => {
    if (!robotId) return;
    setLoading(true);
    try {
      const r = await api.computeFK(robotId, pose.q);
      setPose({ position: r.tcp_pos, rpy: r.tcp_rpy });
    } finally { setLoading(false); }
  };

  const runIK = async () => {
    if (!robotId) return;
    setLoading(true); setErr(null);
    try {
      const r = await api.computeIK({
        robot_id: robotId,
        target_pos: pose.position,
        target_rpy: showOrientation ? pose.rpy : [0, 0, 0],
        q_init: pose.q,
        position_only: !showOrientation,
      });
      if (r.q) {
        setPose({ q: r.q });
        if (!r.converged) setErr(`IK converged with residual ${r.error.toFixed(4)} m`);
      } else {
        setErr('IK did not converge — try a different target or initial guess');
      }
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">

      {/* Mode selector */}
      <div className="flex gap-1">
        {(['joint', 'cartesian'] as const).map(m => (
          <button key={m} onClick={() => { setPose({ mode: m }); setErr(null); }}
            className="flex-1 py-1 text-xs rounded border transition-all"
            style={pose.mode === m
              ? { background: color, borderColor: color, color: '#fff' }
              : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            {m === 'joint' ? 'Joint space' : 'Task space'}
          </button>
        ))}
      </div>

      {/* ── JOINT SPACE ─────────────────────────────────────────── */}
      {pose.mode === 'joint' && (
        <div className="space-y-1">
          <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text-faint)' }}>
            Specify exact joint angles. Useful for studying planner behaviour in configuration space.
          </p>
          {robot.joints.map((j, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-mono w-8 shrink-0" style={{ color: 'var(--color-text-faint)' }}>
                {j.name}
              </span>
              <input
                type="range"
                min={radToDeg(j.q_min)} max={radToDeg(j.q_max)} step={0.5}
                value={radToDeg(pose.q[i] ?? 0)}
                onChange={e => {
                  const q = [...pose.q];
                  q[i] = degToRad(parseFloat(e.target.value));
                  setPose({ q });
                }}
                className="flex-1 h-1"
                style={{ accentColor: color }}
              />
              <span className="text-xs font-mono tabular-nums w-14 text-right" style={{ color: 'var(--color-text)' }}>
                {radToDeg(pose.q[i] ?? 0).toFixed(1)}°
              </span>
            </div>
          ))}
          <button
            onClick={runFK} disabled={loading}
            className="w-full text-xs py-1 rounded border mt-2 transition-all"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            {loading ? 'Computing…' : '→ Compute TCP position (FK)'}
          </button>
          {pose.position && (
            <p className="text-xs font-mono tabular-nums pt-1" style={{ color: 'var(--color-text-faint)' }}>
              TCP: [{pose.position.map(v => v.toFixed(3)).join(', ')}]
            </p>
          )}
        </div>
      )}

      {/* ── TASK SPACE ──────────────────────────────────────────── */}
      {pose.mode === 'cartesian' && (
        <div className="space-y-3">

          {/* Explanation callout */}
          <div className="px-2 py-2 rounded text-xs leading-relaxed"
            style={{ background: 'var(--color-surface-offset)', border: `1px solid ${color}22`, color: 'var(--color-text-muted)' }}>
            {label === 'Goal'
              ? <>Set where the robot's hand must <strong style={{ color }}>reach</strong> in 3D space. A marker appears in the viewport. Press <em>Solve IK</em> to compute joint angles that achieve this target.</>
              : <>Set the 3D position the robot starts from. Press <em>Solve IK</em> to compute matching joint angles.</>
            }
          </div>

          {/* XYZ position — the primary input */}
          <div>
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Target position (metres)
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((ax, i) => (
                <label key={ax} className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{ax}</span>
                  <input
                    type="number" step={0.01}
                    value={pose.position[i].toFixed(3)}
                    onChange={e => {
                      const p = [...pose.position] as [number, number, number];
                      p[i] = parseFloat(e.target.value) || 0;
                      setPose({ position: p });
                    }}
                    className="w-full px-1.5 py-1 text-xs font-mono rounded"
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Orientation — optional, collapsed by default */}
          <div>
            <button
              onClick={() => setShowOrientation(v => !v)}
              className="flex items-center gap-1.5 text-xs transition-all"
              style={{ color: showOrientation ? color : 'var(--color-text-faint)' }}>
              <span>{showOrientation ? '▾' : '▸'}</span>
              <span>Orientation constraint (RPY, rad)</span>
            </button>

            {showOrientation && (
              <div className="mt-2 space-y-1">
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-faint)' }}>
                  Constrain the end-effector orientation at the target. Leave collapsed for position-only IK.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Roll', 'Pitch', 'Yaw'] as const).map((ax, i) => (
                    <label key={ax} className="flex flex-col gap-0.5">
                      <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{ax}</span>
                      <input
                        type="number" step={0.05}
                        value={pose.rpy[i].toFixed(3)}
                        onChange={e => {
                          const rpy = [...pose.rpy] as [number, number, number];
                          rpy[i] = parseFloat(e.target.value) || 0;
                          setPose({ rpy });
                        }}
                        className="w-full px-1.5 py-1 text-xs font-mono rounded"
                        style={inputStyle}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* IK solve */}
          <button
            onClick={runIK} disabled={loading}
            className="w-full py-1.5 text-xs rounded border transition-all font-medium"
            style={loading
              ? { borderColor: 'var(--color-border)', color: 'var(--color-text-faint)' }
              : { borderColor: color, color: color, background: `${color}18` }}>
            {loading ? 'Solving IK…' : '→ Solve IK  (compute joint angles)'}
          </button>

          {/* IK result summary */}
          {!loading && !err && pose.q.some(v => v !== 0) && (
            <div className="px-2 py-1.5 rounded text-xs font-mono tabular-nums"
              style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-faint)' }}>
              q: [{pose.q.map(v => radToDeg(v).toFixed(1)).join(', ')}]°
            </div>
          )}

          {err && (
            <p className="text-xs px-2 py-1 rounded"
              style={{ background: 'var(--color-warning-dim)', color: 'var(--color-warning)' }}>
              ⚠ {err}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
