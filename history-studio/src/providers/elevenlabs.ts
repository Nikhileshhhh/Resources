import { config, redact } from "../lib/env.js";
import { log, sleep } from "../lib/util.js";
import { ProviderError } from "./openaiCompat.js";

/**
 * Minimal ElevenLabs REST client (https://api.elevenlabs.io), auth via the `xi-api-key` header.
 * Endpoints and fields follow the official SDK @elevenlabs/elevenlabs-js 2.73.0 (2026-10-15):
 *   GET  /v1/models, GET /v1/user/subscription, GET /v2/voices, GET /v1/shared-voices,
 *   POST /v1/text-to-speech/{voice_id}?output_format=…  { text, model_id, voice_settings, seed, language_code }
 * Never logs the key; every error message passes through redact().
 */
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

async function call(method: "GET" | "POST", pathName: string, body?: unknown, expect: "json" | "bytes" = "json", label = pathName, paid = false): Promise<{ data: any; headers: Record<string, string> }> {
  const { apiKey, baseUrl } = config.elevenlabs;
  if (!apiKey) throw new ProviderError(0, false, "ELEVENLABS_API_KEY is not set (environment variable or the gitignored .env)");
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 180_000);
    try {
      const res = await fetch(baseUrl.replace(/\/$/, "") + pathName, {
        method,
        headers: { "xi-api-key": apiKey, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      if (!res.ok) {
        const text = await res.text();
        throw new ProviderError(res.status, RETRYABLE.has(res.status), `HTTP ${res.status} from ElevenLabs ${pathName.split("?")[0]}: ${text.slice(0, 400)}`);
      }
      if (expect === "bytes") {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1024) throw new ProviderError(res.status, true, `Suspiciously small audio payload (${buf.length} bytes)`);
        return { data: buf, headers };
      }
      return { data: await res.json(), headers };
    } catch (e: any) {
      lastErr = e;
      // A paid call is retried only when the server clearly did not generate audio (rate limit / busy);
      // a timeout may already have spent credits, so it is reported instead of silently re-billed.
      const retryable = paid ? e instanceof ProviderError && (e.status === 429 || e.status === 503) : e instanceof ProviderError ? e.retryable : e?.name === "AbortError" || e?.name === "TypeError";
      if (!retryable || attempt === 4) break;
      const wait = 2 ** attempt * 1000 + Math.random() * 1000;
      log("elevenlabs", `${label} attempt ${attempt} failed (${redact(String(e?.message ?? e)).slice(0, 160)}); retrying in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
  if ((lastErr as any)?.name === "TypeError") throw new Error(`Could not reach ${config.elevenlabs.baseUrl} (${redact(String((lastErr as any).cause?.code ?? (lastErr as any).message))}). Is api.elevenlabs.io allowed by the network policy?`);
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export interface Subscription { tier: string; character_count: number; character_limit: number; next_character_count_reset_unix?: number; status?: string }

export async function getSubscription(): Promise<Subscription> {
  return (await call("GET", "/v1/user/subscription")).data;
}

export async function getModels(): Promise<{ model_id: string; name: string; can_do_text_to_speech?: boolean; max_characters_request_free_user?: number; max_characters_request_subscribed_user?: number; languages?: { language_id: string }[] }[]> {
  return (await call("GET", "/v1/models")).data;
}

export interface VoiceInfo { voice_id: string; name: string; category?: string; labels?: Record<string, string>; description?: string; preview_url?: string; public_owner_id?: string; accent?: string; age?: string; gender?: string; use_case?: string; descriptive?: string; usage_character_count_1y?: number; cloned_by_count?: number }

export async function myVoices(): Promise<VoiceInfo[]> {
  return (await call("GET", "/v2/voices?page_size=100")).data.voices ?? [];
}

export async function sharedVoices(q: Record<string, string | number | boolean>): Promise<VoiceInfo[]> {
  const qs = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)])).toString();
  return (await call("GET", `/v1/shared-voices?${qs}`)).data.voices ?? [];
}

/** Add a Voice Library voice to "My Voices" so the API can speak with it (free; uses a voice slot). */
export async function addSharedVoice(publicOwnerId: string, voiceId: string, name: string): Promise<string> {
  return (await call("POST", `/v1/voices/add/${publicOwnerId}/${voiceId}`, { new_name: name })).data.voice_id;
}

export async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading preview`);
  return Buffer.from(await res.arrayBuffer());
}

export interface TtsResult { audio: Buffer; requestId?: string }

export async function textToSpeech(voiceId: string, text: string, opts: { model: string; stability: number; outputFormat: string; seed?: number }): Promise<TtsResult> {
  const body: Record<string, unknown> = { text, model_id: opts.model, voice_settings: { stability: opts.stability }, language_code: "en" };
  if (opts.seed !== undefined) body.seed = opts.seed;
  const { data, headers } = await call("POST", `/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(opts.outputFormat)}`, body, "bytes", `tts ${text.length} chars`, true);
  return { audio: data, requestId: headers["request-id"] ?? headers["x-request-id"] };
}
