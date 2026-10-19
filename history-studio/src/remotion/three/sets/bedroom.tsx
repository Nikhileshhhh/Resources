import React from "react";
import { Stage3D, Glow, type CamKey, type V3 } from "../engine/Stage3D";
import { Character3D, type Pose3 } from "../character/Character3D";
import { add, ease, idle, keyed, mix, walkPath } from "../motion/motion";
import { HANDS_CLASPED, SPEAR_REST_L, STAND } from "../motion/poses";
import { Basket, flatMat } from "./architecture";
import { Bed, Jali, OilLamp, Room } from "./kit2";
import type { Shot3DProps } from "./night";

/** The guarded bedroom and the jali window: night watch, illness, the decoy, the empty bed. */

const BED: V3 = [-0.6, 0, -1.0];
const MATTRESS_TOP = 0.43;

/** Lying on the back on the bed (head toward the bolster at −Z). Rendered inside a rotated group. */
const LIE: Pose3 = { shL: 4, shR: 4, elL: 8, elR: 8, shLAbd: 6, shRAbd: 6, kneeL: 4, kneeR: 4, ankleL: 30, ankleR: 30, robeTight: 1 };

/** Character lying on the bed: the body is rotated −90° about X so its up axis points toward the bolster. */
const Lying: React.FC<{ costume: string; pose: Pose3; frame: number; seed: number; roll?: number; z?: number }> = ({ costume, pose, frame, seed, roll = 0, z = 0.05 }) => (
  <group position={[BED[0], MATTRESS_TOP + 0.12, BED[2] + 0.92 + z]} rotation={[-Math.PI / 2, 0, roll]}>
    <Character3D costume={costume} pose={{ ...pose, y: -0.0 }} frame={frame} seed={seed} />
  </group>
);

const NightRoom: React.FC<{ frame: number; dawn?: number; lamp?: boolean; dust?: boolean }> = ({ frame, dawn = 0, lamp = true, dust = false }) => {
  // moonlight (or dawn sun) slanting through the jali in the left wall
  const sunCol = dawn > 0 ? "#ffc58a" : "#9db4ff";
  const sunInt = dawn > 0 ? 2.6 * dawn : 1.5;
  return (
    <>
      <hemisphereLight args={[dawn > 0 ? "#ffd9b0" : "#40568a", "#2a1a10", dawn > 0 ? 0.55 : 0.35]} />
      <directionalLight position={[-9, 5, -1.5]} intensity={sunInt} color={sunCol} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-0.0006} />
      <Room w={8} d={6} h={3.6} wall="#b89a74" floor="#6e5a48" />
      <group position={[-3.82, 0.9, -0.8]}>
        <Jali w={1.5} h={1.9} rotationY={Math.PI / 2} glow={dawn > 0 ? "#ffd8a0" : "#26385e"} />
      </group>
      <Bed position={BED} />
      {lamp && <OilLamp frame={frame} position={[1.7, 0, -2.4]} intensity={dawn > 0 ? 4 : 16} shadows />}
      {dust &&
        Array.from({ length: 40 }, (_, i) => (
          <Glow key={i} position={[-3 + ((i * 1.37 + frame * 0.004) % 4.5), 0.4 + ((i * 0.73 + frame * 0.003) % 2.6), -1.6 + ((i * 0.91) % 1.6)]} size={0.03} color="#ffe2b0" opacity={0.55} />
        ))}
    </>
  );
};

const GRADE_NIGHT = { vignette: 0.66, grain: 0.07, tint: "rgba(40,70,140,0.14)" };
const GRADE_WARM = { vignette: 0.6, grain: 0.06, tint: "rgba(255,150,70,0.12)" };

// ================================================================ Bedroom (watched · illness · decoy)
export const Bedroom3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue, beat }) => {
  if (beat === "watched") {
    // Shivaji lies awake; two Rajput guards stand at the doorway; moonlight bars across the floor
    const cam: CamKey[] = [
      { f: 0, pos: [2.6, 1.7, 2.6], target: [-0.6, 0.6, -0.8], fov: 34 },
      { f: duration, pos: [1.6, 1.5, 1.6], target: [-0.6, 0.6, -0.6], fov: 30 },
    ];
    const look = Math.sin(f / 50) * 0.6;
    return (
      <Stage3D cam={cam} camEase="smooth" background="#0a0d16" exposure={1.35} grade={GRADE_NIGHT}>
        <NightRoom frame={f} />
        <Lying costume="shivaji" pose={add(LIE, idle(f, 1, 0.2), { headTurn: 25 + look * 10, lookX: 0.9, blink: 0 })} frame={f} seed={1} />
        {[[3.2, -2.1, -95], [3.3, -0.9, -85]].map(([x, z, h], i) => (
          <Character3D key={i} costume="rajputguard" pose={add(idle(f, 20 + i, 0.6), SPEAR_REST_L, { x, z, heading: h, headTurn: i ? -15 : 10 })} frame={f} seed={20 + i} left="spear" />
        ))}
      </Stage3D>
    );
  }

  if (beat === "illness") {
    // Shivaji lies ill, a cloth on his forehead; a servant fills the great baskets with sweets beside him
    const cycle = 90;
    const k = (f % cycle) / cycle;
    const trip = Math.floor(f / cycle);
    // servant walks between the tray table (x 2.2) and the baskets (x 0.9), bending to place each sweet
    const toBasket = k < 0.3 ? ease(k / 0.3) : k < 0.55 ? 1 : 1 - ease((k - 0.55) / 0.3);
    const bend = k > 0.3 && k < 0.55 ? Math.sin(((k - 0.3) / 0.25) * Math.PI) : 0;
    const sx = 2.3 - 1.25 * toBasket;
    const walking = Math.abs(toBasket - 0.5) < 0.49 && (k < 0.3 || (k > 0.55 && k < 0.85)) ? 1 : 0;
    const servant = add(STAND, idle(f, 30, 0.5), { x: sx, z: 0.6 + trip * 0.0, heading: k < 0.55 ? -90 : 90, spine: 40 * bend, shR: 30 + 50 * bend, elR: 20, shL: 20 + 40 * bend, head: 15 * bend, hipL: walking * 12 * Math.sin(f / 4), hipR: -walking * 12 * Math.sin(f / 4), kneeL: walking * 15, kneeR: walking * 15 });
    const fill = Math.min(1, (f / duration) * 1.1);
    const cam: CamKey[] = [
      { f: 0, pos: [3.2, 1.9, 3.2], target: [0, 0.6, -0.6], fov: 36 },
      { f: duration, pos: [2.0, 1.6, 2.4], target: [0.3, 0.6, -0.4], fov: 32 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#120c08" exposure={1.2} grade={GRADE_WARM}>
        <NightRoom frame={f} dawn={0.5} />
        <Lying costume="shivaji" pose={add(LIE, idle(f, 1, 0.15), { headTurn: 15, blink: 0.55 + 0.45 * Math.max(0, Math.sin(f / 40)), brow: 0.4, breathe: Math.sin(f / 12) * 1.5 })} frame={f} seed={1} />
        {/* wet cloth on his forehead */}
        <mesh position={[BED[0], MATTRESS_TOP + 0.3, BED[2] - 0.62]} rotation={[-0.2, 0, 0]} material={flatMat("#f2ece0", 0.9)}>
          <boxGeometry args={[0.16, 0.02, 0.1]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[0.7 + i * 0.95, 0, -0.4 - (i % 2) * 0.5]} scale={1.15}>
            <Basket fill={fill > 0.15 + i * 0.25 ? "sweets" : "none"} />
          </group>
        ))}
        <mesh position={[2.6, 0.4, 0.6]} material={flatMat("#5a3a22", 0.7)} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.6]} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[2.4 + (i % 4) * 0.12, 0.85, 0.5 + Math.floor(i / 4) * 0.1]} material={flatMat("#e39a2c", 0.6)} castShadow>
            <sphereGeometry args={[0.05, 10, 8]} />
          </mesh>
        ))}
        <Character3D costume="porter" pose={servant} frame={f} seed={30} />
      </Stage3D>
    );
  }

  // beat "decoy": Hiroji lies down, the quilt is drawn up, one arm out with the bracelet; a boy massages his feet
  const liesAt = cue("lies", 60);
  const quiltAt = cue("quilt", liesAt + 60);
  const armAt = cue("arm", quiltAt + 50);
  const boyAt = cue("boy", armAt + 70);
  const lieT = ease((f - liesAt + 20) / 40);
  const quilt = 1 - ease((f - quiltAt) / 40);
  // Hiroji: seated on the bed edge → lying back
  const seated: Pose3 = { drop: 0.48, hipL: 85, hipR: 85, kneeL: 90, kneeR: 90, spine: 6, shL: 10, shR: 10, elL: 30, elR: 30 };
  const massage = Math.sin(f / 9) * (f > boyAt ? 1 : 0);
  const cam: CamKey[] = [
    { f: 0, pos: [2.0, 1.55, 1.8], target: [-0.6, 0.7, -0.9], fov: 34 },
    { f: armAt + 10, pos: [0.6, 1.25, 0.6], target: [-0.35, 0.55, -0.9], fov: 30 },
    { f: duration, pos: [1.2, 1.2, 1.6], target: [-0.6, 0.5, -0.2], fov: 32 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#0a0d16" exposure={1.35} grade={GRADE_NIGHT}>
      <NightRoom frame={f} />
      {lieT < 1 ? (
        <group position={[BED[0] + 0.62 * (1 - lieT), 0, BED[2] + 0.1]}>
          <Character3D costume="hiroji" pose={add(mix(add(seated, idle(f, 5, 0.3)), { ...seated, spine: -40, drop: 0.3 }, lieT), { heading: 90 })} frame={f} seed={5} />
        </group>
      ) : (
        <Lying costume="hiroji" pose={add(LIE, { headTurn: 70, blink: 1, shR: 2, shRAbd: 8 + 26 * ease((f - armAt) / 20), elR: 6 })} frame={f} seed={5} roll={-0.3} />
      )}
      <Bed position={[BED[0], 0.001, BED[2]]} pulled={quilt} occupied={lieT >= 1} />
      {/* the boy at the foot of the bed, rhythmically massaging */}
      <Character3D costume="boy" pose={{ drop: 0.55, hipL: 95, hipR: 95, kneeL: 130, kneeR: 130, x: BED[0], z: BED[2] + 1.35, heading: 180, spine: 22 + massage * 4, shL: 60 + massage * 8, shR: 60 - massage * 8, elL: 40, elR: 40, head: 18, blink: (f % 120) < 6 ? 1 : 0 }} frame={f} seed={6} />
    </Stage3D>
  );
};

// ================================================================ EmptyBed (dawn discovery · morning stillness)
export const EmptyBed3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue, guardReacts }) => {
  if (guardReacts) {
    const goneAt = cue("gone", Math.round(duration * 0.75));
    const pullAt = Math.max(20, goneAt - 70);
    const pulled = ease((f - pullAt) / 18);
    const startle = ease((f - pullAt - 22) / 14);
    const enter = walkPath(f, [[3.2, 0.2], [0.45, -0.75]], { speed: 1.0, start: 0, accel: 14 });
    const reach = keyed(f, [[pullAt - 15, {}], [pullAt, { spine: 30, shR: 70, shL: 50, elR: 20, elL: 30 }], [pullAt + 16, { spine: 10, shR: 60, shL: 40 }]]);
    const react = { spine: -12, shR: 130, shRAbd: 30, shL: 130, shLAbd: 30, elR: 30, elL: 30, head: -10, brow: 1, jaw: 1, pelvisShift: -0.05 };
    const guard = add(mix(enter.pose, { ...enter.pose, ...mix(enter.pose, reach, 1) }, ease((f - pullAt + 15) / 15)), mix({}, react, startle), { z: (enter.pose.z ?? 0) + startle * 0.35, heading: (enter.pose.heading ?? 0) });
    const cam: CamKey[] = [
      { f: 0, pos: [0.4, 1.7, 3.4], target: [-0.3, 0.8, -0.9], fov: 36 },
      { f: duration, pos: [0.0, 1.6, 2.7], target: [-0.2, 0.9, -0.8], fov: 32 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#1a120c" exposure={1.25} grade={GRADE_WARM}>
        <NightRoom frame={f} dawn={1} lamp={false} />
        <Bed position={BED} pulled={pulled} occupied={false} />
        {/* rolled cushions under the quilt (the dummy shape) */}
        <mesh position={[BED[0] + 0.05, MATTRESS_TOP + 0.08, BED[2] + 0.1]} rotation={[Math.PI / 2, 0, 0]} material={flatMat("#d9cdb0", 0.9)}>
          <capsuleGeometry args={[0.13, 0.9, 6, 12]} />
        </mesh>
        <Character3D costume="guard" pose={add(guard, idle(f, 40, 0.3))} frame={f} seed={40} left={startle > 0.5 ? "none" : "spear"} />
      </Stage3D>
    );
  }
  const cam: CamKey[] = [
    { f: 0, pos: [2.2, 1.7, 2.6], target: [-0.6, 0.5, -0.9], fov: 34 },
    { f: duration, pos: [0.9, 1.25, 1.2], target: [-0.6, 0.45, -1.0], fov: 30 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#1a120c" exposure={1.25} grade={GRADE_WARM}>
      <NightRoom frame={f} dawn={0.9} lamp={false} dust />
      <Bed position={BED} pulled={0.05} occupied={false} />
    </Stage3D>
  );
};

// ================================================================ WindowSilhouette (father and son · guest → prisoner)
export const WindowSilhouette3D: React.FC<Shot3DProps> = ({ frame: f, duration, bars }) => {
  if (bars) {
    // from inside: Shivaji at the jali looking out at the moonlit guards; pull back until the lattice reads as bars
    const cam: CamKey[] = [
      { f: 0, pos: [-2.6, 1.65, -0.5], target: [-3.9, 1.7, -0.8], fov: 30 },
      { f: duration, pos: [0.6, 1.6, 1.4], target: [-3.9, 1.6, -0.8], fov: 34 },
    ];
    const barK = ease((f - duration * 0.35) / (duration * 0.5));
    return (
      <Stage3D cam={cam} camEase="smooth" background="#0a0d16" exposure={1.35} grade={GRADE_NIGHT}>
        <NightRoom frame={f} />
        <Character3D costume="shivaji" pose={add(STAND, HANDS_CLASPED, idle(f, 1, 0.3), { x: -3.1, z: -0.8, heading: -90, head: 6 })} frame={f} seed={1} />
        {/* iron bars fade in over the lattice: the guest has become a prisoner */}
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[-3.72, 1.85, -1.45 + i * 0.26]} material={flatMat("#2a2a2e", 0.4, 0.8)} scale={[1, barK, 1]}>
            <cylinderGeometry args={[0.022, 0.022, 1.9, 8]} />
          </mesh>
        ))}
      </Stage3D>
    );
  }
  // exterior: lamplit lattice window at night; father and son as silhouettes behind it, his hand on the boy's shoulder
  const cam: CamKey[] = [
    { f: 0, pos: [0, 2.1, 6.5], target: [0, 2.2, 0], fov: 30 },
    { f: duration, pos: [0, 2.15, 4.4], target: [0, 2.2, 0], fov: 28 },
  ];
  const hand = ease((f - 20) / 30);
  return (
    <Stage3D cam={cam} camEase="smooth" background="#070a12" exposure={1.3} grade={GRADE_NIGHT}>
      <hemisphereLight args={["#40568a", "#1a120c", 0.3]} />
      <directionalLight position={[6, 8, 10]} intensity={0.9} color="#9db4ff" />
      {/* outer wall of the house */}
      {[[-2.95, 2, 4.1, 6], [2.95, 2, 4.1, 6], [0, 4.05, 1.8, 1.9], [0, -0.05, 1.8, 2.1]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, -0.1]} material={flatMat("#5a4636", 0.95)} receiveShadow>
          <boxGeometry args={[w, h, 0.2]} />
        </mesh>
      ))}
      <group position={[0, 1.0, 0.02]}>
        <Jali w={1.8} h={2.1} />
      </group>
      {/* inside: the lamp behind the figures throws them into silhouette against warm light */}
      <mesh position={[0, 2.1, -1.6]}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial color="#ffb060" />
      </mesh>
      <Glow position={[0.3, 1.9, -1.4]} size={2.4} color="#ffcf8a" opacity={0.8} />
      <group scale={[1, 1, 1]}>
        <Character3D costume="shivaji" pose={add(STAND, idle(f, 1, 0.3), { x: -0.25, z: -0.7, heading: 160, shR: 40 * hand, shRAbd: -25 * hand, elR: 30 * hand, head: 10 })} frame={f} seed={1} shadows={false} />
        <Character3D costume="sambhaji" pose={add(STAND, idle(f, 2, 0.4), { x: 0.3, z: -0.75, heading: -170, headTurn: -20, head: -8 })} frame={f} seed={2} shadows={false} />
      </group>
    </Stage3D>
  );
};
