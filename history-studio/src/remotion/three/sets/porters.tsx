import React from "react";
import type { V3 } from "../engine/Stage3D";
import { Character3D } from "../character/Character3D";
import { add, cycleLength, mix, pathPoint, walk, walkPath, type P2 } from "../motion/motion";
import { CARRY_R, SQUAT_LIFT, STAND } from "../motion/poses";
import { Basket, Pole, Rope } from "./architecture";

const ROPE = 0.34;
const SCALE = 1.22;
const SHOULDER = 1.43;
const H = 0.78 * SCALE;

/**
 * Two porters with a sweets basket slung from a pole between them, walking a path (or standing at its start).
 * The basket swings with the gait: a damped pendulum driven at the step frequency, so it lags the porters' bob.
 */
export const BasketPair: React.FC<{ frame: number; path: P2[]; speed?: number; start?: number; seed?: number; lid?: number; standing?: boolean; setDown?: boolean; lead?: number }> = ({ frame: f, path, speed = 1.3, start = 0, seed = 0, lid = 0, standing = false, setDown = false, lead = 0 }) => {
  const w = walkPath(f, path, { speed, start, accel: 22, loop: false });
  const moving = standing ? 0 : w.moving;
  const d = standing ? lead : w.dist + lead;
  const porter = (end: 1 | -1) => {
    const pd = Math.max(0, d + end * 1.2);
    const pt = pathPoint(path, pd);
    const u = pd / cycleLength(speed) + (end === 1 ? 0.5 : 0);
    const p = setDown ? { ...SQUAT_LIFT } : mix(add(STAND, CARRY_R), add(walk(u, { speed, carry: true }), CARRY_R, { spine: 6 }), moving);
    return { ...p, x: pt.x, z: pt.z, heading: pt.heading, breathe: Math.sin((f + seed * 7) / 9) };
  };
  const front = porter(1);
  const rear = porter(-1);
  const g = walk(d / cycleLength(speed), { speed, carry: true });
  const piv: V3 = [((front.x ?? 0) + (rear.x ?? 0)) / 2, setDown ? 0.98 : SHOULDER - (g.drop ?? 0) * moving, ((front.z ?? 0) + (rear.z ?? 0)) / 2];
  const yaw = Math.atan2((front.x ?? 0) - (rear.x ?? 0), (front.z ?? 0) - (rear.z ?? 0));
  // fore-aft swing at the step frequency (two steps per cycle), small side sway, settling when standing
  const ph = (d / cycleLength(speed)) * Math.PI * 4;
  const along = setDown ? 0 : (0.07 * Math.sin(ph - 1.1) + 0.02 * Math.sin(f / 23 + seed)) * (0.25 + 0.75 * moving);
  const side = setDown ? 0 : 0.025 * Math.sin(ph * 0.5 + seed) * moving;
  // set down: the basket rests on the ground and the ropes go slack
  const L = setDown ? piv[1] - H / 2 : ROPE + H / 2;
  return (
    <group>
      <Character3D costume="porter" pose={front} frame={f} seed={30 + seed} />
      <Character3D costume="porter" pose={rear} frame={f} seed={31 + seed} />
      <group position={piv} rotation={[0, yaw - Math.PI / 2, 0]}>
        <Pole length={3.1} />
      </group>
      <group position={piv} rotation={[0, yaw, 0]}>
        <group rotation={[along, 0, side]}>
          <group position={[0, -L, 0]}>
            <group position={[0, -H / 2, 0]} scale={SCALE}>
              <Basket lid={lid} fill="sweets" />
            </group>
            {[[-0.3, -0.3], [0.3, 0.3], [0.3, -0.3], [-0.3, 0.3]].map(([dx, dz], r) => (
              <Rope key={r} a={[dx * SCALE, H / 2 + 0.02, dz * SCALE]} b={[0, Math.max(L, H / 2 + 0.06), 0]} r={0.01} />
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};
