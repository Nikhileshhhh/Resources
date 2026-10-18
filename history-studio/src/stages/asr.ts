import path from "node:path";
import { ROOT, config } from "../lib/env.js";
import { Budget } from "../lib/budget.js";
import { exists, log, readJson, writeJson } from "../lib/util.js";
import type { Episode } from "../schema/episode.js";
import type { AudioManifest } from "./tts.js";
import { transcribe } from "./tts.js";

const toks = (s: string) =>
  s
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

/** Word-level Levenshtein alignment; returns WER and the list of differing spans. */
export function diffWords(ref: string[], hyp: string[]): { wer: number; diffs: string[] } {
  const n = ref.length;
  const m = hyp.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
  const diffs: string[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) { i--; j--; continue; }
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { diffs.unshift(`"${ref[i - 1]}"→"${hyp[j - 1]}"`); i--; j--; }
    else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { diffs.unshift(`missing "${ref[i - 1]}"`); i--; }
    else { diffs.unshift(`extra "${hyp[j - 1]}"`); j--; }
  }
  return { wer: n ? d[n][m] / n : 0, diffs };
}

/** Transcribe each narration scene and compare with the script (catches truncation, skipped or invented words). */
export async function asrStage(ep: Episode, epDir: string): Promise<void> {
  if (!config.stt.enabled) {
    log("asr", "STT disabled (STT_ENABLED=false); skipping transcription check");
    return;
  }
  const manifest = readJson<AudioManifest>(path.join(epDir, "audio", "manifest.json"));
  const outFile = path.join(epDir, "reports", "asr_check.json");
  const prev: Record<string, any> = exists(outFile) ? readJson(outFile) : {};
  const budget = new Budget(epDir, ROOT);
  for (const s of ep.scenes) {
    const a = manifest.scenes[s.id];
    if (prev[s.id]?.take === a.take) continue;
    const text: string = await transcribe(path.join(epDir, a.file), budget, `asr ${s.id}`);
    const { wer, diffs } = diffWords(toks(s.narration), toks(text));
    prev[s.id] = { take: a.take, wer: Number(wer.toFixed(3)), diffs, heard: text };
    log("asr", `${s.id} WER ${(wer * 100).toFixed(1)}% ${diffs.slice(0, 6).join(", ")}`);
    writeJson(outFile, prev);
  }
}
