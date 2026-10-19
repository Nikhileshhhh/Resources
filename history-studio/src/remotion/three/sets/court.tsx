import React, { useMemo } from "react";
import * as THREE from "three";
import { Stage3D, Glow, glowTexture, type CamKey } from "../engine/Stage3D";
import { Character3D, type Pose3 } from "../character/Character3D";
import { add, ease, idle, keyed, mix, walkPath } from "../motion/motion";
import { BOW, HANDS_CLASPED, KNEEL, OFFER, SIT_CROSS, STAND } from "../motion/poses";
import { ArchedPanel, MarbleFloor, flatMat, marbleMat, stoneMat, MARBLE, SANDSTONE } from "./architecture";
import { carpet } from "./textures";
import type { Shot3DProps } from "./night";

/** Diwan (hall of audience): three-aisled arcade of cusped arches, raised throne jharokha, nobles in ranks. */
const Hall: React.FC<{ frame: number }> = ({ frame }) => {
  const arch = stoneMat(SANDSTONE, [4, 2]);
  const white = marbleMat(MARBLE, [3, 2], 0.5);
  const rug = useMemo(() => {
    const t = carpet("#7a1e1e", "#d8b25a");
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  }, []);
  return (
    <group>
      <MarbleFloor size={[44, 40]} />
      {/* rows of arcades: back wall, two inner colonnades, open front */}
      <ArchedPanel width={40} height={9} depth={1.2} arches={9} archW={3.2} archSpring={4.2} archH={6.6} position={[0, 0, -13]} material={white} />
      {[-6.5, 6.5].map((x) => (
        <ArchedPanel key={x} width={26} height={9} depth={0.9} arches={6} archW={3.0} archSpring={4.0} archH={6.4} position={[x * 2, 0, -1]} rotationY={Math.PI / 2} material={arch} />
      ))}
      <ArchedPanel width={40} height={9} depth={1.0} arches={9} archW={3.4} archSpring={4.2} archH={6.8} position={[0, 0, 12]} material={arch} />
      <mesh position={[0, 9.2, -0.5]} material={stoneMat(SANDSTONE, [8, 6])} receiveShadow>
        <boxGeometry args={[42, 0.5, 26]} />
      </mesh>
      {/* raised throne platform with marble balustrade and a Bengal-roof canopy */}
      <group position={[0, 0, -10.2]}>
        <mesh position={[0, 0.55, 0]} material={white} castShadow receiveShadow>
          <boxGeometry args={[7, 1.1, 3.6]} />
        </mesh>
        {/* low pierced balustrade */}
        {Array.from({ length: 13 }, (_, i) => (
          <mesh key={i} position={[-3.3 + i * 0.55, 1.33, 1.65]} material={flatMat("#efe8d6", 0.4)} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.45, 8]} />
          </mesh>
        ))}
        <mesh position={[0, 1.6, 1.65]} material={flatMat("#efe8d6", 0.4)} castShadow>
          <boxGeometry args={[7, 0.1, 0.18]} />
        </mesh>
        {[-3.2, 3.2].map((x) => (
          <group key={x} position={[x, 1.1, 1.3]}>
            <mesh position={[0, 1.8, 0]} material={white} castShadow>
              <cylinderGeometry args={[0.2, 0.24, 3.6, 16]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} material={white}>
              <boxGeometry args={[0.6, 0.2, 0.6]} />
            </mesh>
            <mesh position={[0, 3.65, 0]} material={flatMat("#d8b25a", 0.3, 0.9)}>
              <cylinderGeometry args={[0.36, 0.22, 0.3, 16]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 5.3, 0.2]} material={white} castShadow>
          <cylinderGeometry args={[0.6, 4.6, 1.2, 4, 1, false, Math.PI / 4]} />
        </mesh>
        <mesh position={[0, 4.75, 0.2]} material={flatMat("#d8b25a", 0.3, 0.9)}>
          <boxGeometry args={[6.8, 0.12, 3.2]} />
        </mesh>
        <mesh position={[0, 1.25, 0]} material={flatMat("#b8343a", 0.7)} castShadow>
          <boxGeometry args={[2.4, 0.3, 1.6]} />
        </mesh>
        {/* bolster cushion */}
        <mesh position={[0, 1.65, -0.75]} rotation={[0, 0, Math.PI / 2]} material={flatMat("#d8b25a", 0.4, 0.5)}>
          <cylinderGeometry args={[0.28, 0.28, 2.0, 16]} />
        </mesh>
      </group>
      {/* gold railing that keeps the ranks */}
      {[-2.2, 2.2].map((x) => (
        <group key={x} position={[x, 0, -2]}>
          <mesh position={[0, 0.85, 0]} material={flatMat("#d8b25a", 0.3, 0.9)}>
            <boxGeometry args={[0.08, 0.08, 12]} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[0, 0.42, -6 + i * 2]} material={flatMat("#d8b25a", 0.3, 0.9)}>
              <cylinderGeometry args={[0.04, 0.05, 0.85, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.01, -1]} rotation={[-Math.PI / 2, 0, 0]} material={rug} receiveShadow>
        <planeGeometry args={[3.6, 15]} />
      </mesh>
      {/* sun shafts through the front arches (cheap volumetric light) */}
      <SunShafts frame={frame} />
    </group>
  );
};

const SunShafts: React.FC<{ frame: number }> = ({ frame }) => {
  const tex = useMemo(() => glowTexture(), []);
  return (
    <group>
      {[-12.4, -8, -3.6, 0.8, 5.2, 9.6].map((x, i) => (
        <mesh key={i} position={[x + 3, 4.6, 4]} rotation={[0.62, 0.32, 0]}>
          <boxGeometry args={[2.2, 0.01, 18]} />
          <meshBasicMaterial map={tex} color="#ffdca0" transparent opacity={0.07 + 0.015 * Math.sin(frame * 0.02 + i)} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

const NOBLES = ["courtier", "official", "jaswant", "courtier", "fuladkhan", "official", "courtier", "official", "courtier", "jaswant", "official", "courtier"];

/** Ranks of nobles behind the railings, turned toward the aisle, with idle life and the occasional glance. */
const Nobles: React.FC<{ frame: number; glanceAt?: number }> = ({ frame, glanceAt = 9999 }) => (
  <>
    {NOBLES.map((c, i) => {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 4);
      const x = side * (3.2 + row * 1.25);
      const z = -6.5 + ((i >> 1) % 2) * 2.6 + row * 0.9;
      const g = ease((frame - glanceAt - i * 3) / 12) * (1 - ease((frame - glanceAt - 60 - i * 3) / 16));
      const pose = add(idle(frame, 50 + i, 0.6), HANDS_CLASPED, { x, z, heading: side > 0 ? -90 : 90, headTurn: (side > 0 ? 25 : -25) * g, spine: 4 });
      return <Character3D key={i} costume={c} pose={pose} frame={frame} seed={50 + i} lod={Math.abs(z) < 5 ? "hi" : "lo"} />;
    })}
  </>
);

const COURT_GRADE = { vignette: 0.5, grain: 0.05, tint: "rgba(255,190,110,0.12)", contrast: 1.06, saturate: 1.08 };

/** The emperor, seated, silent: beads moving, eyes never resting on Shivaji. */
function emperorPose(f: number, avert: number): Pose3 {
  return add(SIT_CROSS, idle(f, 7, 0.25), { x: 0, z: -10.4, y: 1.4, heading: 0, headTurn: -28 * avert + Math.sin(f / 70) * 3, head: 4, lookX: -0.9 * avert, wristL: Math.sin(f / 9) * 6 });
}

export const CourtHall3D: React.FC<Shot3DProps> = ({ frame: f, duration, cue, beat }) => {
  const sun = (
    <>
      <hemisphereLight args={["#ffe8c8", "#6a4a30", 0.75]} />
      <directionalLight position={[-14, 20, 22]} intensity={3.1} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-far={80} shadow-bias={-0.0004} />
      <pointLight position={[0, 4, -6]} intensity={6} distance={14} color="#ffcf98" />
    </>
  );

  if (beat === "presentation") {
    const presentAt = cue("presented", 22);
    const goldAt = cue("gold", 56);
    // Shivaji walks the last steps up the aisle, kneels and raises the tray of gold
    const w = walkPath(f, [[0.3, -2.2], [0.3, -6.9]], { speed: 0.8, start: 0, accel: 12 });
    const kneelT = ease((f - presentAt) / 22);
    const raiseT = ease((f - goldAt + 14) / 18);
    const shivaji = mix(add(w.pose, idle(f, 1, 0.3)), add(KNEEL, { x: 0.3, z: -6.9, heading: 180 }), kneelT);
    const shiv = add(shivaji, mix({}, OFFER, ease((f - presentAt + 6) / 16)), { shL: 8 * raiseT, shR: 8 * raiseT, head: -10 * kneelT, blink: 0 });
    const ram = add(walkPath(f, [[-1.1, -1.4], [-1.1, -5.4]], { speed: 0.8, start: 0, accel: 12 }).pose, idle(f, 3, 0.3), mix({}, BOW, ease((f - presentAt - 8) / 20)));
    const cam: CamKey[] = [
      { f: 0, pos: [1.6, 1.7, 1.4], target: [0, 1.6, -9], fov: 40 },
      { f: duration, pos: [1.2, 1.25, -3.2], target: [0, 2.5, -10], fov: 36 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#2a1d14" fog={{ color: "#3a2a1c", near: 22, far: 60 }} exposure={1.0} grade={COURT_GRADE}>
        {sun}
        <Hall frame={f} />
        <Nobles frame={f} />
        <Character3D costume="aurangzeb" pose={emperorPose(f, 0.4)} frame={f} seed={7} left="beads" />
        <Character3D costume="shivaji" pose={{ ...shiv, heading: 180 }} frame={f} seed={1} right="tray" />
        <Character3D costume="ramsingh" pose={{ ...ram, heading: 180 }} frame={f} seed={3} />
      </Stage3D>
    );
  }

  // beat "silence": the tray set down, Shivaji waits; the emperor never looks; the court notices
  const nothingAt = cue("nothing", 58);
  const wordAt = cue("word", 165);
  const settle = ease(f / 26);
  const standT = ease((f - 30) / 30);
  const pose = mix(add(KNEEL, OFFER), add(STAND, HANDS_CLASPED), standT);
  const tense = ease((f - wordAt + 30) / 40);
  const shiv = add(pose, idle(f, 1, 0.4), { x: 0.3, z: -6.9, heading: 180, head: -4 + 6 * standT, brow: -0.7 * tense, jaw: 0, lookY: 0.4 * standT, blink: f > nothingAt + 4 && f < nothingAt + 12 ? 1 : 0 });
  const cam: CamKey[] = [
    { f: 0, pos: [-2.6, 2.6, -4.6], target: [0, 2.2, -10.4], fov: 30 },
    { f: nothingAt + 30, pos: [-2.2, 2.45, -6.0], target: [0, 2.25, -10.4], fov: 24 },
    { f: wordAt - 10, pos: [-1.3, 1.75, -8.05], target: [0.3, 1.62, -6.9], fov: 30 },
    { f: duration, pos: [-0.85, 1.72, -8.0], target: [0.3, 1.62, -6.9], fov: 25 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#2a1d14" fog={{ color: "#3a2a1c", near: 22, far: 60 }} exposure={1.0} grade={COURT_GRADE}>
      {sun}
      <Hall frame={f} />
      <Nobles frame={f} glanceAt={nothingAt + 20} />
      <Character3D costume="aurangzeb" pose={emperorPose(f, 1 - 0.2 * settle)} frame={f} seed={7} left="beads" />
      <group position={[0.3, 0.02, -7.5]} scale={1}>
        <mesh material={flatMat("#d8b25a", 0.3, 0.95)} castShadow>
          <cylinderGeometry args={[0.17, 0.15, 0.025, 28]} />
        </mesh>
        <Glow position={[0, 0.1, 0]} size={0.5} color="#ffd890" opacity={0.25} />
      </group>
      <Character3D costume="shivaji" pose={shiv} frame={f} seed={1} />
      <Character3D costume="ramsingh" pose={add(STAND, HANDS_CLASPED, idle(f, 3, 0.5), { x: -1.1, z: -5.6, heading: 170, headTurn: 20 * tense, brow: 0.4 * tense })} frame={f} seed={3} />
    </Stage3D>
  );
};
