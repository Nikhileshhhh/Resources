"""Local narration with Kokoro-82M (Apache-2.0) via kokoro-onnx.

Usage: python -I py/tts_kokoro.py <jobs.json>
jobs.json: {"model_dir": "...", "jobs": [{"text": "...", "voice": "bm_george", "speed": 1.0, "out": "x.wav"}]}
Writes 24 kHz mono 16-bit WAV per job. Skips jobs whose output already exists (cache-friendly).
"""
import json
import os
import sys

import soundfile as sf
from kokoro_onnx import Kokoro


def main() -> None:
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    model_dir = spec["model_dir"]
    kokoro = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
    for job in spec["jobs"]:
        if os.path.exists(job["out"]) and not job.get("force"):
            print(json.dumps({"out": job["out"], "cached": True}))
            continue
        samples, sr = kokoro.create(job["text"], voice=job["voice"], speed=float(job.get("speed", 1.0)), lang=job.get("lang", "en-us"))
        os.makedirs(os.path.dirname(job["out"]) or ".", exist_ok=True)
        tmp = job["out"] + ".tmp.wav"
        sf.write(tmp, samples, sr, subtype="PCM_16")
        os.replace(tmp, job["out"])
        print(json.dumps({"out": job["out"], "seconds": round(len(samples) / sr, 3), "sample_rate": sr}))


if __name__ == "__main__":
    main()
