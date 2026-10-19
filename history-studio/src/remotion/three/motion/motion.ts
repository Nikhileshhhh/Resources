import { noise2D } from "@remotion/noise";
import type { Pose3 } from "../character/Character3D";
import { BODY } from "../character/body";

type Num = keyof { [K in keyof Pose3 as Pose3[K] extends number | undefined ? K : never]: 1 };
const KEYS: Num[] = ["x", "y", "z", "heading", "drop", "pelvisTilt", "pelvisRoll", "pelvisTwist", "pelvisShift", "spine", "spineSide", "spineTwist", "chest", "breathe", "neck", "head", "headTurn", "headTilt", "hipL", "hipLAbd", "kneeL", "ankleL", "hipR", "hipRAbd", "kneeR", "ankleR", "shL", "shLAbd", "shLTwist", "elL", "wristL", "shR", "shRAbd", "shRTwist", "elR", "wristR", "blink", "brow", "jaw", "lookX", "lookY", "skirtFwd", "skirtSplay", "sway", "robeTight"];

/** Field-wise sum (layering: base + overlay). */
export function add(...poses: Pose3[]): Pose3 {
  const out: Pose3 = {};
  for (const p of poses) for (const k of KEYS) if (p[k] !== undefined) (out as any)[k] = ((out as any)[k] ?? 0) + (p[k] as number);
  return out;
}

/** Field-wise blend a→b by t (missing fields treated as 0). */
export function mix(a: Pose3, b: Pose3, t: number): Pose3 {
  const out: Pose3 = {};
  for (const k of KEYS) {
    const va = (a[k] as number | undefined) ?? 0;
    const vb = (b[k] as number | undefined) ?? 0;
    if (a[k] !== undefined || b[k] !== undefined) (out as any)[k] = va + (vb - va) * t;
  }
  return out;
}

export const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const easeOutBack = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Keyframed acting: [[frame, pose], …] blended with ease-in-out (anticipation and settle come from the keys).
 * Each key holds the full set of fields it cares about; fields missing in a key are held from neighbours.
 */
export function keyed(frame: number, keys: [number, Pose3][], easing: (t: number) => number = ease): Pose3 {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [fa, pa] = keys[i];
    const [fb, pb] = keys[i + 1];
    if (frame <= fb) return mix({ ...pb, ...pa }, { ...pa, ...pb }, easing((frame - fa) / (fb - fa)));
  }
  return keys[keys.length - 1][1];
}

/** Natural blinks: a 7-frame blink every 2.5–5 s (deterministic per seed), plus an optional forced blink. */
export function blinkAt(frame: number, seed: number): number {
  let t = 0;
  let i = 0;
  let start = 20 + (seed * 37) % 60;
  while (start <= frame && i < 400) {
    const d = frame - start;
    if (d < 7) t = Math.sin((d / 7) * Math.PI);
    start += 75 + Math.floor(((Math.sin((seed + i) * 91.7) + 1) / 2) * 75);
    i++;
  }
  return t;
}

/** Living idle: breathing, weight shift, small head drift, blinks. Amplitude 0..1. */
export function idle(frame: number, seed = 0, amp = 1): Pose3 {
  const t = frame / 30;
  const nz = (k: string, f: number) => noise2D(`i${seed}${k}`, t * f, 0);
  const shift = nz("w", 0.12) * amp;
  return {
    breathe: Math.sin(t * 2 * Math.PI * 0.23 + seed),
    pelvisShift: shift * 0.025,
    pelvisRoll: -shift * 2.5,
    hipLAbd: shift * 2,
    hipRAbd: -shift * 2,
    kneeL: Math.max(0, shift) * 6 + 2,
    kneeR: Math.max(0, -shift) * 6 + 2,
    hipL: Math.max(0, shift) * 3,
    hipR: Math.max(0, -shift) * 3,
    ankleL: -Math.max(0, shift) * 3,
    ankleR: -Math.max(0, -shift) * 3,
    spineSide: shift * 1.5,
    head: nz("h", 0.2) * 3 * amp,
    headTurn: nz("t", 0.15) * 5 * amp,
    headTilt: nz("r", 0.18) * 2 * amp,
    shL: 2 + nz("a", 0.2) * 2,
    shR: 2 + nz("b", 0.2) * 2,
    elL: 12 + nz("c", 0.2) * 3,
    elR: 12 + nz("d", 0.2) * 3,
    blink: blinkAt(frame, seed),
    lookX: nz("lx", 0.3) * 0.6,
  };
}

// ---------------- locomotion ----------------
const RAD = 180 / Math.PI;

/** Planar two-bone IK for a leg: foot target (dz forward, dy up) relative to the hip joint → angles (deg). */
export function legIK(dz: number, dy: number, footPitch = 0): { hip: number; knee: number; ankle: number; lift: number } {
  const L1 = BODY.thigh;
  const L2 = BODY.shin;
  const reach = (L1 + L2) * 0.997;
  let y = dy;
  let lift = 0;
  let d = Math.hypot(dz, y);
  if (d > reach) {
    // the heel rises instead of the leg stretching past full length (heel-off / heel-strike)
    const ny = -Math.sqrt(Math.max(0, reach * reach - dz * dz));
    lift = ny - y;
    y = ny;
    d = reach;
  }
  const alpha = Math.atan2(dz, -y);
  const beta = Math.acos(Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const delta = Math.acos(Math.min(1, (L2 * L2 + d * d - L1 * L1) / (2 * L2 * d)));
  const hip = (alpha + beta) * RAD;
  const knee = (beta + delta) * RAD;
  return { hip, knee, ankle: knee - hip + footPitch, lift };
}

/** Forward kinematics of the IK leg (for slip tests): ankle position (z, y) relative to the hip. */
export function legFK(hip: number, knee: number): { z: number; y: number } {
  const a = hip / RAD;
  const b = (hip - knee) / RAD;
  return { z: BODY.thigh * Math.sin(a) + BODY.shin * Math.sin(b), y: -BODY.thigh * Math.cos(a) - BODY.shin * Math.cos(b) };
}

export interface GaitOpts { speed?: number; carry?: boolean; armSwing?: number; tired?: number }

/** Cycle length (m per full gait cycle = two steps) for a walking speed (m/s). */
export const cycleLength = (v: number) => Math.min(1.5, 0.75 + 0.42 * v);

/**
 * Walk pose at gait phase u (0..1 per full cycle; right heel strikes at u=0).
 * Stance feet move backward relative to the hip at exactly the body speed, so planted feet don't slide.
 */
export function walk(u: number, o: GaitOpts = {}): Pose3 {
  const v = o.speed ?? 1.2;
  const Dc = cycleLength(v);
  const s = 0.6; // stance fraction
  const hipH = 0.875 - (o.carry ? 0.02 : 0);
  const foot = (ph: number) => {
    const w = ((ph % 1) + 1) % 1;
    if (w < s) return { z: Dc * s * (0.5 - w / s), y: 0, pitch: 0 };
    const t = (w - s) / (1 - s);
    const sm = t * t * (3 - 2 * t);
    return { z: -Dc * s * 0.5 + Dc * s * sm, y: 0.085 * Math.sin(Math.PI * t) * (0.6 + 0.4 * v), pitch: 12 * Math.sin(Math.PI * t) - 6 * t };
  };
  const bob = -0.016 * Math.cos(4 * Math.PI * u) * (0.6 + 0.4 * v);
  const H = hipH + bob;
  const R = foot(u);
  const L = foot(u + 0.5);
  const ikR = legIK(R.z, -(H - BODY.ankle - R.y), R.pitch);
  const ikL = legIK(L.z, -(H - BODY.ankle - L.y), L.pitch);
  const A = (o.armSwing ?? 1) * (10 + 10 * v);
  const c = Math.cos(2 * Math.PI * u);
  return {
    drop: BODY.hip - H,
    hipR: ikR.hip, kneeR: ikR.knee, ankleR: ikR.ankle,
    hipL: ikL.hip, kneeL: ikL.knee, ankleL: ikL.ankle,
    pelvisTwist: 4 * c * v,
    pelvisRoll: 2.5 * Math.sin(2 * Math.PI * u),
    spineTwist: -6 * c * v,
    spine: 3 + 3 * v + (o.tired ?? 0) * 8,
    head: -2 - 2 * v,
    headTurn: 2.5 * c * v,
    shR: o.carry ? 0 : -A * c,
    shL: o.carry ? 0 : A * c,
    elR: o.carry ? 0 : 14 + 10 * Math.max(0, -c),
    elL: o.carry ? 0 : 14 + 10 * Math.max(0, c),
    shRAbd: 4,
    shLAbd: 4,
    sway: Math.sin(2 * Math.PI * u + 0.6) * 0.8,
  };
}

export type P2 = [number, number]; // (x, z) on the ground

/** Arc-length parametrised polyline. */
export function pathPoint(path: P2[], dist: number): { x: number; z: number; heading: number } {
  let d = Math.max(0, dist);
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const seg = Math.hypot(bx - ax, bz - az);
    if (d <= seg || i === path.length - 2) {
      const t = Math.min(1, d / seg);
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, heading: (Math.atan2(bx - ax, bz - az) * 180) / Math.PI };
    }
    d -= seg;
  }
  const [x, z] = path[path.length - 1];
  return { x, z, heading: 0 };
}

export const pathLength = (path: P2[]) => path.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);

/**
 * A character walking a path: accelerates from rest over `accel` frames, cruises, decelerates to stop at the end
 * (or keeps walking if `loop`). Legs are phase-locked to distance travelled, so footfalls match the ground.
 * Returns the pose plus `moving` 0..1 so callers can blend into idle when stopped.
 */
export function walkPath(frame: number, path: P2[], o: GaitOpts & { start?: number; accel?: number; loop?: boolean; phase0?: number } = {}): { pose: Pose3; moving: number; dist: number } {
  const v = o.speed ?? 1.2;
  const fps = 30;
  const acc = o.accel ?? 18;
  const total = pathLength(path);
  const f = Math.max(0, frame - (o.start ?? 0));
  // distance with a smooth start: integrate v·ease(ramp)
  const ramp = Math.min(f, acc);
  let dist = (v / fps) * (f - acc / 2) * (f >= acc ? 1 : 0) + (f < acc ? ((v / fps) * ramp * ramp) / (2 * acc) : 0);
  let moving = Math.min(1, f / acc);
  if (!o.loop) {
    const stopDist = total;
    const brake = (v / fps) * acc * 0.5;
    if (dist > stopDist - brake) {
      // decelerate to rest exactly at the path end
      const over = Math.min(1, (dist - (stopDist - brake)) / (2 * brake));
      dist = stopDist - brake + brake * (1 - (1 - over) * (1 - over));
      moving = Math.max(0, 1 - over);
    }
  } else if (total > 0) dist = dist % total;
  const pt = pathPoint(path, dist);
  const u = dist / cycleLength(v) + (o.phase0 ?? 0);
  const w = walk(u, o);
  const pose = { ...mix({}, w, moving), x: pt.x, z: pt.z, heading: pt.heading };
  return { pose, moving, dist };
}

/**
 * Critically damped spring response of a signal (follow-through for robes, plumes, sashes, hanging objects).
 * Integrated from `from` to `frame` at 4 substeps per frame (deterministic, order-independent).
 */
export function springFollow(frame: number, from: number, signal: (f: number) => number, freq = 2.2, damping = 0.35): number {
  let x = signal(from);
  let vel = 0;
  const w = 2 * Math.PI * freq;
  const dt = 1 / 120;
  for (let f = from; f < frame; f++) {
    for (let k = 0; k < 4; k++) {
      const target = signal(f + k / 4);
      const a = w * w * (target - x) - 2 * damping * w * vel;
      vel += a * dt;
      x += vel * dt;
    }
  }
  return x;
}
