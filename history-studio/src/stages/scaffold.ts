import path from "node:path";
import { mkdirSync, readdirSync } from "node:fs";
import { config } from "../lib/env.js";
import { exists, log, writeJson, writeText } from "../lib/util.js";

/**
 * Create a new episode folder with placeholder research, ledger and episode.json skeleton.
 * Research and script are authored work (by you or Claude Code); the production stages then run with `studio run`.
 */
export function newEpisode(slug: string, number?: string, title?: string): void {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("--slug must be lowercase letters, digits and hyphens");
  const existing = exists(config.outputDir) ? readdirSync(config.outputDir).filter((d) => /^episode_\d{3}_/.test(d)) : [];
  const n = number ? Number(number) : existing.length + 1;
  const id = `episode_${String(n).padStart(3, "0")}`;
  const dir = path.join(config.outputDir, `${id}_${slug}`);
  if (exists(dir)) throw new Error(`${dir} already exists`);
  for (const d of ["research", "audio", "thumbnails", "upload", "reports"]) mkdirSync(path.join(dir, d), { recursive: true });
  writeJson(path.join(dir, "research", "sources.json"), { accessed: new Date().toISOString().slice(0, 10), sources: [] });
  writeJson(path.join(dir, "research", "claims.json"), { episode: `${id}_${slug}`, status_key: {}, claims: [] });
  writeJson(path.join(dir, "pronunciations.json"), { tts: {}, aligner: {} });
  writeJson(path.join(dir, "episode.json"), {
    id,
    slug,
    fileStem: `${id}_${slug.replace(/-/g, "_")}`,
    workingTitle: title ?? slug,
    language: config.language,
    series: null,
    render: { fps: 30, width: 1920, height: 1080 },
    timing: { leadInSec: 0.6, sceneGapSec: 0.85, tailAfterNarrationSec: 2.0, endScreenSec: 20 },
    voice: { engine: config.speech.engine, model: config.speech.model, voice: config.speech.voice, format: "flac" },
    disclosure: `Narration: AI-generated voice (${config.speech.engine === "kokoro" ? "Kokoro-82M" : config.speech.model})`,
    scenes: [],
  });
  writeText(
    path.join(dir, "research", "dossier.md"),
    `# Research dossier — ${title ?? slug}\n\n1. Read 3–5 sources you can actually open; record them in sources.json.\n2. Add every date, number, quotation and causal claim to claims.json with the supporting passage.\n3. Mark disputed points and legends; never invent dialogue.\n4. Then write scenes in episode.json (narration + shots), run \`npm run studio -- validate --episode ${path.relative(process.cwd(), dir)}\`.\n`,
  );
  log("new", `created ${dir}`);
}
