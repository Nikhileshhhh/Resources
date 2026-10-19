import path from "node:path";
import { mkdirSync, readdirSync, statSync, readFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { config, ROOT } from "../lib/env.js";
import { exists, log, probeDuration, readJson, run, sha, writeJson } from "../lib/util.js";
import type { Timeline } from "../schema/episode.js";

/** Bundle the Remotion project; cached by a hash of the source files so unchanged code is not rebuilt. */
async function getBundle(): Promise<string> {
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
  const secs = (Date.now() - t0) / 1000;
  log("render", `wrote ${path.relative(ROOT, out)} in ${(secs / 60).toFixed(1)} min`);
  writeJson(path.join(epDir, "reports", opts.preview ? "render_preview.json" : "render.json"), { output: path.relative(epDir, out), frameRange: frameRange ?? [0, comp.durationInFrames - 1], seconds: secs, concurrency: config.renderConcurrency, at: new Date().toISOString() });
  return out;
}

/** Render one representative still per shot (middle frame) and a contact sheet per scene for review. */
export async function stillsStage(epDir: string, only?: string[], at: number[] = [0.5]): Promise<void> {
  const timeline = readJson<Timeline>(path.join(epDir, "timeline.json"));
  const serveUrl = await getBundle();
  const inputProps = { timeline };
  const comp = await selectComposition({ serveUrl, id: "Episode", inputProps, browserExecutable: config.browserExecutable });
  const dir = path.join(epDir, "renders", "stills");
  mkdirSync(dir, { recursive: true });
  const b = await browser();
  try {
    for (const sc of timeline.scenes)
      for (const sh of sc.shots) {
        if (only && !only.includes(sh.id) && !only.includes(sc.id)) continue;
        for (const a of at) {
          const frame = Math.round(sh.startFrame + (sh.endFrame - sh.startFrame - 1) * a);
          const name = at.length === 1 ? sh.id : `${sh.id}_${Math.round(a * 100)}`;
          await renderStill({ serveUrl, composition: comp, inputProps, frame, output: path.join(dir, `${name}.jpg`), imageFormat: "jpeg", jpegQuality: 85, puppeteerInstance: b, scale: 0.5 });
        }
      }
  } finally {
    await b.close({ silent: true });
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
