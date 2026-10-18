import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Layer, kf, prog, useShot, rand } from "../lib/anim";
import { Figure, idle, walkPose, walkBob, type Pose } from "../components/Figure";
import { Arcade, Basket, Bed, Glow, Jali, Lamp, Particles, archPath, Tent, W, H, Torch } from "../components/kit";

const Floor: React.FC<{ y: number; color: string; line?: string }> = ({ y, color, line = "rgba(0,0,0,0.12)" }) => (
  <g>
    <rect x={-800} y={y} width={W + 1600} height={H} fill={color} />
    {[...Array(14)].map((_, i) => <line key={i} x1={-800} y1={y + i * i * 6} x2={W + 800} y2={y + i * i * 6} stroke={line} strokeWidth={2} />)}
  </g>
);

/** Diwan-i-Khas style audience hall, used for several story beats. */
export const CourtHall: React.FC<{ beat: "presentation" | "silence" | "ranks" | "robes" | "walkout" | "mutes" | "accuse" }> = ({ beat }) => {
  const { frame } = useShot();
  const throneX = 960;
  const throneY = 520;
  const dim = beat === "silence" || beat === "mutes" ? 0.35 : 0;
  const nobles = (rows: number, startY: number, gapY: number, scale: number, highlight?: number) =>
    [...Array(rows)].flatMap((_, r) =>
      [...Array(9)].map((__, i) => {
        const left = i < 4;
        const xi = left ? 160 + i * 120 + r * 20 : 1280 + (i - 4) * 120 - r * 20;
        if (!left && i - 4 > 4) return null;
        const costume = (r + i) % 3 === 0 ? "official" : "courtier";
        const turnHead = beat === "walkout" ? kf(frame, [[20, 0], [50, left ? -18 : 18]]) : 0;
        return (
          <Figure key={`${r}-${i}`} costume={costume} pose={{ ...idle(frame, r * 10 + i), shR: 30, elR: 80, shL: 30, elL: 80, head: turnHead }} x={xi} y={startY + r * gapY} scale={scale} facing={left ? 1 : -1} opacity={highlight === r ? 1 : 1} />
        );
      }),
    );
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#2b2633" />
        <Arcade x={-200} y={640} w={2320} h={440} n={9} color={C.marble} inner="#3a3546" pillar={C.marbleShade} />
        <Glow id="hallGlow" x={960} y={300} r={900} color="#ffe8b8" intensity={0.25} />
      </Layer>
      <Layer depth={0.6}>
        <Floor y={640} color="#d8cdb6" />
        {/* throne platform */}
        <rect x={throneX - 220} y={throneY + 40} width={440} height={80} fill={C.marble} stroke={C.gold} strokeWidth={6} />
        <path d={`M${throneX - 160},${throneY + 40} L${throneX - 160},${throneY - 160} Q${throneX},${throneY - 260} ${throneX + 160},${throneY - 160} L${throneX + 160},${throneY + 40}Z`} fill="#a8842f" />
        <Figure costume="aurangzeb" pose={{ ...idle(frame), crouch: 0.7, hipR: 80, kneeR: 90, hipL: 76, kneeL: 90, shR: 30, elR: 60, head: beat === "silence" ? kf(frame, [[0, 0], [30, -14]]) : 0 }} x={throneX} y={throneY + 40} scale={0.78} facing={beat === "silence" ? -1 : 1} holding="beads" />
      </Layer>
      <Layer depth={0.9}>
        {beat !== "presentation" && beat !== "accuse" && nobles(2, 760, 110, 0.62)}
        {beat === "presentation" && (() => {
          const bowPhase = (frame % 28) / 28;
          const bow = frame < 84 ? Math.sin(bowPhase * Math.PI) * 40 : 0;
          return (
            <g>
              <Figure costume="ramsingh" pose={{ ...idle(frame, 2) }} x={700} y={820} scale={0.85} />
              <Figure costume="shivaji" pose={{ ...idle(frame), lean: bow, head: bow * 0.4, shR: 40 + bow, elR: 80 }} x={860} y={830} scale={0.88} />
              <Figure costume="sambhaji" pose={idle(frame, 5)} x={760} y={850} scale={0.8} />
              {frame > 60 && <g opacity={prog(frame, 60, 80)}><ellipse cx={980} cy={760} rx={70} ry={12} fill={C.goldDeep} />{[...Array(10)].map((_, i) => <circle key={i} cx={930 + i * 11} cy={752 - (i % 3) * 5} r={6} fill={C.gold} />)}</g>}
            </g>
          );
        })()}
        {beat === "silence" && <Figure costume="shivaji" pose={{ ...idle(frame), head: 4 }} x={860} y={830} scale={0.88} />}
        {beat === "ranks" && (
          <g>
            {[...Array(7)].map((_, i) => <Figure key={i} costume={i % 2 ? "official" : "courtier"} pose={{ ...idle(frame, i), shR: 30, elR: 80, shL: 30, elL: 80 }} x={640 + i * 110} y={900} scale={0.95} />)}
            <Figure costume="shivaji" pose={{ ...idle(frame), head: kf(frame, [[0, 0], [40, -10], [80, 4]]), brow: -0.6 }} x={960} y={1020} scale={1.05} />
          </g>
        )}
        {beat === "robes" && (
          <g>
            <Figure costume="jaswant" pose={{ ...idle(frame), lean: kf(frame, [[30, 0], [55, 24], [80, 0]]), shR: kf(frame, [[30, 0], [55, 60]]), elR: 40 }} x={1250} y={860} scale={0.95} facing={-1} />
            <Figure costume="official" pose={{ ...walkPose(frame / 26), shR: 120, elR: 40 }} x={kf(frame, [[0, 600], [45, 1080]])} y={860 + walkBob(frame / 26)} scale={0.95} holding="robe" />
            <Figure costume="shivaji" pose={{ ...idle(frame), brow: -0.8, head: 6 }} x={300} y={940} scale={0.9} />
          </g>
        )}
        {beat === "walkout" && (
          <Figure costume="shivaji" pose={frame > 15 ? { ...walkPose(frame / 22), brow: -1 } : { ...idle(frame), brow: -1 }} x={kf(frame, [[0, 960], [15, 960], [120, 300]])} y={900 + (frame > 15 ? walkBob(frame / 22) : 0)} scale={1} facing={-1} />
        )}
        {beat === "accuse" && (
          <g>
            <Figure costume="fuladkhan" pose={{ ...idle(frame), lean: kf(frame, [[0, 0], [25, 26], [50, 10]]), shR: kf(frame, [[40, 0], [65, 95]]), elR: 0, head: 10 }} x={820} y={860} scale={0.95} />
            <Figure costume="ramsingh" pose={{ ...idle(frame, 4), brow: -0.3 }} x={1350} y={880} scale={0.95} facing={-1} />
          </g>
        )}
      </Layer>
      {dim > 0 && (
        <Layer depth={0}>
          <rect x={-800} y={-800} width={W + 1600} height={H + 1600} fill="#000" opacity={prog(frame, 0, 30) * dim} />
        </Layer>
      )}
    </AbsoluteFill>
  );
};

export const TwoShot: React.FC<{ left: string; right: string; mood: "anger" }> = ({ left, right }) => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#312a38" />
        <Arcade x={-300} y={760} w={2520} h={600} n={6} color="#d9cfba" inner="#2a2532" pillar="#bfb39a" />
      </Layer>
      <Layer depth={1}>
        <Figure costume={left as any} pose={{ ...idle(frame, 2), shR: kf(frame, [[20, 0], [45, 60]]), elR: 30, brow: 0.6, mouth: 0.2 }} x={720} y={1150} scale={2.0} />
        <Figure costume={right as any} pose={{ ...idle(frame), brow: kf(frame, [[0, 0], [20, -1]]), mouth: Math.max(0, Math.sin(frame / 4)) * 0.6 * (frame < 90 ? 1 : 0), shR: kf(frame, [[0, -4], [30, 20]]), elR: 30, lean: -4 }} x={1240} y={1150} scale={2.05} facing={-1} />
      </Layer>
    </AbsoluteFill>
  );
};

export const RobeRefusal: React.FC = () => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#2c2731" />
        <path d={archPath(1350, 980, 620, 760)} fill="#4a4152" />
      </Layer>
      <Layer depth={1}>
        <Floor y={900} color="#cfc3aa" />
        {[0, 1, 2].map((i) => (
          <Figure key={i} costume="official" pose={{ ...idle(frame, i), lean: 14, shR: i === 0 ? kf(frame, [[0, 30], [30, 90]]) : 20, elR: 30 }} x={520 + i * 150} y={980} scale={1.0} holding={i === 0 ? "robe" : "none"} />
        ))}
        <Figure costume="shivaji" pose={{ ...idle(frame), crouch: 0.7, hipR: 80, kneeR: 90, hipL: 76, kneeL: 90, shR: kf(frame, [[20, 20], [40, 110]]), elR: kf(frame, [[20, 40], [40, 60]]), head: kf(frame, [[30, 0], [50, -18]]), brow: -0.6 }} x={1350} y={980} scale={1.05} facing={-1} />
      </Layer>
    </AbsoluteFill>
  );
};

export const CourtIntrigue: React.FC<{ mood?: "smug" | "rumour" }> = ({ mood }) => {
  const { frame } = useShot();
  const lampX = 960;
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#16121c" />
        <rect x={1250} y={180} width={460} height={600} fill="#e8b56a" opacity={0.55} />
        <Jali x={1250} y={180} w={460} h={600} id="jaliIntrigue" color="#cfc4ad" />
        {!mood && <Figure costume={{ skin: "#000", jama: "#000", trim: "#000", pants: "#000", turban: "veil", turbanColor: "#000", skirt: "long" }} pose={idle(frame)} x={1480} y={760} scale={1.2} silhouette="#0d0b10" opacity={0.85} facing={-1} />}
      </Layer>
      <Layer depth={0.8}>
        <Floor y={820} color="#2d2630" line="rgba(255,255,255,0.05)" />
        <Lamp x={lampX} y={800} s={1.6} seed="intrigue" glowR={420} />
        {mood === "rumour" ? (
          <g>
            <Figure costume="spy" pose={{ ...idle(frame), lean: 22, head: 14, shR: 90, elR: 60 }} x={760} y={900} scale={1.05} />
            <Figure costume="official" pose={{ ...idle(frame, 3), head: -6, brow: 0.6 }} x={980} y={900} scale={1.05} facing={-1} />
          </g>
        ) : mood === "smug" ? (
          <g>
            {[0, 1, 2].map((i) => <Figure key={i} costume={i === 1 ? "official" : "courtier"} pose={{ ...idle(frame, i), head: Math.sin(frame / 9 + i) * 8, shR: i === 2 ? kf(frame, [[20, 0], [40, 50], [60, 10]]) : 20, elR: 60 }} x={600 + i * 220} y={920} scale={1.05} facing={i === 2 ? -1 : 1} />)}
          </g>
        ) : (
          <g>
            <Figure costume="jaswant" pose={{ ...idle(frame), lean: 16, head: 10, shR: 60, elR: 40 }} x={640} y={920} scale={1.05} />
            <Figure costume="official" pose={{ ...idle(frame, 2), lean: 18, head: 12, shR: 50, elR: 60 }} x={430} y={930} scale={1.05} />
            <Figure costume="aurangzeb" pose={{ ...idle(frame, 6), head: kf(frame, [[20, 0], [60, -6]]) }} x={1000} y={930} scale={1.05} facing={-1} holding="beads" />
          </g>
        )}
      </Layer>
    </AbsoluteFill>
  );
};

type Gesture = "pledge" | "calm" | "plead" | "reading" | "writing" | undefined;
const gesturePose = (g: Gesture, frame: number): Pose => {
  switch (g) {
    case "pledge":
      return { shR: kf(frame, [[10, -4], [35, 150]]), elR: kf(frame, [[10, 12], [35, 20]]), head: -4 };
    case "plead":
      return { shR: kf(frame, [[0, 30], [25, 70]]), elR: 90, lean: 8, brow: 0.7, mouth: Math.max(0, Math.sin(frame / 4)) * 0.5 };
    case "reading":
      return { shR: 60, elR: 70, head: kf(frame, [[0, 14], [70, 14], [90, 2]]), brow: kf(frame, [[40, 0], [70, 0.8]]) };
    case "writing":
      return { shR: 55, elR: 60 + Math.sin(frame / 3) * 6, head: 18, lean: 14 };
    default:
      return {};
  }
};

export const Portrait: React.FC<{ character: string; setting?: "throne" | "camp" | "court" | "tent" | "palace" | "study"; gesture?: Gesture }> = ({ character, setting = "court", gesture }) => {
  const { frame } = useShot();
  const bg: Record<string, React.ReactNode> = {
    throne: (
      <g>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#2b2633" />
        <Arcade x={-300} y={820} w={2520} h={620} n={5} color={C.marble} inner="#3a3546" />
        <Glow id="pt-throne" x={1150} y={500} r={700} color="#ffe2a8" intensity={0.3} />
      </g>
    ),
    camp: (
      <g>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#c9b38a" />
        <rect x={-800} y={-400} width={W + 1600} height={760} fill="#9cc3d9" />
        <Tent x={300} y={740} w={420} h={260} color="#e2d6b8" stripe={C.mughalGreen} />
        <Tent x={1600} y={760} w={380} h={240} color="#d9cba8" stripe={C.mughalGreen} />
      </g>
    ),
    court: (
      <g>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#cdbfa2" />
        <Arcade x={-300} y={860} w={2520} h={640} n={6} color={C.sandstone} inner="#5a2a20" pillar={C.sandstoneLight} />
      </g>
    ),
    tent: (
      <g>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#3a2a22" />
        <Glow id="pt-tent" x={600} y={600} r={800} color="#ffcf8a" intensity={0.35} />
      </g>
    ),
    palace: (
      <g>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#241d2a" />
        <rect x={1200} y={120} width={520} height={700} fill="#e8b56a" opacity={0.4} />
        <Jali x={1200} y={120} w={520} h={700} id="pt-jali" color="#cfc4ad" />
        <Glow id="pt-pal" x={700} y={600} r={700} color="#ffcf8a" intensity={0.3} />
      </g>
    ),
    study: (
      <g>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#2c2620" />
        {[...Array(5)].map((_, i) => <rect key={i} x={1250} y={160 + i * 130} width={520} height={18} fill="#5a4630" />)}
        {[...Array(30)].map((_, i) => <rect key={i} x={1260 + (i % 10) * 50} y={100 + Math.floor(i / 10) * 130} width={34} height={60} fill={["#7a3a2a", "#3a5a6a", "#6a5a2a"][i % 3]} />)}
        <Glow id="pt-study" x={700} y={620} r={700} color="#ffd9a0" intensity={0.35} />
      </g>
    ),
  };
  const costume = character === "historian" ? "scholar" : character;
  const holding = character === "aurangzeb" ? "beads" : gesture === "reading" ? "letter" : gesture === "writing" ? "quill" : "none";
  const seated = character === "aurangzeb" || character === "aurangzeb_old" || character === "historian";
  const pose: Pose = { ...idle(frame), ...(seated ? { crouch: 0.7, hipR: 80, kneeR: 90, hipL: 76, kneeL: 90 } : {}), ...gesturePose(gesture, frame), ...(character === "aurangzeb" ? { head: kf(frame, [[0, 10], [40, 0]]), shR: 40, elR: 70 } : {}), ...(character === "aurangzeb_old" ? { head: 16, lean: 12, shR: 55, elR: 60 + Math.sin(frame / 3) * 6 } : {}), ...(character === "historian" ? { head: 16, lean: 10, shR: 55, elR: 60 + Math.sin(frame / 3) * 6 } : {}), ...(character === "jaisingh" ? { shR: kf(frame, [[10, -4], [40, 70]]), elR: kf(frame, [[10, 12], [40, 130]]), shL: kf(frame, [[10, 6], [40, 70]]), elL: kf(frame, [[10, 10], [40, 120]]) } : {}) };
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>{bg[setting]}</Layer>
      <Layer depth={1}>
        {seated && <rect x={900} y={880} width={600} height={60} rx={10} fill={setting === "throne" ? C.gold : "#5a3a24"} />}
        {(character === "historian" || character === "aurangzeb_old") && (
          <g>
            <rect x={1300} y={700} width={420} height={30} fill="#6b4524" />
            <rect x={1360} y={660} width={160} height={40} fill={C.parchment} />
            {character === "historian" && <line x1={1370} y1={680} x2={kf(frame, [[30, 1370], [70, 1510]])} y2={680} stroke="#a02020" strokeWidth={5} />}
            <Lamp x={1650} y={700} seed="pt-lamp" />
          </g>
        )}
        <Figure costume={costume as any} pose={pose} x={seated ? 1180 : 1180} y={seated ? 930 : 1120} scale={seated ? 1.5 : 1.9} holding={holding as any} facing={character === "aurangzeb" ? -1 : 1} />
      </Layer>
    </AbsoluteFill>
  );
};

export const TentTalk: React.FC<{ left: string; right: string | null; mood: "persuade" | "oath" | "writing" }> = ({ left, right, mood }) => {
  const { frame } = useShot();
  const leftPose: Pose =
    mood === "persuade"
      ? { ...idle(frame), lean: 10, shR: 40 + Math.sin(frame / 10) * 30, elR: 50 + Math.sin(frame / 10) * 20, mouth: Math.max(0, Math.sin(frame / 4)) * 0.5 }
      : mood === "oath"
        ? { ...idle(frame), shR: kf(frame, [[0, 20], [25, 70]]), elR: kf(frame, [[0, 30], [25, 120]]), head: 6 }
        : { ...idle(frame), crouch: 0.7, hipR: 80, kneeR: 90, hipL: 76, kneeL: 90, lean: 18, head: 16, shR: 55, elR: 60 + Math.sin(frame / 3) * 6 };
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#4a3426" />
        <path d={`M-400,-100 L${W / 2},-260 L${W + 400},-100 L${W + 400},${H} L-400,${H}Z`} fill="#6a4a32" />
        {[...Array(9)].map((_, i) => <line key={i} x1={W / 2} y1={-260} x2={-400 + i * 340} y2={H} stroke="#5a3d28" strokeWidth={6} />)}
      </Layer>
      <Layer depth={0.8}>
        <Floor y={880} color="#7a5a3a" />
        <rect x={760} y={800} width={360} height={30} fill="#5a3a22" />
        <Lamp x={940} y={800} s={1.4} seed="tent" glowR={520} />
        {mood === "writing" && <rect x={520} y={770} width={120} height={30} fill={C.parchment} />}
      </Layer>
      <Layer depth={1}>
        <Figure costume={left as any} pose={leftPose} x={mood === "writing" ? 420 : 690} y={mood === "writing" ? 960 : 1180} scale={mood === "writing" ? 1.6 : 2.0} holding={mood === "writing" ? "quill" : "none"} />
        {right && <Figure costume={right as any} pose={{ ...idle(frame, 4), shR: 60, elR: 110, shL: 60, elL: 110, head: mood === "persuade" ? kf(frame, [[60, 0], [100, 14]]) : 0, brow: mood === "oath" ? 0.4 : -0.2 }} x={1230} y={1180} scale={2.0} facing={-1} />}
      </Layer>
    </AbsoluteFill>
  );
};

/** Lamplit jali window with silhouettes inside. */
export const WindowSilhouette: React.FC<{ figures: string[]; time?: string; bars?: boolean }> = ({ figures, bars }) => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0.2}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#2a1e1a" />
        {[...Array(20)].map((_, i) => <rect key={i} x={-800 + (i % 10) * 380} y={-200 + Math.floor(i / 10) * 700} width={360} height={170} fill="#33241f" />)}
      </Layer>
      <Layer depth={0.6}>
        <path d={archPath(960, 900, 760, 720)} fill="#ffcf7a" />
        <Glow id="win" x={960} y={560} r={520} color="#ffbe6a" intensity={0.5 + Math.sin(frame / 7) * 0.05} />
        {figures.includes("shivaji") && <Figure costume="shivaji" pose={{ ...idle(frame), shR: figures.length > 1 ? 70 : -4, elR: 30, head: 8 }} x={figures.length > 1 ? 880 : 960} y={980} scale={1.35} silhouette="#1a0e08" />}
        {figures.includes("sambhaji") && <Figure costume="sambhaji" pose={{ ...idle(frame, 3), head: -6 }} x={1080} y={980} scale={1.35} silhouette="#1a0e08" facing={-1} />}
      </Layer>
      <Layer depth={0.75}>
        <Jali x={580} y={180} w={760} h={720} id={bars ? "winBars" : "winJali"} color="#4a3228" hole={bars ? 9 : 13} />
      </Layer>
      <Layer depth={1}>
        <path d={`M-800,-400 L${W + 800},-400 L${W + 800},${H + 400} L-800,${H + 400}Z ${archPath(960, 900, 760, 720)}`} fill="#3a2a22" fillRule="evenodd" />
      </Layer>
    </AbsoluteFill>
  );
};

export const EmptyBed: React.FC<{ time?: "dawn" | "morning"; guardReacts?: boolean }> = ({ guardReacts }) => {
  const { frame } = useShot();
  const pull = prog(frame, 15, 40);
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#5a4436" />
        <path d={archPath(1500, 640, 260, 360)} fill="#ffd9a8" />
        <path d={`M1380,640 L1060,${H} L1820,${H} L1620,640Z`} fill="#ffe2b8" opacity={0.18} />
      </Layer>
      <Layer depth={0.8}>
        <Floor y={760} color="#8a6a52" />
        <Bed x={820} y={760} w={620} empty={false} />
        <path d={`M${560 - pull * 260},${716 - pull * 30} q190,-18 330,0 l14,28 l-344,6z`} fill="#7d2f3a" />
        <Particles count={40} color="#fff2cc" area={[1050, 300, 600, 600]} rise={0.12} />
      </Layer>
      <Layer depth={1}>
        {guardReacts && <Figure costume="guard" pose={{ ...idle(frame), shR: kf(frame, [[10, 60], [40, 60], [50, 150]]), elR: kf(frame, [[40, 30], [50, 20]]), shL: kf(frame, [[40, 6], [50, 140]]), lean: kf(frame, [[0, 18], [40, 18], [55, -10]]), brow: kf(frame, [[40, 0], [50, 1]]), mouth: kf(frame, [[40, 0], [50, 1]]) }} x={kf(frame, [[40, 380], [70, 300]])} y={980} scale={1.2} />}
      </Layer>
    </AbsoluteFill>
  );
};

export const Bedroom: React.FC<{ beat: "watched" | "illness" | "decoy" }> = ({ beat }) => {
  const { frame } = useShot();
  const night = beat !== "illness";
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill={night ? "#1e1824" : "#4a3428"} />
        <path d={archPath(1450, 600, 240, 330)} fill={night ? "#2f3b55" : "#ffcf8a"} opacity={0.8} />
        {night && <path d={`M1340,600 L1000,${H} L1800,${H} L1560,600Z`} fill="#9ab0d0" opacity={0.08} />}
      </Layer>
      <Layer depth={0.8}>
        <Floor y={760} color={night ? "#2c2430" : "#6a4e3c"} />
        <Lamp x={330} y={760} s={1.3} seed="bedlamp" glowR={night ? 360 : 520} />
        <Bed x={860} y={760} w={640} />
        {/* reclining figure: feet at the foot of the bed, head on the pillow */}
        <g transform="translate(1110 724) rotate(-90)">
          <Figure costume={beat === "decoy" ? "hiroji" : "shivaji"} pose={{ ...idle(frame), blink: beat === "decoy" ? 1 : beat === "illness" ? 1 : idle(frame).blink, shR: beat === "decoy" ? -28 : 0, elR: 0 }} x={0} y={0} scale={0.9} />
        </g>
        {/* quilt */}
        <path d={`M760,${712 - (beat === "decoy" ? kf(frame, [[0, -40], [40, 0]]) : 0)} q170,-22 420,-6 l10,30 l-430,10z`} fill="#7d2f3a" />
        {beat === "illness" && <rect x={826} y={604} width={54} height={18} rx={6} fill="#f2ead8" transform="rotate(-80 853 613)" />}
        {beat === "illness" &&
          [0, 1, 2].map((i) => <Basket key={i} x={1250 + i * 150} y={880} s={0.8} lidOpen={1} />)}
        {beat === "illness" && <Figure costume="boy" pose={{ ...idle(frame), lean: 30, shR: 90 + Math.sin(frame / 8) * 30, elR: 40 }} x={1180} y={900} scale={1.1} />}
        {beat === "decoy" && <Figure costume="boy" pose={{ ...idle(frame), crouch: 0.8, hipR: 90, kneeR: 120, hipL: 80, kneeL: 120, shR: 70 + Math.sin(frame / 6) * 18, elR: 40 + Math.sin(frame / 6) * 12 }} x={1240} y={900} scale={1.05} facing={-1} />}
      </Layer>
      <Layer depth={1}>
        {beat === "watched" && [0, 1].map((i) => <Figure key={i} costume="rajputguard" pose={idle(frame, i * 5)} x={130 + i * 1680} y={1060} scale={1.4} silhouette="#0e0b12" facing={i ? -1 : 1} />)}
      </Layer>
    </AbsoluteFill>
  );
};

export const BasketCutaway: React.FC = () => {
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#1b1720" />
        <Glow id="cut" x={960} y={560} r={700} color="#ffcf8a" intensity={0.25} />
      </Layer>
      <Layer depth={1}>
        <Basket x={760} y={900} s={3.1} cutaway hidden="shivaji" />
        <Basket x={1330} y={900} s={2.4} cutaway hidden="sambhaji" />
      </Layer>
      <div style={{ position: "absolute", right: 90, top: 80, fontFamily: "'Source Sans 3', sans-serif", fontSize: 30, color: "#e8dcc4", fontStyle: "italic", opacity: 0.85 }}>Reconstruction</div>
    </AbsoluteFill>
  );
};

export const Interrogation: React.FC = () => {
  const { frame, duration } = useShot();
  const tear = prog(frame, duration * 0.6, duration * 0.8);
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#2a2024" />
        <Torch x={960} y={420} s={1.8} seed="int" />
      </Layer>
      <Layer depth={1}>
        <Floor y={860} color="#3a2e30" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <Figure costume="rajputguard" pose={{ ...idle(frame, i), head: 16, lean: 10, shR: 20, shL: 30 }} x={420 + i * 260} y={980} scale={1.1} silhouette="#120d10" />
            <Figure costume="guard" pose={{ ...idle(frame, i + 5), shR: 70, elR: 20 }} x={300 + i * 260} y={980} scale={1.1} silhouette="#0a0709" />
          </g>
        ))}
        <g transform="translate(1400 560)">
          <g transform={`translate(${-tear * 40} ${tear * 30}) rotate(${-tear * 12})`}>
            <path d="M-120,-160 L0,-160 L-10,40 L0,180 L-120,180Z" fill={C.parchment} />
          </g>
          <g transform={`translate(${tear * 40} ${tear * 30}) rotate(${tear * 12})`}>
            <path d="M0,-160 L120,-160 L120,180 L0,180 L-10,40Z" fill={C.parchment} />
          </g>
          {[...Array(8)].map((_, i) => <line key={i} x1={-96 + (tear * -40)} y1={-120 + i * 36} x2={96 + tear * 40} y2={-120 + i * 36} stroke={C.ink} strokeWidth={4} opacity={0.6} strokeDasharray="12 8" />)}
        </g>
      </Layer>
    </AbsoluteFill>
  );
};

export const ArchiveRoom: React.FC = () => {
  const { frame } = useShot();
  const open = prog(frame, 20, 70);
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-400} width={W + 1600} height={H + 800} fill="#2a231c" />
        {[...Array(6)].map((_, r) =>
          [...Array(14)].map((__, c) => <rect key={`${r}-${c}`} x={-300 + c * 190} y={60 + r * 150} width={150} height={110} fill={["#5a4630", "#4a3a26", "#6a5236"][(r + c) % 3]} />),
        )}
        <path d="M1300,-200 L700,1100 L1300,1100 L1700,-200Z" fill="#fff4d0" opacity={0.08} />
      </Layer>
      <Layer depth={1}>
        <rect x={-800} y={820} width={W + 1600} height={500} fill="#3a2e22" />
        <rect x={560} y={780} width={800} height={60} fill="#6b4524" />
        <path d={`M760,780 Q960,${720 - open * 30} 1160,780Z`} fill="#b94a3a" />
        {[...Array(5)].map((_, i) => (
          <rect key={i} x={760 + i * 70 + open * (i - 2) * 50} y={700 - open * (60 + i * 8)} width={110} height={70} rx={4} fill={C.parchment} stroke={C.parchmentDark} strokeWidth={3} transform={`rotate(${(i - 2) * open * 8} ${815 + i * 70} 735)`} />
        ))}
        <Particles count={60} color="#fff4d0" area={[700, 100, 700, 800]} rise={0.1} size={2} />
      </Layer>
    </AbsoluteFill>
  );
};

// Silence an unused-import lint for helpers kept available to set authors.
void [Tent, rand];
