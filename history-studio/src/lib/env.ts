import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);

/** Parse a .env file (KEY=VALUE lines). Values in the real environment take precedence. */
function loadDotEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = loadDotEnv(path.join(ROOT, ".env"));
const get = (k: string, d = ""): string => process.env[k] ?? fileEnv[k] ?? d;
const bool = (k: string, d = false): boolean => /^(1|true|yes)$/i.test(get(k, String(d)));

export interface Endpoint {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const config = {
  speech: {
    engine: get("SPEECH_ENGINE", "openai-compatible") as "openai-compatible" | "kokoro",
    baseUrl: get("SPEECH_BASE_URL", "https://api.aicredits.in/v1"),
    apiKey: get("SPEECH_API_KEY"),
    model: get("SPEECH_MODEL", "openai/gpt-4o-mini-tts"),
    voice: get("SPEECH_VOICE", "cedar"),
    kokoroVoice: get("KOKORO_VOICE", "bm_george"),
  },
  text: { enabled: bool("TEXT_ENABLED"), baseUrl: get("TEXT_BASE_URL"), apiKey: get("TEXT_API_KEY"), model: get("TEXT_MODEL", "openai/gpt-4o-mini") },
  stt: { enabled: bool("STT_ENABLED"), baseUrl: get("STT_BASE_URL"), apiKey: get("STT_API_KEY"), model: get("STT_MODEL", "openai/whisper-1") },
  image: { enabled: bool("IMAGE_ENABLED"), baseUrl: get("IMAGE_BASE_URL"), apiKey: get("IMAGE_API_KEY"), model: get("IMAGE_MODEL") },
  youtubeApiKey: get("YOUTUBE_API_KEY"),
  budgetInr: Number(get("EPISODE_BUDGET_INR", "100")),
  outputDir: path.resolve(ROOT, get("OUTPUT_DIR", "episodes")),
  language: get("LANGUAGE", "en"),
  renderConcurrency: Number(get("RENDER_CONCURRENCY", "4")),
  browserExecutable: get("BROWSER_EXECUTABLE") || null,
  python: path.join(ROOT, ".venv", "bin", "python"),
};

/** Every secret currently loaded, so logs and packages can be scrubbed. */
export function knownSecrets(): string[] {
  return [config.speech.apiKey, config.text.apiKey, config.stt.apiKey, config.image.apiKey, config.youtubeApiKey].filter((s) => s && s.length >= 8);
}

export function redact(s: string): string {
  let out = s;
  for (const k of knownSecrets()) out = out.split(k).join("sk-***");
  return out.replace(/sk-[A-Za-z0-9_-]{16,}/g, "sk-***");
}
