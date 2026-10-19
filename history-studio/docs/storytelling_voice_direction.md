# Storytelling voice direction (female narrator, ElevenLabs v3)

This replaces the "reads like a paragraph" delivery of the first cut. Two things change:
- **The script** is now written for the ear, and the scene-by-scene direction sits in the episode's `script.md`.
- **The narrator** is a female storyteller voiced with ElevenLabs Eleven v3 (`eleven_v3`). This model takes inline delivery tags such as `[softly]` or `[whispers]`.

## 1. What the listener should feel
The listener should feel that someone is telling them a true story across a table at night. It shouldn't sound like an announcer reading facts.
- **Intimate:** spoken to one person, never projected to a hall. Warmth, with a hint of a smile on the ironic lines.
- **Suspense through restraint:** the most dramatic lines are the quietest. Volume never carries the drama; pace and silence do.
- **Trustworthy:** when the script says "according to later accounts" or "a letter from Agra reports", the voice stays plain and even, and those lines are never dramatised. The channel's promise is legend checked against the record.

## 2. Voice profile to cast
| Want | Avoid |
|---|---|
| Adult woman, about 30–55, low-mid register, warm and slightly textured | Bright "explainer" or advert voices; teen or very young voices |
| Can drop to a near-whisper without becoming breathy ASMR | Voices that only whisper, or that clip at full volume |
| Clean diction on names (Shivaji, Aurangzeb, Sambhaji, Jahanara) | Heavy regional accents that blur names for a global audience |
| Natural rise-and-fall, sentence endings that resolve | "Uptalk", or flat endings on every sentence |

Accent: audition at least one **Indian English** voice (authentic names, and it suits the subject) and one **British** or **neutral international** voice. Pick by ear on the same passage. `studio voices` downloads ElevenLabs' free preview clips for female `narrative_story` voices; `studio audition` then voices the episode's own cold open and escape night (s01 + s13) for each shortlisted voice.

## 3. Speed and pauses
The overall target is about **140–150 words per minute including pauses**. Episode 001 has 1,371 words, so about 9:10–9:50 of speech plus the end screen, which fits the 8–10 minute target. Speed varies with the story:

| Passage type | Target | Example |
|---|---|---|
| Set-up and context | 150–165 wpm, brisk but unhurried | s03 "First, the players." |
| Tension and stakes | 130–140 wpm | s08 the security bond |
| Climax | 110–125 wpm, with space around each image | s13 the night of the escape |
| Reveal lines | a full beat (about 1 s) before, then slow | "They are gone." / "Nothing." / "And it cost him." |

Pauses come from punctuation (the voice model reads it as timing):
- **Ellipsis (…)** marks a held breath before a turn: "Inside are a Maratha ruler from the Deccan... and his nine-year-old son."
- **Full stops on fragments** give a deliberate, rhythmic delivery: "Lean. Short. Fair. Bearded."
- **Comma** is a short breath. Em-dashes are avoided because they are read inconsistently.
- The pipeline's `pace` stage (tempo 1.0, so the voice is never time-stretched) can add up to 0.25 s after sentences and 0.5 s before short beat lines. It shrinks those pauses automatically if the programme would run past 595 s.

Eleven v3's API exposes only `stability` as a voice setting, with no speed slider. Speed is therefore shaped by the writing, the tags and the pause stage, not by a global speed-up or slow-down.

## 4. How the script holds attention
- **Cold open in the first 15 s:** the ring of guards, father and son inside, then "They are gone." The ending is shown first and the question comes next.
- **The promise (s02):** "So let's check the legend... against the record." This sets up the channel's format and a reason to stay.
- **Open loops and callbacks:** "Remember that promise." (s04) pays off at the betrayal (s11) and the bond (s08/s15). "To the court, it looked like surrender." is answered by "It wasn't surrender. It was preparation." at s12.
- **A pattern interrupt every 30–60 s:** a question, a reversal or a quoted primary source.
- **Present tense for the climax (s13)** so the viewer is inside the night, then back to past tense for the evidence.
- **Short-sentence rhythm at peaks, longer flowing sentences in the context sections.**
- **Payoff and bridge:** "One night. A few baskets of sweets." Then a warm tease to the next episode (Saraighat).

## 5. Delivery tags (Eleven v3)
The tags are `[softly]`, `[whispers]`, `[curious]`, `[serious]`, `[tense]` and `[warmly]`.
- A tag sits at the start of a sentence and colours what follows until the next tag. Use one tag per 2–3 sentences at most; the episode averages about 1.5 per scene.
- Tags are **never spoken and never captioned**. Each scene's `performance` text carries the tags; its `narration` text is the same words without them and drives captions, alignment and shot timing. `studio validate` fails if the two differ by anything other than tags, so performance can't drift from the fact-checked wording.
- Sourced lines (quotes from letters) are read plainly, with no emotional tag on the quote itself.

What the tags can do depends on the voice. A tag pushes delivery only as far as the voice's range allows, so the audition passage deliberately includes `[whispers]`, `[softly]` and `[tense]`.

## 6. Settings
| Setting | Value | Why |
|---|---|---|
| Model | `eleven_v3` (confirmed in the official SDK 2.73.0; `studio el-check` confirms it on your account before any paid call) | The model that follows delivery tags. Never silently swapped. |
| Stability | 0.5 "Natural" by default; audition 0.0 "Creative" too | ElevenLabs' guidance: Creative is most expressive but can drift; Robust (1.0) largely ignores tags. |
| Output | `mp3_44100_128` by default; `mp3_44100_192` needs the Creator plan or above | Converted to 48 kHz PCM for the mix. |
| Language | `en` | Keeps number and date normalisation in English. |

## 7. Production steps and credit budget (10,000 credits per episode)
Each ElevenLabs account has 10,000 credits, so one episode has to fit inside 10,000, including every test and retake. The script is never shortened to save credits: a full take of episode 001 is 8,156 characters, about 8,156 credits. All the savings come from not paying for anything twice.

| Step | Command | Credits |
|---|---|---|
| Confirm account, model, plan and credits left | `studio el-check` | 0 |
| Shortlist voices by ear from free previews | `studio voices [--accent indian]` | 0 |
| Audition the **real opening scene (s01)** with the best 2 voices | `studio audition --voices id1,id2` | about 650 |
| Full narration. The winner's s01 audition take is reused, so only s02–s20 are paid for | `studio run` | about 7,830 |
| Reserve for re-voicing 2–3 scenes after listening (names, a misread tag) | `studio tts --scenes s07 --force` | about 1,500 |
| **Total** | | **about 8,500 planned, 10,000 cap** |

Credit safeguards in the pipeline:
- **Priced before it starts:** `tts` and `audition` add up the cost of everything they are about to voice. They refuse to start if it would pass `ELEVENLABS_CREDIT_CAP` (10,000) or your account's remaining credits, so a run can't stop with half an episode voiced.
- **Cached by exact text, voice and settings:** editing one scene re-voices only that scene, and re-running never re-buys audio that is already on disk.
- **No paid retries on timeouts:** a timed-out request may already have been charged. Only "busy" and "rate limit" replies (which generate nothing) are retried.
- **Measured, not guessed:** each call records the change in the account's credit counter in `reports/usage.json`.
- **No paid pronunciation test:** names are checked by ear in the full take, and only a scene with a problem is re-voiced (paid from the reserve).
- No speech-to-text or other paid checks; the QA is local (forced alignment, silence and clipping detection, listening).
- Credits are never bought and plans are never changed by the tool.

Check ElevenLabs' terms for what your plan allows (commercial or YouTube use, attribution, Voice Library voices over the API) before publishing.

## 8. Listening checklist before render
- [ ] No tag was read aloud (listen for the words "softly", "whispers" and so on).
- [ ] Names are consistent across scenes, especially Shivaji, Sambhaji, Jahanara, Hiroji Farzand, Saraighat and Borphukan.
- [ ] Every scene ends cleanly, with no clipped last word.
- [ ] s13 sounds like the climax: slowest and quietest, and still intelligible over the music.
- [ ] Sourced lines ("a letter from Agra reports…") sound neutral, not dramatised.

## 9. Episode 001: what actually happened (2026-10-19)
- **Plan limits found:** the free plan cannot use Voice Library voices through the API. ElevenLabs answered `402 paid_plan_required`, and that refusal cost nothing. The API key's "Voices: Read" permission also can't add library voices. So casting used ElevenLabs' built-in female voices: Lily, Alice, Matilda, Bella and Sarah.
- **Audition:** the same 134-character excerpt from s13 for each voice, 670 credits in total. **The owner chose Lily** (British, middle-aged, "velvety actress"), voice id `pFZP5JQG7iQjIQuC4Bku`, stability 0.5.
- **Full take:** 20 scenes, 8,164 credits, in one pass with no retakes so far.
  - The local speech-recognition check heard no tag words.
  - All 20 scenes force-aligned.
  - The ledger matches the account counter (8,834 / 10,000).
- **Pace:** Lily speaks at about 165 words per minute but pauses like a storyteller (147 s of pauses), so the programme is 11:12.
  - Trimming slack inside pauses (caps: 0.7 s at sentence ends, 0.85 s after "...", 0.95 s before beats, 0.35 s at commas, 0.22 s elsewhere) saved only about 7 s.
  - The owner heard 1.0×, 1.08× and 1.14× samples and **chose natural pace** over fitting 10 minutes. The episode's limit is therefore 690 s.
- **For future episodes on this budget:** plan about 1,200 words of script to land at 9:30–10:00 at Lily's natural pace. A full take of that length is about 7,100 credits, which leaves room for auditions and retakes.
