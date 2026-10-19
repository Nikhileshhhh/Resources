import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { noise2D } from "@remotion/noise";
import { Stage3D, Glow, type V3 } from "../engine/Stage3D";
import { Flame } from "../engine/fx";
import { flatMat, plasterMat } from "./architecture";
import { wood } from "./textures";
import type { Shot3DProps } from "./night";

/**
 * 2.5D presentation for maps, documents and diagrams: the existing (fact-checked) 2D artwork becomes a sheet of
 * parchment lying on a candle-lit desk (or pinned to a wall), surrounded by real 3D props. The CSS perspective
 * of the sheet and the 3D camera share one projection (pixel units, perspective P), so props and paper align.
 */
const P = 1600; // CSS perspective distance in px = 3D camera distance in px units
const FOV = (2 * Math.atan(540 / P) * 180) / Math.PI;

const deskMat = () => new THREE.MeshStandardMaterial({ map: wood("#2a1a10", [3, 2]), roughness: 0.55 });
let _desk: THREE.Material | null = null;

interface Xf { tilt: number; scale: number; tx: number; ty: number; tz: number; rotZ: number }

function lerpXf(a: Xf, b: Xf, t: number): Xf {
  const e = t * t * (3 - 2 * t);
  return { tilt: a.tilt + (b.tilt - a.tilt) * e, scale: a.scale + (b.scale - a.scale) * e, tx: a.tx + (b.tx - a.tx) * e, ty: a.ty + (b.ty - a.ty) * e, tz: a.tz + (b.tz - a.tz) * e, rotZ: a.rotZ + (b.rotZ - a.rotZ) * e };
}

/** Props modelled y-up in px; this wrapper stands them on the sheet's plane (local +Z is "up"). */
const OnDesk: React.FC<{ at: [number, number]; rot?: number; children: React.ReactNode }> = ({ at, rot = 0, children }) => (
  <group position={[at[0], at[1], 0]} rotation={[Math.PI / 2, rot, 0]}>
    {children}
  </group>
);

const Candle: React.FC<{ frame: number }> = ({ frame }) => (
  <group>
    <mesh position={[0, 12, 0]} material={flatMat("#b08a40", 0.35, 0.8)} castShadow>
      <cylinderGeometry args={[95, 110, 24, 32]} />
    </mesh>
    <mesh position={[0, 200, 0]} material={flatMat("#efe4c8", 0.6)} castShadow>
      <cylinderGeometry args={[46, 50, 360, 24]} />
    </mesh>
    <group position={[0, 395, 0]}>
      <Flame frame={frame} seed={5} size={95} embers={false} />
    </group>
  </group>
);

const Inkwell: React.FC = () => (
  <group>
    <mesh position={[0, 60, 0]} material={flatMat("#1a2230", 0.15, 0.3)} castShadow>
      <cylinderGeometry args={[70, 95, 120, 24]} />
    </mesh>
    <mesh position={[0, 135, 0]} material={flatMat("#b08a40", 0.3, 0.9)}>
      <cylinderGeometry args={[40, 50, 30, 20]} />
    </mesh>
    {/* quill */}
    <group position={[10, 150, 0]} rotation={[0, 0, -0.55]}>
      <mesh position={[0, 220, 0]} material={flatMat("#efe6d2", 0.7)} castShadow>
        <cylinderGeometry args={[4, 3, 520, 8]} />
      </mesh>
      <mesh position={[18, 320, 0]} rotation={[0, 0, 0.05]} material={flatMat("#f4efe2", 0.8)} castShadow>
        <boxGeometry args={[42, 300, 3]} />
      </mesh>
    </group>
  </group>
);

const SealedLetter: React.FC = () => (
  <group>
    <mesh position={[0, 3, 0]} material={flatMat("#d9c49a", 0.85)} castShadow receiveShadow>
      <boxGeometry args={[420, 6, 300]} />
    </mesh>
    <mesh position={[120, 10, 90]} material={flatMat("#8a1c18", 0.5)} castShadow>
      <cylinderGeometry args={[34, 34, 10, 20]} />
    </mesh>
  </group>
);

const Coins: React.FC = () => (
  <group>
    {Array.from({ length: 9 }, (_, i) => (
      <mesh key={i} position={[Math.cos(i * 2.4) * 70 * Math.sqrt(i), 4 + (i % 3) * 7, Math.sin(i * 2.4) * 70 * Math.sqrt(i)]} rotation={[0.08 * Math.sin(i), i, 0.08 * Math.cos(i)]} material={flatMat("#d8b25a", 0.3, 0.95)} castShadow>
        <cylinderGeometry args={[38, 38, 7, 24]} />
      </mesh>
    ))}
  </group>
);

export type TableVariant = "desk" | "wall";

/** Wrap a 2D graphic as a sheet in a 3D scene with a slow camera push. */
export function tabletop(Content: React.FC<any>, variant: TableVariant = "desk"): React.FC<Shot3DProps> {
  const Comp: React.FC<Shot3DProps> = (props) => {
    const { frame: f, duration } = props;
    const t = Math.min(1, Math.max(0, f / Math.max(1, duration)));
    const xf = variant === "desk" ? lerpXf({ tilt: 34, scale: 0.7, tx: 20, ty: 40, tz: 0, rotZ: -2.2 }, { tilt: 27, scale: 0.8, tx: 0, ty: 0, tz: 0, rotZ: 0 }, t) : lerpXf({ tilt: 5, scale: 0.72, tx: 60, ty: 10, tz: 0, rotZ: -0.8 }, { tilt: 2, scale: 0.8, tx: 40, ty: 0, tz: 0, rotZ: 0 }, t);
    const flick = 1 + noise2D("cand", f * 0.12, 0) * 0.05 + noise2D("cand2", f * 0.45, 1) * 0.02;
    _desk = _desk ?? deskMat();
    const sheet = (
      <AbsoluteFill style={{ transform: `perspective(${P}px) translate3d(${xf.tx}px, ${xf.ty}px, ${xf.tz}px) rotateX(${xf.tilt}deg) rotateZ(${xf.rotZ}deg) scale(${xf.scale})`, transformOrigin: "50% 50%" }}>
        <AbsoluteFill style={{ overflow: "hidden", borderRadius: 8, boxShadow: "0 40px 80px rgba(0,0,0,0.65), inset 0 0 120px rgba(60,30,10,0.45)", filter: `brightness(${0.9 * flick}) sepia(0.12)` }}>
          <Content {...props} />
          {/* parchment fibre and warm candle falloff on the sheet */}
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at 18% 20%, rgba(255,190,110,0.22), rgba(0,0,0,0) 55%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(40,20,5,0.35) 100%)", mixBlendMode: "multiply" }} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
    const groupPos: V3 = [xf.tx, -xf.ty, xf.tz];
    return (
      <Stage3D cam={[{ f: 0, pos: [0, 0, P], target: [0, 0, 0], fov: FOV }]} background="#120b06" exposure={1.05} grade={{ vignette: 0.6, grain: 0.06, tint: "rgba(255,150,70,0.10)" }} dom={sheet} clip={[10, 20000]}>
        <ambientLight intensity={0.75} color="#ffd9b0" />
        <directionalLight position={[-900, 700, 1800]} intensity={1.4} color="#ffcf9a" />
        <group position={groupPos} rotation={[(-xf.tilt * Math.PI) / 180, 0, (-xf.rotZ * Math.PI) / 180]} scale={xf.scale}>
          {variant === "desk" ? (
            <>
              <mesh position={[0, 0, -4]} material={_desk} receiveShadow>
                <planeGeometry args={[7000, 5000]} />
              </mesh>
              <OnDesk at={[-1240, 470]}>
                <Candle frame={f} />
              </OnDesk>
              <pointLight position={[-1240, 470, 560]} intensity={40 * flick} distance={0} decay={0} color="#ffb060" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={10} shadow-camera-far={8000} />
              <OnDesk at={[1180, -330]}>
                <Inkwell />
              </OnDesk>
              <OnDesk at={[-1200, -420]} rot={0.4}>
                <SealedLetter />
              </OnDesk>
              <OnDesk at={[1240, 420]}>
                <Coins />
              </OnDesk>
              <Glow position={[-1240, 470, 600]} size={900} color="#ff9a40" opacity={0.35} />
            </>
          ) : (
            <>
              <mesh position={[0, 0, -6]} material={plasterMat("#6a5038", [4, 3])} receiveShadow>
                <planeGeometry args={[7000, 5000]} />
              </mesh>
              {/* oil lamp on a bracket beside the board */}
              <group position={[-1120, -200, 140]}>
                <mesh material={flatMat("#3a2616")}>
                  <boxGeometry args={[220, 30, 200]} />
                </mesh>
                <group position={[0, 60, 0]}>
                  <Flame frame={f} seed={9} size={70} embers={false} />
                </group>
              </group>
              <pointLight position={[-1120, -90, 500]} intensity={45 * flick} distance={0} decay={0} color="#ffb060" />
              <Glow position={[-1120, -120, 320]} size={700} color="#ff9a40" opacity={0.35} />
            </>
          )}
        </group>
      </Stage3D>
    );
  };
  return Comp;
}
