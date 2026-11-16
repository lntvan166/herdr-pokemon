#!/usr/bin/env python3
"""Builds the battle sounds in mods/pokemon-herd/sfx/ (short MP3s, synthesized here: nothing
sampled or borrowed). Needs numpy and ffmpeg.

    python3 scripts/make-sfx.py
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
PEAK = 0.28  # quiet: a strip's sounds sit under your work (about -11 dB from full)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mods", "pokemon-herd", "sfx")


def env(n, a=0.004, r=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a)
    return e * (np.exp(-t / r) if r else 1)


def tone(f0, f1, dur, shape="sine", r=None, vol=1.0):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    ph = np.cumsum(2 * np.pi * f / SR)
    w = {"sine": np.sin(ph), "square": np.sign(np.sin(ph)) * 0.5, "saw": 2 * (ph / (2 * np.pi) % 1) - 1}[shape]
    return w * env(n, r=r or dur / 3) * vol


def lowpass(x, cut):
    """A moving one-pole low-pass (cut: Hz, a number or one per sample)."""
    cut = np.broadcast_to(np.asarray(cut, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def noise(dur, seed=1):
    return np.random.default_rng(seed).uniform(-1, 1, int(dur * SR))


def add(*xs):
    out = np.zeros(max(len(x) for x in xs))
    for x in xs:
        out[: len(x)] += x
    return out


def shaped(x, attack=0.004, release=None):
    return x * env(len(x), attack, release)


def notes(seq, step, shape="square", vol=0.3, r=0.08):
    out = np.zeros(int(step * len(seq) * SR + SR * 0.3))
    for i, f in enumerate(seq):
        if f:
            s = tone(f, f, step + 0.25, shape, r=r, vol=vol)
            k = int(i * step * SR)
            out[k:k + len(s)] += s[: len(out) - k]
    return out


def sweep_noise(dur, f0, f1, vol, seed=2):
    x = lowpass(noise(dur, seed), np.linspace(f0, f1, int(dur * SR)))
    e = np.sin(np.linspace(0, np.pi, len(x))) ** 1.5
    return x / max(1e-6, np.abs(x).max()) * e * vol


SOUNDS = {
    # Gathering power: a rising hum with a shimmer on top.
    "charge": lambda: add(tone(180, 720, 0.36, "saw", r=1, vol=0.10) * np.linspace(0.2, 1, int(0.36 * SR)),
                          sweep_noise(0.36, 400, 5000, 0.12)),
    # A shot leaving: a whoosh.
    "whoosh": lambda: sweep_noise(0.24, 300, 4200, 0.45),
    # A beam: a bright zap.
    "zap": lambda: add(tone(1800, 600, 0.22, "square", r=0.12, vol=0.16), shaped(lowpass(noise(0.22, 3), 6000), 0.002, 0.06) * 0.25),
    # A blow landing.
    "hit": lambda: add(tone(170, 50, 0.2, r=0.07, vol=0.85), shaped(noise(0.07, 4), 0.001, 0.02) * 0.45),
    # A big one: deeper, longer, crunchy.
    "bighit": lambda: np.tanh(2.3 * add(tone(140, 32, 0.5, r=0.16, vol=1), shaped(lowpass(noise(0.32, 5), 2500), 0.001, 0.08) * 0.9)) * 0.85,
    # Fainting: a falling tone.
    "faint": lambda: tone(520, 90, 0.6, "square", r=0.35, vol=0.18),
    # A ball thrown, landing round it, each shake, caught, broken out.
    "throw": lambda: tone(500, 1400, 0.3, r=0.4, vol=0.22),
    "absorb": lambda: add(tone(1200, 300, 0.22, "square", r=0.18, vol=0.14), shaped(noise(0.08, 6), 0.001, 0.03) * 0.25),
    "shake": lambda: notes([1400, 0, 1100], 0.035, vol=0.22, r=0.02),
    "gotcha": lambda: notes([1047, 1319, 1568, 2093, 0, 1568, 2093], 0.085, vol=0.26, r=0.12),
    "break": lambda: add(tone(300, 900, 0.18, "square", r=0.1, vol=0.16), shaped(noise(0.12, 7), 0.001, 0.05) * 0.3),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            x = make()
            x = x / max(1e-6, np.abs(x).max()) * PEAK
            pcm = (x * 32767).astype(np.int16)
            wav = os.path.join(tmp, f"{name}.wav")
            with wave.open(wav, "wb") as f:
                f.setnchannels(1)
                f.setsampwidth(2)
                f.setframerate(SR)
                f.writeframes(pcm.tobytes())
            mp3 = os.path.join(OUT, f"{name}.mp3")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ac", "1", "-b:a", "64k", mp3], check=True)
            print(f"{os.path.relpath(mp3)}: {os.path.getsize(mp3)} bytes")


if __name__ == "__main__":
    main()
