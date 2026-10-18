import React, { createContext, useContext } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** Interpolate between keyframes [[frame, value], ...] with easing and clamping. */
export function kf(frame: number, keys: [number, number][], ease = easeInOut): number {
  if (keys.length === 1) return keys[0][1];
  return interpolate(frame, keys.map((k) => k[0]), keys.map((k) => k[1]), { ...clamp, easing: ease });
}

/** 0..1 progress between two frames. */
export const prog = (frame: number, a: number, b: number, ease = easeInOut) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: ease });

/** Smooth organic wobble (deterministic). */
export const wobble = (seed: string, frame: number, speed = 0.02, amp = 1) => noise2D(seed, frame * speed, 0) * amp;

/** Torch / lamp flicker multiplier around 1. */
export const flicker = (seed: string, frame: number, amt = 0.12) => 1 + noise2D(seed, frame * 0.25, 1) * amt + noise2D(seed + "b", frame * 0.9, 2) * amt * 0.4;

/** Pseudo-random in [0,1) from an integer seed (deterministic across renders). */
export const rand = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ----- Shot context: frame within the shot and its duration -----
export interface ShotInfo {
  frame: number;
  duration: number;
  /** progress 0..1 across the shot */
  p: number;
}
export const ShotCtx = createContext<ShotInfo>({ frame: 0, duration: 1, p: 0 });
export const useShot = () => useContext(ShotCtx);

// ----- Camera with parallax layers -----
interface CamState { x: number; y: number; zoom: number }
const CamCtx = createContext<CamState>({ x: 0, y: 0, zoom: 1 });

export const Camera: React.FC<{ from: [number, number, number]; to: [number, number, number]; ease?: "inOut" | "out" | "linear"; children: React.ReactNode }> = ({ from, to, ease = "inOut", children }) => {
  const { p } = useShot();
  const e = ease === "linear" ? p : ease === "out" ? easeOut(p) : easeInOut(p);
  const cam = { x: from[0] + (to[0] - from[0]) * e, y: from[1] + (to[1] - from[1]) * e, zoom: from[2] + (to[2] - from[2]) * e };
  return <CamCtx.Provider value={cam}>{children}</CamCtx.Provider>;
};

/**
 * A parallax plane. depth 0 = fixed (sky), 1 = main action plane, >1 = foreground.
 * Camera x/y pan the plane by x*depth; zoom scales around the frame centre by (zoom-1)*depth.
 */
export const Layer: React.FC<{ depth?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ depth = 1, children, style }) => {
  const cam = useContext(CamCtx);
  const { width, height } = useVideoConfig();
  const s = 1 + (cam.zoom - 1) * depth;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
      <g transform={`translate(${width / 2} ${height / 2}) scale(${s}) translate(${-width / 2 - cam.x * depth} ${-height / 2 - cam.y * depth})`}>{children}</g>
    </svg>
  );
};

/** HTML (non-SVG) layer following the same camera rules. */
export const HtmlLayer: React.FC<{ depth?: number; children: React.ReactNode }> = ({ depth = 1, children }) => {
  const cam = useContext(CamCtx);
  const s = 1 + (cam.zoom - 1) * depth;
  return <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%", transform: `scale(${s}) translate(${-cam.x * depth}px, ${-cam.y * depth}px)` }}>{children}</div>;
};

export const useLocalFrame = () => useCurrentFrame();
