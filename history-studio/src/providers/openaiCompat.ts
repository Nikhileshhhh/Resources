import { redact } from "../lib/env.js";
import { log, sleep } from "../lib/util.js";

export class ProviderError extends Error {
  constructor(public status: number, public retryable: boolean, message: string) {
    super(redact(message));
  }
}

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

/**
 * POST JSON to an OpenAI-compatible endpoint with a timeout and bounded exponential backoff.
 * Returns raw bytes (audio) or parsed JSON. Never logs the key.
 */
export async function postJson(
  baseUrl: string,
  apiKey: string,
  pathName: string,
  body: unknown,
  opts: { expect: "bytes" | "json"; timeoutMs?: number; maxAttempts?: number; label?: string } = { expect: "json" },
): Promise<{ data: Buffer | any; headers: Record<string, string> }> {
  if (!apiKey) throw new ProviderError(0, false, `No API key configured for ${baseUrl}${pathName}`);
  const maxAttempts = opts.maxAttempts ?? 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 120_000);
    try {
      const res = await fetch(baseUrl.replace(/\/$/, "") + pathName, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      if (!res.ok) {
        const text = await res.text();
        throw new ProviderError(res.status, RETRYABLE.has(res.status), `HTTP ${res.status} from ${pathName}: ${text.slice(0, 500)}`);
      }
      if (opts.expect === "bytes") {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 512) throw new ProviderError(res.status, true, `Suspiciously small audio payload (${buf.length} bytes)`);
        return { data: buf, headers };
      }
      const text = await res.text();
      try {
        return { data: JSON.parse(text), headers };
      } catch {
        throw new ProviderError(res.status, true, `Malformed JSON from ${pathName}: ${text.slice(0, 200)}`);
      }
    } catch (e: any) {
      lastErr = e;
      const retryable = e instanceof ProviderError ? e.retryable : e?.name === "AbortError" || e?.cause?.code === "ECONNRESET" || e?.name === "TypeError";
      if (!retryable || attempt === maxAttempts) break;
      const wait = 2 ** attempt * 1000 + Math.random() * 1000;
      log("provider", `${opts.label ?? pathName} attempt ${attempt} failed (${redact(String(e?.message ?? e)).slice(0, 160)}); retrying in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
