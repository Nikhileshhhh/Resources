import React from "react";
import { AbsoluteFill } from "remotion";
import { Stage3D, Glow, type CamKey, type V3 } from "../engine/Stage3D";
import { Flame, Smoke, Stars } from "../engine/fx";
import { SkyDome, Moon } from "../engine/env";
import { Character3D } from "../character/Character3D";
import { Horse, RIDE, quadPath } from "../character/animals";
import { add, ease, idle, keyed, mix, walkPath, type P2 } from "../motion/motion";
import { STAND } from "../motion/poses";
import { Basket, Gateway, Ground, Pole, Rope, flatMat, plasterMat } from "./architecture";
import { Cannon, Flag, HillFort, Terrain, TentExterior, Tree, terrainHeight, type Flat } from "./kit2";
import { swing, bobPosition } from "../physics/pendulum";
import { C, FONT_BODY, FONT_TITLE } from "../../theme";
import type { Shot3DProps } from "./night";

/** The Deccan: hill forts at sunrise, the siege of Purandar, the ascetic's night road, the return to Rajgad. */

// summit heights are fixed so forts sit on levelled ground: [x, z, height, radius]
const FORT_FLATS: Flat[] = [
  [0, 0, 26, 16],
  [-150, -230, 30, 14],
  [170, -300, 33, 14],
  [-40, -420, 28, 14],
];

const SUNRISE = { horizon: "#f3a56a", zenith: "#3b5c8c" };

const SunLight: React.FC<{ dir: V3; color?: string; intensity?: number; sky?: string; ground?: string; hemi?: number; extent?: number }> = ({ dir, color = "#ffc890", intensity = 3, sky = "#bcd2ff", ground = "#5a4030", hemi = 0.8, extent = 60 }) => (
  <>
    <hemisphereLight args={[sky, ground, hemi]} />
    <directionalLight position={dir} intensity={intensity} color={color} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-extent} shadow-camera-right={extent} shadow-camera-top={extent} shadow-camera-bottom={-extent} shadow-camera-far={600} shadow-bias={-0.0005} />
  </>
);

// ================================================================ DeccanForts
export const DeccanForts3D: React.FC<Shot3DProps> = ({ frame: f, duration, hero }) => {
  if (hero === "arrival") {
    // Rajgad at dawn: a weary rider reaches the gate; men run to help him down
    const st = quadPath(f, [[-12, 6], [-3.5, 3.5]], 2.6, 2.4, 0, 16);
    const arrived = ease((f - 95) / 15);
    const slump = ease((f - 100) / 30);
    const helpers = [0, 1].map((k) => walkPath(f, [[2.5 + k * 1.2, -1], [-2.4 + k * 0.6, 2.6 - k * 0.2]], { speed: 1.8, start: 60 + k * 6, accel: 10 }));
    const cam: CamKey[] = [
      { f: 0, pos: [-8, 2.0, 14], target: [-10, 1.6, 4], fov: 36 },
      { f: duration, pos: [-1, 2.0, 11], target: [-3.5, 1.6, 2.5], fov: 32 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#d8a070" fog={{ color: "#e6b88a", near: 30, far: 220 }} exposure={1.35} grade={{ vignette: 0.5, grain: 0.06, tint: "rgba(255,170,90,0.12)" }}>
        <SkyDome horizon="#f2b27a" zenith="#5a6e98" glow={{ color: "#ffe0b0", dir: [1, 0.15, -0.6], size: 1.4 }} />
        <SunLight dir={[40, 30, 60]} intensity={3.2} hemi={1.1} />
        <Ground size={400} color="#7a6448" />
        <Gateway position={[0, 0, -3]} width={5} height={8} doorsOpen={1} color="#7a6650" />
        <mesh position={[14, 4, -3.2]} material={plasterMat("#7a6650", [6, 2])} castShadow receiveShadow>
          <boxGeometry args={[20, 8, 3]} />
        </mesh>
        <mesh position={[-14, 4, -3.2]} material={plasterMat("#7a6650", [6, 2])} castShadow receiveShadow>
          <boxGeometry args={[20, 8, 3]} />
        </mesh>
        <Flag frame={f} color="#e8892b" position={[3.5, 8, -2]} pole={4} size={[2.2, 1.3]} />
        <Horse state={{ ...st, u: st.u * (1 - arrived * 0.95) }} frame={f} coat="#5a4a3a" cloth="#7a6a4a">
          <Character3D costume="shivaji_ascetic" pose={add(RIDE, { spine: 10 + 30 * slump, head: 10 + 25 * slump, blink: slump > 0.5 ? 0.7 : 0 })} frame={f} seed={1} />
        </Horse>
        {helpers.map((h, k) => (
          <Character3D key={k} costume={k ? "rajputguard" : "official"} pose={add(h.pose, idle(f, 60 + k, 0.4), { shR: 70 * ease((f - 95) / 15), shL: 50 * ease((f - 95) / 15), elR: 20 })} frame={f} seed={60 + k} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <Tree key={i} position={[-30 + i * 9, 0, 14 + (i % 2) * 6]} scale={1.1} seed={i} frame={f} />
        ))}
      </Stage3D>
    );
  }
  // sunrise: Shivaji on the rampart, hand on his sword hilt, turns toward us; forts crown the ridges beyond
  const turn = ease((f - duration * 0.45) / (duration * 0.35));
  const cam: CamKey[] = [
    { f: 0, pos: [-5, 31.4, 5], target: [2, 30.6, 16], fov: 40 },
    { f: duration * 0.5, pos: [-2.4, 30.6, 15.5], target: [0, 30.9, 10], fov: 34 },
    { f: duration, pos: [0.4, 30.4, 13.4], target: [0, 30.8, 10.1], fov: 30 },
  ];
  const shiv = add(STAND, idle(f, 1, 0.5), { x: 0, z: 10, y: 29.2, heading: -55 * (1 - turn), headTurn: -25 * (1 - turn), shL: 25, shLAbd: 12, elL: 70, wristL: 10, lookX: 0.2 * turn });
  return (
    <Stage3D cam={cam} camEase="smooth" background="#e9b07a" fog={{ color: "#f0c49a", near: 80, far: 650 }} exposure={1.05} grade={{ vignette: 0.48, grain: 0.05, tint: "rgba(255,170,90,0.12)" }}>
      <SkyDome horizon={SUNRISE.horizon} zenith={SUNRISE.zenith} glow={{ color: "#fff1c8", dir: [0.25, 0.12, 1], size: 1.2 }} />
      <Glow position={[120, 70, 600]} size={160} color="#ffd890" opacity={0.6} />
      <SunLight dir={[60, 50, 160]} intensity={3.2} extent={40} />
      <Terrain size={1100} seg={180} height={46} flats={FORT_FLATS} />
      <group position={[0, 26, 0]}>
        <HillFort frame={f} position={[0, 0, 0]} />
      </group>
      {/* rampart walkway under Shivaji */}
      <mesh position={[0, 28.7, 10]} material={flatMat("#6e5a48", 0.95)} receiveShadow castShadow>
        <boxGeometry args={[7, 1.0, 2.4]} />
      </mesh>
      {FORT_FLATS.slice(1).map(([x, z, h], i) => (
        <group key={i} position={[x, h, z]} scale={1.6}>
          <HillFort frame={f + i * 13} position={[0, 0, 0]} />
        </group>
      ))}
      <Flag frame={f} color="#e8892b" position={[2.4, 29.2, 10.6]} pole={4.2} size={[2.0, 1.2]} seed={3} />
      <Character3D costume="shivaji" pose={shiv} frame={f} seed={1} />
    </Stage3D>
  );
};

// ================================================================ Siege of Purandar
// the fort on its summit, and a broad levelled plain below it for the Mughal camp
const SIEGE_FLATS: Flat[] = [
  [0, 95, 3, 55], // plain for the camp
  [0, 0, 22, 34], // the mountain's shoulders
  [0, 0, 32, 13], // the summit
];
const hSiege = (x: number, z: number) => terrainHeight(x, z, 46, "purandar", SIEGE_FLATS);
export const Siege3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const shots = [40, 130, 210, 290];
  const recoil = (i: number, at: number) => {
    const d = f - at - i * 9;
    return d >= 0 && d < 20 ? Math.exp(-d / 5) : 0;
  };
  const cam: CamKey[] = [
    { f: 0, pos: [-8, 16, 150], target: [0, 14, 30], fov: 38 },
    { f: duration, pos: [6, 22, 112], target: [0, 24, 0], fov: 34 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#d8b088" fog={{ color: "#d9b894", near: 60, far: 600 }} exposure={1.0} grade={{ vignette: 0.5, grain: 0.06, tint: "rgba(255,170,90,0.1)" }}>
      <SkyDome horizon="#efc79a" zenith="#6a86ac" />
      <SunLight dir={[-80, 70, 90]} intensity={3} extent={90} />
      <Terrain size={1100} seg={200} height={46} flats={SIEGE_FLATS} seed="purandar" />
      <group position={[0, 32, 0]}>
        <HillFort frame={f} position={[0, 0, 0]} />
      </group>
      {/* Mughal camp spread across the plain below */}
      {Array.from({ length: 34 }, (_, i) => {
        const x = -70 + (i % 9) * 17 + ((i * 7) % 5);
        const z = 55 + Math.floor(i / 9) * 12;
        return <TentExterior key={i} position={[x, hSiege(x, z), z]} scale={1.4} color={i % 5 ? "#e0d2b0" : "#3f6b4f"} rotationY={i} />;
      })}
      {[-30, -10, 10, 30].map((x, i) => (
        <group key={i}>
          <Cannon position={[x, hSiege(x, 50), 50]} rotationY={Math.PI} recoil={shots.reduce((a, s) => Math.max(a, recoil(i, s)), 0)} />
          {shots.map((s, k) => (
            <Smoke key={k} frame={Math.max(0, f - s - i * 9)} seed={i * 7 + k} position={[x, hSiege(x, 50) + 0.8, 48]} scale={f >= s + i * 9 ? 2 : 0.0001} color="#c9c0b4" count={6} rise={0.3} />
          ))}
          {shots.map((s, k) => (f - s - i * 9 >= 0 && f - s - i * 9 < 4 ? <Glow key={"m" + k} position={[x, hSiege(x, 50) + 0.6, 48.5]} size={5} color="#ffd080" /> : null))}
        </group>
      ))}
      <Flag frame={f} color="#3f6b4f" position={[-50, hSiege(-50, 60), 60]} pole={6} size={[3, 1.8]} seed={8} swallow={false} />
      <Flag frame={f} color="#3f6b4f" position={[45, hSiege(45, 62), 62]} pole={6} size={[3, 1.8]} seed={9} swallow={false} />
      <Smoke frame={f} seed={30} position={[0, 22, 26]} scale={8} color="#bdb3a6" count={8} rise={0.25} />
      {/* soldiers on the move (distant, small) */}
      {Array.from({ length: 10 }, (_, i) => {
        const w = walkPath(f + i * 23, [[-60 + i * 12, 70], [-40 + i * 10, 46]], { speed: 1.3, loop: true, phase0: i * 0.2 });
        return <Character3D key={i} costume="guard" pose={{ ...w.pose, y: hSiege(w.pose.x ?? 0, w.pose.z ?? 0) }} frame={f} seed={70 + i} lod="lo" shadows={false} right="spear" />;
      })}
    </Stage3D>
  );
};

// ================================================================ the ascetic's night road
export const AsceticWalk3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const path: P2[] = [[10, 0], [-14, 0.4]]; // homebound: right → left
  const walkers = [0, 1, 2].map((k) => walkPath(f + 40 + k * 26, path, { speed: 1.15, loop: true, phase0: k * 0.33 }));
  const cam: CamKey[] = [
    { f: 0, pos: [6, 1.6, 9], target: [2, 1.2, 0], fov: 34 },
    { f: duration, pos: [-2, 1.6, 9], target: [-4, 1.2, 0], fov: 34 },
  ];
  return (
    <Stage3D cam={cam} camEase="linear" background="#060a14" fog={{ color: "#0a1222", near: 12, far: 70 }} exposure={1.5} grade={{ vignette: 0.66, grain: 0.07, tint: "rgba(40,70,140,0.16)" }}>
      <SkyDome horizon="#16243e" zenith="#04060c" />
      <Stars frame={f} />
      <Moon position={[-120, 90, -260]} size={22} />
      <hemisphereLight args={["#5a78b8", "#2a1e14", 0.9]} />
      <directionalLight position={[-30, 40, -20]} intensity={1.8} color="#a9bdff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
      <Ground size={200} color="#4a3a28" />
      {/* sleeping village: mud huts with thatched roofs, one ember in a doorway */}
      {[-16, -9, -2, 5, 12].map((x, i) => (
        <group key={i} position={[x, 0, -6 - (i % 2) * 2]}>
          <mesh position={[0, 1.1, 0]} material={plasterMat("#8a6a48", [1, 1])} castShadow receiveShadow>
            <cylinderGeometry args={[2, 2.1, 2.2, 12]} />
          </mesh>
          <mesh position={[0, 2.9, 0]} material={flatMat("#8a7448", 1)} castShadow>
            <coneGeometry args={[2.6, 1.8, 12]} />
          </mesh>
          {i === 2 && <Glow position={[0, 0.6, 2.05]} size={0.9} color="#ff8a40" opacity={0.7} />}
        </group>
      ))}
      {[-20, -5, 8, 18].map((x, i) => (
        <Tree key={i} position={[x, 0, -12]} kind={i % 2 ? "palm" : "broad"} scale={1.2} seed={i} frame={f} />
      ))}
      {/* fireflies */}
      {Array.from({ length: 40 }, (_, i) => {
        const on = Math.max(0, Math.sin(f * 0.15 + i * 2.1));
        return <Glow key={i} position={[-18 + ((i * 3.7) % 36), 0.4 + ((i * 0.53) % 2), -3 + ((i * 1.9) % 6) + Math.sin(f / 30 + i) * 0.3]} size={0.18} color="#d8ff70" opacity={on} />;
      })}
      {walkers.map((w, k) => (
        <Character3D key={k} costume={k === 0 ? "shivaji_ascetic" : "ascetic"} pose={add(w.pose, { spine: 8, head: 4 })} frame={f} seed={90 + k} right="staff" />
      ))}
    </Stage3D>
  );
};

// ================================================================ title card
export const TitleCard3D: React.FC<Shot3DProps> = ({ frame: f, duration, title, subtitle, shotId }) => {
  // a sweet basket hanging from a carrying pole swings into frame and settles (real pendulum), then the title rises
  const L = 0.9;
  const pivot = (fr: number): [number, number, number] => {
    const t = ease(fr / 28);
    return [-3.5 * (1 - t), 2.4 + 2.5 * (1 - t), 0];
  };
  const a = swing(f, { key: `${shotId}-title`, length: L, damping: 0.55, pivot });
  const bob = bobPosition(pivot(f), L, a);
  const lid = ease((f - 34) / 20);
  const op = (a0: number, b0: number) => Math.min(1, Math.max(0, (f - a0) / (b0 - a0)));
  const cam: CamKey[] = [
    { f: 0, pos: [0, 2.1, 6.2], target: [0, 1.8, 0], fov: 32 },
    { f: duration, pos: [0, 2.0, 5.3], target: [0, 1.75, 0], fov: 30 },
  ];
  const text = (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center" }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 124, letterSpacing: 10, color: "#f3e3c0", opacity: op(20, 45), transform: `translateY(${(1 - ease(op(20, 45))) * 40}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.75)" }}>{String(title).toUpperCase()}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 44, letterSpacing: 6, color: C.saffron, marginTop: 10, opacity: op(40, 60) }}>{String(subtitle)}</div>
      </div>
    </AbsoluteFill>
  );
  return (
    <Stage3D cam={cam} camEase="smooth" background="#120c10" fog={{ color: "#140d12", near: 6, far: 20 }} exposure={1.2} grade={{ vignette: 0.7, grain: 0.07, tint: "rgba(255,140,60,0.1)" }} dom={text}>
      <hemisphereLight args={["#3a3050", "#20140a", 0.5]} />
      <pointLight position={[-2.5, 3.5, 2.5]} intensity={22} color="#ffb070" distance={14} decay={1.4} castShadow />
      <pointLight position={[3, 2, -1]} intensity={8} color="#8aa0ff" distance={10} decay={1.4} />
      <group position={pivot(f)}>
        <Pole length={3.2} />
      </group>
      <group position={bob} rotation={[-a.ax, 0, a.az]}>
        <group position={[0, -0.5, 0]} scale={1.3}>
          <Basket lid={lid * 0.35} />
        </group>
        {[[-0.3, 0], [0.3, 0]].map(([x], i) => (
          <Rope key={i} a={[x * 1.2, 0.52, 0]} b={[0, L, 0]} />
        ))}
      </group>
      {Array.from({ length: 30 }, (_, i) => {
        const life = 90;
        const age = (f + i * 13) % life;
        return <Glow key={i} position={[-3 + ((i * 1.3) % 6), -0.5 + (age / life) * 4, -1 + ((i * 0.7) % 2)]} size={0.06} color="#ffcf8a" opacity={(1 - age / life) * 0.8} />;
      })}
      <Flame frame={f} seed={1} size={0.0001} embers={false} />
    </Stage3D>
  );
};
