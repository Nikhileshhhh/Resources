import React from "react";
import { Stage3D, Glow, LightPool, type CamKey, type V3 } from "../engine/Stage3D";
import { Flame } from "../engine/fx";
import { SkyDome } from "../engine/env";
import { Character3D, type Pose3 } from "../character/Character3D";
import { add, ease, idle, mix, pathPoint, walkPath, type P2 } from "../motion/motion";
import { SPEAR_REST_L, STAND, TORCH_HOLD_R, WAVE_ON } from "../motion/poses";
import { ArchedPanel, Ground, Haveli, flatMat, plasterMat, stoneMat } from "./architecture";
import { Cannon } from "./kit2";
import { BasketPair } from "./porters";
import { C, FONT_TITLE } from "../../theme";
import type { Shot3DProps } from "./night";

/** Shivaji's quarters at dusk: Fulad Khan's cordon, the basket parade, the monsoon evening; and the gate check over six days. */

/** A street gate in a compound wall: an arched opening with its two leaves swung open. */
const CompoundGate: React.FC<{ position: V3 }> = ({ position }) => (
  <group position={position}>
    <ArchedPanel width={5.4} height={4.6} depth={0.9} arches={1} archW={2.6} archSpring={2.3} archH={3.5} material={stoneMat("#9a4a38", [2, 2])} />
    <mesh position={[0, 4.75, 0]} material={stoneMat("#8a3e2e", [2, 1])} castShadow>
      <boxGeometry args={[5.8, 0.3, 1.1]} />
    </mesh>
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 1.3, 0, 0.45]} rotation={[0, s * 1.9, 0]}>
        <mesh position={[-s * 0.62, 1.55, 0]} material={flatMat("#4a2e1a", 0.8)} castShadow>
          <boxGeometry args={[1.24, 3.1, 0.08]} />
        </mesh>
      </group>
    ))}
  </group>
);

const DuskLight: React.FC<{ k?: number }> = ({ k = 1 }) => (
  <>
    <hemisphereLight args={["#ffc9a0", "#3a2a2a", 0.85 * k]} />
    <directionalLight position={[-45, 16, 45]} intensity={2.2 * k} color="#ff9a5a" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-camera-far={200} shadow-bias={-0.0005} />
    <directionalLight position={[30, 20, 40]} intensity={0.6 * k} color="#8a9ad8" />
  </>
);
const DUSK_GRADE = { vignette: 0.55, grain: 0.06, tint: "rgba(255,130,80,0.12)", contrast: 1.05 };

/** The compound: haveli, walls and the street gate (front wall at z = 14, gate at x = 0). */
const CompoundSet: React.FC<{ frame: number }> = () => (
  <>
    <Ground size={220} color="#7a6040" />
    <Haveli position={[0, 0, -1]} lit={0.6} />
    {[[0, -16, 34, 0], [-17, -1, 30, Math.PI / 2], [17, -1, 30, Math.PI / 2], [-9.85, 14, 14.3, 0], [9.85, 14, 14.3, 0]].map(([x, z, len, ry], i) => (
      <mesh key={i} position={[x, 1.6, z]} rotation={[0, ry, 0]} material={plasterMat("#a88a66", [len / 4, 1])} castShadow receiveShadow>
        <boxGeometry args={[len, 3.2, 0.6]} />
      </mesh>
    ))}
    <CompoundGate position={[0, 0, 14]} />
    {/* the street opposite: house fronts */}
    {[-22, -14, -6, 2, 10, 18, 26].map((x, i) => (
      <mesh key={x} position={[x, 2 + (i % 3) * 0.5, 30]} material={plasterMat(["#b89a72", "#a88a66", "#c4a882"][i % 3], [2, 1])} castShadow receiveShadow>
        <boxGeometry args={[7.4, 4 + (i % 3), 5]} />
      </mesh>
    ))}
  </>
);

const guardPose = (f: number, seed: number, x: number, z: number, heading: number, alert = 0): Pose3 =>
  add(idle(f, seed, 0.8 - alert * 0.5), SPEAR_REST_L, { x, z, heading, spine: -2 * alert, head: -3 * alert, headTurn: Math.sin(f / 40 + seed) * 12 * (1 - alert) });

/** Monsoon cloud bank: clusters of flattened spheres drifting slowly. */
const Clouds: React.FC<{ frame: number; color: string; y: number; n?: number }> = ({ frame, color, y, n = 26 }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const x = -120 + ((i * 47) % 240) + frame * 0.04 * (1 + (i % 3) * 0.3);
      const z = -40 - ((i * 29) % 90);
      const s = 9 + ((i * 13) % 9);
      return (
        <mesh key={i} position={[x, y + ((i * 7) % 12), z]} scale={[s * 1.8, s * 0.55, s]} material={flatMat(i % 2 ? color : "#4a4258", 1)}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
      );
    })}
  </>
);

export const CompoundDusk3D: React.FC<Shot3DProps> = ({ frame: f, duration, guardRing = 16, fuladKhan, baskets, clouds }) => {
  const n = Number(guardRing);

  // ------------------------------------------------ s09b: Fulad Khan inspects his cordon; a cannon is rolled up
  if (fuladKhan) {
    const line = Array.from({ length: 9 }, (_, i) => -11 + i * 2.75).filter((x) => Math.abs(x) > 3);
    const fk = walkPath(f, [[-9, 17.6], [10, 17.6]], { speed: 1.1, start: -60 });
    const fkx = (fr: number) => pathPoint([[-9, 17.6], [10, 17.6]], walkPath(fr, [[-9, 17.6], [10, 17.6]], { speed: 1.1, start: -60 }).dist).x;
    const fx = fk.pose.x ?? 0;
    const pushers = [19.6, 20.6].map((z) => walkPath(f, [[8.4, z], [4.9, z]], { speed: 0.55, start: -10 }));
    const cx = (pushers[0].pose.x ?? 0) - 1.45;
    const cam: CamKey[] = [
      { f: 0, pos: [fkx(0) - 2.5, 1.8, 27], target: [fkx(0) - 1.8, 1.5, 17], fov: 36 },
      { f: duration, pos: [fkx(duration) - 0.5, 2.1, 27.5], target: [fkx(duration) - 0.8, 1.5, 17], fov: 38 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#c0805a" fog={{ color: "#b07a62", near: 25, far: 150 }} exposure={1.05} grade={DUSK_GRADE}>
        <SkyDome horizon="#f0a070" zenith="#3a3a68" glow={{ color: "#ffd0a0", dir: [-1, 0.12, -0.6], size: 1.2 }} />
        <DuskLight />
        <CompoundSet frame={f} />
        {/* the cordon along the front wall: guards straighten as their commander passes */}
        {line.map((x, i) => {
          const alert = ease(1 - Math.abs(fx - x) / 3);
          return <Character3D key={i} costume="guard" pose={guardPose(f, 200 + i, x, 15.4, 0, alert)} frame={f} seed={200 + i} left="spear" />;
        })}
        <Character3D costume="fuladkhan" pose={add(fk.pose, { shL: 8, elL: 30, headTurn: -35, brow: -0.4 })} frame={f} seed={9} />
        {/* two soldiers push a field gun into place by the gate */}
        <Cannon position={[cx, 0, 20.1]} rotationY={-Math.PI / 2} />
        {pushers.map((w, i) => (
          <Character3D key={i} costume="guard" pose={add(w.pose, { spine: 22, shL: 70, shR: 70, elL: 30, elR: 30 })} frame={f} seed={220 + i} />
        ))}
      </Stage3D>
    );
  }

  // ------------------------------------------------ s12b: the basket parade leaves the gate, left to right
  if (baskets === "parade") {
    const path: P2[] = [[0, 10], [0, 17.5], [40, 18]];
    const lead = (fr: number) => pathPoint(path, walkPath(fr, path, { speed: 1.3, start: -150, accel: 22 }).dist).x;
    const cam: CamKey[] = [
      { f: 0, pos: [1, 1.8, 28], target: [2.5, 1.3, 16], fov: 38 },
      { f: duration, pos: [lead(duration) - 3, 1.8, 28], target: [lead(duration) - 1, 1.3, 16], fov: 38 },
    ];
    return (
      <Stage3D cam={cam} camEase="linear" background="#c0805a" fog={{ color: "#b07a62", near: 25, far: 150 }} exposure={1.05} grade={DUSK_GRADE}>
        <SkyDome horizon="#f0a070" zenith="#3a3a68" glow={{ color: "#ffd0a0", dir: [-1, 0.12, -0.6], size: 1.2 }} />
        <DuskLight />
        <CompoundSet frame={f} />
        {[-2.6, 2.6].map((x, i) => (
          <Character3D key={i} costume={i ? "rajputguard" : "guard"} pose={guardPose(f, 240 + i, x, 15.2, i ? -25 : 25)} frame={f} seed={240 + i} left="spear" />
        ))}
        {[0, 1, 2].map((k) => (
          <BasketPair key={k} frame={f} path={path} start={-150 + k * 70} seed={k * 3} />
        ))}
      </Stage3D>
    );
  }

  // ------------------------------------------------ s13a: monsoon evening, the cressets are lit one by one
  const posts = Array.from({ length: 8 }, (_, i) => -14 + i * 4);
  const lighter = walkPath(f, [[-16, 15.6], [16, 15.6]], { speed: 1.4, start: 0 });
  const lx = lighter.pose.x ?? 0;
  const flash = f > duration * 0.62 && f < duration * 0.62 + 5 ? 1 : 0;
  const cam: CamKey[] = [
    { f: 0, pos: [-6, 1.4, 25], target: [-4, 2.4, 15], fov: 40 },
    { f: duration, pos: [2, 9, 36], target: [0, 6, 0], fov: 44 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#3a3448" fog={{ color: "#4a4258", near: 30, far: 160 }} exposure={1.2 + flash * 0.8} grade={{ vignette: 0.6, grain: 0.07, tint: "rgba(90,90,150,0.14)", contrast: 1.08 }}>
      <SkyDome horizon="#a0705a" zenith="#2a2a3c" />
      <Clouds frame={f} color="#5a5068" y={34} />
      <DuskLight k={0.5} />
      <CompoundSet frame={f} />
      {Array.from({ length: n }, (_, i) => {
        const x = -14 + (i / Math.max(1, n - 1)) * 28;
        return Math.abs(x) < 4.5 ? null : <Character3D key={i} costume="guard" pose={guardPose(f, 260 + i, x, 16.4, 0)} frame={f} seed={260 + i} left="spear" lod="lo" />;
      })}
      {/* the lamplighter walks the wall with a lit torch */}
      <Character3D costume="porter" pose={add(lighter.pose, TORCH_HOLD_R)} frame={f} seed={280} right="torch" />
      {posts.map((x, i) => {
        const lit = ease((lx - x + 0.6) / 0.8);
        return (
          <group key={i} position={[x, 0, 14.75]}>
            <mesh position={[0, 1.3, 0]} material={flatMat("#3a2a1a", 0.8)} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 2.6, 6]} />
            </mesh>
            <mesh position={[0, 2.65, 0]} material={flatMat("#2a2018", 0.6, 0.6)}>
              <cylinderGeometry args={[0.16, 0.08, 0.16, 8]} />
            </mesh>
            {lit > 0.01 && (
              <group position={[0, 2.75, 0]} scale={lit}>
                <Flame frame={f} seed={300 + i} size={0.3} />
                <pointLight color="#ff9a48" intensity={22 * lit} distance={10} decay={1.6} />
              </group>
            )}
            {lit > 0.01 && <LightPool position={[0, 0.02, 0.5]} radius={2.6} color="#ff8a3a" opacity={0.3 * lit} />}
          </group>
        );
      })}
    </Stage3D>
  );
};

// ================================================================ s12c: the gate check, day after day
export const GateCheck3D: React.FC<Shot3DProps> = ({ frame: f, duration, days = 6 }) => {
  const N = Number(days);
  const per = duration / N;
  const day = Math.min(N, Math.floor(f / per) + 1);
  const t = (f - (day - 1) * per) / per; // 0..1 within the day
  const checking = day <= 3;
  // inspection days: the guard leans in and lifts the lid; later days he barely looks and waves them on
  const lid = checking ? ease((t - 0.22) / 0.15) * (1 - ease((t - 0.7) / 0.15)) : 0;
  const lean = checking ? ease((t - 0.15) / 0.15) * (1 - ease((t - 0.75) / 0.15)) : 0;
  const wave = !checking ? ease((t - 0.1) / 0.15) * (1 - ease((t - 0.75) / 0.15)) : checking ? ease((t - 0.82) / 0.1) : 0;
  const yawn = !checking && day === N ? Math.sin(Math.min(1, t / 0.4) * Math.PI) : 0;
  const guard = add(STAND, idle(f, 400, 0.6), { x: -0.1, z: -0.5, heading: 0 }, mix({}, { spine: 26, head: 16, shR: 70, elR: 40, shRAbd: -10, wristR: -30 }, lean), mix({}, WAVE_ON, wave * (checking ? 0.6 : 1)), { jaw: yawn * 0.6, blink: yawn > 0.6 ? 1 : 0, lookY: -0.5 * lean });
  // later days the porters do not stop: they walk straight through while being waved on
  const pathX: P2[] = [[-3.5, 0.45], [7, 0.45]];
  const light = day % 2 ? 1 : 0.8;
  const dip = Math.max(0, 1 - Math.min(f % per, per - (f % per)) / 5) * (f > 3 && f < duration - 3 ? 1 : 0);
  const cam: CamKey[] = [
    { f: 0, pos: [0.3, 2.05, 6.4], target: [0.3, 1.15, 0], fov: 34 },
    { f: duration, pos: [0.5, 1.95, 5.7], target: [0.5, 1.15, 0], fov: 34 },
  ];
  const counter = (
    <>
      <div style={{ position: "absolute", left: 90, top: 80, fontFamily: FONT_TITLE, fontSize: 64, color: C.parchment, letterSpacing: 6, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>DAY {day}</div>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: dip * 0.85 }} />
    </>
  );
  return (
    <Stage3D cam={cam} camEase="smooth" background="#c0805a" fog={{ color: "#b07a62", near: 14, far: 80 }} exposure={0.95 + 0.1 * light} grade={DUSK_GRADE} dom={counter}>
      <SkyDome horizon={day % 2 ? "#f0a070" : "#f4c8a0"} zenith={day % 2 ? "#3a3a68" : "#6a8ab0"} glow={{ color: "#ffd0a0", dir: day % 2 ? [-1, 0.12, -0.6] : [1, 0.15, -0.6], size: 1.2 }} />
      <DuskLight k={light} />
      <Ground size={160} color="#7a6040" />
      {[[-6.65, 18.1], [14.65, 14.7]].map(([x, len]) => (
        <mesh key={x} position={[x, 1.6, -1.6]} material={plasterMat("#a88a66", [len / 4, 1])} castShadow receiveShadow>
          <boxGeometry args={[len, 3.2, 0.6]} />
        </mesh>
      ))}
      <CompoundGate position={[4.6, 0, -1.6]} />
      <group position={[1.2, 2.4, -1.25]}>
        <Flame frame={f} seed={410} size={0.24} />
        <pointLight position={[0, 0.2, 0.6]} color="#ff9a48" intensity={14} distance={8} decay={1.6} />
      </group>
      <Character3D costume="guard" pose={guard} frame={f} seed={400} left={lean > 0.1 ? "none" : "spear"} />
      {checking ? <BasketPair frame={f} path={pathX} standing setDown lead={3.3} seed={day} lid={lid} /> : <BasketPair frame={f - (day - 1) * per} path={pathX} start={-per} speed={1.6} seed={day} />}
      {/* the day's light: a warm lamp glow at the gate */}
      <Glow position={[4.6, 2.2, -0.9] as V3} size={3} color="#ffb060" opacity={0.25} />
    </Stage3D>
  );
};
