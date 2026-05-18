export type ObstacleType = 'box' | 'sphere' | 'cylinder';
export interface SceneObject {
  id: string; name: string; type: ObstacleType;
  position: [number,number,number]; rotation: [number,number,number];
  size: [number,number,number]; color: string; visible: boolean;
}
