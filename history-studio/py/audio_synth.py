"""Original score, ambience and sound effects synthesized from code (no samples, no third-party audio).

Usage: python -I py/audio_synth.py <spec.json> <out_dir>
spec.json: {"sr": 48000, "duration": 534.8, "fps": 30,
            "scenes": [{"id", "start", "end", "music", "ambience"}],
            "sfx": [{"t": 12.3, "cue": "stamp"}]}
Writes music.wav, ambience.wav, sfx.wav (48 kHz stereo, float) into out_dir.
Everything here is generated procedurally, so the episode owns these stems outright.
"""
import json
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
RNG = np.random.default_rng(1666)
D2 = 73.42  # tonic: D (Sa)


def hz(semi, base=D2):
    return base * 2 ** (semi / 12)


def env_adsr(n, a=0.01, d=0.2, s=0.6, r=0.5):
    t = np.arange(n) / SR
    e = np.ones(n)
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    e[:a_n] = np.linspace(0, 1, max(a_n, 1))[:a_n]
    e[a_n:a_n + d_n] = np.linspace(1, s, max(d_n, 1))[: len(e[a_n:a_n + d_n])]
    e[a_n + d_n:] = s
    if r_n > 0:
        e[-r_n:] *= np.linspace(1, 0, r_n)
    return e


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def pluck(freq, dur=2.5, bright=0.6, buzz=0.0):
    """Plucked string via decaying harmonics (vectorised); buzz adds tanpura-like jawari shimmer."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 14):
        amp = (bright ** (k - 1)) / k ** 0.6
        dec = 1.2 + k * 0.9
        det = 1 + (RNG.random() - 0.5) * 0.0015
        wob = 1 + buzz * 0.004 * np.sin(2 * np.pi * (0.7 + k * 0.13) * t)
        out += amp * np.exp(-dec * t / dur * 2.2) * np.sin(2 * np.pi * freq * k * det * wob * t + RNG.random() * 6)
    out *= np.minimum(1, t / 0.004)
    return out / 4


def pad(freqs, n, warmth=1800, trem=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ph = RNG.random() * 6
            saw = 2 * ((f * 2 ** (det / 12) * t + ph) % 1) - 1
            out += saw
    out = lp(out, warmth) / (len(freqs) * 3)
    if trem:
        out *= 1 - trem * 0.5 * (1 + np.sin(2 * np.pi * 0.25 * t))
    return out


def drum(kind="low"):
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    if kind == "low":  # dhol-like low hit: pitch-swept sine + thump noise
        f = 55 + 70 * np.exp(-t * 18)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
        x += lp(RNG.standard_normal(n), 400) * np.exp(-t * 30) * 0.4
    elif kind == "high":
        f = 180 + 120 * np.exp(-t * 40)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.6
        x += bp(RNG.standard_normal(n), 1500, 5000) * np.exp(-t * 50) * 0.3
    else:  # wood tick
        x = bp(RNG.standard_normal(n), 1800, 4200) * np.exp(-t * 90) * 0.8
    return x


def place(buf, x, start):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


# Scale degrees in semitones from Sa (Bhairav-flavoured for tension, Yaman-flavoured for bright cues)
DARK = [0, 1, 4, 5, 7, 8, 11, 12]
BRIGHT = [0, 2, 4, 6, 7, 9, 11, 12]

CUES = {
    # name: (drone level, pad chord semitones or None, pulse bpm or 0, pulse kind, pluck density per s, scale, pad warmth)
    "tension_low": (0.5, [0, 7, 13], 0, None, 0.25, DARK, 900),
    "title_theme": (0.6, None, 0, None, 1.2, DARK, 0),
    "deccan_theme": (0.5, [0, 7, 16], 0, None, 0.9, BRIGHT, 1600),
    "journey": (0.45, [0, 7], 92, "high", 0.8, BRIGHT, 1300),
    "court": (0.35, [0, 4, 7, 11], 0, None, 0.35, BRIGHT, 2200),
    "tension_rise": (0.5, [0, 1, 7], 70, "low", 0.2, DARK, 1100),
    "dark_pulse": (0.5, [0, 8, 12], 60, "low", 0.15, DARK, 800),
    "melancholy": (0.45, [0, 8, 15], 0, None, 0.35, DARK, 1000),
    "plan_pulse": (0.4, [0, 7], 104, "tick", 0.3, DARK, 900),
    "escape_build": (0.5, [0, 1, 7], 112, "low", 0.4, DARK, 1400),
    "suspense_hold": (0.55, [0, 7, 13], 0, None, 0.1, DARK, 700),
    "chase": (0.45, [0, 7], 132, "low", 0.6, DARK, 1500),
    "investigation": (0.35, [0, 8], 0, None, 0.45, DARK, 900),
    "journey_dark": (0.5, [0, 7, 12], 76, "low", 0.35, DARK, 900),
    "tender": (0.4, [0, 4, 7], 0, None, 0.5, BRIGHT, 1600),
    "triumph_restrained": (0.45, [0, 4, 7, 12], 84, "low", 0.7, BRIGHT, 2000),
    "outro": (0.5, [0, 7, 12], 0, None, 0.6, DARK, 1100),
}


def render_cue(name, dur, seed):
    global RNG
    RNG = np.random.default_rng(seed)
    n = int(dur * SR)
    drone_lv, chord, bpm, pkind, dens, scale, warmth = CUES.get(name, CUES["tension_low"])
    out = np.zeros(n)
    # tanpura drone: Pa-Sa-Sa-Sa(low) cycle
    cyc = [hz(7), hz(12), hz(12), hz(0)]
    t = 0.0
    k = 0
    while t < dur:
        place(out, pluck(cyc[k % 4], dur=3.6, bright=0.75, buzz=1.0) * drone_lv, t)
        t += 0.62 if k % 4 != 3 else 1.1
        k += 1
    if chord:
        out += pad([hz(s, D2 * 2) for s in chord], n, warmth=warmth) * 0.55
    if bpm:
        beat = 60 / bpm
        t = 0.0
        i = 0
        while t < dur:
            accel = 1.0
            if name in ("escape_build", "tension_rise"):
                accel = 1 + 0.6 * (t / dur)
            hit = drum(pkind) * (0.55 if i % 4 == 0 else 0.32)
            place(out, hit, t)
            t += beat / accel
            i += 1
    if dens:
        t = 0.6
        while t < dur - 1:
            deg = scale[int(RNG.integers(0, len(scale)))]
            octv = 2 if RNG.random() < 0.7 else 4
            place(out, pluck(hz(deg, D2 * octv), dur=2.2, bright=0.55) * 0.42, t)
            t += RNG.exponential(1 / dens) + 0.25
    if name == "escape_build":
        tt = np.arange(n) / SR
        riser = bp(RNG.standard_normal(n), 300, 6000) * (tt / dur) ** 3 * 0.25
        out += riser
    return out


def ambience(name, n, seed):
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    if name in ("wind_hills", "night_wind", "hooves"):
        g = 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + 1) * np.sin(2 * np.pi * 0.023 * t)
        out += lp(np.cumsum(noise) * 0.02, 600) * g * 0.6
    if name in ("night_city", "evening_courtyard", "palace_night", "night_wind", "night_rain"):
        # crickets: amplitude-modulated high tones in bursts
        for f, rate in ((4300, 30), (5100, 24)):
            chirp = np.sin(2 * np.pi * f * t) * (np.sin(2 * np.pi * rate * t) > 0.6) * (np.sin(2 * np.pi * 0.5 * t + rng.random() * 6) > 0)
            out += lp(chirp, 7000) * 0.05
        out += lp(noise, 180) * 0.06  # low distant hum
    if name in ("night_rain", "monsoon_light"):
        out += hp(lp(noise, 6000), 600) * (0.18 if name == "night_rain" else 0.09)
        drops = (rng.random(n) > 0.9993) * rng.random(n)
        out += bp(drops, 1200, 5000) * 1.5
    if name == "court_murmur":
        babble = np.zeros(n)
        for v in range(6):
            f0 = 110 + v * 23
            syll = (np.sin(2 * np.pi * (3 + v * 0.4) * t + v) > 0.2).astype(float)
            babble += bp(rng.standard_normal(n), f0 * 3, f0 * 9) * lp(syll, 12)
        out += babble * 0.06 + lp(noise, 300) * 0.03
    if name in ("road_day", "morning_city", "river_dawn"):
        out += lp(np.cumsum(noise) * 0.01, 500) * 0.3
        k = 0.0
        while k < n / SR:  # birds: short frequency sweeps
            dur = 0.12 + rng.random() * 0.2
            m = int(dur * SR)
            tt = np.arange(m) / SR
            f = 2600 + 1600 * rng.random() + 900 * np.sin(2 * np.pi * (8 + rng.random() * 8) * tt)
            place(out, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / dur) * 0.05, k)
            k += rng.exponential(1.6)
    if name in ("river_dawn", "river_dusk"):
        out += bp(noise, 200, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t)) * 0.08
    if name == "hooves":
        k = 0.0
        while k < n / SR:
            for off in (0, 0.09, 0.2, 0.28):
                place(out, drum("tick") * 0.25, k + off)
            k += 0.55
    if name == "archive_room":
        out += lp(noise, 250) * 0.05
    return out


def sfx(cue):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    noise = RNG.standard_normal(n)
    if cue == "whoosh":
        e = np.sin(np.pi * np.clip(t / 0.9, 0, 1)) ** 2
        return bp(noise, 300, 3000) * e * 0.35
    if cue == "stamp":
        return (drum("low") * 1.0)[:n] if len(drum("low")) >= n else np.pad(drum("low"), (0, n - len(drum("low"))))
    if cue == "paper":
        e = (np.sin(2 * np.pi * 9 * t) > 0.3) * np.exp(-t * 2.5)
        return hp(noise, 2500) * lp(e.astype(float), 40) * 0.2
    if cue == "coins":
        out = np.zeros(n)
        for i in range(7):
            m = int(0.4 * SR)
            tt = np.arange(m) / SR
            ping = sum(np.sin(2 * np.pi * f * tt) for f in (3200 + i * 140, 5100 + i * 90)) * np.exp(-tt * 18) * 0.12
            place(out, ping, 0.08 + i * 0.11)
        return out
    if cue == "boom":
        f = 40 + 30 * np.exp(-t * 4)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8) * 0.8
    if cue == "crack":
        return hp(noise, 1500) * np.exp(-t * 25) * 0.5
    if cue == "tap":
        return drum("tick")[:n] * 0.4 if len(drum("tick")) >= n else np.pad(drum("tick"), (0, n - len(drum("tick")))) * 0.4
    return np.zeros(n)


def reverb(x, secs=1.8, seed=7):
    rng = np.random.default_rng(seed)
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 3.2)
    ir = lp(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    return fftconvolve(x, ir)[: len(x)]


def to_stereo(x, seedL=11, seedR=13, wet=0.28):
    return np.stack([x * (1 - wet) + reverb(x, seed=seedL) * wet, x * (1 - wet) + reverb(x, seed=seedR) * wet], axis=1)


def main():
    spec = json.load(open(sys.argv[1]))
    out_dir = sys.argv[2]
    total = int(spec["duration"] * SR) + SR
    music = np.zeros(total)
    amb = np.zeros(total)
    fx = np.zeros(total)
    xf = 1.6
    # merge consecutive scenes that share a cue so the music doesn't restart every scene
    runs = []
    for s in spec["scenes"]:
        if runs and runs[-1]["music"] == s["music"]:
            runs[-1]["end"] = s["end"]
        else:
            runs.append({"music": s["music"], "start": s["start"], "end": s["end"]})
    for i, r in enumerate(runs):
        if not r["music"]:
            continue
        a = max(0.0, r["start"] - xf / 2)
        b = r["end"] + xf / 2
        x = render_cue(r["music"], b - a, seed=100 + i)
        n = len(x)
        fade = int(xf * SR)
        x[:fade] *= np.linspace(0, 1, fade) if i > 0 else np.ones(fade)
        x[-fade:] *= np.linspace(1, 0, fade)
        place(music, x, a)
    for i, s in enumerate(spec["scenes"]):
        if not s.get("ambience"):
            continue
        a = max(0.0, s["start"] - 1)
        n = int((s["end"] + 1 - a) * SR)
        x = ambience(s["ambience"], n, seed=500 + i)
        fade = int(1.0 * SR)
        x[:fade] *= np.linspace(0, 1, fade)
        x[-fade:] *= np.linspace(1, 0, fade)
        place(amb, x, a)
    for e in spec.get("sfx", []):
        place(fx, sfx(e["cue"]), e["t"])
    # final fade-out over the last 4 s of the programme
    end = int(spec["duration"] * SR)
    fo = int(4 * SR)
    for buf in (music, amb):
        buf[end - fo:end] *= np.linspace(1, 0, fo)
        buf[end:] = 0
    music = music / (np.max(np.abs(music)) + 1e-9) * 0.5
    sf.write(f"{out_dir}/music.wav", to_stereo(music)[:end].astype(np.float32), SR, subtype="FLOAT")
    sf.write(f"{out_dir}/ambience.wav", np.stack([amb, np.roll(amb, 480)], axis=1)[:end].astype(np.float32) * 0.8, SR, subtype="FLOAT")
    sf.write(f"{out_dir}/sfx.wav", to_stereo(fx, wet=0.2)[:end].astype(np.float32), SR, subtype="FLOAT")
    print(json.dumps({"music_runs": len(runs), "seconds": spec["duration"]}))


if __name__ == "__main__":
    main()
