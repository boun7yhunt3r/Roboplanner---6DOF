import React from 'react';
import { ObjectInspector } from '@/components/scene/ObjectInspector';
import { usePlannerStore } from '@/stores/plannerStore';

export function RightInspector() {
  const result = usePlannerStore(s => s.result);
  const compResult = usePlannerStore(s => s.comparisonResult);

  const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: color ?? 'var(--color-text)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-faint)', marginBottom: '10px' }}>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '12px' }}>

      {/* Object inspector */}
      <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-divider)' }}>
        <SectionTitle>Selected Object</SectionTitle>
        <ObjectInspector />
      </div>

      {/* Plan result */}
      {result ? (
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: compResult ? '1px solid var(--color-divider)' : 'none' }}>
          <SectionTitle>Plan Metrics</SectionTitle>
          <Row label="Status" value={result.success ? '✓ Success' : '✕ Collision'}
            color={result.success ? 'var(--color-success)' : 'var(--color-error)'} />
          <Row label="Planner" value={result.planner.replace('_', ' ')} />
          <Row label="Time" value={`${(result.planning_time_s * 1000).toFixed(1)} ms`} />
          <Row label="Waypoints" value={String(result.metrics.n_waypoints)} />
          <Row label="Cart. dist" value={`${result.metrics.cartesian_path_length.toFixed(3)} m`} />
          <Row label="Joint dist" value={`${result.metrics.joint_path_length.toFixed(3)} rad`} />
          <Row label="Smoothness" value={result.metrics.smoothness.toFixed(5)} />
          {result.metrics.min_clearance != null && (
            <Row label="Clearance"
              value={`${result.metrics.min_clearance.toFixed(3)} m`}
              color={result.metrics.min_clearance < 0.03 ? 'var(--color-warning)' : 'var(--color-success)'} />
          )}
          <p style={{ marginTop: '8px', fontSize: '11px', fontStyle: 'italic', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
            {result.message}
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: '16px' }}>
          <SectionTitle>Plan Metrics</SectionTitle>
          <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', textAlign: 'center', padding: '16px 0' }}>
            Run the planner to see metrics here
          </p>
        </div>
      )}

      {/* Comparison */}
      {compResult && (
        <div>
          <SectionTitle>
            <span style={{ color: 'var(--color-error)' }}>⊞ Comparison</span>
          </SectionTitle>
          <Row label="Planner" value={compResult.planner.replace('_', ' ')} />
          <Row label="Time" value={`${(compResult.planning_time_s * 1000).toFixed(1)} ms`} />
          <Row label="Cart. dist" value={`${compResult.metrics.cartesian_path_length.toFixed(3)} m`} />
          <Row label="Smoothness" value={compResult.metrics.smoothness.toFixed(5)} />
          {compResult.metrics.min_clearance != null && (
            <Row label="Clearance" value={`${compResult.metrics.min_clearance.toFixed(3)} m`} />
          )}
        </div>
      )}
    </div>
  );
}
