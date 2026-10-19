import React, { useMemo } from "react";
import * as THREE from "three";
import { mat } from "./Character3D";
import { pathPoint, type P2 } from "../motion/motion";
import { Flag } from "../sets/kit2";

/**
 * Procedural animals (original). Units metres, root on the ground, facing +Z.
 * Gaits are phase-locked to distance travelled (no hoof sliding): a horse's walk is a four-beat gait
 * (LH → LF → RH → RF, quarter cycle apart); an elephant ambles with lateral pairs.
 */
const D = Math.PI / 180;

export interface QuadState { x: number; z: number; heading: number; u: number; moving: number }

/** Root motion along a path at `speed` m/s from `start`, with eased start; u = gait phase (cycles). */
export function quadPath(frame: number, path: P2[], speed: number, cycle: number, start = 0, accel = 24): QuadState {
  const f = Math.max(0, frame - start);
  const v = speed / 30;
  const dist = f < accel ? (v * f * f) / (2 * accel) : v * (f - accel / 2);
  const p = pathPoint(path, dist);
  return { x: p.x, z: p.z, heading: p.heading, u: dist / cycle, moving: Math.min(1, f / accel) };
}

const Leg: React.FC<{ pos: [number, number, number]; phase: number; len: number; r: number; m: THREE.Material; hoof?: THREE.Material; swing: number; hind?: boolean }> = ({ pos, phase, len, r, m, hoof, swing, hind }) => {
  const w = ((phase % 1) + 1) % 1;
  const stance = w < 0.62;
  // stance: leg sweeps back linearly (ground speed); swing: lifts with a bent lower leg and comes forward
  const t = stance ? w / 0.62 : (w - 0.62) / 0.38;
  const upper = stance ? swing * (1 - 2 * t) : swing * (-1 + 2 * (t * t * (3 - 2 * t)));
  const bend = stance ? 0 : Math.sin(Math.PI * t) * (hind ? -55 : 70);
  return (
    <group position={pos} rotation={[-upper * D, 0, 0]}>
      <mesh position={[0, -len * 0.25, 0]} material={m} castShadow>
        <capsuleGeometry args={[r, len * 0.4, 6, 12]} />
      </mesh>
      <group position={[0, -len * 0.52, 0]} rotation={[bend * D, 0, 0]}>
        <mesh position={[0, -len * 0.24, 0]} material={m} castShadow>
          <capsuleGeometry args={[r * 0.62, len * 0.42, 6, 10]} />
        </mesh>
        {hoof && (
          <mesh position={[0, -len * 0.47, 0.02]} material={hoof} castShadow>
            <cylinderGeometry args={[r * 0.62, r * 0.78, 0.08, 10]} />
          </mesh>
        )}
      </group>
    </group>
  );
};

/** Horse with saddle cloth and trappings; optional rider (rendered by the caller at `riderSeat`). */
export const Horse: React.FC<{ state: QuadState; coat?: string; cloth?: string; trim?: string; frame: number; children?: React.ReactNode }> = ({ state, coat = "#6a4128", cloth = "#c8442a", trim = "#d8d8d8", frame, children }) => {
  const m = mat(coat, "cloth");
  const dark = mat("#2a1a10", "hair");
  const hoof = mat("#2a2420", "wood");
  const u = state.u;
  const mv = state.moving;
  const bob = Math.sin(u * Math.PI * 4) * 0.025 * mv;
  const nod = Math.sin(u * Math.PI * 4 + 0.6) * 6 * mv + Math.sin(frame / 50) * 2;
  const tail = Math.sin(frame / 18) * 10;
  const swing = 20 * mv;
  return (
    <group position={[state.x, 0, state.z]} rotation={[0, state.heading * D, 0]}>
      <group position={[0, bob, 0]}>
        {/* barrel, chest, hindquarters */}
        <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]} material={m} castShadow>
          <capsuleGeometry args={[0.36, 1.1, 8, 16]} />
        </mesh>
        <mesh position={[0, 1.42, 0.62]} material={m} castShadow>
          <sphereGeometry args={[0.38, 14, 12]} />
        </mesh>
        <mesh position={[0, 1.45, -0.6]} material={m} castShadow>
          <sphereGeometry args={[0.4, 14, 12]} />
        </mesh>
        {/* neck and head with a nod in time with the steps */}
        <group position={[0, 1.6, 0.85]} rotation={[(42 - nod) * D, 0, 0]}>
          <mesh position={[0, 0.38, 0]} material={m} castShadow>
            <capsuleGeometry args={[0.17, 0.62, 6, 12]} />
          </mesh>
          <mesh position={[0, 0.42, -0.13]} rotation={[-0.05, 0, 0]} material={dark}>
            <boxGeometry args={[0.05, 0.7, 0.12]} />
          </mesh>
          <group position={[0, 0.8, 0.0]} rotation={[(88 + nod * 0.5) * D, 0, 0]}>
            <mesh position={[0, 0.22, 0]} material={m} castShadow>
              <capsuleGeometry args={[0.12, 0.42, 6, 12]} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.07, -0.02, -0.1]} rotation={[-0.6, 0, s * 0.2]} material={m}>
                <coneGeometry args={[0.035, 0.14, 6]} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={"e" + s} position={[s * 0.1, 0.06, 0.06]} material={mat("#120c08", "eye")}>
                <sphereGeometry args={[0.02, 8, 6]} />
              </mesh>
            ))}
            {/* bridle */}
            <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(trim, "metal")}>
              <torusGeometry args={[0.13, 0.012, 6, 16]} />
            </mesh>
          </group>
        </group>
        {/* tail */}
        <group position={[0, 1.6, -0.98]} rotation={[(35 + Math.sin(u * Math.PI * 2) * 4) * D, tail * D, 0]}>
          <mesh position={[0, -0.4, -0.08]} material={dark} castShadow>
            <capsuleGeometry args={[0.06, 0.7, 6, 8]} />
          </mesh>
        </group>
        {/* saddle cloth and saddle */}
        <mesh position={[0, 1.7, 0.05]} material={mat(cloth, "silk")} castShadow>
          <boxGeometry args={[0.86, 0.06, 1.0]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.4, 1.42, 0.05]} rotation={[0, 0, s * 0.12]} material={mat(cloth, "silk")} castShadow>
            <boxGeometry args={[0.03, 0.55, 0.9]} />
          </mesh>
        ))}
        <mesh position={[0, 1.79, 0.0]} material={mat("#4a2e1a", "wood")} castShadow>
          <boxGeometry args={[0.42, 0.12, 0.55]} />
        </mesh>
        {/* legs: four-beat walk */}
        <Leg pos={[-0.22, 1.15, 0.62]} phase={u + 0.25} len={1.2} r={0.11} m={m} hoof={hoof} swing={swing} />
        <Leg pos={[0.22, 1.15, 0.62]} phase={u + 0.75} len={1.2} r={0.11} m={m} hoof={hoof} swing={swing} />
        <Leg pos={[-0.22, 1.2, -0.62]} phase={u} len={1.25} r={0.13} m={m} hoof={hoof} swing={swing} hind />
        <Leg pos={[0.22, 1.2, -0.62]} phase={u + 0.5} len={1.25} r={0.13} m={m} hoof={hoof} swing={swing} hind />
        {/* rider seat (children positioned in horse space) */}
        <group position={[0, 1.86, 0]}>{children}</group>
      </group>
    </group>
  );
};

/** Elephant with caparison, howdah cloth and a pennant; trunk swing and ear flap. */
export const Elephant: React.FC<{ state: QuadState; frame: number; cloth?: string; flag?: string }> = ({ state, frame, cloth = "#c8442a", flag = "#e8892b" }) => {
  const skin = mat("#7a7068", "skin");
  const u = state.u;
  const mv = state.moving;
  const bob = Math.sin(u * Math.PI * 4) * 0.04 * mv;
  const trunkCurve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.5, 0.35), new THREE.Vector3(0, -1.2, 0.4), new THREE.Vector3(0, -1.75, 0.2)]), []);
  const trunk = useMemo(() => new THREE.TubeGeometry(trunkCurve, 16, 0.14, 10, false), [trunkCurve]);
  const swayT = Math.sin(frame / 22 + u * 2) * 10;
  const ear = Math.sin(frame / 14) * 12;
  return (
    <group position={[state.x, 0, state.z]} rotation={[0, state.heading * D, 0]}>
      <group position={[0, bob, 0]}>
        <mesh position={[0, 2.25, 0]} material={skin} castShadow receiveShadow scale={[1.1, 1.05, 1.5]}>
          <sphereGeometry args={[1.05, 20, 16]} />
        </mesh>
        {/* head, trunk, tusks, ears */}
        <group position={[0, 2.55, 1.55]}>
          <mesh material={skin} castShadow scale={[0.85, 0.95, 0.8]}>
            <sphereGeometry args={[0.7, 18, 14]} />
          </mesh>
          <group position={[0, -0.25, 0.45]} rotation={[0, 0, swayT * D]}>
            <mesh geometry={trunk} material={skin} castShadow />
          </group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.25, -0.45, 0.45]} rotation={[0.9, 0, s * -0.2]} material={mat("#efe6d2", "eye")} castShadow>
              <coneGeometry args={[0.05, 0.55, 8]} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <group key={"ear" + s} position={[s * 0.62, 0.05, -0.1]} rotation={[0, s * (20 + ear) * D, 0]}>
              <mesh position={[s * 0.35, -0.1, 0]} material={skin} castShadow scale={[1, 1.15, 0.12]}>
                <sphereGeometry args={[0.45, 14, 10]} />
              </mesh>
            </group>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={"eye" + s} position={[s * 0.45, 0.12, 0.38]} material={mat("#120c08", "eye")}>
              <sphereGeometry args={[0.04, 8, 6]} />
            </mesh>
          ))}
        </group>
        {/* caparison with gold trim and a howdah cloth carrying the pennant */}
        <mesh position={[0, 2.6, -0.1]} material={mat(cloth, "silk")} castShadow scale={[1.18, 0.8, 1.2]}>
          <sphereGeometry args={[1.0, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        </mesh>
        <mesh position={[0, 2.18, -0.1]} rotation={[Math.PI / 2, 0, 0]} material={mat("#d8b25a", "gold")} scale={[1.18, 1.2, 1]}>
          <torusGeometry args={[0.98, 0.035, 6, 32]} />
        </mesh>
        <mesh position={[0, 3.45, -0.2]} material={mat("#7a1e1e", "silk")} castShadow>
          <boxGeometry args={[0.9, 0.35, 1.1]} />
        </mesh>
        <Flag frame={frame} color={flag} position={[0, 3.6, -0.6]} pole={2.2} size={[1.2, 0.7]} seed={7} />
        {/* legs (lateral amble: left pair then right pair) */}
        <Leg pos={[-0.55, 1.75, 0.8]} phase={u + 0.1} len={1.8} r={0.26} m={skin} swing={12 * mv} />
        <Leg pos={[0.55, 1.75, 0.8]} phase={u + 0.6} len={1.8} r={0.26} m={skin} swing={12 * mv} />
        <Leg pos={[-0.55, 1.75, -0.8]} phase={u} len={1.8} r={0.28} m={skin} swing={12 * mv} hind />
        <Leg pos={[0.55, 1.75, -0.8]} phase={u + 0.5} len={1.8} r={0.28} m={skin} swing={12 * mv} hind />
        <mesh position={[0, 2.2, -1.55]} rotation={[0.3 + Math.sin(frame / 20) * 0.1, 0, 0]} material={skin}>
          <capsuleGeometry args={[0.04, 0.8, 4, 6]} />
        </mesh>
      </group>
    </group>
  );
};

/** Seated riding pose for a Character3D placed at a horse's rider seat. */
export const RIDE = { drop: 0.42, hipL: 62, hipLAbd: 26, kneeL: 72, ankleL: -10, hipR: 62, hipRAbd: 26, kneeR: 72, ankleR: -10, spine: 12, shL: 25, shR: 25, elL: 60, elR: 60, shLAbd: -10, shRAbd: -10, skirtSplay: 0.6 };
