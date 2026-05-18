import React, { Suspense, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useRobotStore } from '@/stores/robotStore';
import { useSceneStore } from '@/stores/sceneStore';
import { usePlannerStore } from '@/stores/plannerStore';
import type { SceneObject } from '@/types/scene';

const LINK_RADII = [0.055, 0.050, 0.045, 0.038, 0.033, 0.028];

// ─── Smooth camera preset controller ─────────────────────────────────────────
const CAM_PRESETS: Record<string, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  iso:   { pos: new THREE.Vector3(1.2, 1.0, 1.2),   target: new THREE.Vector3(0.15, 0.2, 0.1) },
  top:   { pos: new THREE.Vector3(0.15, 2.4, 0.01), target: new THREE.Vector3(0.15, 0.0, 0.1) },
  front: { pos: new THREE.Vector3(0.15, 0.4, 2.2),  target: new THREE.Vector3(0.15, 0.4, 0.0) },
  side:  { pos: new THREE.Vector3(2.2, 0.4, 0.15),  target: new THREE.Vector3(0.0, 0.4, 0.15) },
};

function CameraController({ preset }: { preset: string }) {
  const { camera, controls } = useThree();
  const prevPreset = useRef('iso');
  const animating = useRef(false);
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const progress = useRef(0);

  useEffect(() => {
    if (preset === prevPreset.current) return;
    prevPreset.current = preset;
    startPos.current.copy(camera.position);
    const ctrl = controls as any;
    if (ctrl?.target) startTarget.current.copy(ctrl.target);
    progress.current = 0;
    animating.current = true;
  }, [preset, camera, controls]);

  useFrame((_, delta) => {
    if (!animating.current) return;
    const dest = CAM_PRESETS[preset] ?? CAM_PRESETS.iso;
    progress.current = Math.min(progress.current + delta * 3.5, 1);
    const t = 1 - Math.pow(1 - progress.current, 3);
    camera.position.lerpVectors(startPos.current, dest.pos, t);
    const ctrl = controls as any;
    if (ctrl?.target) { ctrl.target.lerpVectors(startTarget.current, dest.target, t); ctrl.update(); }
    if (progress.current >= 1) animating.current = false;
  });
  return null;
}

// ─── Robot arm — solid, clearly visible ──────────────────────────────────────
function RobotArm({ frames }: { frames: number[][] }) {
  if (!frames || frames.length < 2) return null;
  return (
    <group>
      {frames.slice(0, -1).map((start, i) => {
        const end = frames[i + 1];
        const s = new THREE.Vector3(...(start as [number, number, number]));
        const e = new THREE.Vector3(...(end as [number, number, number]));
        const mid = s.clone().add(e).multiplyScalar(0.5);
        const dir = e.clone().sub(s);
        const len = dir.length();
        if (len < 0.001) return null;
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        const r = LINK_RADII[i] ?? 0.025;
        return (
          <group key={i}>
            {/* Link cylinder — opaque, steel-blue */}
            <mesh
              position={mid.toArray() as [number, number, number]}
              quaternion={q.toArray() as [number, number, number, number]}
            >
              <cylinderGeometry args={[r * 0.78, r, len, 14]} />
              <meshStandardMaterial
                color="#4a7fa0"
                metalness={0.4}
                roughness={0.55}
              />
            </mesh>
            {/* Joint sphere — slightly lighter */}
            <mesh position={start as [number, number, number]}>
              <sphereGeometry args={[r * 1.1, 12, 12]} />
              <meshStandardMaterial
                color="#3a6070"
                metalness={0.45}
                roughness={0.45}
              />
            </mesh>
          </group>
        );
      })}
      {/* TCP marker — bright white sphere */}
      <mesh position={frames[frames.length - 1] as [number, number, number]}>
        <sphereGeometry args={[0.022, 14, 14]} />
        <meshStandardMaterial color="#ffffff" emissive="#aaddff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ─── Task-space target marker ─────────────────────────────────────────────────
function TargetMarker({ position, color }: { position: [number, number, number]; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + 0.12 * Math.sin(clock.elapsedTime * 2.5);
      ringRef.current.scale.setScalar(s);
    }
  });
  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.035, 0.003, 8, 40]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.018, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* X axis */}
      <mesh position={[0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.002, 0.002, 0.08, 6]} />
        <meshBasicMaterial color="#e05555" />
      </mesh>
      {/* Y axis */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.08, 6]} />
        <meshBasicMaterial color="#55aa55" />
      </mesh>
      {/* Z axis */}
      <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.08, 6]} />
        <meshBasicMaterial color="#4f98a3" />
      </mesh>
    </group>
  );
}

// ─── Obstacle mesh — NO hooks-after-conditional, visibility handled by opacity ─
function ObstacleMesh({
  obj, selected, onSelect, onDragEnd,
}: {
  obj: SceneObject;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (pos: [number, number, number]) => void;
}) {
  const { camera, gl, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const dragPlane = useRef(new THREE.Plane());
  const offset = useRef(new THREE.Vector3());
  const orbitControls = useThree(s => s.controls);

  // All hooks must run unconditionally — visibility handled via visible prop on group
  const [px, py, pz] = obj.position;
  const rot = obj.rotation.map(d => d * Math.PI / 180) as [number, number, number];

  const onPointerDown = useCallback((e: any) => {
    e.stopPropagation();
    onSelect();
    if (!selected) return;
    isDragging.current = true;
    gl.domElement.style.cursor = 'grabbing';
    const normal = new THREE.Vector3();
    camera.getWorldDirection(normal);
    const objPos = new THREE.Vector3(px, py, pz);
    dragPlane.current.setFromNormalAndCoplanarPoint(normal, objPos);
    raycaster.setFromCamera(
      new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1,
      ), camera,
    );
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersection);
    offset.current.copy(objPos).sub(intersection);
    if (orbitControls) (orbitControls as any).enabled = false;
  }, [selected, px, py, pz, camera, gl, raycaster, orbitControls, onSelect]);

  const onPointerMove = useCallback((e: any) => {
    if (!isDragging.current) return;
    raycaster.setFromCamera(
      new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1,
      ), camera,
    );
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane.current, intersection)) {
      const newPos = intersection.add(offset.current);
      if (groupRef.current) groupRef.current.position.set(newPos.x, newPos.y, newPos.z);
    }
  }, [camera, raycaster]);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    gl.domElement.style.cursor = 'auto';
    if (orbitControls) (orbitControls as any).enabled = true;
    if (groupRef.current) {
      const p = groupRef.current.position;
      onDragEnd([
        Math.round(p.x * 1000) / 1000,
        Math.round(p.y * 1000) / 1000,
        Math.round(p.z * 1000) / 1000,
      ]);
    }
  }, [gl, orbitControls, onDragEnd]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, onPointerMove, onPointerUp]);

  // Geometry definitions
  const geomArgs = obj.type === 'box'
    ? { type: 'box', args: [obj.size[0], obj.size[1], obj.size[2]] } as const
    : obj.type === 'sphere'
    ? { type: 'sphere', args: [obj.size[0], 20, 20] } as const
    : { type: 'cylinder', args: [obj.size[0], obj.size[0], obj.size[2], 20] } as const;

  const wireArgs = obj.type === 'box'
    ? [obj.size[0] + 0.008, obj.size[1] + 0.008, obj.size[2] + 0.008] as [number,number,number]
    : obj.type === 'sphere'
    ? [obj.size[0] + 0.008, 20, 20] as [number,number,number]
    : [obj.size[0] + 0.008, obj.size[0] + 0.008, obj.size[2] + 0.008] as [number,number,number];

  return (
    // Use THREE.js visible prop — never conditionally return null after hooks
    <group
      ref={groupRef}
      position={[px, py, pz]}
      rotation={rot}
      visible={obj.visible}
      onPointerDown={onPointerDown}
    >
      <mesh>
        {geomArgs.type === 'box' && <boxGeometry args={geomArgs.args} />}
        {geomArgs.type === 'sphere' && <sphereGeometry args={geomArgs.args} />}
        {geomArgs.type === 'cylinder' && <cylinderGeometry args={geomArgs.args} />}
        <meshStandardMaterial
          color={obj.color}
          transparent
          opacity={selected ? 0.7 : 0.5}
          metalness={0.05}
          roughness={0.7}
          // NO DoubleSide — that causes the glass look
        />
      </mesh>
      {selected && (
        <>
          <mesh>
            {geomArgs.type === 'box' && <boxGeometry args={wireArgs} />}
            {geomArgs.type === 'sphere' && <sphereGeometry args={wireArgs} />}
            {geomArgs.type === 'cylinder' && <cylinderGeometry args={wireArgs} />}
            <meshBasicMaterial color="#4f98a3" wireframe />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Animated robot ───────────────────────────────────────────────────────────
function AnimatedRobot() {
  const anim = usePlannerStore(s => s.anim);
  const result = usePlannerStore(s => s.result);
  const setAnim = usePlannerStore(s => s.setAnim);
  const setCurrentQ = useRobotStore(s => s.setCurrentQ);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!anim.playing || !result || result.waypoints.length < 2) return;
    timeRef.current += delta * anim.speed;
    const total = result.waypoints.length - 1;
    const frame = Math.min(Math.floor((timeRef.current * 15) % (total + 1)), total);
    if (frame !== anim.frame) {
      setAnim({ frame });
      setCurrentQ(result.waypoints[frame].q);
    }
  });

  if (!result || result.waypoints.length === 0) return null;
  const wp = result.waypoints[Math.min(anim.frame, result.waypoints.length - 1)];
  return <RobotArm frames={wp.frames} />;
}

// ─── Base plate ───────────────────────────────────────────────────────────────
function BaseFrame() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.012, 32]} />
        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Small axis indicators */}
      <mesh position={[0.06, 0.003, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 6]} />
        <meshBasicMaterial color="#e05555" />
      </mesh>
      <mesh position={[0, 0.003, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 6]} />
        <meshBasicMaterial color="#4f98a3" />
      </mesh>
    </group>
  );
}

// ─── Main Viewport ────────────────────────────────────────────────────────────
export function Viewport3D() {
  const objects = useSceneStore(s => s.objects);
  const selectedId = useSceneStore(s => s.selectedId);
  const showGrid = useSceneStore(s => s.showGrid);
  const cameraPreset = useSceneStore(s => s.cameraPreset);
  const setCameraPreset = useSceneStore(s => s.setCameraPreset);
  const selectObject = useSceneStore(s => s.selectObject);
  const toggleGrid = useSceneStore(s => s.toggleGrid);
  const updateObject = useSceneStore(s => s.updateObject);

  const result = usePlannerStore(s => s.result);
  const compResult = usePlannerStore(s => s.comparisonResult);
  const anim = usePlannerStore(s => s.anim);

  const startPose = useRobotStore(s => s.startPose);
  const goalPose = useRobotStore(s => s.goalPose);

  return (
    <div className="relative w-full h-full" style={{ background: '#f0f2f5' }}>
      <Canvas
        camera={{ position: CAM_PRESETS.iso.pos.toArray() as [number, number, number], fov: 45, near: 0.01, far: 100 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#f0f2f5' }}
        onPointerMissed={() => selectObject(null)}
      >
        <Suspense fallback={null}>
          {/* White-friendly lighting */}
          <color attach="background" args={['#f0f2f5']} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
          <directionalLight position={[-2, 3, -2]} intensity={0.4} color="#c8d8e8" />
          <hemisphereLight args={['#ddeeff', '#aabbcc', 0.3]} />

          {/* Grid — darker lines on white bg */}
          {showGrid && (
            <Grid
              args={[4, 4]}
              cellSize={0.1}
              cellThickness={0.5}
              cellColor="#bbc4cc"
              sectionSize={0.5}
              sectionThickness={1.0}
              sectionColor="#8899aa"
              fadeDistance={4}
              infiniteGrid
            />
          )}

          <BaseFrame />

          {/* Task-space target markers */}
          {startPose.mode === 'cartesian' && (
            <TargetMarker position={startPose.position} color="#0077aa" />
          )}
          {goalPose.mode === 'cartesian' && (
            <TargetMarker position={goalPose.position} color="#aa3388" />
          )}

          {/* Obstacles */}
          {objects.map(obj => (
            <ObstacleMesh
              key={obj.id}
              obj={obj}
              selected={selectedId === obj.id}
              onSelect={() => selectObject(obj.id)}
              onDragEnd={pos => updateObject(obj.id, { position: pos })}
            />
          ))}

          {/* Comparison path */}
          {compResult && compResult.waypoints.length > 1 && (
            <Line
              points={compResult.waypoints.map(w => new THREE.Vector3(...w.tcp_pos))}
              color="#cc3344" lineWidth={1.5} opacity={0.45} transparent
              dashed dashSize={0.03} gapSize={0.015}
            />
          )}

          {/* Planned path + animation */}
          {result && result.waypoints.length > 1 && (
            <>
              <Line
                points={result.waypoints.map(w => new THREE.Vector3(...w.tcp_pos))}
                color="#cc8800" lineWidth={3}
              />
              {anim.showTcpTrail && anim.frame > 0 && (
                <Line
                  points={result.waypoints.slice(0, anim.frame + 1).map(w => new THREE.Vector3(...w.tcp_pos))}
                  color="#cc8800" lineWidth={1.5} opacity={0.4} transparent
                />
              )}
              <AnimatedRobot />
            </>
          )}

          <OrbitControls
            makeDefault
            target={CAM_PRESETS.iso.target.toArray() as [number, number, number]}
            minDistance={0.2} maxDistance={8}
            enableDamping dampingFactor={0.08}
          />
          <CameraController preset={cameraPreset} />

          <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
            <GizmoViewport axisColors={['#e05555', '#55aa55', '#4488cc']} labelColor="#333" />
          </GizmoHelper>
        </Suspense>
      </Canvas>

      {/* Camera presets */}
      <div className="absolute top-3 left-3 flex gap-1">
        {(['iso', 'top', 'front', 'side'] as const).map(p => (
          <button key={p} onClick={() => setCameraPreset(p)}
            className="px-2 py-1 text-xs rounded border transition-all"
            style={cameraPreset === p
              ? { background: '#0077aa', color: '#fff', borderColor: '#0077aa' }
              : { background: 'rgba(255,255,255,0.88)', color: '#556677', borderColor: '#c0ccd4' }}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Grid toggle — uses store method from closure, not getState() */}
      <div className="absolute top-3 right-20 flex gap-1">
        <button
          onClick={toggleGrid}
          className="px-2 py-1 text-xs rounded border transition-all"
          style={{
            background: 'rgba(255,255,255,0.88)',
            borderColor: '#c0ccd4',
            color: showGrid ? '#334455' : '#99aabb',
          }}>
          Grid
        </button>
      </div>

      {/* Task-space legend */}
      {(startPose.mode === 'cartesian' || goalPose.mode === 'cartesian') && (
        <div className="absolute bottom-16 left-3 flex flex-col gap-1 pointer-events-none">
          {startPose.mode === 'cartesian' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #0077aa44', color: '#0077aa' }}>
              ⊕ Start target
            </div>
          )}
          {goalPose.mode === 'cartesian' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #aa338844', color: '#aa3388' }}>
              ⊕ Goal target
            </div>
          )}
        </div>
      )}

      {/* Drag hint */}
      {selectedId && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-xs pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.9)', color: '#0077aa', border: '1px solid #0077aa66' }}>
          Click &amp; drag to move · Click empty to deselect
        </div>
      )}
    </div>
  );
}
