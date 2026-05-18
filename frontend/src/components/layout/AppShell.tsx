import React from 'react';
import { Viewport3D } from '@/components/scene/Viewport3D';
import { LeftPanel } from './LeftPanel';
import { RightInspector } from './RightInspector';
import { StatusBar } from './StatusBar';
import { AnimationBar } from '@/components/animation/AnimationBar';

export function AppShell() {
  const toggleTheme = () => {
    const h = document.documentElement;
    h.setAttribute('data-theme', h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };

  return (
    <div style={{ height: '100dvh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>

      {/* Top bar */}
      <div style={{ height: '40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="var(--color-primary)" strokeWidth="1.5" />
            <path d="M11 4v4M11 14v4M4 11h4M14 11h4" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="11" cy="11" r="2.5" fill="var(--color-primary)" />
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>RoboPlanner</span>
          <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontSize: '10px' }}>v1.0</span>
        </div>
        <StatusBar />
        <button onClick={toggleTheme} title="Toggle theme"
          style={{ padding: '6px', borderRadius: '4px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          ☀
        </button>
      </div>

      {/* Main content row — fills remaining height exactly */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — independent scroll */}
        <div style={{
          width: '280px', flexShrink: 0,
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          <LeftPanel />
        </div>

        {/* Centre — viewport + animation bar */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <Viewport3D />
          </div>
          <div style={{ height: '48px', flexShrink: 0, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
            <AnimationBar />
          </div>
        </div>

        {/* Right inspector — CRITICAL: height is constrained by flex parent, overflow scrolls internally */}
        <div style={{
          width: '260px', flexShrink: 0,
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          /* Do NOT set overflow here — RightInspector manages its own scroll */
          display: 'flex', flexDirection: 'column',
          minHeight: 0,  /* allow flex child to shrink below content height */
        }}>
          {/* Header row — fixed */}
          <div style={{ padding: '8px 12px 6px', flexShrink: 0, borderBottom: '1px solid var(--color-divider)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-faint)' }}>
              Inspector
            </span>
          </div>
          {/* Scrollable body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
            <RightInspector />
          </div>
        </div>

      </div>
    </div>
  );
}
