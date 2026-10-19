import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { V3 } from "../engine/Stage3D";
import { earth, marbleTiles, masonry, plaster, weave } from "./textures";

/** Mughal-era architecture kit (original, procedural). Units: metres. */

export const SANDSTONE = "#a8473a";
export const SANDSTONE_DARK = "#7c3227";
export const MARBLE = "#ece4d2";

const matCache = new Map<string, THREE.Material>();
function cached(key: string, make: () => THREE.Material) {
  let m = matCache.get(key);
  if (!m) {
    m = make();
    matCache.set(key, m);
  }
  return m;
}
export const stoneMat = (color = SANDSTONE, rep: [number, number] = [1, 1]) => cached(`stone${color}${rep}`, () => new THREE.MeshStandardMaterial({ map: masonry(color, rep), roughness: 0.92 }));
export const plasterMat = (color = "#d9c7a6", rep: [number, number] = [1, 1]) => cached(`plas${color}${rep}`, () => new THREE.MeshStandardMaterial({ map: plaster(color, rep), roughness: 0.95 }));
export const marbleMat = (color = MARBLE, rep: [number, number] = [1, 1], rough = 0.35) => cached(`marb${color}${rep}${rough}`, () => new THREE.MeshStandardMaterial({ map: marbleTiles(color, rep), roughness: rough }));
export const earthMat = (color = "#6f5a40", rep: [number, number] = [1, 1]) => cached(`earth${color}${rep}`, () => new THREE.MeshStandardMaterial({ map: earth(color, rep), roughness: 1 }));
export const flatMat = (color: string, rough = 0.85, metal = 0) => cached(`flat${color}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
export const glowMat = (color: string) => cached(`glow${color}`, () => new THREE.MeshBasicMaterial({ color }));

/** Pointed, multi-foil (cusped) Mughal arch outline as a closed shape: width w, spring height s, total height h. */
export function cuspedArch(w: number, s: number, h: number, lobes = 4, depth = 0.06): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-w / 2, 0)];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 left spring → 1 right spring
    const th = Math.PI * (1 - t);
    // pointed arch: raise the crown with a power curve
    const x = (w / 2) * Math.cos(th);
    const y = s + (h - s) * Math.pow(Math.sin(th), 0.75);
    // lobes: pull inward toward the opening centre
    const lobe = depth * w * Math.abs(Math.sin(lobes * Math.PI * t));
    const k = 1 - lobe / Math.max(0.001, Math.hypot(x, y - s * 0.7));
    pts.push(new THREE.Vector2(x * k, s * 0.7 + (y - s * 0.7) * k));
  }
  pts.push(new THREE.Vector2(w / 2, 0));
  return pts;
}

/** A wall panel pierced by a row of cusped arches, extruded to `depth`. Used for arcades, gates and facades. */
export const ArchedPanel: React.FC<{ width: number; height: number; depth: number; arches: number; archW: number; archSpring: number; archH: number; position?: V3; rotationY?: number; material: THREE.Material; backMaterial?: THREE.Material }> = ({ width, height, depth, arches, archW, archSpring, archH, position = [0, 0, 0], rotationY = 0, material }) => {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height);
    shape.lineTo(-width / 2, 0);
    const pitch = width / arches;
    for (let i = 0; i < arches; i++) {
      const cx = -width / 2 + pitch * (i + 0.5);
      const hole = new THREE.Path(cuspedArch(archW, archSpring, archH).map((p) => new THREE.Vector2(p.x + cx, Math.max(0.001, p.y))).reverse());
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -depth / 2);
    // world-scaled UVs so masonry blocks stay a constant size
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    return g;
  }, [width, height, depth, arches, archW, archSpring, archH]);
  return <mesh geometry={geo} material={material} position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow />;
};

/** Instanced merlons (kangura battlements) along a line. */
export const Merlons: React.FC<{ from: V3; to: V3; spacing?: number; size?: [number, number, number]; material: THREE.Material }> = ({ from, to, spacing = 0.9, size = [0.55, 0.8, 0.45], material }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const len = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const count = Math.max(1, Math.floor(len / spacing));
  const geo = useMemo(() => {
    const body = new THREE.BoxGeometry(size[0], size[1] * 0.7, size[2]);
    body.translate(0, (size[1] * 0.7) / 2, 0);
    const cap = new THREE.SphereGeometry(size[0] / 2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.75, size[2] / size[0]);
    cap.translate(0, size[1] * 0.7, 0);
    const merged = mergeGeos([body, cap]);
    return merged;
  }, [size]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const ang = Math.atan2(to[0] - from[0], to[2] - from[2]);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      o.position.set(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t);
      o.rotation.set(0, ang, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [from, to, count]);
  return <instancedMesh ref={ref} args={[geo, material, count]} castShadow receiveShadow />;
};

/** Merge simple non-indexed/indexed geometries (position, normal, uv) into one. */
export function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

/** Fort curtain wall: battered base, body, walkway, parapet with merlons on the outer edge and a string course. */
export const FortWall: React.FC<{ from: [number, number]; to: [number, number]; height?: number; thickness?: number; color?: string }> = ({ from, to, height = 10, thickness = 4, color = SANDSTONE }) => {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ang = Math.atan2(to[0] - from[0], to[1] - from[1]);
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;
  const m = stoneMat(color, [len / 6, height / 6]);
  const dark = stoneMat(SANDSTONE_DARK, [len / 6, 1]);
  return (
    <group position={[cx, 0, cz]} rotation={[0, ang - Math.PI / 2, 0]}>
      {/* battered plinth */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow material={dark}>
        <boxGeometry args={[len, 2.4, thickness + 0.8]} />
      </mesh>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={m}>
        <boxGeometry args={[len, height, thickness]} />
      </mesh>
      {/* string course */}
      <mesh position={[0, height - 0.15, thickness / 2 + 0.08]} material={dark} castShadow>
        <boxGeometry args={[len, 0.3, 0.3]} />
      </mesh>
      <Merlons from={[-len / 2, height, thickness / 2 - 0.25]} to={[len / 2, height, thickness / 2 - 0.25]} material={m} />
    </group>
  );
};

/** Round bastion tower with a battlemented top and a chhatri. */
export const Bastion: React.FC<{ position: [number, number]; radius?: number; height?: number; chhatri?: boolean; color?: string }> = ({ position, radius = 3.2, height = 12, chhatri = true, color = SANDSTONE }) => {
  const m = stoneMat(color, [radius * 1.2, height / 6]);
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={m}>
        <cylinderGeometry args={[radius, radius * 1.08, height, 28]} />
      </mesh>
      <mesh position={[0, height - 0.15, 0]} material={stoneMat(SANDSTONE_DARK)} castShadow>
        <cylinderGeometry args={[radius + 0.2, radius + 0.2, 0.3, 28]} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * (radius - 0.2), height, Math.cos(a) * (radius - 0.2)]} rotation={[0, a, 0]}>
            <mesh position={[0, 0.3, 0]} material={m} castShadow>
              <boxGeometry args={[0.55, 0.6, 0.4]} />
            </mesh>
            <mesh position={[0, 0.6, 0]} material={m}>
              <sphereGeometry args={[0.275, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          </group>
        );
      })}
      {chhatri && <Chhatri position={[0, height, 0]} scale={radius / 3} />}
    </group>
  );
};

/** Chhatri: domed open pavilion on four pillars with a deep chhajja (eave). */
export const Chhatri: React.FC<{ position: V3; scale?: number; color?: string; domeColor?: string }> = ({ position, scale = 1, color = SANDSTONE, domeColor = MARBLE }) => {
  const m = stoneMat(color);
  const dm = flatMat(domeColor, 0.5);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} material={m} castShadow>
        <boxGeometry args={[2.4, 0.4, 2.4]} />
      </mesh>
      {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.3, z]} material={m} castShadow>
          <cylinderGeometry args={[0.13, 0.16, 1.9, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 2.3, 0]} material={m} castShadow>
        <boxGeometry args={[3.0, 0.14, 3.0]} />
      </mesh>
      <mesh position={[0, 2.45, 0]} material={m} castShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.3, 16]} />
      </mesh>
      <OnionDome position={[0, 2.6, 0]} radius={1.05} material={dm} />
    </group>
  );
};

const ONION: [number, number][] = [[1, 0], [1.08, 0.25], [1.06, 0.55], [0.86, 0.9], [0.5, 1.2], [0.18, 1.42], [0.07, 1.55], [0.0, 1.6]];
/** Bulbous Mughal dome with a kalash finial. */
export const OnionDome: React.FC<{ position: V3; radius: number; material: THREE.Material }> = ({ position, radius, material }) => {
  const geo = useMemo(() => new THREE.LatheGeometry(ONION.map(([r, y]) => new THREE.Vector2(r, y)), 32), []);
  return (
    <group position={position} scale={radius}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
      <mesh position={[0, 1.66, 0]} material={flatMat("#c9a24a", 0.3, 0.9)}>
        <sphereGeometry args={[0.09, 10, 8]} />
      </mesh>
      <mesh position={[0, 1.85, 0]} material={flatMat("#c9a24a", 0.3, 0.9)}>
        <coneGeometry args={[0.04, 0.35, 8]} />
      </mesh>
    </group>
  );
};

/** Gateway: a tall cusped-arch portal with flanking octagonal towers, chhatris and heavy wooden doors (openable). */
export const Gateway: React.FC<{ position?: V3; rotationY?: number; width?: number; height?: number; doorsOpen?: number; color?: string; innerGlow?: string }> = ({ position = [0, 0, 0], rotationY = 0, width = 9, height = 14, doorsOpen = 0, color = SANDSTONE, innerGlow }) => {
  const m = stoneMat(color, [2, 3]);
  const aw = width * 0.42;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <ArchedPanel width={width} height={height} depth={4} arches={1} archW={aw} archSpring={height * 0.42} archH={height * 0.66} material={m} />
      {/* recess frame */}
      <ArchedPanel width={width * 0.62} height={height * 0.8} depth={0.4} arches={1} archW={aw * 1.25} archSpring={height * 0.45} archH={height * 0.72} position={[0, 0, 2.1]} material={stoneMat(SANDSTONE_DARK)} />
      {/* dark passage */}
      <mesh position={[0, height * 0.33, -1.6]} material={innerGlow ? glowMat(innerGlow) : flatMat("#0a0806", 1)}>
        <planeGeometry args={[aw, height * 0.66]} />
      </mesh>
      {/* doors swing inward */}
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * aw) / 2, 0, 0.6]} rotation={[0, -s * doorsOpen * 1.4, 0]}>
          <mesh position={[(-s * aw) / 4, height * 0.24, 0]} material={flatMat("#4a2e1a", 0.9)} castShadow>
            <boxGeometry args={[aw / 2, height * 0.48, 0.18]} />
          </mesh>
          {Array.from({ length: 4 }, (_, i) => (
            <mesh key={i} position={[(-s * aw) / 4, 0.8 + i * 1.4, 0.1]} material={flatMat("#6a6a6a", 0.4, 0.8)}>
              <boxGeometry args={[aw / 2 - 0.1, 0.08, 0.04]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={"t" + s} position={[s * (width / 2 + 1.6), 0, 0.4]}>
          <mesh position={[0, (height + 3) / 2, 0]} material={m} castShadow receiveShadow>
            <cylinderGeometry args={[2, 2.2, height + 3, 8]} />
          </mesh>
          <Chhatri position={[0, height + 3, 0]} scale={0.75} />
        </group>
      ))}
      <Merlons from={[-width / 2, height, 1.8]} to={[width / 2, height, 1.8]} material={m} />
    </group>
  );
};

/** Haveli (residence): plastered block with arched windows (lit from inside), a jharokha balcony, parapet and roof chhatri. */
export const Haveli: React.FC<{ position?: V3; rotationY?: number; w?: number; d?: number; h?: number; lit?: number; color?: string }> = ({ position = [0, 0, 0], rotationY = 0, w = 12, d = 9, h = 7, lit = 1, color = "#cdb38e" }) => {
  const m = plasterMat(color, [w / 4, h / 4]);
  const trimM = stoneMat(SANDSTONE, [2, 1]);
  const win = (x: number, y: number, z: number, ry: number, k: number) => (
    <group key={`${x}${y}${z}`} position={[x, y, z]} rotation={[0, ry, 0]}>
      <ArchedPanel width={1.6} height={2.2} depth={0.25} arches={1} archW={1.0} archSpring={1.2} archH={1.9} material={trimM} />
      <mesh position={[0, 0.95, -0.05]} material={lit > 0 ? glowMat(new THREE.Color("#ffb860").multiplyScalar(0.25 + 0.75 * lit * k).getStyle()) : flatMat("#141010", 1)}>
        <planeGeometry args={[1.0, 1.9]} />
      </mesh>
    </group>
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, h / 2, 0]} material={m} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* flat plastered roof with a sandstone parapet ring */}
      {[[0, d / 2, w + 0.3, 0.3], [0, -d / 2, w + 0.3, 0.3], [w / 2, 0, 0.3, d], [-w / 2, 0, 0.3, d]].map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, h + 0.45, z]} material={trimM} castShadow>
          <boxGeometry args={[sx, 0.9, sz]} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.5, d / 2 + 0.05]} material={trimM}>
        <boxGeometry args={[w, 0.25, 0.25]} />
      </mesh>
      {[-3.6, -1.2, 1.2, 3.6].map((x, i) => win(x, 0.8, d / 2 + 0.13, 0, i % 2 ? 1 : 0.7))}
      {[-3.6, 3.6].map((x, i) => win(x, h * 0.55, d / 2 + 0.13, 0, i ? 0.9 : 0.6))}
      {[-2.4, 0, 2.4].map((z, i) => win(w / 2 + 0.13, 0.8, z, Math.PI / 2, i === 1 ? 1 : 0.5))}
      {/* jharokha balcony */}
      <group position={[0, h * 0.55, d / 2 + 0.6]}>
        <mesh material={trimM} castShadow>
          <boxGeometry args={[2.6, 0.25, 1.2]} />
        </mesh>
        {[-1.1, 1.1].map((x) => (
          <mesh key={x} position={[x, 1.0, 0.45]} material={trimM}>
            <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
          </mesh>
        ))}
        <mesh position={[0, 2.0, 0.1]} material={trimM} castShadow>
          <boxGeometry args={[2.9, 0.15, 1.5]} />
        </mesh>
        <mesh position={[0, 2.15, 0.1]} material={trimM}>
          <cylinderGeometry args={[0.2, 1.1, 0.5, 4, 1, false, Math.PI / 4]} />
        </mesh>
        <mesh position={[0, 0.9, -0.15]} material={lit > 0 ? glowMat("#e8a050") : flatMat("#141010", 1)}>
          <planeGeometry args={[1.8, 1.6]} />
        </mesh>
      </group>
      <Chhatri position={[w / 2 - 1.5, h + 0.8, -d / 2 + 1.5]} scale={0.6} />
    </group>
  );
};

/** Courtyard ground plane with earth texture. */
export const Ground: React.FC<{ size?: number; color?: string; y?: number }> = ({ size = 200, color = "#6f5a40", y = 0 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow material={earthMat(color, [size / 8, size / 8])}>
    <planeGeometry args={[size, size]} />
  </mesh>
);

/** Polished marble floor. */
export const MarbleFloor: React.FC<{ size: [number, number]; y?: number; color?: string }> = ({ size, y = 0, color = MARBLE }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow material={marbleMat(color, [size[0] / 3, size[1] / 3], 0.28)}>
    <planeGeometry args={size} />
  </mesh>
);

// ---------------- baskets ----------------
const BASKET: [number, number][] = [[0.0, 0.0], [0.26, 0.0], [0.34, 0.08], [0.4, 0.3], [0.42, 0.55], [0.4, 0.72], [0.37, 0.78]];

/**
 * Large cane sweet-basket. `cutaway` removes the front half so the inside can be shown (documentary cutaway);
 * `fill` shows sweets (laddoos) at the rim; `lid` 0 closed … 1 lifted. Origin at the basket base.
 */
export const Basket: React.FC<{ cutaway?: boolean; fill?: "sweets" | "none"; lid?: number; children?: React.ReactNode }> = ({ cutaway = false, fill = "sweets", lid = 0, children }) => {
  const body = useMemo(() => new THREE.LatheGeometry(BASKET.map(([r, y]) => new THREE.Vector2(r, y)), 36, cutaway ? Math.PI / 2 : 0, cutaway ? Math.PI : Math.PI * 2), [cutaway]);
  const wm = cached(`weave${cutaway}`, () => new THREE.MeshStandardMaterial({ map: weave("#b88a4a", [6, 2]), roughness: 0.9, side: THREE.DoubleSide }));
  const rim = flatMat("#7a5530", 0.8);
  const sweets = flatMat("#e39a2c", 0.6);
  return (
    <group>
      <mesh geometry={body} material={wm} castShadow receiveShadow />
      <mesh position={[0, 0.78, 0]} rotation={[cutaway ? -Math.PI / 2 : Math.PI / 2, 0, 0]} material={rim} castShadow>
        <torusGeometry args={[0.37, 0.025, 8, 36, cutaway ? Math.PI : Math.PI * 2]} />
      </mesh>
      {fill === "sweets" &&
        Array.from({ length: 22 }, (_, i) => {
          const a = i * 2.39996;
          const r = 0.3 * Math.sqrt((i + 0.5) / 22);
          if (cutaway && Math.sin(a) > 0) return null;
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.74 + (i % 3) * 0.03, Math.sin(a) * r]} material={i % 4 ? sweets : flatMat("#f2d06a", 0.6)} castShadow>
              <sphereGeometry args={[0.055, 10, 8]} />
            </mesh>
          );
        })}
      {!cutaway && (
        <group position={[0, 0.8 + lid * 0.25, lid * 0.15]} rotation={[-lid * 0.6, 0, 0]}>
          <mesh material={wm} castShadow>
            <cylinderGeometry args={[0.2, 0.4, 0.14, 32]} />
          </mesh>
        </group>
      )}
      {children}
    </group>
  );
};

/** Carrying pole with rope lashings. Along local X, length L, centred. */
export const Pole: React.FC<{ length?: number }> = ({ length = 2.6 }) => (
  <group>
    <mesh rotation={[0, 0, Math.PI / 2]} material={flatMat("#6b4a2a", 0.8)} castShadow>
      <cylinderGeometry args={[0.035, 0.035, length, 10]} />
    </mesh>
    {[-0.12, 0.12].map((x) => (
      <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={flatMat("#cbb58a", 0.9)}>
        <cylinderGeometry args={[0.045, 0.045, 0.08, 10]} />
      </mesh>
    ))}
  </group>
);

/** Straight rope between two points (thin cylinder). */
export const Rope: React.FC<{ a: V3; b: V3; r?: number }> = ({ a, b, r = 0.012 }) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <mesh position={mid.toArray()} quaternion={q} material={flatMat("#cbb58a", 0.9)} castShadow>
      <cylinderGeometry args={[r, r, len, 6]} />
    </mesh>
  );
};
