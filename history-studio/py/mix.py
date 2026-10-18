"""Mix narration, music, ambience and effects with speech-driven ducking.

Usage: python -I py/mix.py <spec.json>
spec: {"duration": s, "placements": [{"file": abs.wav, "start": s}], "stems_dir": dir, "out": premix.wav,
       "levels_db": {"narration": 0, "music": -17, "music_ducked": -29, "ambience": -27, "ambience_ducked": -33, "sfx": -14}}
"""
import json
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000


def db(x):
    return 10 ** (x / 20)


def smooth_env(active, attack=0.08, release=0.6):
    """One-pole attack/release smoothing of a 0/1 activity signal (computed at 100 Hz, then upsampled)."""
    step = SR // 100
    a = active[::step].astype(float)
    out = np.zeros_like(a)
    ka = 1 - np.exp(-1 / (attack * 100))
    kr = 1 - np.exp(-1 / (release * 100))
    v = 0.0
    for i, x in enumerate(a):
        v += (x - v) * (ka if x > v else kr)
        out[i] = v
    return np.repeat(out, step)[: len(active)]


def main():
    spec = json.load(open(sys.argv[1]))
    n = int(spec["duration"] * SR)
    lv = spec["levels_db"]
    narr = np.zeros(n)
    for p in spec["placements"]:
        x, sr = sf.read(p["file"], dtype="float64")
        assert sr == SR, f"{p['file']} is {sr} Hz"
        if x.ndim > 1:
            x = x.mean(axis=1)
        i = int(p["start"] * SR)
        j = min(n, i + len(x))
        narr[i:j] += x[: j - i]
    # gentle high-pass and de-mud on the voice
    narr = sosfilt(butter(2, 70, "high", fs=SR, output="sos"), narr)
    # speech activity from a 20 ms RMS envelope
    win = int(0.02 * SR)
    rms = np.sqrt(np.convolve(narr ** 2, np.ones(win) / win, mode="same"))
    active = rms > 0.01
    duck = smooth_env(active)
    stems = {}
    for name in ("music", "ambience", "sfx"):
        x, sr = sf.read(f"{spec['stems_dir']}/{name}.wav", dtype="float64")
        x = x[:n] if len(x) >= n else np.pad(x, ((0, n - len(x)), (0, 0)))
        stems[name] = x
    music_gain = db(lv["music"]) * (1 - duck) + db(lv["music_ducked"]) * duck
    amb_gain = db(lv["ambience"]) * (1 - duck) + db(lv["ambience_ducked"]) * duck
    mix = np.stack([narr, narr], axis=1) * db(lv["narration"])
    mix += stems["music"] * music_gain[:, None]
    mix += stems["ambience"] * amb_gain[:, None]
    mix += stems["sfx"] * db(lv["sfx"])
    peak = np.max(np.abs(mix))
    if peak > 0.98:
        mix *= 0.98 / peak
    sf.write(spec["out"], mix.astype(np.float32), SR, subtype="FLOAT")
    sf.write(spec["out"].replace("premix", "narration_only"), np.stack([narr, narr], axis=1).astype(np.float32), SR, subtype="FLOAT")
    print(json.dumps({"peak_before_safety": round(float(peak), 3), "speech_fraction": round(float(active.mean()), 3)}))


if __name__ == "__main__":
    main()
