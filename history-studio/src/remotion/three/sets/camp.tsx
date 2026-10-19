import React from "react";
import { Stage3D, type CamKey } from "../engine/Stage3D";
import { Character3D } from "../character/Character3D";
import { add, ease, idle, mix } from "../motion/motion";
import { ARMS_FOLDED, SIT_CROSS, STAND } from "../motion/poses";
import { flatMat } from "./architecture";
import { Cushion, LowDesk, OilLamp, Room, TentInterior } from "./kit2";
import type { Shot3DProps } from "./night";

/** The campaign tent (Jai Singh and Shivaji, the oath, the fateful letter) and the interrogation room. */
const WARM = { vignette: 0.62, grain: 0.06, tint: "rgba(255,150,70,0.12)" };

export const TentTalk3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue, mood }) => {
  const m = String(mood);
  if (m === "writing") {
    // Jai Singh writes by lamplight in his Deccan camp, then seals the letter
    const sealAt = Math.round(duration * 0.75);
    const scribble = f < sealAt ? Math.sin(f / 4) * 6 : 0;
    const seal = ease((f - sealAt) / 15);
    const pose = add(SIT_CROSS, idle(f, 4, 0.3), { spine: 14 - 6 * seal, head: 10 - 4 * seal, shR: 52 + scribble * 0.3 + 20 * seal, elR: 75 + scribble - 30 * seal, shL: 30, elL: 70, wristR: -40 * seal });
    const cam: CamKey[] = [
      { f: 0, pos: [1.6, 1.4, 2.4], target: [0, 0.8, 0.2], fov: 34 },
      { f: duration, pos: [0.7, 1.15, 1.5], target: [0, 0.6, 0.4], fov: 30 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#120c08" fog={{ color: "#120c08", near: 5, far: 18 }} exposure={1.3} grade={WARM}>
        <hemisphereLight args={["#3a3550", "#20140a", 0.4]} />
        <TentInterior frame={f} color="#b8a888" />
        <Cushion position={[0, 0, -0.35]} color="#2a4a6a" />
        <LowDesk position={[0, 0, 0.62]} />
        <mesh position={[0.15, 0.36, 0.62]} material={flatMat("#a01818", 0.5)} scale={seal}>
          <cylinderGeometry args={[0.03, 0.03, 0.01, 16]} />
        </mesh>
        <OilLamp frame={f} position={[0.75, 0, 0.5]} intensity={16} shadows stand={0.38} />
        <Character3D costume="jaisingh" pose={pose} frame={f} seed={4} right="quill" />
      </Stage3D>
    );
  }
  // persuade / oath: Jai Singh leans in gesturing north; Shivaji listens arms crossed, then looks down
  const oath = m === "oath";
  const swore = oath ? ease((f - cue("swore", 10)) / 14) : 0;
  const gest = oath ? 0 : Math.max(0, Math.sin(f / 18)) * ease(f / 20);
  const jai = add(SIT_CROSS, idle(f, 4, 0.4), { x: -0.75, z: 0, heading: 70, spine: 14, shR: oath ? 60 * swore : 80 * gest, shRAbd: oath ? -50 * swore : 20, elR: oath ? 110 * swore : 20, wristR: oath ? 10 : -30, jaw: oath ? 0 : Math.abs(Math.sin(f * 0.45)) * 0.35 * gest, brow: 0.4 });
  const down = ease((f / Math.max(1, duration) - 0.6) / 0.25);
  const shiv = add(SIT_CROSS, idle(f, 1, 0.4), mix({}, ARMS_FOLDED, 0.85), { x: 0.75, z: 0, heading: -70, head: oath ? 2 : 14 * down, brow: -0.3, lookY: oath ? 0.2 : -0.6 * down });
  const cam: CamKey[] = [
    { f: 0, pos: [0, 1.25, 3.0], target: [0, 0.95, 0], fov: 34 },
    { f: duration, pos: [oath ? -0.6 : 0.3, 1.2, 2.3], target: [oath ? -0.5 : 0, 0.95, 0], fov: 30 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#120c08" fog={{ color: "#120c08", near: 5, far: 18 }} exposure={1.3} grade={WARM}>
      <hemisphereLight args={["#3a3550", "#20140a", 0.4]} />
      <TentInterior frame={f} />
      <Cushion position={[-0.85, 0, -0.1]} rotationY={1.2} color="#2a4a6a" />
      <Cushion position={[0.85, 0, -0.1]} rotationY={-1.2} />
      <OilLamp frame={f} position={[0, 0, -0.9]} intensity={18} shadows stand={1.2} />
      <Character3D costume="jaisingh" pose={jai} frame={f} seed={4} />
      <Character3D costume="shivaji" pose={shiv} frame={f} seed={1} />
    </Stage3D>
  );
};

/** Ram Singh's men held by soldiers; a forced "confession" is written, later torn. No violence is shown. */
export const Interrogation3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const tear = ease((f / Math.max(1, duration) - 0.7) / 0.15);
  const cam: CamKey[] = [
    { f: 0, pos: [0, 1.6, 3.6], target: [0, 1.2, 0], fov: 34 },
    { f: duration, pos: [0.4, 1.5, 2.8], target: [0, 1.1, 0], fov: 30 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#0c0a10" fog={{ color: "#0c0a10", near: 4, far: 16 }} exposure={1.4} grade={{ vignette: 0.72, grain: 0.08, tint: "rgba(80,90,140,0.12)" }}>
      <hemisphereLight args={["#2a3050", "#1a120a", 0.3]} />
      <Room w={7} d={5} h={3.4} wall="#6a5a48" floor="#4a3e32" niches={false} />
      <OilLamp frame={f} position={[0.9, 0, 0.4]} intensity={14} shadows stand={0.4} />
      {[-1.2, 1.2].map((x, k) => (
        <group key={k}>
          {/* a Rajput retainer, arms held behind by a soldier: tense, head bowed, unharmed */}
          <Character3D costume="rajputguard" pose={add(STAND, idle(f, 40 + k, 0.5), { x, z: -0.8, heading: 0, shL: -25, shR: -25, elL: 20, elR: 20, head: 16, brow: 0.7 })} frame={f} seed={40 + k} />
          <Character3D costume="guard" pose={add(STAND, idle(f, 50 + k, 0.4), { x: x * 1.05, z: -1.35, heading: 0, shL: 40, shR: 40, elL: 30, elR: 30, shLAbd: -20, shRAbd: -20 })} frame={f} seed={50 + k} />
        </group>
      ))}
      {/* scribe writing the "confession"; it is torn in two near the end */}
      <LowDesk position={[0.3, 0, 0.6]} />
      <Character3D costume="official" pose={add(SIT_CROSS, idle(f, 60, 0.3), { x: 0.3, z: 0.05, heading: 0, spine: 20, head: 16, shR: 50 + Math.sin(f / 4) * 3 * (1 - tear), elR: 75 })} frame={f} seed={60} right="quill" />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.3 + s * 0.09 * (1 + tear * 3), 0.34 + tear * 0.3, 0.62]} rotation={[0, 0, s * tear * 0.6]} material={flatMat("#e2d2ac", 0.9)}>
          <boxGeometry args={[0.16, 0.004, 0.42]} />
        </mesh>
      ))}
    </Stage3D>
  );
};
