#!/usr/bin/env tsx
/**
 * history-studio CLI.
 *   npm run studio -- <command> --episode <dir> [options]
 * Commands: new | validate | status | el-check | voices | audition | pron-test | tts | pace | asr | align | timeline | audio | preview | render | mux | verify | thumbs | package | run | check-secrets
 */
import path from "node:path";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1; re-launch once with it when a proxy is configured.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" } });
  process.exit(r.status ?? 1);
}
import { config, ROOT } from "./lib/env.js";
import { exists, log, readJson } from "./lib/util.js";
import { Episode, ClaimLedger } from "./schema/episode.js";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name: string, d?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (name: string) => args.includes(`--${name}`);

function episodeDir(): string {
  const e = opt("episode");
  if (!e) throw new Error("--episode <dir> is required (e.g. episodes/episode_001_shivaji-escape-agra)");
  const dir = path.resolve(ROOT, e);
  if (!exists(path.join(dir, "episode.json"))) throw new Error(`No episode.json in ${dir}`);
  return dir;
}

export function loadEpisode(dir: string) {
  const ep = Episode.parse(readJson(path.join(dir, "episode.json")));
  const ledgerFile = path.join(dir, "research", "claims.json");
  const ledger = exists(ledgerFile) ? ClaimLedger.parse(readJson(ledgerFile)) : null;
  return { ep, ledger };
}

function validate(dir: string): void {
  const { ep, ledger } = loadEpisode(dir);
  const problems: string[] = [];
  const claimIds = new Set(ledger?.claims.map((c) => c.id) ?? []);
  const shotIds = new Set<string>();
  for (const s of ep.scenes) {
    if (!s.claims.length) problems.push(`${s.id}: no claims linked`);
    for (const c of s.claims) if (!claimIds.has(c)) problems.push(`${s.id}: claim ${c} missing from ledger`);
    if (s.shots[0].at !== null) problems.push(`${s.id}: first shot must start at scene start (at: null)`);
    for (const sh of s.shots) {
      if (shotIds.has(sh.id)) problems.push(`duplicate shot id ${sh.id}`);
      shotIds.add(sh.id);
      if (sh.at && sh.at !== "@end" && !s.narration.toLowerCase().includes(sh.at.toLowerCase())) problems.push(`${sh.id}: anchor "${sh.at}" not found in narration`);
    }
    // The performance text must say exactly the narration's words; only delivery tags may differ.
    if (s.performance && s.performance.replace(/\[[^\]]+\]\s*/g, "").replace(/\s+/g, " ").trim() !== s.narration) problems.push(`${s.id}: performance text (tags removed) differs from narration`);
  }
  for (const c of ledger?.claims ?? []) if (c.status !== "framing" && c.sources.length === 0) problems.push(`${c.id}: no sources`);
  const words = ep.scenes.reduce((a, s) => a + s.narration.split(/\s+/).length, 0);
  log("validate", `${ep.scenes.length} scenes, ${shotIds.size} shots, ${words} narration words, ${claimIds.size} claims`);
  if (problems.length) {
    problems.forEach((p) => log("validate", `PROBLEM ${p}`));
    process.exitCode = 1;
  } else log("validate", "OK");
}

async function main() {
  switch (cmd) {
    case "new": {
      const { newEpisode } = await import("./stages/scaffold.js");
      return newEpisode(opt("slug")!, opt("number"), opt("title"));
    }
    case "validate":
      return validate(episodeDir());
    case "el-check": {
      const { elevenCheck } = await import("./stages/voice.js");
      return elevenCheck(episodeDir());
    }
    case "voices": {
      const { voicesSearch } = await import("./stages/voice.js");
      return voicesSearch(episodeDir(), { accent: opt("accent"), search: opt("search"), limit: opt("limit") ? Number(opt("limit")) : undefined });
    }
    case "audition": {
      const { audition } = await import("./stages/voice.js");
      const dir = episodeDir();
      const ids = (opt("voices") ?? "").split(",").filter(Boolean);
      if (!ids.length) throw new Error("--voices id1,id2 is required (ids from `studio voices`)");
      return audition(loadEpisode(dir).ep, dir, ids, opt("scenes")?.split(","), opt("stability")?.split(",").map(Number));
    }
    case "pron-test": {
      const { pronTest } = await import("./stages/tts.js");
      return pronTest(episodeDir(), (opt("words") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    }
    case "tts": {
      const { ttsStage } = await import("./stages/tts.js");
      const dir = episodeDir();
      return ttsStage(loadEpisode(dir).ep, dir, opt("scenes")?.split(","), flag("force"));
    }
    case "pace": {
      const { paceStage } = await import("./stages/pace.js");
      const dir = episodeDir();
      return paceStage(loadEpisode(dir).ep, dir);
    }
    case "asr": {
      const { asrStage } = await import("./stages/asr.js");
      const dir = episodeDir();
      return asrStage(loadEpisode(dir).ep, dir);
    }
    case "align": {
      const { alignStage } = await import("./stages/align.js");
      const dir = episodeDir();
      return alignStage(loadEpisode(dir).ep, dir);
    }
    case "timeline": {
      const { timelineStage } = await import("./stages/timeline.js");
      const dir = episodeDir();
      return timelineStage(loadEpisode(dir).ep, dir);
    }
    case "audio": {
      const { audioStage } = await import("./stages/audio.js");
      return audioStage(episodeDir());
    }
    case "preview":
    case "render": {
      const { renderStage } = await import("./stages/render.js");
      const dir = episodeDir();
      return renderStage(dir, { preview: cmd === "preview", from: opt("from"), seconds: opt("seconds") ? Number(opt("seconds")) : undefined, frames: opt("frames") });
    }
    case "chunks": {
      const { renderChunks } = await import("./stages/render.js");
      return renderChunks(episodeDir(), opt("scenes")?.split(","), flag("force"));
    }
    case "concat": {
      const { concatChunks } = await import("./stages/render.js");
      return concatChunks(episodeDir());
    }
    case "mux": {
      const { muxStage } = await import("./stages/render.js");
      return muxStage(episodeDir(), flag("preview"));
    }
    case "stills": {
      const { stillsStage } = await import("./stages/render.js");
      return stillsStage(episodeDir(), opt("shots")?.split(","), opt("at")?.split(",").map(Number));
    }
    case "verify": {
      const { verifyStage } = await import("./stages/verify.js");
      return verifyStage(episodeDir(), flag("preview"));
    }
    case "thumbs": {
      const { thumbsStage } = await import("./stages/package.js");
      return thumbsStage(episodeDir());
    }
    case "package": {
      const { packageStage } = await import("./stages/package.js");
      return packageStage(episodeDir());
    }
    case "check-secrets": {
      const { checkSecrets } = await import("./stages/package.js");
      const bad = checkSecrets(path.resolve(ROOT, opt("path", ".")!));
      if (bad.length) {
        bad.forEach((b) => log("secrets", `FOUND key material in ${b}`));
        process.exitCode = 1;
      } else log("secrets", "clean");
      return;
    }
    case "run": {
      const dir = episodeDir();
      const { ep } = loadEpisode(dir);
      validate(dir);
      if (process.exitCode) return;
      const steps: [string, () => Promise<unknown>][] = [
        ["tts", async () => (await import("./stages/tts.js")).ttsStage(ep, dir)],
        ["align", async () => (await import("./stages/align.js")).alignStage(ep, dir)],
        ["pace", async () => (await import("./stages/pace.js")).paceStage(ep, dir)],
        ["align", async () => (await import("./stages/align.js")).alignStage(ep, dir)],
        ["timeline", async () => (await import("./stages/timeline.js")).timelineStage(ep, dir)],
        ["audio", async () => (await import("./stages/audio.js")).audioStage(dir)],
        ["render", async () => (await import("./stages/render.js")).renderStage(dir, { preview: false })],
        ["mux", async () => (await import("./stages/render.js")).muxStage(dir, false)],
        ["verify", async () => (await import("./stages/verify.js")).verifyStage(dir, false)],
        ["package", async () => (await import("./stages/package.js")).packageStage(dir)],
      ];
      for (const [name, fn] of steps) {
        log("run", `stage ${name}`);
        await fn();
      }
      return;
    }
    case "status": {
      const dir = episodeDir();
      for (const f of ["audio/manifest.json", "audio/alignment.json", "timeline.json", "audio/mix/final_mix.wav", "renders/video_only.mp4", "reports/validation.json", "upload/metadata.json"]) log("status", `${exists(path.join(dir, f)) ? "✓" : "·"} ${f}`);
      const u = path.join(dir, "reports", "usage.json");
      if (exists(u)) log("status", `spent ≈ ₹${readJson<{ spentInr: number }>(u).spentInr} of ₹${config.budgetInr} cap`);
      return;
    }
    default:
      console.log(`Usage: npm run studio -- <command> --episode <dir>\nCommands: new, validate, status, el-check, voices, audition, pron-test, tts, pace, align, timeline, audio, preview, render, mux, stills, verify, thumbs, package, run, check-secrets\nEpisodes: ${exists(config.outputDir) ? readdirSync(config.outputDir).join(", ") : "(none)"}`);
  }
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
