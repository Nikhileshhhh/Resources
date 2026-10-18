# Visual and voice bible

## Style
Flat, illustrated 2D/2.5D vector art drawn in code (`src/remotion/components`). It uses layered parallax planes, purposeful camera moves, readable silhouettes, controlled gradients and a vignette, with no photoreal elements. Every character comes from one parametric rig (`Figure.tsx`) with joints (shoulders, elbows, hips, knees), torso lean, head nod, brows, blinks and breathing. Reuse presets; never redraw a recurring character differently.

## Palette (tokens in `src/remotion/theme.ts`)
| Token | Hex | Use |
|---|---|---|
| saffron | `#e8892b` | Maratha identity, accents, the "fact" route on maps |
| vermilion | `#c8442a` | Maratha flag second colour, warnings, raid arrows |
| sandstone / dark / light | `#b5523b` / `#7e3527` / `#d07a5c` | Agra Fort, Mughal architecture |
| marble | `#efe6d2` | Audience halls, domes |
| gold | `#d8b25a` | Royal trim, quote attributions |
| mughalGreen | `#3f6b4f` | Mughal side in diagrams and maps |
| parchment | `#ead9b6` | Maps, letters, evidence cards |
| night | `#0d1626` | Night skies |

Convention: **saffron = Maratha, green = Mughal**. Legend routes are **dotted sepia**; documented routes are **solid saffron**.

## Typography
- Titles, slates and labels: **Cinzel** 600/700 (OFL).
- Body, quotes and captions: **Source Sans 3** 400/600/italic (OFL).
- Minimum on-screen sizes at 1080p are 36 px for sub-labels and 42 px for body. Slates sit top-left on a dark gradient. Quote cards are centred at y ≈ 650–820, clear of YouTube captions at the bottom. The last 20 s keep the left and right thirds clear for end-screen elements.

## Recurring characters (episode 1)
| Character | Preset | Identity |
|---|---|---|
| Shivaji | `shivaji` | Saffron pagadi with white plume, white angarkha, saffron sash, short beard, gold bracelet. Lean, short (per the 1666 eyewitness letter). |
| Sambhaji (9) | `sambhaji` | Child scale, pale-yellow jama, small saffron pagadi |
| Aurangzeb | `aurangzeb` / `aurangzeb_old` | White jama and turban, grey (later white) beard, prayer beads |
| Kumar Ram Singh | `ramsingh` | Crimson jama, gold Rajput turban, moustache |
| Mirza Raja Jai Singh | `jaisingh` | Teal jama, steel helmet, grey moustache |
| Fulad Khan | `fuladkhan` | Brown jama, red turban, full black beard |
| Jaswant Singh | `jaswant` | Maroon jama, white turban |
| Jahanara | silhouette only | Behind a jali screen (no face shown) |
| Guards | `guard`, `rajputguard` | Khaki or ochre, spears, torches at night |

Recurring locations: Agra Fort (red walls, cusped gate, marble domes, Yamuna in front), the guarded compound (elevated view with a ring of guards), the audience hall (marble arcade, raised throne), the Deccan hill forts with saffron flags, the evidence board, and the parchment map (Natural Earth coastline and rivers, no historical borders).

## Motion rules
- Movement direction: northbound/outbound moves left-to-right; southbound/homebound moves right-to-left.
- One idea per shot. Camera moves are slow push/pull/pan (no random shake). Crossfade 10 frames between shots.
- Violence is never depicted: sieges show smoke, threats are shown as silhouettes and documents.

## Voice
- Narrator: **gpt-4o-mini-tts, voice `cedar`** via AI Credits. An adult male voice with clear, conversational delivery. Chosen by A/B listening on 2026-10-18.
- AI Credits currently ignores the `instructions` (style prompt) field, so delivery is shaped by punctuation and sentence length.
- Pronunciations: `episodes/*/pronunciations.json`, which gives TTS respellings plus ARPAbet for the aligner. Test new names with `npm run studio -- pron-test --words "Name1,Name2"`.
- Disclosure: the on-screen line for the first 8 s and the description both say the narration is AI-generated.
- Fallback: local Kokoro-82M (`SPEECH_ENGINE=kokoro`, voice `bm_george`, Apache-2.0). It is free but flatter; disclose it the same way.

## Sound
Original procedural score: a tanpura-style drone, plucked-string motifs (Bhairav-flavoured for tension, Yaman-flavoured for warmth), pads and frame-drum pulses. Ambience (wind, crickets, rain, river, crowd) and effects are synthesized in `py/audio_synth.py`. Music ducks about 12 dB under speech. Masters target −15 LUFS integrated and ≤ −1.5 dBTP.
