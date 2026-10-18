import path from "node:path";
import { config, ROOT } from "../lib/env.js";
import { exists, log, readJson, run, sha, writeJson } from "../lib/util.js";
import type { Episode } from "../schema/episode.js";
import type { AudioManifest } from "./tts.js";

export interface Alignment {
  [sceneId: string]: { words: { w: string; start: number; end: number }[]; method: string; audioSeconds: number; hash: string };
}

/** Word-level forced alignment of each scene's narration against its measured audio (PocketSphinx). */
export async function alignStage(ep: Episode, epDir: string): Promise<Alignment> {
  const manifest = readJson<AudioManifest>(path.join(epDir, "audio", "manifest.json"));
  const pron = readJson<{ aligner: Record<string, string> }>(path.join(epDir, "pronunciations.json"));
  const outFile = path.join(epDir, "audio", "alignment.json");
  const existing: Alignment = exists(outFile) ? readJson(outFile) : {};
  const jobs = [];
  for (const s of ep.scenes) {
    const a = manifest.scenes[s.id];
    if (!a) throw new Error(`No narration audio for ${s.id}; run tts first`);
    const hash = sha(a.take, s.narration, pron.aligner);
    if (existing[s.id]?.hash === hash) continue;
    jobs.push({ id: s.id, audio: path.join(epDir, a.file), text: s.narration, hash });
  }
  if (jobs.length) {
    const spec = path.join(ROOT, ".cache", `align_${sha(jobs)}.json`);
    const out = spec.replace(/\.json$/, ".out.json");
    writeJson(spec, { lexicon: pron.aligner, jobs });
    await run(config.python, ["-I", path.join(ROOT, "py", "align.py"), spec, out], { quiet: false });
    const res = readJson<Alignment>(out);
    for (const j of jobs) existing[j.id] = { ...res[j.id], hash: j.hash };
  }
  const fallbacks = Object.entries(existing).filter(([, v]) => v.method !== "pocketsphinx-align").map(([k]) => k);
  log("align", `${Object.keys(existing).length} scenes aligned${fallbacks.length ? `; pause-split fallback used for ${fallbacks.join(", ")} (review captions)` : " by forced alignment"}`);
  writeJson(outFile, existing);
  return existing;
}
