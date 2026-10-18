import path from "node:path";
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { config, knownSecrets, ROOT } from "../lib/env.js";
import { exists, fmtTime, log, readJson, run, writeJson, writeText } from "../lib/util.js";

const TEXT_EXT = /\.(md|json|txt|srt|ts|tsx|py|csv|html|example|gitignore|yml|yaml)$/i;

/** Scan files for key material (configured keys and sk-… patterns). Returns offending paths. */
export function checkSecrets(dir: string): string[] {
  const bad: string[] = [];
  const keys = knownSecrets();
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (/(node_modules|\.git|\.venv|\.cache|models)$/.test(p) || f === ".env") continue;
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (TEXT_EXT.test(f) && st.size < 5e6) {
        const t = readFileSync(p, "utf8");
        if (keys.some((k) => t.includes(k)) || /sk-live-[a-f0-9]{20,}/.test(t)) bad.push(p);
      }
    }
  };
  walk(dir);
  return bad;
}

export async function thumbsStage(epDir: string): Promise<void> {
  const ep = readJson<{ fileStem: string }>(path.join(epDir, "episode.json"));
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "remotion", "index.ts"), outDir: path.join(ROOT, ".cache", "bundle_thumbs") });
  const dir = path.join(epDir, "thumbnails");
  mkdirSync(dir, { recursive: true });
  for (const variant of ["A", "B", "C"] as const) {
    const inputProps = { variant };
    const comp = await selectComposition({ serveUrl, id: "Thumbnail", inputProps, browserExecutable: config.browserExecutable });
    const master = path.join(dir, `${ep.fileStem}_thumb_${variant}_3840x2160.png`);
    await renderStill({ serveUrl, composition: comp, inputProps, output: master, imageFormat: "png", scale: 2, browserExecutable: config.browserExecutable, chromiumOptions: { gl: "swangle" } });
    const jpg = path.join(dir, `${ep.fileStem}_thumb_${variant}.jpg`);
    // 1920x1080 JPG, stepping quality down until it is safely under the 2 MB mobile upload limit.
    for (const q of [2, 3, 4, 6, 8]) {
      await run("ffmpeg", ["-v", "error", "-y", "-i", master, "-vf", "scale=1920:1080:flags=lanczos", "-q:v", String(q), jpg], { quiet: true });
      if (statSync(jpg).size < 1.9e6) break;
    }
    log("thumbs", `${variant}: ${path.basename(jpg)} ${(statSync(jpg).size / 1e6).toFixed(2)} MB; master ${(statSync(master).size / 1e6).toFixed(1)} MB`);
  }
}

interface Copy {
  titles: { recommended: string; alternatives: string[] };
  descriptionOpening: string;
  descriptionSummary: string;
  notes: string[];
  sources: { label: string; url: string }[];
  credits: string[];
  hashtags: string[];
  tags: string[];
  playlist: { name: string; description: string };
  pinnedComment: string;
  publish: { date: string; time: string; timezone: string; uploadPrivatelyBy: string };
  recommendedThumbnail: string;
  thumbnailNotes: Record<string, string>;
}

export async function packageStage(epDir: string): Promise<void> {
  const ep = readJson<{ fileStem: string; workingTitle: string; scenes: { chapter: string | null }[] }>(path.join(epDir, "episode.json"));
  const copy = readJson<Copy>(path.join(epDir, "upload", "copy.json"));
  const validation = exists(path.join(epDir, "reports", "validation.json")) ? readJson<any>(path.join(epDir, "reports", "validation.json")) : null;
  const chapters = readFileSync(path.join(epDir, "upload", "chapters.txt"), "utf8").trim();
  const mp4 = path.join(epDir, `${ep.fileStem}.mp4`);
  const duration = validation?.checks.find((c: any) => c.name === "Duration")?.value ?? "see validation report";
  for (const t of [copy.titles.recommended, ...copy.titles.alternatives]) if (t.length > 100) throw new Error(`Title over 100 characters: ${t}`);
  const tagChars = copy.tags.join(",").length;
  if (tagChars > 500) throw new Error(`Tags total ${tagChars} characters (> 500)`);

  const description = [
    copy.descriptionOpening,
    "",
    copy.descriptionSummary,
    "",
    "Chapters",
    chapters,
    "",
    "What the sources say (and don't)",
    ...copy.notes.map((n) => `• ${n}`),
    "",
    "Sources (all openly readable online)",
    ...copy.sources.map((s) => `• ${s.label}: ${s.url}`),
    "",
    "Credits & disclosure",
    ...copy.credits.map((c) => `• ${c}`),
    "",
    copy.hashtags.join(" "),
  ].join("\n");
  if (description.length > 5000) throw new Error(`Description is ${description.length} characters (> 5000)`);
  writeText(path.join(epDir, "upload", "description.txt"), description + "\n");

  const thumbs = exists(path.join(epDir, "thumbnails")) ? readdirSync(path.join(epDir, "thumbnails")).filter((f) => f.endsWith(".jpg")).sort() : [];
  const metadata = {
    file: path.basename(mp4),
    measuredDuration: duration,
    title: copy.titles.recommended,
    alternativeTitles: copy.titles.alternatives,
    description,
    tags: copy.tags,
    hashtags: copy.hashtags,
    category: "Education",
    videoLanguage: "English",
    captions: { file: `${ep.fileStem}.en.srt`, language: "English", certification: "This content has never aired on television in the U.S." },
    audience: { madeForKids: false, ageRestricted: false },
    paidPromotion: false,
    alteredOrSyntheticContent: false,
    license: "Standard YouTube License",
    allowEmbedding: true,
    publishToSubscriptionsFeedAndNotify: true,
    comments: "On — hold potentially inappropriate comments for review",
    playlist: copy.playlist,
    thumbnails: thumbs,
    recommendedThumbnail: thumbs.find((t) => t.includes(`_thumb_${copy.recommendedThumbnail}.jpg`)),
    visibility: { uploadAs: "Private", schedulePublic: `${copy.publish.date} ${copy.publish.time} ${copy.publish.timezone}`, uploadBy: copy.publish.uploadPrivatelyBy },
    chapters: chapters.split("\n"),
    pinnedComment: copy.pinnedComment,
  };
  writeJson(path.join(epDir, "upload", "metadata.json"), metadata);

  const endStart = validation ? null : null;
  void endStart;
  const tl = readJson<{ endScreenStartFrame: number; durationFrames: number; fps: number }>(path.join(epDir, "timeline.json"));
  const es = fmtTime(tl.endScreenStartFrame / tl.fps);
  const ee = fmtTime(tl.durationFrames / tl.fps);
  const row = (f: string, v: string, r: string) => `| ${f} | ${v.replace(/\n/g, "<br>")} | ${r} |`;
  const guide = `# YouTube upload guide — ${copy.titles.recommended}

File to upload: \`${path.basename(mp4)}\` (measured duration ${duration}; H.264 1080p30, AAC-LC 48 kHz stereo).
Captions file: \`${ep.fileStem}.en.srt\`. Thumbnails: \`thumbnails/\` (recommended: **${copy.recommendedThumbnail}**).

Nothing here has been uploaded or changed on your YouTube account. Studio wording below was checked against YouTube Help on 2026-10-18; labels can change.

## Fields

| YouTube field | Value to enter | Reason or condition |
|---|---|---|
${[
  row("Title", copy.titles.recommended, `${copy.titles.recommended.length}/100 characters. Says what the video delivers (the escape and how it worked).`),
  row("Alternative titles", copy.titles.alternatives.join("\n"), "For a later title test (Studio → Test & compare, if available on your channel)."),
  row("Description", "Paste `upload/description.txt`", `${description.length}/5000 characters. Opens with the hook, then chapters, sources, credits and AI-voice disclosure.`),
  row("Thumbnail", `Upload \`${metadata.recommendedThumbnail}\``, "1920×1080 JPG under 2 MB (mobile limit); a 3840×2160 PNG master is also provided for desktop uploads."),
  row("Playlist", `Create "${copy.playlist.name}"`, `Description: ${copy.playlist.description}`),
  row("Audience", "No, it's not made for kids", "General-audience history for teens and adults: mature subject matter (captivity, threats of execution), adult vocabulary, not aimed at children. The animated style alone does not make it child-directed."),
  row("Age restriction", "No", "No graphic violence, sexual content or other 18+ material; suffering is described without graphic detail."),
  row("Paid promotion", "Leave unticked", "No sponsor, brand deal or paid product placement. Tick only if that changes."),
  row("Altered content / AI use (Attributes)", "No", "YouTube requires disclosure for realistic AI content (real people appearing to say or do things, altered real footage, realistic scenes, or AI-generated music). This video is clearly stylised animation, the music is procedurally coded (not generative AI), and the synthetic narrator imitates no real person. Choosing Yes is optional and, per YouTube, does not limit reach or monetization."),
  row("AI voice disclosure (separate)", "Already in the description and on screen for the first 8 s", "Required by the speech provider's usage terms (OpenAI): listeners must be told the voice is AI-generated. This is separate from YouTube's AI-use setting."),
  row("Tags", copy.tags.join(", "), `${tagChars}/500 characters. A minor aid: name variants and common misspellings.`),
  row("Hashtags", copy.hashtags.join(" "), "Already at the end of the description; YouTube shows up to three above the title."),
  row("Video language", "English", "Narration language."),
  row("Caption certification", "This content has never aired on television in the U.S.", "Applies to web-original videos."),
  row("Subtitles", `Upload \`${ep.fileStem}.en.srt\` as English`, "Timed from forced alignment of the final narration (not estimated)."),
  row("Recording date / Video location", "Leave blank", "These describe where and when footage was recorded; this is an animation, and the 1666 setting is not a recording location."),
  row("License", "Standard YouTube License", "All assets are original, public domain or OFL, so Creative Commons would also be possible; Standard keeps reuse with you."),
  row("Allow embedding", "On", "Helps sharing on blogs and classroom sites."),
  row("Remixing (Shorts)", "Allow video and audio remixing", "All assets are cleared for it; can be restricted later."),
  row("Category", "Education", "Factual historical explainer."),
  row("Comments", "On; hold potentially inappropriate comments for review", "Shivaji and Aurangzeb are politically sensitive topics in India; moderation keeps discussion civil."),
  row("Publish to subscriptions feed / notify subscribers", "On", "Default; first upload."),
  row("Show how many viewers like this video", "On", "Default."),
  row("Automatic chapters", "Leave on (your manual chapters override it)", "Chapters in the description start at 00:00, at least 3, each ≥10 s."),
  row("Visibility", `Upload as Private by ${copy.publish.uploadPrivatelyBy}; Schedule public for ${copy.publish.date} ${copy.publish.time} ${copy.publish.timezone}`, "Uploading early lets HD processing and copyright/policy checks finish before the release. Uploading ≠ publishing."),
  row("End screen", `${es}–${ee}: Subscribe element; Video element = "Best for viewer" until episode 2 exists`, "End screens must sit in the last 5–20 s; the closing visuals leave the left and right thirds clear. Rendered graphics are not clickable."),
  row("Cards", `At 08:08 (chapter "Ram Singh's next war"): add a Video card to the Lachit Borphukan episode once it is public`, "Link only to real, available videos."),
  row("Monetization", "Not available yet", "YPP needs 1,000 subscribers plus 4,000 public watch hours in 12 months (or 10M Shorts views in 90 days). An eight-minute video alone doesn't make a channel eligible. YouTube's YPP terms update on 1 Feb 2027."),
].join("\n")}

## Chapters (generated from the final render timeline)

\`\`\`
${chapters}
\`\`\`

## Pinned comment draft

> ${copy.pinnedComment}

## Update checklist (after episode 2 is published)

- [ ] Replace the end-screen "Best for viewer" element with a Video element for episode 2.
- [ ] Add the 08:08 card linking to episode 2.
- [ ] Add episode 2 to the "${copy.playlist.name}" playlist and add a Playlist element to the end screen.
- [ ] Add "Next: <episode 2 title> — <link>" near the top of this description.

## Thumbnails

${Object.entries(copy.thumbnailNotes).map(([k, v]) => `- **${k}${k === copy.recommendedThumbnail ? " (recommended)" : ""}**: ${v}`).join("\n")}

## Before you publish (human checks I could not do)

- [ ] Watch the whole MP4 once with headphones: voice naturalness, name pronunciation (Raigad, Saraighat, Mathura, mansab), music level under speech.
- [ ] Read the captions once against the audio in Studio's subtitle editor.
- [ ] Confirm the AI Credits dashboard charges (the per-request gpt-4o-mini-tts price isn't published) — the wallet hit zero during production (HTTP 402).
- [ ] The final-mix transcription check was skipped (wallet empty); narration completeness rests on the earlier whisper check of the same takes plus forced alignment of every word.
`;
  writeText(path.join(epDir, "upload", "upload_guide.md"), guide);
  log("package", `metadata + upload guide written; description ${description.length} chars, tags ${tagChars} chars`);
  const bad = checkSecrets(ROOT);
  if (bad.length) throw new Error(`Secret material found in: ${bad.join(", ")}`);
  log("package", "secret scan clean");
}
