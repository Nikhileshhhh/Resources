import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_BODY, FONT_TITLE } from "../theme";
import { Layer, kf, prog, useShot, easeOut, rand } from "../lib/anim";
import { Figure, idle } from "../components/Figure";
import { Basket, Glow, Lamp, Particles, W, H } from "../components/kit";
import map from "../data/southasia.json";

const P = map.places as unknown as Record<string, [number, number]>;

const Paper: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <g>
    <defs>
      <radialGradient id={dark ? "paperD" : "paper"} cx="50%" cy="45%" r="75%">
        <stop offset="0" stopColor={dark ? "#3a2e24" : "#f1e3c4"} />
        <stop offset="1" stopColor={dark ? "#1e1712" : "#c9ae7e"} />
      </radialGradient>
    </defs>
    <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill={`url(#${dark ? "paperD" : "paper"})`} />
  </g>
);

export const TitleCard: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const { frame } = useShot();
  const swing = Math.sin(frame / 14) * 4 * (1 - prog(frame, 0, 90));
  const drop = kf(frame, [[0, -500], [28, 0]], easeOut);
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#1a1420" />
        <Glow id="tcg" x={960} y={500} r={800} color="#e8892b" intensity={0.25} />
        <Particles count={40} color="#ffcf8a" rise={0.25} />
      </Layer>
      <Layer depth={0.8}>
        <g transform={`translate(960 ${330 + drop}) rotate(${swing})`}>
          <line x1={-330} y1={0} x2={330} y2={0} stroke="#7a5a32" strokeWidth={14} strokeLinecap="round" />
          <line x1={-40} y1={0} x2={-60} y2={70} stroke="#5a4226" strokeWidth={4} />
          <line x1={40} y1={0} x2={60} y2={70} stroke="#5a4226" strokeWidth={4} />
          <Basket x={0} y={220} s={1.6} lidOpen={prog(frame, 30, 50)} />
        </g>
      </Layer>
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center" }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 124, letterSpacing: 10, color: "#f3e3c0", opacity: prog(frame, 20, 45), transform: `translateY(${kf(frame, [[20, 40], [45, 0]], easeOut)}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.7)" }}>{title.toUpperCase()}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 44, letterSpacing: 6, color: C.saffron, marginTop: 10, opacity: prog(frame, 40, 60) }}>{subtitle}</div>
      </div>
    </AbsoluteFill>
  );
};

const Letter: React.FC<{ x: number; y: number; rot: number; s?: number; seal?: boolean; lines?: number; date?: string }> = ({ x, y, rot, s = 1, seal = true, lines = 9, date }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-150} y={-200} width={300} height={400} rx={6} fill={C.parchment} stroke={C.parchmentDark} strokeWidth={4} />
    {[...Array(lines)].map((_, i) => (
      <path key={i} d={`M-118,${-150 + i * 36} q20,-8 40,0 t40,0 t40,0 t40,0 t40,0 t40,0`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.65} />
    ))}
    {seal && <circle cx={100} cy={160} r={22} fill="#a02a20" />}
    {date && <text x={0} y={186} textAnchor="middle" fontFamily="Cinzel" fontSize={22} fill={C.ink}>{date}</text>}
  </g>
);

export const LettersReveal: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <Paper dark />
        <Lamp x={1600} y={860} s={2} seed="lr" glowR={600} />
      </Layer>
      <Layer depth={1}>
        {[...Array(count)].map((_, i) => {
          const t = prog(frame, 6 + i * 8, 30 + i * 8, easeOut);
          const tx = 960 + (i - (count - 1) / 2) * 270 * t;
          const ty = 560 - Math.abs(i - (count - 1) / 2) * 30 * t;
          return <Letter key={i} x={tx} y={ty} rot={(i - (count - 1) / 2) * 8 * t} s={0.95} date="Agra 1666" />;
        })}
      </Layer>
    </AbsoluteFill>
  );
};

// ---------------- Map ----------------
type MapPreset = "deccanRaids" | "journeyNorth" | "kabulOrder" | "allahabad" | "manhunt" | "legendLoop" | "fastReturn" | "assam";

const Route: React.FC<{ pts: [number, number][]; p: number; color: string; dash?: string; width?: number; curve?: number }> = ({ pts, p, color, dash, width = 7, curve = 0.18 }) => {
  // smooth path through points with quadratic bends
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2 - (y1 - y0) * curve;
    const my = (y0 + y1) / 2 + (x1 - x0) * curve;
    d += ` Q${mx},${my} ${x1},${y1}`;
  }
  const len = 4000;
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={width + 6} strokeLinecap="round" strokeDasharray={`${len}`} strokeDashoffset={len * (1 - p)} />
      {dash ? (
        <g>
          <mask id={`m${pts.length}${color.slice(1)}`}>
            <path d={d} fill="none" stroke="#fff" strokeWidth={width + 4} strokeDasharray={`${len}`} strokeDashoffset={len * (1 - p)} />
          </mask>
          <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" mask={`url(#m${pts.length}${color.slice(1)})`} />
        </g>
      ) : (
        <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${len}`} strokeDashoffset={len * (1 - p)} />
      )}
    </g>
  );
};

const Marker: React.FC<{ name: string; label?: string; show: number; dx?: number; dy?: number; color?: string; big?: boolean }> = ({ name, label, show, dx = 14, dy = -14, color = C.ink, big }) => {
  const [x, y] = P[name];
  if (show <= 0) return null;
  return (
    <g opacity={show}>
      <circle cx={x} cy={y} r={(big ? 11 : 8) * show} fill={color} stroke={C.parchment} strokeWidth={3} />
      <text x={x + dx} y={y + dy} fontFamily={FONT_BODY} fontWeight={600} fontSize={big ? 34 : 28} fill={C.ink} stroke={C.parchment} strokeWidth={6} paintOrder="stroke">{label ?? name}</text>
    </g>
  );
};

export const MapScene: React.FC<{ preset: MapPreset }> = ({ preset }) => {
  const { frame, duration } = useShot();
  const p = (a: number, b: number) => prog(frame, a, b);
  const draw = prog(frame, 10, Math.max(40, duration * 0.7));
  const region = (txt: string, x: number, y: number, s = 30, op = 0.55) => (
    <text x={x} y={y} fontFamily={FONT_TITLE} fontSize={s} letterSpacing={6} fill={C.ink} opacity={op} textAnchor="middle">{txt}</text>
  );
  const layers: React.ReactNode[] = [];
  switch (preset) {
    case "deccanRaids":
      layers.push(region("MUGHAL EMPIRE", 960, 330, 40), region("DECCAN", 960, 780, 34));
      layers.push(<Marker key="a" name="Agra" show={p(0, 15)} />, <Marker key="r" name="Rajgad" show={p(0, 15)} color={C.saffron} />, <Marker key="s" name="Surat" label="Surat, 1664" show={p(30, 50)} dx={-180} />);
      layers.push(<Route key="raid" pts={[P.Rajgad, P.Surat]} p={p(20, 60)} color={C.vermilion} width={9} curve={-0.3} />);
      break;
    case "journeyNorth":
      layers.push(<Marker key="r" name="Rajgad" show={1} color={C.saffron} big />, <Marker key="a" name="Agra" show={p(0, 20)} big />);
      layers.push(<Route key="j" pts={[P.Rajgad, P.Aurangabad, P.Burhanpur, P.Narwar, P.Agra]} p={draw} color={C.saffron} width={9} curve={0.05} />);
      break;
    case "kabulOrder": {
      const strike = p(duration * 0.55, duration * 0.7);
      layers.push(<Marker key="a" name="Agra" show={1} big />, <Marker key="k" name="Kabul" show={p(5, 20)} big />);
      layers.push(<g key="ko" opacity={1 - p(duration * 0.75, duration * 0.95)}><Route pts={[P.Agra, P.Kabul]} p={p(5, duration * 0.45)} color={C.mughalGreen} width={9} /></g>);
      if (strike > 0) {
        const [ax, ay] = P.Agra;
        const [kx, ky] = P.Kabul;
        const mx = (ax + kx) / 2;
        const my = (ay + ky) / 2;
        layers.push(<g key="x" opacity={1 - p(duration * 0.8, duration)}><line x1={mx - 60} y1={my - 60} x2={mx - 60 + 120 * strike} y2={my - 60 + 120 * strike} stroke={C.vermilion} strokeWidth={14} strokeLinecap="round" /><line x1={mx + 60} y1={my - 60} x2={mx + 60 - 120 * strike} y2={my - 60 + 120 * strike} stroke={C.vermilion} strokeWidth={14} strokeLinecap="round" /></g>);
      }
      break;
    }
    case "allahabad":
      layers.push(<Marker key="a" name="Agra" show={1} />, <Marker key="b" name="Benares" label="Benares (requested)" show={p(0, 15)} dy={34} />, <Marker key="al" name="Allahabad" label="Allahabad fort (offered)" show={p(15, 35)} big dx={-60} dy={-30} />);
      layers.push(<Route key="r" pts={[P.Agra, P.Allahabad]} p={p(10, 40)} color={C.mughalGreen} width={8} />);
      break;
    case "manhunt":
      layers.push(<Marker key="a" name="Agra" show={1} big />);
      ["Dholpur", "Narwar", "Jaipur", "Delhi", "Allahabad", "Burhanpur", "Surat", "Gondwana"].forEach((n, i) => {
        layers.push(<Route key={n} pts={[P.Agra, P[n]]} p={p(5 + i * 5, 35 + i * 5)} color={C.mughalGreen} width={5} curve={0.08} />);
        layers.push(<g key={`g${n}`} opacity={p(30 + i * 5, 40 + i * 5)}><circle cx={P[n][0]} cy={P[n][1]} r={12} fill="none" stroke={C.vermilion} strokeWidth={4} /></g>);
      });
      break;
    case "legendLoop":
      layers.push(<Marker key="a" name="Agra" show={1} />, <Marker key="r" name="Rajgad" show={1} color={C.saffron} />);
      ["Mathura", "Allahabad", "Benares", "Gaya", "Puri", "Golconda", "Bijapur"].forEach((n, i) => layers.push(<Marker key={n} name={n} show={p(10 + i * 12, 22 + i * 12)} dx={n === "Mathura" ? -140 : 14} dy={n === "Benares" ? 34 : -14} />));
      layers.push(<Route key="loop" pts={[P.Agra, P.Mathura, P.Allahabad, P.Benares, P.Gaya, P.Puri, P.Golconda, P.Bijapur, P.Rajgad]} p={draw} color="#8a6a3a" dash="2 18" width={10} curve={0.12} />);
      break;
    case "fastReturn": {
      const days = Math.round(1 + 24 * prog(frame, 10, duration * 0.8));
      layers.push(<g key="ghost" opacity={0.25}><Route pts={[P.Agra, P.Mathura, P.Allahabad, P.Benares, P.Gaya, P.Puri, P.Golconda, P.Bijapur, P.Rajgad]} p={1} color="#8a6a3a" dash="2 18" width={8} curve={0.12} /></g>);
      layers.push(<Marker key="a" name="Agra" show={1} big />, <Marker key="r" name="Rajgad" show={1} big color={C.saffron} />);
      layers.push(<Route key="fast" pts={[P.Agra, P.Gondwana, P.Rajgad]} p={prog(frame, 10, duration * 0.8)} color={C.saffron} width={11} curve={0.1} />);
      layers.push(<text key="days" x={P.Gondwana[0] + 60} y={P.Gondwana[1] + 10} fontFamily={FONT_TITLE} fontSize={72} fill={C.vermilion} stroke={C.parchment} strokeWidth={8} paintOrder="stroke">{`DAY ${days}`}</text>);
      layers.push(<text key="unc" x={P.Gondwana[0] + 60} y={P.Gondwana[1] + 56} fontFamily={FONT_BODY} fontStyle="italic" fontSize={28} fill={C.ink} opacity={0.8}>exact route unknown</text>);
      break;
    }
    case "assam":
      layers.push(<Marker key="a" name="Agra" show={1} />, <Marker key="s" name="Saraighat" label="Saraighat (Assam)" show={p(duration * 0.5, duration * 0.7)} big dx={-300} dy={-24} />);
      layers.push(<Route key="as" pts={[P.Agra, P.Allahabad, P.Benares, P.Gaya, P.Saraighat]} p={draw} color={C.mughalGreen} width={9} curve={0.06} />);
      break;
  }
  return (
    <AbsoluteFill>
      <Layer depth={0}>
        <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#5d7f8f" />
      </Layer>
      <Layer depth={1}>
        <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#7d9ea9" />
        <path d={map.land} fill={C.parchment} stroke={C.parchmentDark} strokeWidth={2} />
        {map.rivers.map((r, i) => <path key={i} d={r.d} fill="none" stroke="#6f99a8" strokeWidth={3} opacity={0.9} />)}
        {layers}
      </Layer>
      <div style={{ position: "absolute", left: 40, bottom: 26, fontFamily: FONT_BODY, fontSize: 22, color: "#f3ead6", opacity: 0.85, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
        Simplified map · modern coastline and rivers (Natural Earth) · no 1666 borders shown
      </div>
    </AbsoluteFill>
  );
};

// ---------------- Diagrams ----------------
const FortIcon: React.FC<{ x: number; y: number; color: string; glow?: boolean }> = ({ x, y, color, glow }) => (
  <g transform={`translate(${x} ${y})`}>
    {glow && <circle cx={0} cy={-18} r={46} fill={C.saffron} opacity={0.35} />}
    <path d="M-34,10 L-34,-28 L-26,-28 L-26,-36 L-16,-36 L-16,-28 L-6,-28 L-6,-40 L6,-40 L6,-28 L16,-28 L16,-36 L26,-36 L26,-28 L34,-28 L34,10Z" fill={color} />
    <path d="M-8,10 L-8,-6 Q0,-16 8,-6 L8,10Z" fill="rgba(0,0,0,0.35)" />
  </g>
);

export const FortsGrid: React.FC<{ ceded: number; kept: number; highlight?: string; reverse?: boolean }> = ({ ceded, kept, reverse }) => {
  const { frame, duration } = useShot();
  const total = ceded + kept;
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <Paper />
      </Layer>
      <Layer depth={1}>
        {[...Array(total)].map((_, i) => {
          const isCeded = i < ceded;
          const col = i % 7;
          const row = Math.floor(i / 7);
          const homeX = 560 + col * 130;
          const homeY = 330 + row * 120;
          const t = isCeded ? prog(frame, 15 + i * 2, 40 + i * 2) : 0;
          const back = reverse ? prog(frame, 10 + i * (duration * 0.6) / ceded, 20 + i * (duration * 0.6) / ceded) : 0;
          const moved = reverse ? (isCeded ? 1 - back : 0) : t;
          const tx = isCeded ? homeX - 380 * moved : homeX + (reverse ? 0 : 0);
          const color = isCeded && moved > 0.5 ? C.mughalGreen : C.saffron;
          return <FortIcon key={i} x={tx} y={homeY} color={color} glow={!isCeded && i === ceded} />;
        })}
        <text x={260} y={960} fontFamily={FONT_TITLE} fontSize={44} fill={C.mughalGreen} opacity={reverse ? 1 - prog(frame, 10, duration * 0.7) : prog(frame, 30, 50)}>{`${ceded} TO THE EMPIRE`}</text>
        <text x={1180} y={960} fontFamily={FONT_TITLE} fontSize={44} fill={C.saffron} opacity={reverse ? 1 : prog(frame, 40, 60)}>{reverse ? "RETAKEN" : `${kept} KEPT · INCL. RAJGAD`}</text>
      </Layer>
    </AbsoluteFill>
  );
};

export const Options: React.FC<{ items: string[] }> = ({ items }) => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#0e0b12" />
        <Lamp x={960} y={860} s={1.8} seed="opt" glowR={380 * (1 - prog(frame, 20, 80) * 0.5)} />
      </Layer>
      <Layer depth={0.6}>
        <path d="M1400,900 L1400,520 L1460,520 L1460,480 L1520,480 L1520,520 L1580,520 L1580,440 L1640,440 L1640,520 L1700,520 L1700,900Z" fill="#1c1822" />
      </Layer>
      <div style={{ position: "absolute", left: 180, top: 300, display: "flex", flexDirection: "column", gap: 40 }}>
        {items.map((t, i) => (
          <div key={i} style={{ fontFamily: FONT_TITLE, fontSize: 64, color: "#e8dcc4", opacity: prog(frame, 10 + i * 25, 30 + i * 25), transform: `translateX(${kf(frame, [[10 + i * 25, -60], [30 + i * 25, 0]], easeOut)}px)`, letterSpacing: 4 }}>{t}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Bond: React.FC<{ beat?: "signed" }> = ({ beat }) => {
  const { frame } = useShot();
  const unroll = beat === "signed" ? 1 : prog(frame, 0, 25, easeOut);
  const sign = beat === "signed" ? 1 : prog(frame, 25, 60);
  const stamp = beat === "signed" ? 1 : prog(frame, 62, 70);
  const { duration } = useShot();
  const away = beat === "signed" ? prog(frame, duration * 0.7, duration) : 0;
  const roll = beat === "signed" ? prog(frame, duration * 0.3, duration * 0.65) : 0;
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <Paper dark />
        <Lamp x={300} y={880} s={1.8} seed="bond" glowR={500} />
      </Layer>
      <Layer depth={1}>
        <g transform={`translate(${960 + away * 1300} ${540 - away * 100}) rotate(${away * 20}) scale(1 ${1 - roll * 0.85})`}>
          <rect x={-320} y={-380 * unroll} width={640} height={760 * unroll} fill={C.parchment} stroke={C.parchmentDark} strokeWidth={5} />
          {unroll > 0.6 && [...Array(9)].map((_, i) => <path key={i} d={`M-250,${-300 + i * 48} q25,-10 50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.55} />)}
          <path d={`M-200,250 q40,-40 80,0 t80,0 t80,0`} stroke={C.ink} strokeWidth={5} fill="none" strokeDasharray="600" strokeDashoffset={600 * (1 - sign)} />
          {stamp > 0 && <circle cx={200} cy={250} r={70 * (2 - stamp)} fill="#a02a20" opacity={stamp} />}
          {stamp > 0 && <circle cx={200} cy={250} r={48 * (2 - stamp)} fill="none" stroke="#7a1a14" strokeWidth={6} opacity={stamp} />}
        </g>
      </Layer>
    </AbsoluteFill>
  );
};

export const Petitions: React.FC<{ items: string[] }> = ({ items }) => {
  const { frame, duration } = useShot();
  const per = duration / items.length;
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <Paper dark />
      </Layer>
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        {items.map((t, i) => {
          const a = i * per;
          const show = prog(frame, a, a + 12, easeOut);
          const stamp = prog(frame, a + per * 0.55, a + per * 0.65);
          return (
            <div key={i} style={{ position: "relative", width: 1120, padding: "22px 40px", background: C.parchment, border: `4px solid ${C.parchmentDark}`, borderRadius: 8, opacity: show, transform: `translateX(${(1 - show) * -200}px)`, fontFamily: FONT_BODY, fontSize: 46, color: C.ink, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
              {t}
              {stamp > 0 && (
                <div style={{ position: "absolute", right: 30, top: 10, fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 52, color: "#a02a20", border: "6px solid #a02a20", padding: "2px 18px", transform: `rotate(-8deg) scale(${2 - stamp})`, opacity: stamp }}>REFUSED</div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Coins: React.FC<{ amount: string; label: string }> = ({ amount, label }) => {
  const { frame } = useShot();
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <Paper dark />
        <Lamp x={1500} y={860} s={1.8} seed="coins" glowR={600} />
      </Layer>
      <Layer depth={1}>
        <g transform="translate(560 760)">
          <rect x={-200} y={-160} width={400} height={170} rx={14} fill="#5a3a1e" stroke={C.goldDeep} strokeWidth={8} />
          <path d={`M-200,-160 L200,-160 L${200 - 60 * prog(frame, 0, 20)},${-280 * prog(frame, 0, 20) - 160} L${-200 - 20 * prog(frame, 0, 20)},${-260 * prog(frame, 0, 20) - 160}Z`} fill="#6b4524" />
          {[...Array(14)].map((_, i) => {
            const t = (frame - i * 5) / 40;
            if (t < 0 || t > 1) return null;
            return <ellipse key={i} cx={-60 + rand(i) * 120 + t * 160} cy={-150 + t * t * 260} rx={18} ry={7 + Math.sin(t * 12 + i) * 6} fill={C.gold} />;
          })}
        </g>
      </Layer>
      <div style={{ position: "absolute", left: 960, top: 380, fontFamily: FONT_TITLE }}>
        <div style={{ fontSize: 110, color: C.gold, opacity: prog(frame, 15, 35), textShadow: "0 6px 20px rgba(0,0,0,0.6)" }}>{amount}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 48, color: "#e8dcc4", opacity: prog(frame, 25, 45) }}>{label}</div>
      </div>
    </AbsoluteFill>
  );
};

export const SplitCompare: React.FC<{ left: string; right: string }> = ({ left, right }) => {
  const { frame, duration } = useShot();
  const sunA = prog(frame, 0, duration);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: 0, width: 958, height: 1080, overflow: "hidden", filter: "sepia(0.6)" }}>
        <svg width={1920} height={1080}>
          <rect width={1920} height={1080} fill="#b9a27a" />
          <circle cx={100 + sunA * 760} cy={420 - Math.sin(sunA * Math.PI) * 300} r={50} fill="#ffe2a0" />
          <rect x={150} y={520} width={660} height={300} fill="#8a6a50" />
          {[...Array(4)].map((_, i) => <rect key={i} x={200 + i * 150} y={590} width={60} height={90} rx={26} fill="#3a2a22" />)}
          <rect x={0} y={820} width={958} height={260} fill="#9a8466" />
          <Figure costume="guard" pose={{ ...idle(frame), lean: 20 + Math.sin(frame / 20) * 10, head: 10 }} x={440} y={900} scale={0.9} />
        </svg>
        <div style={{ position: "absolute", left: 40, right: 40, top: 60, fontFamily: FONT_TITLE, fontSize: 36, lineHeight: 1.25, color: "#2a1d14", textAlign: "center" }}>{left}</div>
      </div>
      <div style={{ position: "absolute", left: 962, top: 0, width: 958, height: 1080, overflow: "hidden" }}>
        <svg width={958} height={1080}>
          <rect width={958} height={1080} fill="#2f3b55" />
          <rect x={0} y={0} width={958} height={420} fill="#f2b880" opacity={0.5} />
          <rect x={120} y={520} width={660} height={300} fill="#4a3a3a" />
          <rect x={0} y={820} width={958} height={260} fill="#3a3030" />
          <Figure costume="guard" pose={{ ...idle(frame), shR: kf(frame, [[20, 0], [35, 150]]), shL: kf(frame, [[20, 0], [35, 140]]), brow: 1, mouth: 1 }} x={kf(frame, [[0, 900], [30, 470]])} y={900} scale={0.9} facing={-1} />
        </svg>
        <div style={{ position: "absolute", left: 40, right: 40, top: 60, fontFamily: FONT_TITLE, fontSize: 36, lineHeight: 1.25, color: "#f2e8d6", textAlign: "center" }}>{right}</div>
      </div>
      <div style={{ position: "absolute", left: 958, top: 0, width: 4, height: 1080, background: C.parchment }} />
    </AbsoluteFill>
  );
};

const Card: React.FC<{ x: number; y: number; w: number; h: number; title: string; sub?: string; show: number; rot?: number }> = ({ x, y, w, h, title, sub, show, rot = 0 }) => (
  <g opacity={show} transform={`translate(${x} ${y}) rotate(${rot}) scale(${0.85 + 0.15 * show})`}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={C.parchment} stroke={C.parchmentDark} strokeWidth={4} />
    <circle cx={0} cy={-h / 2 + 14} r={9} fill="#a02a20" />
    <text x={0} y={-6} textAnchor="middle" fontFamily={FONT_TITLE} fontSize={30} fill={C.ink}>{title}</text>
    {sub && <text x={0} y={34} textAnchor="middle" fontFamily={FONT_BODY} fontSize={24} fill={C.ink} opacity={0.8}>{sub}</text>}
  </g>
);

export const EvidenceBoard: React.FC<{ beat: "intro" | "letter" | "histories" | "insidehelp" | "unknown" }> = ({ beat }) => {
  const { frame } = useShot();
  const order = ["intro", "letter", "histories", "insidehelp", "unknown"];
  const level = order.indexOf(beat);
  const showAt = (lv: number, a = 0) => (level > lv ? 1 : level === lv ? prog(frame, a, a + 20) : 0);
  const thread = (x1: number, y1: number, x2: number, y2: number, s: number) => <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * s} y2={y1 + (y2 - y1) * s} stroke="#b02a22" strokeWidth={4} />;
  const dim = beat === "unknown" ? prog(frame, 20, 90) * 0.45 : 0;
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <rect x={-800} y={-600} width={W + 1600} height={H + 1200} fill="#3a2a1e" />
        {[...Array(30)].map((_, i) => <line key={i} x1={-800} y1={-600 + i * 70} x2={W + 800} y2={-600 + i * 70} stroke="#33251a" strokeWidth={6} />)}
      </Layer>
      <Layer depth={1}>
        {thread(960, 560, 560, 240, showAt(1, 10))}
        {thread(960, 560, 560, 860, showAt(2, 10))}
        {thread(960, 560, 1360, 860, showAt(2, 25))}
        {thread(960, 560, 1400, 250, showAt(3, 10))}
        {thread(1400, 250, 1560, 560, showAt(3, 30))}
        <g transform="translate(960 560)">
          <rect x={-150} y={-150} width={300} height={300} rx={6} fill={C.parchment} stroke={C.parchmentDark} strokeWidth={4} />
          <Basket x={0} y={90} s={1.3} />
          <circle cx={0} cy={-136} r={10} fill="#a02a20" />
        </g>
        <Card x={560} y={240} w={420} h={150} title="Letter from Agra" sub="3 September 1666" show={showAt(1)} rot={-3} />
        <Card x={560} y={860} w={420} h={150} title="Maasir-i-Alamgiri" sub="Mughal court history, c. 1710" show={showAt(2)} rot={2} />
        <Card x={1360} y={860} w={420} h={150} title="Sabhasad Bakhar" sub="Maratha chronicle, c. 1694" show={showAt(2, 15)} rot={-2} />
        <Card x={1400} y={250} w={380} h={150} title="Ram Singh ?" sub="suspected of helping" show={showAt(3)} rot={3} />
        <Card x={1560} y={560} w={380} h={150} title="Niccolao Manucci" sub="claims Ram Singh arranged it" show={showAt(3, 25)} rot={-4} />
        {beat === "unknown" && <text x={960} y={330} textAnchor="middle" fontFamily={FONT_TITLE} fontSize={200} fill="#f3e3c0" opacity={prog(frame, 30, 60)}>?</text>}
      </Layer>
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: "#000", opacity: dim }} />}
    </AbsoluteFill>
  );
};

export const RankLoss: React.FC = () => {
  const { frame, duration } = useShot();
  const crack = prog(frame, duration * 0.2, duration * 0.4);
  const fall = prog(frame, duration * 0.62, duration * 0.95);
  return (
    <AbsoluteFill>
      <Layer depth={0.3}>
        <Paper dark />
      </Layer>
      <Layer depth={1}>
        <g transform={`translate(700 ${480 + fall * 500}) rotate(${fall * 40})`} opacity={1 - fall * 0.7}>
          <circle cx={0} cy={0} r={150} fill={C.gold} stroke={C.goldDeep} strokeWidth={12} />
          <circle cx={0} cy={0} r={100} fill="#9e2b2b" />
          <text x={0} y={18} textAnchor="middle" fontFamily={FONT_TITLE} fontSize={46} fill={C.gold}>RANK</text>
          {crack > 0 && <path d={`M-20,-150 L10,-60 L-20,0 L20,60 L0,150`} stroke="#1a1210" strokeWidth={8} fill="none" strokeDasharray="400" strokeDashoffset={400 * (1 - crack)} />}
        </g>
        <g transform="translate(1300 480)">
          {[...Array(9)].map((_, i) => {
            const fade = prog(frame, duration * 0.3 + i * 4, duration * 0.45 + i * 4);
            return <rect key={i} x={-180 + (i % 3) * 125} y={-180 + Math.floor(i / 3) * 125} width={115} height={115} fill={C.mughalGreen} opacity={1 - fade * 0.85} stroke={C.parchment} strokeWidth={3} />;
          })}
          <text x={0} y={250} textAnchor="middle" fontFamily={FONT_TITLE} fontSize={40} fill="#e8dcc4">LANDS</text>
        </g>
      </Layer>
    </AbsoluteFill>
  );
};
