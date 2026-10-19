/**
 * Deterministic physics for hanging loads (baskets under a carried pole).
 *
 * Each load is a spherical pendulum of rope length L hanging from a moving pivot. Two swing angles (about the
 * pivot's local X and Z axes) are integrated with semi-implicit Euler at 120 Hz from the shot's first frame:
 *   θ'' = −((g + a_y)/L)·sin θ − (a_h/L)·cos θ − c·θ'
 * where a_h is the pivot's horizontal acceleration along that axis and a_y its vertical acceleration (finite
 * differences of the pivot path). While the load rests on the ground (rope slack) the angles are held at zero.
 * Results are cached per key and resumed incrementally, so rendering frames in order costs O(1) per frame and
 * any frame rendered out of order is still identical.
 */
export type Vec3 = [number, number, number];

export interface PendulumSpec {
  key: string;
  length: number; // m
  damping?: number; // 1/s
  pivot: (f: number) => Vec3; // world position at (fractional) frame f
  /** true while the load rests on the ground (rope slack) */
  grounded?: (f: number) => boolean;
  fps?: number;
}

interface State { f: number; ax: number; az: number; vx: number; vz: number }
const cache = new Map<string, State[]>();
const G = 9.81;

export function swing(frame: number, s: PendulumSpec): { ax: number; az: number } {
  const fps = s.fps ?? 30;
  const sub = 4;
  const dt = 1 / (fps * sub);
  const c = s.damping ?? 0.35;
  let states = cache.get(s.key);
  if (!states) {
    states = [{ f: 0, ax: 0, az: 0, vx: 0, vz: 0 }];
    cache.set(s.key, states);
  }
  const target = Math.max(0, Math.floor(frame));
  while (states.length <= target) {
    const st = { ...states[states.length - 1] };
    for (let k = 0; k < sub; k++) {
      const t = st.f + k / sub;
      const h = 1 / sub;
      const p0 = s.pivot(t - h);
      const p1 = s.pivot(t);
      const p2 = s.pivot(t + h);
      // acceleration in m/s² (frames → seconds)
      const acc = [0, 1, 2].map((i) => (p2[i] - 2 * p1[i] + p0[i]) / (dt * dt));
      if (s.grounded?.(t)) {
        st.ax = st.az = st.vx = st.vz = 0;
        continue;
      }
      const geff = G + acc[1];
      // swing about X (load moves along Z) is driven by Z acceleration; about Z (load moves along X) by X acceleration
      const accX = -(geff / s.length) * Math.sin(st.ax) - (acc[2] / s.length) * Math.cos(st.ax) - c * st.vx;
      const accZ = -(geff / s.length) * Math.sin(st.az) - (acc[0] / s.length) * Math.cos(st.az) - c * st.vz;
      st.vx += accX * dt;
      st.vz += accZ * dt;
      st.ax += st.vx * dt;
      st.az += st.vz * dt;
    }
    st.f += 1;
    states.push(st);
  }
  const st = states[target];
  return { ax: st.ax, az: st.az };
}

/** Load (bob) position for a pivot and swing angles: θx moves the load along +Z, θz along +X. */
export function bobPosition(pivot: Vec3, L: number, a: { ax: number; az: number }): Vec3 {
  const x = L * Math.sin(a.az);
  const z = L * Math.sin(a.ax);
  const y = -Math.sqrt(Math.max(0, L * L - x * x - z * z));
  return [pivot[0] + x, pivot[1] + y, pivot[2] + z];
}

/** Small-angle period check (used by tests): T = 2π√(L/g). */
export const period = (L: number) => 2 * Math.PI * Math.sqrt(L / G);
