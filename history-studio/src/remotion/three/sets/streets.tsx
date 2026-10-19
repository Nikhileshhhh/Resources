import React, { useMemo } from "react";
import * as THREE from "three";
import { Stage3D, Glow, type CamKey, type V3 } from "../engine/Stage3D";
import { SkyDome, Water } from "../engine/env";
import { Character3D } from "../character/Character3D";
import { add, ease, idle, mix, walkPath, type P2 } from "../motion/motion";
import { OFFER, SPEAR_REST_L, STAND } from "../motion/poses";
import { flatMat, plasterMat, stoneMat } from "./architecture";
import { Boat, Flag, LowDesk, Terrain, Tree } from "./kit2";
import type { Shot3DProps } from "./night";

/** The river crossing checkpoint, the ghats of Mathura, and the Jaipur archive room (1939). */

const MORNING_GRADE = { vignette: 0.45, grain: 0.05, tint: "rgba(255,210,160,0.06)", saturate: 1.05 };

/** Stone steps descending into the water along X, from `top` (y) down to the waterline. */
const GhatSteps: React.FC<{ width: number; steps: number; rise?: number; run?: number; z0: number; color?: string }> /* step i's top is at -(i+1)·rise */ = ({ width, steps, rise = 0.22, run = 0.55, z0, color = "#b8a07a" }) => (
  <>
    {Array.from({ length: steps }, (_, i) => {
      const top = -(i + 1) * rise;
      const h = 3 + top;
      return (
        <mesh key={i} position={[0, top - h / 2, z0 + i * run + run / 2]} material={stoneMat(i % 2 ? color : "#a8906a", [width / 3, 0.4])} castShadow receiveShadow>
          <boxGeometry args={[width, h, run]} />
        </mesh>
      );
    })}
  </>
);

// ================================================================ s15b: a river crossing; an ascetic is stopped and searched
export const Checkpoint3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const t = f / Math.max(1, duration);
  // the ascetic walks up from the ferry and is halted by a lowered spear
  const asc = walkPath(f, [[-6, 2.2], [-1.1, 1.4]], { speed: 1.0, start: -60 });
  const halt = ease((t - 0.05) / 0.15);
  const search = ease((t - 0.3) / 0.1) * (1 - ease((t - 0.72) / 0.1));
  const peer = ease((t - 0.45) / 0.1) * (1 - ease((t - 0.8) / 0.1));
  const release = ease((t - 0.82) / 0.1);
  const s1 = add(STAND, idle(f, 500, 0.5), { x: 0.3, z: 1.2, heading: -95 }, mix({}, { shR: 60, shRAbd: -30, elR: 20, shL: 55, elL: 20, spine: 4 }, halt * (1 - release)), mix({}, SPEAR_REST_L, release), mix({}, { spine: 18, head: 14, shR: 40, elR: 60, shL: 30, elL: 50 }, search));
  const s2 = add(STAND, idle(f, 501, 0.5), { x: 0.9, z: 0.4, heading: -110 }, SPEAR_REST_L, { spine: 6 * peer, head: -6 * peer, headTurn: 10 * peer, brow: 0.5 * peer, lookY: 0.1 });
  const cam: CamKey[] = [
    { f: 0, pos: [-1.5, 1.6, 7.5], target: [-1.2, 1.3, 1.2], fov: 34 },
    { f: duration, pos: [-0.9, 1.6, 5.6], target: [-0.4, 1.4, 1.2], fov: 30 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#bcd0e0" fog={{ color: "#d8d8cc", near: 30, far: 220 }} exposure={1.0} grade={MORNING_GRADE}>
      <SkyDome horizon="#f0e4cc" zenith="#7aa4c8" />
      <hemisphereLight args={["#dfe8ff", "#7a5a3a", 0.9]} />
      <directionalLight position={[30, 40, 40]} intensity={3} color="#fff0d8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-bias={-0.0005} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 22]} material={stoneMat("#a89070", [40, 10])} receiveShadow>
        <planeGeometry args={[200, 50]} />
      </mesh>
      <mesh position={[0, -0.4, -3.3]} material={stoneMat("#8a7458", [40, 1])} receiveShadow>
        <boxGeometry args={[200, 0.8, 0.6]} />
      </mesh>
      <Water frame={f} size={[260, 80]} position={[0, -0.3, -43]} color="#4a6a7a" amp={0.05} />
      <group position={[0, -1, -215]}>
        <Terrain size={260} seg={80} height={14} seed="farbank" flats={[]} palette={["#7a8a5a", "#8a7a55", "#6a6a4a"]} />
      </group>
      <Boat frame={f} position={[-7, -0.15, -6]} rotationY={0.2} lantern={false} />
      {/* the post: a thatched shelter and the officer's table */}
      <group position={[2.6, 0, -0.6]}>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
          <mesh key={i} position={[x, 1.2, z]} material={flatMat("#5a3a22", 0.85)} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 2.4, 6]} />
          </mesh>
        ))}
        <mesh position={[0, 2.55, 0]} rotation={[0, Math.PI / 4, 0]} material={flatMat("#c9a86a", 1)} castShadow>
          <coneGeometry args={[1.9, 0.8, 4]} />
        </mesh>
        <LowDesk position={[0, 0, 0]} />
        <Character3D costume="official" pose={{ drop: 0.45, hipL: 88, hipR: 88, kneeL: 88, kneeR: 88, heading: -60, spine: 10, head: 6, shR: 40, elR: 70, blink: f % 120 < 6 ? 1 : 0 }} frame={f} seed={502} right="letter" />
      </group>
      <Flag frame={f} color="#3f6b4f" position={[3.6, 0, -1.6]} pole={4} size={[1.6, 1]} seed={5} swallow={false} />
      {Array.from({ length: 6 }, (_, i) => (
        <Tree key={i} position={[(i < 3 ? -9 - i * 5 : 7 + (i - 3) * 5), 0, -1 + (i % 2) * 2]} kind={i % 2 ? "broad" : "palm"} seed={i + 20} frame={f} />
      ))}
      <Character3D costume="ascetic" pose={add(asc.pose, { head: 4 + 6 * search, brow: 0.3, shL: 10 })} frame={f} seed={503} right="staff" />
      <Character3D costume="guard" pose={s1} frame={f} seed={504} left={release > 0.5 ? "spear" : "none"} />
      <Character3D costume="guard" pose={s2} frame={f} seed={505} left="spear" />
    </Stage3D>
  );
};

/** A north-Indian temple spire: a curved shikhara with an amalaka disc and a saffron pennant. */
const Shikhara: React.FC<{ position: V3; h: number; frame: number; seed: number }> = ({ position, h, frame, seed }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const y = i / 16;
      pts.push(new THREE.Vector2(0.5 * Math.cos(y * Math.PI * 0.46) ** 1.2 + 0.03, y));
    }
    return new THREE.LatheGeometry(pts, 8);
  }, []);
  const m = stoneMat(seed % 2 ? "#c49a7a" : "#b88a6a", [2, 4]);
  return (
    <group position={position}>
      <mesh position={[0, h * 0.16, 0]} material={m} castShadow receiveShadow>
        <boxGeometry args={[h * 0.34, h * 0.32, h * 0.34]} />
      </mesh>
      <mesh geometry={geo} position={[0, h * 0.32, 0]} scale={[h * 0.3, h * 0.62, h * 0.3]} material={m} castShadow />
      <mesh position={[0, h * 0.95, 0]} scale={[1, 0.4, 1]} material={m}>
        <sphereGeometry args={[h * 0.05, 12, 8]} />
      </mesh>
      <Flag frame={frame} color="#e8892b" position={[0, h * 0.98, 0]} pole={h * 0.12} size={[h * 0.12, h * 0.07]} seed={seed} swallow={false} />
    </group>
  );
};

// ================================================================ s18a: Mathura at dawn; the boy is entrusted to a Brahmin family
export const MathuraGhat3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const t = f / Math.max(1, duration);
  const reach = ease((t - 0.12) / 0.15);
  const look = ease((t - 0.3) / 0.1) * (1 - ease((t - 0.48) / 0.1));
  const take = ease((t - 0.5) / 0.1);
  const go = Math.max(0, f - duration * 0.62);
  // after the hands meet they walk off together along the landing, the elder holding the boy's hand
  const path: P2[] = [[0.35, 0.4], [-12, 0.6]];
  const elder = walkPath(go, path, { speed: 0.8, start: 0 });
  const boy = walkPath(go, [[-0.25, 0.75], [-12.6, 0.95]], { speed: 0.8, start: 0, phase0: 0.4 });
  const ePose = add(STAND, idle(f, 600, 0.5), { x: 0.35, z: 0.4, heading: -60 }, mix({}, { shL: 40, shLAbd: -10, elL: 15, head: 8 }, reach));
  const bPose = add(STAND, idle(f, 601, 0.6), { x: -0.25, z: 0.75, heading: 120 }, { headTurn: 70 * look, head: -4 }, mix({}, { shR: 35, shRAbd: -5, elR: 10 }, take));
  const walking = go > 0;
  const cam: CamKey[] = [
    { f: 0, pos: [2.4, 0.1, 10.5], target: [0.1, 1.6, 0.0], fov: 38 },
    { f: Math.round(duration * 0.62), pos: [1.0, 1.0, 5.6], target: [0, 1.35, 0.4], fov: 32 },
    { f: duration, pos: [-1.8, 1.2, 6.6], target: [-2.8, 1.4, 0.4], fov: 34 },
  ];
  return (
    <Stage3D cam={cam} camEase="smooth" background="#e8b890" fog={{ color: "#e0b898", near: 18, far: 160 }} exposure={1.05} grade={{ vignette: 0.5, grain: 0.05, tint: "rgba(255,170,110,0.12)", saturate: 1.05 }}>
      <SkyDome horizon="#ffd2a0" zenith="#7a8ab8" glow={{ color: "#fff0c8", dir: [0.6, 0.08, -1], size: 1.6 }} />
      <hemisphereLight args={["#ffe0c0", "#6a4a3a", 0.85]} />
      <directionalLight position={[40, 10, -40]} intensity={2.6} color="#ffc890" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-bias={-0.0005} />
      <directionalLight position={[-10, 8, 30]} intensity={0.9} color="#ffd8b8" />
      {/* the landing, the steps down to the Yamuna, the water */}
      <mesh position={[0, -0.2, -6]} material={stoneMat("#b8a07a", [12, 4])} receiveShadow>
        <boxGeometry args={[80, 0.4, 14]} />
      </mesh>
      <group position={[0, 0, 1.0]}>
        <GhatSteps width={80} steps={8} z0={0} rise={0.22} run={0.5} />
      </group>
      <Water frame={f} size={[200, 80]} position={[0, -1.85, 45]} color="#6a8aa0" amp={0.04} />
      {/* temples and houses behind the ghat */}
      {[-14, -6, 3, 12].map((x, i) => (
        <Shikhara key={x} position={[x * 1.4, 0, -20 - (i % 2) * 5]} h={14 + (i % 3) * 3} frame={f} seed={i} />
      ))}
      {[-18, -10, -2, 7, 16].map((x, i) => (
        <mesh key={"h" + x} position={[x, 1.6, -5.5]} material={plasterMat(["#e0c8a8", "#d8b898", "#ecd4b4"][i % 3], [2, 1])} castShadow receiveShadow>
          <boxGeometry args={[6, 3.2 + (i % 2) * 0.8, 3]} />
        </mesh>
      ))}
      {/* small shrines and lamps on the steps */}
      {[-4, 3.5].map((x, i) => (
        <group key={i} position={[x, 0, -0.6]}>
          <mesh position={[0, 0.5, 0]} material={stoneMat("#c8a888", [1, 1])} castShadow>
            <boxGeometry args={[0.9, 1, 0.9]} />
          </mesh>
          <Glow position={[0, 1.15, 0.5]} size={0.5} color="#ffc070" opacity={0.9} />
        </group>
      ))}
      <Character3D costume="brahmin" pose={walking ? add(elder.pose, { shL: 25, elL: 10, shLAbd: -6 }) : ePose} frame={f} seed={600} right="staff" />
      <Character3D costume="sambhaji" pose={walking ? add(boy.pose, { shR: 30, shRAbd: -8, elR: 8 }) : bPose} frame={f} seed={601} />
    </Stage3D>
  );
};

// ================================================================ s17c: the Jaipur archive, 1939: a bundle is untied and the letters come out
export const ArchiveRoom3D: React.FC<Shot3DProps> = ({ frame: f, duration }) => {
  const t = f / Math.max(1, duration);
  const untie = ease((t - 0.25) / 0.2);
  const spread = ease((t - 0.45) / 0.3);
  const pose = add(STAND, idle(f, 700, 0.4), { x: 0, z: -0.85, heading: 0, spine: 20, head: 18, brow: 0.3 * spread }, mix(OFFER, { shL: 50, shR: 50, elL: 50, elR: 50, shLAbd: -25, shRAbd: -25 }, untie));
  const cam: CamKey[] = [
    { f: 0, pos: [3.6, 2.4, 4.6], target: [0, 1.3, -0.4], fov: 36 },
    { f: duration, pos: [0.9, 1.75, 1.7], target: [0, 0.95, -0.3], fov: 30 },
  ];
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff2d6", transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const dust = Array.from({ length: 70 }, (_, i) => {
    const y = 0.6 + ((i * 0.37 + f * 0.0025 * (1 + (i % 3))) % 2.8);
    return [-1.4 + ((i * 0.61) % 2.0) + y * 0.45, y, -0.9 + ((i * 0.83) % 1.6)] as V3;
  });
  return (
    <Stage3D cam={cam} camEase="smooth" background="#120e0a" fog={{ color: "#1a140e", near: 6, far: 20 }} exposure={1.35} grade={{ vignette: 0.62, grain: 0.08, tint: "rgba(255,200,130,0.10)", saturate: 0.85 }}>
      <hemisphereLight args={["#8a7660", "#2a1e12", 0.9]} />
      <pointLight position={[2.5, 2.4, 1.5]} color="#ffb070" intensity={8} distance={9} decay={1.5} />
      {/* a shaft of daylight from a high window, falling across the table */}
      <spotLight position={[-3.2, 5.5, -1.0]} angle={0.32} penumbra={0.5} intensity={70} distance={14} decay={1.5} color="#fff0d0" castShadow shadow-mapSize={[1024, 1024]} />
      <mesh position={[-1.5, 3.2, -0.65]} rotation={[0, 0, -0.62]} material={beamMat}>
        <cylinderGeometry args={[0.35, 0.9, 5.6, 16, 1, true]} />
      </mesh>
      {dust.map((p, i) => (
        <Glow key={i} position={p} size={0.03} color="#fff0d0" opacity={0.7} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={stoneMat("#4a3e32", [4, 4])} receiveShadow>
        <planeGeometry args={[14, 12]} />
      </mesh>
      {/* shelves of cloth-wrapped bundles (bastas) */}
      {[-2.6].map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[-3, 0, 3].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 1.6, -0.1]} material={flatMat("#3a2a1a", 0.85)} castShadow receiveShadow>
                <boxGeometry args={[2.7, 3.2, 0.1]} />
              </mesh>
              {Array.from({ length: 5 }, (_, r) => (
                <group key={r}>
                  <mesh position={[0, 0.25 + r * 0.65, 0.2]} material={flatMat("#4a3420", 0.85)} receiveShadow>
                    <boxGeometry args={[2.7, 0.05, 0.6]} />
                  </mesh>
                  {Array.from({ length: 6 }, (_, k) => (
                    <mesh key={k} position={[-1.1 + k * 0.44, 0.45 + r * 0.65, 0.2]} material={flatMat(["#8a2a22", "#a0402a", "#6a4a2a", "#7a2a2a"][(k + r + x) % 4 < 0 ? 0 : (k + r + Math.abs(x)) % 4], 0.95)} castShadow>
                      <boxGeometry args={[0.38, 0.36, 0.48]} />
                    </mesh>
                  ))}
                </group>
              ))}
            </group>
          ))}
        </group>
      ))}
      {/* the reading table, the untied red cloth, the letters fanning out */}
      <mesh position={[0, 0.78, -0.2]} material={flatMat("#5a3a22", 0.6)} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.06, 1.1]} />
      </mesh>
      {[[-1, -0.6], [1, -0.6], [-1, 0.2], [1, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z - 0.0]} material={flatMat("#4a3020", 0.7)} castShadow>
          <boxGeometry args={[0.07, 0.76, 0.07]} />
        </mesh>
      ))}
      <mesh position={[0, 0.815, -0.2]} scale={[1 + untie * 0.6, 1, 1 + untie * 0.4]} material={flatMat("#a01e1e", 0.9)} receiveShadow>
        <boxGeometry args={[0.7, 0.01, 0.55]} />
      </mesh>
      {untie < 0.98 && (
        <mesh position={[0, 0.9, -0.2]} scale={[1, 1 - untie * 0.8, 1]} material={flatMat("#a01e1e", 0.9)} castShadow>
          <boxGeometry args={[0.5, 0.16, 0.4]} />
        </mesh>
      )}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i - 2.5) * 0.28 * spread;
        return (
          <mesh key={i} position={[(i - 2.5) * 0.17 * spread, 0.83 + i * 0.002, -0.2 + Math.abs(i - 2.5) * 0.03 * spread]} rotation={[-Math.PI / 2, 0, a]} material={flatMat(i % 2 ? "#e8dcbc" : "#dccfa8", 0.95)} receiveShadow>
            <planeGeometry args={[0.24, 0.32]} />
          </mesh>
        );
      })}
      <Character3D costume="scholar" pose={pose} frame={f} seed={700} />
    </Stage3D>
  );
};
