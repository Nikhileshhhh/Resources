import React from "react";
import { Stage3D, Glow, type CamKey, type V3 } from "../engine/Stage3D";
import { Character3D, type Pose3 } from "../character/Character3D";
import { add, ease, idle, keyed, mix, walkPath, type P2 } from "../motion/motion";
import { BOW, HANDS_CLASPED, SIT_CROSS, STAND } from "../motion/poses";
import { ArchedPanel, flatMat, stoneMat, SANDSTONE } from "./architecture";
import { Cushion, Jali, OilLamp, Room } from "./kit2";
import { COURT_GRADE, Hall, NOBLES, emperorPose } from "./court";
import type { Shot3DProps } from "./night";

/** The rest of the court: ranks, robes, the walkout, the "mutes", the accusation; two-shot, refusal, intrigue. */

const Sun: React.FC = () => (
  <>
    <hemisphereLight args={["#ffe8c8", "#6a4a30", 0.75]} />
    <directionalLight position={[-14, 20, 22]} intensity={3.1} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-far={80} shadow-bias={-0.0004} />
    <pointLight position={[0, 4, -6]} intensity={6} distance={14} color="#ffcf98" />
  </>
);

/**
 * Ranks of nobles. `frozen` removes all idle motion and blinking (the "like mutes" beat);
 * `watch` turns heads toward a moving point (someone walking out); `front` adds two rows across the aisle.
 */
const Ranks: React.FC<{ frame: number; frozen?: boolean; watch?: [number, number]; watchK?: number; front?: boolean; skip?: number[] }> = ({ frame, frozen = false, watch, watchK = 0, front = false, skip = [] }) => {
  const people: { c: string; x: number; z: number; heading: number; seed: number }[] = [];
  NOBLES.forEach((c, i) => {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 4);
    people.push({ c, x: side * (3.2 + row * 1.25), z: -6.5 + ((i >> 1) % 2) * 2.6 + row * 0.9, heading: side > 0 ? -90 : 90, seed: 50 + i });
  });
  if (front)
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 5; k++) people.push({ c: ["courtier", "official", "jaswant", "official", "courtier"][(k + r) % 5], x: -1.6 + k * 0.8 + r * 0.4, z: -4.9 + r * 1.0, heading: 180, seed: 80 + r * 5 + k });
  return (
    <>
      {people.map((p, i) => {
        if (skip.includes(i)) return null;
        let turn = 0;
        if (watch) {
          const ang = (Math.atan2(watch[0] - p.x, watch[1] - p.z) * 180) / Math.PI - p.heading;
          const a = ((ang + 540) % 360) - 180;
          turn = Math.max(-75, Math.min(75, a)) * watchK;
        }
        const base = frozen ? { blink: 0 } : idle(frame, p.seed, 0.6);
        const pose = add(base, HANDS_CLASPED, { x: p.x, z: p.z, heading: p.heading, headTurn: turn, spine: 4 });
        return <Character3D key={i} costume={p.c} pose={pose} frame={frame} seed={p.seed} lod={Math.abs(p.z) < 6 ? "hi" : "lo"} />;
      })}
    </>
  );
};

const FoldedRobe: React.FC = () => (
  <group>
    <mesh position={[0, 0.03, 0]} material={flatMat("#efe6d2", 0.6)} castShadow>
      <boxGeometry args={[0.34, 0.06, 0.26]} />
    </mesh>
    <mesh position={[0, 0.065, 0]} material={flatMat("#d8b25a", 0.3, 0.9)}>
      <boxGeometry args={[0.35, 0.01, 0.04]} />
    </mesh>
  </group>
);

/** Attendant carrying a tray with a folded robe of honour in front of him. */
const RobeBearer: React.FC<{ frame: number; path: P2[]; start: number; seed: number; bow?: number }> = ({ frame, path, start, seed, bow = 0 }) => {
  const w = walkPath(frame, path, { speed: 0.9, start, accel: 12 });
  const pose = add(w.pose, { shL: 55, shR: 55, elL: 50, elR: 50, shLAbd: -18, shRAbd: -18, spine: 4 + 20 * bow });
  const D = Math.PI / 180;
  const h = (w.pose.heading ?? 0) * D;
  return (
    <group>
      <Character3D costume="official" pose={add(pose, idle(frame, seed, 0.3))} frame={frame} seed={seed} />
      <group position={[(w.pose.x ?? 0) + Math.sin(h) * 0.42, 1.18 - 0.1 * bow, (w.pose.z ?? 0) + Math.cos(h) * 0.42]} rotation={[0, h, 0]}>
        <mesh material={flatMat("#d8b25a", 0.3, 0.9)}>
          <cylinderGeometry args={[0.24, 0.22, 0.03, 24]} />
        </mesh>
        <group position={[0, 0.02, 0]}>
          <FoldedRobe />
        </group>
      </group>
    </group>
  );
};

export const CourtBeats3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue, beat }) => {
  const emperor = <Character3D costume="aurangzeb" pose={emperorPose(f, 0.6)} frame={f} seed={7} left="beads" />;
  const stage = (cam: CamKey[], children: React.ReactNode) => (
    <Stage3D cam={cam} camEase="smooth" background="#2a1d14" fog={{ color: "#3a2a1c", near: 22, far: 60 }} exposure={1.0} grade={COURT_GRADE}>
      <Sun />
      <Hall frame={f} />
      {emperor}
      {children}
    </Stage3D>
  );

  if (beat === "ranks") {
    // Ram Singh steers Shivaji back behind the standing rows; their turbans cut off his view of the throne
    const turn = ease((f - 25) / 25);
    const shiv = add(STAND, HANDS_CLASPED, idle(f, 1, 0.4), { x: 0.3, z: -2.6, heading: 360 * 0 + 180 * turn, brow: -0.4 * turn, head: 2 });
    const ram = add(STAND, idle(f, 3, 0.4), { x: -0.6, z: -2.2, heading: 120, shR: 40 * (1 - turn), elR: 30, shRAbd: -10 });
    return stage(
      [
        { f: 0, pos: [1.2, 1.8, 0.6], target: [0, 1.6, -6], fov: 36 },
        { f: duration, pos: [0.55, 1.78, -1.3], target: [0, 1.75, -10], fov: 30 },
      ],
      <>
        <Ranks frame={f} front />
        <Character3D costume="shivaji" pose={shiv} frame={f} seed={1} />
        <Character3D costume="ramsingh" pose={ram} frame={f} seed={3} />
      </>,
    );
  }

  if (beat === "robes") {
    // attendants carry robes of honour to the ranks; Jaswant Singh bows to accept
    const jasAt = cue("jaswant", Math.round(duration * 0.55));
    const bowT = ease((f - jasAt - 25) / 20) * (1 - ease((f - jasAt - 90) / 25));
    return stage(
      [
        { f: 0, pos: [-5.5, 2.6, 2.5], target: [1, 1.4, -5], fov: 36 },
        { f: jasAt, pos: [-2.5, 2.1, 0.5], target: [2.6, 1.5, -4.2], fov: 32 },
        { f: duration, pos: [-1.2, 1.9, -0.6], target: [3.0, 1.5, -4.0], fov: 28 },
      ],
      <>
        <Ranks frame={f} skip={[2]} />
        {/* Jaswant Singh (front rank, right side) */}
        <Character3D costume="jaswant" pose={add(idle(f, 52, 0.5), HANDS_CLASPED, mix({}, add(BOW, { shR: 60, elR: 50, shRAbd: -10 }), bowT), { x: 3.2, z: -4.1, heading: -90 })} frame={f} seed={52} />
        <RobeBearer frame={f} path={[[-1, 2], [-0.5, -3.5], [-2.4, -6.2]]} start={0} seed={61} />
        <RobeBearer frame={f} path={[[0.6, 3], [0.8, -2], [2.3, -4.1]]} start={Math.max(0, jasAt - 110)} seed={62} bow={bowT} />
        <Character3D costume="shivaji" pose={add(STAND, HANDS_CLASPED, idle(f, 1, 0.4), { x: 0.3, z: -2.6, heading: 180, headTurn: 40 * ease((f - jasAt) / 30), brow: -0.5 })} frame={f} seed={1} />
      </>,
    );
  }

  if (beat === "walkout") {
    // Shivaji turns his back on the throne and strides away toward the side recess; every head follows him
    const turnAt = cue("turned", 30);
    const walkAt = cue("walked", turnAt + 40);
    const turn = ease((f - turnAt) / 16);
    const w = walkPath(f, [[0.3, -2.6], [1.6, 1.5], [4.2, 4.5]], { speed: 1.35, start: walkAt - 10, accel: 10 });
    const moving = w.moving;
    const shiv = moving > 0 ? add(w.pose, { brow: -0.8, spine: 2 }) : add(STAND, idle(f, 1, 0.3), { x: 0.3, z: -2.6, heading: 180 - 160 * turn, brow: -0.8 });
    const pos: [number, number] = [shiv.x ?? 0.3, shiv.z ?? -2.6];
    return stage(
      [
        { f: 0, pos: [3.6, 1.7, 3.2], target: [0.3, 1.6, -3], fov: 34 },
        { f: duration, pos: [5.4, 1.75, 6.4], target: [3.2, 1.5, 2.5], fov: 34 },
      ],
      <>
        <Ranks frame={f} front watch={pos} watchK={ease((f - turnAt - 6) / 18)} />
        <Character3D costume="shivaji" pose={shiv} frame={f} seed={1} />
      </>,
    );
  }

  if (beat === "mutes") {
    // perfectly still ranks, hands before them; only the camera moves
    return stage(
      [
        { f: 0, pos: [-1.2, 1.7, -0.6], target: [-4.2, 1.55, -4.6], fov: 32 },
        { f: duration, pos: [-0.6, 1.62, -3.4], target: [-4.2, 1.5, -6.6], fov: 30 },
      ],
      <Ranks frame={f} frozen front />,
    );
  }

  // beat "accuse": Fulad Khan bows before the throne and points at Ram Singh, who stands stiffly
  const fuladAt = cue("fulad", 20);
  const toldAt = cue("told", fuladAt + 50);
  const bowT = ease((f - fuladAt) / 16) * (1 - ease((f - fuladAt - 30) / 16));
  const point = ease((f - toldAt) / 14);
  const fulad = add(STAND, idle(f, 9, 0.4), mix({}, BOW, bowT), mix({}, { shR: 85, shRAbd: -40, elR: 5, headTurn: 50, brow: -0.6 }, point), { x: 0.6, z: -7.6, heading: 180 - 70 * point });
  return stage(
    [
      { f: 0, pos: [2.6, 2.0, -2.8], target: [0, 1.7, -8.5], fov: 34 },
      { f: duration, pos: [1.8, 1.8, -3.4], target: [-0.8, 1.6, -6.4], fov: 32 },
    ],
    <>
      <Ranks frame={f} skip={[4]} />
      <Character3D costume="fuladkhan" pose={fulad} frame={f} seed={9} />
      <Character3D costume="ramsingh" pose={add(STAND, { x: -1.6, z: -5.6, heading: 120, brow: -0.3, headTurn: 25 * point, breathe: Math.sin(f / 10) })} frame={f} seed={3} />
    </>,
  );
};

// ================================================================ TwoShot: "I cast off your mansab"
export const TwoShot3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue }) => {
  const castAt = cue("cast", Math.round(duration * 0.3));
  const rankAt = cue("rank", castAt + 45);
  const talking = f > castAt - 3 && f < rankAt + 20 ? Math.abs(Math.sin(f * 0.55)) : 0;
  const anger = ease((f - castAt + 30) / 25);
  const reach = ease((f - rankAt) / 18);
  const shiv = add(STAND, idle(f, 1, 0.5), { x: 0.45, z: 0, heading: -78, brow: -1 * anger, jaw: talking * 0.8, shL: 10, shR: 10, elL: 35 * anger, elR: 35 * anger, chest: 3 * anger, head: -4 });
  const ram = add(STAND, idle(f, 3, 0.5), { x: -0.45, z: 0.05, heading: 100, brow: 0.6, shL: 45 * reach, elL: 25, shLAbd: -20 * reach, head: 4, lookX: 0.4 });
  const cam: CamKey[] = [
    { f: 0, pos: [0.15, 1.68, 2.8], target: [0, 1.58, 0], fov: 30 },
    { f: duration, pos: [0.1, 1.66, 2.1], target: [0.05, 1.6, 0], fov: 26 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#2a1d14" fog={{ color: "#3a2a1c", near: 8, far: 30 }} exposure={1.0} grade={COURT_GRADE}>
      <hemisphereLight args={["#ffe8c8", "#6a4a30", 0.7]} />
      <directionalLight position={[-6, 8, 6]} intensity={2.8} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[5, 3, -4]} intensity={1.0} color="#ffb070" />
      <ArchedPanel width={16} height={7} depth={0.8} arches={4} archW={2.8} archSpring={3.2} archH={5.2} position={[0, 0, -3.5]} material={stoneMat(SANDSTONE, [4, 2])} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={flatMat("#e6dccb", 0.4)} receiveShadow>
        <planeGeometry args={[30, 20]} />
      </mesh>
      <Character3D costume="shivaji" pose={shiv} frame={f} seed={1} />
      <Character3D costume="ramsingh" pose={ram} frame={f} seed={3} />
    </Stage3D>
  );
};

// ================================================================ RobeRefusal
export const RobeRefusal3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue }) => {
  const refAt = cue("refused", Math.round(duration * 0.55));
  const palm = ease((f - refAt + 18) / 12);
  const seated: Pose3 = { drop: 0.45, hipL: 88, hipR: 88, kneeL: 88, kneeR: 88, spine: 4 };
  const shiv = add(seated, idle(f, 1, 0.3), { x: -0.8, z: -1.2, heading: 45, shR: 75 * palm, elR: 70 * palm, wristR: -70 * palm, headTurn: -55 * palm, brow: -0.7 });
  const cam: CamKey[] = [
    { f: 0, pos: [1.8, 1.4, 2.6], target: [-0.4, 1.0, -0.8], fov: 34 },
    { f: duration, pos: [1.3, 1.3, 2.0], target: [-0.5, 1.0, -0.9], fov: 30 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#2a1d14" fog={{ color: "#3a2a1c", near: 8, far: 30 }} exposure={1.05} grade={COURT_GRADE}>
      <hemisphereLight args={["#ffe8c8", "#6a4a30", 0.7]} />
      <directionalLight position={[-5, 8, 6]} intensity={2.8} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} />
      <Room w={8} d={5} h={4} wall="#c9ab84" floor="#b8a888" />
      <mesh position={[-0.8, 0.22, -1.4]} material={flatMat("#efe6d2", 0.6)} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.44, 0.9]} />
      </mesh>
      <Character3D costume="shivaji" pose={shiv} frame={f} seed={1} />
      {[0, 1, 2].map((k) => {
        const lean = ease((f - 10 - k * 6) / 20) * (1 - palm * 0.6);
        return (
          <group key={k}>
            <Character3D costume={k === 1 ? "official" : "courtier"} pose={add(STAND, idle(f, 70 + k, 0.4), { x: 0.4 + k * 0.7, z: -0.2 + k * 0.35, heading: -120 + k * 6, spine: 18 * lean, shL: 55, shR: 55, elL: 45, elR: 45, shLAbd: -18, shRAbd: -18, brow: 0.5 * palm })} frame={f} seed={70 + k} />
            {k === 1 && (
              <group position={[0.4 + 0.7 - 0.38, 1.12, -0.2 + 0.35 - 0.22]} rotation={[0, -2.1, 0]}>
                <mesh material={flatMat("#d8b25a", 0.3, 0.9)}>
                  <cylinderGeometry args={[0.24, 0.22, 0.03, 24]} />
                </mesh>
                <group position={[0, 0.02, 0]}>
                  <FoldedRobe />
                </group>
              </group>
            )}
          </group>
        );
      })}
    </Stage3D>
  );
};

// ================================================================ CourtIntrigue (night palace · smug · rumour)
/** A veiled figure seen only as a silhouette behind the marble jali (Jahanara: no face is shown). */
const VeiledSilhouette: React.FC<{ position: V3; frame: number }> = ({ position, frame }) => (
  <group position={position} rotation={[0, 0, Math.sin(frame / 60) * 0.02]}>
    <mesh position={[0, 0.8, 0]} material={flatMat("#140c10", 1)}>
      <coneGeometry args={[0.42, 1.6, 16]} />
    </mesh>
    <mesh position={[0, 1.72, 0]} material={flatMat("#140c10", 1)}>
      <sphereGeometry args={[0.16, 12, 10]} />
    </mesh>
    <mesh position={[0, 1.55, -0.05]} material={flatMat("#140c10", 1)}>
      <coneGeometry args={[0.32, 0.6, 14]} />
    </mesh>
  </group>
);

export const CourtIntrigue3D: React.FC<Shot3DProps> = ({ frame: f, duration, mood }) => {
  const nod = Math.sin(f / 6) * 8;
  if (mood === "rumour") {
    const lean = ease((f - 15) / 25);
    const cam: CamKey[] = [
      { f: 0, pos: [1.6, 1.6, 2.6], target: [0, 1.4, -0.4], fov: 32 },
      { f: duration, pos: [1.0, 1.5, 1.8], target: [0, 1.45, -0.4], fov: 28 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#0c0a10" fog={{ color: "#0c0a10", near: 4, far: 16 }} exposure={1.4} grade={{ vignette: 0.7, grain: 0.07, tint: "rgba(255,130,60,0.12)" }}>
        <hemisphereLight args={["#2a3050", "#1a120a", 0.3]} />
        <Room w={7} d={5} h={3.6} wall="#8a6a4a" floor="#5a4636" />
        <OilLamp frame={f} position={[0.2, 0, -1.2]} intensity={14} shadows stand={1.0} />
        <Character3D costume="spy" pose={add(STAND, idle(f, 11, 0.4), { x: -0.45, z: -0.3, heading: 70, spine: 18 * lean, head: 10 * lean, headTurn: 15, shR: 30 * lean, elR: 90 * lean, shRAbd: -10, jaw: lean > 0.8 ? Math.abs(Math.sin(f * 0.5)) * 0.4 : 0 })} frame={f} seed={11} />
        <Character3D costume="official" pose={add(STAND, idle(f, 12, 0.4), { x: 0.4, z: -0.25, heading: -80, headTurn: -20 * lean, brow: 0.6 * lean, head: 6 })} frame={f} seed={12} />
      </Stage3D>
    );
  }
  if (mood === "smug") {
    const shrug = ease((f - 30) / 12) * (1 - ease((f - 70) / 14));
    const cam: CamKey[] = [
      { f: 0, pos: [0, 1.7, 3.2], target: [0, 1.5, 0], fov: 32 },
      { f: duration, pos: [0, 1.65, 2.7], target: [0, 1.5, 0], fov: 30 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#2a1d14" fog={{ color: "#3a2a1c", near: 8, far: 30 }} exposure={1.0} grade={COURT_GRADE}>
        <hemisphereLight args={["#ffe8c8", "#6a4a30", 0.7]} />
        <directionalLight position={[-6, 8, 6]} intensity={2.8} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} />
        <ArchedPanel width={16} height={7} depth={0.8} arches={4} archW={2.8} archSpring={3.2} archH={5.2} position={[0, 0, -3]} material={stoneMat(SANDSTONE, [4, 2])} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={flatMat("#e6dccb", 0.4)} receiveShadow>
          <planeGeometry args={[30, 20]} />
        </mesh>
        {[-0.9, 0, 0.9].map((x, k) => (
          <Character3D
            key={k}
            costume={["courtier", "official", "courtier"][k]}
            pose={add(STAND, idle(f, 20 + k, 0.4), HANDS_CLASPED, { x, z: -0.3 + (k === 1 ? -0.3 : 0), heading: k === 0 ? 30 : k === 2 ? -30 : 0, head: k === 1 ? 0 : nod * 0.6, headTurn: k === 0 ? 25 : k === 2 ? -25 : 0, brow: 0.3 }, k === 1 ? { shL: 30 * shrug, shR: 30 * shrug, shLAbd: 35 * shrug, shRAbd: 35 * shrug, elL: 70 * shrug, elR: 70 * shrug, wristL: -40 * shrug, wristR: -40 * shrug, head: -8 * shrug, chest: 4 * shrug } : {})}
            frame={f}
            seed={20 + k}
          />
        ))}
      </Stage3D>
    );
  }
  // night palace: a veiled silhouette behind the marble screen; courtiers lean in to whisper to the emperor
  const lean = ease((f - 20) / 30);
  const cam: CamKey[] = [
    { f: 0, pos: [0, 1.6, 4.6], target: [0, 1.4, -1.5], fov: 34 },
    { f: duration, pos: [0.8, 1.45, 3.0], target: [0, 1.3, -1.2], fov: 30 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#0c0a10" fog={{ color: "#0c0a10", near: 6, far: 20 }} exposure={1.35} grade={{ vignette: 0.68, grain: 0.07, tint: "rgba(255,130,60,0.1)" }}>
      <hemisphereLight args={["#2a3050", "#1a120a", 0.35]} />
      <Room w={9} d={6} h={4} wall="#a08060" floor="#6a5642" niches={false} />
      <group position={[0, 0.4, -2.75]}>
        <Jali w={2.6} h={2.6} color="#e9e1cf" glow="#ffb468" />
      </group>
      <pointLight position={[0, 1.8, -3.6]} intensity={16} color="#ffb060" distance={6} decay={1.5} />
      <VeiledSilhouette position={[0.2, 0.2, -3.3]} frame={f} />
      <OilLamp frame={f} position={[-2.2, 0, -0.6]} intensity={12} shadows stand={1.1} />
      <OilLamp frame={f} position={[2.2, 0, -0.6]} intensity={12} stand={1.1} seed={4} />
      <Cushion position={[0, 0, -0.9]} />
      <Character3D costume="aurangzeb" pose={add(SIT_CROSS, idle(f, 7, 0.25), { x: 0, z: -1.0, y: 0.2, headTurn: 12 * lean })} frame={f} seed={7} left="beads" />
      {[[-0.95, -0.4, 60], [0.95, -0.35, -60]].map(([x, z, h], k) => (
        <Character3D key={k} costume={k ? "official" : "courtier"} pose={add(STAND, idle(f, 30 + k, 0.4), { x, z, heading: h, spine: 22 * lean, head: 12 * lean, headTurn: (k ? 10 : -10) * lean, jaw: lean > 0.7 ? Math.abs(Math.sin(f * 0.45 + k)) * 0.3 : 0 })} frame={f} seed={30 + k} />
      ))}
      <Glow position={[0, 1.6, -2.6]} size={3} color="#ffcf8a" opacity={0.25} />
    </Stage3D>
  );
};
