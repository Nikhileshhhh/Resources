import React from "react";
import { Stage3D, type CamKey } from "../engine/Stage3D";
import { SkyDome } from "../engine/env";
import { Character3D } from "../character/Character3D";
import { Elephant, Horse, RIDE, quadPath } from "../character/animals";
import { add, idle, walkPath, type P2 } from "../motion/motion";
import { HANDS_CLASPED, SPEAR_REST_L, STAND } from "../motion/poses";
import { Bastion, FortWall, Gateway, Ground, Haveli, OnionDome, flatMat, plasterMat, MARBLE } from "./architecture";
import { Flag, Tree } from "./kit2";
import type { Shot3DProps } from "./night";

/** Daylight: the procession into Agra Fort, the escort on the road north, the departure, the family on the road south. */

const DayLight: React.FC<{ dir?: [number, number, number]; warm?: number }> = ({ dir = [-40, 60, 50], warm = 0 }) => (
  <>
    <hemisphereLight args={[warm ? "#ffd2a0" : "#cfe0ff", "#7a5a3a", 0.95]} />
    <directionalLight position={dir} intensity={warm ? 2.4 : 3.2} color={warm ? "#ffb070" : "#fff0d8"} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-far={300} shadow-bias={-0.0005} />
  </>
);
const DAY_GRADE = { vignette: 0.45, grain: 0.05, tint: "rgba(255,200,140,0.08)", saturate: 1.08 };

/** A crowd of onlookers (lightweight figures) along a line. */
const Crowd: React.FC<{ frame: number; from: [number, number]; to: [number, number]; n: number; facing: number; seed?: number }> = ({ frame, from, to, n, facing, seed = 0 }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n;
      const x = from[0] + (to[0] - from[0]) * t + Math.sin(i * 7.1) * 0.3;
      const z = from[1] + (to[1] - from[1]) * t + Math.cos(i * 3.7) * 0.4;
      const costume = ["courtier", "porter", "official", "spy", "brahmin", "boy"][(i + seed) % 6];
      return <Character3D key={i} costume={costume} pose={add(idle(frame, seed + i, 0.8), { x, z, heading: facing + Math.sin(i) * 15 })} frame={frame} seed={seed + i} lod="lo" shadows={false} />;
    })}
  </>
);

// ================================================================ the procession into the fort (s06a)
export const FortDay3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const path: P2[] = [[0.6, 22], [0.6, 3]];
  const ram = walkPath(f, path, { speed: 1.1, start: 0 });
  const shiv = walkPath(f + 0, [[1.6, 24.5], [1.6, 5]], { speed: 1.1, start: 0, phase0: 0.3 });
  const sam = walkPath(f, [[2.4, 24.8], [2.4, 5.3]], { speed: 1.1, start: 0, phase0: 0.6 });
  const cam: CamKey[] = [
    { f: 0, pos: [5, 1.8, 32], target: [1.5, 1.6, 22], fov: 36 },
    { f: duration, pos: [7, 4.2, 33], target: [0.5, 5.5, 8], fov: 42 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#a8c4dc" fog={{ color: "#d8c8b0", near: 60, far: 320 }} exposure={1.0} grade={DAY_GRADE}>
      <SkyDome horizon="#e8dcc8" zenith="#6f9ac4" />
      <DayLight />
      <Ground size={300} color="#9a8060" />
      <FortWall from={[-70, 0]} to={[-6, 0]} height={14} />
      <FortWall from={[6, 0]} to={[70, 0]} height={14} />
      <Gateway position={[0, 0, 0.6]} width={9} height={17} doorsOpen={1} innerGlow="#3a2a1c" />
      {[-24, 24].map((x) => (
        <Bastion key={x} position={[x, 1.5]} radius={4} height={16} />
      ))}
      <group position={[16, 0, -30]}>
        <mesh position={[0, 9, 0]} material={plasterMat("#e6dccb", [6, 2])} castShadow>
          <boxGeometry args={[30, 18, 12]} />
        </mesh>
        {[-9, 0, 9].map((x, i) => (
          <OnionDome key={x} position={[x, 18, 0]} radius={i === 1 ? 4 : 3} material={flatMat(MARBLE, 0.45)} />
        ))}
      </group>
      {[-14, -9, 9, 14].map((x, i) => (
        <Flag key={x} frame={f} color={i % 2 ? "#3f6b4f" : "#c8442a"} position={[x, 14, 2]} pole={4} size={[2.6, 1.5]} seed={i} swallow={false} />
      ))}
      <Crowd frame={f} from={[-9, 22]} to={[-3, 6]} n={14} facing={90} seed={10} />
      <Crowd frame={f} from={[9, 22]} to={[5, 6]} n={14} facing={-90} seed={30} />
      {[-3, 4.4].map((x, i) => (
        <Character3D key={i} costume="guard" pose={add(idle(f, 70 + i, 0.6), SPEAR_REST_L, { x, z: 2.5, heading: 180 - i * 0 })} frame={f} seed={70 + i} left="spear" />
      ))}
      <Character3D costume="ramsingh" pose={ram.pose} frame={f} seed={3} />
      <Character3D costume="shivaji" pose={shiv.pose} frame={f} seed={1} />
      <Character3D costume="sambhaji" pose={sam.pose} frame={f} seed={2} />
    </Stage3D>
  );
};

/** Silver palanquin carried by four bearers along a path (shared pose, phase-offset gait). */
const Palanquin: React.FC<{ frame: number; path: P2[]; start: number; speed: number }> = ({ frame, path, start, speed }) => {
  const centre = walkPath(frame, path, { speed, start, loop: true });
  const h = ((centre.pose.heading ?? 0) * Math.PI) / 180;
  const bearers = [[-0.45, 1.1], [0.45, 1.1], [-0.45, -1.1], [0.45, -1.1]].map(([sx, sz], i) => ({
    x: (centre.pose.x ?? 0) + Math.cos(h) * sx + Math.sin(h) * sz,
    z: (centre.pose.z ?? 0) - Math.sin(h) * sx + Math.cos(h) * sz,
    i,
  }));
  return (
    <group>
      {bearers.map((b) => (
        <Character3D key={b.i} costume="porter" pose={{ ...centre.pose, x: b.x, z: b.z, shR: 150, elR: 120 }} frame={frame} seed={90 + b.i} lod="lo" />
      ))}
      <group position={[centre.pose.x ?? 0, 1.25, centre.pose.z ?? 0]} rotation={[0, h, 0]}>
        <mesh material={flatMat("#d8d8dc", 0.3, 0.8)} castShadow>
          <boxGeometry args={[0.8, 0.7, 1.5]} />
        </mesh>
        <mesh position={[0, 0.6, 0]} material={flatMat("#c8442a", 0.6)} castShadow>
          <cylinderGeometry args={[0.2, 0.75, 0.5, 4, 1, false, Math.PI / 4]} />
        </mesh>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={flatMat("#5a3a22")}>
            <cylinderGeometry args={[0.035, 0.035, 3.6, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ================================================================ processions on the road
export const Procession3D: React.FC<Shot3DProps> = ({ frame: f, duration, kind }) => {
  const k = String(kind);
  if (k === "departure") {
    // dusk: the escort rides out of the gate, right → left (southbound); Shivaji and Sambhaji watch from the roof
    const riders = [0, 1, 2, 3].map((i) => quadPath(f + i * 22, [[10, 6], [-30, 6]], 2.4, 2.4, 0));
    const cam: CamKey[] = [
      { f: 0, pos: [-4, 3.5, 22], target: [2, 3, 0], fov: 38 },
      { f: duration, pos: [-8, 4, 22], target: [-3, 3.2, 0], fov: 38 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#c0805a" fog={{ color: "#c89070", near: 40, far: 200 }} exposure={1.05} grade={{ vignette: 0.55, grain: 0.06, tint: "rgba(255,140,80,0.14)" }}>
        <SkyDome horizon="#f0a070" zenith="#4a4a78" glow={{ color: "#ffd0a0", dir: [-1, 0.1, -0.3], size: 1.3 }} />
        <DayLight dir={[-60, 18, -20]} warm={1} />
        <Ground size={300} color="#8a6a48" />
        <Haveli position={[4, 0, -4]} lit={0.3} />
        <Gateway position={[-4, 0, 1.5]} width={4} height={5.5} doorsOpen={1} color="#9a7a58" />
        {riders.map((r, i) => (
          <Horse key={i} state={r} frame={f} coat={["#5a3a22", "#2a2018", "#7a5a3a", "#3a2a1a"][i]} cloth="#c8442a">
            <Character3D costume="rider" pose={add(RIDE, { spine: 14 })} frame={f} seed={100 + i} />
          </Horse>
        ))}
        <Character3D costume="shivaji" pose={add(STAND, HANDS_CLASPED, idle(f, 1, 0.4), { x: 2.6, y: 7.4, z: 0.6, heading: -40, headTurn: -20, brow: 0.2 })} frame={f} seed={1} />
        <Character3D costume="sambhaji" pose={add(STAND, idle(f, 2, 0.5), { x: 3.4, y: 7.4, z: 0.7, heading: -50, headTurn: -15 })} frame={f} seed={2} />
      </Stage3D>
    );
  }
  if (k === "family") {
    // a Brahmin family walking south (right → left) with a bullock cart; Sambhaji in plain dhoti among them
    // all at the ox's pace and already in stride at frame 0; the camera travels with them past a calm checkpoint
    const V = 1.0;
    const walkers = [["brahmin", 8.6], ["sambhaji_brahmin", 9.9], ["scholar", 11.2]].map(([c, x0], i) => ({ c: String(c), w: walkPath(f, [[Number(x0) + 3, 3.1], [Number(x0) - 30, 3.1]], { speed: V, start: -90, phase0: i * 0.3 }) }));
    const ox = quadPath(f, [[7, 3.5], [-30, 3.5]], V, 2.0, -90);
    const gx = (fr: number) => 9.9 - V * (fr / 30);
    const cam: CamKey[] = [
      { f: 0, pos: [gx(0) - 1.5, 1.7, 12], target: [gx(0) - 2.5, 1.2, 2.5], fov: 36 },
      { f: duration, pos: [gx(duration) - 3.5, 1.7, 12], target: [gx(duration) - 4.5, 1.2, 2.5], fov: 36 },
    ];
    return (
      <Stage3D cam={cam} camEase="linear" background="#a8c4dc" fog={{ color: "#d8c8b0", near: 30, far: 200 }} exposure={1.0} grade={DAY_GRADE}>
        <SkyDome horizon="#e8dcc8" zenith="#6f9ac4" />
        <DayLight />
        <Ground size={300} color="#9a8060" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3.3]} material={flatMat("#b49a74", 1)} receiveShadow>
          <planeGeometry args={[120, 3.4]} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <Tree key={i} position={[-26 + i * 8, 0, -6 - (i % 2) * 5]} kind={i % 3 ? "broad" : "palm"} seed={i} frame={f} />
        ))}
        {/* calm checkpoint: a post and a seated guard */}
        <mesh position={[-2.2, 1.2, 0.9]} material={flatMat("#6a4a2a")} castShadow>
          <boxGeometry args={[0.2, 2.4, 0.2]} />
        </mesh>
        <Character3D costume="guard" pose={{ drop: 0.45, hipL: 88, hipR: 88, kneeL: 88, kneeR: 88, x: -2.9, z: 0.5, heading: 40, head: 6, blink: (f % 100) < 8 ? 1 : 0 }} frame={f} seed={77} left="spear" />
        {walkers.map((w, i) => (
          <Character3D key={i} costume={w.c} pose={w.w.pose} frame={f} seed={110 + i} right={i === 0 ? "staff" : "none"} />
        ))}
        <Horse state={ox} frame={f} coat="#d8d0c0" ox />
        {/* a two-wheeled cart behind the bullock: shafts to the yoke, wheels roll with the ground */}
        <group position={[ox.x + 2.9, 0, ox.z]}>
          <mesh position={[0, 0.95, 0]} material={flatMat("#6a4a2a", 0.85)} castShadow>
            <boxGeometry args={[1.8, 0.12, 1.3]} />
          </mesh>
          {[-0.62, 0.62].map((z) => (
            <mesh key={z} position={[0, 1.15, z]} material={flatMat("#5a3a22", 0.85)} castShadow>
              <boxGeometry args={[1.8, 0.35, 0.06]} />
            </mesh>
          ))}
          <mesh position={[0.1, 1.2, 0]} material={flatMat("#c8b088", 0.95)} castShadow>
            <boxGeometry args={[1.0, 0.3, 0.9]} />
          </mesh>
          {[-0.3, 0.3].map((z) => (
            <mesh key={z} position={[-1.6, 1.2, z]} rotation={[0, 0, -0.18]} material={flatMat("#5a3a22", 0.85)} castShadow>
              <boxGeometry args={[1.8, 0.06, 0.06]} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <group key={s} position={[0.1, 0.62, s * 0.78]} rotation={[0, 0, (ox.u * 2.0) / 0.62]}>
              <mesh material={flatMat("#4a3020", 0.8)} castShadow>
                <torusGeometry args={[0.6, 0.05, 6, 20]} />
              </mesh>
              {[0, 1, 2].map((k) => (
                <mesh key={k} rotation={[0, 0, (k * Math.PI) / 3]} material={flatMat("#4a3020", 0.8)}>
                  <boxGeometry args={[1.2, 0.04, 0.04]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      </Stage3D>
    );
  }
  // escort: side-on, left → right (northbound): elephant with the pennant, horsemen, palanquin, Shivaji riding, Sambhaji beside
  const V = 1.25;
  const pre = -60; // already in stride at frame 0
  const ele = quadPath(f, [[-9.5, 3.2], [60, 3.2]], V, 2.8, pre);
  const horses = [0, 1, 2].map((i) => quadPath(f, [[-15.5 - i * 4.2, 3.4], [60, 3.4]], V, 2.4, pre));
  const sx = (fr: number) => -15.5 + 2 + V * (fr / 30); // Shivaji's horse, approximately
  const cam: CamKey[] = [
    { f: 0, pos: [sx(0) - 4, 2.3, 20], target: [sx(0) - 4, 1.9, 3], fov: 36 },
    { f: duration, pos: [sx(duration) + 4, 2.3, 20], target: [sx(duration) + 4, 1.9, 3], fov: 36 },
  ];
  return (
    <Stage3D cam={cam} camEase="linear" background="#a8c4dc" fog={{ color: "#d8c8b0", near: 40, far: 220 }} exposure={1.0} grade={DAY_GRADE}>
      <SkyDome horizon="#e8dcc8" zenith="#6f9ac4" />
      <DayLight />
      <Ground size={300} color="#9a8060" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3.3]} material={flatMat("#b49a74", 1)} receiveShadow>
        <planeGeometry args={[140, 4]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <Tree key={i} position={[-44 + i * 8, 0, -8 - (i % 2) * 6]} kind={i % 3 ? "broad" : "palm"} seed={i} frame={f} />
      ))}
      <Elephant state={ele} frame={f} cloth="#c8442a" flag="#e8892b" />
      {horses.map((h, i) => (
        <Horse key={i} state={h} frame={f} coat={["#ece6da", "#5a3a22", "#2a2018"][i]} cloth={i === 0 ? "#e8892b" : "#c8442a"} trim="#e8e8f0">
          <Character3D costume={i === 0 ? "shivaji" : "rider"} pose={add(RIDE, idle(f, 120 + i, 0.3))} frame={f} seed={120 + i} />
        </Horse>
      ))}
      <Character3D costume="sambhaji" pose={walkPath(f, [[-17, 4.7], [60, 4.7]], { speed: V, start: pre }).pose} frame={f} seed={2} />
      <Palanquin frame={f} path={[[-31, 2.4], [60, 2.4]]} start={pre} speed={V} />
    </Stage3D>
  );
};
