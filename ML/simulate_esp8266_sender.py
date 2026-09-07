"""
SIH26025 — Simulated ESP8266 Sender (for testing pi_server.py)
====================================================================
Posts realistic physics-based JSON readings to pi_server.py's /ingest
endpoint, exactly mimicking what a real ESP8266 node would send over
WiFi -- so you can test and demo the full pipeline before your actual
hardware is wired up or reachable.

Before running:
    pip install requests numpy

Run (against a server on this same machine):
    python3 simulate_esp8266_sender.py --url http://localhost:5000/ingest

Run (against your real Pi, from your laptop, same WiFi):
    python3 simulate_esp8266_sender.py --url http://<pi-ip>:5000/ingest --interval 1.0
"""

import argparse
import time
import numpy as np
import requests


def knothe(t, s_max, c):
    return s_max * (1 - np.exp(-c * t))


def infinite_physics_stream(rng, device_id):
    event = None
    idx_in_event = 0
    ticks_until_next_event = int(rng.integers(10, 60))

    while True:
        if event is None:
            if ticks_until_next_event <= 0:
                depth = rng.uniform(80, 200)
                width = rng.uniform(80, 220)
                height = rng.uniform(2.0, 4.0)
                ratio = width / depth
                s_max = max(height * 0.65 * (((1 + ratio) / 0.75) - 8), 0.05)
                severity = rng.choice(["watch", "warning", "critical"], p=[0.5, 0.3, 0.2])
                c = {"watch": rng.uniform(0.5, 2.0), "warning": rng.uniform(2.0, 5.0),
                     "critical": rng.uniform(5.0, 12.0)}[severity]
                duration = int(rng.integers(40, 150))
                t = np.linspace(0, 1, duration)
                subsidence = knothe(t, s_max, c)
                rate = np.gradient(subsidence, t)
                tilt_curve = np.degrees(np.arctan(np.gradient(subsidence))) * 20
                event = dict(duration=duration, subsidence=subsidence, rate=rate,
                             tilt_curve=tilt_curve, s_max=s_max, depth=depth)
                idx_in_event = 0
            else:
                ticks_until_next_event -= 1
                yield {
                    "device": device_id,
                    "tilt_deg": float(rng.normal(0, 0.03)),
                    "accel_rms": float(abs(rng.normal(0.02, 0.005))),
                    "load_delta_kg": float(rng.normal(0, 0.5)),
                    "distance_cm": 50.0,
                    "moisture": float(np.clip(rng.normal(0.15, 0.05), 0, 1)),
                    "strain_mm_per_m": float(rng.normal(0, 0.01)),
                    "curvature": float(rng.normal(0, 0.001)),
                    "ir_detected": False,
                    "timestamp_ms": int(time.time() * 1000),
                }
                continue

        sub, rate, tilt_curve, s_max, depth = (event["subsidence"], event["rate"],
                                                 event["tilt_curve"], event["s_max"], event["depth"])
        i = idx_in_event
        reading = {
            "device": device_id,
            "tilt_deg": float(tilt_curve[i] + rng.normal(0, 0.03)),
            "accel_rms": float(max(0, 0.4 * abs(rate[i]) / (s_max + 1e-6) + rng.normal(0, 0.005))),
            "load_delta_kg": float(35 * sub[i] / s_max + rng.normal(0, 0.5)),
            "distance_cm": float(50 - (sub[i] * 1000 * 0.4) / 10),
            "moisture": float(np.clip(0.15 + 0.3 * sub[i] / s_max, 0, 1)),
            "strain_mm_per_m": float(rate[i] / (depth * 0.8) * 1e3),
            "curvature": float(np.gradient(rate, np.linspace(0, 1, event["duration"]))[i] / (depth * 0.8) ** 2),
            "ir_detected": bool(sub[i] * 1000 * 0.4 > 8),
            "timestamp_ms": int(time.time() * 1000),
        }
        idx_in_event += 1
        if idx_in_event >= event["duration"]:
            event = None
            ticks_until_next_event = int(rng.integers(10, 60))
        yield reading


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:5000/ingest")
    parser.add_argument("--device", default="esp8266_sim01")
    parser.add_argument("--interval", type=float, default=0.5)
    parser.add_argument("--n", type=int, default=0, help="0 = run forever")
    args = parser.parse_args()

    rng = np.random.default_rng()
    gen = infinite_physics_stream(rng, args.device)

    sent = 0
    try:
        for reading in gen:
            try:
                resp = requests.post(args.url, json=reading, timeout=5)
                result = resp.json()
                print(f"sent {sent:5d}  ->  {result.get('risk', result)}")
            except requests.exceptions.RequestException as e:
                print(f"POST failed: {e}")
            sent += 1
            if args.n and sent >= args.n:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print(f"\nStopped after sending {sent} readings.")


if __name__ == "__main__":
    main()
