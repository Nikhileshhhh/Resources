import path from "node:path";
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { config, ROOT } from "../lib/env.js";
import { Budget } from "../lib/budget.js";
import { exists, log, probeDuration, readJson, run, sha, writeJson } from "../lib/util.js";
import { postJson } from "../providers/openaiCompat.js";
import type { Episode, Scene } from "../schema/episode.js";

const MAX_CHARS = 3800; // provider limit is 4096 characters per request

export interface AudioManifest {
  engine: string;
  model: string;
  voice: string;
  scenes: Record<string, { file: string; seconds: number; hash: string; take: string; ttsText: string; chunks: number }>;
}

/** Apply TTS respellings to whole words only. Captions keep the display spelling. */
export function ttsText(text: string, respell: Record<string, string>): string {
  let out = text;
  for (const [display, spoken] of Object.entries(respell).sort((a, b) => b[0].length - a[0].length)) {
    out = out.replace(new RegExp(`(?<![\\p{L}])${display.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "gu"), spoken);
  }
  return out;
}

function splitChunks(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["”]?\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > MAX_CHARS && cur) {
      chunks.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function synthOpenAI(text: string, out: string, budget: Budget, stage: string): Promise<void> {
  const { baseUrl, apiKey, model, voice } = config.speech;
  const units = text.length / 1000;
  budget.assertAffordable(model, units);
  mkdirSync(path.dirname(out), { recursive: true });
  const { data } = await postJson(baseUrl, apiKey, "/audio/speech", { model, voice, input: text, response_format: "flac", no_cache: true }, { expect: "bytes", label: `tts ${path.basename(out)}` });
  // Record spend as soon as the provider has answered, before any local step can fail.
  const est = budget.estimate(model, units);
  budget.record({ stage, provider: new URL(baseUrl).host, model, units: Number(units.toFixed(3)), unit: est.unit, estInr: Number(est.inr.toFixed(3)), priceBasis: est.basis });
  const raw = out.replace(/\.wav$/, ".raw.flac");
  writeFileSync(raw, data as Buffer);
  // Normalise to 48 kHz mono PCM for alignment and mixing; trim nothing (timing must stay faithful).
  await run("ffmpeg", ["-v", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", out], { quiet: true });
  unlinkSync(raw);
}

async function synthKokoro(jobs: { text: string; out: string }[], budget: Budget, stage: string): Promise<void> {
  if (!jobs.length) return;
  const spec = path.join(ROOT, ".cache", `kokoro_${sha(jobs)}.json`);
  writeJson(spec, { model_dir: path.join(ROOT, "models", "kokoro"), jobs: jobs.map((j) => ({ text: j.text, voice: config.speech.kokoroVoice, speed: 1.0, out: j.out.replace(/\.wav$/, ".24k.wav") })) });
  await run(config.python, ["-I", path.join(ROOT, "py", "tts_kokoro.py"), spec]);
  for (const j of jobs) {
    await run("ffmpeg", ["-v", "error", "-y", "-i", j.out.replace(/\.wav$/, ".24k.wav"), "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", j.out], { quiet: true });
    unlinkSync(j.out.replace(/\.wav$/, ".24k.wav"));
    budget.record({ stage, provider: "local", model: "kokoro-82m-local", units: j.text.length / 1000, unit: "1k_chars", estInr: 0, priceBasis: "local" });
  }
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);

/** True when the last content words of the script appear near the end of the transcript (numbers ignored). */
export function endingPresent(script: string, heard: string): boolean {
  const want = words(script).slice(-3);
  const tail = new Set(words(heard).slice(-10));
  return want.filter((w) => tail.has(w)).length >= Math.min(2, want.length);
}

/** Synthesize narration per scene. Cached by hash(text, engine, model, voice) so edits re-voice only changed scenes. */
export async function ttsStage(ep: Episode, epDir: string, only?: string[], force = false): Promise<AudioManifest> {
  const budget = new Budget(epDir, ROOT);
  const pron = exists(path.join(epDir, "pronunciations.json")) ? readJson<{ tts: Record<string, string> }>(path.join(epDir, "pronunciations.json")) : { tts: {} };
  const engine = config.speech.engine;
  const model = engine === "kokoro" ? "kokoro-82m-local" : config.speech.model;
  const voice = engine === "kokoro" ? config.speech.kokoroVoice : config.speech.voice;
  const manifestFile = path.join(epDir, "audio", "manifest.json");
  const manifest: AudioManifest = exists(manifestFile) ? readJson(manifestFile) : { engine, model, voice, scenes: {} };
  manifest.engine = engine;
  manifest.model = model;
  manifest.voice = voice;
  const chunkDir = path.join(epDir, "audio", "chunks");
  const kokoroJobs: { text: string; out: string }[] = [];
  const pending: { scene: Scene; parts: string[]; hash: string; text: string }[] = [];

  for (const scene of ep.scenes) {
    if (only && !only.includes(scene.id)) continue;
    const text = ttsText(scene.narration, pron.tts);
    const hash = sha(text, engine, model, voice);
    const file = path.join(chunkDir, `${scene.id}_${hash}.wav`);
    if (manifest.scenes[scene.id]?.hash === hash && exists(file) && !force) {
      log("tts", `${scene.id} cached (${manifest.scenes[scene.id].seconds.toFixed(2)}s)`);
      continue;
    }
    const parts = splitChunks(text).map((t, i) => ({ t, out: path.join(chunkDir, `${scene.id}_${hash}_p${i}.wav`) }));
    for (const p of parts) {
      if (exists(p.out) && !force) continue;
      if (engine === "kokoro") kokoroJobs.push({ text: p.t, out: p.out });
      else {
        // gpt-4o-mini-tts occasionally drops or garbles the final words of a request.
        // When transcription is enabled, check the ending and re-synthesize (bounded) if it is missing.
        for (let attempt = 1; attempt <= 3; attempt++) {
          log("tts", `${scene.id}: synthesizing ${p.t.length} chars with ${model}/${voice}${attempt > 1 ? ` (retry ${attempt - 1})` : ""}`);
          await synthOpenAI(p.t, p.out, budget, `tts ${scene.id}`);
          if (!config.stt.enabled) break;
          const heard = String(await transcribe(p.out, budget, `tts-check ${scene.id}`));
          if (endingPresent(p.t, heard)) break;
          log("tts", `${scene.id}: ending not heard ("…${heard.slice(-60)}")`);
          if (attempt === 3) log("tts", `${scene.id}: WARNING ending still not confirmed after 3 attempts; review manually`);
        }
      }
    }
    pending.push({ scene, parts: parts.map((p) => p.out), hash, text });
  }
  await synthKokoro(kokoroJobs, budget, "tts");

  for (const p of pending) {
    const file = path.join(chunkDir, `${p.scene.id}_${p.hash}.wav`);
    if (p.parts.length === 1) await run("ffmpeg", ["-v", "error", "-y", "-i", p.parts[0], "-c", "copy", file], { quiet: true });
    else {
      // Join chunks with a short natural pause; chunk boundaries always fall at sentence ends.
      const filter = p.parts.map((_, i) => `[${i}:a]apad=pad_dur=0.35[a${i}]`).join(";") + ";" + p.parts.map((_, i) => `[a${i}]`).join("") + `concat=n=${p.parts.length}:v=0:a=1[out]`;
      await run("ffmpeg", ["-v", "error", "-y", ...p.parts.flatMap((f) => ["-i", f]), "-filter_complex", filter, "-map", "[out]", "-ar", "48000", "-ac", "1", file], { quiet: true });
    }
    const seconds = await probeDuration(file);
    // "take" identifies the actual recording, so downstream caches notice a forced re-synthesis of unchanged text.
    const take = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
    manifest.scenes[p.scene.id] = { file: path.relative(epDir, file), seconds, hash: p.hash, take, ttsText: p.text, chunks: p.parts.length };
    log("tts", `${p.scene.id}: ${seconds.toFixed(2)}s`);
    writeJson(manifestFile, manifest);
  }
  writeJson(manifestFile, manifest);
  return manifest;
}

/** Pronunciation check: synthesize each candidate spelling in a carrier phrase and transcribe it. */
export async function pronTest(epDir: string, words: string[]): Promise<void> {
  const budget = new Budget(epDir, ROOT);
  const pron = exists(path.join(epDir, "pronunciations.json")) ? readJson<{ tts: Record<string, string> }>(path.join(epDir, "pronunciations.json")) : { tts: {} };
  const dir = path.join(epDir, "audio", "pron_test");
  const results: unknown[] = [];
  for (const w of words) {
    for (const variant of [w, pron.tts[w]].filter(Boolean) as string[]) {
      const text = `The next name is ${variant}. Once more: ${variant}.`;
      const out = path.join(dir, `${sha(variant, config.speech.model, config.speech.voice)}.wav`);
      if (!exists(out)) await synthOpenAI(text, out, budget, "pron-test");
      const heard = await transcribe(out, budget, "pron-test");
      results.push({ word: w, variant, heard });
      log("pron", `${w} as "${variant}" -> heard: ${heard}`);
    }
  }
  writeJson(path.join(dir, "results.json"), results);
}

export async function transcribe(file: string, budget: Budget, stage: string, extra: Record<string, unknown> = {}): Promise<any> {
  const { baseUrl, apiKey, model } = config.stt;
  const seconds = await probeDuration(file);
  budget.assertAffordable(model, seconds / 60);
  const mp3 = file.replace(/\.\w+$/, ".stt.mp3");
  await run("ffmpeg", ["-v", "error", "-y", "-i", file, "-ac", "1", "-b:a", "64k", mp3], { quiet: true });
  const b64 = (await import("node:fs")).readFileSync(mp3).toString("base64");
  unlinkSync(mp3);
  const { data } = await postJson(baseUrl, apiKey, "/audio/transcriptions", { model, language: "en", input_audio: { data: b64, format: "mp3" }, ...extra }, { expect: "json", label: "stt" });
  const est = budget.estimate(model, seconds / 60);
  budget.record({ stage, provider: new URL(baseUrl).host, model, units: Number((seconds / 60).toFixed(3)), unit: est.unit, estInr: Number(est.inr.toFixed(3)), priceBasis: est.basis });
  return Object.keys(extra).length ? data : data.text;
}
