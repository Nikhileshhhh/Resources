import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { noise2D } from "@remotion/noise";
import { type V3, Glow } from "../engine/Stage3D";
import { Flame } from "../engine/fx";
import { ArchedPanel, flatMat, plasterMat, stoneMat, Chhatri, SANDSTONE } from "./architecture";
import { earth } from "./textures";

/** Second set kit: rooms, jali screens, bed and quilt, lamps, tents, terrain, hill forts, flags, trees, cannon, boats. */

const cache = new Map<string, THREE.Material>();
const cm = (k: string, f: () => THREE.Material) => cache.get(k) ?? (cache.set(k, f()), cache.get(k)!);

// ---------------------------------------------------------------- jali (pierced stone lattice)
let jaliTex: THREE.Texture | null = null;
function jaliAlpha(): THREE.Texture {
  if (jaliTex) return jaliTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#000";
  // eight-pointed star openings on a square grid (classic Mughal jali)
  const star = (cx: number, cy: number, r: number) => {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = i % 2 ? r * 0.55 : r;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) star(32 + x * 64, 32 + y * 64, 26);
  for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
    g.beginPath();
    g.arc(x * 64, y * 64, 7, 0, Math.PI * 2);
    g.fill();
  }
  jaliTex = new THREE.CanvasTexture(c);
  jaliTex.wrapS = jaliTex.wrapT = THREE.RepeatWrapping;
  return jaliTex;
}

/** Carved jali screen (w × h), optionally lit from behind. Openings are true cut-outs (alpha test). */
export const Jali: React.FC<{ w: number; h: number; position?: V3; rotationY?: number; color?: string; glow?: string; arch?: boolean }> = ({ w, h, position = [0, 0, 0], rotationY = 0, color = "#e8dfcc", glow, arch = true }) => {
  const m = useMemo(() => {
    const t = jaliAlpha().clone();
    t.repeat.set(w / 0.5, h / 0.5);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color, alphaMap: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
  }, [w, h, color]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, h / 2, 0]} material={m} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
      </mesh>
      {arch && <ArchedPanel width={w + 0.6} height={h + 0.8} depth={0.25} arches={1} archW={w} archSpring={h * 0.62} archH={h + 0.05} position={[0, 0, 0.02]} material={stoneMat(SANDSTONE)} />}
      {glow && (
        <mesh position={[0, h / 2, -0.4]}>
          <planeGeometry args={[w * 0.95, h * 0.95]} />
          <meshBasicMaterial color={glow} />
        </mesh>
      )}
    </group>
  );
};

// ---------------------------------------------------------------- rooms
/** Plastered room: floor, three walls with arched niches, beamed ceiling. Open toward +Z (camera side). */
export const Room: React.FC<{ w?: number; d?: number; h?: number; wall?: string; floor?: string; niches?: boolean }> = ({ w = 8, d = 6, h = 3.6, wall = "#bfa27c", floor = "#7a6450", niches = true }) => {
  const wm = plasterMat(wall, [w / 3, h / 3]);
  const fm = stoneMat(floor, [w / 2, d / 2]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={fm} receiveShadow>
        <planeGeometry args={[w, d]} />
      </mesh>
      {niches ? (
        <ArchedPanel width={w} height={h} depth={0.4} arches={Math.max(2, Math.round(w / 2.4))} archW={1.2} archSpring={1.4} archH={2.3} position={[0, 0, -d / 2]} material={wm} />
      ) : (
        <mesh position={[0, h / 2, -d / 2]} material={wm} receiveShadow>
          <boxGeometry args={[w, h, 0.4]} />
        </mesh>
      )}
      {/* niche backs (darker recesses) */}
      {niches && (
        <mesh position={[0, h / 2, -d / 2 - 0.25]} material={flatMat("#3a2a1c", 1)}>
          <planeGeometry args={[w, h]} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * w) / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wm} receiveShadow castShadow>
          <boxGeometry args={[d, h, 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={flatMat("#3a2618", 0.9)}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {Array.from({ length: Math.round(w / 1.2) }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.6 + i * 1.2, h - 0.12, 0]} material={flatMat("#4a3020", 0.85)} castShadow>
          <boxGeometry args={[0.16, 0.22, d]} />
        </mesh>
      ))}
    </group>
  );
};

/** Clay oil lamp (diya) on a small brass stand, with a real light. */
export const OilLamp: React.FC<{ frame: number; seed?: number; position: V3; intensity?: number; shadows?: boolean; stand?: number }> = ({ frame, seed = 0, position, intensity = 14, shadows = false, stand = 0.9 }) => {
  const fl = 1 + noise2D(`lamp${seed}`, frame * 0.15, 0) * 0.08;
  return (
    <group position={position}>
      {stand > 0 && (
        <mesh position={[0, stand / 2, 0]} material={flatMat("#a8873e", 0.35, 0.85)} castShadow>
          <cylinderGeometry args={[0.025, 0.08, stand, 10]} />
        </mesh>
      )}
      <mesh position={[0, stand + 0.03, 0]} material={flatMat("#8a4a2a", 0.8)}>
        <sphereGeometry args={[0.07, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      <group position={[0.03, stand + 0.06, 0]}>
        <Flame frame={frame} seed={seed + 80} size={0.07} embers={false} />
      </group>
      <pointLight position={[0, stand + 0.25, 0]} color="#ffa050" intensity={intensity * fl} distance={9} decay={1.6} castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.002} />
    </group>
  );
};

/**
 * Low wooden bed (takht) with mattress, bolster and a quilt. `pulled` 0..1 folds the quilt back toward the foot;
 * `occupied` raises the quilt over a body shape.
 */
export const Bed: React.FC<{ position?: V3; rotationY?: number; pulled?: number; occupied?: boolean; quilt?: string }> = ({ position = [0, 0, 0], rotationY = 0, pulled = 0, occupied = false, quilt = "#7a2a3a" }) => {
  const qGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.25, 1.8, 24, 32);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      // drape down at the sides, a soft body-shaped mound when occupied
      const side = Math.max(0, Math.abs(x) - 0.48) * 1.8;
      const body = occupied ? 0.3 * Math.exp(-(x * x) / 0.06) * (z > -0.75 ? 1 : 0.3) : 0.015;
      p.setY(i, body - side * side * 0.9 + noise2D("q", x * 3, z * 3) * 0.012);
    }
    g.computeVertexNormals();
    return g;
  }, [occupied]);
  const qm = cm(`quilt${quilt}`, () => new THREE.MeshStandardMaterial({ color: quilt, roughness: 0.9, side: THREE.DoubleSide }));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.22, 0]} material={flatMat("#5a3a22", 0.7)} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.14, 2.1]} />
      </mesh>
      {[[-0.56, -0.98], [0.56, -0.98], [-0.56, 0.98], [0.56, 0.98]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} material={flatMat("#4a2e1a", 0.7)} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.18, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.36, 0]} material={flatMat("#efe6d2", 0.9)} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.14, 2.0]} />
      </mesh>
      <mesh position={[0, 0.48, -0.86]} rotation={[0, 0, Math.PI / 2]} material={flatMat("#d8b25a", 0.6)} castShadow>
        <capsuleGeometry args={[0.1, 0.8, 6, 14]} />
      </mesh>
      {/* quilt: hinged near the foot so pulling it back folds it over */}
      <group position={[0, 0.44 + (occupied ? 0.16 : 0), 0.9]} rotation={[pulled * Math.PI * 0.92, 0, 0]}>
        <mesh geometry={qGeo} material={qm} position={[0, 0, -0.85 + pulled * 0.04]} castShadow receiveShadow />
      </group>
    </group>
  );
};

/** Low writing desk with a letter, inkpot and quill. */
export const LowDesk: React.FC<{ position?: V3; rotationY?: number }> = ({ position = [0, 0, 0], rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 0.3, 0]} material={flatMat("#5a3a22", 0.6)} castShadow receiveShadow>
      <boxGeometry args={[0.9, 0.06, 0.5]} />
    </mesh>
    {[[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.14, z]} material={flatMat("#4a2e1a")}>
        <boxGeometry args={[0.05, 0.28, 0.05]} />
      </mesh>
    ))}
    <mesh position={[0, 0.335, 0.02]} rotation={[0, 0.1, 0]} material={flatMat("#e2d2ac", 0.9)} castShadow>
      <boxGeometry args={[0.32, 0.004, 0.42]} />
    </mesh>
    <mesh position={[0.32, 0.37, -0.1]} material={flatMat("#1a2230", 0.2, 0.3)}>
      <cylinderGeometry args={[0.04, 0.05, 0.08, 14]} />
    </mesh>
  </group>
);

/** Floor cushion / bolster seat. */
export const Cushion: React.FC<{ position?: V3; color?: string; rotationY?: number }> = ({ position = [0, 0, 0], color = "#8a2a2a", rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 0.1, 0]} material={flatMat(color, 0.85)} castShadow receiveShadow>
      <boxGeometry args={[1.0, 0.2, 0.9]} />
    </mesh>
    <mesh position={[0, 0.28, -0.38]} rotation={[0, 0, Math.PI / 2]} material={flatMat("#d8b25a", 0.6)}>
      <capsuleGeometry args={[0.13, 0.6, 6, 12]} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------- tents
/** Campaign tent interior: cloth walls (octagonal), centre pole, rug. Open at the front (+Z). */
export const TentInterior: React.FC<{ frame: number; color?: string; r?: number }> = ({ frame, color = "#c9b48a", r = 4.2 }) => {
  const cloth = cm(`tent${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }));
  const sway = Math.sin(frame / 40) * 0.02;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={cm("rug", () => new THREE.MeshStandardMaterial({ map: earth("#6a3a2a", [3, 3]), roughness: 1 }))} receiveShadow>
        <circleGeometry args={[r, 32]} />
      </mesh>
      <mesh position={[0, 1.4, 0]} material={cloth} receiveShadow>
        <cylinderGeometry args={[r, r + sway, 2.8, 16, 1, true, Math.PI * 0.15, Math.PI * 1.7]} />
      </mesh>
      <mesh position={[0, 3.4, 0]} material={cloth} receiveShadow>
        <coneGeometry args={[r + 0.05, 1.6, 16, 1, true]} />
      </mesh>
      <mesh position={[0, 2.1, -0.4]} material={flatMat("#5a3a22", 0.7)} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 4.2, 10]} />
      </mesh>
      {/* stripes on the cloth */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI * 0.15 + (i / 8) * Math.PI * 1.7;
        return (
          <mesh key={i} position={[Math.sin(a) * (r - 0.02), 1.4, Math.cos(a) * (r - 0.02)]} rotation={[0, a, 0]} material={flatMat("#8a2a2a", 0.9)}>
            <planeGeometry args={[0.25, 2.8]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Exterior campaign tent (for camps in the distance). */
export const TentExterior: React.FC<{ position: V3; color?: string; scale?: number; rotationY?: number }> = ({ position, color = "#d8c8a0", scale = 1, rotationY = 0 }) => (
  <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 0.9, 0]} material={flatMat(color, 0.95)} castShadow receiveShadow>
      <cylinderGeometry args={[1.6, 1.7, 1.8, 10]} />
    </mesh>
    <mesh position={[0, 2.3, 0]} material={flatMat(color, 0.95)} castShadow>
      <coneGeometry args={[1.8, 1.2, 10]} />
    </mesh>
    <mesh position={[0, 3.2, 0]} material={flatMat("#5a3a22")}>
      <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
    </mesh>
    <mesh position={[0, 0.7, 1.62]} material={flatMat("#3a2618")}>
      <planeGeometry args={[0.8, 1.4]} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------- flags (wind-driven cloth)
/**
 * Flag rippling in the wind: travelling waves whose amplitude grows from the hoist to the fly end, with a gentle
 * sag — the motion of real bunting under a steady breeze. Deterministic in `frame`.
 */
export const Flag: React.FC<{ frame: number; color: string; size?: [number, number]; pole?: number; position?: V3; seed?: number; swallow?: boolean }> = ({ frame, color, size = [1.4, 0.9], pole = 3, position = [0, 0, 0], seed = 0, swallow = true }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(size[0], size[1], 24, 10), [size]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useLayoutEffect(() => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    const t = frame / 30;
    for (let i = 0; i < p.count; i++) {
      const x0 = base[i * 3];
      const y0 = base[i * 3 + 1];
      const u = (x0 + size[0] / 2) / size[0]; // 0 at the pole
      const amp = 0.18 * size[0] * u * u + 0.02;
      const z = amp * Math.sin(u * 7 - t * 6.5 + seed) + 0.05 * u * noise2D(`fl${seed}`, u * 3 - t, y0 * 2);
      // swallow-tail notch on Maratha-style pennants
      const notch = swallow && u > 0.82 && Math.abs(y0) < size[1] * 0.18 * (u - 0.82) / 0.18 ? -0.1 : 0;
      p.setXYZ(i, x0 + notch * 0, y0 - u * u * 0.06 * size[1], z);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  }, [frame, geo, base, size, seed, swallow]);
  const m = cm(`flag${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
  return (
    <group position={position}>
      <mesh position={[0, pole / 2, 0]} material={flatMat("#4a3020", 0.7)} castShadow>
        <cylinderGeometry args={[0.03, 0.04, pole, 8]} />
      </mesh>
      <mesh geometry={geo} material={m} position={[size[0] / 2 + 0.03, pole - size[1] / 2 - 0.05, 0]} castShadow />
    </group>
  );
};

// ---------------------------------------------------------------- terrain and hill forts
export type Flat = [number, number, number, number?];

/** Terrain height at (x, z): ridged multi-octave noise, mesa plateaus, and levelled summits/plains (`flats`). */
export function terrainHeight(x: number, z: number, height: number, seed: string, flats: Flat[]): number {
  let h = 0;
  let a = 1;
  let fq = 1 / 90;
  for (let o = 0; o < 4; o++) {
    h += (1 - Math.abs(noise2D(seed + o, x * fq, z * fq))) * a; // ridged
    a *= 0.5;
    fq *= 2.1;
  }
  h = Math.pow(h / 1.9, 2.2) * height;
  // mesa tops: flatten above a plateau line (characteristic Deccan traps)
  h = h > height * 0.55 ? height * 0.55 + (h - height * 0.55) * 0.15 : h;
  for (const [fx, fz, fh, fr = 14] of flats) {
    const d = Math.hypot(x - fx, z - fz);
    const k = d < fr ? 1 : Math.max(0, 1 - (d - fr) / (fr * 1.6));
    const kk = k * k * (3 - 2 * k);
    h = h * (1 - kk) + fh * kk;
  }
  return h;
}

/** Ridged hill terrain (Deccan basalt plateaus) with vertex colours from height. */
export const Terrain: React.FC<{ size?: number; seg?: number; height?: number; seed?: string; flats?: Flat[]; palette?: [string, string, string] }> = ({ size = 400, seg = 160, height = 38, seed = "deccan", flats = [], palette = ["#5f6b3a", "#7b6a45", "#4a4036"] }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const cols: number[] = [];
    const [low, mid, high] = palette.map((c) => new THREE.Color(c));
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const h = terrainHeight(x, z, height, seed, flats);
      p.setY(i, h);
      const t = Math.min(1, h / (height * 0.6));
      const c = low.clone().lerp(mid, t).lerp(high, Math.max(0, t - 0.7) * 2);
      c.multiplyScalar(0.85 + noise2D(seed + "c", x * 0.05, z * 0.05) * 0.15);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [size, seg, height, seed, flats, palette]);
  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={1} flatShading={false} />
    </mesh>
  );
};

/** Hill fort crowning a summit: a ring of battlemented walls with bastions, a gate and saffron flags. */
export const HillFort: React.FC<{ frame: number; position: V3; scale?: number; flags?: string }> = ({ frame, position, scale = 1, flags = "#e8892b" }) => {
  const m = stoneMat("#6e5a48", [6, 1]);
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const r = 9 + Math.sin(i * 1.7) * 1.5;
        return (
          <group key={i} position={[Math.sin(a) * r, 0, Math.cos(a) * r]} rotation={[0, a + Math.PI / 2, 0]}>
            <mesh position={[0, 1.6, 0]} material={m} castShadow receiveShadow>
              <boxGeometry args={[6.4, 3.2, 1.2]} />
            </mesh>
            <mesh position={[3.2, 2.0, 0]} material={m} castShadow>
              <cylinderGeometry args={[1.0, 1.1, 4.0, 12]} />
            </mesh>
            {Array.from({ length: 6 }, (_, k) => (
              <mesh key={k} position={[-2.8 + k * 1.1, 3.45, 0]} material={m}>
                <boxGeometry args={[0.5, 0.5, 1.2]} />
              </mesh>
            ))}
          </group>
        );
      })}
      <mesh position={[0, 2.5, 0]} material={stoneMat("#7a6650", [2, 1])} castShadow>
        <boxGeometry args={[5, 5, 4]} />
      </mesh>
      <Chhatri position={[0, 5, 0]} scale={0.8} color="#6e5a48" domeColor="#cfc4ae" />
      <Flag frame={frame} color={flags} position={[3.2, 4, 9]} pole={4.5} size={[2.2, 1.3]} seed={1} />
      <Flag frame={frame} color={flags} position={[-6, 3.5, -6]} pole={4.2} size={[2, 1.2]} seed={2} />
    </group>
  );
};

// ---------------------------------------------------------------- vegetation
/** Stylised tree: banyan/neem (broad canopy) or palm. */
export const Tree: React.FC<{ position: V3; scale?: number; kind?: "broad" | "palm"; seed?: number; frame?: number }> = ({ position, scale = 1, kind = "broad", seed = 0, frame = 0 }) => {
  const sway = Math.sin(frame / 45 + seed) * 0.03;
  if (kind === "palm")
    return (
      <group position={position} scale={scale} rotation={[0, seed, sway]}>
        <mesh position={[0, 3, 0]} rotation={[0, 0, 0.08]} material={flatMat("#6a5038", 0.9)} castShadow>
          <cylinderGeometry args={[0.12, 0.2, 6, 8]} />
        </mesh>
        {/* fronds radiate around the crown and droop outward (yaw outside, droop inside) */}
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} position={[0.24, 5.95, 0]} rotation={[0, (i / 9) * Math.PI * 2 + seed, 0]}>
            <mesh position={[0, -0.3 - (i % 3) * 0.08, 1.15]} rotation={[0.3 + (i % 3) * 0.15, 0, 0]} material={flatMat(i % 2 ? "#3f6a3a" : "#4a7a40", 0.9)} castShadow>
              <boxGeometry args={[0.42, 0.03, 2.4]} />
            </mesh>
          </group>
        ))}
      </group>
    );
  return (
    <group position={position} scale={scale} rotation={[0, seed, sway]}>
      <mesh position={[0, 1.5, 0]} material={flatMat("#5a4030", 0.9)} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 3, 8]} />
      </mesh>
      {[[0, 3.6, 0, 2.2], [1.2, 3.2, 0.4, 1.5], [-1.1, 3.3, -0.3, 1.6], [0.2, 4.3, -0.6, 1.4]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={flatMat(i % 2 ? "#3f6a3a" : "#4a7a40", 0.95)} castShadow receiveShadow>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- siege artillery
/** Bronze field cannon on a wooden carriage; `recoil` 0..1 drives the kick and a muzzle smoke cue. */
export const Cannon: React.FC<{ position: V3; rotationY?: number; recoil?: number }> = ({ position, rotationY = 0, recoil = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <group position={[0, 0, -recoil * 0.35]}>
      <mesh position={[0, 0.55, 0.3]} rotation={[Math.PI / 2 - 0.12, 0, 0]} material={flatMat("#8a6a3a", 0.35, 0.85)} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 2.0, 16]} />
      </mesh>
      <mesh position={[0, 0.35, -0.1]} material={flatMat("#5a3a22", 0.8)} castShadow>
        <boxGeometry args={[0.5, 0.3, 1.4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.32, 0.35, -0.1]} rotation={[0, 0, Math.PI / 2]} material={flatMat("#4a2e1a", 0.8)} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.08, 16]} />
        </mesh>
      ))}
    </group>
  </group>
);

// ---------------------------------------------------------------- river boats
/** Wooden river boat with a lantern at the prow; rocks on the water deterministically. */
export const Boat: React.FC<{ frame: number; position: V3; rotationY?: number; scale?: number; seed?: number; lantern?: boolean }> = ({ frame, position, rotationY = 0, scale = 1, seed = 0, lantern = true }) => {
  const t = frame / 30;
  const roll = Math.sin(t * 1.1 + seed) * 0.04;
  const pitch = Math.sin(t * 0.8 + seed * 2) * 0.03;
  const heave = Math.sin(t * 1.3 + seed) * 0.05;
  const hull = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-3, 0.4);
    s.quadraticCurveTo(-2.6, -0.4, 0, -0.5);
    s.quadraticCurveTo(2.6, -0.4, 3.2, 0.6);
    s.lineTo(-3, 0.4);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: false });
    g.translate(0, 0, -0.7);
    return g;
  }, []);
  return (
    <group position={[position[0], position[1] + heave, position[2]]} rotation={[pitch, rotationY, roll]} scale={scale}>
      <mesh geometry={hull} material={flatMat("#4a3020", 0.85)} castShadow receiveShadow />
      <mesh position={[0, 0.42, 0]} material={flatMat("#3a2416", 0.85)}>
        <boxGeometry args={[5.6, 0.06, 1.3]} />
      </mesh>
      {lantern && (
        <group position={[2.9, 1.2, 0]}>
          <mesh position={[0, -0.5, 0]} material={flatMat("#3a2416")}>
            <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
          </mesh>
          <Glow position={[0, 0.05, 0]} size={1.6} color="#ffb060" opacity={0.8} />
          <pointLight color="#ffa050" intensity={6} distance={10} decay={1.6} />
        </group>
      )}
    </group>
  );
};
