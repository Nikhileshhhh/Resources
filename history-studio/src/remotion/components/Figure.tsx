import React from "react";
import { C } from "../theme";

/**
 * Parametric 2D character rig (original vector art). Feet at (0,0); ~340 units tall at scale 1; faces right.
 * Angles in degrees: 0 = limb hanging straight down, positive = rotated forward (toward facing direction).
 */
export interface Pose {
  lean?: number; // torso lean forward
  head?: number; // head nod forward
  hipL?: number; kneeL?: number; hipR?: number; kneeR?: number; // L = far leg, R = near leg
  shL?: number; elL?: number; shR?: number; elR?: number; // L = far arm, R = near arm
  crouch?: number; // 0..1 lowers the hips (kneeling/crouching)
  brow?: number; // -1 angry .. 0 neutral .. 1 raised
  blink?: number; // 0 open .. 1 closed
  mouth?: number; // 0 closed .. 1 open
  breathe?: number; // -1..1 chest scale
  sway?: number; // skirt sway -1..1
}

export interface Costume {
  skin: string;
  jama: string; // main robe
  trim: string;
  sash?: string;
  pants: string;
  turban: "pagadi" | "mughal" | "rajput" | "helmet" | "cloth" | "cap" | "hat" | "none" | "veil";
  turbanColor: string;
  plume?: boolean;
  crown?: boolean | "coronation"; // royal jewelled headpiece on the turban (Shivaji Maharaj); "coronation" adds the tall ceremonial crown of 1674
  beard?: "full" | "short" | "white" | "grey" | "none";
  moustache?: boolean;
  hair?: string;
  skirt?: "long" | "knee" | "dhoti" | "coat";
  necklace?: boolean;
  bracelet?: boolean;
  ash?: boolean; // ascetic ash-grey skin
  sacredThread?: boolean;
  bareChest?: boolean;
  child?: boolean;
  weapon?: "sword" | "spear" | "staff" | "none";
}

const SK = C.skin;
export const COSTUMES: Record<string, Costume> = {
  shivaji: { skin: C.skinLight, jama: C.white, trim: C.gold, sash: C.saffron, pants: "#e9e2d0", turban: "pagadi", turbanColor: C.saffron, plume: true, crown: true, beard: "short", moustache: true, hair: "#1c1410", skirt: "long", necklace: true, bracelet: true, weapon: "sword" },
  shivaji_ascetic: { skin: "#9c948a", jama: "#cfa35a", trim: "#cfa35a", pants: "#cfa35a", turban: "none", turbanColor: "#000", beard: "none", moustache: false, hair: "#3a3530", skirt: "dhoti", ash: true, bareChest: true, weapon: "staff" },
  sambhaji: { skin: C.skinLight, jama: "#f1e2a6", trim: C.gold, sash: C.saffron, pants: "#efe7d4", turban: "pagadi", turbanColor: C.saffron, beard: "none", skirt: "long", child: true, necklace: true },
  sambhaji_brahmin: { skin: C.skinLight, jama: C.white, trim: C.white, pants: C.white, turban: "none", turbanColor: "#000", beard: "none", skirt: "dhoti", child: true, sacredThread: true, bareChest: true, hair: "#1c1410" },
  aurangzeb: { skin: C.skinLight, jama: C.white, trim: "#d9d2c0", sash: "#d9d2c0", pants: "#f1ece0", turban: "mughal", turbanColor: C.white, beard: "grey", moustache: true, skirt: "long", necklace: true },
  aurangzeb_old: { skin: C.skinLight, jama: C.white, trim: "#d9d2c0", pants: "#f1ece0", turban: "mughal", turbanColor: C.white, beard: "white", moustache: true, skirt: "long" },
  ramsingh: { skin: SK, jama: "#9e2b2b", trim: C.gold, sash: C.gold, pants: "#f0e6cf", turban: "rajput", turbanColor: C.gold, beard: "none", moustache: true, skirt: "long", necklace: true, weapon: "sword" },
  jaisingh: { skin: SK, jama: "#2f6b6b", trim: C.gold, sash: "#d9c27a", pants: "#efe7d4", turban: "helmet", turbanColor: "#8d949b", beard: "none", moustache: true, hair: "#9a9a9a", skirt: "long", weapon: "sword" },
  jaswant: { skin: SK, jama: "#6d2238", trim: C.gold, sash: C.gold, pants: "#efe7d4", turban: "rajput", turbanColor: C.white, beard: "none", moustache: true, skirt: "long" },
  fuladkhan: { skin: C.skinDark, jama: "#5a4030", trim: "#b08a4a", sash: "#2b2b2b", pants: "#d8ccb0", turban: "mughal", turbanColor: "#8a2a1e", beard: "full", moustache: true, hair: "#141010", skirt: "long", weapon: "sword" },
  guard: { skin: C.skinDark, jama: "#7a6a4a", trim: "#5a4d33", sash: "#3b3326", pants: "#d0c4a4", turban: "mughal", turbanColor: "#8a2a1e", beard: "short", moustache: true, skirt: "knee", weapon: "spear" },
  rajputguard: { skin: SK, jama: "#b5762c", trim: "#7a4d16", sash: "#7a2020", pants: "#e3d7b8", turban: "rajput", turbanColor: "#c23b2b", beard: "none", moustache: true, skirt: "knee", weapon: "spear" },
  porter: { skin: C.skinDark, jama: "#d8ccb0", trim: "#d8ccb0", pants: "#d8ccb0", turban: "cloth", turbanColor: "#e8e0cc", beard: "none", moustache: true, skirt: "dhoti", bareChest: true },
  official: { skin: SK, jama: "#3c4f6e", trim: C.gold, sash: "#b9a46a", pants: "#e3d7b8", turban: "mughal", turbanColor: "#e9dcc2", beard: "full", moustache: true, skirt: "long" },
  courtier: { skin: SK, jama: "#55606b", trim: "#a99a6a", sash: "#7c6a4a", pants: "#e3d7b8", turban: "mughal", turbanColor: "#d8cdb6", beard: "short", moustache: true, skirt: "long" },
  hiroji: { skin: C.skinLight, jama: C.white, trim: C.gold, sash: C.saffron, pants: "#e9e2d0", turban: "none", turbanColor: C.saffron, beard: "short", moustache: true, hair: "#1c1410", skirt: "long", bracelet: true },
  boy: { skin: SK, jama: "#e6d7b0", trim: "#e6d7b0", pants: "#e6d7b0", turban: "cloth", turbanColor: "#f0e8d6", beard: "none", skirt: "knee", child: true },
  brahmin: { skin: C.skinLight, jama: C.white, trim: C.white, pants: C.white, turban: "none", turbanColor: "#000", beard: "white", moustache: true, hair: "#d8d4cc", skirt: "dhoti", sacredThread: true, bareChest: true },
  ascetic: { skin: "#9c948a", jama: "#c9762e", trim: "#c9762e", pants: "#c9762e", turban: "none", turbanColor: "#000", beard: "grey", moustache: true, hair: "#5a5550", skirt: "dhoti", ash: true, bareChest: true, weapon: "staff" },
  european: { skin: "#d9a982", jama: "#2b2b33", trim: "#c9c2b0", sash: "#2b2b33", pants: "#2b2b33", turban: "hat", turbanColor: "#1e1e22", beard: "none", moustache: true, hair: "#3a2a1c", skirt: "coat" },
  scholar: { skin: SK, jama: "#e7e0cf", trim: "#e7e0cf", pants: "#e7e0cf", turban: "none", turbanColor: "#000", beard: "none", moustache: true, hair: "#c9c4bb", skirt: "long" },
  spy: { skin: C.skinDark, jama: "#3a3a3a", trim: "#3a3a3a", pants: "#3a3a3a", turban: "cloth", turbanColor: "#2a2a2a", beard: "short", moustache: true, skirt: "knee" },
  rider: { skin: C.skinDark, jama: "#6a5a3a", trim: "#4a3d26", sash: "#7a2020", pants: "#cfc2a2", turban: "mughal", turbanColor: "#c9bea6", beard: "short", moustache: true, skirt: "knee" },
};

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (x: number, y: number, ang: number, len: number) => [x + Math.sin(rad(ang)) * len, y + Math.cos(rad(ang)) * len] as const;

const Limb: React.FC<{ x1: number; y1: number; x2: number; y2: number; w: number; color: string; w2?: number }> = ({ x1, y1, x2, y2, w, color, w2 }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w2 ? (w + w2) / 2 : w} strokeLinecap="round" />
);

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

export const Figure: React.FC<{
  costume: Costume | keyof typeof COSTUMES;
  pose?: Pose;
  x?: number;
  y?: number;
  scale?: number;
  facing?: 1 | -1;
  silhouette?: string; // render as a flat silhouette of this colour
  holding?: "pole" | "letter" | "beads" | "quill" | "torch" | "robe" | "tray" | "none";
  opacity?: number;
}> = ({ costume, pose = {}, x = 0, y = 0, scale = 1, facing = 1, silhouette, holding = "none", opacity = 1 }) => {
  const c = typeof costume === "string" ? COSTUMES[costume] : costume;
  const P = { lean: 0, head: 0, hipL: -4, kneeL: 4, hipR: 4, kneeR: 2, shL: 6, elL: 10, shR: -4, elR: 12, crouch: 0, brow: 0, blink: 0, mouth: 0, breathe: 0, sway: 0, ...pose };
  const k = c.child ? 0.68 : 1;
  const S = (v: string) => silhouette ?? v;
  const skin = S(c.ash ? "#a39b90" : c.skin);
  const skinBack = S(shade(c.ash ? "#a39b90" : c.skin, 0.82));
  const thigh = 80;
  const shin = 74;
  const hipY = -150 + P.crouch * 60;
  // legs
  const [kLx, kLy] = pt(0, hipY, P.hipL, thigh);
  const [fLx, fLy] = pt(kLx, kLy, P.hipL - P.kneeL, shin);
  const [kRx, kRy] = pt(0, hipY, P.hipR, thigh);
  const [fRx, fRy] = pt(kRx, kRy, P.hipR - P.kneeR, shin);
  const pantsBack = S(shade(c.pants, 0.8));
  const torsoLen = 118;
  const shY = hipY - torsoLen + 12;
  const upper = 62;
  const fore = 58;
  const [eLx, eLy] = pt(-4, shY, P.shL, upper);
  const [hLx, hLy] = pt(eLx, eLy, P.shL + P.elL, fore);
  const [eRx, eRy] = pt(6, shY, P.shR, upper);
  const [hRx, hRy] = pt(eRx, eRy, P.shR + P.elR, fore);
  const sleeve = S(c.bareChest ? (c.ash ? "#a39b90" : c.skin) : c.jama);
  const sleeveBack = S(c.bareChest ? skinBack : shade(c.jama, 0.82));
  const skirtLen = c.skirt === "long" ? 110 : c.skirt === "knee" ? 82 : c.skirt === "coat" ? 95 : 70;
  const flare = c.skirt === "dhoti" ? 18 : c.skirt === "coat" ? 26 : 40;
  const sway = P.sway * 10;
  const headY = shY - 44;
  const eyeClose = Math.max(0, Math.min(1, P.blink));

  const Hand = ({ hx, hy, back }: { hx: number; hy: number; back?: boolean }) => <circle cx={hx} cy={hy} r={9.5} fill={back ? skinBack : skin} />;

  const heldItem = () => {
    switch (holding) {
      case "letter":
        return <rect x={hRx - 4} y={hRy - 26} width={30} height={38} rx={2} fill={S(C.parchment)} stroke={S(C.parchmentDark)} strokeWidth={2} transform={`rotate(-12 ${hRx} ${hRy})`} />;
      case "quill":
        return <path d={`M${hRx},${hRy} l26,-46 l4,2 l-24,48z`} fill={S("#f3eee2")} />;
      case "beads":
        return <circle cx={hRx + 2} cy={hRy + 14} r={10} fill="none" stroke={S("#6b4a2a")} strokeWidth={3} strokeDasharray="2 3" />;
      case "torch":
        return (
          <g>
            <line x1={hRx} y1={hRy + 20} x2={hRx + 6} y2={hRy - 50} stroke={S("#5a3c22")} strokeWidth={7} strokeLinecap="round" />
            {!silhouette && <ellipse cx={hRx + 7} cy={hRy - 62} rx={10} ry={18} fill={C.torch} />}
          </g>
        );
      case "robe":
        return <path d={`M${hRx - 30},${hRy - 6} q30,-14 60,0 l-6,30 q-24,8 -48,0z`} fill={S(C.gold)} stroke={S(C.goldDeep)} strokeWidth={2} />;
      case "tray":
        return (
          <g>
            <ellipse cx={hRx + 10} cy={hRy - 4} rx={34} ry={7} fill={S(C.goldDeep)} />
            {[...Array(7)].map((_, i) => <circle key={i} cx={hRx - 12 + i * 7} cy={hRy - 10 - (i % 2) * 4} r={4} fill={S(C.gold)} />)}
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * k * facing} ${scale * k})`} opacity={opacity}>
      {/* ground shadow */}
      {!silhouette && <ellipse cx={0} cy={2} rx={46} ry={8} fill="rgba(0,0,0,0.25)" />}
      {/* far leg */}
      <Limb x1={0} y1={hipY} x2={kLx} y2={kLy} w={26} w2={20} color={pantsBack} />
      <Limb x1={kLx} y1={kLy} x2={fLx} y2={fLy} w={20} w2={15} color={pantsBack} />
      <ellipse cx={fLx + 12} cy={fLy} rx={17} ry={7} fill={S(c.bareChest ? skinBack : "#3b2a1c")} />
      {/* far arm (behind torso) */}
      <g transform={`rotate(${P.lean} 0 ${hipY})`}>
        <Limb x1={-4} y1={shY} x2={eLx} y2={eLy} w={20} w2={17} color={sleeveBack} />
        <Limb x1={eLx} y1={eLy} x2={hLx} y2={hLy} w={16} w2={14} color={c.bareChest ? skinBack : sleeveBack} />
        <Hand hx={hLx} hy={hLy} back />
      </g>
      {/* near leg */}
      <Limb x1={0} y1={hipY} x2={kRx} y2={kRy} w={27} w2={21} color={S(c.pants)} />
      <Limb x1={kRx} y1={kRy} x2={fRx} y2={fRy} w={21} w2={16} color={S(c.pants)} />
      <ellipse cx={fRx + 12} cy={fRy} rx={17} ry={7} fill={S(c.bareChest ? skin : "#4a3524")} />
      {/* torso + skirt, rotated by lean around the hips */}
      <g transform={`rotate(${P.lean} 0 ${hipY})`}>
        {/* skirt */}
        <path
          d={`M-22,${hipY - 14} L22,${hipY - 14} L${flare + sway},${hipY - 14 + skirtLen} Q${sway},${hipY - 6 + skirtLen + 8} ${-flare + sway},${hipY - 14 + skirtLen} Z`}
          fill={S(c.skirt === "dhoti" ? c.pants : c.jama)}
        />
        {c.skirt !== "dhoti" && <path d={`M${flare + sway},${hipY - 14 + skirtLen} Q${sway},${hipY - 6 + skirtLen + 8} ${-flare + sway},${hipY - 14 + skirtLen}`} fill="none" stroke={S(c.trim)} strokeWidth={5} />}
        {/* torso */}
        <g transform={`translate(0 ${hipY}) scale(1 ${1 + (P.breathe ?? 0) * 0.012}) translate(0 ${-hipY})`}>
          <path d={`M-21,${hipY - 8} Q-26,${shY + 30} -18,${shY - 4} Q0,${shY - 14} 20,${shY - 4} Q28,${shY + 30} 22,${hipY - 8} Z`} fill={S(c.bareChest ? (c.ash ? "#a39b90" : c.skin) : c.jama)} />
          {!c.bareChest && <path d={`M-6,${shY - 6} Q8,${shY + 26} 20,${shY + 36}`} fill="none" stroke={S(c.trim)} strokeWidth={4} />}
          {c.sacredThread && <path d={`M-14,${shY} L18,${hipY - 20}`} stroke={S("#f5f0e0")} strokeWidth={2.5} />}
          {c.sash && <rect x={-23} y={hipY - 22} width={46} height={14} rx={6} fill={S(c.sash)} />}
          {c.sash && <path d={`M10,${hipY - 10} q6,26 -2,46 l8,0 q6,-22 0,-46z`} fill={S(c.sash)} />}
          {c.necklace && <path d={`M-12,${shY + 2} Q2,${shY + 22} 16,${shY + 2}`} fill="none" stroke={S("#f4ecd6")} strokeWidth={4} strokeDasharray="1 5" strokeLinecap="round" />}
          {c.weapon === "sword" && <path d={`M-18,${hipY - 14} q-30,40 -46,84`} stroke={S("#6b5a3a")} strokeWidth={7} fill="none" strokeLinecap="round" />}
        </g>
        {/* head */}
        <g transform={`rotate(${P.head} 2 ${shY - 6})`}>
          <rect x={-6} y={shY - 22} width={16} height={22} rx={6} fill={skin} />
          <ellipse cx={4} cy={headY} rx={22} ry={26} fill={skin} />
          {/* nose */}
          <path d={`M24,${headY - 6} q8,9 0,14 z`} fill={skin} />
          {/* ear */}
          <ellipse cx={-6} cy={headY + 2} rx={5} ry={8} fill={S(shade(c.skin, 0.9))} />
          {!silhouette && (
            <>
              {/* eye + brow */}
              <ellipse cx={15} cy={headY - 3} rx={3.6} ry={3.6 * (1 - eyeClose) + 0.4} fill="#1a1210" />
              <path d={`M9,${headY - 11 - P.brow * 3 + (P.brow < 0 ? 2 : 0)} L22,${headY - 11 - P.brow * 3 - (P.brow < 0 ? 3 : 0)}`} stroke="#1a1210" strokeWidth={3} strokeLinecap="round" />
              {/* mouth */}
              <path d={`M15,${headY + 13} q4,${2 + P.mouth * 4} 8,0`} stroke={shade(c.skin, 0.55)} strokeWidth={2} fill={P.mouth > 0.3 ? shade(c.skin, 0.4) : "none"} />
            </>
          )}
          {c.moustache && <path d={`M12,${headY + 9} q8,-4 14,1 q-6,5 -14,1z`} fill={S(c.beard === "white" ? "#eeeae2" : c.beard === "grey" ? "#6f6a64" : c.hair ?? "#1c1410")} />}
          {c.beard && c.beard !== "none" && (
            <path
              d={`M-12,${headY + 4} Q-10,${headY + (c.beard === "short" ? 30 : 40)} 8,${headY + (c.beard === "short" ? 32 : 44)} Q24,${headY + (c.beard === "short" ? 28 : 36)} 25,${headY + 14} Q14,${headY + 20} 8,${headY + 16} Q-2,${headY + 18} -12,${headY + 4}Z`}
              fill={S(c.beard === "white" ? "#eeeae2" : c.beard === "grey" ? "#5f5a55" : c.hair ?? "#1c1410")}
            />
          )}
          {/* hair / headgear */}
          {c.turban === "none" && <path d={`M-18,${headY - 4} Q-16,${headY - 30} 6,${headY - 28} Q22,${headY - 26} 24,${headY - 14} Q8,${headY - 22} -18,${headY - 4}z`} fill={S(c.hair ?? "#1c1410")} />}
          {c.turban === "pagadi" && (
            <g>
              <path d={`M-22,${headY - 6} Q-26,${headY - 40} 4,${headY - 44} Q32,${headY - 44} 28,${headY - 10} Q4,${headY - 20} -22,${headY - 6}z`} fill={S(c.turbanColor)} />
              <path d={`M-20,${headY - 18} Q4,${headY - 34} 27,${headY - 22}`} stroke={S(shade(c.turbanColor, 0.75))} strokeWidth={3} fill="none" />
              <path d={`M-20,${headY - 28} Q4,${headY - 42} 24,${headY - 32}`} stroke={S(shade(c.turbanColor, 0.75))} strokeWidth={3} fill="none" />
              {c.plume && <path d={`M14,${headY - 42} q10,-30 -2,-44 q16,16 6,46z`} fill={S("#f4ecd6")} />}
              {c.plume && <circle cx={14} cy={headY - 40} r={4} fill={S(C.gold)} />}
            </g>
          )}
          {c.turban === "mughal" && (
            <g>
              <path d={`M-22,${headY - 8} Q-28,${headY - 44} 2,${headY - 46} Q30,${headY - 46} 27,${headY - 10} Q2,${headY - 18} -22,${headY - 8}z`} fill={S(c.turbanColor)} />
              <path d={`M-18,${headY - 22} Q2,${headY - 30} 25,${headY - 20} M-14,${headY - 34} Q4,${headY - 40} 22,${headY - 32}`} stroke={S(shade(c.turbanColor, 0.8))} strokeWidth={2.5} fill="none" />
            </g>
          )}
          {c.turban === "rajput" && (
            <g>
              <path d={`M-22,${headY - 6} Q-24,${headY - 38} -2,${headY - 50} Q30,${headY - 50} 28,${headY - 12} Q4,${headY - 20} -22,${headY - 6}z`} fill={S(c.turbanColor)} />
              <path d={`M-24,${headY - 10} q-14,10 -10,36 l6,0 q-2,-22 8,-30z`} fill={S(c.turbanColor)} />
              <path d={`M-18,${headY - 22} Q4,${headY - 36} 26,${headY - 24}`} stroke={S(shade(c.turbanColor, 0.75))} strokeWidth={3} fill="none" />
            </g>
          )}
          {c.turban === "helmet" && (
            <g>
              <path d={`M-22,${headY - 6} Q-22,${headY - 46} 4,${headY - 48} Q30,${headY - 46} 28,${headY - 8} Z`} fill={S(c.turbanColor)} />
              <line x1={4} y1={headY - 48} x2={4} y2={headY - 66} stroke={S(c.turbanColor)} strokeWidth={4} />
              <path d={`M-22,${headY - 8} l-6,30 l8,0z`} fill={S("#6d7378")} />
            </g>
          )}
          {c.turban === "cloth" && <path d={`M-20,${headY - 8} Q-22,${headY - 34} 4,${headY - 36} Q28,${headY - 34} 26,${headY - 12} Q2,${headY - 18} -20,${headY - 8}z`} fill={S(c.turbanColor)} />}
          {c.turban === "hat" && (
            <g>
              <ellipse cx={4} cy={headY - 22} rx={38} ry={8} fill={S(c.turbanColor)} />
              <path d={`M-16,${headY - 22} Q-14,${headY - 52} 4,${headY - 52} Q24,${headY - 52} 24,${headY - 22}z`} fill={S(c.turbanColor)} />
            </g>
          )}
          {c.turban === "veil" && <path d={`M-26,${headY + 30} Q-30,${headY - 46} 4,${headY - 44} Q34,${headY - 40} 30,${headY + 20}`} fill={S(c.turbanColor)} />}
        </g>
        {/* near arm (in front of torso) */}
        <Limb x1={6} y1={shY} x2={eRx} y2={eRy} w={21} w2={18} color={sleeve} />
        <Limb x1={eRx} y1={eRy} x2={hRx} y2={hRy} w={17} w2={15} color={c.bareChest ? skin : sleeve} />
        {c.bracelet && <circle cx={hRx - (hRx - eRx) * 0.12} cy={hRy - (hRy - eRy) * 0.12} r={9} fill="none" stroke={S(C.gold)} strokeWidth={4} />}
        <Hand hx={hRx} hy={hRy} />
        {c.weapon === "spear" && holding === "none" && <line x1={hRx} y1={hRy + 60} x2={hRx + 4} y2={hRy - 190} stroke={S("#5a4630")} strokeWidth={6} />}
        {c.weapon === "spear" && holding === "none" && <path d={`M${hRx + 4},${hRy - 190} l-7,0 l7,-26 l7,26z`} fill={S("#9aa3aa")} />}
        {c.weapon === "staff" && holding === "none" && <line x1={hRx} y1={hRy + 120} x2={hRx + 2} y2={hRy - 110} stroke={S("#6b4a2a")} strokeWidth={7} strokeLinecap="round" />}
        {heldItem()}
      </g>
    </g>
  );
};

/** Walk cycle pose for phase (in cycles). speed 1 = normal walk. */
export function walkPose(phase: number, amp = 1): Pose {
  const s = Math.sin(phase * Math.PI * 2);
  const c2 = Math.cos(phase * Math.PI * 2);
  return {
    hipR: 24 * s * amp,
    kneeR: Math.max(0, -c2) * 30 * amp + 4,
    hipL: -24 * s * amp,
    kneeL: Math.max(0, c2) * 30 * amp + 4,
    shR: -20 * s * amp,
    elR: 14,
    shL: 20 * s * amp,
    elL: 14,
    lean: 3 * amp,
    sway: -s * 0.6 * amp,
  };
}

/** Vertical bob for a walk cycle (add to y). */
export const walkBob = (phase: number, amp = 1) => -Math.abs(Math.sin(phase * Math.PI * 2)) * 6 * amp;

/** Natural idle: breathing + periodic blinks. */
export function idle(frame: number, seed = 0): Pose {
  const b = (frame + seed * 37) % 110;
  return { breathe: Math.sin((frame + seed * 13) / 22), blink: b < 3 ? 1 : b < 5 ? 0.5 : 0 };
}
