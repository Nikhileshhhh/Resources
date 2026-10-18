import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_BODY, FONT_TITLE } from "../theme";
import { Layer, kf, prog, rand, useShot, easeOut } from "../lib/anim";
import { Figure, idle, walkBob, walkPose, type Pose } from "../components/Figure";
import {
  Basket, BasketPair, Boat, Cannon, Clouds, Dome, Elephant, Flag, Gate, Glow, Hills, HillFort, Horse, Moon, Particles, Rain, River, Sky, Stars, Sun, Tent, Torch, Wall, W, H, type TimeOfDay, Lamp,
} from "../components/kit";

const ground = (time: TimeOfDay) => (time === "night" ? "#1d1a22" : time === "dusk" ? "#4a3b3a" : time === "dawn" ? "#6a5a50" : "#b49a72");

/** Skyline of domes and minarets for distant Agra. */
const Skyline: React.FC<{ y: number; color: string }> = ({ y, color }) => (
  <g fill={color}>
    {[...Array(14)].map((_, i) => {
      const x = -300 + i * 190 + rand(i) * 60;
      const h = 60 + rand(i * 3) * 90;
      return (
        <g key={i}>
          <rect x={x} y={y - h} width={110} height={h + 400} />
          {rand(i * 7) > 0.4 && <path d={`M${x + 15},${y - h} Q${x + 55},${y - h - 90} ${x + 95},${y - h}Z`} />}
          {rand(i * 5) > 0.6 && <rect x={x + 120} y={y - h - 110} width={12} height={h + 110} />}
        </g>
      );
    })}
  </g>
);

export const FortExterior: React.FC<{ time?: TimeOfDay; patrol?: boolean; procession?: boolean }> = ({ time = "night", patrol, procession }) => {
  const { frame } = useShot();
  const night = time === "night";
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time={time} id={`sky-fort-${time}`} />
        {night ? <Stars /> : <Sun x={1500} y={170} r={60} color="#fff2c6" />}
        {night && <Moon x={1540} y={170} />}
        <Clouds y={120} color={night ? "#2a3550" : "#ffffff"} opacity={night ? 0.5 : 0.6} />
      </Layer>
      <Layer depth={0.35}>
        <Skyline y={560} color={night ? "#1a2236" : "#c9b9a0"} />
      </Layer>
      <Layer depth={0.8}>
        <Wall x={-500} y={430} w={2900} h={420} color={night ? "#5b2a22" : C.sandstone} dark={night ? "#3a1a15" : C.sandstoneDark} />
        {[-260, 300, 1650, 2200].map((tx, i) => (
          <g key={i}>
            <rect x={tx} y={330} width={160} height={520} fill={night ? "#652f26" : C.sandstoneLight} />
            <Dome x={tx + 80} y={330} r={58} color={night ? "#8a8578" : C.marble} />
          </g>
        ))}
        <Gate x={960} y={850} w={240} h={330} color={night ? "#5b2a22" : C.sandstone} tower={night ? "#6a3228" : C.sandstoneLight} dome={night ? "#8a8578" : C.marble} />
        {night && [420, 760, 1160, 1500].map((tx, i) => <Torch key={i} x={tx} y={430} seed={`ft${i}`} s={1.2} />)}
        {patrol &&
          [0, 1, 2].map((i) => {
            const ph = frame / 30 + i * 0.37;
            const x = -200 + ((frame * 1.6 + i * 260) % 2400);
            return <Figure key={i} costume="guard" pose={{ ...walkPose(ph, 0.8), shR: 150, elR: 10 }} x={x} y={430 + walkBob(ph)} scale={0.42} holding="torch" />;
          })}
      </Layer>
      {night ? (
        <Layer depth={1.15}>
          <River y={880} h={260} color="#0f1f2c" light="#4a6a80" speed={0.6} />
          <ellipse cx={1540} cy={960} rx={40} ry={140} fill="#f6efd6" opacity={0.08} />
        </Layer>
      ) : (
        <Layer depth={1.15}>
          <rect x={-800} y={850} width={W + 1600} height={600} fill="#c4a77a" />
          {procession && <ProcessionUnits frame={frame} kind="gate" />}
          {[...Array(12)].map((_, i) => <Figure key={i} costume={i % 3 ? "courtier" : "guard"} pose={idle(frame, i)} x={-200 + i * 70 + (i > 5 ? 1300 : 0)} y={960} scale={0.5} silhouette={i % 2 ? "#5a4636" : "#4a3a2c"} />)}
        </Layer>
      )}
    </AbsoluteFill>
  );
};

/** Elevated view of Shivaji's guarded quarters near Ram Singh's camp. */
export const Compound: React.FC<{ time?: TimeOfDay; guardRing?: number; showHouseGlow?: boolean; fuladKhan?: boolean; baskets?: "parade"; clouds?: boolean }> = ({ time = "night", guardRing = 20, showHouseGlow, fuladKhan, baskets, clouds }) => {
  const { frame, duration } = useShot();
  const night = time === "night";
  const dark = night || time === "dusk";
  const cx = 960;
  const cy = 560;
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time={time} id={`sky-comp-${time}`} />
        {night && <Stars count={60} />}
        {(clouds || time === "dusk") && <Clouds y={40} color={dark ? "#2b2b40" : "#fff"} count={7} opacity={0.75} speed={0.8} />}
      </Layer>
      <Layer depth={0.6}>
        <rect x={-800} y={300} width={W + 1600} height={H} fill={ground(time)} />
        {/* Ram Singh's camp tents to the left */}
        <Tent x={260} y={430} w={220} h={140} color={dark ? "#6a5f50" : "#d8c7a0"} />
        <Tent x={470} y={400} w={180} h={120} color={dark ? "#625846" : "#cbb98f"} />
      </Layer>
      <Layer depth={0.9}>
        {/* compound wall in perspective */}
        <path d={`M${cx - 520},${cy + 250} L${cx + 520},${cy + 250} L${cx + 400},${cy - 170} L${cx - 400},${cy - 170}Z`} fill={dark ? "#2f2826" : "#a88a62"} />
        <path d={`M${cx - 520},${cy + 250} L${cx + 520},${cy + 250} L${cx + 400},${cy - 170} L${cx - 400},${cy - 170}Z`} fill="none" stroke={dark ? "#6b4a3a" : C.sandstoneLight} strokeWidth={22} />
        <rect x={cx - 70} y={cy + 228} width={140} height={44} fill={dark ? "#1a1412" : "#5a3a24"} />
        {/* the house */}
        <rect x={cx - 230} y={cy - 150} width={460} height={200} fill={dark ? "#3c302b" : "#d8c3a0"} />
        <rect x={cx - 250} y={cy - 170} width={500} height={26} fill={dark ? "#4c3d36" : "#e7d6b6"} />
        {[...Array(5)].map((_, i) => (
          <rect key={i} x={cx - 200 + i * 90} y={cy - 110} width={44} height={70} rx={20} fill={showHouseGlow && dark ? "#ffcf7a" : dark ? "#1b1514" : "#5a4636"} opacity={showHouseGlow && dark ? 0.6 + 0.3 * Math.sin(frame / 9 + i) : 1} />
        ))}
        {showHouseGlow && dark && <Glow id="houseGlow" x={cx} y={cy - 70} r={420} intensity={0.25} />}
      </Layer>
      <Layer depth={1}>
        {/* ring of guards on an ellipse */}
        {[...Array(guardRing)].map((_, i) => {
          const a = (i / guardRing) * Math.PI * 2;
          const gx = cx + Math.cos(a) * 640;
          const gy = cy + 40 + Math.sin(a) * 330;
          const back = Math.sin(a) < 0;
          return (
            <g key={i} opacity={back ? 0.9 : 1}>
              <Figure costume={i % 4 === 0 ? "rajputguard" : "guard"} pose={{ ...idle(frame, i), shR: dark ? 150 : -4, elR: dark ? 10 : 12, head: Math.sin(frame / 50 + i) * 6 }} x={gx} y={gy} scale={back ? 0.26 : 0.32} facing={Math.cos(a) > 0 ? -1 : 1} holding={dark ? "torch" : "none"} />
              {dark && <Glow id={`gr${i}`} x={gx} y={gy - 110 * (back ? 0.26 : 0.32) * 3} r={70} intensity={0.35} />}
            </g>
          );
        })}
        {fuladKhan && (
          <g>
            <Figure costume="fuladkhan" pose={{ ...idle(frame, 3), shR: kf(frame, [[0, 0], [20, 80], [50, 80], [70, 30]]), elR: 20, head: 4 }} x={cx + 170} y={cy + 330} scale={0.62} />
            <Cannon x={cx - 300 + prog(frame, 0, 60) * 140} y={cy + 330} s={0.7} />
          </g>
        )}
        {baskets === "parade" &&
          [0, 1].map((i) => {
            const ph = frame / 26 + i * 0.3;
            const x = -200 + (frame / Math.max(1, duration)) * 2000 - i * 520;
            return <BasketPair key={i} x={x} y={cy + 380} s={0.6} phase={ph} />;
          })}
      </Layer>
      {(time === "dusk" && clouds) && (
        <Layer depth={1.4}>
          <Rain count={120} opacity={0.25} />
        </Layer>
      )}
    </AbsoluteFill>
  );
};

/** Moving units for the gate approach (Ram Singh leading Shivaji and Sambhaji). */
const ProcessionUnits: React.FC<{ frame: number; kind: "gate" }> = ({ frame }) => {
  const x = -300 + Math.min(frame * 3.6, 1150);
  const ph = frame / 26;
  const walking = frame * 3.6 < 1150;
  const wp = (o: number): Pose => (walking ? walkPose(ph + o) : idle(frame, o * 10));
  return (
    <g>
      <Figure costume="ramsingh" pose={wp(0)} x={x + 200} y={1000 + (walking ? walkBob(ph) : 0)} scale={0.72} />
      <Figure costume="shivaji" pose={wp(0.3)} x={x} y={1000 + (walking ? walkBob(ph + 0.3) : 0)} scale={0.72} />
      <Figure costume="sambhaji" pose={wp(0.6)} x={x - 120} y={1000 + (walking ? walkBob(ph + 0.6) : 0)} scale={0.72} />
    </g>
  );
};

export const DeccanForts: React.FC<{ time?: TimeOfDay; hero?: "shivaji" | "arrival" }> = ({ time = "sunrise", hero = "shivaji" }) => {
  const { frame, duration } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time={time} id={`sky-deccan-${time}`} />
        <Sun x={700} y={520} r={80} color="#ffd79a" />
        <Clouds y={150} color="#ffe9cf" opacity={0.5} />
      </Layer>
      <Layer depth={0.25}>
        <Hills y={600} color="#8ea39a" amp={140} seed="far" />
      </Layer>
      <Layer depth={0.5}>
        <Hills y={680} color={C.deccanHillFar} amp={170} seed="mid" />
        <HillFort x={380} y={560} scale={0.7} color="#6f665c" shade="#5a6b5c" flag={C.saffron} />
        <HillFort x={1500} y={590} scale={0.8} color="#6f665c" shade="#5a6b5c" flag={C.saffron} />
      </Layer>
      <Layer depth={0.8}>
        <Hills y={820} color={C.deccanHill} amp={150} seed="near" />
        <HillFort x={980} y={760} scale={1.15} color="#7a7065" shade="#46584a" flag={C.saffron} />
        <Particles count={25} color="#fff1cf" area={[0, 200, W, 600]} rise={0.15} />
      </Layer>
      <Layer depth={1.2}>
        {hero === "shivaji" && (
          <g>
            <rect x={1180} y={900} width={900} height={400} fill="#5d554c" />
            {[...Array(10)].map((_, i) => <rect key={i} x={1180 + i * 90} y={872} width={56} height={30} fill="#5d554c" />)}
            <Figure costume="shivaji" pose={{ ...idle(frame), head: kf(frame, [[0, 6], [40, -2]]), shR: kf(frame, [[0, -4], [30, 10], [50, 24]]), elR: kf(frame, [[0, 12], [50, 70]]), shL: 4 }} x={1450} y={900} scale={1.35} facing={-1} />
          </g>
        )}
        {hero === "arrival" && (
          <g>
            <Horse x={kf(frame, [[0, 200], [duration * 0.55, 820]])} y={1000} s={1} phase={frame < duration * 0.55 ? frame / 40 : 0} rider={{ skin: C.skinLight, jama: "#8a8070", trim: "#8a8070", pants: "#8a8070", turban: "cloth", turbanColor: "#9a8f80", beard: "short", moustache: true, skirt: "knee" }} color="#5a4a3a" />
            {frame > duration * 0.4 && [0, 1].map((i) => <Figure key={i} costume="rajputguard" pose={walkPose(frame / 20 + i * 0.5)} x={1400 - Math.min((frame - duration * 0.4) * 4, 330) + i * 110} y={1000} scale={0.8} facing={-1} />)}
          </g>
        )}
      </Layer>
    </AbsoluteFill>
  );
};

export const Siege: React.FC<{ fort?: string }> = () => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="morning" id="sky-siege" />
        <Clouds y={120} opacity={0.6} />
      </Layer>
      <Layer depth={0.4}>
        <Hills y={560} color="#8ea39a" amp={160} seed="sfar" />
      </Layer>
      <Layer depth={0.7}>
        <Hills y={640} color={C.deccanHill} amp={260} seed="sfort" x0={600} />
        <HillFort x={1350} y={430} scale={1.2} color="#7a7065" shade="#46584a" flag={C.saffron} />
      </Layer>
      <Layer depth={1}>
        <rect x={-800} y={820} width={W + 1600} height={600} fill="#9a8a62" />
        {[[-40, 860], [200, 830], [420, 870]].map(([tx, ty], i) => <Tent key={i} x={tx} y={ty} w={240} h={150} color="#e2d6b8" stripe={C.mughalGreen} />)}
        {[60, 330].map((fx, i) => <Flag key={i} x={fx} y={760} color={C.mughalGreen} pole={150} />)}
        {[560, 760].map((cx2, i) => {
          const cycle = (frame + i * 40) % 90;
          return <Cannon key={i} x={cx2} y={930} s={1} smoke={cycle < 50 ? cycle / 50 : 0} />;
        })}
        {[...Array(6)].map((_, i) => <Figure key={i} costume="guard" pose={idle(frame, i)} x={480 + i * 70} y={960} scale={0.45} />)}
      </Layer>
    </AbsoluteFill>
  );
};

export const Procession: React.FC<{ kind?: "escort" | "departure" | "family" }> = ({ kind = "escort" }) => {
  const { frame, duration } = useShot();
  if (kind === "departure") {
    return (
      <AbsoluteFill>
        <Layer depth={0}>
          <Sky time="dusk" id="sky-dep" />
          <Clouds y={80} color="#3a2f4a" opacity={0.7} />
        </Layer>
        <Layer depth={0.6}>
          <Hills y={700} color="#3d3542" amp={80} seed="dep" />
        </Layer>
        <Layer depth={0.9}>
          <rect x={-800} y={760} width={W + 1600} height={600} fill="#4a3b3a" />
          <rect x={1220} y={420} width={700} height={360} fill="#5b4a40" />
          <rect x={1200} y={400} width={740} height={30} fill="#6a5648" />
          <Figure costume="shivaji" pose={{ ...idle(frame), head: 6 }} x={1420} y={400} scale={0.55} facing={-1} />
          <Figure costume="sambhaji" pose={{ ...idle(frame, 2), head: 4 }} x={1500} y={400} scale={0.55} facing={-1} />
        </Layer>
        <Layer depth={1.1}>
          {[0, 1, 2, 3, 4].map((i) => {
            const t = frame - i * 22;
            if (t < 0) return null;
            return <Horse key={i} x={1300 - t * 5.5} y={980 + (i % 2) * 30} s={0.75} phase={t / 22} rider="rider" color={i % 2 ? "#5a3d2a" : "#7a5a3d"} trappings={C.vermilion} />;
          })}
        </Layer>
      </AbsoluteFill>
    );
  }
  if (kind === "family") {
    const x = 1700 - (frame / Math.max(1, duration)) * 1500;
    const ph = frame / 26;
    return (
      <AbsoluteFill>
        <Layer depth={0}>
          <Sky time="morning" id="sky-fam" />
          <Clouds y={140} opacity={0.6} />
        </Layer>
        <Layer depth={0.5}>
          <Hills y={700} color="#9fb39a" amp={90} seed="fam" />
        </Layer>
        <Layer depth={1}>
          <rect x={-800} y={800} width={W + 1600} height={600} fill="#c2a67a" />
          <g>
            <Flag x={700} y={860} color={C.mughalGreen} pole={130} />
            <Figure costume="guard" pose={{ ...idle(frame), head: x < 900 ? 8 : 0, shR: x < 900 && x > 500 ? 40 : -4, elR: 30 }} x={640} y={900} scale={0.8} />
          </g>
          {/* bullock cart */}
          <g transform={`translate(${x} 900)`}>
            <rect x={-60} y={-110} width={180} height={60} fill="#7a5a32" />
            <circle cx={40} cy={-40} r={42} fill="none" stroke="#5a3a1e" strokeWidth={10} />
            <ellipse cx={-150} cy={-80} rx={70} ry={34} fill="#e8e0d0" />
            <ellipse cx={-210} cy={-96} rx={26} ry={20} fill="#e8e0d0" />
          </g>
          <Figure costume="brahmin" pose={walkPose(ph)} x={x + 220} y={910 + walkBob(ph)} scale={0.85} facing={-1} />
          <Figure costume="sambhaji_brahmin" pose={walkPose(ph + 0.4)} x={x + 340} y={910 + walkBob(ph + 0.4)} scale={0.85} facing={-1} />
          <Figure costume="brahmin" pose={walkPose(ph + 0.7)} x={x + 450} y={910 + walkBob(ph + 0.7)} scale={0.85} facing={-1} />
        </Layer>
      </AbsoluteFill>
    );
  }
  // escort
  const base = -520 + (frame / Math.max(1, duration)) * 900;
  const ph = frame / 30;
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="day" id="sky-esc" />
        <Clouds y={120} opacity={0.7} />
      </Layer>
      <Layer depth={0.35}>
        <Hills y={640} color="#a8b79c" amp={90} seed="esc1" />
      </Layer>
      <Layer depth={0.7}>
        <Hills y={760} color="#8aa07e" amp={60} seed="esc2" />
        {[...Array(8)].map((_, i) => (
          <g key={i} transform={`translate(${-200 + i * 330} 760)`}>
            <rect x={-8} y={-90} width={16} height={90} fill="#5a4630" />
            <circle cx={0} cy={-110} r={60} fill="#5d7a4c" />
          </g>
        ))}
      </Layer>
      <Layer depth={1}>
        <rect x={-800} y={860} width={W + 1600} height={600} fill="#c9ad7d" />
        <Elephant x={base + 1420} y={1000} s={1.05} phase={ph * 0.6} flag={C.saffron} />
        <Horse x={base + 980} y={1010} s={1.05} phase={ph} rider="shivaji" color="#efe8d8" trappings={C.gold} />
        <Horse x={base + 700} y={1020} s={0.8} phase={ph + 0.3} rider="sambhaji" color="#8a6a4a" trappings={C.gold} />
        {/* silver palanquin with bearers */}
        <g transform={`translate(${base + 380} 0)`}>
          {[-90, 90].map((bx, i) => <Figure key={i} costume="porter" pose={{ ...walkPose(ph + i * 0.5, 0.7), shR: 150, elR: 20 }} x={bx} y={1000 + walkBob(ph + i * 0.5, 0.7)} scale={0.8} />)}
          <line x1={-140} y1={790} x2={140} y2={790} stroke="#c9c9c9" strokeWidth={10} />
          <rect x={-70} y={720} width={140} height={90} rx={10} fill="#d9d9de" stroke="#9aa0a6" strokeWidth={4} />
          <path d="M-70,720 Q0,660 70,720Z" fill="#c4c4cc" />
        </g>
        {[...Array(4)].map((_, i) => <Horse key={i} x={base + 100 - i * 220} y={1000} s={0.75} phase={ph + i * 0.21} rider="rider" color={i % 2 ? "#5a3d2a" : "#7a5a3d"} trappings="#c9c9d2" />)}
      </Layer>
    </AbsoluteFill>
  );
};

export const GateNight: React.FC = () => {
  const { frame, duration } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="night" id="sky-gn" />
        <Clouds y={40} color="#1c2333" count={8} opacity={0.9} speed={1} />
      </Layer>
      <Layer depth={0.85}>
        <rect x={-800} y={300} width={W + 1600} height={600} fill="#2d2420" />
        <Wall x={-800} y={330} w={1500} h={580} color="#3e2a24" dark="#24160f" />
        <Wall x={1220} y={330} w={1500} h={580} color="#3e2a24" dark="#24160f" />
        <Torch x={700} y={520} s={1.6} seed="gn1" />
        <Torch x={1230} y={520} s={1.6} seed="gn2" />
      </Layer>
      <Layer depth={1}>
        <rect x={-800} y={900} width={W + 1600} height={500} fill="#1d1816" />
        <Figure costume="guard" pose={{ ...idle(frame), head: kf(frame, [[0, 0], [60, 0], [75, -14], [110, -14], [125, 2]]) }} x={640} y={940} scale={0.95} />
        <Figure costume="guard" pose={{ ...idle(frame, 4) }} x={1300} y={940} scale={0.95} facing={-1} />
        {[0, 1, 2].map((i) => {
          const ph = frame / 26 + i * 0.37;
          return <BasketPair key={i} x={-300 + (frame / Math.max(1, duration)) * 2600 - i * 620} y={990} s={0.62} phase={ph} />;
        })}
      </Layer>
      <Layer depth={1.4}>
        <Rain count={200} opacity={0.3} />
      </Layer>
    </AbsoluteFill>
  );
};

export const GateCheck: React.FC<{ days?: number }> = ({ days = 6 }) => {
  const { frame, duration } = useShot();
  const per = duration / days;
  const day = Math.min(days, Math.floor(frame / per) + 1);
  const t = frame - (day - 1) * per;
  const checking = day <= 3;
  const lid = checking ? kf(t, [[per * 0.25, 0], [per * 0.4, 1], [per * 0.7, 1], [per * 0.85, 0]]) : 0;
  const lean = checking ? kf(t, [[per * 0.2, 0], [per * 0.35, 25], [per * 0.75, 25], [per * 0.9, 0]]) : 0;
  const wave = !checking ? kf(t, [[per * 0.2, -4], [per * 0.35, 100], [per * 0.5, 60], [per * 0.65, 100], [per * 0.8, -4]]) : -4;
  const yawn = !checking && day === days ? kf(t, [[0, 0], [per * 0.2, 1], [per * 0.5, 0]]) : 0;
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time={day % 2 ? "dusk" : "dawn"} id={`sky-gc-${day % 2}`} />
      </Layer>
      <Layer depth={0.8}>
        <rect x={-800} y={300} width={W + 1600} height={800} fill="#4a3b36" />
        <Gate x={1450} y={900} w={200} h={320} color="#6b3a2c" tower="#7a4434" dome="#9a9286" />
        <Torch x={1200} y={600} s={1.3} seed="gc1" />
      </Layer>
      <Layer depth={1}>
        <rect x={-800} y={900} width={W + 1600} height={500} fill="#3a2e2a" />
        <BasketPair x={760} y={990} s={0.75} phase={0} lidOpen={lid} walking={false} />
        <Figure costume="guard" pose={{ ...idle(frame), lean, head: lean * 0.6, shR: checking ? 70 : wave, elR: checking ? 40 : 30, mouth: yawn, blink: yawn > 0.5 ? 1 : idle(frame).blink }} x={1130} y={990} scale={0.95} facing={-1} />
      </Layer>
      <div style={{ position: "absolute", left: 90, top: 80, fontFamily: FONT_TITLE, fontSize: 64, color: C.parchment, letterSpacing: 6, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>DAY {day}</div>
    </AbsoluteFill>
  );
};

export const Checkpoint: React.FC = () => {
  const { frame } = useShot();
  const searchArm = kf(frame, [[20, -4], [45, 60], [70, 40], [95, 60], [120, -4]]);
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="morning" id="sky-cp" />
      </Layer>
      <Layer depth={0.6}>
        <River y={600} h={220} speed={0.5} />
        <Hills y={600} color="#93a08c" amp={50} seed="cp" />
      </Layer>
      <Layer depth={1}>
        {[...Array(6)].map((_, i) => <rect key={i} x={-800} y={800 + i * 40} width={W + 1600} height={40} fill={i % 2 ? "#b8a07a" : "#a8906a"} />)}
        <Figure costume="ascetic" pose={{ ...idle(frame), head: 6, shL: 20 }} x={820} y={1000} scale={1.05} />
        <Figure costume="guard" pose={{ ...idle(frame, 2), lean: 10, shR: searchArm, elR: 50 }} x={1080} y={1000} scale={1.05} facing={-1} />
        <Figure costume="guard" pose={{ ...idle(frame, 5) }} x={1300} y={1000} scale={1.0} facing={-1} />
        <g transform={`translate(950 ${1000 - 80})`}>
          <path d="M-40,0 Q0,-60 40,0Z" fill="#c9762e" />
        </g>
      </Layer>
    </AbsoluteFill>
  );
};

export const AsceticWalk: React.FC = () => {
  const { frame } = useShot();
  const ph = frame / 28;
  const x = 1500 - frame * 2.6;
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="night" id="sky-aw" />
        <Stars />
        <Moon x={300} y={180} r={34} />
      </Layer>
      <Layer depth={0.4}>
        <Hills y={700} color="#1c2433" amp={90} seed="aw1" />
      </Layer>
      <Layer depth={0.7}>
        <Hills y={790} color="#161c28" amp={50} seed="aw2" />
        {[200, 520, 1500].map((hx, i) => (
          <g key={i}>
            <path d={`M${hx - 70},800 L${hx - 70},740 L${hx},690 L${hx + 70},740 L${hx + 70},800Z`} fill="#241f22" />
            <rect x={hx - 14} y={752} width={20} height={20} fill="#ffcf7a" opacity={0.7} />
          </g>
        ))}
        <Particles count={30} color="#e8ff9a" area={[0, 600, W, 300]} rise={0.05} glow size={2.2} />
      </Layer>
      <Layer depth={1}>
        <rect x={-800} y={880} width={W + 1600} height={600} fill="#12151d" />
        <Figure costume="shivaji_ascetic" pose={walkPose(ph)} x={x} y={960 + walkBob(ph)} scale={0.95} facing={-1} />
        <Figure costume="ascetic" pose={walkPose(ph + 0.35)} x={x + 170} y={960 + walkBob(ph + 0.35)} scale={0.9} facing={-1} />
        <Figure costume="ascetic" pose={walkPose(ph + 0.7)} x={x + 330} y={960 + walkBob(ph + 0.7)} scale={0.9} facing={-1} />
      </Layer>
    </AbsoluteFill>
  );
};

export const MathuraGhat: React.FC = () => {
  const { frame } = useShot();
  const reach = kf(frame, [[20, -4], [60, 70]]);
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="dawn" id="sky-mg" />
        <Sun x={1500} y={620} r={70} color="#ffcf9a" />
      </Layer>
      <Layer depth={0.5}>
        {[300, 640, 1100, 1450].map((tx, i) => (
          <g key={i} fill={i % 2 ? "#7a5a52" : "#8a665a"}>
            <rect x={tx - 70} y={520} width={140} height={200} />
            <path d={`M${tx - 60},520 Q${tx - 50},380 ${tx},300 Q${tx + 50},380 ${tx + 60},520Z`} />
            <line x1={tx} y1={300} x2={tx} y2={260} stroke={C.saffron} strokeWidth={4} />
          </g>
        ))}
      </Layer>
      <Layer depth={0.8}>
        {[...Array(7)].map((_, i) => <rect key={i} x={-800} y={700 + i * 30} width={W + 1600} height={30} fill={i % 2 ? "#a8907a" : "#9a826c"} />)}
      </Layer>
      <Layer depth={1}>
        <River y={920} h={300} color="#5a7a8a" light="#ffd9a8" speed={0.5} />
        <Figure costume="brahmin" pose={{ ...idle(frame), shR: reach, elR: 20, head: 8 }} x={980} y={910} scale={1.0} facing={-1} />
        <Figure costume="sambhaji" pose={{ ...idle(frame, 3), shR: kf(frame, [[20, -4], [60, 60]]), elR: 20, head: -6 }} x={780} y={910} scale={1.0} />
      </Layer>
    </AbsoluteFill>
  );
};

export const Brahmaputra: React.FC = () => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="dusk" id="sky-bp" />
        <Sun x={1300} y={560} r={60} color="#ffb070" />
      </Layer>
      <Layer depth={0.4}>
        <Hills y={600} color="#3c3a52" amp={130} seed="bp1" />
        <Hills y={640} color="#2e3046" amp={70} seed="bp2" />
      </Layer>
      <Layer depth={0.8}>
        <River y={640} h={500} color="#3a3f58" light="#ffb98a" speed={0.4} />
        {[[300, 760, 0.8], [700, 820, 1], [1500, 740, 0.7]].map(([bx, by, s], i) => (
          <Boat key={i} x={bx + Math.sin(frame / 40 + i) * 10} y={by} s={s} lantern seed={`bp${i}`} />
        ))}
      </Layer>
      <Layer depth={1.1}>
        <Boat x={1100} y={960} s={1.6} lantern seed="bphero" />
        <Figure costume="ramsingh" pose={{ ...idle(frame), shR: 30, elR: 40 }} x={1060} y={930} scale={0.95} silhouette="#151522" />
      </Layer>
    </AbsoluteFill>
  );
};

export const Coronation: React.FC = () => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <rect x={-400} y={-400} width={W + 800} height={H + 800} fill="#3a2418" />
        <Glow id="coronaGlow" x={960} y={420} r={900} color="#ffd27a" intensity={0.55} />
      </Layer>
      <Layer depth={0.7}>
        <path d="M560,260 Q960,120 1360,260 L1330,300 L590,300Z" fill={C.gold} />
        {[600, 1320].map((px, i) => <rect key={i} x={px - 10} y={290} width={20} height={520} fill={C.goldDeep} />)}
        <rect x={700} y={640} width={520} height={60} fill="#7a2a20" />
        <rect x={760} y={480} width={400} height={180} rx={20} fill="#9a3a26" stroke={C.gold} strokeWidth={8} />
      </Layer>
      <Layer depth={1}>
        <Figure costume="shivaji" pose={{ ...idle(frame), crouch: 0.75, hipR: 80, kneeR: 90, hipL: 76, kneeL: 90, shR: 30, elR: 50, shL: 20, elL: 60 }} x={960} y={700} scale={1.1} />
        {[...Array(6)].map((_, i) => {
          const left = i < 3;
          const bow = kf(frame, [[10 + i * 6, 0], [40 + i * 6, 32]]);
          return <Figure key={i} costume={i % 2 ? "courtier" : "official"} pose={{ ...idle(frame, i), lean: bow, head: bow * 0.6, shR: 40, elR: 60 }} x={left ? 220 + i * 140 : 1300 + (i - 3) * 140} y={980} scale={0.9} facing={left ? 1 : -1} />;
        })}
        <Particles count={70} color="#ff9a7a" area={[0, -100, W, H]} rise={-1.2} size={5} seed={21} />
      </Layer>
    </AbsoluteFill>
  );
};

export const EndScreen: React.FC = () => {
  const { frame } = useShot();
  const fade = prog(frame, 0, 40, easeOut);
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <Sky time="dusk" id="sky-end" />
        <Sun x={960} y={760} r={90} color="#ffb070" />
        <Clouds y={120} color="#5a3f5e" opacity={0.6} speed={0.2} />
      </Layer>
      <Layer depth={0.4}>
        <Skyline y={820} color="#2a1f2e" />
        <Dome x={960} y={760} r={120} color="#2a1f2e" />
      </Layer>
      <Layer depth={0.8}>
        <River y={860} h={300} color="#1c1726" light="#ffb98a" speed={0.3} />
      </Layer>
      <div style={{ position: "absolute", left: 0, right: 0, top: 96, textAlign: "center", opacity: fade }}>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 64, letterSpacing: 8, color: C.parchment, textShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>THE NARROW HOUR</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 34, color: "#e8dcc4", marginTop: 16 }}>Sources, notes and credits are in the description</div>
      </div>
    </AbsoluteFill>
  );
};
