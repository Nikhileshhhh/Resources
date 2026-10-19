import * as THREE from "three";

/**
 * Procedural surface textures drawn on canvases (original, no downloads). Each is cached by its parameters.
 * Values come from a seeded PRNG so every render tab draws identical textures.
 */
const cache = new Map<string, THREE.Texture>();

function prng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

function make(key: string, size: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void, repeat: [number, number]): THREE.Texture {
  const k = `${key}|${repeat.join("x")}`;
  const hit = cache.get(k);
  if (hit) return hit;
  let base = cache.get(key);
  if (!base) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d")!, prng(key.length * 7919 + size));
    base = new THREE.CanvasTexture(c);
    base.colorSpace = THREE.SRGBColorSpace;
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    base.anisotropy = 4;
    cache.set(key, base);
  }
  const t = base.clone();
  t.repeat.set(repeat[0], repeat[1]);
  t.needsUpdate = true;
  cache.set(k, t);
  return t;
}

/** Ashlar masonry: staggered courses of dressed stone blocks with mortar joints and tonal variation. */
export function masonry(color: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  return make(`masonry${color}`, 512, (g, r) => {
    g.fillStyle = shade(color, 0.72);
    g.fillRect(0, 0, 512, 512);
    const rows = 8;
    const h = 512 / rows;
    for (let y = 0; y < rows; y++) {
      let x = y % 2 ? -40 : 0;
      while (x < 512) {
        const w = 70 + r() * 70;
        g.fillStyle = shade(color, 0.85 + r() * 0.3);
        g.fillRect(x + 2, y * h + 2, w - 4, h - 4);
        // weathering speckle
        for (let i = 0; i < 18; i++) {
          g.fillStyle = `rgba(${r() > 0.5 ? "255,240,220" : "40,20,10"},${0.04 + r() * 0.06})`;
          g.fillRect(x + r() * w, y * h + r() * h, 2 + r() * 6, 2 + r() * 4);
        }
        x += w;
      }
    }
  }, repeat);
}

/** Lime plaster with soft mottling (haveli walls). */
export function plaster(color: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  return make(`plaster${color}`, 256, (g, r) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "60,40,20"},${0.03 + r() * 0.05})`;
      const s = 6 + r() * 30;
      g.beginPath();
      g.arc(r() * 256, r() * 256, s, 0, Math.PI * 2);
      g.fill();
    }
  }, repeat);
}

/** Polished marble slabs with faint veins and grout lines. */
export function marbleTiles(color: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  return make(`marble${color}`, 512, (g, r) => {
    const n = 4;
    const s = 512 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        g.fillStyle = shade(color, 0.94 + r() * 0.08);
        g.fillRect(i * s, j * s, s, s);
        g.strokeStyle = `rgba(120,110,95,${0.12 + r() * 0.12})`;
        g.lineWidth = 1 + r() * 1.5;
        g.beginPath();
        let x = i * s + r() * s;
        let y = j * s;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (r() - 0.5) * 40;
          y += s / 6;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    g.strokeStyle = "rgba(90,80,70,0.35)";
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, 512);
      g.moveTo(0, i * s);
      g.lineTo(512, i * s);
      g.stroke();
    }
  }, repeat);
}

/** Basket weave: over-under cane strips with shading, for the sweet baskets. */
export function weave(color: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  return make(`weave${color}`, 256, (g, r) => {
    g.fillStyle = shade(color, 0.45);
    g.fillRect(0, 0, 256, 256);
    const n = 16;
    const s = 256 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const over = (i + j) % 2 === 0;
        const grd = over ? g.createLinearGradient(i * s, 0, i * s + s, 0) : g.createLinearGradient(0, j * s, 0, j * s + s);
        grd.addColorStop(0, shade(color, 0.7));
        grd.addColorStop(0.5, shade(color, 1.05 + r() * 0.1));
        grd.addColorStop(1, shade(color, 0.7));
        g.fillStyle = grd;
        g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      }
  }, repeat);
}

/** Packed earth / courtyard ground with pebbles and tonal patches. */
export function earth(color: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  return make(`earth${color}`, 512, (g, r) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "255,235,200" : "40,25,10"},${0.03 + r() * 0.06})`;
      const s = 2 + r() * (r() > 0.95 ? 40 : 8);
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, s, s * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }, repeat);
}

/** Woven rug / carpet border pattern for court floors. */
export function carpet(base: string, accent: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  return make(`carpet${base}${accent}`, 512, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = accent;
    g.lineWidth = 10;
    g.strokeRect(24, 24, 464, 464);
    g.lineWidth = 3;
    g.strokeRect(48, 48, 416, 416);
    g.fillStyle = accent;
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) {
        g.save();
        g.translate(96 + i * 64, 96 + j * 64);
        g.rotate(Math.PI / 4);
        g.globalAlpha = 0.55;
        g.fillRect(-10, -10, 20, 20);
        g.restore();
      }
  }, repeat);
}
