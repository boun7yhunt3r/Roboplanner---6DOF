import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { api } from '@/lib/api';

export function SceneEditor() {
  const objects = useSceneStore(s => s.objects);
  const selectedId = useSceneStore(s => s.selectedId);
  const selectObject = useSceneStore(s => s.selectObject);
  const addObject = useSceneStore(s => s.addObject);
  const removeObject = useSceneStore(s => s.removeObject);
  const duplicateObject = useSceneStore(s => s.duplicateObject);
  const updateObject = useSceneStore(s => s.updateObject);
  const setObjects = useSceneStore(s => s.setObjects);

  const loadPreset = async (name: string) => {
    try {
      const data = await api.getExampleScene(name);
      setObjects(data.objects ?? []);
    } catch (e) { console.error(e); }
  };

  const exportScene = () => {
    const blob = new Blob([JSON.stringify({ objects }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scene.json';
    a.click();
  };

  const importScene = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        setObjects(data.objects ?? []);
      } catch { alert('Invalid scene JSON'); }
    };
    input.click();
  };

  const s = (active: boolean) => ({
    flex: '1', padding: '4px 0', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
    background: active ? 'var(--color-primary-dim)' : 'var(--color-surface-offset)',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
    transition: 'all 150ms',
  } as React.CSSProperties);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Presets */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {['empty', 'simple', 'cluttered'].map(name => (
          <button key={name} onClick={() => loadPreset(name)} style={s(false)}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
            {name}
          </button>
        ))}
      </div>

      {/* Add objects */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['box', 'sphere', 'cylinder'] as const).map(type => (
          <button key={type} onClick={() => addObject(type)} style={s(false)}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
            + {type}
          </button>
        ))}
      </div>

      {/* Object list */}
      <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {objects.length === 0 && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', textAlign: 'center', padding: '12px 0' }}>
            No objects — add one above or load a preset
          </p>
        )}
        {objects.map(obj => (
          <div
            key={obj.id}
            onClick={() => selectObject(obj.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 8px', borderRadius: '4px', cursor: 'pointer',
              background: selectedId === obj.id ? 'var(--color-primary-dim)' : 'transparent',
              border: `1px solid ${selectedId === obj.id ? 'var(--color-primary)' : 'transparent'}`,
              opacity: obj.visible ? 1 : 0.45,
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: obj.color }} />
            <span style={{ fontSize: '12px', flex: 1, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {obj.name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-faint)' }}>{obj.type[0].toUpperCase()}</span>

            {/* Visibility toggle — inline handler, no hooks issues */}
            <button
              onClick={e => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }); }}
              title={obj.visible ? 'Hide' : 'Show'}
              style={{ fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: obj.visible ? 'var(--color-text-muted)' : 'var(--color-text-faint)', padding: '0 2px' }}>
              {obj.visible ? '👁' : '○'}
            </button>

            <button
              onClick={e => { e.stopPropagation(); duplicateObject(obj.id); }}
              title="Duplicate"
              style={{ fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', padding: '0 2px' }}>
              ⧉
            </button>
            <button
              onClick={e => { e.stopPropagation(); removeObject(obj.id); }}
              title="Delete"
              style={{ fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0 2px' }}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Import / Export */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={importScene} style={s(false)}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
          ↑ Import
        </button>
        <button onClick={exportScene} style={s(false)}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
          ↓ Export
        </button>
      </div>
    </div>
  );
}
