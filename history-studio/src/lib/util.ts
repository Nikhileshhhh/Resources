import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { redact } from "./env.js";

export const sha = (...parts: unknown[]): string =>
  createHash("sha256").update(parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join("\u0000")).digest("hex").slice(0, 16);

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function writeJson(file: string, data: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, file);
}

export function writeText(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

export const exists = existsSync;

export function log(stage: string, msg: string): void {
  const t = new Date().toISOString().slice(11, 19);
  console.log(redact(`[${t}] ${stage.padEnd(9)} ${msg}`));
}

export class StageError extends Error {
  constructor(public stage: string, message: string) {
    super(redact(`${stage}: ${message}`));
  }
}

/** Run a command; resolve with stdout/stderr, reject with a readable error on non-zero exit. */
export function run(cmd: string, args: string[], opts: { cwd?: string; quiet?: boolean; input?: string } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => {
      stdout += d;
      if (!opts.quiet) process.stdout.write(redact(String(d)));
    });
    p.stderr.on("data", (d) => (stderr += d));
    if (opts.input) p.stdin.end(opts.input);
    else p.stdin.end();
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(redact(`${cmd} exited ${code}: ${stderr.slice(-1500)}`)));
    });
  });
}

export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { quiet: true });
  return Number(stdout.trim());
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function fmtTime(sec: number, srt = false): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return srt ? `${pad(h)}:${pad(m)}:${pad(s)},${pad(r, 3)}` : `${h ? pad(h) + ":" : ""}${pad(m)}:${pad(s)}`;
}
