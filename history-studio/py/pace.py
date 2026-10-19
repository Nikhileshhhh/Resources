"""Re-pace narration for storytelling without re-synthesizing it.

Usage: python -I py/pace.py <spec.json> [--dry|--run] [results.json]
spec: {"tempo": 0.92, "sentencePause": 0.8, "commaPause": 0.34, "beatPause": 1.15,
       "jobs": [{"id": "s01", "audio": in.wav, "text": "...", "words": [{"w","start","end"}...], "out": out.wav}]}

Pauses are lengthened only inside existing gaps between aligned words (never inside a word):
  • after sentence-ending punctuation -> at least sentencePause
  • after commas, semicolons, colons and dashes -> at least commaPause
  • before a short sentence (<= 4 words) -> at least beatPause (a dramatic beat)
Then the whole scene is slowed with ffmpeg's rubberband filter (pitch and formants preserved).
"""
import json
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

SR = 48000


def raw_tokens(text):
    """Same tokenisation as align.py, but keeping each token's trailing punctuation."""
    out = []
    for m in re.finditer(r"[^\s]+", text):
        raw = m.group(0)
        parts = re.split(r"([-–—])", raw)
        i = 0
        while i < len(parts):
            part = parts[i]
            dash = parts[i + 1] if i + 1 < len(parts) else ""
            if re.search(r"[A-Za-z0-9]", part):
                out.append(part + dash)
            i += 2
    return out


def sentence_lengths(tokens):
    """For each token index, the word count of the sentence that starts right after it (or 0)."""
    ends = [i for i, t in enumerate(tokens) if re.search(r"[.!?][\"”’)]*$", t)]
    nxt = {}
    for k, e in enumerate(ends):
        start = e + 1
        stop = ends[k + 1] if k + 1 < len(ends) else len(tokens) - 1
        nxt[e] = stop - start + 1
    return nxt


def pace(job, cfg, dry=False):
    x, sr = sf.read(job["audio"], dtype="float64")
    assert sr == SR
    words = job["words"]
    toks = raw_tokens(job["text"])
    if len(toks) != len(words):
        raise SystemExit(f"{job['id']}: {len(toks)} tokens vs {len(words)} aligned words")
    nxt_len = sentence_lengths(toks)
    pieces = []
    cursor = 0
    added = 0.0
    fade = int(0.012 * SR)
    for i in range(len(words) - 1):
        t = toks[i]
        gap_start, gap_end = words[i]["end"], words[i + 1]["start"]
        gap = max(0.0, gap_end - gap_start)
        target = 0.0
        if re.search(r"[.!?][\"”’)]*$", t):
            target = cfg["sentencePause"]
            if 0 < nxt_len.get(i, 99) <= 4:
                target = cfg["beatPause"]
        elif re.search(r"[,;:–—-][\"”’)]*$", t):
            target = cfg["commaPause"]
        extra = target * cfg.get("pauseScale", 1.0) - gap
        if extra <= 0.02:
            continue
        cut = int(((gap_start + gap_end) / 2) * SR)
        seg = x[cursor:cut].copy()
        if len(seg) > 2 * fade:
            seg[-fade:] *= np.linspace(1, 0, fade)
        pieces.append(seg)
        pieces.append(np.zeros(int(extra * SR)))
        nxt = x[cut:cut + fade].copy()
        x[cut:cut + fade] = nxt * np.linspace(0, 1, len(nxt))
        cursor = cut
        added += extra
    pieces.append(x[cursor:])
    if dry:
        return {"scene": job["id"], "before": round(len(x) / SR, 3), "pausesAdded": round(added, 3), "projected": round((len(x) / SR + added) / cfg["tempo"], 3)}
    y = np.concatenate(pieces)
    tmp = job["out"] + ".tmp.wav"
    sf.write(tmp, y, SR, subtype="PCM_16")
    # Tempo 1.0 means pauses only: skip the time-stretch so the voice stays untouched.
    af = ["-af", f"rubberband=tempo={cfg['tempo']}:pitchq=quality:formant=preserved:window=standard"] if abs(cfg["tempo"] - 1) > 1e-6 else []
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, *af, "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", job["out"]], check=True)
    subprocess.run(["rm", "-f", tmp], check=True)
    dur = sf.info(job["out"]).duration
    return {"scene": job["id"], "before": round(len(x) / SR, 3), "pausesAdded": round(added, 3), "after": round(dur, 3)}


def main():
    spec = json.load(open(sys.argv[1]))
    dry = len(sys.argv) > 2 and sys.argv[2] == "--dry"
    results = [pace(job, spec, dry) for job in spec["jobs"]]
    for r in results:
        print(json.dumps(r))
    if len(sys.argv) > 3:
        json.dump(results, open(sys.argv[3], "w"))


if __name__ == "__main__":
    main()
