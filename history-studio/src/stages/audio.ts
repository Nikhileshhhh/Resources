import path from "node:path";
import { mkdirSync } from "node:fs";
import { config, ROOT } from "../lib/env.js";
import { log, readJson, run, writeJson } from "../lib/util.js";
import type { Timeline } from "../schema/episode.js";

/** Sound-effect cues derived from the shot list (kept sparse on purpose). */
function sfxCues(tl: Timeline): { t: number; cue: string }[] {
  const out: { t: number; cue: string }[] = [];
  for (const sc of tl.scenes)
    for (const sh of sc.shots) {
      const t = sh.startFrame / tl.fps;
      const d = (sh.endFrame - sh.startFrame) / tl.fps;
      switch (sh.comp) {
        case "TitleCard": out.push({ t, cue: "boom" }); break;
        case "LettersReveal": case "ArchiveRoom": out.push({ t: t + 0.3, cue: "paper" }); break;
        case "MapScene": out.push({ t, cue: "whoosh" }); break;
        case "Bond": if (!(sh.props as any).beat) out.push({ t: t + 62 / 30, cue: "stamp" }); break;
        case "Coins": out.push({ t: t + 0.4, cue: "coins" }); break;
        case "RankLoss": out.push({ t: t + d * 0.3, cue: "crack" }); break;
        case "EvidenceBoard": out.push({ t: t + 0.5, cue: "tap" }); break;
        case "Petitions": {
          const items = ((sh.props as any).items ?? []) as string[];
          items.forEach((_, i) => out.push({ t: t + (i * d) / items.length + (d / items.length) * 0.58, cue: "stamp" }));
          break;
        }
      }
    }
  return out;
}

/**
 * Build the soundtrack: synthesize original music/ambience/sfx stems, mix with speech ducking,
 * then two-pass loudness normalisation to -15 LUFS integrated, -1.5 dBTP.
 */
export async function audioStage(epDir: string): Promise<string> {
  const tl = readJson<Timeline>(path.join(epDir, "timeline.json"));
  const placements = readJson<{ totalSeconds: number; placements: { id: string; start: number; file: string }[] }>(path.join(epDir, "audio", "placements.json"));
  const mixDir = path.join(epDir, "audio", "mix");
  mkdirSync(mixDir, { recursive: true });
  const duration = tl.durationFrames / tl.fps;
  const synthSpec = path.join(mixDir, "synth_spec.json");
  writeJson(synthSpec, {
    sr: 48000,
    duration,
    fps: tl.fps,
    scenes: tl.scenes.map((s) => ({ id: s.id, start: s.startFrame / tl.fps, end: s.endFrame / tl.fps, music: s.music ?? null, ambience: s.ambience ?? null })),
    sfx: sfxCues(tl),
  });
  log("audio", "synthesizing score, ambience and effects…");
  await run(config.python, ["-I", path.join(ROOT, "py", "audio_synth.py"), synthSpec, mixDir]);
  const mixSpec = path.join(mixDir, "mix_spec.json");
  const premix = path.join(mixDir, "premix.wav");
  writeJson(mixSpec, {
    duration,
    placements: placements.placements.map((p) => ({ file: path.join(epDir, p.file), start: p.start })),
    stems_dir: mixDir,
    out: premix,
    levels_db: { narration: 0, music: -15, music_ducked: -27, ambience: -24, ambience_ducked: -31, sfx: -12 },
  });
  await run(config.python, ["-I", path.join(ROOT, "py", "mix.py"), mixSpec]);
  // Two-pass EBU R128 normalisation.
  const target = { I: -15, TP: -1.5, LRA: 11 };
  const pass1 = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", premix, "-af", `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:print_format=json`, "-f", "null", "-"], { quiet: true });
  const m = pass1.stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  if (!m) throw new Error("loudnorm analysis failed");
  const a = JSON.parse(m[0]);
  const out = path.join(mixDir, "final_mix.wav");
  await run("ffmpeg", [
    "-v", "error", "-y", "-i", premix,
    "-af", `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:measured_I=${a.input_i}:measured_TP=${a.input_tp}:measured_LRA=${a.input_lra}:measured_thresh=${a.input_thresh}:offset=${a.target_offset}:linear=true,aresample=48000`,
    "-c:a", "pcm_s24le", "-ar", "48000", out,
  ]);
  writeJson(path.join(epDir, "reports", "loudness_pass1.json"), a);
  log("audio", `mix ready (input ${a.input_i} LUFS → target ${target.I} LUFS, ${target.TP} dBTP)`);
  return out;
}
