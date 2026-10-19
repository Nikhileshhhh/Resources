import React from "react";
import { useCurrentFrame } from "remotion";
import { Stage3D } from "../three/engine/Stage3D";
import { Character3D } from "../three/character/Character3D";
import { add, idle, walkPath } from "../three/motion/motion";

/** Lookdev: the main cast under a warm key light, plus a torch-bearing guard walking. */
export const Char3DTest: React.FC = () => {
  const f = useCurrentFrame();
  const cast: [string, number][] = [["shivaji", -2.4], ["sambhaji", -1.5], ["aurangzeb", -0.6], ["ramsingh", 0.3], ["jaisingh", 1.2], ["fuladkhan", 2.1], ["porter", 3.0]];
  const g = walkPath(f, [[-4, 2.2], [4, 2.2]], { speed: 1.2, loop: true });
  return (
    <Stage3D cam={[{ f: 0, pos: [0.4, 1.5, 6.2], target: [0.2, 1.0, 0], fov: 32 }]} background="#26303c" fog={{ color: "#26303c", near: 12, far: 40 }} grade={{ vignette: 0.45, grain: 0.05 }}>
      <hemisphereLight args={["#bcd0ff", "#4a3a2a", 0.55]} />
      <directionalLight position={[4, 7, 5]} intensity={2.4} color="#ffe2c0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-0.0004} />
      <directionalLight position={[-5, 3, -4]} intensity={0.8} color="#7aa0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#7a6a58" roughness={0.95} />
      </mesh>
      {cast.map(([c, x], i) => (
        <Character3D key={c} costume={c} pose={add(idle(f, i), { x, heading: -8 + i * 2 })} frame={f} seed={i} right={c === "aurangzeb" ? "beads" : "none"} />
      ))}
      <Character3D costume="guard" pose={g.pose} frame={f} seed={9} right="torch" left="spear" />
    </Stage3D>
  );
};
