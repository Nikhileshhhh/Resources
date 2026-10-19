import React, { useLayoutEffect, useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, random } from "remotion";
import * as THREE from "three";

export type V3 = [number, number, number];

/** Camera keyframe: frame (within the shot), position, look-at target, vertical field of view (deg). */
export interface CamKey { f: number; pos: V3; target: V3; fov?: number }

const smooth = (t: number) => t * t * (3 - 2 * t);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Catmull-Rom through key positions, with eased timing between keys (a camera that accelerates and settles). */
function crm(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return [0, 1, 2].map((i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)) as V3;
}

export function camAt(frame: number, keys: CamKey[], ease: "smooth" | "smoother" | "linear" = "smoother"): { pos: V3; target: V3; fov: number } {
  if (keys.length === 1 || frame <= keys[0].f) return { pos: keys[0].pos, target: keys[0].target, fov: keys[0].fov ?? 35 };
  const last = keys[keys.length - 1];
  if (frame >= last.f) return { pos: last.pos, target: last.target, fov: last.fov ?? 35 };
  let i = 0;
  while (frame > keys[i + 1].f) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const raw = (frame - a.f) / (b.f - a.f);
  const t = ease === "linear" ? raw : ease === "smooth" ? smooth(raw) : smoother(raw);
  const k = (j: number) => keys[Math.max(0, Math.min(keys.length - 1, j))];
  return {
    pos: crm(k(i - 1).pos, a.pos, b.pos, k(i + 2).pos, t),
    target: crm(k(i - 1).target, a.target, b.target, k(i + 2).target, t),
    fov: (a.fov ?? 35) + ((b.fov ?? 35) - (a.fov ?? 35)) * t,
  };
}

/** Sets the default camera every frame from keyframes; optional handheld drift (seeded, deterministic). */
const CameraRig: React.FC<{ keys: CamKey[]; handheld?: number; ease?: "smooth" | "smoother" | "linear" }> = ({ keys, handheld = 0, ease }) => {
  const frame = useCurrentFrame();
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const c = camAt(frame, keys, ease);
    const n = (s: number) => (handheld ? (Math.sin(frame * 0.031 + s) * 0.6 + Math.sin(frame * 0.077 + s * 2.3) * 0.4) * handheld : 0);
    camera.position.set(c.pos[0] + n(1), c.pos[1] + n(2), c.pos[2] + n(3));
    camera.lookAt(c.target[0] + n(4) * 0.5, c.target[1] + n(5) * 0.5, c.target[2]);
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov = c.fov;
    pc.aspect = size.width / size.height;
    pc.near = 0.05;
    pc.far = 900;
    pc.updateProjectionMatrix();
  });
  return null;
};

/** Renderer settings that need the live WebGLRenderer. */
const RendererSetup: React.FC<{ exposure: number }> = ({ exposure }) => {
  const { gl } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
  }, [gl, exposure]);
  return null;
};

export interface StageProps {
  cam: CamKey[];
  camEase?: "smooth" | "smoother" | "linear";
  handheld?: number;
  background: string;
  fog?: { color: string; near: number; far: number };
  exposure?: number;
  /** Grade overlay: vignette strength 0..1, grain 0..1, tint (CSS colour with alpha) */
  grade?: { vignette?: number; grain?: number; tint?: string; contrast?: number; saturate?: number };
  children: React.ReactNode;
}

/** A 3D shot: ThreeCanvas + camera rig + filmic tone mapping, with a CSS grade on top (vignette, grain, tint). */
export const Stage3D: React.FC<StageProps> = ({ cam, camEase, handheld, background, fog, exposure = 1, grade = {}, children }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const { vignette = 0.55, grain = 0.06, tint, contrast = 1.06, saturate = 1.04 } = grade;
  return (
    <AbsoluteFill style={{ background }}>
      <div style={{ position: "absolute", inset: 0, filter: `contrast(${contrast}) saturate(${saturate})` }}>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }} camera={{ fov: 35, position: [0, 2, 10] }}>
          <RendererSetup exposure={exposure} />
          <CameraRig keys={cam} handheld={handheld} ease={camEase} />
          <color attach="background" args={[background]} />
          {fog && <fog attach="fog" args={[fog.color, fog.near, fog.far]} />}
          {children}
        </ThreeCanvas>
      </div>
      {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light" }} />}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)` }} />
      {grain > 0 && <Grain amount={grain} seed={frame} />}
    </AbsoluteFill>
  );
};

/** Film grain: an SVG turbulence tile that changes every frame. */
const Grain: React.FC<{ amount: number; seed: number }> = ({ amount, seed }) => (
  <AbsoluteFill style={{ opacity: amount, mixBlendMode: "overlay" }}>
    <svg width="100%" height="100%">
      <filter id={`g${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed % 997} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${seed})`} />
    </svg>
  </AbsoluteFill>
);

/** Shared radial-gradient texture for glows, flames and light pools. */
let glowTex: THREE.Texture | null = null;
export function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.6, "rgba(255,255,255,0.12)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Additive billboard glow (fake bloom) around lights. */
export const Glow: React.FC<{ position: V3; size: number; color: string; opacity?: number }> = ({ position, size, color, opacity = 1 }) => {
  const tex = useMemo(() => glowTexture(), []);
  return (
    <sprite position={position} scale={[size, size, size]}>
      <spriteMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </sprite>
  );
};

/** Additive light pool on the ground (cheap stand-in for many point lights). */
export const LightPool: React.FC<{ position: V3; radius: number; color: string; opacity?: number }> = ({ position, radius, color, opacity = 0.5 }) => {
  const tex = useMemo(() => glowTexture(), []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

/** Deterministic random in [0,1) for scene dressing. */
export const r01 = (seed: string | number) => random(String(seed));
