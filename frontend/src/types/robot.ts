export interface DHJoint {
  name: string; a: number; alpha: number; d: number;
  theta_offset: number; q_min: number; q_max: number;
  joint_type: 'revolute' | 'prismatic';
}
export interface RobotSummary {
  id: string; name: string; description: string;
  reach: number; dof: number;
  tcp_offset: [number,number,number]; base_offset: [number,number,number];
  joints: DHJoint[];
}
export type RobotSource = 'preset' | 'custom_dh' | 'urdf';
