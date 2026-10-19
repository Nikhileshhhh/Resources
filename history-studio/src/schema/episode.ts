import { z } from "zod";

const Vec3 = z.tuple([z.number(), z.number(), z.number()]); // [x, y, zoom]

export const ShotText = z.object({
  kind: z.enum(["slate", "quote", "label", "caption"]),
  value: z.string().min(1),
  sub: z.string().optional(),
  attribution: z.string().optional(),
});

export const Shot = z.object({
  id: z.string().regex(/^s\d{2}[a-z]$/),
  /** Phrase in the scene narration where the shot starts; null = scene start; "@end" = after narration ends. */
  at: z.string().nullable(),
  comp: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  camera: z.object({ from: Vec3, to: Vec3, ease: z.enum(["inOut", "out", "linear"]).optional() }),
  text: ShotText.optional(),
  sfx: z.array(z.object({ cue: z.string(), at: z.union([z.string(), z.number()]).optional() })).optional(),
  note: z.string().min(1),
  continuity: z.string().optional(),
});

export const Scene = z.object({
  id: z.string().regex(/^s\d{2}$/),
  title: z.string(),
  chapter: z.string().nullable(),
  narration: z.string().min(1),
  /** Narration as performed: the same words plus ElevenLabs v3 delivery tags like [softly]. Sent to TTS when present. */
  performance: z.string().optional(),
  claims: z.array(z.string().regex(/^C\d{2}$/)),
  music: z.string().nullable().optional(),
  ambience: z.string().nullable().optional(),
  shots: z.array(Shot).min(1),
});

export const Episode = z.object({
  id: z.string(),
  slug: z.string(),
  fileStem: z.string().regex(/^episode_\d{3}_[a-z0-9_]+$/),
  workingTitle: z.string(),
  language: z.string(),
  series: z.object({ name: z.string(), part: z.number(), of: z.number() }).nullable(),
  render: z.object({ fps: z.literal(30), width: z.literal(1920), height: z.literal(1080) }),
  timing: z.object({ leadInSec: z.number(), sceneGapSec: z.number(), tailAfterNarrationSec: z.number(), endScreenSec: z.number().min(5).max(20) }),
  voice: z.object({ engine: z.string(), model: z.string(), voice: z.string(), format: z.string(), pacing: z.object({ tempo: z.number().min(0.75).max(1.1), sentencePause: z.number(), commaPause: z.number(), beatPause: z.number(), maxRuntimeSec: z.number().max(600) }).optional() }),
  disclosure: z.string(),
  scenes: z.array(Scene).min(1),
});
export type Episode = z.infer<typeof Episode>;
export type Scene = z.infer<typeof Scene>;
export type Shot = z.infer<typeof Shot>;

export const Claim = z.object({
  id: z.string().regex(/^C\d{2}$/),
  scene: z.string(),
  claim: z.string(),
  status: z.enum(["verified", "corroborated", "tradition", "disputed", "inference", "framing"]),
  sources: z.array(z.object({ id: z.string(), loc: z.string(), passage: z.string() })),
  note: z.string().optional(),
});
export const ClaimLedger = z.object({ episode: z.string(), status_key: z.record(z.string()), claims: z.array(Claim) });

export const Pronunciations = z.object({
  /** Display spelling -> spelling sent to the TTS engine. Captions always use the display spelling. */
  tts: z.record(z.string()),
  /** Display word -> ARPAbet phones for the forced aligner's dictionary. */
  aligner: z.record(z.string()).default({}),
  notes: z.string().optional(),
});

/** Timeline consumed by Remotion; produced from measured narration audio + alignment. */
export interface TimelineWord { w: string; start: number; end: number }
export interface TimelineShot { id: string; comp: string; props: Record<string, unknown>; camera: Shot["camera"]; text?: z.infer<typeof ShotText>; startFrame: number; endFrame: number }
export interface TimelineScene { id: string; title: string; chapter: string | null; startFrame: number; endFrame: number; narrationStart: number; narrationEnd: number; music?: string | null; ambience?: string | null; shots: TimelineShot[] }
export interface Timeline { episodeId: string; fps: number; width: number; height: number; durationFrames: number; disclosure: string; scenes: TimelineScene[]; words: TimelineWord[]; endScreenStartFrame: number }
