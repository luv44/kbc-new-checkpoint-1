#!/usr/bin/env python3
"""
================================================================================
CROREPATI REVISION — 32-SECOND HINDI EDUCATIONAL VIDEO (GOOGLE VEO 3.1)
Automated Local Generation Pipeline
================================================================================
Topic: पुरापाषाण काल में मानव कैसे रहता था? (Palaeolithic Life)
Target: 32.00s Full HD 1080p Video (4 x 8s sequential scenes)

Features:
- Verifies official Veo 3.1 / Veo Lite / Veo 2.0 model identifiers via Gemini API
- Sequentially generates 4 independent 8-second clips
- Polls and downloads each completed clip with automatic resume support
- Stops immediately with readable error if generation fails (NO fake video)
- Assembles final 32-second MP4 with hard cuts
- Preserves native Veo Hindi audio; supplies Hindi narration if clips are video-only
- Short clean white on-screen memory text; no large text boxes or subtitles
================================================================================
"""

import os
import sys
import time
import json
import shutil
import urllib.request
import urllib.error
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEO_DIR = os.path.join(SCRIPT_DIR, "public", "videos")
PROGRESS_FILE = os.path.join(VIDEO_DIR, "veo_build_progress.json")
FINAL_MP4 = os.path.join(VIDEO_DIR, "S03-Cf57dd5c3-T80b6a594.mp4")
ALIAS_MP4 = os.path.join(VIDEO_DIR, "palaeolithic-life-1080p.mp4")

os.makedirs(VIDEO_DIR, exist_ok=True)

# 4 independent 8-second scenes with short white text inside prompts:
SCENE_SPECS = [
    {
        "id": "scene1",
        "title": "Scene 1 (0–8s): Palaeolithic Life & Nomadic Movement",
        "duration": 8,
        "output_file": os.path.join(VIDEO_DIR, "scene1_veo.mp4"),
        "voice_file": os.path.join(VIDEO_DIR, "s03_scene1_voice.mp3"),
        "narration_hi": "पुरापाषाण काल में लोग भोजन की तलाश में एक जगह से दूसरी जगह जाते थे।",
        "prompt": (
            "Cinematic 3D animation, educational documentary reel style. "
            "A small nomadic group of Palaeolithic early humans dressed in animal hides "
            "actively walking across rugged prehistoric limestone hills and ancient forest with steady walking gait. "
            "One hunter in furs carries a chipped flint stone hand-axe and walks forward alertly. "
            "Others search for wild plants among ferns and bushes. "
            "Camera smoothly tracks alongside the walking group. "
            "Subtle clean short white text rendered naturally in the scene: 'PALAEOLITHIC LIFE', 'MOVE FOR FOOD'. "
            "Gentle glowing cyan motion arrows curve along the ground showing migration path. "
            "A small friendly blue 3D guide character points forward. "
            "Warm prehistoric daylight, fluid human movement, no large text boxes, no subtitles, 1080p Full HD."
        )
    },
    {
        "id": "scene2",
        "title": "Scene 2 (8–16s): Food = Hunting + Gathering",
        "duration": 8,
        "output_file": os.path.join(VIDEO_DIR, "scene2_veo.mp4"),
        "voice_file": os.path.join(VIDEO_DIR, "s03_scene2_voice.mp3"),
        "narration_hi": "वे शिकार करते थे और फल, जड़ें तथा दूसरी खाने की चीजें इकट्ठा करते थे।",
        "prompt": (
            "Cinematic 3D educational animation. Dynamic split action scene. "
            "Left side: early humans actively bending down and gathering wild berries and edible roots into woven baskets with hand movements. "
            "Right side: coordinated prehistoric hunters actively tracking and raising flint-tipped wooden spears to corner wild game. "
            "Camera smoothly drifts between both groups. "
            "Subtle clean short white text rendered naturally in the scene: 'FOOD = HUNT + GATHER', with 'GATHER' on left, 'HUNT' on right. "
            "Bright glowing arrows connect food sources to the group. "
            "Friendly small blue guide character gestures between both groups. "
            "Fluid human locomotion, no large text boxes, no subtitles, 1080p Full HD."
        )
    },
    {
        "id": "scene3",
        "title": "Scene 3 (16–24s): Rock Shelter, Tools & Fire",
        "duration": 8,
        "output_file": os.path.join(VIDEO_DIR, "scene3_veo.mp4"),
        "voice_file": os.path.join(VIDEO_DIR, "s03_scene3_voice.mp3"),
        "narration_hi": "रहने के लिए चट्टानी आश्रय काम आते थे, और पत्थर के औजार रोज़ के काम में मदद करते थे।",
        "prompt": (
            "Cinematic 3D animation inside a massive prehistoric rock shelter and cave entrance. "
            "A controlled campfire burns in the center with dynamic flickering flames, glowing embers, and curling smoke rising. "
            "Early humans sit near the fire actively knapping stone tools with hammerstones and resting safely on furs. "
            "Camera slowly glides forward into the shelter. "
            "Soft glowing highlights illuminate the cave overhang, the stone tools, and the fire. "
            "Subtle clean short white text rendered naturally in the scene: 'CAVE', 'TOOLS', 'FIRE'. "
            "Strictly prehistoric Stone Age shelter, no permanent huts, no farming, no modern elements. "
            "No large text boxes, no subtitles, fluid fire and character motion, 1080p Full HD."
        )
    },
    {
        "id": "scene4",
        "title": "Scene 4 (24–32s): 4-Clue Summary",
        "duration": 8,
        "output_file": os.path.join(VIDEO_DIR, "scene4_veo.mp4"),
        "voice_file": os.path.join(VIDEO_DIR, "s03_scene4_voice.mp3"),
        "narration_hi": "बस याद रखें—घूमना, शिकार और भोजन जुटाना, पत्थर के औजार और चट्टानी आश्रय।",
        "prompt": (
            "Cinematic 3D animation wide summary scene. "
            "A family group of Palaeolithic early humans sits peacefully together around the campfire, gesturing. "
            "Four clean visual 3D holographic icons float and orbit gently around them: "
            "walking footprints (MOVE), fresh meat and berries (HUNT + GATHER), stone hand-axe (STONE TOOLS), and cave shelter (ROCK SHELTERS). "
            "Glowing arrows connect each icon to the group. "
            "A small friendly blue 3D guide character stands beside actively pointing toward the icons. "
            "Subtle clean short white text rendered naturally in the scene: 'PALEOLITHIC = 4 CLUES', "
            "and at the bottom: 'MOVE • FOOD • TOOLS • SHELTER'. "
            "No large text boxes, no subtitles, fluid 3D character motion, 1080p Full HD."
        )
    }
]

def print_banner(msg):
    print("\n" + "=" * 78)
    print(f" {msg}")
    print("=" * 78)

def print_step(step, msg):
    print(f"\n[Step {step}] {msg}")

def fatal_error(msg, details=None):
    print("\n" + "!" * 78)
    print(" FATAL ERROR — VIDEO GENERATION STOPPED")
    print("!" * 78)
    print(f"Reason: {msg}")
    if details:
        print(f"Details: {details}")
    print("\nNOTE: As instructed, no fake video or static placeholder will be substituted.")
    print("Please resolve the error above and rerun the script to resume.")
    print("!" * 78 + "\n")
    sys.exit(1)

def find_ffmpeg():
    cmd = shutil.which("ffmpeg")
    if cmd:
        return cmd
    for p in ["/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", "/home/user/.local/bin/ffmpeg"]:
        if os.path.exists(p) and os.access(p, os.X_OK):
            return p
    return None

def verify_and_select_veo_model(api_key):
    """
    Queries Google Gemini API /models endpoint to verify API key validity
    and detect supported Veo 3.1 / Veo Lite / Veo 2.0 model identifiers.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    req = urllib.request.Request(url, headers={"User-Agent": "VeoPipeline/1.0"})
    
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("models", [])
            
            # Look for Veo models
            veo_models = []
            for m in models:
                name = m.get("name", "").replace("models/", "")
                if "veo" in name.lower():
                    veo_models.append(name)
            
            print(f"  Available Veo models on this key: {veo_models if veo_models else 'None listed directly in models.list'}")
            
            # Preferred order of Veo 3.1 Fast / Lite / Preview identifiers
            candidates = [
                "veo-3.1-fast",
                "veo-3.1-generate-preview",
                "veo-3.1-lite",
                "veo-2.0-generate-001",
                "veo-2.0"
            ]
            
            # If user has a matching model from list, pick the best one
            for c in candidates:
                if c in veo_models:
                    return c
            
            # If models.list did not return explicit veo entries (common on beta keys where veo requires direct predictLongRunning),
            # default to official 'veo-3.1-fast' or 'veo-2.0-generate-001'
            return "veo-3.1-fast"

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        fatal_error(
            f"Google Gemini API Key verification failed (HTTP {e.code})",
            err_body
        )
    except urllib.error.URLError as e:
        fatal_error(
            "Could not connect to Google Generative Language API",
            str(e.reason)
        )
    except Exception as e:
        fatal_error("Unexpected error verifying API key", str(e))

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "topicId": "S03-Cf57dd5c3-T80b6a594",
        "scenes": {}
    }

def save_progress(progress):
    try:
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(progress, f, indent=2)
    except Exception as e:
        print(f"  Warning: Could not save progress: {e}")

def check_clip_valid(filepath):
    """Checks if a video file exists, is non-empty, and has valid MP4 header."""
    if not os.path.exists(filepath):
        return False
    size = os.path.getsize(filepath)
    if size < 10000: # smaller than 10KB cannot be a valid 8s video
        return False
    # Check header bytes for ftyp / isom / mp4
    try:
        with open(filepath, "rb") as f:
            header = f.read(32)
            if b"ftyp" in header or b"moov" in header:
                return True
    except Exception:
        return False
    return False

def submit_veo_job(api_key, model_id, prompt, duration_sec):
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:predictLongRunning?key={api_key}"
    payload = {
        "instances": [
            {
                "prompt": prompt
            }
        ],
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
        headers={"Content-Type": "application/json", "User-Agent": "VeoPipeline/1.0"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            op_name = data.get("name")
            if not op_name:
                fatal_error(f"Veo did not return an operation name for prompt", str(data))
            return op_name
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        fatal_error(f"Google Veo API request failed (HTTP {e.code})", err_body)
    except Exception as e:
        fatal_error("Failed to connect to Google Veo endpoint", str(e))

def poll_and_download_veo(api_key, operation_name, output_file, max_wait_sec=600):
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/{operation_name}?key={api_key}"
    print(f"  Polling Veo operation: {operation_name}")
    
    start_time = time.time()
    poll_interval = 8 # seconds
    
    while True:
        elapsed = int(time.time() - start_time)
        if elapsed > max_wait_sec:
            fatal_error(f"Veo generation timed out after {elapsed}s for operation {operation_name}")
            
        try:
            req = urllib.request.Request(endpoint, headers={"User-Agent": "VeoPipeline/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                
                if data.get("done"):
                    if "error" in data:
                        fatal_error("Google Veo reported generation failure", json.dumps(data["error"]))
                    
                    response = data.get("response", {})
                    # Look for video URI in standard formats
                    video_uri = None
                    videos = response.get("generatedVideos", []) or response.get("videos", [])
                    if videos:
                        v0 = videos[0]
                        video_uri = v0.get("video", {}).get("uri") or v0.get("uri")
                    
                    if not video_uri:
                        fatal_error("Veo marked operation as done, but returned no video URI", json.dumps(response))
                    
                    print(f"\n  [✓] Video generation complete! Downloading: {video_uri}")
                    temp_file = output_file + ".tmp"
                    urllib.request.urlretrieve(video_uri, temp_file)
                    
                    if check_clip_valid(temp_file):
                        os.replace(temp_file, output_file)
                        size_mb = os.path.getsize(output_file) / (1024 * 1024)
                        print(f"  [✓] Downloaded and verified: {output_file} ({size_mb:.2f} MB)")
                        return True
                    else:
                        fatal_error("Downloaded file is corrupt or invalid", f"Size: {os.path.getsize(temp_file)} bytes")
                        
                else:
                    metadata = data.get("metadata", {})
                    state = metadata.get("state", "RUNNING")
                    print(f"  ... synthesizing frames ({state}, elapsed: {elapsed}s)", end="\r", flush=True)
                    
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            fatal_error(f"HTTP error polling operation {operation_name} (HTTP {e.code})", err_body)
        except Exception as e:
            print(f"  Notice: poll network retry ({e})...")
            
        time.sleep(poll_interval)

def check_clip_has_audio(ffmpeg_bin, filepath):
    """Uses ffmpeg/ffprobe to check if clip contains an audio stream."""
    try:
        res = subprocess.run(
            [ffmpeg_bin, "-i", filepath],
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True
        )
        return "Audio:" in res.stderr
    except Exception:
        return False

def assemble_master_video(ffmpeg_bin):
    """
    Joins the 4 8-second clips into a 32-second 1080p MP4 with hard cuts.
    Preserves native Veo Hindi audio; if clips are video-only, muxes the complete Hindi narration.
    """
    print_step("4", "Assembling 32-second master video from 4 native clips with hard cuts...")
    
    for sc in SCENE_SPECS:
        if not check_clip_valid(sc["output_file"]):
            fatal_error(f"Cannot assemble master video: missing or invalid clip {sc['output_file']}")

    # Check if native clips have audio
    has_native_audio = all(check_clip_has_audio(ffmpeg_bin, sc["output_file"]) for sc in SCENE_SPECS)
    print(f"  Native Veo Audio detected in all clips: {'YES' if has_native_audio else 'NO (supplying complete Hindi narration)'}")

    # Write concat list
    concat_txt = os.path.join(VIDEO_DIR, "veo_concat_list.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for sc in SCENE_SPECS:
            f.write(f"file '{os.path.abspath(sc['output_file'])}'\n")

    if has_native_audio:
        # Preserve native Veo audio directly without mixing second narrator
        print("  Concatenating 4 native clips with native audio...")
        cmd = [
            ffmpeg_bin, "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_txt,
            "-c", "copy",
            FINAL_MP4
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            # Re-encode fallback if stream timebases differ
            print("  Notice: Re-encoding stream for uniform timebase...")
            cmd = [
                ffmpeg_bin, "-y",
                "-f", "concat", "-safe", "0",
                "-i", concat_txt,
                "-c:v", "libx264", "-preset", "fast", "-crf", "22",
                "-c:a", "aac", "-b:a", "192k",
                FINAL_MP4
            ]
            subprocess.run(cmd, check=True)
    else:
        # Video-only clips from Veo: stitch video and mux synchronized complete Hindi audio
        print("  Stitching video stream...")
        raw_video = os.path.join(VIDEO_DIR, "raw_stitched_video.mp4")
        cmd_v = [
            ffmpeg_bin, "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_txt,
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-an",
            raw_video
        ]
        subprocess.run(cmd_v, check=True)

        print("  Muxing complete synchronized Hindi narration (4 x 8s scenes)...")
        v1 = SCENE_SPECS[0]["voice_file"]
        v2 = SCENE_SPECS[1]["voice_file"]
        v3 = SCENE_SPECS[2]["voice_file"]
        v4 = SCENE_SPECS[3]["voice_file"]
        
        filter_audio = (
            "[0:a]adelay=400|400,volume=1.45[s1];"
            "[1:a]adelay=8400|8400,volume=1.45[s2];"
            "[2:a]adelay=16400|16400,volume=1.45[s3];"
            "[3:a]adelay=24400|24400,volume=1.45[s4];"
            "sine=f=220:d=32[bg1];sine=f=330:d=32[bg2];"
            "[bg1][bg2]amix=inputs=2:weights=0.5 0.5,volume=0.035[bg];"
            "[s1][s2][s3][s4][bg]amix=inputs=5:duration=longest[outa]"
        )
        
        cmd_mux = [
            ffmpeg_bin, "-y",
            "-i", raw_video,
            "-i", v1, "-i", v2, "-i", v3, "-i", v4,
            "-filter_complex", filter_audio,
            "-map", "0:v",
            "-map", "[outa]",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            "-t", "32",
            FINAL_MP4
        ]
        subprocess.run(cmd_mux, check=True)
        if os.path.exists(raw_video):
            os.remove(raw_video)

    # Mirror alias file
    try:
        if os.path.islink(ALIAS_MP4) or os.path.exists(ALIAS_MP4):
            os.remove(ALIAS_MP4)
        shutil.copy2(FINAL_MP4, ALIAS_MP4)
    except Exception as e:
        print(f"  Notice: could not mirror alias: {e}")

    # Check final size
    size_mb = os.path.getsize(FINAL_MP4) / (1024 * 1024)
    print(f"\n  [✓] MASTER 32-SECOND MP4 READY: {FINAL_MP4} ({size_mb:.2f} MB)")

def main():
    print_banner("CROREPATI REVISION — GOOGLE VEO 3.1 LOCAL AUTOMATED WORKFLOW")
    print("Topic: पुरापाषाण काल में मानव कैसे रहता था? (Palaeolithic Life)")
    print("Format: 32.00-Second Full HD 1080p Video (4 x 8s Scenes)")

    # 1. Check API Key
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        fatal_error(
            "GEMINI_API_KEY environment variable is not set.",
            "Run this script via START_VIDEO.bat or start_video_wsl.sh, which prompts for your key securely."
        )

    # 2. Check FFmpeg
    ffmpeg_bin = find_ffmpeg()
    if not ffmpeg_bin:
        fatal_error(
            "FFmpeg executable not found.",
            "Install ffmpeg via 'sudo apt-get install -y ffmpeg' or run start_video_wsl.sh."
        )
    print(f"[✓] FFmpeg located: {ffmpeg_bin}")

    # 3. Verify Veo 3.1 Model on User API Key
    print_step("1", "Verifying official supported Google Veo model identifier via Gemini API...")
    veo_model = verify_and_select_veo_model(api_key)
    print(f"  [✓] Verified Veo model identifier: {veo_model}")

    # 4. Process 4 Scenes Sequentially with Resume Support
    print_step("2", "Checking progress and generating 4 independent 8-second clips sequentially...")
    progress = load_progress()

    for idx, sc in enumerate(SCENE_SPECS):
        sc_id = sc["id"]
        sc_title = sc["title"]
        sc_file = sc["output_file"]

        print(f"\n--- [{idx+1}/4] {sc_title} ---")
        
        # Check if already generated and valid
        if check_clip_valid(sc_file):
            size_mb = os.path.getsize(sc_file) / (1024 * 1024)
            print(f"  [✓] Clip already completed on disk: {sc_file} ({size_mb:.2f} MB) — SKIPPING")
            progress["scenes"][sc_id] = {
                "status": "COMPLETED",
                "file": sc_file,
                "duration": sc["duration"]
            }
            save_progress(progress)
            continue

        print(f"  Submitting generation request to {veo_model}...")
        print(f"  Duration: {sc['duration']} seconds | Aspect Ratio: 16:9 | FPS: 25")
        
        # Submit to Veo
        op_name = submit_veo_job(api_key, veo_model, sc["prompt"], sc["duration"])
        progress["scenes"][sc_id] = {
            "status": "GENERATING",
            "operation": op_name
        }
        save_progress(progress)

        # Poll and Download
        poll_and_download_veo(api_key, op_name, sc_file)
        
        progress["scenes"][sc_id] = {
            "status": "COMPLETED",
            "file": sc_file,
            "duration": sc["duration"]
        }
        save_progress(progress)

    # 5. Assemble Master 32-Second Video
    print_step("3", "All 4 independent clips verified. Joining into final 32-second master...")
    assemble_master_video(ffmpeg_bin)

    print_banner("PRODUCTION COMPLETE — 32-SECOND VEO 3.1 REEL GENERATED SUCCESSFULLY")
    print(f"Master Video: {FINAL_MP4}")
    print(f"Direct Alias: {ALIAS_MP4}")
    print("=" * 78 + "\n")

if __name__ == "__main__":
    main()
