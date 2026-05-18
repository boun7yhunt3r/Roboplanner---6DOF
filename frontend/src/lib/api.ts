const BASE = '/api';
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(()=>({detail:res.statusText})); throw new Error(e.detail ?? 'Request failed'); }
  return res.json();
}
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}
export const api = {
  getRobots: () => get<any[]>('/robots/'),
  getRobot: (id: string) => get<any>(`/robots/${id}`),
  computeFK: (robot_id: string, q: number[]) => post<any>('/robots/fk', {robot_id, q}),
  computeIK: (body: any) => post<any>('/robots/ik', body),
  plan: (body: any) => post<any>('/plan/', body),
  getExampleScene: (name: string) => get<any>(`/scene/examples/${name}`),
  listExampleScenes: () => get<any>('/scene/examples'),
};
