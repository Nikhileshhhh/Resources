/**
 * Build pre-projected South Asia map data (Natural Earth 1:50m, public domain) for the MapScene component.
 * Usage: tsx scripts/build-map.ts <naturalEarthDir>
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { geoMercator, geoPath } from "d3-geo";

const dir = process.argv[2];
const land = JSON.parse(readFileSync(path.join(dir, "ne_50m_land.geojson"), "utf8"));
const rivers = JSON.parse(readFileSync(path.join(dir, "ne_50m_rivers_lake_centerlines.geojson"), "utf8"));
const W = 1920, H = 1080;
// Frame: Kabul (NW) to the Brahmaputra (E), down to the southern tip of the peninsula.
const bbox = { type: "MultiPoint", coordinates: [[61, 7], [97, 37.5]] };
const proj = geoMercator().fitExtent([[60, 30], [W - 60, H - 30]], bbox as any).clipExtent([[-400, -400], [W + 400, H + 400]]);
const gp = geoPath(proj);
const round = (d: string | null) => (d ?? "").replace(/\d+\.\d+/g, (n) => Number(n).toFixed(1));
const landPath = round(gp(land));
const wanted = ["Ganges", "Ganga", "Yamuna", "Brahmaputra", "Indus", "Narmada", "Godavari", "Krishna", "Tapti", "Chambal", "Son", "Mahanadi", "Kabul"];
const riverPaths: { name: string; d: string }[] = [];
for (const f of rivers.features) {
  const name: string = f.properties.name ?? f.properties.name_en ?? "";
  if (!wanted.some((w) => name.includes(w))) continue;
  const d = round(gp(f));
  if (d && d.length > 20) riverPaths.push({ name, d });
}
const places: Record<string, [number, number]> = {
  Agra: [78.02, 27.18], Mathura: [77.67, 27.49], Delhi: [77.21, 28.61], Allahabad: [81.85, 25.44], Benares: [82.99, 25.32], Gaya: [85.0, 24.79],
  Puri: [85.83, 19.81], Surat: [72.83, 21.17], Purandar: [73.97, 18.28], Rajgad: [73.68, 18.25], Raigad: [73.44, 18.23], Kondana: [73.76, 18.37],
  Kabul: [69.17, 34.53], Bijapur: [75.71, 16.83], Golconda: [78.4, 17.38], Aurangabad: [75.34, 19.88], Dholpur: [77.89, 26.7], Narwar: [77.9, 25.65],
  Saraighat: [91.74, 26.18], Burhanpur: [76.23, 21.31], Jaipur: [75.79, 26.92], Gondwana: [80.0, 22.6],
};
const projected: Record<string, [number, number]> = {};
for (const [k, v] of Object.entries(places)) {
  const p = proj(v)!;
  projected[k] = [Number(p[0].toFixed(1)), Number(p[1].toFixed(1))];
}
writeFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src", "remotion", "data", "southasia.json"),
  JSON.stringify({ source: "Natural Earth 1:50m land and rivers (public domain), Mercator, pre-projected to 1920x1080", width: W, height: H, land: landPath, rivers: riverPaths, places: projected }),
);
console.log("land chars", landPath.length, "rivers", riverPaths.map((r) => r.name).join(", "), projected);
