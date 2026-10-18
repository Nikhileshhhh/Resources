import path from "node:path";
import { mkdirSync, statSync } from "node:fs";
import { config, ROOT } from "../lib/env.js";
import { Budget } from "../lib/budget.js";
import { exists, fmtTime, log, readJson, run, writeJson, writeText } from "../lib/util.js";
import type { Timeline } from "../schema/episode.js";
import { diffWords } from "./asr.js";
import { transcribe } from "./tts.js";

interface Check { name: string; ok: boolean; value: string; expect: string; note?: string }

/**
 * Measure the delivered file (not the project settings): container, codecs, geometry, frame rate,
 * duration, full decode, black/frozen frames, silence, clipping, loudness and (optionally) an ASR
 * comparison of the final mix against the script. Writes reports/validation.{json,md}.
 */
export async function verifyStage(epDir: string, preview: boolean): Promise<boolean> {
  const ep = readJson<{ fileStem: string; scenes: { id: string; narration: string }[] }>(path.join(epDir, "episode.json"));
  const tl = readJson<Timeline>(path.join(epDir, "timeline.json"));
  const file = preview ? path.join(epDir, "renders", `${ep.fileStem}_preview.mp4`) : path.join(epDir, `${ep.fileStem}.mp4`);
  if (!exists(file)) throw new Error(`Missing ${file}; run render + mux first`);
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, value: string, expect: string, note?: string) => checks.push({ name, ok, value, expect, note });

  const probe = JSON.parse((await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { quiet: true })).stdout);
  const v = probe.streams.find((s: any) => s.codec_type === "video");
  const a = probe.streams.find((s: any) => s.codec_type === "audio");
  const dur = Number(probe.format.duration);
  const size = statSync(file).size;
  add("Container", /mp4/.test(probe.format.format_name), probe.format.format_name, "mp4");
  add("Video codec", v?.codec_name === "h264", `${v?.codec_name} ${v?.profile}`, "h264");
  add("Resolution", v?.width === 1920 && v?.height === 1080, `${v?.width}x${v?.height}`, "1920x1080");
  add("Pixel format", v?.pix_fmt === "yuv420p", v?.pix_fmt, "yuv420p");
  add("Frame rate", v?.r_frame_rate === "30/1" && v?.avg_frame_rate === "30/1", `${v?.r_frame_rate} (avg ${v?.avg_frame_rate})`, "30/1 constant");
  add("Scan", (v?.field_order ?? "progressive") === "progressive", v?.field_order ?? "progressive", "progressive");
  add("Colour", (v?.color_primaries ?? "bt709") === "bt709" || v?.color_space === "bt709", `${v?.color_space}/${v?.color_primaries}/${v?.color_transfer}`, "bt709 (SDR)");
  add("Audio codec", a?.codec_name === "aac" && /LC/i.test(a?.profile ?? ""), `${a?.codec_name} ${a?.profile}`, "AAC-LC");
  add("Audio sample rate", a?.sample_rate === "48000", a?.sample_rate, "48000 Hz");
  add("Audio channels", a?.channels === 2, String(a?.channels), "2 (stereo)");
  add("Video bitrate", true, `${(Number(v?.bit_rate ?? probe.format.bit_rate) / 1e6).toFixed(2)} Mb/s`, "info (CRF 18)");
  if (!preview) add("Duration", dur >= 480 && dur <= 600, `${dur.toFixed(2)} s (${fmtTime(dur)})`, "480–600 s");
  else add("Preview duration", dur >= 20 && dur <= 31, `${dur.toFixed(2)} s`, "20–30 s");
  add("Duration matches timeline", preview || Math.abs(dur - tl.durationFrames / tl.fps) < 0.2, `${dur.toFixed(2)} vs ${(tl.durationFrames / tl.fps).toFixed(2)}`, "±0.2 s");
  add("File size", size > 5e6 || (preview && size > 5e5), `${(size / 1e6).toFixed(1)} MB`, "meaningful size");
  const head = Buffer.alloc(64);
  const fd = (await import("node:fs")).openSync(file, "r");
  (await import("node:fs")).readSync(fd, head, 0, 64, 0);
  (await import("node:fs")).closeSync(fd);
  const moovFirst = (await run("ffprobe", ["-v", "trace", "-i", file], { quiet: true }).catch((e) => ({ stdout: "", stderr: String(e) }))).stderr;
  const moovPos = moovFirst.indexOf("type:'moov'");
  const mdatPos = moovFirst.indexOf("type:'mdat'");
  add("Fast start (moov before mdat)", moovPos >= 0 && (mdatPos < 0 || moovPos < mdatPos), moovPos >= 0 && moovPos < mdatPos ? "yes" : "no", "yes");

  // Full decode + content detectors
  const dec = await run("ffmpeg", ["-hide_banner", "-nostats", "-v", "error", "-i", file, "-f", "null", "-"], { quiet: true });
  add("Full decode errors", dec.stderr.trim().length === 0, dec.stderr.trim() ? dec.stderr.trim().slice(0, 200) : "none", "none");
  const det = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vf", "blackdetect=d=0.5:pic_th=0.97,freezedetect=n=0.0008:d=4", "-af", "silencedetect=n=-50dB:d=2.5,astats=metadata=0:reset=0", "-f", "null", "-"], { quiet: true });
  const blacks = [...det.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const freezes = [...det.stderr.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const silences = [...det.stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  add("Black segments ≥0.5 s", blacks.length === 0, blacks.length ? blacks.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)}`).join(", ") : "none", "none");
  // Intentional holds: the end screen is allowed to be still.
  const endStart = tl.endScreenStartFrame / tl.fps;
  const badFreeze = freezes.filter(([s]) => s < endStart - 1);
  add("Frozen video ≥4 s (outside end screen)", badFreeze.length === 0, badFreeze.length ? badFreeze.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)}`).join(", ") : "none", "none");
  add("Audio silence ≥2.5 s below −50 dB", silences.length === 0, silences.length ? silences.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)}`).join(", ") : "none", "none");
  const peakDb = Number(det.stderr.match(/Overall[\s\S]*?Peak level dB: ([-\d.]+)/)?.[1] ?? det.stderr.match(/Peak level dB: ([-\d.]+)/)?.[1] ?? "-99");
  add("Sample peak (no clipping)", peakDb < -0.5, `${peakDb} dBFS`, "< −0.5 dBFS");
  const eb = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { quiet: true });
  const I = Number(eb.stderr.match(/I:\s+([-\d.]+) LUFS\s+Threshold[\s\S]*?Loudness range/)?.[1] ?? NaN);
  const TP = Number(eb.stderr.match(/True peak:\s+Peak:\s+([-\d.]+)/)?.[1] ?? NaN);
  add("Integrated loudness", I >= -16.5 && I <= -13.5, `${I} LUFS`, "−16 to −14 LUFS (production target)");
  add("True peak", TP <= -1.0, `${TP} dBTP`, "≤ −1 dBTP");

  // Narration intelligibility on the final mix (catches truncation and music masking).
  let asr: { wer: number; diffs: string[] } | null = null;
  if (config.stt.enabled && !preview) {
    const budget = new Budget(epDir, ROOT);
    const wav = path.join(epDir, "renders", "verify_mix.wav");
    const parts: string[] = [];
    // transcribe in ~2-minute slices to stay within request limits
    for (let s = 0; s < dur; s += 120) {
      await run("ffmpeg", ["-v", "error", "-y", "-ss", String(s), "-t", "120", "-i", file, "-vn", "-ac", "1", "-ar", "16000", wav], { quiet: true });
      parts.push(String(await transcribe(wav, budget, "verify-asr")));
    }
    const norm = (t: string) => t.toLowerCase().replace(/(\d),(\d)/g, "$1$2").replace(/[^a-z0-9'\s-]/g, " ").split(/[\s-]+/).filter(Boolean);
    asr = diffWords(norm(ep.scenes.map((x) => x.narration).join(" ")), norm(parts.join(" ")));
    add("Final-mix transcription vs script", asr.wer < 0.1, `WER ${(asr.wer * 100).toFixed(1)}%`, "< 10% (numbers/spelling variants count as differences)");
  }

  // Representative frames: one contact sheet per scene for human/AI review
  const sheetDir = path.join(epDir, "reports", "frames");
  mkdirSync(sheetDir, { recursive: true });
  if (!preview) {
    for (const sc of tl.scenes) {
      const ts = sc.shots.map((sh) => ((sh.startFrame + sh.endFrame) / 2 / tl.fps).toFixed(2));
      const inputs = ts.flatMap((t) => ["-ss", t, "-i", file]);
      const filt = ts.map((_, i) => `[${i}:v]scale=480:270[v${i}]`).join(";") + ";" + ts.map((_, i) => `[v${i}]`).join("") + `hstack=inputs=${ts.length}`;
      await run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", ts.length > 1 ? filt : "[0:v]scale=480:270", "-frames:v", "1", path.join(sheetDir, `${sc.id}.jpg`)], { quiet: true });
    }
  }

  const ok = checks.every((c) => c.ok);
  const report = { file: path.relative(epDir, file), measuredAt: new Date().toISOString(), ok, checks, blacks, freezes, silences, asr };
  writeJson(path.join(epDir, "reports", preview ? "validation_preview.json" : "validation.json"), report);
  const md = [
    `# Validation report — ${path.basename(file)}`,
    "",
    `Measured ${report.measuredAt} on the delivered file. Overall: **${ok ? "PASS" : "FAIL"}**`,
    "",
    "| Check | Result | Measured | Expected |",
    "|---|---|---|---|",
    ...checks.map((c) => `| ${c.name} | ${c.ok ? "✅" : "❌"} | ${c.value} | ${c.expect} |`),
    "",
    asr ? `Transcription differences (first 30): ${asr.diffs.slice(0, 30).join("; ")}` : "",
  ].join("\n");
  writeText(path.join(epDir, "reports", preview ? "validation_preview.md" : "validation.md"), md + "\n");
  checks.forEach((c) => log("verify", `${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.value}`));
  return ok;
}
