#!/usr/bin/env python3
"""
================================================================================
CROREPATI REVISION — GOOGLE FLOW / VEO 3.1 LITE LOCAL ASSEMBLER
================================================================================
Stitches 4 independent 8-second clips downloaded from Google Flow into a
seamless 32-second Full HD educational master video with hard cuts.
Preserves native audio if present, or muxes synchronized Hindi narration.
================================================================================
"""

import os
import sys
import glob
import shutil
import subprocess
import hashlib
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEO_DIR = os.path.join(SCRIPT_DIR, "public", "videos")
FLOW_DIR = os.path.join(VIDEO_DIR, "flow_clips")
FINAL_MP4 = os.path.join(VIDEO_DIR, "S03-Cf57dd5c3-T80b6a594.mp4")
ALIAS_MP4 = os.path.join(VIDEO_DIR, "palaeolithic-life-1080p.mp4")

os.makedirs(FLOW_DIR, exist_ok=True)

VOICE_CLIPS = [
    os.path.join(VIDEO_DIR, f"s03_scene{i}_voice.mp3") for i in range(1, 5)
]

def find_ffmpeg():
    cmd = shutil.which("ffmpeg")
    if cmd:
        return cmd
    for p in ["/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", os.path.expanduser("~/.local/bin/ffmpeg")]:
        if os.path.exists(p) and os.access(p, os.X_OK):
            return p
    return None

def find_scene_clip(scene_num):
    """Finds clip in flow_clips/ or videos/ with various common naming schemes."""
    candidates = [
        os.path.join(FLOW_DIR, f"scene{scene_num}.mp4"),
        os.path.join(FLOW_DIR, f"scene{scene_num}_veo.mp4"),
        os.path.join(FLOW_DIR, f"scene{scene_num}_flow.mp4"),
        os.path.join(VIDEO_DIR, f"scene{scene_num}.mp4"),
        os.path.join(VIDEO_DIR, f"scene{scene_num}_veo.mp4"),
    ]
    for c in candidates:
        if os.path.isfile(c) and os.path.getsize(c) > 10000:
            return c
    # Glob match
    pattern = os.path.join(FLOW_DIR, f"*scene*{scene_num}*.mp4")
    matches = glob.glob(pattern)
    if matches:
        return matches[0]
    return None

def check_clip_has_audio(ffmpeg_bin, filepath):
    try:
        res = subprocess.run([ffmpeg_bin, "-i", filepath], stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        return "Audio:" in res.stderr
    except Exception:
        return False

def assemble():
    print("=" * 72)
    print(" GOOGLE FLOW / VEO 3.1 LITE — LOCAL 32-SECOND REEL ASSEMBLER")
    print("=" * 72)
    
    ffmpeg_bin = find_ffmpeg()
    if not ffmpeg_bin:
        print("\n[ERROR] FFmpeg is not installed or not in PATH.")
        print("Please install ffmpeg or run via START_FLOW_ASSEMBLER.bat.")
        sys.exit(1)

    print(f"\n[1/3] Locating 4 Flow clips in: {FLOW_DIR}")
    clips = []
    for i in range(1, 5):
        clip = find_scene_clip(i)
        if not clip:
            print(f"\n[!] Missing Scene {i} clip.")
            print(f"    Expected: {os.path.join(FLOW_DIR, f'scene{i}.mp4')}")
            print("\nPlease place your 4 downloaded Google Flow clips into:")
            print(f"  {FLOW_DIR}")
            print("Named as: scene1.mp4, scene2.mp4, scene3.mp4, scene4.mp4")
            sys.exit(1)
        size_mb = os.path.getsize(clip) / (1024 * 1024)
        print(f"  [✓] Scene {i}: {os.path.basename(clip)} ({size_mb:.2f} MB)")
        clips.append(clip)

    has_audio = all(check_clip_has_audio(ffmpeg_bin, c) for c in clips)
    print(f"\n[2/3] Native audio detected in all clips: {'YES (Preserving Flow audio)' if has_audio else 'NO (Applying synchronized Hindi narration)'}")

    # Write concat demuxer list
    concat_txt = os.path.join(VIDEO_DIR, "flow_concat_list.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for c in clips:
            f.write(f"file '{os.path.abspath(c)}'\n")

    print("\n[3/3] Joining clips into 32-second master with hard cuts...")
    if has_audio:
        # Preserve native audio
        cmd = [
            ffmpeg_bin, "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_txt,
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-c:a", "aac", "-b:a", "192k",
            "-t", "32",
            FINAL_MP4
        ]
        subprocess.run(cmd, check=True)
    else:
        # Video only: concat video and mux complete synchronized Hindi narration
        raw_v = os.path.join(VIDEO_DIR, "temp_flow_raw.mp4")
        cmd_v = [
            ffmpeg_bin, "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_txt,
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-an",
            raw_v
        ]
        subprocess.run(cmd_v, check=True)

        audio_mix = os.path.join(VIDEO_DIR, "temp_flow_audio.aac")
        filter_audio = (
            "[0:a]adelay=400|400,volume=1.45[s1];"
            "[1:a]adelay=8400|8400,volume=1.45[s2];"
            "[2:a]adelay=16400|16400,volume=1.45[s3];"
            "[3:a]adelay=24400|24400,volume=1.45[s4];"
            "sine=f=220:d=32[bg1];sine=f=330:d=32[bg2];"
            "[bg1][bg2]amix=inputs=2:weights=0.5 0.5,volume=0.035[bg];"
            "[s1][s2][s3][s4][bg]amix=inputs=5:duration=longest[outa]"
        )
        cmd_a = [
            ffmpeg_bin, "-y",
            "-i", VOICE_CLIPS[0], "-i", VOICE_CLIPS[1], "-i", VOICE_CLIPS[2], "-i", VOICE_CLIPS[3],
            "-filter_complex", filter_audio,
            "-map", "[outa]",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-t", "32",
            audio_mix
        ]
        subprocess.run(cmd_a, check=True)

        cmd_m = [
            ffmpeg_bin, "-y",
            "-i", raw_v,
            "-i", audio_mix,
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            FINAL_MP4
        ]
        subprocess.run(cmd_m, check=True)

        for tmp in [raw_v, audio_mix]:
            if os.path.exists(tmp):
                os.remove(tmp)

    if os.path.exists(concat_txt):
        os.remove(concat_txt)

    # Mirror alias
    try:
        if os.path.islink(ALIAS_MP4) or os.path.exists(ALIAS_MP4):
            os.remove(ALIAS_MP4)
        shutil.copy2(FINAL_MP4, ALIAS_MP4)
    except Exception:
        pass

    size_mb = os.path.getsize(FINAL_MP4) / (1024 * 1024)
    print("\n" + "=" * 72)
    print(f" [✓] 32-SECOND MASTER REEL ASSEMBLED SUCCESSFULLY!")
    print(f" File: {FINAL_MP4} ({size_mb:.2f} MB)")
    print("=" * 72)

if __name__ == "__main__":
    assemble()
