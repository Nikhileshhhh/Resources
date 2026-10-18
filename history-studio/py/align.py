"""Forced alignment of known narration text to audio with PocketSphinx 5 (BSD; bundled US-English model).

Usage: python -I py/align.py <jobs.json> <out.json>
jobs.json: {"lexicon": {"word": "PH ON ES"}, "jobs": [{"id": "s01", "audio": "x.wav", "text": "..."}]}
Output: {"s01": {"words": [{"w": "August", "start": 0.12, "end": 0.55}, ...], "method": "pocketsphinx-align", "coverage": 1.0}}

Words are returned in the original display spelling. If the aligner fails on a scene, sentence boundaries are
measured from detected pauses in the audio instead (method "pause-split"), and words inside each sentence are
spread proportionally to their length: that fallback is flagged so captions can be reviewed.
"""
import json
import re
import subprocess
import sys

import numpy as np
from pocketsphinx import Decoder

TOKEN = re.compile(r"[A-Za-z0-9]+(?:['’][A-Za-z]+)?")


def load_pcm16k(path: str) -> bytes:
    return subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ar", "16000", "-ac", "1", "-f", "s16le", "-"], check=True, capture_output=True).stdout


def tokens(text: str):
    """Display tokens and the dictionary words used to align them (hyphens split, possessives handled)."""
    out = []
    for m in re.finditer(r"[^\s]+", text):
        raw = m.group(0)
        parts = re.split(r"[-–—]", raw)
        for part in parts:
            core = TOKEN.search(part)
            if not core:
                continue
            out.append({"display": part.strip(".,;:!?\"“”()"), "key": core.group(0).lower().replace("’", "'")})
    return [t for t in out if t["display"]]


NUM = {"1666": "sixteen sixty six"}


def make_decoder(lexicon: dict):
    d = Decoder(samprate=16000, bestpath=False, loglevel="ERROR")
    for w, ph in lexicon.items():
        d.add_word(w, ph, update=True)
    return d


def dict_key(d: Decoder, key: str, lexicon: dict) -> str:
    if d.lookup_word(key):
        return key
    if key.endswith("'s"):
        base = key[:-2]
        ph = lexicon.get(base) or d.lookup_word(base)
        if ph:
            d.add_word(key, ph + (" S" if ph.split()[-1] in ("T", "K", "P", "F", "TH") else " Z"), update=True)
            return key
    raise KeyError(key)


def align_one(d: Decoder, pcm: bytes, toks, lexicon: dict):
    keys = [dict_key(d, t["key"], lexicon) for t in toks]
    d.set_align_text(" ".join(keys))
    d.start_utt()
    d.process_raw(pcm, full_utt=True)
    d.end_utt()
    d.set_alignment()
    d.start_utt()
    d.process_raw(pcm, full_utt=True)
    d.end_utt()
    segs = [s for s in d.seg() if s.word not in ("<s>", "</s>", "<sil>", "(NULL)") and not s.word.startswith("[")]
    if len(segs) != len(toks):
        raise RuntimeError(f"aligner returned {len(segs)} words for {len(toks)} tokens")
    fr = 100.0  # PocketSphinx frames are 10 ms
    return [{"w": t["display"], "start": round(s.start_frame / fr, 3), "end": round((s.end_frame + 1) / fr, 3)} for t, s in zip(toks, segs)]


def pause_split(pcm: bytes, text: str):
    """Fallback: find sentence pauses by energy, distribute words within each sentence by character length."""
    a = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
    win = 160
    e = np.sqrt(np.convolve(a ** 2, np.ones(win) / win, mode="same"))[::win]
    voiced = e > max(0.01, np.percentile(e, 60) * 0.15)
    dur = len(a) / 16000
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]
    # candidate pauses: runs of >=180 ms unvoiced
    pauses, run = [], 0
    for i, v in enumerate(voiced):
        run = 0 if v else run + 1
        if run == 18:
            pauses.append((i - 9) / 100)
    edges = [0.0] + sorted(pauses, key=lambda p: p)[: max(0, len(sentences) - 1)] + [dur]
    edges = sorted(edges)
    words = []
    for si, s in enumerate(sentences):
        t0, t1 = edges[min(si, len(edges) - 2)], edges[min(si + 1, len(edges) - 1)]
        toks = tokens(s)
        total = sum(len(t["display"]) for t in toks) or 1
        cur = t0
        for t in toks:
            span = (t1 - t0) * len(t["display"]) / total
            words.append({"w": t["display"], "start": round(cur, 3), "end": round(cur + span, 3)})
            cur += span
    return words


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    lexicon = {k.lower(): v for k, v in spec.get("lexicon", {}).items()}
    out = {}
    for job in spec["jobs"]:
        pcm = load_pcm16k(job["audio"])
        toks = tokens(job["text"])
        try:
            d = make_decoder(lexicon)
            words = align_one(d, pcm, toks, lexicon)
            method = "pocketsphinx-align"
        except Exception as exc:  # noqa: BLE001
            print(json.dumps({"scene": job["id"], "fallback": str(exc)}), file=sys.stderr)
            words = pause_split(pcm, job["text"])
            method = "pause-split"
        out[job["id"]] = {"words": words, "method": method, "audioSeconds": round(len(pcm) / 32000, 3)}
        print(json.dumps({"scene": job["id"], "method": method, "words": len(words)}))
    json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
