import React from "react";
import { Stage3D, Glow, LightPool, type CamKey, type V3 } from "../engine/Stage3D";
import { Flame, Smoke, Stars } from "../engine/fx";
import { Moon, SkyDome, Water, Reflection } from "../engine/env";
import { Character3D, type Pose3 } from "../character/Character3D";
import { add, idle, keyed, mix, walk, walkPath, pathPoint, cycleLength, ease, type P2 } from "../motion/motion";
import { CARRY_R, CROUCH, SPEAR_REST_L, SQUAT_LIFT, STAND, TORCH_HOLD_R, WAVE_ON } from "../motion/poses";
import { Basket, Bastion, Chhatri, FortWall, Gateway, Ground, Haveli, OnionDome, Pole, Rope, flatMat, plasterMat, stoneMat, MARBLE } from "./architecture";
import { swing, bobPosition } from "../physics/pendulum";

export interface Shot3DProps {
  frame: number;
  duration: number;
  shotId: string;
  cue: (word: string, fallback: number, nth?: number) => number;
  [k: string]: unknown;
}

// ---------------------------------------------------------------- shared night lighting
const NightLight: React.FC<{ moonDir?: V3; intensity?: number }> = ({ moonDir = [-30, 45, 40], intensity = 0.9 }) => (
  <>
    <hemisphereLight args={["#5a78b8", "#2a1e14", 1.05]} />
    <directionalLight position={moonDir} intensity={intensity * 2.4} color="#a9bdff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-far={200} shadow-bias={-0.0005} />
  </>
);

const NIGHT_GRADE = { vignette: 0.62, grain: 0.07, tint: "rgba(30,60,120,0.18)", contrast: 1.08, saturate: 1.02 };

/** A guard on watch: idle with torch held up and spear grounded; optional slow head scan. */
function sentryPose(f: number, seed: number, x: number, z: number, heading: number, scan = 1): Pose3 {
  const look = Math.sin(f / 30 * 0.35 + seed) * 25 * scan;
  return add(idle(f, seed, 0.8), TORCH_HOLD_R, SPEAR_REST_L, { x, z, heading, headTurn: look, lookX: look / 40 });
}

// ================================================================ s01a: Agra Fort at night, torch patrol
export const FortNight3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const cam: CamKey[] = [
    { f: 0, pos: [-10, 1.2, 58], target: [-2, 7, 0], fov: 34 },
    { f: duration * 0.55, pos: [-2, 4.5, 36], target: [1, 9, 0], fov: 32 },
    { f: duration, pos: [7, 13.6, 14], target: [3, 10.9, -1], fov: 30 },
  ];
  // patrol walking the rampart walkway (y = 10) eastward, phase-offset
  const walkers = [0, 1, 2].map((i) => walkPath(f + 60 - i * 70, [[-14, -1.2], [40, -1.2]], { speed: 1.05, loop: true, phase0: i * 0.31 }));
  return (
    <Stage3D cam={cam} handheld={0.03} background="#0a1222" fog={{ color: "#0d1a30", near: 35, far: 230 }} exposure={1.65} grade={NIGHT_GRADE}>
      <SkyDome horizon="#22345a" zenith="#05080f" glow={{ color: "#3b4f86", dir: [-0.5, 0.35, -0.8], size: 1.5 }} />
      <Stars frame={f} />
      <Moon position={[-160, 150, -300]} size={30} />
      <NightLight />
      {/* river Yamuna in front of the walls */}
      <Water frame={f} size={[260, 90]} position={[0, -0.3, 52]} seg={[110, 40]} amp={0.08} />
      <Reflection frame={f} position={[-9, -0.2, 12]} color="#b8c8f0" length={60} width={4} />
      {[-14.2, -5.8, -22, 6].map((x, i) => (
        <Reflection key={x} frame={f} position={[x, -0.2, 10]} color="#ff9a50" length={18} width={0.9} seed={i + 3} />
      ))}
      <Ground size={260} color="#3a2e22" y={-0.35} />
      {/* riverbank */}
      <mesh position={[0, -0.1, 6]} receiveShadow material={stoneMat("#5a3a2c", [30, 1])}>
        <boxGeometry args={[260, 0.6, 6]} />
      </mesh>
      {/* curtain walls and bastions */}
      <FortWall from={[-70, 0]} to={[-14, 0]} />
      <FortWall from={[-6, 0]} to={[70, 0]} />
      <Gateway position={[-10, 0, 0.5]} width={7} height={13} />
      {[-40, 14, 46].map((x) => (
        <Bastion key={x} position={[x, 1.5]} radius={3.4} height={12.5} />
      ))}
      {/* skyline behind the walls: white marble domes and pavilions */}
      <group position={[18, 0, -26]}>
        <mesh position={[0, 8, 0]} material={plasterMat("#e6dccb", [6, 2])} castShadow receiveShadow>
          <boxGeometry args={[26, 16, 10]} />
        </mesh>
        {[-8, 0, 8].map((x, i) => (
          <OnionDome key={x} position={[x, 16, 0]} radius={i === 1 ? 3.4 : 2.6} material={flatMat(MARBLE, 0.45)} />
        ))}
      </group>
      <Chhatri position={[-30, 10, -14]} scale={1.3} />
      <Chhatri position={[34, 10, -18]} scale={1.1} />
      <mesh position={[-30, 5, -14]} material={stoneMat()} castShadow>
        <boxGeometry args={[6, 10, 6]} />
      </mesh>
      <mesh position={[34, 5, -18]} material={stoneMat()} castShadow>
        <boxGeometry args={[5, 10, 5]} />
      </mesh>
      {/* walkway torches in brackets */}
      {[-50, -22, 6, 28, 58].map((x, i) => (
        <group key={x} position={[x, 10.9, 2.3]}>
          <Flame frame={f} seed={40 + i} size={0.34} />
          {i > 0 && i < 4 && <pointLight position={[0, 0.3, 1.2]} color="#ff9a48" intensity={60} distance={22} decay={1.7} />}
        </group>
      ))}
      {/* torches flanking the gate */}
      {[-14.2, -5.8].map((x, i) => (
        <group key={x} position={[x, 4.2, 3.2]}>
          <Flame frame={f} seed={48 + i} size={0.32} />
          <pointLight position={[0, 0.3, 1]} color="#ff9a48" intensity={45} distance={16} decay={1.7} />
        </group>
      ))}
      {/* the patrol */}
      {walkers.map((w, i) => (
        <group key={i} position={[0, 10, 0]}>
          <Character3D costume={i === 1 ? "rajputguard" : "guard"} pose={add(w.pose, { shR: 32, elR: 72, shRAbd: 8 })} frame={f} seed={i * 5} right="torch" left={i === 1 ? "none" : "spear"} lod={i === 0 ? "hi" : "lo"} />
          {i < 2 && <pointLight position={[w.pose.x ?? 0, 2.1, (w.pose.z ?? 0) + 0.3]} color="#ff9a40" intensity={35} distance={12} decay={1.7} />}
        </group>
      ))}
      {/* faint city glow and mist over the river */}
      <Glow position={[60, 2, -120]} size={80} color="#ff9a50" opacity={0.18} />
      <Smoke frame={f} seed={3} position={[-20, 0.2, 30]} scale={6} color="#2a3a58" count={8} rise={0.08} />
    </Stage3D>
  );
};

// ================================================================ s01b: the guarded house and the ring of torches
export const Compound3D: React.FC<Shot3DProps> = ({ frame: f, duration, guardRing = 28 }) => {
  const n = Number(guardRing);
  const cam: CamKey[] = [
    { f: 0, pos: [2.5, 2.0, 12.6], target: [0, 2.8, 0], fov: 38 },
    { f: duration, pos: [0, 24, 34], target: [0, 0, -2], fov: 40 },
  ];
  const R = 10.5;
  return (
    <Stage3D cam={cam} background="#0a1222" fog={{ color: "#0c1628", near: 30, far: 140 }} exposure={1.6} grade={NIGHT_GRADE}>
      <SkyDome horizon="#1f3050" zenith="#05080f" />
      <Stars frame={f} />
      <NightLight moonDir={[-25, 40, -30]} intensity={0.75} />
      <Ground size={220} color="#6a5438" />
      <Haveli position={[0, 0, -1]} lit={0.9} />
      {/* compound wall */}
      {[[0, -16, 34, 0], [0, 14, 34, 0], [-17, -1, 30, Math.PI / 2], [17, -1, 30, Math.PI / 2]].map(([x, z, len, ry], i) => (
        <mesh key={i} position={[x, 1.6, z]} rotation={[0, ry, 0]} material={plasterMat("#a88a66", [len / 4, 1])} castShadow receiveShadow>
          <boxGeometry args={[len, 3.2, 0.6]} />
        </mesh>
      ))}
      {/* the inner ring of guards, facing outward */}
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = Math.sin(a) * R;
        const z = Math.cos(a) * R * 0.85 - 1;
        const heading = (a * 180) / Math.PI;
        const near = z > 3;
        return (
          <group key={i}>
            <Character3D costume={i % 3 === 0 ? "rajputguard" : "guard"} pose={sentryPose(f, i, x, z, heading, near ? 1 : 0.4)} frame={f} seed={i} right="torch" left="spear" lod={near ? "hi" : "lo"} shadows={near} />
            <LightPool position={[x + Math.sin(a) * 0.3, 0.02, z + Math.cos(a) * 0.3]} radius={2.6} color="#ff8a3a" opacity={0.42} />
          </group>
        );
      })}
      <pointLight position={[0, 2.2, 9]} color="#ff9a40" intensity={60} distance={18} decay={1.6} />
      <pointLight position={[6, 2.2, 6]} color="#ff9a40" intensity={40} distance={14} decay={1.6} />
      <pointLight position={[-6, 2.2, 6]} color="#ff9a40" intensity={40} distance={14} decay={1.6} />
      <pointLight position={[0, 4, 4.5]} color="#ffb060" intensity={25} distance={12} decay={1.6} />
      {/* outer pickets: hundreds of torches into the distance (a thousand men) */}
      {Array.from({ length: 140 }, (_, i) => {
        const ring = 18 + (i % 7) * 7 + ((i * 37) % 5);
        const a = i * 2.39996;
        const x = Math.sin(a) * ring;
        const z = Math.cos(a) * ring * 0.9 - 1;
        const fl = 0.75 + 0.25 * Math.sin(f * 0.3 + i * 1.7);
        return (
          <group key={"p" + i}>
            <Glow position={[x, 2.1, z]} size={1.6 * fl} color="#ff9a40" opacity={0.85} />
            <Glow position={[x, 2.1, z]} size={0.35} color="#ffe2a0" />
          </group>
        );
      })}
    </Stage3D>
  );
};

// ================================================================ s13c: the basket cutaway
export const BasketCutaway3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue }) => {
  const crouchAt = cue("crouch", Math.round(duration * 0.55));
  const sonAt = cue("son", Math.round(duration * 0.85));
  const cam: CamKey[] = [
    { f: 0, pos: [-4.2, 1.5, 3.2], target: [-2.6, 0.7, 0], fov: 34 },
    { f: crouchAt - 10, pos: [-0.6, 1.4, 2.6], target: [0, 0.75, 0], fov: 30 },
    { f: sonAt - 4, pos: [0.9, 1.25, 2.2], target: [1.2, 0.65, 0], fov: 30 },
    { f: duration, pos: [1.6, 1.1, 1.9], target: [1.5, 0.6, 0], fov: 28 },
  ];
  const baskets: { x: number; who?: "shivaji" | "sambhaji" }[] = [{ x: -3.6 }, { x: -2.2 }, { x: -0.1, who: "shivaji" }, { x: 1.5, who: "sambhaji" }, { x: 3.1 }];
  const breath = (s: number) => Math.sin((f / 30) * 2 * Math.PI * 0.32 + s);
  return (
    <Stage3D cam={cam} camEase="smooth" background="#120c08" fog={{ color: "#140d08", near: 6, far: 22 }} exposure={1.1} grade={{ vignette: 0.7, grain: 0.07, tint: "rgba(255,140,60,0.10)" }}>
      <hemisphereLight args={["#3a4a70", "#30200f", 0.7]} />
      <pointLight position={[0, 2.4, 2.4]} color="#ffb070" intensity={10} distance={8} decay={1.5} />
      {/* storeroom: plaster walls, wooden beams, lamp niches */}
      <mesh position={[0, 2.2, -2.2]} material={plasterMat("#8a6a4a", [3, 1])} receiveShadow>
        <boxGeometry args={[14, 4.4, 0.3]} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={stoneMat("#5a4636", [6, 3])} receiveShadow>
        <planeGeometry args={[16, 10]} />
      </mesh>
      <mesh position={[0, 3.9, -0.5]} material={flatMat("#3a2616")} castShadow>
        <boxGeometry args={[14, 0.25, 0.3]} />
      </mesh>
      {[-2.9, 2.3].map((x, i) => (
        <group key={x} position={[x, 1.9, -1.95]}>
          <mesh material={flatMat("#2a1a10")}>
            <boxGeometry args={[0.6, 0.7, 0.2]} />
          </mesh>
          <group position={[0, -0.12, 0.12]}>
            <Flame frame={f} seed={70 + i} size={0.09} />
          </group>
          <pointLight position={[0, 0, 0.6]} color="#ff9a48" intensity={22} distance={10} decay={1.5} castShadow={i === 0} shadow-mapSize={[1024, 1024]} />
        </group>
      ))}
      {baskets.map((b, i) => (
        <group key={i} position={[b.x, 0, 0]} scale={1.32}>
          <Basket cutaway={!!b.who} fill={b.who ? "none" : "sweets"}>
            {b.who === "shivaji" && f >= 0 && (
              <Character3D costume="shivaji" pose={add(CROUCH, { y: 0.0, z: -0.02, breathe: breath(1), blink: Math.max(0, Math.sin(Math.max(0, f - crouchAt - 20) / 4)) * (f > crouchAt + 20 && f < crouchAt + 32 ? 1 : 0), headTurn: Math.sin(f / 45) * 8 })} scale={0.62} frame={f} seed={1} />
            )}
            {b.who === "sambhaji" && <Character3D costume="sambhaji" pose={add(CROUCH, { breathe: breath(2), headTurn: -6 + Math.sin(f / 30) * 6 })} scale={0.8} frame={f} seed={2} />}
          </Basket>
          {/* rope cradle up to a resting pole */}
          {[[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]].map(([x, z], k) => (
            <Rope key={k} a={[x, 0.78, z]} b={[0, 1.35, 0]} r={0.009} />
          ))}
        </group>
      ))}
      <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} material={flatMat("#6b4a2a")} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 9, 10]} />
      </mesh>
      {/* dust motes in the lamplight */}
      {Array.from({ length: 30 }, (_, i) => (
        <Glow key={i} position={[((i * 1.37) % 8) - 4, 0.6 + ((i * 0.73 + f * 0.004) % 2.4), ((i * 0.91) % 2) - 0.5]} size={0.03} color="#ffd8a0" opacity={0.6} />
      ))}
    </Stage3D>
  );
};

// ================================================================ s13d: porters lift the poles and walk past the guards into the dark
const ROPE = 0.34;
const BASKET_SCALE = 1.22;
const SHOULDER = 1.43;

export const GateNight3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue, shotId }) => {
  const liftAt = cue("lift", 30);
  const walkAt = cue("walk", 90);
  const darkAt = cue("dark", duration - 20);
  const path: P2[] = [[6, 3.2], [-2, 3.2], [-34, 3.0]];
  const pairs = [0, 1].map((k) => {
    const start = walkAt - 12 + k * 22;
    const back = k * 3.6; // second pair follows
    return { k, start, back };
  });
  // pair centre distance along the path (accelerate, cruise, never stop)
  const centre = (k: number, fr: number) => {
    const { start, back } = pairs[k];
    const w = walkPath(fr, path, { speed: 1.05, start, accel: 22, loop: false });
    return w.dist - back;
  };
  // pole height: squat (0.98) until lift, then rise with effort to the shoulder over 26 frames
  const poleY = (fr: number) => {
    const t = ease((fr - liftAt) / 26);
    return 0.98 + (SHOULDER - 0.98) * t;
  };
  const porter = (k: number, end: 1 | -1, fr: number) => {
    const d = Math.max(-1, centre(k, fr)) + end * 1.2;
    const pt = pathPoint(path, Math.max(0, d) + (d < 0 ? 0 : 0));
    const moving = Math.min(1, Math.max(0, (fr - pairs[k].start) / 22));
    const u = Math.max(0, d) / cycleLength(1.05) + (end === 1 ? 0.5 : 0);
    const lift = ease((fr - liftAt - k * 4) / 26);
    const base = mix(SQUAT_LIFT, add(STAND, CARRY_R), lift);
    const gait = walk(u, { speed: 1.05, carry: true });
    const p = mix(base, add(gait, CARRY_R, { spine: 6 }), moving);
    return { ...p, x: pt.x - (d < 0 ? d : 0), z: pt.z + (k === 1 ? -0.1 : 0), heading: pt.heading, breathe: Math.sin(fr / 9) * (0.5 + lift) };
  };
  const pivotAt = (k: number, fr: number): [number, number, number] => {
    const a = porter(k, 1, fr);
    const b = porter(k, -1, fr);
    const g = walk(Math.max(0, centre(k, fr)) / cycleLength(1.05), { speed: 1.05, carry: true });
    const bob = (g.drop ?? 0) * Math.min(1, Math.max(0, (fr - pairs[k].start) / 22));
    return [((a.x ?? 0) + (b.x ?? 0)) / 2, poleY(fr) - bob, ((a.z ?? 0) + (b.z ?? 0)) / 2];
  };
  const H = 0.78 * BASKET_SCALE;
  const Lc = ROPE + H / 2; // pivot → basket centre
  const basketHang = (k: number) => {
    const piv = pivotAt(k, f);
    const grounded = (fr: number) => pivotAt(k, fr)[1] - ROPE - H <= 0.005;
    const a = swing(f, { key: `${shotId}-${k}`, length: Lc, damping: 0.4, pivot: (fr) => pivotAt(k, fr), grounded });
    const c = bobPosition(piv, Lc, a);
    // resting on the ground while the rope is slack
    const centre: V3 = grounded(f) ? [piv[0], H / 2, piv[2]] : c;
    return { piv, a, centre };
  };
  const cam: CamKey[] = [
    { f: 0, pos: [8.5, 1.5, 9.5], target: [3.5, 1.2, 2.5], fov: 36 },
    { f: walkAt + 20, pos: [5.5, 1.6, 10.5], target: [0, 1.3, 2.8], fov: 34 },
    { f: duration, pos: [1.5, 2.0, 11.5], target: [-14, 1.0, 2.5], fov: 34 },
  ];
  const guardWave = ease((f - walkAt - 25) / 20) * (1 - ease((f - walkAt - 70) / 25));
  const darkness = ease((f - darkAt + 40) / 50);
  return (
    <Stage3D cam={cam} camEase="smooth" background="#070b14" fog={{ color: "#0c1424", near: 10, far: 48 - darkness * 22 }} exposure={1.65} grade={NIGHT_GRADE}>
      <SkyDome horizon="#16243e" zenith="#04060c" />
      <Stars frame={f} count={500} />
      <NightLight moonDir={[20, 35, -25]} intensity={0.5} />
      <Ground size={160} color="#3c2e20" />
      {/* the compound gate behind the porters, and the street walls */}
      <Gateway position={[6, 0, -1.5]} width={4.4} height={6.5} doorsOpen={0.9} color="#9a4a38" innerGlow="#3a2410" />
      <mesh position={[-14, 2, -1.2]} material={plasterMat("#8c7458", [10, 1])} castShadow receiveShadow>
        <boxGeometry args={[30, 4, 0.6]} />
      </mesh>
      {/* far side of the street: low houses fading into the dark */}
      {[-6, -13, -20, -27].map((x, i) => (
        <mesh key={x} position={[x, 1.8 + (i % 2) * 0.6, -4.2]} material={plasterMat("#7c6448", [2, 1])} castShadow receiveShadow>
          <boxGeometry args={[6.4, 3.6 + (i % 2) * 1.2, 4]} />
        </mesh>
      ))}
      {/* the two guards at the gate */}
      {[[1.2, 1.4, 160], [-1.4, 5.3, 20]].map(([x, z, h], i) => {
        const watch = (pivotAt(0, f)[0] - x) * -6;
        const base = sentryPose(f, 20 + i, x, z, h, 0.2);
        const pose = add(base, { headTurn: Math.max(-70, Math.min(70, watch)) * (f > walkAt ? 1 : 0.2) });
        return (
          <group key={i}>
            <Character3D costume={i ? "rajputguard" : "guard"} pose={i === 0 ? mix(pose, add(pose, WAVE_ON), guardWave) : pose} frame={f} seed={20 + i} right="torch" left="spear" />
            <pointLight position={[x, 2.2, z + 0.4]} color="#ff9a40" intensity={40} distance={14} decay={1.6} castShadow={i === 0} shadow-mapSize={[1024, 1024]} />
            <LightPool position={[x, 0.02, z]} radius={3} color="#ff8a3a" opacity={0.4} />
          </group>
        );
      })}
      {/* wall torches */}
      {[[3.4, 2.6, -0.9], [8.6, 2.6, -0.9]].map((p, i) => (
        <group key={i} position={p as V3}>
          <Flame frame={f} seed={60 + i} size={0.26} />
          <pointLight position={[0, 0.2, 0.8]} color="#ff9a48" intensity={30} distance={12} decay={1.6} />
        </group>
      ))}
      {/* porters, poles and the swinging baskets */}
      {[0, 1].map((k) => {
        const front = porter(k, 1, f);
        const rear = porter(k, -1, f);
        const h = basketHang(k);
        const yaw = Math.atan2((front.x ?? 0) - (rear.x ?? 0), (front.z ?? 0) - (rear.z ?? 0));
        return (
          <group key={k}>
            <Character3D costume="porter" pose={front} frame={f} seed={30 + k} />
            <Character3D costume="porter" pose={rear} frame={f} seed={32 + k} />
            <group position={h.piv} rotation={[0, yaw - Math.PI / 2, 0]}>
              <Pole length={3.1} />
            </group>
            {/* basket hangs from its centre of swing: up axis points back at the pivot */}
            <group position={h.centre} rotation={[-h.a.ax, 0, h.a.az]}>
              <group position={[0, -H / 2, 0]} scale={BASKET_SCALE}>
                <Basket lid={0} fill="sweets" />
              </group>
              {[[-0.3, -0.3], [0.3, 0.3], [0.3, -0.3], [-0.3, 0.3]].map(([dx, dz], r) => (
                <Rope key={r} a={[dx * BASKET_SCALE, H / 2 + 0.02, dz * BASKET_SCALE]} b={[0, H / 2 + Math.max(0.05, h.piv[1] - h.centre[1] - H / 2), 0]} r={0.01} />
              ))}
            </group>
          </group>
        );
      })}
    </Stage3D>
  );
};
