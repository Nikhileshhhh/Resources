import React, { useMemo } from "react";
import * as THREE from "three";
import { COSTUMES, type Costume } from "../../components/Figure";
import { Flame } from "../engine/fx";
import { Upright } from "../engine/env";

/**
 * Code-built 3D character (original): a joint hierarchy with sculpted costume pieces.
 * Units are metres. The root sits on the ground between the feet and faces +Z.
 * Pose angles are in degrees; "forward" is positive (toward the character's facing direction).
 * Left = the character's own left (+X when facing +Z).
 */
export interface Pose3 {
  x?: number; y?: number; z?: number; heading?: number; // root placement (heading: degrees about Y)
  drop?: number; // pelvis lowered (m), for crouch / kneel / sit
  pelvisTilt?: number; pelvisRoll?: number; pelvisTwist?: number; pelvisShift?: number;
  spine?: number; spineSide?: number; spineTwist?: number;
  chest?: number; breathe?: number;
  neck?: number; head?: number; headTurn?: number; headTilt?: number;
  hipL?: number; hipLAbd?: number; kneeL?: number; ankleL?: number;
  hipR?: number; hipRAbd?: number; kneeR?: number; ankleR?: number;
  shL?: number; shLAbd?: number; shLTwist?: number; elL?: number; wristL?: number;
  shR?: number; shRAbd?: number; shRTwist?: number; elR?: number; wristR?: number;
  blink?: number; brow?: number; jaw?: number; lookX?: number; lookY?: number;
  skirtFwd?: number; skirtSplay?: number; sway?: number; // cloth secondary motion
}

export type PropName = "torch" | "spear" | "sword" | "tray" | "beads" | "quill" | "letter" | "staff" | "pole" | "none";

export const D = Math.PI / 180;

import { BODY } from "./body";
export { BODY };

// ---------- caches ----------
const matCache = new Map<string, THREE.Material>();
export function mat(color: string, kind: "cloth" | "silk" | "skin" | "metal" | "gold" | "hair" | "wood" | "eye" | "basic" = "cloth"): THREE.Material {
  const key = color + kind;
  let m = matCache.get(key);
  if (m) return m;
  switch (kind) {
    case "silk":
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35) });
      break;
    case "skin":
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color("#e0a27a"), 0.18), roughness: 0.55, metalness: 0 });
      break;
    case "metal":
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.85 });
      break;
    case "gold":
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.95, emissive: new THREE.Color(color).multiplyScalar(0.06) });
      break;
    case "hair":
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      break;
    case "wood":
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      break;
    case "eye":
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.15 });
      break;
    case "basic":
      m = new THREE.MeshBasicMaterial({ color });
      break;
    default:
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
  }
  matCache.set(key, m);
  return m;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

/** Lathe with outward normals: profile points must run bottom → top, so descending profiles are reversed. */
const lathe = (key: string, pts: [number, number][], seg = 32) =>
  geo(key, () => {
    const ordered = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
    return new THREE.LatheGeometry(ordered.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  });
const capsule = (r: number, len: number) => geo(`cap${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14));
const sphere = (r: number, w = 20, h = 14) => geo(`sph${r}_${w}`, () => new THREE.SphereGeometry(r, w, h));
const cyl = (rt: number, rb: number, h: number, s = 16) => geo(`cyl${rt}_${rb}_${h}_${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const torus = (r: number, t: number) => geo(`tor${r}_${t}`, () => new THREE.TorusGeometry(r, t, 10, 30));
const box = (x: number, y: number, z: number) => geo(`box${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));
const cone = (r: number, h: number, s = 14) => geo(`cone${r}_${h}`, () => new THREE.ConeGeometry(r, h, s));

// Robe profiles (radius, y) relative to the waist
const SKIRTS: Record<string, [number, number][]> = {
  long: [[0.0, 0.02], [0.155, 0.02], [0.17, -0.12], [0.21, -0.38], [0.27, -0.66], [0.31, -0.8], [0.305, -0.815]],
  knee: [[0.0, 0.02], [0.155, 0.02], [0.17, -0.12], [0.205, -0.3], [0.24, -0.45], [0.235, -0.465]],
  dhoti: [[0.0, 0.02], [0.15, 0.02], [0.165, -0.12], [0.18, -0.3], [0.175, -0.5], [0.165, -0.62], [0.16, -0.63]],
  coat: [[0.0, 0.02], [0.155, 0.02], [0.17, -0.15], [0.2, -0.4], [0.215, -0.55], [0.21, -0.56]],
};
const TORSO: [number, number][] = [[0.0, -0.02], [0.15, -0.02], [0.148, 0.08], [0.17, 0.2], [0.19, 0.33], [0.185, 0.42], [0.15, 0.47], [0.075, 0.5], [0.05, 0.52], [0.0, 0.52]];

export interface CharacterProps {
  costume: string | Costume;
  pose: Pose3;
  /** Overall scale (1 = adult ~1.72 m). Child presets scale automatically. */
  scale?: number;
  right?: PropName;
  left?: PropName;
  frame?: number; // for flames and blinks
  lod?: "hi" | "lo";
  shadows?: boolean;
  seed?: number;
}

const toRadX = (fwdDeg = 0) => -fwdDeg * D;

/** The character itself. Stateless: everything comes from props, so any frame renders identically. */
export const Character3D: React.FC<CharacterProps> = ({ costume, pose: p, scale = 1, right = "none", left = "none", frame = 0, lod = "hi", shadows = true, seed = 0 }) => {
  const c: Costume = typeof costume === "string" ? COSTUMES[costume] ?? COSTUMES.courtier : costume;
  const s = scale * (c.child ? 0.72 : 1);
  const hi = lod === "hi";
  const robe = c.bareChest ? c.pants : c.jama;
  const robeMat = mat(robe, c.jama === "#f6f1e6" || c.trim === "#d8b25a" ? "silk" : "cloth");
  const skin = mat(c.ash ? "#9c948a" : c.skin, "skin");
  const pants = mat(c.pants);
  const trim = mat(c.trim, c.trim === "#d8b25a" ? "gold" : "cloth");
  const hair = mat(c.hair ?? "#1c1410", "hair");
  const beardCol = c.beard === "white" ? "#e8e4dc" : c.beard === "grey" ? "#9a958c" : c.hair ?? "#1c1410";
  const skirtKind = c.skirt ?? "long";
  const sh = shadows;

  const breathe = 1 + (p.breathe ?? 0) * 0.025;
  const blink = Math.min(1, Math.max(0, p.blink ?? 0));
  const leg = (side: 1 | -1) => {
    const hip = side === 1 ? p.hipL : p.hipR;
    const abd = side === 1 ? p.hipLAbd : p.hipRAbd;
    const knee = side === 1 ? p.kneeL : p.kneeR;
    const ankle = side === 1 ? p.ankleL : p.ankleR;
    return (
      <group position={[side * BODY.hipW, 0, 0]} rotation={[toRadX(hip), 0, side * (abd ?? 0) * D]}>
        <mesh geometry={capsule(0.068, BODY.thigh - 0.1)} material={pants} position={[0, -BODY.thigh / 2, 0]} castShadow={sh} />
        <group position={[0, -BODY.thigh, 0]} rotation={[(knee ?? 0) * D, 0, 0]}>
          <mesh geometry={capsule(0.05, BODY.shin - 0.08)} material={pants} position={[0, -BODY.shin / 2, 0]} castShadow={sh} />
          <group position={[0, -BODY.shin, 0]} rotation={[toRadX(ankle), 0, 0]}>
            {/* mojari shoe with a curled toe */}
            <mesh geometry={capsule(0.04, 0.13)} material={mat("#5a3a22")} position={[0, -0.035, 0.06]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.75]} castShadow={sh} />
            {hi && <mesh geometry={cone(0.018, 0.06)} material={mat(c.trim === "#d8b25a" ? "#b48a3a" : "#5a3a22")} position={[0, -0.02, 0.165]} rotation={[-0.9, 0, 0]} />}
          </group>
        </group>
      </group>
    );
  };

  const arm = (side: 1 | -1) => {
    const L = side === 1;
    const fl = L ? p.shL : p.shR;
    const ab = L ? p.shLAbd : p.shRAbd;
    const tw = L ? p.shLTwist : p.shRTwist;
    const el = L ? p.elL : p.elR;
    const wr = L ? p.wristL : p.wristR;
    const prop = L ? left : right;
    return (
      <group position={[side * BODY.shW, 0.4, 0]} rotation={[toRadX(fl), side * (tw ?? 0) * D, side * (8 + (ab ?? 0)) * D]} rotation-order="YXZ">
        <mesh geometry={capsule(c.bareChest ? 0.046 : 0.064, BODY.upper - 0.08)} material={c.bareChest ? skin : robeMat} position={[0, -BODY.upper / 2, 0]} castShadow={sh} />
        <mesh geometry={sphere(c.bareChest ? 0.045 : 0.062, 14, 10)} material={c.bareChest ? skin : robeMat} position={[0, -BODY.upper, 0]} />
        <group position={[0, -BODY.upper, 0]} rotation={[toRadX(el), 0, 0]}>
          <mesh geometry={geo(`fore${c.bareChest}`, () => new THREE.CylinderGeometry(c.bareChest ? 0.036 : 0.05, c.bareChest ? 0.042 : 0.058, BODY.fore, 14))} material={c.bareChest ? skin : robeMat} position={[0, -BODY.fore / 2, 0]} castShadow={sh} />
          {hi && !c.bareChest && <mesh geometry={torus(0.045, 0.012)} material={trim} position={[0, -BODY.fore + 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} />}
          {c.bracelet && <mesh geometry={torus(0.04, 0.01)} material={mat("#d8b25a", "gold")} position={[0, -BODY.fore + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} />}
          <group position={[0, -BODY.fore - 0.01, 0]} rotation={[toRadX(wr), 0, 0]}>
            <mesh geometry={sphere(0.05, 14, 10)} material={skin} position={[0, -0.05, 0.005]} scale={[0.85, 1.25, 0.6]} castShadow={sh} />
            {hi && <mesh geometry={capsule(0.013, 0.035)} material={skin} position={[-side * 0.03, -0.035, 0.025]} rotation={[0.5, 0, side * 0.5]} />}
            <Prop name={prop} frame={frame} seed={seed + (L ? 7 : 3)} />
          </group>
        </group>
      </group>
    );
  };

  const fwd = Math.max(p.hipL ?? 0, p.hipR ?? 0, 0);
  const skirtScaleZ = 1 + Math.min(0.55, (fwd / 60) * 0.5) + (p.skirtFwd ?? 0);
  const splay = p.skirtSplay ?? 0;

  return (
    <group position={[p.x ?? 0, p.y ?? 0, p.z ?? 0]} rotation={[0, (p.heading ?? 0) * D, 0]} scale={s}>
      {/* pelvis */}
      <group position={[p.pelvisShift ?? 0, BODY.hip - (p.drop ?? 0), 0]} rotation={[toRadX(p.pelvisTilt), (p.pelvisTwist ?? 0) * D, (p.pelvisRoll ?? 0) * D]}>
        {leg(1)}
        {leg(-1)}
        {/* lower robe (jama skirt / dhoti) with secondary sway */}
        <group position={[0, 0.06, 0]} rotation={[(p.sway ?? 0) * 0.06 * D * 10, 0, (p.sway ?? 0) * 0.03]} scale={[1 + splay * 0.6, 1 - splay * 0.45, skirtScaleZ + splay * 0.6]}>
          <mesh geometry={lathe(`skirt-${skirtKind}`, SKIRTS[skirtKind])} material={skirtKind === "dhoti" ? pants : robeMat} castShadow={sh} receiveShadow />
          {hi && skirtKind !== "dhoti" && <mesh geometry={torus(SKIRTS[skirtKind][SKIRTS[skirtKind].length - 2][0], 0.012)} material={trim} position={[0, SKIRTS[skirtKind][SKIRTS[skirtKind].length - 2][1], 0]} rotation={[Math.PI / 2, 0, 0]} />}
        </group>
        {/* spine */}
        <group position={[0, 0.02, 0]} rotation={[toRadX(p.spine), (p.spineTwist ?? 0) * D, (p.spineSide ?? 0) * D]}>
          <mesh geometry={lathe("torso", TORSO)} material={c.bareChest ? skin : robeMat} scale={[1, 1, 0.74 * breathe]} castShadow={sh} receiveShadow />
          {c.sash && <mesh geometry={torus(0.17, 0.034)} material={mat(c.sash)} position={[0, 0.045, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]} castShadow={sh} />}
          {c.sash && hi && <mesh geometry={box(0.075, 0.32, 0.02)} material={mat(c.sash)} position={[0.06, -0.12, 0.16]} rotation={[-0.12 - (p.sway ?? 0) * 0.12, 0, 0.05]} castShadow={sh} />}
          {hi && !c.bareChest && <mesh geometry={torus(0.068, 0.014)} material={trim} position={[0, 0.49, 0]} rotation={[Math.PI / 2 + 0.2, 0, 0]} />}
          {hi && !c.bareChest && <mesh geometry={geo("placket", () => new THREE.TorusGeometry(0.2, 0.011, 6, 20, Math.PI / 2.6))} material={trim} position={[0.02, 0.2, 0.0]} rotation={[0.08, 0.1, 1.95]} scale={[1, 1, 0.74]} />}
          {c.sacredThread && <mesh geometry={torus(0.17, 0.006)} material={mat("#f3ead2")} position={[0, 0.25, 0]} rotation={[Math.PI / 2 - 0.2, 0.55, 0]} scale={[1, 0.75, 1]} />}
          {c.necklace && <mesh geometry={torus(0.075, 0.011)} material={mat("#d8b25a", "gold")} position={[0, 0.455, 0.035]} rotation={[Math.PI / 2 + 0.55, 0, 0]} />}
          {c.weapon === "sword" && right !== "sword" && left !== "sword" && <Scabbard />}
          {/* chest / shoulders */}
          <group position={[0, BODY.spine - 0.27, 0]} rotation={[toRadX(p.chest), 0, 0]}>
            {arm(1)}
            {arm(-1)}
            {/* neck + head */}
            <group position={[0, 0.5, 0]} rotation={[toRadX(p.neck), 0, 0]}>
              <mesh geometry={cyl(0.056, 0.064, 0.09)} material={skin} position={[0, 0.02, 0]} castShadow={sh} />
              <group position={[0, BODY.neck + 0.01, 0.008]} rotation={[toRadX(p.head), (p.headTurn ?? 0) * D, (p.headTilt ?? 0) * D]} rotation-order="YXZ" scale={1.22}>
                <Head c={c} skin={skin} hair={hair} beardCol={beardCol} blink={blink} brow={p.brow ?? 0} jaw={p.jaw ?? 0} lookX={p.lookX ?? 0} lookY={p.lookY ?? 0} hi={hi} sh={sh} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

/** Curved hair strand (moustache half, brow) as a tube through three points. */
const strand = (key: string, pts: [number, number, number][], r: number) =>
  geo(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 12, r, 6, false));

const Head: React.FC<{ c: Costume; skin: THREE.Material; hair: THREE.Material; beardCol: string; blink: number; brow: number; jaw: number; lookX: number; lookY: number; hi: boolean; sh: boolean }> = ({ c, skin, hair, beardCol, blink, brow, jaw, lookX, lookY, hi, sh }) => {
  const eyeWhite = mat("#f3eee4", "eye");
  const iris = mat("#3a2414", "eye");
  const pupil = mat("#0c0806", "eye");
  const lash = mat("#1a120c", "hair");
  const lip = mat(new THREE.Color(c.ash ? "#8a7f76" : c.skin).multiplyScalar(0.78).getStyle(), "skin");
  const bm = mat(beardCol, "hair");
  const full = c.beard === "full" || c.beard === "white" || c.beard === "grey";
  return (
    <group position={[0, 0.1, 0]}>
      {/* skull, jaw, cheekbones and chin */}
      <mesh geometry={sphere(0.104, 28, 20)} material={skin} scale={[0.9, 1.08, 1]} castShadow={sh} />
      <mesh geometry={sphere(0.072, 20, 14)} material={skin} position={[0, -0.052, 0.03]} scale={[1.02, 0.85, 1]} castShadow={sh} />
      {hi && [1, -1].map((sd) => <mesh key={sd} geometry={sphere(0.024, 12, 10)} material={skin} position={[sd * 0.05, -0.014, 0.066]} scale={[1, 0.75, 0.7]} />)}
      <mesh geometry={sphere(0.03, 12, 10)} material={skin} position={[0, -0.098, 0.068]} scale={[1.05, 0.85, 0.9]} />
      {/* nose: bridge and tip */}
      <mesh geometry={capsule(0.013, 0.035)} material={skin} position={[0, -0.006, 0.101]} rotation={[0.32, 0, 0]} />
      <mesh geometry={sphere(0.016, 12, 10)} material={skin} position={[0, -0.03, 0.109]} scale={[1.25, 0.85, 0.95]} />
      {hi && <mesh geometry={sphere(0.025, 10, 8)} material={skin} position={[0.094, 0, 0]} scale={[0.4, 1, 0.75]} />}
      {hi && <mesh geometry={sphere(0.025, 10, 8)} material={skin} position={[-0.094, 0, 0]} scale={[0.4, 1, 0.75]} />}
      {/* almond eyes: sclera, iris, pupil, catchlight, skin lid that blinks, dark upper lash line */}
      {[1, -1].map((sd) => (
        <group key={sd} position={[sd * 0.037, 0.014, 0.083]} rotation={[0, sd * 0.18, sd * -0.06]}>
          <mesh geometry={sphere(0.02, 16, 12)} material={eyeWhite} scale={[1.25, 0.7, 0.62]} />
          <mesh geometry={sphere(0.0105, 14, 10)} material={iris} position={[lookX * 0.008, lookY * 0.004, 0.0098]} scale={[1, 1, 0.45]} />
          <mesh geometry={sphere(0.0055, 10, 8)} material={pupil} position={[lookX * 0.008, lookY * 0.004, 0.0122]} scale={[1, 1, 0.4]} />
          {hi && <mesh geometry={sphere(0.0026, 6, 6)} material={mat("#ffffff", "basic")} position={[lookX * 0.008 + 0.004, lookY * 0.004 + 0.0035, 0.0145]} />}
          <mesh geometry={sphere(0.0215, 14, 8)} material={skin} position={[0, 0.0122 - blink * 0.0135, 0.001]} scale={[1.3, 0.26 + blink * 0.56, 0.7]} />
          <mesh geometry={strand("lashline", [[-0.024, -0.002, 0.004], [0, 0.009, 0.013], [0.024, 0.0, 0.004]], 0.0022)} material={lash} position={[0, 0.002 - blink * 0.01, 0]} />
          {/* brow: curved, thick, lifts and knits */}
          <mesh geometry={strand("brow", [[-0.026, -0.004, 0], [0, 0.006, 0.006], [0.028, -0.002, -0.004]], 0.0045)} material={hair} position={[0, 0.03 + brow * 0.006, 0.006]} rotation={[0, 0, sd * (0.08 - brow * 0.2)]} scale={[sd, 1, 1]} />
        </group>
      ))}
      {/* lips */}
      <mesh geometry={capsule(0.007, 0.026)} material={lip} position={[0, -0.059 - jaw * 0.006, 0.097]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={box(0.03, 0.002 + jaw * 0.014, 0.008)} material={mat("#3a1612")} position={[0, -0.0545 - jaw * 0.004, 0.099]} />
      {/* moustache: upturned at the ends (the Maratha style) */}
      {c.moustache &&
        [1, -1].map((sd) => (
          <mesh key={sd} geometry={strand("moust", [[0.002, 0, 0], [0.022, -0.008, -0.004], [0.04, 0.004, -0.014]], 0.0058)} material={bm} position={[0, -0.044, 0.104]} scale={[sd, 1, 1]} castShadow={sh} />
        ))}
      {/* beard: a pointed chin beard, plus a fuller jaw beard for "full" styles */}
      {c.beard && c.beard !== "none" && (
        <group>
          <mesh geometry={cone(0.026, full ? 0.09 : 0.06, 12)} material={bm} position={[0, full ? -0.12 : -0.112, 0.075]} rotation={[Math.PI + 0.35, 0, 0]} castShadow={sh} />
          {full && <mesh geometry={geo("jawbeard", () => new THREE.TorusGeometry(0.068, 0.018, 8, 20, Math.PI))} material={bm} position={[0, -0.06, 0.03]} rotation={[0.35, 0, Math.PI]} scale={[1.05, 1.15, 1]} />}
          {hi && !full && <mesh geometry={geo("jawline", () => new THREE.TorusGeometry(0.07, 0.006, 6, 20, Math.PI))} material={bm} position={[0, -0.058, 0.032]} rotation={[0.35, 0, Math.PI]} />}
        </group>
      )}
      <group position={[0, 0.02, 0]}>
        <Headwear c={c} hair={hair} sh={sh} hi={hi} />
      </group>
    </group>
  );
};

const Headwear: React.FC<{ c: Costume; hair: THREE.Material; sh: boolean; hi: boolean }> = ({ c, hair, sh, hi }) => {
  const m = mat(c.turbanColor, "silk");
  const fold = mat(new THREE.Color(c.turbanColor).multiplyScalar(0.82).getStyle(), "silk");
  switch (c.turban) {
    case "pagadi": // Maratha pagadi: rounded crown, layered wraps, a forward-swept crest and plume
      return (
        <group position={[0, 0.06, -0.005]}>
          <mesh geometry={sphere(0.112, 24, 16)} material={m} scale={[1.05, 0.74, 1.1]} castShadow={sh} />
          <mesh geometry={torus(0.1, 0.022)} material={fold} position={[0, -0.012, 0.004]} rotation={[Math.PI / 2 + 0.1, 0, 0]} scale={[1.02, 1.08, 1]} />
          <mesh geometry={torus(0.093, 0.024)} material={m} position={[0, 0.012, 0]} rotation={[Math.PI / 2 - 0.12, 0, 0.06]} />
          <mesh geometry={sphere(0.05, 14, 10)} material={fold} position={[0, 0.06, 0.055]} scale={[1, 0.8, 1.3]} castShadow={sh} />
          {c.plume && <mesh geometry={capsule(0.012, 0.12)} material={mat("#f8f4ea")} position={[0.03, 0.11, 0.02]} rotation={[-0.5, 0, -0.35]} />}
          {c.plume && !c.crown && <mesh geometry={box(0.026, 0.026, 0.008)} material={mat("#d8b25a", "gold")} position={[0.02, 0.04, 0.115]} />}
          {c.crown && <RoyalCrown sh={sh} hi={hi} />}
        </group>
      );
    case "mughal": // rounded Mughal turban with folds and an aigrette
      return (
        <group position={[0, 0.065, 0]}>
          <mesh geometry={sphere(0.118, 24, 16)} material={m} scale={[1.02, 0.85, 1.05]} castShadow={sh} />
          {[-0.04, -0.005, 0.03].map((y, i) => (
            <mesh key={i} geometry={torus(0.108 - i * 0.012, 0.02)} material={i % 2 ? m : fold} position={[0, y, 0]} rotation={[Math.PI / 2 + (i % 2 ? -0.2 : 0.2), 0, 0]} />
          ))}
          {hi && <mesh geometry={box(0.022, 0.03, 0.01)} material={mat("#d8b25a", "gold")} position={[0, 0.02, 0.12]} />}
          {hi && <mesh geometry={capsule(0.007, 0.09)} material={mat("#f8f4ea")} position={[0.01, 0.1, 0.1]} rotation={[-0.3, 0, -0.2]} />}
        </group>
      );
    case "rajput": // wide Rajput pagri with a tail at the back
      return (
        <group position={[0, 0.055, 0]}>
          <mesh geometry={sphere(0.122, 24, 16)} material={m} scale={[1.12, 0.66, 1.12]} castShadow={sh} />
          <mesh geometry={torus(0.118, 0.028)} material={fold} position={[0, -0.025, 0]} rotation={[Math.PI / 2 + 0.18, 0, 0]} />
          <mesh geometry={torus(0.11, 0.026)} material={m} position={[0, 0.015, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]} />
          {hi && <mesh geometry={box(0.06, 0.2, 0.02)} material={fold} position={[0.03, -0.12, -0.11]} rotation={[0.25, 0, 0.1]} castShadow={sh} />}
        </group>
      );
    case "helmet":
      return (
        <group position={[0, 0.05, 0]}>
          <mesh geometry={geo("helm", () => new THREE.SphereGeometry(0.118, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2))} material={mat(c.turbanColor, "metal")} castShadow={sh} />
          <mesh geometry={cone(0.015, 0.09)} material={mat(c.turbanColor, "metal")} position={[0, 0.15, 0]} />
          <mesh geometry={cyl(0.12, 0.13, 0.09, 20)} material={mat("#6f757b", "metal")} position={[0, -0.05, -0.01]} />
        </group>
      );
    case "cloth":
      return (
        <group position={[0, 0.05, 0]}>
          <mesh geometry={sphere(0.11, 20, 14)} material={m} scale={[1, 0.62, 1.02]} castShadow={sh} />
          <mesh geometry={torus(0.1, 0.024)} material={fold} position={[0, -0.015, 0]} rotation={[Math.PI / 2 + 0.1, 0, 0]} />
        </group>
      );
    case "hat":
      return (
        <group position={[0, 0.08, 0]}>
          <mesh geometry={cyl(0.1, 0.11, 0.1, 20)} material={mat(c.turbanColor)} />
          <mesh geometry={cyl(0.2, 0.2, 0.012, 24)} material={mat(c.turbanColor)} position={[0, -0.045, 0]} />
        </group>
      );
    default:
      return <mesh geometry={sphere(0.108, 20, 14)} material={hair} position={[0, 0.025, -0.01]} scale={[0.96, 0.92, 1]} castShadow={sh} />;
  }
};

/**
 * Shivaji Maharaj's royal headpiece over the saffron pagadi: a jewelled gold band studded with rubies and
 * emeralds, a tall gold sarpech with a central ruby at the front, a jigha (jewelled plume holder) carrying the
 * white kalgi, and two strands of pearls draped across the turban.
 */
const RoyalCrown: React.FC<{ sh: boolean; hi: boolean }> = ({ sh, hi }) => {
  const gold = mat("#e0b44c", "gold");
  const ruby = mat("#b0102a", "eye");
  const emerald = mat("#118a4e", "eye");
  const pearl = mat("#f6f1e4", "eye");
  return (
    <group>
      {/* gold band around the turban */}
      <mesh geometry={geo("crownband", () => new THREE.CylinderGeometry(0.123, 0.125, 0.03, 32, 1, true))} material={gold} position={[0, -0.01, 0.004]} scale={[1.03, 1, 1.09]} castShadow={sh} />
      <mesh geometry={torus(0.123, 0.005)} material={gold} position={[0, 0.005, 0.004]} rotation={[Math.PI / 2, 0, 0]} scale={[1.03, 1.09, 1]} />
      <mesh geometry={torus(0.125, 0.005)} material={gold} position={[0, -0.025, 0.004]} rotation={[Math.PI / 2, 0, 0]} scale={[1.03, 1.09, 1]} />
      {/* gems set into the band */}
      {Array.from({ length: hi ? 12 : 6 }, (_, i) => {
        const a = (i / (hi ? 12 : 6)) * Math.PI * 2;
        return <mesh key={i} geometry={sphere(0.0085, 8, 6)} material={i % 2 ? emerald : ruby} position={[Math.sin(a) * 0.129, -0.01, Math.cos(a) * 0.14]} />;
      })}
      {/* sarpech: tall jewelled ornament on the front */}
      <group position={[0, 0.012, 0.136]} rotation={[-0.18, 0, 0]}>
        <mesh geometry={geo("sarpech", () => new THREE.CylinderGeometry(0.004, 0.026, 0.11, 4, 1).scale(1, 1, 0.25))} material={gold} position={[0, 0.05, 0]} castShadow={sh} />
        <mesh geometry={sphere(0.017, 10, 8)} material={ruby} position={[0, 0.0, 0.008]} scale={[1, 1.25, 0.6]} />
        <mesh geometry={sphere(0.009, 8, 6)} material={emerald} position={[0, 0.045, 0.006]} scale={[1, 1.2, 0.6]} />
        {/* pearl drop beneath the ruby */}
        <mesh geometry={sphere(0.007, 8, 6)} material={pearl} position={[0, -0.028, 0.006]} />
      </group>
      {/* jigha holding the white kalgi plume */}
      <mesh geometry={capsule(0.008, 0.05)} material={gold} position={[0.022, 0.085, 0.07]} rotation={[-0.45, 0, -0.3]} />
      {/* two strands of pearls draped across the pagadi */}
      {hi &&
        [0, 1].map((k) =>
          Array.from({ length: 22 }, (_, i) => {
            const t = i / 21;
            const a = -1.1 + t * 2.2; // front-left to front-right across the face of the turban
            const sag = Math.sin(t * Math.PI) * (0.03 + k * 0.018);
            return <mesh key={`${k}-${i}`} geometry={sphere(0.0062, 6, 5)} material={pearl} position={[Math.sin(a) * 0.121, 0.042 - sag - k * 0.012, Math.cos(a) * 0.13]} />;
          }),
        )}
    </group>
  );
};

const Scabbard: React.FC = () => {
  const g = geo("scabbard", () => {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.35, -0.05), new THREE.Vector3(0, -0.72, -0.2));
    return new THREE.TubeGeometry(curve, 16, 0.02, 8, false);
  });
  return (
    <group position={[-0.17, 0.02, 0.06]} rotation={[0.55, 0, 0.12]}>
      <mesh geometry={g} material={mat("#3b2416")} castShadow />
      <mesh geometry={box(0.09, 0.015, 0.02)} material={mat("#d8b25a", "gold")} position={[0, 0.02, 0]} />
      <mesh geometry={capsule(0.016, 0.07)} material={mat("#d8b25a", "gold")} position={[0, 0.08, 0.01]} />
    </group>
  );
};

/** Hand-held props, positioned in the hand's local frame (the hand points down -Y). */
export const Prop: React.FC<{ name: PropName; frame: number; seed: number }> = ({ name, frame, seed }) => {
  switch (name) {
    case "torch":
      return (
        <group position={[0, -0.06, 0.02]}>
          <Upright tilt={[0.12, 0]}>
            <mesh geometry={cyl(0.018, 0.022, 0.6, 8)} material={mat("#4a3020", "wood")} position={[0, 0.18, 0]} castShadow />
            <mesh geometry={cyl(0.032, 0.026, 0.09, 10)} material={mat("#2a2018")} position={[0, 0.5, 0]} />
            <group position={[0, 0.58, 0]}>
              <Flame frame={frame} seed={seed} size={0.22} />
            </group>
          </Upright>
        </group>
      );
    case "spear":
      return (
        <group position={[0, -0.06, 0.01]}>
          <Upright tilt={[0.05, 0]}>
          <mesh geometry={cyl(0.014, 0.016, 2.3, 8)} material={mat("#5a4030", "wood")} position={[0, 0.55, 0]} castShadow />
          <mesh geometry={cone(0.03, 0.2, 8)} material={mat("#b8bcc0", "metal")} position={[0, 1.79, 0]} castShadow />
          <mesh geometry={cone(0.03, 0.05, 8)} material={mat("#7a2020")} position={[0, 1.66, 0]} rotation={[Math.PI, 0, 0]} />
          </Upright>
        </group>
      );
    case "sword":
      return (
        <group position={[0, -0.07, 0.02]} rotation={[Math.PI, 0, 0]}>
          <mesh geometry={box(0.1, 0.015, 0.02)} material={mat("#d8b25a", "gold")} />
          <mesh geometry={geo("blade", () => new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.4, 0.04), new THREE.Vector3(0, 0.78, 0.14)), 12, 0.012, 6))} material={mat("#c8ccd0", "metal")} castShadow />
        </group>
      );
    case "tray":
      return (
        <group position={[0, -0.09, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={cyl(0.17, 0.15, 0.025, 28)} material={mat("#d8b25a", "gold")} castShadow />
          {Array.from({ length: 14 }, (_, i) => (
            <mesh key={i} geometry={cyl(0.022, 0.022, 0.006, 12)} material={mat("#e8c45e", "gold")} position={[Math.cos(i * 2.4) * 0.09 * Math.sqrt(i / 14), 0.018 + (i % 3) * 0.006, Math.sin(i * 2.4) * 0.09 * Math.sqrt(i / 14)]} rotation={[0.2 * Math.sin(i), 0, 0.2 * Math.cos(i)]} />
          ))}
        </group>
      );
    case "beads":
      return <mesh geometry={torus(0.04, 0.008)} material={mat("#6b4a2a", "wood")} position={[0, -0.1, 0.02]} rotation={[0.3, 0, 0]} />;
    case "quill":
      return <mesh geometry={capsule(0.006, 0.18)} material={mat("#efe6d2")} position={[0, -0.06, 0.04]} rotation={[0.8, 0, 0]} />;
    case "letter":
      return <mesh geometry={box(0.16, 0.002, 0.22)} material={mat("#ead9b6")} position={[0, -0.08, 0.08]} rotation={[0.2, 0, 0]} castShadow />;
    case "staff":
      return (
        <group position={[0, -0.06, 0]}>
          <Upright>
            <mesh geometry={cyl(0.016, 0.02, 1.7, 8)} material={mat("#6a5030", "wood")} position={[0, 0.25, 0]} castShadow />
          </Upright>
        </group>
      );
    default:
      return null;
  }
};

/** Precompute nothing; exported for sets that want the shared material helpers. */
export const useMat = (color: string, kind?: Parameters<typeof mat>[1]) => useMemo(() => mat(color, kind), [color, kind]);
