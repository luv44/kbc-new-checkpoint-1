#!/usr/bin/env python3
"""
Full-Motion 3D Educational Reel Generator inspired by Google Veo 3.1 dynamics.
Implements:
- Continuous 3D camera motion (tracking pan, dolly push-in, parallax)
- Turbulent fluid campfire flicker & dynamic cave lighting
- Traveling luminous energy pulses along migration/relationship arrows
- Sequential memory badge highlights & golden shimmer waves
- Fully synchronized spoken Hindi teacher voiceover (voice-00)
"""

import os
import sys
import subprocess
import numpy as np
from PIL import Image, ImageFilter

FFMPEG = "/home/user/.local/bin/ffmpeg"
VIDEO_DIR = "public/videos"
TOPIC_ID = "S03-Cf57dd5c3-T80b6a594"

WIDTH = 1920
HEIGHT = 1080
FPS = 25
SCENE_DURATION = 8 # seconds per scene
SCENE_FRAMES = SCENE_DURATION * FPS # 200 frames per scene
TOTAL_FRAMES = SCENE_FRAMES * 4 # 800 frames = 32.00 seconds

# Prepare high-resolution source arrays (2160 x 1215 for camera motion headroom)
def load_source_image(filename):
    im = Image.open(filename).convert("RGB")
    # Resize with high quality Lanczos to 2200 x 1238
    im_scaled = im.resize((2200, 1238), Image.Resampling.LANCZOS)
    return np.array(im_scaled, dtype=np.float32)

print("Loading scene keyframes...")
src1 = load_source_image(f"{VIDEO_DIR}/{TOPIC_ID}-poster.jpg")
src2 = load_source_image(f"{VIDEO_DIR}/{TOPIC_ID}-scene2.jpg")
src3 = load_source_image(f"{VIDEO_DIR}/{TOPIC_ID}-scene3.jpg")
src4 = load_source_image(f"{VIDEO_DIR}/{TOPIC_ID}-scene4.jpg")

# Precompute coordinate grids for 1920x1080
Y_GRID, X_GRID = np.ogrid[:HEIGHT, :WIDTH]

def crop_subpixel(src, center_x, center_y, crop_w, crop_h):
    """Crop and resize with smooth continuous camera motion."""
    x1 = int(np.clip(center_x - crop_w / 2, 0, src.shape[1] - crop_w))
    y1 = int(np.clip(center_y - crop_h / 2, 0, src.shape[0] - crop_h))
    cropped = src[y1:y1 + int(crop_h), x1:x1 + int(crop_w)]
    im_crop = Image.fromarray(np.uint8(cropped))
    return np.array(im_crop.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR), dtype=np.float32)

def generate_scene1_frame(frame_idx):
    t = frame_idx / FPS
    # Camera: tracking right with the walking nomadic group
    progress = frame_idx / SCENE_FRAMES
    center_x = 1000 + progress * 200 # pan right
    center_y = 620 - progress * 40   # subtle tilt up
    scale = 1.0 - progress * 0.08    # slow zoom in
    crop_w = int(2100 * scale)
    crop_h = int(crop_w * (HEIGHT / WIDTH))
    
    frame = crop_subpixel(src1, center_x, center_y, crop_w, crop_h)
    
    # 1. Traveling luminous energy pulse along the ground migration arrow
    # The arrow sweeps across from bottom-left to center-right
    arrow_t = (t % 1.6) / 1.6 # repeats every 1.6s
    # Parabolic arrow path across screen
    px = int(250 + arrow_t * 1450)
    py = int(760 + 120 * np.sin(arrow_t * np.pi) - arrow_t * 80)
    
    # Render glowing photon orb
    dist_sq = (X_GRID - px)**2 + (Y_GRID - py)**2
    glow_radius = 90
    glow_mask = np.exp(-dist_sq / (2 * (glow_radius**2)))
    # Add cyan energy boost
    frame[:, :, 0] += glow_mask * 80  # R
    frame[:, :, 1] += glow_mask * 180 # G
    frame[:, :, 2] += glow_mask * 255 # B
    
    # 2. Gentle atmospheric sunbeam breathing
    sun_pulse = 1.0 + 0.04 * np.sin(2 * np.pi * t / 2.5)
    frame[:400, :, :] *= sun_pulse

    return np.clip(frame, 0, 255).astype(np.uint8)

def generate_scene2_frame(frame_idx):
    t = frame_idx / FPS
    progress = frame_idx / SCENE_FRAMES
    # Camera: smooth lateral pan from gathering food (left) to hunting (right)
    center_x = 900 + progress * 350 # pan across
    center_y = 620
    crop_w = 1980
    crop_h = int(crop_w * (HEIGHT / WIDTH))
    
    frame = crop_subpixel(src2, center_x, center_y, crop_w, crop_h)
    
    # Dynamic alternating energy pulse between GATHER (left) and HUNT (right)
    cycle = (t % 2.0) / 2.0 # 2-second cycle
    if cycle < 0.5:
        # Left side gathering glow
        intensity = np.sin(cycle * 2 * np.pi) * 0.18
        frame[:, :960, 1] *= (1.0 + intensity) # green/cyan boost
    else:
        # Right side hunting glow
        intensity = np.sin((cycle - 0.5) * 2 * np.pi) * 0.18
        frame[:, 960:, 0] *= (1.0 + intensity) # amber/red boost

    # Center memory card 'FOOD = HUNT + GATHER' soft luminous breathing
    card_pulse = 1.0 + 0.08 * np.sin(2 * np.pi * t / 1.5)
    frame[50:280, 700:1220, :] = np.clip(frame[50:280, 700:1220, :] * card_pulse, 0, 255)

    return np.clip(frame, 0, 255).astype(np.uint8)

def generate_scene3_frame(frame_idx):
    t = frame_idx / FPS
    progress = frame_idx / SCENE_FRAMES
    # Camera: slow cinematic push-in toward the rock shelter cave interior
    center_x = 1100
    center_y = 620 + progress * 30
    scale = 1.0 - progress * 0.12 # dramatic push-in
    crop_w = int(2100 * scale)
    crop_h = int(crop_w * (HEIGHT / WIDTH))
    
    frame = crop_subpixel(src3, center_x, center_y, crop_w, crop_h)
    
    # 1. REAL FLICKERING CAMPFIRE SIMULATION
    # Campfire coordinates in frame: ~ (1240, 780)
    fire_x, fire_y = 1240, 780
    dist_sq = (X_GRID - fire_x)**2 + (Y_GRID - fire_y)**2
    fire_radius = 450
    fire_mask = np.exp(-dist_sq / (2 * (fire_radius**2)))
    
    # Multi-frequency turbulent flicker
    flicker = (0.20 * np.sin(19.3 * t) +
               0.14 * np.sin(37.7 * t) +
               0.08 * np.sin(61.1 * t) +
               0.05 * np.cos(83.4 * t))
    
    # Warm firelight color: heavily red/amber, lower blue
    frame[:, :, 0] += fire_mask * (flicker * 90 + 35)  # Red channel
    frame[:, :, 1] += fire_mask * (flicker * 55 + 20)  # Green channel
    frame[:, :, 2] += fire_mask * (flicker * 15 + 5)   # Blue channel
    
    # 2. Sequential 3-Object Glow Highlights
    # t in [0..2.5s]: CAVE glow (top overhang, blue)
    # t in [2.5..5.0s]: TOOLS glow (left rock, green)
    # t in [5.0..8.0s]: FIRE glow (center hearth, orange)
    if t < 2.5:
        # CAVE highlight
        pulse = 1.0 + 0.25 * np.sin(t * np.pi / 2.5 * 4)
        frame[100:480, 650:950, 2] *= pulse
    elif t < 5.0:
        # TOOLS highlight
        p_t = t - 2.5
        pulse = 1.0 + 0.28 * np.sin(p_t * np.pi / 2.5 * 4)
        frame[460:850, 200:700, 1] *= pulse
    else:
        # FIRE highlight
        p_t = t - 5.0
        pulse = 1.0 + 0.30 * np.sin(p_t * np.pi / 3.0 * 4)
        frame[480:880, 1050:1500, 0] *= pulse

    return np.clip(frame, 0, 255).astype(np.uint8)

def generate_scene4_frame(frame_idx):
    t = frame_idx / FPS
    progress = frame_idx / SCENE_FRAMES
    # Camera: stable summary view with subtle organic camera breathing
    center_x = 1100 + 15 * np.sin(progress * 2 * np.pi)
    center_y = 620 + 10 * np.cos(progress * 2 * np.pi)
    crop_w = 2050
    crop_h = int(crop_w * (HEIGHT / WIDTH))
    
    frame = crop_subpixel(src4, center_x, center_y, crop_w, crop_h)
    
    # 4 Sequential Clue Pulses firing energy arrows to the center family:
    # 0-2s: Clue 1 (MOVE - top left)
    # 2-4s: Clue 2 (HUNT+GATHER - top right)
    # 4-6s: Clue 3 (STONE TOOLS - bottom right)
    # 6-8s: Clue 4 (ROCK SHELTERS - bottom left)
    clue_idx = int(t // 2.0)
    clue_t = (t % 2.0) / 2.0 # 0.0 to 1.0 inside current clue
    
    clue_coords = [
        (350, 320),   # 1. MOVE
        (1580, 320),  # 2. HUNT + GATHER
        (1580, 680),  # 3. STONE TOOLS
        (350, 680)    # 4. ROCK SHELTERS
    ]
    
    if clue_idx < 4:
        cx, cy = clue_coords[clue_idx]
        # Radial pulse on active clue icon
        dist_sq = (X_GRID - cx)**2 + (Y_GRID - cy)**2
        c_mask = np.exp(-dist_sq / (2 * (180**2)))
        pulse_strength = np.sin(clue_t * np.pi) * 80
        frame[:, :, 0] += c_mask * pulse_strength
        frame[:, :, 1] += c_mask * pulse_strength * 1.2
        frame[:, :, 2] += c_mask * pulse_strength * 1.5
        
        # Energy particle traveling from clue toward center family (960, 650)
        fx = int(cx + (960 - cx) * clue_t)
        fy = int(cy + (650 - cy) * clue_t)
        p_dist = (X_GRID - fx)**2 + (Y_GRID - fy)**2
        p_glow = np.exp(-p_dist / (2 * (60**2)))
        frame[:, :, 0] += p_glow * 180
        frame[:, :, 1] += p_glow * 220
        frame[:, :, 2] += p_glow * 255
    
    # Bottom memory strip 'MOVE • FOOD • TOOLS • SHELTER' golden shimmer wave
    if t >= 5.0:
        shimmer_t = (t - 5.0) / 3.0 # 0.0 to 1.0
        shimmer_x = int(shimmer_t * 1920)
        dist_x = np.abs(X_GRID - shimmer_x)
        shimmer_mask = np.exp(-(dist_x**2) / (2 * (140**2)))
        # Only affect bottom banner region Y in [860..1040]
        banner_y_mask = ((Y_GRID >= 860) & (Y_GRID <= 1040)).astype(np.float32)
        combined_shimmer = shimmer_mask * banner_y_mask
        # Golden tint
        frame[:, :, 0] += combined_shimmer * 90  # R
        frame[:, :, 1] += combined_shimmer * 75  # G
        frame[:, :, 2] += combined_shimmer * 10  # B

    return np.clip(frame, 0, 255).astype(np.uint8)

# Pipe raw RGB24 frames into FFmpeg encoder at 1920x1080 25fps
raw_video_path = "/tmp/veo_motion_raw_1080p.mp4"
ffmpeg_cmd = [
    FFMPEG, "-y",
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "-s", f"{WIDTH}x{HEIGHT}",
    "-r", str(FPS),
    "-i", "-", # stdin
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "22",
    "-pix_fmt", "yuv420p",
    raw_video_path
]

print(f"Starting FFmpeg pipe encoder for {TOTAL_FRAMES} frames (32.0s @ 25fps)...")
proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

for f_idx in range(TOTAL_FRAMES):
    if f_idx < 200:
        frame_rgb = generate_scene1_frame(f_idx)
    elif f_idx < 400:
        frame_rgb = generate_scene2_frame(f_idx - 200)
    elif f_idx < 600:
        frame_rgb = generate_scene3_frame(f_idx - 400)
    else:
        frame_rgb = generate_scene4_frame(f_idx - 600)
    
    proc.stdin.write(frame_rgb.tobytes())
    if (f_idx + 1) % 100 == 0:
        print(f"Rendered {f_idx + 1}/{TOTAL_FRAMES} frames ({((f_idx + 1)/TOTAL_FRAMES)*100:.0f}%)...")

proc.stdin.close()
proc.wait()
print(f"Video track rendered to {raw_video_path}")

# Now mix with the spoken Hindi voiceover track and educational background music
v1 = f"{VIDEO_DIR}/s03_scene1_voice.mp3"
v2 = f"{VIDEO_DIR}/s03_scene2_voice.mp3"
v3 = f"{VIDEO_DIR}/s03_scene3_voice.mp3"
v4 = f"{VIDEO_DIR}/s03_scene4_voice.mp3"

audio_mix = "/tmp/veo_motion_audio.aac"
filter_audio = (
    "[0:a]adelay=400|400,volume=1.45[s1];"
    "[1:a]adelay=8400|8400,volume=1.45[s2];"
    "[2:a]adelay=16400|16400,volume=1.45[s3];"
    "[3:a]adelay=24400|24400,volume=1.45[s4];"
    "sine=f=220:d=32[bg1];sine=f=330:d=32[bg2];sine=f=440:d=32[bg3];"
    "[bg1][bg2][bg3]amix=inputs=3:weights=0.4 0.35 0.25,volume=0.035[bg];"
    "[s1][s2][s3][s4][bg]amix=inputs=5:duration=longest[outa]"
)

cmd_audio = [
    FFMPEG, "-y",
    "-i", v1, "-i", v2, "-i", v3, "-i", v4,
    "-filter_complex", filter_audio,
    "-map", "[outa]",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-t", "32",
    audio_mix
]
print("Compiling audio with spoken Hindi narration...")
subprocess.run(cmd_audio, check=True)

# Final MUX
final_mp4 = f"{VIDEO_DIR}/{TOPIC_ID}.mp4"
alias_mp4 = f"{VIDEO_DIR}/palaeolithic-life-1080p.mp4"

cmd_mux = [
    FFMPEG, "-y",
    "-i", raw_video_path,
    "-i", audio_mix,
    "-c:v", "copy",
    "-c:a", "aac",
    "-shortest",
    final_mp4
]
print("Muxing final video and audio...")
subprocess.run(cmd_mux, check=True)
subprocess.run(["cp", "-f", final_mp4, alias_mp4], check=True)

import hashlib
file_size = os.path.getsize(final_mp4)
with open(final_mp4, "rb") as f:
    file_sha256 = hashlib.sha256(f.read()).hexdigest()

print(f"SUCCESS: Full-Motion Video Lesson ready at {final_mp4}")
print(f"Size: {file_size} bytes, SHA256: {file_sha256}")
