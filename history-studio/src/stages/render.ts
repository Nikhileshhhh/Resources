import path from "node:path";
import { mkdirSync, readdirSync, statSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { config, ROOT } from "../lib/env.js";
import { exists, log, probeDuration, readJson, run, sha, writeJson } from "../lib/util.js";
import type { Timeline } from "../schema/episode.js";

/** Bundle the Remotion project; cached by a hash of the source files so unchanged code is not rebuilt. */
export async function getBundle(): Promise<string> {
  const srcDir = path.join(ROOT, "src", "remotion");
  const files: string[] = [];
  const walk = (d: string) => readdirSync(d).forEach((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : files.push(path.join(d, f))));
  walk(srcDir);
  const key = sha(files.sort().map((f) => f + statSync(f).mtimeMs + statSync(f).size).join("|"));
  const out = path.join(ROOT, ".cache", `bundle_${key}`);
  if (exists(path.join(out, "index.html"))) return out;
  log("render", "bundling Remotion project…");
  return bundle({ entryPoint: path.join(srcDir, "index.ts"), outDir: out, onProgress: () => undefined });
}

const browser = () => openBrowser("chrome", { browserExecutable: config.browserExecutable, chromiumOptions: { gl: "swangle" } });

export async function renderStage(epDir: string, opts: { preview: boolean; from?: string; seconds?: number; frames?: string }): Promise<string> {
  const timeline = readJson<Timeline>(path.join(epDir, "timeline.json"));
  const serveUrl = await getBundle();
  const inputProps = { timeline };
  const comp = await selectComposition({ serveUrl, id: "Episode", inputProps, browserExecutable: config.browserExecutable });
  const outDir = path.join(epDir, "renders");
  mkdirSync(outDir, { recursive: true });
  let frameRange: [number, number] | undefined;
  if (opts.frames) {
    const [a, b] = opts.frames.split("-").map(Number);
    frameRange = [a, b];
  } else if (opts.preview) {
    const start = opts.from ? timeline.scenes.find((s) => s.id === opts.from)?.startFrame ?? 0 : 0;
    frameRange = [start, Math.min(comp.durationInFrames - 1, start + Math.round((opts.seconds ?? 25) * timeline.fps) - 1)];
  }
  const out = path.join(outDir, opts.preview || opts.frames ? "preview_video_only.mp4" : "video_only.mp4");
  const t0 = Date.now();
  await renderRange(serveUrl, comp, inputProps, frameRange, out);
  const secs = (Date.now() - t0) / 1000;
  log("render", `wrote ${path.relative(ROOT, out)} in ${(secs / 60).toFixed(1)} min`);
  writeJson(path.join(epDir, "reports", opts.preview ? "render_preview.json" : "render.json"), { output: path.relative(epDir, out), frameRange: frameRange ?? [0, comp.durationInFrames - 1], seconds: secs, concurrency: config.renderConcurrency, at: new Date().toISOString() });
  return out;
}

/**
 * Resumable render: one MP4 per scene (its frame range in the full composition, so cross-scene transitions are
 * included), skipped when an identical chunk already exists. Then joined losslessly with the concat demuxer.
 * A restart of the machine loses at most the scene in progress.
 */
export async function renderChunks(epDir: string, only?: string[], force = false): Promise<void> {
  const timeline = readJson<Timeline>(path.join(epDir, "timeline.json"));
  const serveUrl = await getBundle();
  const inputProps = { timeline };
  const comp = await selectComposition({ serveUrl, id: "Episode", inputProps, browserExecutable: config.browserExecutable });
  const dir = path.join(epDir, "renders", "chunks3d");
  mkdirSync(dir, { recursive: true });
  const scenes = timeline.scenes;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    if (only && !only.includes(sc.id)) continue;
    const range: [number, number] = [sc.startFrame, i + 1 < scenes.length ? scenes[i + 1].startFrame - 1 : comp.durationInFrames - 1];
    // Keyed by the scene's own shots and range (not the whole code bundle), so building later scenes does not
    // invalidate finished chunks. Delete a chunk (or pass --force) after changing code that affects it.
    const key = sha(sc.shots, scenes[i + 1]?.shots[0] ?? null, range);
    const out = path.join(dir, `${sc.id}.mp4`);
    const meta = path.join(dir, `${sc.id}.json`);
    if (!force && exists(out) && exists(meta) && readJson<{ key: string }>(meta).key === key) {
      log("chunks", `${sc.id} up to date`);
      continue;
    }
    const t0 = Date.now();
    log("chunks", `${sc.id}: frames ${range[0]}–${range[1]} (${range[1] - range[0] + 1})`);
    await renderRange(serveUrl, comp, inputProps, range, out + ".part.mp4");
    renameSync(out + ".part.mp4", out);
    writeJson(meta, { key, range, seconds: (Date.now() - t0) / 1000, at: new Date().toISOString() });
    log("chunks", `${sc.id} done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
}

/** Join all scene chunks into renders/video_only.mp4 (stream copy) and record the full frame range for mux. */
export async function concatChunks(epDir: string): Promise<void> {
  const timeline = readJson<Timeline>(path.join(epDir, "timeline.json"));
  const dir = path.join(epDir, "renders", "chunks3d");
  const missing = timeline.scenes.filter((s) => !exists(path.join(dir, `${s.id}.mp4`))).map((s) => s.id);
  if (missing.length) throw new Error(`Missing chunks: ${missing.join(", ")}; run render --chunks first`);
  const list = path.join(dir, "list.txt");
  writeFileSync(list, timeline.scenes.map((s) => `file '${path.join(dir, s.id + ".mp4")}'`).join("\n") + "\n");
  const out = path.join(epDir, "renders", "video_only.mp4");
  await run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out], { quiet: true });
  const frames = Math.round((await probeDuration(out)) * timeline.fps);
  log("concat", `video_only.mp4: ${frames} frames (timeline ${timeline.durationFrames})`);
  if (Math.abs(frames - timeline.durationFrames) > 1) throw new Error(`Joined video has ${frames} frames, expected ${timeline.durationFrames}`);
  writeJson(path.join(epDir, "reports", "render.json"), { output: path.relative(epDir, out), frameRange: [0, timeline.durationFrames - 1], chunks: timeline.scenes.length, at: new Date().toISOString() });
}

async function renderRange(serveUrl: string, comp: Awaited<ReturnType<typeof selectComposition>>, inputProps: Record<string, unknown>, frameRange: [number, number] | undefined, out: string): Promise<void> {
  const t0 = Date.now();
  let lastLog = 0;
  await renderMedia({
    serveUrl,
    composition: comp,
    inputProps,
    codec: "h264",
    crf: 16,
    x264Preset: "slow",
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    muted: true,
    imageFormat: "jpeg",
    jpegQuality: 95,
    concurrency: config.renderConcurrency,
    frameRange,
    outputLocation: out,
    browserExecutable: config.browserExecutable,
    chromiumOptions: { gl: "swangle" },
    // Closed GOP of 15 frames (half the frame rate) and 2 B-frames, per YouTube's upload recommendations.
    ffmpegOverride: ({ args }) => {
      const i = args.indexOf("-c:v");
      if (i < 0) return args;
      return [...args.slice(0, i), "-g", "15", "-bf", "2", "-flags", "+cgop", ...args.slice(i)];
    },
    onProgress: ({ renderedFrames, encodedFrames }) => {
      const now = Date.now();
      if (now - lastLog > 30000) {
        lastLog = now;
        const fps = renderedFrames / ((now - t0) / 1000);
        const total = frameRange ? frameRange[1] - frameRange[0] + 1 : comp.durationInFrames;
        log("render", `${renderedFrames}/${total} frames (${fps.toFixed(1)} fps, encoded ${encodedFrames}, ETA ${((total - renderedFrames) / Math.max(fps, 0.01) / 60).toFixed(1)} min)`);
      }
    },
  });
}

/** Render one representative still per shot (middle frame) and a contact sheet per scene for review. */
export async function stillsStage(epDir: string, only?: string[], at: number[] = [0.5]): Promise<void> {
  const timeline = readJson<Timeline>(path.join(epDir, "timeline.json"));
  const serveUrl = await getBundle();
  const dir = path.join(epDir, "renders", "stills");
  mkdirSync(dir, { recursive: true });
  // Rendered through the Remotion CLI (same browser launch as the video render; the in-process still renderer
  // drops some WebGL scenes).
  const props = path.join(ROOT, ".cache", "stills_props.json");
  writeJson(props, { timeline });
  for (const sc of timeline.scenes)
    for (const sh of sc.shots) {
      if (only && !only.includes(sh.id) && !only.includes(sc.id)) continue;
      for (const a of at) {
        const frame = Math.round(sh.startFrame + (sh.endFrame - sh.startFrame - 1) * a);
        const name = `${sh.id}_${Math.round(a * 100)}`;
        log("stills", `${name} (frame ${frame})`);
        await run("npx", ["remotion", "still", serveUrl, "Episode", path.join(dir, `${name}.jpg`), `--frame=${frame}`, `--props=${props}`, "--gl=swangle", "--image-format=jpeg", "--jpeg-quality=85", "--scale=0.5", "--log=error", ...(config.browserExecutable ? [`--browser-executable=${config.browserExecutable}`] : [])], { quiet: true, cwd: ROOT });
      }
    }
  log("stills", `stills in ${path.relative(ROOT, dir)}`);
}

/** Mux the silent render with the final mix: AAC-LC 48 kHz stereo, faststart. */
export async function muxStage(epDir: string, preview: boolean): Promise<string> {
  const ep = readJson<{ fileStem: string }>(path.join(epDir, "episode.json"));
  const video = path.join(epDir, "renders", preview ? "preview_video_only.mp4" : "video_only.mp4");
  const audio = path.join(epDir, "audio", "mix", "final_mix.wav");
  const out = preview ? path.join(epDir, "renders", `${ep.fileStem}_preview.mp4`) : path.join(epDir, `${ep.fileStem}.mp4`);
  const report = readJson<{ frameRange: [number, number] }>(path.join(epDir, "reports", preview ? "render_preview.json" : "render.json"));
  const startSec = report.frameRange[0] / 30;
  const vdur = await probeDuration(video);
  await run("ffmpeg", [
    "-v", "error", "-y",
    "-i", video,
    "-ss", startSec.toFixed(3), "-t", vdur.toFixed(3), "-i", audio,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "384k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart",
    "-metadata", `title=${ep.fileStem}`,
    out,
  ]);
  log("mux", `wrote ${path.relative(ROOT, out)} (${(statSync(out).size / 1e6).toFixed(1)} MB)`);
  void readFileSync;
  return out;
}
