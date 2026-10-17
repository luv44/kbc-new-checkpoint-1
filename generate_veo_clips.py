#!/usr/bin/env python3
"""
Google Veo 3.1 Fast - Scene Video Generation & Download Pipeline
This script runs on any local machine or cloud environment with Python 3 and Google Cloud / Gemini API access.
It:
1. Submits the 4 action-oriented prompts to Google Veo 3.1.
2. Polls the operations until video synthesis is complete.
3. Automatically downloads the raw full-motion MP4 clips to public/videos/scene1_veo.mp4, etc.
4. Invokes assemble_veo_reel.py to produce the finished master reel with spoken Hindi voiceover.

Usage:
  export GEMINI_API_KEY="your-google-api-key"
  python3 generate_veo_clips.py
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error

API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
OUT_DIR = os.path.join(os.path.dirname(__file__), "public", "videos")
os.makedirs(OUT_DIR, exist_ok=True)

# Motion prompts specifically engineered for Google Veo 3.1 generative physical movement:
SCENES = [
    {
        "id": "scene1",
        "output_file": os.path.join(OUT_DIR, "scene1_veo.mp4"),
        "duration_seconds": 8,
        "prompt": (
            "Cinematic 3D animation. A small nomadic group of Palaeolithic early humans actively walking "
            "across rugged prehistoric terrain with visible walking stride, arm swing, and forward locomotion. "
            "One hunter in animal skins carries a chipped flint stone axe and looks around alertly. "
            "A child and woman forage beside wild bushes, picking plants with hands. "
            "Gentle wind blowing through trees and tall ferns. Camera steadily tracks alongside the walking group. "
            "Clean floating 3D badge at top corner: 'PALAEOLITHIC LIFE' and 'MOVE FOR FOOD'. "
            "Vibrant warm daylight, photorealistic animation, fluid human motion, 1080p Full HD."
        )
    },
    {
        "id": "scene2",
        "output_file": os.path.join(OUT_DIR, "scene2_veo.mp4"),
        "duration_seconds": 8,
        "prompt": (
            "Cinematic 3D animation. Natural split action scene. "
            "On the left, early humans are actively bending down and pulling wild root vegetables from the earth "
            "and picking purple berries into woven baskets with rapid hand movement. "
            "On the right, prehistoric hunters in leather wraps are running in coordination and raising wooden spears "
            "with stone points to corner a moving mountain goat. Fluid character motion, wind blowing through hair. "
            "Camera smoothly drifts between both groups. Clean UI labels: 'GATHER' on left, 'HUNT' on right. "
            "Top badge: 'FOOD = HUNT + GATHER'. 1080p Full HD."
        )
    },
    {
        "id": "scene3",
        "output_file": os.path.join(OUT_DIR, "scene3_veo.mp4"),
        "duration_seconds": 8,
        "prompt": (
            "Cinematic 3D animation inside a natural prehistoric rock shelter cave. "
            "A warm campfire burns actively in the center with dynamic flickering flames, glowing embers, and curling smoke rising. "
            "Two early humans sit by the fire actively knapping flint stones together with hammerstones, chipping flakes. "
            "Another person rests on furs. Camera slowly glides forward into the shelter. "
            "Soft neon outlines illuminate CAVE, TOOLS, and FIRE. Strictly prehistoric Stone Age, no modern items. "
            "Fluid atmospheric smoke and fire physics, 1080p Full HD."
        )
    },
    {
        "id": "scene4",
        "output_file": os.path.join(OUT_DIR, "scene4_veo.mp4"),
        "duration_seconds": 8,
        "prompt": (
            "Cinematic 3D animation summary shot. A family of Palaeolithic early humans sits together peacefully around fire, "
            "gesturing and turning to each other. Four luminous 3D holographic icons float and orbit gently: "
            "walking footprints (MOVE), fresh meat and berries (HUNT + GATHER), stone hand axe (STONE TOOLS), and rock shelter (ROCK SHELTERS). "
            "Slow smooth orbital camera motion. A friendly small blue spherical guide character stands beside, "
            "actively waving and pointing at the icons. Top card 'PALEOLITHIC = 4 CLUES', "
            "bottom filmstrip 'MOVE • FOOD • TOOLS • SHELTER'. Fluid 3D animation, 1080p Full HD."
        )
    }
]

def submit_veo_job(prompt, duration_sec):
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast:predictLongRunning?key={API_KEY}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "aspectRatio": "16:9",
            "sampleCount": 1,
            "durationSeconds": duration_sec,
            "personGeneration": "ALLOW_ADULT",
            "fps": 25
        }
    }
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("name")

def poll_and_download(operation_name, output_file):
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/{operation_name}?key={API_KEY}"
    print(f"Polling operation {operation_name}...")
    
    while True:
        req = urllib.request.Request(endpoint)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("done"):
                if "error" in data:
                    raise RuntimeError(f"Veo error: {data['error']}")
                
                response = data.get("response", {})
                video_uri = None
                # Extract video URI from Veo response schema
                videos = response.get("generatedVideos", []) or response.get("videos", [])
                if videos:
                    video_uri = videos[0].get("video", {}).get("uri") or videos[0].get("uri")
                
                if not video_uri:
                    raise RuntimeError(f"No video URI found in response: {response}")
                
                print(f"Downloading video from {video_uri} -> {output_file}...")
                urllib.request.urlretrieve(video_uri, output_file)
                print(f"Saved: {output_file} ({os.path.getsize(output_file)} bytes)")
                return True
                
        time.sleep(5)

def main():
    if not API_KEY:
        print("\n" + "="*70)
        print("GOOGLE VEO 3.1 GENERATION SCRIPT")
        print("="*70)
        print("Please export your Gemini / Google Cloud API Key:")
        print("  export GEMINI_API_KEY='AIzaSy...'")
        print("Then run:")
        print("  python3 generate_veo_clips.py\n")
        return

    print("Submitting scenes to Google Veo 3.1 Fast...")
    for sc in SCENES:
        print(f"\n[Scene {sc['id']}] Submitting generation request...")
        try:
            op_name = submit_veo_job(sc["prompt"], sc["duration_seconds"])
            print(f"Operation started: {op_name}")
            poll_and_download(op_name, sc["output_file"])
        except Exception as e:
            print(f"Error processing {sc['id']}: {e}")

    print("\nAll 4 Veo scenes generated! Now assembling master reel...")
    import subprocess
    subprocess.run([sys.executable, "assemble_veo_reel.py"], check=True)

if __name__ == "__main__":
    main()
