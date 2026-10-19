import React from "react";
import { useCurrentFrame } from "remotion";
import { Stage3D } from "../three/engine/Stage3D";
import { Character3D } from "../three/character/Character3D";
import { add, idle } from "../three/motion/motion";

/** Portrait lookdev of Shivaji Maharaj's royal headpiece. */
export const CrownTest: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage3D cam={[{ f: 0, pos: [0.35, 1.75, 1.05], target: [0, 1.62, 0], fov: 30 }]} background="#2a2018" grade={{ vignette: 0.5, grain: 0.04 }}>
      <hemisphereLight args={["#ffe2c0", "#3a2a1a", 0.8]} />
      <directionalLight position={[2, 3, 3]} intensity={2.6} color="#ffe6c8" castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={1.0} color="#9ab0ff" />
      <Character3D costume="shivaji" pose={add(idle(f, 1, 0.3), { headTurn: 12 })} frame={f} seed={1} />
    </Stage3D>
  );
};
