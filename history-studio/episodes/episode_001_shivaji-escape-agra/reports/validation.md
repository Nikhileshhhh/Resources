# Validation report — episode_001_shivaji_escape_from_agra.mp4

Measured 2026-10-18T12:49:48.186Z on the delivered file. Overall: **PASS**

| Check | Result | Measured | Expected |
|---|---|---|---|
| Container | ✅ | mov,mp4,m4a,3gp,3g2,mj2 | mp4 |
| Video codec | ✅ | h264 High | h264 |
| Resolution | ✅ | 1920x1080 | 1920x1080 |
| Pixel format | ✅ | yuv420p | yuv420p |
| Frame rate | ✅ | 30/1 (avg 30/1) | 30/1 constant |
| Scan | ✅ | progressive | progressive |
| Colour | ✅ | bt709/bt709/bt709 | bt709 (SDR) |
| Audio codec | ✅ | aac LC | AAC-LC |
| Audio sample rate | ✅ | 48000 | 48000 Hz |
| Audio channels | ✅ | 2 | 2 (stereo) |
| Video bitrate | ✅ | 3.43 Mb/s | info (CRF 18) |
| Duration | ✅ | 589.83 s (09:49) | 480–600 s |
| Duration matches timeline | ✅ | 589.83 vs 589.83 | ±0.2 s |
| File size | ✅ | 274.4 MB | meaningful size |
| Fast start (moov before mdat) | ✅ | yes | yes |
| Full decode errors | ✅ | none | none |
| Black segments ≥0.5 s | ✅ | none | none |
| Frozen video ≥4 s (outside end screen) | ✅ | none | none |
| Audio silence ≥2.5 s below −50 dB | ✅ | none | none |
| Sample peak (no clipping) | ✅ | -1.398647 dBFS | < −0.5 dBFS |
| Integrated loudness | ✅ | -15.2 LUFS | −16 to −14 LUFS (production target) |
| True peak | ✅ | -1.4 dBTP | ≤ −1 dBTP |



## Review limits and remaining human checks
- **Narration completeness:** the final-mix transcription check was **skipped** because the AI Credits wallet returned HTTP 402 (empty) and paid calls stopped. Completeness rests on three things: the whisper-1 transcription of every scene take earlier (all endings confirmed after three scenes were regenerated), PocketSphinx forced alignment of every scripted word on the paced audio (20 of 20 scenes), and the silence detector above.
- **Visual review:** one representative frame per shot was extracted from this MP4 (`reports/frames/*.jpg`) and inspected, plus a 1 fps strip of the preview. Not every frame was watched.
- **Not verifiable by me (requires your ears and eyes):** whether the voice sounds natural, name pronunciation, music balance under speech, and overall pacing. Please watch the full video once with headphones before publishing.
- **Pacing:** narration was slowed 8% (rubberband, pitch-preserving) with story pauses (pause scale 0.87, auto-fitted to stay under 590 s).
