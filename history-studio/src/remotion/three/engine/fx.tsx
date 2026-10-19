import React, { useMemo } from "react";
import * as THREE from "three";
import { noise2D } from "@remotion/noise";
import { glowTexture, type V3 } from "./Stage3D";

const n = (seed: string, t: number) => noise2D(seed, t, 0);

/** Flame texture: soft teardrop, white core fading to transparent. */
let flameTex: THREE.Texture | null = null;
function flameTexture(): THREE.Texture {
  if (flameTex) return flameTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 92, 2, 32, 80, 60);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.8)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(32, 2);
  g.bezierCurveTo(52, 50, 62, 80, 60, 98);
  g.bezierCurveTo(56, 124, 8, 124, 4, 98);
  g.bezierCurveTo(2, 80, 12, 50, 32, 2);
  g.fill();
  flameTex = new THREE.CanvasTexture(c);
  flameTex.colorSpace = THREE.SRGBColorSpace;
  return flameTex;
}

/**
 * Torch / lamp flame: three layered additive billboards (red outer, orange body, yellow core) that
 * lick and flicker with deterministic noise, a glow halo, and rising embers that cool and fade.
 */
export const Flame: React.FC<{ frame: number; seed: number; size?: number; light?: boolean; embers?: boolean }> = ({ frame, seed, size = 0.25, light = false, embers = true }) => {
  const tex = useMemo(() => flameTexture(), []);
  const glow = useMemo(() => glowTexture(), []);
  const s = `f${seed}`;
  const t = frame / 30;
  const fl = 1 + n(s, t * 3.1) * 0.18 + n(s + "b", t * 9) * 0.08;
  const lean = n(s + "l", t * 1.3) * 0.12;
  const layers: [string, number, number][] = [["#ff4a12", 1.0, 0.75], ["#ff9a2a", 0.78, 0.9], ["#ffe9a0", 0.45, 1]];
  return (
    <group>
      {layers.map(([col, k, o], i) => (
        <sprite key={i} position={[lean * size * k, size * 0.42 * k * fl, 0]} scale={[size * 0.55 * k * (1 + n(s + i, t * 5) * 0.12), size * 1.15 * k * fl, 1]}>
          <spriteMaterial map={tex} color={col} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </sprite>
      ))}
      <sprite position={[0, size * 0.35, 0]} scale={[size * 4.2 * fl, size * 4.2 * fl, 1]}>
        <spriteMaterial map={glow} color="#ff8a2a" transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      {embers &&
        Array.from({ length: 5 }, (_, i) => {
          // each ember lives 1.6 s, rising with a drifting curl
          const life = 48;
          const age = (frame + i * 11 + seed * 7) % life;
          const a = age / life;
          const x = n(s + "ex" + i, (frame - age) * 0.1) * 0.25 * size + n(s + "ec" + i, frame * 0.08) * a * size * 0.8;
          return (
            <sprite key={"e" + i} position={[x, size * (0.6 + a * 3.2), n(s + "ez" + i, (frame - age) * 0.1) * 0.15 * size]} scale={[size * 0.07, size * 0.07, 1]}>
              <spriteMaterial map={glow} color={a < 0.5 ? "#ffd27a" : "#ff6a20"} transparent opacity={(1 - a) * 0.9} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
            </sprite>
          );
        })}
      {light && <pointLight color="#ff9a40" intensity={2.2 * fl} distance={7} decay={1.6} position={[0, size * 0.5, 0]} />}
    </group>
  );
};

/** Soft smoke column (siege smoke, chimney, extinguished lamp): billboards rising, spreading and fading. */
export const Smoke: React.FC<{ frame: number; seed: number; position: V3; scale?: number; color?: string; count?: number; rise?: number }> = ({ frame, seed, position, scale = 1, color = "#6b6560", count = 10, rise = 0.6 }) => {
  const glow = useMemo(() => glowTexture(), []);
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const life = 150;
        const age = (frame + (i * life) / count + seed * 13) % life;
        const a = age / life;
        const drift = n(`sm${seed}${i}`, (frame - age) * 0.02) * 0.8;
        const sz = scale * (0.6 + a * 2.4);
        return (
          <sprite key={i} position={[(drift + a * 0.6) * scale, a * rise * 6 * scale, n(`sz${seed}${i}`, a) * 0.4 * scale]} scale={[sz, sz, 1]}>
            <spriteMaterial map={glow} color={color} transparent opacity={0.34 * Math.sin(Math.PI * a)} depthWrite={false} fog />
          </sprite>
        );
      })}
    </group>
  );
};

/** Dust kicked up at a ground point (footfall, hoof): a short-lived puff driven by an event frame. */
export const DustPuff: React.FC<{ frame: number; at: number; position: V3; color?: string; size?: number }> = ({ frame, at, position, color = "#b49a74", size = 0.5 }) => {
  const glow = useMemo(() => glowTexture(), []);
  const age = frame - at;
  if (age < 0 || age > 40) return null;
  const a = age / 40;
  return (
    <sprite position={[position[0], position[1] + a * 0.25, position[2]]} scale={[size * (0.4 + a * 1.6), size * (0.3 + a), 1]}>
      <spriteMaterial map={glow} color={color} transparent opacity={0.45 * (1 - a)} depthWrite={false} />
    </sprite>
  );
};

/** Starfield on a large sphere (points), twinkling deterministically. */
export const Stars: React.FC<{ frame: number; count?: number; radius?: number }> = ({ frame, count = 900, radius = 400 }) => {
  const g = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const v = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
      const th = u * Math.PI * 2;
      const ph = Math.acos(1 - v * 0.95); // upper hemisphere bias
      pos.set([radius * Math.sin(ph) * Math.cos(th), radius * Math.cos(ph) * 0.8 + 20, radius * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [count, radius]);
  const tw = 0.85 + Math.sin(frame * 0.07) * 0.05;
  return (
    <points geometry={g}>
      <pointsMaterial color="#dfe8ff" size={1.6} sizeAttenuation={false} transparent opacity={tw} fog={false} depthWrite={false} />
    </points>
  );
};
