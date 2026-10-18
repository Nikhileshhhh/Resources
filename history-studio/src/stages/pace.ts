import path from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { config, ROOT } from "../lib/env.js";
import { exists, log, readJson, run, sha, writeJson } from "../lib/util.js";
import type { Episode } from "../schema/episode.js";
import type { AudioManifest } from "./tts.js";
import type { Alignment } from "./align.js";

export interface Pacing { tempo: number; sentencePause: number; commaPause: number; beatPause: number; maxRuntimeSec: number }

/**
 * Re-pace the voiced narration for storytelling (longer pauses inside existing word gaps, then a
 * pitch-preserving slowdown). Pause lengths are scaled down automatically if the projected programme
 * would exceed pacing.maxRuntimeSec. Raw takes are kept; manifest.file points at the paced take.
 */
export async function paceStage(ep: Episode, epDir: string): Promise<void> {
  const pacing = (ep.voice as { pacing?: Pacing }).pacing;
  if (!pacing) {
    log("pace", "no voice.pacing in episode.json; skipping");
    return;
  }
  const mFile = path.join(epDir, "audio", "manifest.json");
  const manifest = readJson<AudioManifest>(mFile);
  const rawAlignFile = path.join(epDir, "audio", "alignment_raw.json");
  const rawAlign: Alignment = exists(rawAlignFile) ? readJson(rawAlignFile) : {};
  const current: Alignment = exists(path.join(epDir, "audio", "alignment.json")) ? readJson(path.join(epDir, "audio", "alignment.json")) : {};
  const pron = readJson<{ aligner: Record<string, string> }>(path.join(epDir, "pronunciations.json"));

  // Make sure we hold word timings for each scene's *raw* take.
  for (const s of ep.scenes) {
    const a = manifest.scenes[s.id];
    const rawTake = a.rawTake ?? a.take;
    if (rawAlign[s.id]?.hash === sha(rawTake, s.narration, pron.aligner)) continue;
    if (!a.rawTake && current[s.id]?.hash === sha(a.take, s.narration, pron.aligner)) rawAlign[s.id] = current[s.id];
    else throw new Error(`${s.id}: no alignment of the raw take; run align before pace`);
  }
  writeJson(rawAlignFile, rawAlign);

  const outDir = path.join(epDir, "audio", "paced");
  mkdirSync(outDir, { recursive: true });
  const jobs = ep.scenes.map((s) => {
    const a = manifest.scenes[s.id];
    return { id: s.id, audio: path.join(epDir, a.rawFile ?? a.file), text: s.narration, words: rawAlign[s.id].words, out: path.join(outDir, `${s.id}.wav`) };
  });
  const fixed = ep.timing.leadInSec + ep.timing.sceneGapSec * (ep.scenes.length - 1) + ep.timing.tailAfterNarrationSec + ep.timing.endScreenSec;
  const spec = path.join(ROOT, ".cache", `pace_${sha(jobs.map((j) => j.audio), pacing)}.json`);
  const project = async (scale: number) => {
    writeJson(spec, { ...pacing, pauseScale: scale, jobs });
    const res = path.join(ROOT, ".cache", "pace_dry.json");
    await run(config.python, ["-I", path.join(ROOT, "py", "pace.py"), spec, "--dry", res], { quiet: true });
    return fixed + readJson<{ projected: number }[]>(res).reduce((t, r) => t + r.projected, 0);
  };
  let scale = 1;
  let total = await project(scale);
  if (total > pacing.maxRuntimeSec) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      if ((await project(mid)) > pacing.maxRuntimeSec) hi = mid;
      else lo = mid;
    }
    scale = lo;
    total = await project(scale);
    if (total > pacing.maxRuntimeSec) throw new Error(`Even without added pauses the programme is ${total.toFixed(1)} s; trim the script or raise maxRuntimeSec`);
  }
  log("pace", `tempo ${pacing.tempo}, pause scale ${scale.toFixed(2)} → projected programme ${total.toFixed(1)} s`);

  const key = sha(pacing, scale);
  const todo = jobs.filter((j) => manifest.scenes[j.id].pacedKey !== key || !exists(j.out));
  if (todo.length) {
    writeJson(spec, { ...pacing, pauseScale: scale, jobs: todo });
    const res = path.join(ROOT, ".cache", "pace_run.json");
    await run(config.python, ["-I", path.join(ROOT, "py", "pace.py"), spec, "--run", res], { quiet: true });
    for (const r of readJson<{ scene: string; before: number; pausesAdded: number; after: number }[]>(res)) {
      const a = manifest.scenes[r.scene];
      if (!a.rawFile) Object.assign(a, { rawFile: a.file, rawTake: a.take, rawSeconds: a.seconds });
      const out = path.join(outDir, `${r.scene}.wav`);
      Object.assign(a, { file: path.relative(epDir, out), seconds: r.after, take: createHash("sha256").update(readFileSync(out)).digest("hex").slice(0, 16), pacedKey: key });
      log("pace", `${r.scene}: ${r.before.toFixed(2)}s → ${r.after.toFixed(2)}s (+${r.pausesAdded.toFixed(2)}s pauses)`);
    }
    writeJson(mFile, manifest);
  } else log("pace", "all scenes already paced with these settings");
}
