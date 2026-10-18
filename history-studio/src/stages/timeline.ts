import path from "node:path";
import { fmtTime, log, readJson, writeJson, writeText } from "../lib/util.js";
import type { Episode, Timeline, TimelineScene, TimelineWord } from "../schema/episode.js";
import type { Alignment } from "./align.js";
import type { AudioManifest } from "./tts.js";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");

/** Index of the first aligned word where `phrase` begins (case/punctuation-insensitive). */
function findPhrase(words: { w: string }[], phrase: string): number {
  const p = phrase.split(/[\s-–—]+/).map(norm).filter(Boolean);
  for (let i = 0; i + p.length <= words.length; i++) if (p.every((t, k) => norm(words[i + k].w) === t)) return i;
  return -1;
}

/**
 * Build the render timeline from measured audio: scene i occupies
 * [lead-in/gap] + narration + (tail on the last scene) + end screen.
 * Shot boundaries snap to the first word of their anchor phrase.
 */
export function timelineStage(ep: Episode, epDir: string): Timeline {
  const fps = ep.render.fps;
  const manifest = readJson<AudioManifest>(path.join(epDir, "audio", "manifest.json"));
  const align = readJson<Alignment>(path.join(epDir, "audio", "alignment.json"));
  const scenes: TimelineScene[] = [];
  const words: TimelineWord[] = [];
  let t = ep.timing.leadInSec;
  const placements: { id: string; start: number; file: string }[] = [];

  ep.scenes.forEach((s, i) => {
    const audio = manifest.scenes[s.id];
    const a = align[s.id];
    const sceneStart = i === 0 ? 0 : t - ep.timing.sceneGapSec / 2;
    const narrationStart = t;
    const narrationEnd = t + audio.seconds;
    placements.push({ id: s.id, start: narrationStart, file: audio.file });
    a.words.forEach((w) => words.push({ w: w.w, start: +(narrationStart + w.start).toFixed(3), end: +(narrationStart + w.end).toFixed(3) }));
    const isLast = i === ep.scenes.length - 1;
    const sceneEnd = isLast ? narrationEnd + ep.timing.tailAfterNarrationSec : narrationEnd + ep.timing.sceneGapSec / 2;
    const startFrame = Math.round(sceneStart * fps);
    const endFrame = Math.round(sceneEnd * fps);

    const shots = s.shots.filter((sh) => sh.at !== "@end").map((sh, k) => {
      let at = sceneStart;
      if (sh.at) {
        const idx = findPhrase(a.words, sh.at);
        if (idx < 0) throw new Error(`${sh.id}: anchor "${sh.at}" not found in aligned words of ${s.id}`);
        at = narrationStart + a.words[idx].start - 0.15; // cut slightly before the word lands
      }
      return { id: sh.id, comp: sh.comp, props: sh.props, camera: sh.camera, text: sh.text, startFrame: k === 0 ? startFrame : Math.round(at * fps), endFrame: 0 };
    });
    shots.forEach((sh, k) => (sh.endFrame = k < shots.length - 1 ? shots[k + 1].startFrame : endFrame));
    scenes.push({ id: s.id, title: s.title, chapter: s.chapter, startFrame, endFrame, narrationStart, narrationEnd, music: s.music, ambience: s.ambience, shots });
    t = narrationEnd + ep.timing.sceneGapSec;
  });

  // End screen: dedicated final scene of exactly endScreenSec.
  const last = scenes[scenes.length - 1];
  const endShot = ep.scenes[ep.scenes.length - 1].shots.find((sh) => sh.at === "@end");
  const endStart = last.endFrame;
  const endEnd = endStart + Math.round(ep.timing.endScreenSec * fps);
  if (endShot) scenes.push({ id: "end", title: "End screen", chapter: null, startFrame: endStart, endFrame: endEnd, narrationStart: endStart / fps, narrationEnd: endStart / fps, music: "outro", ambience: "river_dusk", shots: [{ id: endShot.id, comp: endShot.comp, props: endShot.props, camera: endShot.camera, text: endShot.text, startFrame: endStart, endFrame: endEnd }] });

  for (const sc of scenes) for (const sh of sc.shots) if (sh.endFrame - sh.startFrame < fps * 1.2) log("timeline", `WARN ${sh.id} is only ${((sh.endFrame - sh.startFrame) / fps).toFixed(2)}s`);

  const timeline: Timeline = { episodeId: ep.id, fps, width: ep.render.width, height: ep.render.height, durationFrames: endEnd, disclosure: ep.disclosure, scenes, words, endScreenStartFrame: endStart };
  writeJson(path.join(epDir, "timeline.json"), timeline);
  writeJson(path.join(epDir, "audio", "placements.json"), { totalSeconds: endEnd / fps, placements });
  writeText(path.join(epDir, `${ep.fileStem}.en.srt`), buildSrt(words, ep));
  writeText(path.join(epDir, "upload", "chapters.txt"), buildChapters(scenes, fps));
  log("timeline", `duration ${(endEnd / fps).toFixed(2)}s (${fmtTime(endEnd / fps)}), ${scenes.reduce((a, s) => a + s.shots.length, 0)} shots, ${words.length} words`);
  return timeline;
}

/** Captions from aligned words: ≤2 lines of ≤42 chars, ≤6.5 s, broken at punctuation where possible. */
export function buildSrt(words: TimelineWord[], ep: Episode): string {
  // Restore punctuation by walking the display narration alongside the aligned words.
  const display = ep.scenes.map((s) => s.narration).join(" ").split(/\s+/).flatMap((tok) => tok.split(/(?<=[-–—])/));
  const cues: { start: number; end: number; text: string }[] = [];
  let cur: TimelineWord[] = [];
  let curText: string[] = [];
  let di = 0;
  const flush = () => {
    if (!cur.length) return;
    cues.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: wrap(curText.join(" ").replace(/-\s/g, "-")) });
    cur = [];
    curText = [];
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // find the display token containing this word
    let tok = w.w;
    while (di < display.length && !norm(display[di]).includes(norm(w.w))) di++;
    if (di < display.length) {
      tok = display[di];
      if (norm(display[di]) === norm(w.w) || /[-–—]$/.test(display[di])) di++;
      else if (norm(display[di]).endsWith(norm(w.w))) di++;
    }
    const gap = cur.length ? w.start - cur[cur.length - 1].end : 0;
    const len = (curText.join(" ") + " " + tok).length;
    if (cur.length && (len > 84 || w.end - cur[0].start > 6.5 || gap > 0.6)) flush();
    cur.push(w);
    curText.push(tok);
    if (/[.!?]["”]?$/.test(tok) || (/[,;:]["”]?$/.test(tok) && curText.join(" ").length > 40)) flush();
  }
  flush();
  // Keep cues readable: minimum 0.9 s on screen, never overlapping the next cue.
  cues.forEach((c, i) => {
    const next = cues[i + 1];
    c.end = Math.max(c.end, Math.min(c.start + 0.9, next ? next.start - 0.05 : c.start + 0.9));
    if (next && c.end > next.start - 0.04) c.end = next.start - 0.04;
  });
  return cues.map((c, i) => `${i + 1}\n${fmtTime(c.start, true)} --> ${fmtTime(c.end, true)}\n${c.text}\n`).join("\n");
}

function wrap(text: string): string {
  if (text.length <= 42) return text;
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? text : text.slice(0, best) + "\n" + text.slice(best + 1);
}

function buildChapters(scenes: TimelineScene[], fps: number): string {
  const lines: string[] = [];
  let lastStart = -999;
  for (const s of scenes) {
    if (!s.chapter) continue;
    const start = lines.length === 0 ? 0 : s.startFrame / fps;
    if (start - lastStart < 10) continue; // YouTube requires chapters of at least 10 s
    lines.push(`${fmtTime(start)} ${s.chapter}`);
    lastStart = start;
  }
  return lines.join("\n") + "\n";
}
