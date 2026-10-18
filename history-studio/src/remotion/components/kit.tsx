import React from "react";
import { useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { C } from "../theme";
import { flicker, rand } from "../lib/anim";
import { Figure, walkPose, walkBob, type Costume, COSTUMES } from "./Figure";

export const W = 1920;
export const H = 1080;

export type TimeOfDay = "night" | "dusk" | "dawn" | "day" | "sunrise" | "morning";
const SKIES: Record<TimeOfDay, [string, string, string]> = {
  night: ["#070d1a", "#122038", "#24324d"],
  dusk: ["#2a2145", "#7a4a5e", "#e08a52"],
  dawn: ["#33405e", "#b9878a", "#f4c08a"],
  sunrise: ["#4f6a8c", "#e7a777", "#ffd9a0"],
  day: ["#7fb2d0", "#b9d6e2", "#efe4cc"],
  morning: ["#8fb8cf", "#d6dccf", "#f3e6c8"],
};

export const Sky: React.FC<{ time: TimeOfDay; id?: string }> = ({ time, id = "sky" }) => {
  const [a, b, c] = SKIES[time];
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.6" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <rect x={-600} y={-600} width={W + 1200} height={H + 1200} fill={`url(#${id})`} />
    </>
  );
};

export const Stars: React.FC<{ count?: number; seed?: number }> = ({ count = 90, seed = 1 }) => {
  const f = useCurrentFrame();
  return (
    <g>
      {[...Array(count)].map((_, i) => {
        const tw = 0.55 + 0.45 * Math.sin(f / (9 + rand(i + seed) * 20) + i);
        return <circle key={i} cx={rand(i * 3 + seed) * (W + 400) - 200} cy={rand(i * 7 + seed) * 560 - 120} r={0.8 + rand(i * 11) * 1.8} fill="#fff" opacity={tw * 0.8} />;
      })}
    </g>
  );
};

export const Moon: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 46 }) => (
  <g>
    <defs>
      <radialGradient id="moonGlow">
        <stop offset="0" stopColor="#fff6d8" stopOpacity="0.5" />
        <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r * 4} fill="url(#moonGlow)" />
    <circle cx={x} cy={y} r={r} fill="#f6efd6" />
    <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.18} fill="#e4dbbd" />
    <circle cx={x + r * 0.25} cy={y + r * 0.3} r={r * 0.12} fill="#e4dbbd" />
  </g>
);

export const Sun: React.FC<{ x: number; y: number; r?: number; color?: string }> = ({ x, y, r = 70, color = "#ffd79a" }) => (
  <g>
    <defs>
      <radialGradient id="sunGlow">
        <stop offset="0" stopColor={color} stopOpacity="0.75" />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r * 5} fill="url(#sunGlow)" />
    <circle cx={x} cy={y} r={r} fill={color} />
  </g>
);

export const Clouds: React.FC<{ y?: number; color?: string; count?: number; seed?: number; speed?: number; opacity?: number }> = ({ y = 160, color = "#fff", count = 5, seed = 3, speed = 0.4, opacity = 0.5 }) => {
  const f = useCurrentFrame();
  return (
    <g opacity={opacity}>
      {[...Array(count)].map((_, i) => {
        const cx = ((rand(i + seed) * (W + 800) + f * speed * (0.5 + rand(i * 5))) % (W + 800)) - 400;
        const cy = y + rand(i * 9 + seed) * 140;
        const s = 0.7 + rand(i * 13) * 0.9;
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
            <ellipse cx={0} cy={0} rx={150} ry={34} fill={color} />
            <ellipse cx={-60} cy={-18} rx={70} ry={36} fill={color} />
            <ellipse cx={40} cy={-26} rx={86} ry={44} fill={color} />
          </g>
        );
      })}
    </g>
  );
};

/** A ridge line generated from noise; fills down to the bottom. */
export const Hills: React.FC<{ y: number; color: string; amp?: number; seed?: string; freq?: number; x0?: number; x1?: number }> = ({ y, color, amp = 80, seed = "h", freq = 0.0025, x0 = -800, x1 = W + 800 }) => {
  let d = `M${x0},${H + 600} L${x0},${y}`;
  for (let x = x0; x <= x1; x += 24) d += ` L${x},${(y - (noise2D(seed, x * freq, 0) * 0.6 + noise2D(seed + "2", x * freq * 3, 0) * 0.25 + 0.4) * amp).toFixed(1)}`;
  d += ` L${x1},${H + 600}Z`;
  return <path d={d} fill={color} />;
};

/** Deccan hill fort: irregular bastioned wall following a hilltop. */
export const HillFort: React.FC<{ x: number; y: number; scale?: number; color?: string; flag?: string; shade?: string }> = ({ x, y, scale = 1, color = "#5d5248", flag, shade = "#463d35" }) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-230,40 Q-150,-90 -40,-120 Q60,-140 150,-100 Q230,-60 260,40Z" fill={shade} />
      <path d="M-170,-40 L-170,-96 L-150,-96 L-150,-110 L-120,-110 L-120,-96 L-60,-120 L-60,-134 L-30,-134 L-30,-120 L40,-128 L40,-142 L70,-142 L70,-128 L140,-106 L140,-120 L168,-120 L168,-90 L200,-40Z" fill={color} />
      {[-160, -100, -40, 20, 80, 140].map((bx, i) => (
        <rect key={i} x={bx} y={-150 + Math.abs(bx) * 0.12} width={18} height={14} fill={color} />
      ))}
      {flag && (
        <g transform="translate(54 -142)">
          <line x1={0} y1={0} x2={0} y2={-80} stroke="#3a2f26" strokeWidth={4} />
          <path d={`M0,-80 Q${20},${-86 + Math.sin(f / 6) * 6} ${44},${-76 + Math.sin(f / 6 + 1) * 6} L${40},${-58 + Math.sin(f / 6 + 1.5) * 6} Q${20},${-62 + Math.sin(f / 6 + 0.7) * 5} 0,-56Z`} fill={flag} />
        </g>
      )}
    </g>
  );
};

/** Horizontal river band with drifting shimmer strokes. */
export const River: React.FC<{ y: number; h: number; color?: string; light?: string; speed?: number }> = ({ y, h, color = C.river, light = C.riverLight, speed = 1 }) => {
  const f = useCurrentFrame();
  return (
    <g>
      <rect x={-800} y={y} width={W + 1600} height={h + 600} fill={color} />
      {[...Array(36)].map((_, i) => {
        const yy = y + 8 + rand(i * 3) * (h - 10);
        const x = ((rand(i * 7) * (W + 800) + f * speed * (1 + rand(i) * 1.5)) % (W + 800)) - 400;
        return <rect key={i} x={x} y={yy} width={40 + rand(i * 11) * 120} height={2.5} rx={1.2} fill={light} opacity={0.25 + 0.35 * Math.abs(Math.sin(f / 20 + i))} />;
      })}
    </g>
  );
};

export const Rain: React.FC<{ count?: number; opacity?: number; angle?: number }> = ({ count = 160, opacity = 0.35, angle = 12 }) => {
  const f = useCurrentFrame();
  return (
    <g opacity={opacity} stroke="#b9c8d8" strokeWidth={1.6}>
      {[...Array(count)].map((_, i) => {
        const x = rand(i) * (W + 400) - 200;
        const y = ((rand(i * 5) * (H + 200) + f * (28 + rand(i * 3) * 12)) % (H + 200)) - 100;
        return <line key={i} x1={x} y1={y} x2={x - angle} y2={y + 34} />;
      })}
    </g>
  );
};

export const Particles: React.FC<{ count?: number; color?: string; area?: [number, number, number, number]; size?: number; seed?: number; rise?: number; glow?: boolean }> = ({ count = 40, color = "#fff3c8", area = [0, 0, W, H], size = 2.4, seed = 5, rise = 0.3, glow = false }) => {
  const f = useCurrentFrame();
  const [ax, ay, aw, ah] = area;
  return (
    <g>
      {[...Array(count)].map((_, i) => {
        const x = ax + ((rand(i + seed) * aw + noise2D("px" + i, f * 0.01, 0) * 40) % aw);
        const y = ay + ((rand(i * 3 + seed) * ah - f * rise * (0.5 + rand(i))) % ah + ah) % ah;
        const o = 0.3 + 0.7 * Math.abs(Math.sin(f / (14 + rand(i) * 20) + i));
        return <circle key={i} cx={x} cy={y} r={size * (0.6 + rand(i * 9))} fill={color} opacity={o * (glow ? 0.9 : 0.5)} />;
      })}
    </g>
  );
};

export const Glow: React.FC<{ x: number; y: number; r: number; color?: string; intensity?: number; id: string }> = ({ x, y, r, color = C.torch, intensity = 0.6, id }) => (
  <g>
    <defs>
      <radialGradient id={id}>
        <stop offset="0" stopColor={color} stopOpacity={intensity} />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r} fill={`url(#${id})`} />
  </g>
);

export const Flame: React.FC<{ x: number; y: number; s?: number; seed: string }> = ({ x, y, s = 1, seed }) => {
  const f = useCurrentFrame();
  const k = flicker(seed, f, 0.18);
  const sway = noise2D(seed, f * 0.15, 3) * 4;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M0,0 C-10,-8 -8,-26 ${sway},-${38 * k} C8,-26 10,-8 0,0Z`} fill="#ffb347" />
      <path d={`M0,0 C-5,-5 -4,-16 ${sway * 0.6},-${24 * k} C4,-16 5,-5 0,0Z`} fill="#fff1b0" />
    </g>
  );
};

export const Torch: React.FC<{ x: number; y: number; s?: number; seed: string; glow?: boolean }> = ({ x, y, s = 1, seed, glow = true }) => {
  const f = useCurrentFrame();
  return (
    <g>
      {glow && <Glow id={`tg${seed}`} x={x} y={y - 40 * s} r={150 * s * flicker(seed, f, 0.08)} intensity={0.45} />}
      <rect x={x - 3 * s} y={y - 30 * s} width={6 * s} height={34 * s} fill="#4a3220" />
      <Flame x={x} y={y - 30 * s} s={s} seed={seed} />
    </g>
  );
};

export const Lamp: React.FC<{ x: number; y: number; s?: number; seed: string; glowR?: number }> = ({ x, y, s = 1, seed, glowR = 260 }) => {
  const f = useCurrentFrame();
  return (
    <g>
      <Glow id={`lg${seed}`} x={x} y={y - 12 * s} r={glowR * s * flicker(seed, f, 0.06)} intensity={0.5} />
      <path d={`M${x - 16 * s},${y} Q${x},${y + 12 * s} ${x + 16 * s},${y} L${x + 10 * s},${y - 6 * s} L${x - 10 * s},${y - 6 * s}Z`} fill="#8a5a2c" />
      <Flame x={x + 8 * s} y={y - 6 * s} s={0.55 * s} seed={seed} />
    </g>
  );
};

/** Crenellated wall segment (Mughal red sandstone by default). */
export const Wall: React.FC<{ x: number; y: number; w: number; h: number; color?: string; dark?: string; merlon?: number }> = ({ x, y, w, h, color = C.sandstone, dark = C.sandstoneDark, merlon = 26 }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={color} />
    <rect x={x} y={y + h * 0.12} width={w} height={6} fill={dark} opacity={0.6} />
    {[...Array(Math.floor(w / (merlon * 1.6)))].map((_, i) => (
      <path key={i} d={`M${x + i * merlon * 1.6 + 4},${y} l0,-${merlon * 0.8} q${merlon / 2},-${merlon * 0.5} ${merlon},0 l0,${merlon * 0.8}z`} fill={color} />
    ))}
    {[...Array(Math.floor(w / 120))].map((_, i) => <rect key={i} x={x + 50 + i * 120} y={y + h * 0.35} width={8} height={22} rx={4} fill={dark} />)}
  </g>
);

/** Cusped (multifoil) arch opening, Mughal style. */
export const archPath = (x: number, y: number, w: number, h: number) => {
  const r = w / 2;
  const top = y - h;
  return `M${x - r},${y} L${x - r},${top + r * 1.1} Q${x - r},${top + r * 0.3} ${x - r * 0.55},${top + r * 0.35} Q${x - r * 0.5},${top - r * 0.05} ${x},${top - r * 0.25} Q${x + r * 0.5},${top - r * 0.05} ${x + r * 0.55},${top + r * 0.35} Q${x + r},${top + r * 0.3} ${x + r},${top + r * 1.1} L${x + r},${y}Z`;
};

export const Gate: React.FC<{ x: number; y: number; w?: number; h?: number; color?: string; inner?: string; tower?: string; dome?: string }> = ({ x, y, w = 220, h = 300, color = C.sandstone, inner = "#2a140e", tower = C.sandstoneLight, dome = C.marble }) => (
  <g>
    <rect x={x - w * 0.9} y={y - h} width={w * 1.8} height={h} fill={color} />
    <rect x={x - w * 1.1} y={y - h - 60} width={w * 0.5} height={h + 60} fill={tower} />
    <rect x={x + w * 0.6} y={y - h - 60} width={w * 0.5} height={h + 60} fill={tower} />
    <path d={archPath(x, y, w * 0.7, h * 0.78)} fill={inner} />
    <path d={archPath(x, y - h * 0.84, w * 0.5, 40)} fill={C.sandstoneDark} />
    <Dome x={x - w * 0.85} y={y - h - 60} r={40} color={dome} />
    <Dome x={x + w * 0.85} y={y - h - 60} r={40} color={dome} />
  </g>
);

export const Dome: React.FC<{ x: number; y: number; r: number; color?: string }> = ({ x, y, r, color = C.marble }) => (
  <g>
    <rect x={x - r * 1.05} y={y - 6} width={r * 2.1} height={8} fill={C.sandstoneDark} />
    <path d={`M${x - r},${y - 4} Q${x - r},${y - r * 1.5} ${x},${y - r * 1.7} Q${x + r},${y - r * 1.5} ${x + r},${y - 4}Z`} fill={color} />
    <line x1={x} y1={y - r * 1.7} x2={x} y2={y - r * 2.2} stroke={C.gold} strokeWidth={4} />
    <circle cx={x} cy={y - r * 2.2} r={4} fill={C.gold} />
  </g>
);

/** Row of cusped arches on columns (Diwan-i-Khas style). */
export const Arcade: React.FC<{ x: number; y: number; w: number; h: number; n: number; color?: string; inner?: string; pillar?: string }> = ({ x, y, w, h, n, color = C.marble, inner = "#2b2a33", pillar = C.marbleShade }) => {
  const bay = w / n;
  return (
    <g>
      <rect x={x} y={y - h - 40} width={w} height={h + 40} fill={color} />
      {[...Array(n)].map((_, i) => (
        <g key={i}>
          <path d={archPath(x + bay * (i + 0.5), y, bay * 0.78, h * 0.86)} fill={inner} />
          <rect x={x + bay * i - 7} y={y - h} width={14} height={h} fill={pillar} />
        </g>
      ))}
      <rect x={x} y={y - h - 52} width={w} height={14} fill={C.gold} opacity={0.65} />
    </g>
  );
};

/** Lattice (jali) screen: a stone panel whose holes reveal whatever is drawn behind it. */
export const Jali: React.FC<{ x: number; y: number; w: number; h: number; color?: string; id: string; opacity?: number; hole?: number }> = ({ x, y, w, h, color = C.marble, id, opacity = 1, hole = 11 }) => (
  <g opacity={opacity}>
    <defs>
      <pattern id={`${id}-p`} width={40} height={40} patternUnits="userSpaceOnUse" x={x} y={y}>
        <rect width={40} height={40} fill="#fff" />
        <circle cx={20} cy={20} r={hole} fill="#000" />
        <path d="M0,0 L8,0 L0,8Z M40,0 L32,0 L40,8Z M0,40 L8,40 L0,32Z M40,40 L32,40 L40,32Z" fill="#000" />
      </pattern>
      <mask id={`${id}-m`}>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-p)`} />
      </mask>
    </defs>
    <rect x={x} y={y} width={w} height={h} fill={color} mask={`url(#${id}-m)`} />
  </g>
);

export const Tent: React.FC<{ x: number; y: number; w?: number; h?: number; color?: string; stripe?: string }> = ({ x, y, w = 260, h = 170, color = "#d8c7a0", stripe = "#a8402e" }) => (
  <g>
    <path d={`M${x - w / 2},${y} L${x - w * 0.42},${y - h * 0.62} L${x},${y - h} L${x + w * 0.42},${y - h * 0.62} L${x + w / 2},${y}Z`} fill={color} />
    <path d={`M${x - w * 0.42},${y - h * 0.62} L${x + w * 0.42},${y - h * 0.62}`} stroke={stripe} strokeWidth={10} />
    <path d={`M${x - 26},${y} L${x},${y - h * 0.5} L${x + 26},${y}Z`} fill="#3a2a1c" />
    <line x1={x} y1={y - h} x2={x} y2={y - h - 30} stroke="#5a4630" strokeWidth={4} />
  </g>
);

export const Flag: React.FC<{ x: number; y: number; color: string; color2?: string; pole?: number; s?: number }> = ({ x, y, color, color2, pole = 140, s = 1 }) => {
  const f = useCurrentFrame();
  const w = (t: number) => Math.sin(f / 7 + t) * 7;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <line x1={0} y1={0} x2={0} y2={-pole} stroke="#4a3a2a" strokeWidth={5} />
      <path d={`M0,${-pole} Q30,${-pole - 6 + w(0)} 70,${-pole + w(1)} L64,${-pole + 44 + w(1.6)} Q30,${-pole + 40 + w(0.7)} 0,${-pole + 46}Z`} fill={color} />
      {color2 && <path d={`M0,${-pole + 24} Q30,${-pole + 18 + w(0.3)} 67,${-pole + 22 + w(1.3)} L64,${-pole + 44 + w(1.6)} Q30,${-pole + 40 + w(0.7)} 0,${-pole + 46}Z`} fill={color2} />}
    </g>
  );
};

export const Elephant: React.FC<{ x: number; y: number; s?: number; phase?: number; flag?: string; howdah?: boolean }> = ({ x, y, s = 1, phase = 0, flag, howdah = true }) => {
  const lg = (o: number) => Math.sin((phase + o) * Math.PI * 2) * 10;
  const trunk = Math.sin(phase * Math.PI * 2) * 6;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[[-70, 0.5], [40, 0]].map(([lx, o], i) => <rect key={i} x={lx + lg(o)} y={-110} width={34} height={110} rx={14} fill="#6e6a6c" />)}
      <ellipse cx={0} cy={-150} rx={130} ry={82} fill="#858083" />
      {[[-50, 0], [60, 0.5]].map(([lx, o], i) => <rect key={i} x={lx + lg(o)} y={-110} width={36} height={112} rx={14} fill="#858083" />)}
      <ellipse cx={128} cy={-178} rx={62} ry={56} fill="#858083" />
      <path d={`M170,-160 Q${206 + trunk},-100 ${186 + trunk},-36 L${172 + trunk},-38 Q${188 + trunk},-100 158,-150Z`} fill="#858083" />
      <path d="M96,-210 Q60,-200 70,-150 Q90,-120 116,-148Z" fill="#76717a" />
      <circle cx={150} cy={-190} r={4} fill="#222" />
      <path d="M160,-150 q14,6 24,0" stroke="#efe8d8" strokeWidth={5} fill="none" />
      {howdah && (
        <g>
          <path d="M-90,-210 L70,-210 L80,-160 L-100,-160Z" fill={C.vermilion} />
          <path d="M-90,-210 L70,-210" stroke={C.gold} strokeWidth={6} />
          <path d="M-60,-210 Q-10,-260 40,-210" fill={C.gold} />
        </g>
      )}
      {flag && <Flag x={-20} y={-250} color={flag} color2={C.vermilion} pole={110} />}
    </g>
  );
};

export const Horse: React.FC<{ x: number; y: number; s?: number; phase?: number; color?: string; rider?: Costume | keyof typeof COSTUMES; gallop?: boolean; trappings?: string }> = ({ x, y, s = 1, phase = 0, color = "#6b4a33", rider, gallop = false, trappings }) => {
  const a = gallop ? 26 : 14;
  const lg = (o: number) => Math.sin((phase + o) * Math.PI * 2) * a;
  const bob = gallop ? Math.abs(Math.sin(phase * Math.PI * 2)) * -10 : Math.sin(phase * Math.PI * 4) * -2;
  const leg = (lx: number, o: number, c: string) => <line x1={lx} y1={-90} x2={lx + lg(o)} y2={0} stroke={c} strokeWidth={12} strokeLinecap="round" />;
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${s})`}>
      {leg(-62, 0.5, "#4a3322")}
      {leg(52, 0, "#4a3322")}
      <ellipse cx={0} cy={-112} rx={84} ry={36} fill={color} />
      {leg(-50, 0, color)}
      {leg(64, 0.5, color)}
      <path d="M62,-130 Q96,-182 120,-196 L134,-178 Q112,-160 92,-112Z" fill={color} />
      <path d="M118,-198 l34,18 q4,10 -6,14 l-34,-10z" fill={color} />
      <path d="M70,-142 Q88,-190 118,-202" stroke="#2a1c12" strokeWidth={8} fill="none" />
      <path d={`M-84,-118 Q-110,${-100 + lg(0.2) * 0.4} -104,-66`} stroke="#2a1c12" strokeWidth={9} fill="none" strokeLinecap="round" />
      {trappings && <path d="M-40,-148 L40,-148 L46,-96 L-46,-96Z" fill={trappings} opacity={0.9} />}
      {rider && <Figure costume={rider} pose={{ hipR: 70, kneeR: 80, hipL: 64, kneeL: 76, shR: 40, elR: 30, lean: gallop ? 16 : 4, crouch: 0 }} x={0} y={-62} scale={0.9} />}
    </g>
  );
};

/** Two porters carrying a basket slung from a pole, walking. */
export const BasketPair: React.FC<{ x: number; y: number; s?: number; phase: number; lidOpen?: number; hidden?: "shivaji" | "sambhaji"; facing?: 1 | -1; walking?: boolean }> = ({ x, y, s = 1, phase, lidOpen = 0, hidden, facing = 1, walking = true }) => {
  const bob = walking ? walkBob(phase) : 0;
  const p1 = walking ? walkPose(phase, 0.8) : {};
  const p2 = walking ? walkPose(phase + 0.5, 0.8) : {};
  const carry = { shR: 150, elR: 20, shL: 150, elL: 20 };
  const swing = walking ? Math.sin(phase * Math.PI * 2) * 3 : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * facing} ${s})`}>
      <Figure costume="porter" pose={{ ...p2, ...carry }} x={-150} y={bob} />
      <line x1={-170} y1={-276 + bob} x2={170} y2={-276 + bob} stroke="#7a5a32" strokeWidth={9} strokeLinecap="round" />
      <g transform={`rotate(${swing} 0 ${-276 + bob})`}>
        <line x1={-30} y1={-276 + bob} x2={-48} y2={-210 + bob} stroke="#5a4226" strokeWidth={3} />
        <line x1={30} y1={-276 + bob} x2={48} y2={-210 + bob} stroke="#5a4226" strokeWidth={3} />
        <Basket x={0} y={-118 + bob} lidOpen={lidOpen} hidden={hidden} />
      </g>
      <Figure costume="porter" pose={{ ...p1, ...carry }} x={150} y={bob} />
    </g>
  );
};

export const Basket: React.FC<{ x: number; y: number; s?: number; lidOpen?: number; hidden?: "shivaji" | "sambhaji"; cutaway?: boolean }> = ({ x, y, s = 1, lidOpen = 0, hidden, cutaway }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <defs>
      <pattern id="weave" width={16} height={12} patternUnits="userSpaceOnUse">
        <rect width={16} height={12} fill="#b8894a" />
        <path d="M0,6 Q4,0 8,6 T16,6" stroke="#8f6530" strokeWidth={2} fill="none" />
      </pattern>
    </defs>
    <path d="M-70,-90 L70,-90 L56,0 Q0,12 -56,0Z" fill="url(#weave)" />
    {cutaway && (
      <g>
        <path d="M-58,-82 L58,-82 L48,-6 Q0,4 -48,-6Z" fill="#2a1c12" />
        {hidden && <Figure costume={hidden} pose={{ crouch: 1, hipR: 110, kneeR: 150, hipL: 100, kneeL: 150, lean: 50, head: 20, shR: 60, elR: 90, shL: 50, elL: 90 }} x={0} y={-6} scale={hidden === "sambhaji" ? 0.42 : 0.3} />}
        {[...Array(9)].map((_, i) => <circle key={i} cx={-44 + i * 11} cy={-80 - (i % 2) * 6} r={8} fill={i % 3 ? "#e8b04a" : "#f0d27a"} />)}
      </g>
    )}
    <path d="M-72,-92 L72,-92" stroke="#7a5426" strokeWidth={6} />
    <g transform={`rotate(${-lidOpen * 70} -70 -92)`}>
      <path d="M-74,-92 Q0,-130 74,-92Z" fill="#a5793e" />
    </g>
    {lidOpen > 0.3 && [...Array(7)].map((_, i) => <circle key={i} cx={-40 + i * 13} cy={-94 - (i % 2) * 5} r={7.5} fill={i % 3 ? "#e8b04a" : "#f0d27a"} />)}
  </g>
);

export const Bed: React.FC<{ x: number; y: number; w?: number; quilt?: string; empty?: boolean; children?: React.ReactNode }> = ({ x, y, w = 520, quilt = "#7d2f3a", empty, children }) => (
  <g>
    <rect x={x - w / 2} y={y - 20} width={w} height={26} rx={6} fill="#6b4524" />
    {[x - w / 2 + 8, x + w / 2 - 26].map((lx, i) => <rect key={i} x={lx} y={y} width={18} height={70} fill="#5a3a1e" />)}
    <rect x={x - w / 2 + 6} y={y - 40} width={w - 12} height={26} rx={10} fill="#efe6d2" />
    <ellipse cx={x - w / 2 + 70} cy={y - 50} rx={60} ry={20} fill="#f4ecdc" />
    {children}
    {empty ? <path d={`M${x - w / 2 + 120},${y - 44} q${w * 0.3},-14 ${w * 0.55},0 l10,24 l-${w * 0.57},2z`} fill={quilt} opacity={0.95} /> : null}
  </g>
);

export const Cannon: React.FC<{ x: number; y: number; s?: number; smoke?: number }> = ({ x, y, s = 1, smoke = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-10} y={-50} width={110} height={26} rx={12} fill="#3d3d40" transform="rotate(-14 0 -36)" />
    <circle cx={0} cy={-14} r={26} fill="#5a3c22" />
    <circle cx={0} cy={-14} r={8} fill="#2a1c12" />
    {smoke > 0 && [...Array(5)].map((_, i) => <circle key={i} cx={120 + i * 26 * smoke} cy={-76 - i * 18 * smoke} r={20 + i * 10 * smoke} fill="#d9d4cc" opacity={0.6 * (1 - smoke * 0.6)} />)}
  </g>
);

export const Boat: React.FC<{ x: number; y: number; s?: number; lantern?: boolean; seed?: string }> = ({ x, y, s = 1, lantern, seed = "b" }) => {
  const f = useCurrentFrame();
  const rock = Math.sin(f / 18 + x) * 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rock})`}>
      <path d="M-140,0 Q-120,34 0,36 Q120,34 150,-6 L120,0Z" fill="#2c1e14" />
      <line x1={-20} y1={0} x2={-20} y2={-120} stroke="#2c1e14" strokeWidth={5} />
      <path d="M-18,-118 L60,-40 L-18,-30Z" fill="#3d3027" />
      {lantern && <Glow id={`bl${seed}`} x={110} y={-30} r={70} intensity={0.6} />}
      {lantern && <circle cx={110} cy={-30} r={7} fill="#ffcf7a" />}
    </g>
  );
};

/** Darkened edges for a cinematic frame. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <radialGradient id="vig" cx="50%" cy="50%" r="75%">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity={strength} />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#vig)" />
  </svg>
);
