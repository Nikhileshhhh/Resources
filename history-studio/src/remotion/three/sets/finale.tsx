import React from "react";
import { Stage3D, Glow, type CamKey, type V3 } from "../engine/Stage3D";
import { Stars } from "../engine/fx";
import { Reflection, SkyDome, Water } from "../engine/env";
import { Character3D } from "../character/Character3D";
import { COSTUMES } from "../../components/Figure";
import { add, ease, idle, mix } from "../motion/motion";
import { BOW, SIT_CROSS, STAND } from "../motion/poses";
import {
  ArchedPanel,
  Bastion,
  FortWall,
  OnionDome,
  flatMat,
  marbleMat,
  stoneMat,
  MARBLE,
} from "./architecture";
import { Boat, Flag, Terrain } from "./kit2";
import { C, FONT_BODY, FONT_TITLE } from "../../theme";
import type { Shot3DProps } from "./night";

/** The coronation at Raigad (1674), the Brahmaputra at Saraighat (1671), and the closing view of Agra. */

// ================================================================ s19b: crowned Chhatrapati at Raigad
const CORONATION = { ...COSTUMES.shivaji, crown: "coronation" as const };

export const Coronation3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const t = f / Math.max(1, duration);
  const shiv = add(SIT_CROSS, idle(f, 800, 0.25), {
    x: 0,
    z: -3.0,
    y: 1.05,
    heading: 0,
    spine: -2,
    head: -3,
    shL: 25,
    elL: 60,
    shR: 30,
    elR: 75,
    brow: -0.1,
  });
  // courtiers in two rows bow in a wave, nearest the throne first
  const courtiers = Array.from({ length: 10 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 2);
    const bow = ease((t - 0.12 - row * 0.07) / 0.14);
    return {
      side,
      row,
      pose: add(
        STAND,
        idle(f, 810 + i, 0.5),
        {
          x: side * (2.0 + (row % 2) * 0.2),
          z: -1.4 + row * 1.25,
          heading: side * -90 + side * -15,
        },
        mix({}, BOW, bow),
      ),
      costume: ["official", "courtier", "rajputguard", "brahmin"][i % 4],
    };
  });
  // marigold and rose petals drifting down: fall at terminal speed with a flutter
  const petals = Array.from({ length: 140 }, (_, i) => {
    const x0 = -3.5 + ((i * 0.731) % 7);
    const z0 = -4 + ((i * 1.37) % 6);
    const v = 0.55 + ((i * 0.17) % 0.35);
    const y = 5.2 - (((f / 30) * v + ((i * 0.29) % 5.2)) % 5.2);
    const sway = Math.sin(f / 14 + i) * 0.18;
    return {
      p: [x0 + sway, y, z0 + Math.cos(f / 17 + i) * 0.12] as V3,
      r: [f / 9 + i, f / 13 + i * 2, 0] as [number, number, number],
      c: i % 3 ? "#e8892b" : i % 2 ? "#c8304a" : "#f2c040",
    };
  });
  const cam: CamKey[] = [
    { f: 0, pos: [0, 1.6, 8.5], target: [0, 1.8, -3], fov: 38 },
    { f: duration, pos: [0, 1.95, 3.4], target: [0, 2.0, -3], fov: 32 },
  ];
  return (
    <Stage3D
      cam={cam}
      camEase="smooth"
      background="#2a1a10"
      fog={{ color: "#2a1a10", near: 14, far: 40 }}
      exposure={1.15}
      grade={{
        vignette: 0.55,
        grain: 0.05,
        tint: "rgba(255,180,90,0.12)",
        saturate: 1.1,
      }}
    >
      <hemisphereLight args={["#ffe2b8", "#4a2a1a", 0.7]} />
      <directionalLight
        position={[-6, 12, 10]}
        intensity={2.4}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />
      <pointLight
        position={[0, 4.2, -2.2]}
        color="#ffcc80"
        intensity={30}
        distance={10}
        decay={1.5}
      />
      {/* hall: polished floor, carpet runner, carved stone arcades on three sides */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={marbleMat("#d8c8a8", [8, 8], 0.35)}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 1]}
        material={flatMat("#8a1e1e", 0.9)}
        receiveShadow
      >
        <planeGeometry args={[2.2, 10]} />
      </mesh>
      <ArchedPanel
        width={18}
        height={7}
        depth={0.8}
        arches={5}
        archW={2.4}
        archSpring={2.8}
        archH={4.6}
        position={[0, 0, -6]}
        material={stoneMat("#8a7a68", [5, 2])}
      />
      {[-1, 1].map((s) => (
        <ArchedPanel
          key={s}
          width={16}
          height={7}
          depth={0.8}
          arches={4}
          archW={2.4}
          archSpring={2.8}
          archH={4.6}
          position={[s * 6.5, 0, 0]}
          rotationY={Math.PI / 2}
          material={stoneMat("#8a7a68", [5, 2])}
        />
      ))}
      {/* the raised dais, the throne and the golden canopy (meghadambari) */}
      <mesh
        position={[0, 0.3, -3]}
        material={stoneMat("#6a5a4a", [2, 1])}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[4, 0.6, 3]} />
      </mesh>
      <mesh
        position={[0, 0.8, -3.05]}
        material={flatMat("#b8862a", 0.35, 0.9)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.6, 0.4, 1.2]} />
      </mesh>
      <mesh
        position={[0, 1.6, -3.6]}
        material={flatMat("#b8862a", 0.35, 0.9)}
        castShadow
      >
        <boxGeometry args={[1.6, 1.3, 0.12]} />
      </mesh>
      <mesh position={[0, 1.06, -3.0]} material={flatMat("#8a1e1e", 0.8)}>
        <boxGeometry args={[1.4, 0.12, 1.0]} />
      </mesh>
      {[
        [-1.5, -1.9],
        [1.5, -1.9],
        [-1.5, -4.1],
        [1.5, -4.1],
      ].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, 2.4, z]}
          material={flatMat("#c89a3a", 0.3, 0.9)}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.08, 3.6, 10]} />
        </mesh>
      ))}
      <mesh
        position={[0, 4.25, -3]}
        material={flatMat("#c89a3a", 0.3, 0.9)}
        castShadow
      >
        <boxGeometry args={[3.3, 0.12, 2.5]} />
      </mesh>
      <OnionDome
        position={[0, 4.3, -3]}
        radius={1.0}
        material={flatMat("#d4a640", 0.3, 0.9)}
      />
      {Array.from({ length: 24 }, (_, i) => (
        <mesh
          key={i}
          position={[-1.6 + (i % 12) * 0.29, 4.05, i < 12 ? -1.75 : -4.25]}
          material={flatMat(i % 2 ? "#f6f1e4" : "#d4a640", 0.4)}
        >
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
      ))}
      {[-2.6, 2.6].map((x, i) => (
        <Flag
          key={x}
          frame={f}
          color="#e8892b"
          position={[x, 0.6, -3.6]}
          pole={3.6}
          size={[1.1, 0.8]}
          seed={i + 30}
          swallow
        />
      ))}
      <Character3D costume={CORONATION} pose={shiv} frame={f} seed={800} />
      {courtiers.map((c, i) => (
        <Character3D
          key={i}
          costume={c.costume}
          pose={c.pose}
          frame={f}
          seed={810 + i}
          lod={c.row > 2 ? "lo" : "hi"}
        />
      ))}
      {petals.map((p, i) => (
        <mesh
          key={i}
          position={p.p}
          rotation={p.r}
          material={flatMat(p.c, 0.8)}
        >
          <planeGeometry args={[0.05, 0.035]} />
        </mesh>
      ))}
    </Stage3D>
  );
};

// ================================================================ s20b: the Brahmaputra at Saraighat, dusk
export const Brahmaputra3D: React.FC<Shot3DProps> = ({
  frame: f,
  duration,
}) => {
  const row = (k: number) => Math.sin((f / 30) * Math.PI * 2 * 0.45 + k * 0.2);
  const rowers = (n: number, seed: number) => (
    <>
      {Array.from({ length: n }, (_, i) => {
        const r = row(seed);
        const x = -1.8 + i * 1.0;
        return (
          <group key={i}>
            <Character3D
              costume="porter"
              pose={{
                ...SIT_CROSS,
                x,
                y: 0.45,
                z: 0,
                heading: 90,
                spine: 14 + 14 * r,
                shL: 50 + 30 * r,
                shR: 50 + 30 * r,
                elL: 30,
                elR: 30,
              }}
              frame={f}
              seed={seed * 10 + i}
              lod="lo"
              shadows={false}
            />
            {[-1, 1].map((s) => (
              <group
                key={s}
                position={[x + 0.2, 0.75, s * 0.55]}
                rotation={[s * (0.5 + 0.12 * r), 0, -0.5 * r]}
              >
                <mesh
                  position={[0, -0.9, 0]}
                  material={flatMat("#3a2416", 0.8)}
                >
                  <cylinderGeometry args={[0.025, 0.025, 2.0, 6]} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
    </>
  );
  const fleet: [number, number, number][] = [
    [-18, -14, 0.8],
    [-6, -22, 0.75],
    [8, -18, 0.8],
    [20, -26, 0.7],
    [-26, -34, 0.7],
    [2, -38, 0.65],
    [30, -44, 0.6],
    [-12, -50, 0.6],
    [16, -60, 0.55],
    [-34, -64, 0.5],
    [40, -72, 0.5],
    [-2, -80, 0.5],
  ];
  const drift = (f / 30) * 0.5;
  const cam: CamKey[] = [
    { f: 0, pos: [-2.0, 2.2, 6.0], target: [3.0, 2.0, -4], fov: 34 },
    {
      f: Math.round(duration * 0.5),
      pos: [-4.0, 3.6, 9.5],
      target: [2, 1.6, -14],
      fov: 38,
    },
    { f: duration, pos: [-6.0, 6.5, 14], target: [2, 0.8, -30], fov: 42 },
  ];
  return (
    <Stage3D
      cam={cam}
      camEase="smooth"
      background="#3a3048"
      fog={{ color: "#6a5068", near: 30, far: 260 }}
      exposure={1.05}
      clip={[0.05, 1500]}
      grade={{
        vignette: 0.6,
        grain: 0.06,
        tint: "rgba(255,120,90,0.10)",
        contrast: 1.06,
      }}
    >
      <SkyDome
        horizon="#ffa070"
        zenith="#2a2a4a"
        glow={{ color: "#ffc890", dir: [0.25, 0.06, -1], size: 1.5 }}
      />
      <Stars frame={f} count={300} />
      <hemisphereLight args={["#ffb890", "#2a2030", 0.6]} />
      <directionalLight
        position={[40, 8, -120]}
        intensity={2.0}
        color="#ff9a60"
      />
      <directionalLight
        position={[-20, 15, 30]}
        intensity={0.35}
        color="#8a8ad8"
      />
      <Water
        frame={f}
        size={[600, 400]}
        position={[0, 0, -100]}
        color="#2a3048"
        seg={[160, 100]}
        amp={0.08}
      />
      <Reflection
        frame={f}
        position={[30, 0.03, -190]}
        color="#ffb070"
        length={190}
        width={10}
        seed={3}
      />
      {/* the far bank: dark hills of the Ahom country with a few watch-fires */}
      <group position={[0, -3, -400]} scale={[1.6, 1, 1]}>
        <Terrain
          size={360}
          seg={90}
          height={40}
          seed="kamrup"
          flats={[]}
          palette={["#2a2a3c", "#30304a", "#24243a"]}
        />
      </group>
      {Array.from({ length: 12 }, (_, i) => (
        <Glow
          key={i}
          position={[-160 + i * 28, 4 + (i % 3) * 3, -200 - (i % 4) * 8]}
          size={3}
          color="#ffa050"
          opacity={0.7}
        />
      ))}
      {/* the Mughal fleet at anchor and under oar, lanterns lit */}
      {fleet.map(([x, z, s], i) => (
        <Boat
          key={i}
          frame={f}
          position={[x + drift * (1 + (i % 3) * 0.3), 0.1, z]}
          rotationY={-0.3 + (i % 5) * 0.12}
          scale={s * 1.6}
          seed={i + 40}
        />
      ))}
      {/* the commander's boat in the foreground: a figure at the prow against the sunset */}
      <Boat
        frame={f}
        position={[1.5 + drift * 0.4, 0.1, -3]}
        rotationY={0.35}
        scale={1.2}
        seed={7}
      >
        <Character3D
          costume="ramsingh"
          pose={add(STAND, idle(f, 900, 0.4), {
            x: 2.3,
            y: 0.45,
            z: 0,
            heading: 90,
            shL: 10,
            elL: 20,
            shR: 20,
            elR: 50,
            headTurn: -10,
          })}
          frame={f}
          seed={900}
        />
        {rowers(3, 1)}
      </Boat>
    </Stage3D>
  );
};

// ================================================================ s20c: the end screen: Agra across the Yamuna at dusk
export const EndScreen3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const fade = ease(f / 40);
  const night = ease((f - duration * 0.4) / (duration * 0.6));
  const cam: CamKey[] = [
    { f: 0, pos: [0, 2.2, 40], target: [0, 9, -60], fov: 40 },
    { f: duration, pos: [0, 2.4, 34], target: [0, 9.5, -60], fov: 38 },
  ];
  const text = (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 420,
          background: "linear-gradient(rgba(20,14,26,0.75), rgba(20,14,26,0))",
          opacity: fade,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 96,
          textAlign: "center",
          opacity: fade,
        }}
      >
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 64,
            letterSpacing: 8,
            color: C.parchment,
            textShadow: "0 4px 18px rgba(0,0,0,0.85)",
          }}
        >
          THE NARROW HOUR
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 34,
            color: "#f0e6d0",
            marginTop: 16,
            textShadow: "0 3px 12px rgba(0,0,0,0.85)",
          }}
        >
          Sources, notes and credits are in the description
        </div>
      </div>
    </>
  );
  return (
    <Stage3D
      cam={cam}
      camEase="smooth"
      background="#2a1f2e"
      fog={{ color: "#5a3a4a", near: 60, far: 400 }}
      exposure={1.0 - night * 0.25}
      clip={[0.1, 1500]}
      grade={{ vignette: 0.6, grain: 0.05, tint: "rgba(255,120,90,0.10)" }}
      dom={text}
    >
      <SkyDome
        horizon="#e88058"
        zenith="#1e1a34"
        glow={{ color: "#ffc890", dir: [0, 0.03, -1], size: 0.9 }}
      />
      <Stars frame={f} count={Math.round(200 + night * 500)} />
      <hemisphereLight args={["#ffb890", "#2a2030", 0.55]} />
      <directionalLight
        position={[0, 6, -120]}
        intensity={1.6}
        color="#ff9a60"
      />
      <Water
        frame={f}
        size={[600, 200]}
        position={[0, 0, -4]}
        color="#1c1726"
        seg={[120, 60]}
        amp={0.05}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.2, -170]}
        material={flatMat("#2a1e24", 1)}
      >
        <planeGeometry args={[700, 130]} />
      </mesh>
      <Reflection
        frame={f}
        position={[0, 0.03, -100]}
        color="#ffb070"
        length={130}
        width={8}
        seed={9}
      />
      {/* the fort on the far bank: walls, bastions, domes and minarets in silhouette */}
      <FortWall
        from={[-90, -110]}
        to={[90, -110]}
        height={12}
        color="#5a2e2a"
      />
      {[-70, -35, 35, 70].map((x) => (
        <Bastion
          key={x}
          position={[x, -108]}
          radius={4}
          height={14}
          color="#5a2e2a"
        />
      ))}
      {[
        [-14, 6],
        [0, 9],
        [14, 6],
      ].map(([x, r], i) => (
        <OnionDome
          key={i}
          position={[x, 13, -118]}
          radius={r}
          material={marbleMat(MARBLE, [2, 2], 0.4)}
        />
      ))}
      {[-24, 24].map((x) => (
        <mesh
          key={x}
          position={[x, 20, -118]}
          material={flatMat("#d8cfc0", 0.5)}
        >
          <cylinderGeometry args={[0.9, 1.3, 28, 12]} />
        </mesh>
      ))}
      <mesh position={[0, 9, -118]} material={flatMat("#cfc6b6", 0.5)}>
        <boxGeometry args={[40, 8, 14]} />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => (
        <Glow
          key={i}
          position={[-80 + i * 9.4, 6 + (i % 3) * 2, -106]}
          size={1.8}
          color="#ffb060"
          opacity={0.3 + night * 0.6}
        />
      ))}
    </Stage3D>
  );
};
