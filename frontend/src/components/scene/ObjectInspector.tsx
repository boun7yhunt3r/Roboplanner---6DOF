import React, { useRef, useCallback } from 'react';
import { useSceneStore } from '@/stores/sceneStore';

/** Slider row with scroll-to-adjust support */
function SliderField({
  label, value, min, max, step, onChange, unit = '',
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; unit?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? step : -step;
    const next = Math.round(Math.min(max, Math.max(min, value + delta)) / step) * step;
    onChange(parseFloat(next.toFixed(6)));
  }, [value, min, max, step, onChange]);

  return (
    <div ref={ref} className="space-y-0.5" onWheel={onWheel}>
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</span>
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>
          {value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded"
        style={{ accentColor: 'var(--color-primary)', cursor: 'ew-resize' }}
      />
    </div>
  );
}

export function ObjectInspector() {
  const selectedId = useSceneStore(s => s.selectedId);
  const objects = useSceneStore(s => s.objects);
  const updateObject = useSceneStore(s => s.updateObject);
  const obj = objects.find(o => o.id === selectedId);

  if (!obj) return (
    <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-faint)' }}>
      Click an object in the scene list<br />to inspect and edit it
    </p>
  );

  const inputStyle = {
    background: 'var(--color-surface-offset)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    outline: 'none',
  };

  // Size axis labels per primitive
  const sizeConfig = obj.type === 'box'
    ? [{ label: 'Width (X)', key: 0 }, { label: 'Depth (Y)', key: 1 }, { label: 'Height (Z)', key: 2 }]
    : obj.type === 'sphere'
    ? [{ label: 'Radius', key: 0 }]
    : [{ label: 'Radius', key: 0 }, { label: 'Height', key: 2 }];

  return (
    <div className="space-y-4">

      {/* Name */}
      <div>
        <div className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Name</div>
        <input
          value={obj.name}
          onChange={e => updateObject(obj.id, { name: e.target.value })}
          className="w-full px-2 py-1 text-sm rounded"
          style={inputStyle}
        />
      </div>

      {/* Position */}
      <div className="space-y-2">
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Position (m) — scroll to adjust
        </div>
        {['X', 'Y', 'Z'].map((ax, i) => (
          <SliderField
            key={ax}
            label={ax}
            value={obj.position[i]}
            min={-2} max={2} step={0.005}
            onChange={v => {
              const p = [...obj.position] as [number, number, number];
              p[i] = v;
              updateObject(obj.id, { position: p });
            }}
            unit=" m"
          />
        ))}
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Rotation (deg) — scroll or drag
        </div>
        {['Roll (X)', 'Pitch (Y)', 'Yaw (Z)'].map((ax, i) => (
          <SliderField
            key={ax}
            label={ax}
            value={obj.rotation[i]}
            min={-180} max={180} step={1}
            onChange={v => {
              const r = [...obj.rotation] as [number, number, number];
              r[i] = v;
              updateObject(obj.id, { rotation: r });
            }}
            unit="°"
          />
        ))}
      </div>

      {/* Size */}
      <div className="space-y-2">
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Size (m) — scroll to resize
        </div>
        {sizeConfig.map(({ label, key }) => (
          <SliderField
            key={label}
            label={label}
            value={obj.size[key]}
            min={0.01} max={1.0} step={0.005}
            onChange={v => {
              const s = [...obj.size] as [number, number, number];
              s[key] = v;
              // for sphere keep all three equal
              if (obj.type === 'sphere') { s[0] = v; s[1] = v; s[2] = v; }
              updateObject(obj.id, { size: s });
            }}
            unit=" m"
          />
        ))}
      </div>

      {/* Color */}
      <div className="flex items-center gap-3">
        <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Color</div>
        <input
          type="color" value={obj.color}
          onChange={e => updateObject(obj.id, { color: e.target.value })}
          className="w-8 h-6 rounded cursor-pointer"
          style={{ border: '1px solid var(--color-border)', background: 'transparent' }}
        />
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{obj.color}</span>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded"
          style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-faint)', border: '1px solid var(--color-border)' }}>
          {obj.type}
        </span>
        <button
          onClick={() => updateObject(obj.id, { visible: !obj.visible })}
          className="text-xs px-2 py-0.5 rounded transition-all"
          style={{
            background: obj.visible ? 'var(--color-primary-dim)' : 'var(--color-surface-offset)',
            color: obj.visible ? 'var(--color-primary)' : 'var(--color-text-faint)',
            border: `1px solid ${obj.visible ? 'var(--color-primary)' : 'var(--color-border)'}`,
          }}>
          {obj.visible ? '👁 Visible' : '— Hidden'}
        </button>
      </div>
    </div>
  );
}
