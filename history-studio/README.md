# history-studio

A local command-line pipeline that turns a researched script into a finished, verified **animated true-history episode** (1080p30 MP4) and a manual YouTube upload package.

```
research → claim ledger → outline/script → scene & shot plan (episode.json)
  → narration (TTS, cached per scene, ending-checked) → forced alignment (PocketSphinx)
  → timeline + SRT captions + chapters → original vector animation (Remotion)
  → procedural score/ambience/sfx + ducked mix (−15 LUFS) → MP4 render + mux
  → measured verification report → thumbnails + upload guide + metadata
```

Episode 1, *Shivaji's Escape from Agra (1666)*, lives in `episodes/episode_001_shivaji-escape-agra/`.

## Quick start
See **[docs/SETUP.md](docs/SETUP.md)** for installation (Linux, macOS, Windows via WSL2).

```bash
npm run studio -- validate --episode episodes/episode_001_shivaji-escape-agra
npm run studio -- run      --episode episodes/episode_001_shivaji-escape-agra   # all stages, cached/resumable
npm run studio -- status   --episode episodes/episode_001_shivaji-escape-agra
```

## Commands (`npm run studio -- <command> --episode <dir>`)
| Command | What it does |
|---|---|
| `new --slug <topic> [--title "…"]` | Scaffold a new episode folder (research files, ledger, episode.json skeleton) |
| `validate` | Schema check of episode.json; every scene must link to ledger claims; shot anchors must exist in the narration |
| `pron-test --words "A,B"` | Synthesize each name raw and respelled, transcribe it, and show what was heard |
| `tts [--scenes s07,s10] [--force]` | Narration per scene, cached by text/voice/model hash; checks each ending via transcription and retries (max 3) |
| `asr` | Transcribe every scene and diff it against the script (catches truncation or skipped words) |
| `align` | PocketSphinx forced alignment, giving word timings |
| `timeline` | Scene and shot frames from measured audio; SRT captions; chapters |
| `audio` | Synthesize music, ambience and sfx; ducked mix; two-pass loudnorm |
| `stills [--shots s01a,s03]` | One review still per shot |
| `preview [--from s13 --seconds 25]` | Render a short representative clip (video only); then `mux --preview`, `verify --preview` |
| `render` / `mux` / `verify` | Full render, mux AAC audio with faststart, measured QA report |
| `thumbs` | Three thumbnail concepts: 3840×2160 PNG masters plus 1920×1080 JPGs under 2 MB |
| `package` | Description, metadata.json, upload_guide.md; fails if any secret is found |
| `check-secrets [--path .]` | Scan for API keys before committing or zipping |
| `run` | validate → tts → align → timeline → audio → render → mux → verify → package |

Changing one scene's narration re-voices only that scene. Changed animation code re-bundles automatically; renders reuse nothing stale.

## Making the next episode
1. `npm run studio -- new --slug netaji-great-escape-part-1 --title "…"`
2. Research: read 3–5 sources you can actually open; fill `research/sources.json`, `research/claims.json` and `research/dossier.md`.
3. Write `episode.json` scenes (narration + shots using the set components listed in `src/remotion/sets/*`). Add new sets or character presets when the story needs them.
4. `npm run studio -- validate …`, `pron-test` for new names, then `run`.
5. Review `renders/stills` and `reports/frames`, then listen to the whole MP4 before uploading.

Research and scripting are authored work (by you, or with Claude Code). An optional gpt-4o-mini drafting call can be enabled with `TEXT_ENABLED=true`; it has no web access and its output must be checked against the ledger.

## Layout
```
config/pricing.json       per-model prices (estimated where the provider publishes none)
src/cli.ts                CLI
src/stages/*.ts           pipeline stages
src/providers/            OpenAI-compatible client (timeouts, bounded retry, key redaction)
src/remotion/             animation: Figure rig, kit (environments/props), sets, Episode composer, Thumbnail
py/                       Kokoro TTS, PocketSphinx alignment, procedural audio, mixer
docs/                     channel strategy, bible, shortlist, calendar, analytics, setup
episodes/<id>/            everything for one episode (heavy media is gitignored)
```
