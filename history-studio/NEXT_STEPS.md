# Next steps: re-voice episode 001 with an ElevenLabs female storyteller

State at commit time: the performance script v2 is in `episodes/episode_001_shivaji-escape-agra/episode.json`, and the ElevenLabs engine is built. No ElevenLabs audio exists yet. The timeline and captions still belong to the old cedar voice.

Hard rules from the owner:
- **At most 10,000 ElevenLabs credits per episode**, including auditions and retakes. Don't waste any.
- **Never shorten or weaken the script to save credits.**
- Never print, commit or zip the API key. It comes from the environment variable `ELEVENLABS_API_KEY`.
- Never buy credits, change plans, or touch the owner's YouTube account.

## In a fresh session
1. **Rebuild the tools** (see `docs/SETUP.md`): `npm ci`, the Python venv with the pinned packages, and the Kokoro model only if the fallback is needed.
   - Set `BROWSER_EXECUTABLE` in `.env` (gitignored) to the headless shell, `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell`.
   - Set `SPEECH_ENGINE=elevenlabs` and `STT_ENABLED=false`.
2. **Check the account** with `npm run studio -- el-check --episode episodes/episode_001_shivaji-escape-agra`. It uses no credits. Confirm that `eleven_v3` is available, and check the plan and credits left.
3. **Shortlist voices** with `voices` (free previews), then `voices --accent indian`. Send the owner the 3–4 best preview MP3s and let them choose by ear.
4. **Audition** with `audition --voices <idA>,<idB>`. This voices the real s01 (about 650 credits for 2 voices), and the winner's take is reused as the final s01. Send both MP3s; **the owner picks the voice**.
5. Set `ELEVENLABS_VOICE_ID` (the My Voices id printed by the audition) and `ELEVENLABS_VOICE_NAME` in `.env`. Then run `run`, which does tts → align → pace → align → timeline → audio → render → mux → verify → package. The run prices itself first and refuses to start if it would pass the cap.
6. **Listen before rendering.** Check for tags read aloud, names, clipped endings, and whether s13 sounds like the climax. Re-voice only the scenes with problems, using `tts --scenes sNN --force`, paid from the reserve of about 1,500 credits.
7. **Deliver:**
   - Keep the programme at or under 595 s; `pace` auto-fits the pauses.
   - Make the light MP4 encode (two-pass, about 96 MB) for download alongside the master.
   - Update the disclosure with the chosen voice's name.
