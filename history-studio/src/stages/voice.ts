import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { config, ROOT } from "../lib/env.js";
import { Budget } from "../lib/budget.js";
import { exists, log, readJson, run, writeJson } from "../lib/util.js";
import * as eleven from "../providers/elevenlabs.js";
import { ProviderError } from "../providers/openaiCompat.js";
import type { Episode } from "../schema/episode.js";
import { ElevenCredits, synthEleven, ttsText } from "./tts.js";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Confirm the account before any paid call: model availability, plan, remaining credits, chosen voice. No credits used. */
export async function elevenCheck(epDir: string): Promise<void> {
  const { model, voiceId } = config.elevenlabs;
  const models = await eleven.getModels();
  const m = models.find((x) => x.model_id === model);
  log("elevenlabs", `models on this account: ${models.filter((x) => x.can_do_text_to_speech).map((x) => x.model_id).join(", ")}`);
  if (!m || m.can_do_text_to_speech === false) throw new Error(`Model ${model} is not available for text-to-speech on this account. Not substituting another model; set ELEVENLABS_MODEL explicitly.`);
  const sub = await eleven.getSubscription();
  const left = sub.character_limit - sub.character_count;
  const reset = sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toISOString().slice(0, 10) : "?";
  log("elevenlabs", `plan "${sub.tier}" (${sub.status ?? "status ?"}): ${sub.character_count}/${sub.character_limit} credits used, ${left} left, resets ${reset}`);
  log("elevenlabs", `model ${model}: max ${m.max_characters_request_subscribed_user ?? "?"} chars/request; episode credit cap ${config.elevenlabs.creditCap}`);
  let voice: string | null = null;
  if (voiceId) {
    const mine = await eleven.myVoices();
    const v = mine.find((x) => x.voice_id === voiceId);
    voice = v ? `${v.name} (${voiceId})` : null;
    log("elevenlabs", v ? `voice ${v.name} found in My Voices` : `WARNING voice ${voiceId} is not in My Voices; run audition to add it`);
  }
  if (/free/i.test(sub.tier)) log("elevenlabs", "WARNING free plan: check ElevenLabs' terms for commercial/YouTube use and Voice Library API access before producing an episode");
  writeJson(path.join(epDir, "reports", "elevenlabs_account.json"), { checkedAt: new Date().toISOString(), model, modelAvailable: true, tier: sub.tier, status: sub.status, creditsUsed: sub.character_count, creditLimit: sub.character_limit, creditsLeft: left, resetDate: reset, voice, episodeCreditCap: config.elevenlabs.creditCap });
}

/**
 * Search the Voice Library for female storytelling narrators and download their free preview clips
 * (no credits used) so they can be compared by ear before any paid audition.
 */
export async function voicesSearch(epDir: string, opts: { accent?: string; search?: string; limit?: number }): Promise<void> {
  const dir = path.join(epDir, "audio", "auditions", "previews");
  mkdirSync(dir, { recursive: true });
  const q: Record<string, string | number | boolean> = { gender: "female", language: "en", use_cases: "narrative_story", sort: "usage_character_count_1y", page_size: opts.limit ?? 12 };
  if (opts.accent) q.accent = opts.accent;
  if (opts.search) q.search = opts.search;
  const found = await eleven.sharedVoices(q);
  const rows = [];
  for (const v of found) {
    const file = path.join(dir, `${slug(v.name)}_${v.voice_id}.mp3`);
    if (v.preview_url && !exists(file)) {
      try {
        writeFileSync(file, await eleven.download(v.preview_url));
      } catch (e) {
        log("voices", `preview for ${v.name} not downloadable (${String(e)})`);
      }
    }
    rows.push({ name: v.name, voice_id: v.voice_id, public_owner_id: v.public_owner_id, accent: v.accent, age: v.age, descriptive: v.descriptive, use_case: v.use_case, usage_1y: v.usage_character_count_1y, cloned_by: v.cloned_by_count, description: v.description?.slice(0, 160), preview: exists(file) ? path.relative(epDir, file) : null });
    log("voices", `${v.name} [${v.voice_id}] ${v.accent ?? ""} ${v.age ?? ""} ${v.descriptive ?? ""} · used ${v.usage_character_count_1y ?? "?"} chars/yr`);
  }
  writeJson(path.join(epDir, "audio", "auditions", "candidates.json"), rows);
}

/**
 * Paid audition: the same passage from this episode, voiced by each candidate, so voices are compared
 * on real material. Voice Library voices are added to My Voices first (free). Respects the credit cap.
 */
export async function audition(ep: Episode, epDir: string, voiceIds: string[], scenes = ["s01", "s13"], stabilities = [config.elevenlabs.stability]): Promise<void> {
  const budget = new Budget(epDir, ROOT);
  const credits = new ElevenCredits(budget);
  const pron = readJson<{ tts: Record<string, string> }>(path.join(epDir, "pronunciations.json"));
  const candidatesFile = path.join(epDir, "audio", "auditions", "candidates.json");
  const candidates: { name: string; voice_id: string; public_owner_id?: string }[] = exists(candidatesFile) ? readJson(candidatesFile) : [];
  const mine = await eleven.myVoices();
  const dir = path.join(epDir, "audio", "auditions");
  const results = [];
  for (const id of voiceIds) {
    let voiceId = id;
    let name = mine.find((v) => v.voice_id === id)?.name;
    if (!name) {
      const c = candidates.find((v) => v.voice_id === id);
      if (!c?.public_owner_id) throw new Error(`Voice ${id} is neither in My Voices nor in candidates.json; run \`studio voices\` first`);
      voiceId = await eleven.addSharedVoice(c.public_owner_id, c.voice_id, c.name);
      name = c.name;
      log("audition", `added ${name} to My Voices as ${voiceId}`);
    }
    for (const stability of stabilities) {
      const parts: string[] = [];
      for (const sid of scenes) {
        const s = ep.scenes.find((x) => x.id === sid);
        if (!s) throw new Error(`no scene ${sid}`);
        const out = path.join(dir, `${slug(name)}_st${stability}_${sid}.wav`);
        if (!exists(out)) {
          log("audition", `${name} (stability ${stability}) ${sid}`);
          try {
            await synthEleven(ttsText(s.performance ?? s.narration, pron.tts), out, credits, `audition ${slug(name)}`, voiceId, stability);
          } catch (e) {
            if (e instanceof ProviderError && e.status === 400 && /stability/i.test(e.message)) throw new Error(`${config.elevenlabs.model} rejected stability ${stability}; try 0.0, 0.5 or 1.0`);
            throw e;
          }
        }
        parts.push(out);
      }
      const mp3 = path.join(dir, `audition_${slug(name)}_stability-${stability}.mp3`);
      const filter = parts.map((_, i) => `[${i}:a]apad=pad_dur=1.0[a${i}]`).join(";") + ";" + parts.map((_, i) => `[a${i}]`).join("") + `concat=n=${parts.length}:v=0:a=1[out]`;
      await run("ffmpeg", ["-v", "error", "-y", ...parts.flatMap((f) => ["-i", f]), "-filter_complex", filter, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "160k", mp3], { quiet: true });
      results.push({ name, voiceId, stability, file: path.relative(epDir, mp3) });
      log("audition", `→ ${path.relative(epDir, mp3)}`);
    }
  }
  writeJson(path.join(dir, "auditions.json"), results);
  log("audition", `ElevenLabs credits used by this episode so far: ${credits.used()} of cap ${config.elevenlabs.creditCap}`);
}
