import React from "react";
import { Stage3D, type CamKey } from "../engine/Stage3D";
import { Character3D, type Pose3 } from "../character/Character3D";
import { add, ease, idle, mix } from "../motion/motion";
import { ARMS_FOLDED, HANDS_CLASPED, SIT_CROSS, STAND } from "../motion/poses";
import { ArchedPanel, Ground, flatMat, plasterMat, stoneMat, SANDSTONE } from "./architecture";
import { Cushion, Flag, LowDesk, OilLamp, Room, TentExterior, TentInterior } from "./kit2";
import { COURT_GRADE, Hall } from "./court";
import type { Shot3DProps } from "./night";

/**
 * Character portraits: medium close-ups with one clear gesture, in the character's setting.
 * The camera pushes in slowly; gestures land on the narration where a cue word exists.
 */
const WARM = { vignette: 0.6, grain: 0.06, tint: "rgba(255,150,70,0.12)" };

const SettingDay: React.FC<{ kind: string; frame: number }> = ({ kind, frame }) => {
  if (kind === "throne") return <Hall frame={frame} />;
  if (kind === "camp")
    return (
      <>
        <Ground size={200} color="#8a7050" />
        {Array.from({ length: 14 }, (_, i) => (
          <TentExterior key={i} position={[-16 + (i % 7) * 5.5, 0, -8 - Math.floor(i / 7) * 7]} color={i % 4 ? "#e0d2b0" : "#3f6b4f"} rotationY={i} />
        ))}
        <Flag frame={frame} color="#3f6b4f" position={[-3, 0, -5]} pole={5} size={[2.2, 1.3]} seed={2} swallow={false} />
        <Flag frame={frame} color="#c8442a" position={[4, 0, -6]} pole={5} size={[2.2, 1.3]} seed={3} swallow={false} />
      </>
    );
  // court courtyard / palace interior
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={stoneMat("#c9b48a", [8, 8])} receiveShadow>
        <planeGeometry args={[40, 40]} />
      </mesh>
      <ArchedPanel width={20} height={8} depth={0.8} arches={5} archW={2.8} archSpring={3.2} archH={5.4} position={[0, 0, -4]} material={stoneMat(SANDSTONE, [5, 2])} />
      <mesh position={[0, 4, -4.6]} material={plasterMat("#d9c7a6", [5, 2])}>
        <boxGeometry args={[20, 8, 0.2]} />
      </mesh>
    </>
  );
};

export const Portrait3D: React.FC<Shot3DProps> = ({ frame: f, duration, character, setting, gesture }) => {
  const c = String(character);
  const set = String(setting);
  const g = String(gesture ?? "");
  const t = f / Math.max(1, duration);
  const gestureAt = 0.25;
  const k = ease((t - gestureAt) / 0.18);
  const talk = (a: number, b: number) => (t > a && t < b ? Math.abs(Math.sin(f * 0.5)) * 0.5 : 0);

  // ---- interiors with lamplight: Shivaji in his tent, the old emperor writing, the historian's study
  if (set === "tent" || (set === "camp" && c === "aurangzeb_old") || set === "study") {
    const writing = c === "aurangzeb_old" || c === "historian";
    const scribble = writing ? Math.sin(f / 4) * 6 : 0;
    const sit: Pose3 = add(SIT_CROSS, idle(f, 3, 0.3), { x: 0, z: 0, heading: 0 });
    const pose: Pose3 =
      c === "shivaji"
        ? add(sit, { shL: 10, shR: 10, elL: 60, elR: 60, head: 2, lookX: 0, blink: (f % 140) < 6 ? 1 : 0, brow: -0.1 })
        : add(sit, { spine: 14, head: 10, shR: 52 + scribble * 0.3, elR: 75 + scribble, shL: 30, elL: 70, shLAbd: -10, brow: c === "historian" ? -0.3 * k : 0.2 });
    const cam: CamKey[] = [
      { f: 0, pos: [0.3, 1.25, 2.6], target: [0, 0.95, 0], fov: 32 },
      { f: duration, pos: [0.15, 1.15, 1.75], target: [0, 0.95, 0], fov: 28 },
    ];
    return (
      <Stage3D cam={cam} camEase="smooth" background="#120c08" fog={{ color: "#120c08", near: 5, far: 18 }} exposure={1.3} grade={WARM}>
        <hemisphereLight args={["#3a3550", "#20140a", 0.4]} />
        {set === "study" ? <Room w={6} d={5} h={3.2} wall="#7a6a58" floor="#5a4a3a" /> : <TentInterior frame={f} color={c === "shivaji" ? "#c9b48a" : "#b8a888"} />}
        {set === "study" &&
          Array.from({ length: 24 }, (_, i) => (
            <mesh key={i} position={[-2.5 + (i % 12) * 0.42, 1.2 + Math.floor(i / 12) * 0.5, -2.2]} material={flatMat(["#6a2a2a", "#2a4a3a", "#5a4a2a", "#3a3a5a"][i % 4], 0.8)}>
              <boxGeometry args={[0.32, 0.42, 0.25]} />
            </mesh>
          ))}
        <Cushion position={[0, 0, -0.35]} color={c === "shivaji" ? "#8a2a2a" : "#2a4a6a"} />
        {writing && <LowDesk position={[0, 0, 0.62]} />}
        <OilLamp frame={f} position={[0.9, 0, 0.3]} intensity={16} shadows stand={writing ? 0.38 : 1.1} />
        <Character3D costume={c === "historian" ? "scholar" : c} pose={pose} frame={f} seed={3} right={writing ? "quill" : "none"} />
      </Stage3D>
    );
  }

  // ---- daylight portraits
  let pose: Pose3 = add(STAND, idle(f, 5, 0.5), { x: 0, z: 0, heading: 0 });
  let props: { right?: "beads" | "letter" | "none"; left?: "beads" | "letter" | "none" } = {};
  if (c === "aurangzeb") {
    // in profile on the throne: lowers his prayer beads and looks up
    pose = add(SIT_CROSS, idle(f, 7, 0.25), { x: 0, z: -10.4, y: 1.4, heading: 0, shL: 30 - 20 * k, elL: 80 - 40 * k, head: 8 - 14 * k, lookY: 0.6 * k });
    props = { left: "beads" };
  } else if (c === "jaisingh") {
    pose = add(pose, mix(HANDS_CLASPED, ARMS_FOLDED, k), { head: -3 * k, brow: -0.2 });
  } else if (c === "ramsingh" && g === "pledge") {
    pose = add(pose, { shR: 150 * k, shRAbd: -10, elR: 35 * k, wristR: -20, head: -4, brow: 0.2 });
  } else if (c === "ramsingh" && g === "plead") {
    pose = add(pose, { shR: 45, shRAbd: -40, elR: 105, wristR: 10, shL: 30 + 20 * Math.sin(f / 20), elL: 40, spine: 6, brow: 0.8, jaw: talk(0.1, 0.9) });
  } else if (c === "ramsingh" && g === "reading") {
    // reads the letter, then lowers it slowly
    const lower = ease((t - 0.45) / 0.35);
    pose = add(pose, { shL: 55 - 35 * lower, shR: 55 - 35 * lower, elL: 75 - 40 * lower, elR: 75 - 40 * lower, shLAbd: -15, shRAbd: -15, head: 18 - 14 * lower, brow: 0.6 * lower, blink: lower > 0.95 ? 0.4 : 0 });
    props = { right: "letter" };
  }
  const throne = set === "throne";
  const cam: CamKey[] = throne
    ? [
        { f: 0, pos: [3.4, 2.5, -9.6], target: [0, 2.2, -10.4], fov: 30 },
        { f: duration, pos: [2.6, 2.45, -9.9], target: [0, 2.25, -10.4], fov: 26 },
      ]
    : [
        { f: 0, pos: [0.4, 1.6, 2.6], target: [0, 1.5, 0], fov: 32 },
        { f: duration, pos: [0.2, 1.6, 1.85], target: [0, 1.55, 0], fov: 28 },
      ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#2a1d14" fog={{ color: set === "camp" ? "#cdb08a" : "#3a2a1c", near: 12, far: 70 }} exposure={1.0} grade={COURT_GRADE}>
      <hemisphereLight args={["#ffe8c8", "#6a4a30", 0.8]} />
      <directionalLight position={[-8, 12, 10]} intensity={3} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
      <directionalLight position={[6, 4, -6]} intensity={1.0} color="#ffb070" />
      <SettingDay kind={set} frame={f} />
      <Character3D costume={c} pose={pose} frame={f} seed={5} right={props.right ?? "none"} left={props.left ?? "none"} />
    </Stage3D>
  );
};
