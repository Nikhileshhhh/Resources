import React, { createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { noise2D } from "@remotion/noise";
import { glowTexture, type V3 } from "./Stage3D";

// ---------------- narration cues ----------------
export interface CueInfo { words: { w: string; start: number; end: number }[]; shotStart: number; fps: number }
export const CueCtx = createContext<CueInfo>({ words: [], shotStart: 0, fps: 30 });

/**
 * Local frame (within the current shot) at which the narrator says `word` (nth occurrence inside the shot window),
 * so actions land on the spoken beat. Falls back to `fallback` when the word is not found.
 */
export function useCue(word: string, fallback: number, nth = 0): number {
  const { words, shotStart, fps } = useContext(CueCtx);
  const w = word.toLowerCase();
  const hits = words.filter((x) => x.w.toLowerCase().replace(/[^a-z']/g, "") === w && x.start * fps >= shotStart - 2);
  const hit = hits[nth];
  return hit ? Math.round(hit.start * fps - shotStart) : fallback;
}

// ---------------- sky ----------------
/** Gradient sky dome (horizon → zenith), unaffected by fog. */
export const SkyDome: React.FC<{ horizon: string; zenith: string; glow?: { color: string; dir: V3; size?: number } }> = ({ horizon, zenith, glow }) => {
  const g = useMemo(() => {
    const geo = new THREE.SphereGeometry(600, 32, 16);
    const h = new THREE.Color(horizon);
    const z = new THREE.Color(zenith);
    const gc = glow ? new THREE.Color(glow.color) : null;
    const gd = glow ? new THREE.Vector3(...glow.dir).normalize() : null;
    const cols: number[] = [];
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const t = Math.pow(Math.max(0, v.y), 0.55);
      const c = h.clone().lerp(z, t);
      if (gc && gd) c.lerp(gc, Math.pow(Math.max(0, v.dot(gd)), 6 / (glow!.size ?? 1)) * 0.85);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    return geo;
  }, [horizon, zenith, glow]);
  return (
    <mesh geometry={g}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
};

export const Moon: React.FC<{ position: V3; size?: number }> = ({ position, size = 14 }) => {
  const tex = useMemo(() => glowTexture(), []);
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size * 0.18, 24, 16]} />
        <meshBasicMaterial color="#f4f1e2" fog={false} />
      </mesh>
      <sprite scale={[size * 2.2, size * 2.2, 1]}>
        <spriteMaterial map={tex} color="#9fb6e8" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
    </group>
  );
};

// ---------------- water ----------------
/**
 * River surface: a displaced grid with travelling waves (sum of directional sines), normals recomputed per frame,
 * so moonlight and torchlight produce moving glints. Deterministic in `frame`.
 */
export const Water: React.FC<{ frame: number; size: [number, number]; position: V3; color?: string; seg?: [number, number]; amp?: number }> = ({ frame, size, position, color = "#16304a", seg = [120, 50], amp = 0.06 }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(size[0], size[1], seg[0], seg[1]).rotateX(-Math.PI / 2), [size, seg]);
  useLayoutEffect(() => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    const t = frame / 30;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const y = amp * (Math.sin(x * 0.9 + t * 1.3) * 0.5 + Math.sin(x * 0.37 - z * 0.8 + t * 0.9) * 0.35 + Math.sin(z * 1.7 + x * 0.2 - t * 1.7) * 0.25 + noise2D("w", x * 0.15 + t * 0.2, z * 0.15) * 0.6);
      p.setY(i, y);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  }, [frame, geo, amp]);
  return (
    <mesh geometry={geo} position={position} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.12} metalness={0.55} />
    </mesh>
  );
};

/** Shimmering reflection column of a light source on water (moon or torch). */
export const Reflection: React.FC<{ frame: number; position: V3; color: string; length?: number; width?: number; seed?: number }> = ({ frame, position, color, length = 30, width = 1.6, seed = 0 }) => {
  const tex = useMemo(() => glowTexture(), []);
  return (
    <group position={position}>
      {Array.from({ length: 14 }, (_, i) => {
        const z = (i / 13) * length;
        const flick = 0.5 + 0.5 * noise2D(`r${seed}`, i * 0.7, frame * 0.08);
        return (
          <mesh key={i} position={[noise2D(`rx${seed}`, i, frame * 0.05) * width * 0.3, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width * (0.6 + flick * 0.8) * (1 + z / length), 1.4]} />
            <meshBasicMaterial map={tex} color={color} transparent opacity={0.22 + flick * 0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------- held props that stay upright ----------------
/**
 * Keeps its children upright in world space (torches, spears, poles) whatever the arm is doing, keeping only the
 * character's yaw plus an optional tilt — as a real hand would hold a staff vertical.
 */
export const Upright: React.FC<{ tilt?: [number, number]; children: React.ReactNode }> = ({ tilt = [0, 0], children }) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g || !g.parent) return;
    g.parent.updateWorldMatrix(true, false);
    const pq = new THREE.Quaternion();
    g.parent.getWorldQuaternion(pq);
    const e = new THREE.Euler().setFromQuaternion(pq, "YXZ");
    const want = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt[0], e.y, tilt[1], "YXZ"));
    g.quaternion.copy(pq.invert().multiply(want));
  });
  return <group ref={ref}>{children}</group>;
};
