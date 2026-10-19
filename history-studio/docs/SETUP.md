# Setup

Tested on Ubuntu 24.04 (4 vCPU, 15 GB RAM, **no GPU**): Node 22.22, Python 3.13, FFmpeg 6.1.1. CPU rendering of a nine-minute episode takes about 1.5–2 hours. No GPU or cloud rendering is required.

## 1. System tools
- **Node.js ≥ 20** (22 LTS recommended) and npm
- **Python ≥ 3.10** with `venv`
- **FFmpeg + ffprobe** (`sudo apt install ffmpeg` / `brew install ffmpeg`)
- A Chrome/Chromium **headless shell**. Remotion downloads one automatically on first render when internet access allows; otherwise set `BROWSER_EXECUTABLE` in `.env`.

### Windows
Use **WSL2 with Ubuntu** (recommended; the pipeline uses POSIX paths and shell tools):
1. In PowerShell (Admin): `wsl --install -d Ubuntu`, then reboot and open Ubuntu.
2. Inside Ubuntu: `sudo apt update && sudo apt install -y ffmpeg python3-venv git curl`.
3. Install Node 22 with nvm: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`, reopen the shell, then `nvm install 22`.
4. Keep the project inside the WSL filesystem (e.g. `~/history-studio`), not under `/mnt/c`, for speed.

Find renders from Windows Explorer at `\\wsl$\Ubuntu\home\<you>\history-studio\episodes\…`.

## 2. Install
```bash
cd history-studio
npm ci                                  # pinned versions (remotion 4.0.536, react 19.3.1, zod 3.25.76 …)
python3 -m venv .venv
.venv/bin/pip install "kokoro-onnx==0.6.1" "pocketsphinx==5.1.1" "soundfile==0.14.0" "pyloudnorm==0.2.0" "scipy==1.18.1" numpy
# Optional local voice (Apache-2.0), ~330 MB:
mkdir -p models/kokoro && cd models/kokoro
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ../..
```

## 3. Configure
```bash
cp .env.example .env     # .env is gitignored; never commit it
```
Fill in `SPEECH_API_KEY` (and `STT_API_KEY` for the transcription checks). For AI Credits:
- **Base URL:** `https://api.aicredits.in/v1`
- **Models:** `openai/gpt-4o-mini-tts` (narration) and `openai/whisper-1` (checks)
- **Auth:** `Authorization: Bearer sk-…`

Set `EPISODE_BUDGET_INR` to your per-episode cap. Paid calls are refused before they would exceed it, and spend is logged to `episodes/<id>/reports/usage.json`.

**ElevenLabs narration** (female storyteller, Eleven v3 with delivery tags): set `SPEECH_ENGINE=elevenlabs` and provide `ELEVENLABS_API_KEY`, ideally as an environment variable in your cloud environment's settings, not in a file. The machine must be able to reach `api.elevenlabs.io`. Then run `el-check`, `voices`, `audition`, set `ELEVENLABS_VOICE_ID`, and run as normal. Auth is the `xi-api-key` header. Every call is counted against `ELEVENLABS_CREDIT_CAP`, and the tool checks your remaining credits first; it never buys credits. See `docs/storytelling_voice_direction.md`.

To use **no paid API at all**, set `SPEECH_ENGINE=kokoro` and `STT_ENABLED=false`. Narration then comes from the local Kokoro voice, and the ending check falls back to forced alignment only.

If you're behind an HTTPS proxy, the CLI automatically enables Node's proxy support (`NODE_USE_ENV_PROXY=1`).

## 4. Licences to be aware of
- **Remotion**: free for individuals and companies with up to 3 employees (commercial use allowed); larger companies need a company license (remotion.pro).
- **Fonts**: OFL. **Map data**: Natural Earth (public domain). **Kokoro**: Apache-2.0. **PocketSphinx**: BSD.
- **OpenAI TTS output**: you must tell listeners the voice is AI-generated.

## 5. Typical run
```bash
npm run studio -- run --episode episodes/episode_001_shivaji-escape-agra
npm run studio -- thumbs --episode episodes/episode_001_shivaji-escape-agra
```
Re-running is safe: completed narration, alignment and bundles are cached. To re-voice one scene after editing it, run `tts --scenes s07` (it is re-voiced automatically because its text hash changed).
