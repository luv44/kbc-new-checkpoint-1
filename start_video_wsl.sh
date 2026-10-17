#!/usr/bin/env bash
# ==============================================================================
# CROREPATI REVISION — GOOGLE VEO 3.1 WSL LAUNCHER
# Automated local workflow for Ubuntu on WSL / Linux
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OUTPUT_DIR="$SCRIPT_DIR/public/videos"
mkdir -p "$OUTPUT_DIR"

echo "=============================================================================="
echo " CROREPATI REVISION — GOOGLE VEO 3.1 WORKFLOW LAUNCHER (WSL / UBUNTU)"
echo "=============================================================================="

# 1. Dependency checks & automated installation
echo ""
echo "[Step 1/4] Checking and verifying local dependencies..."

# Python3 check
if ! command -v python3 >/dev/null 2>&1; then
    echo "  [!] Python 3 not found. Installing python3 and pip..."
    sudo apt-get update -y && sudo apt-get install -y python3 python3-pip
fi
echo "  [✓] Python 3: $(python3 --version)"

# FFmpeg check
if ! command -v ffmpeg >/dev/null 2>&1 && [ ! -f /usr/local/bin/ffmpeg ]; then
    echo "  [!] FFmpeg binary not found. Installing static ffmpeg..."
    if command -v pip3 >/dev/null 2>&1 || python3 -m pip --version >/dev/null 2>&1; then
        python3 -m pip install --break-system-packages imageio-ffmpeg 2>/dev/null || python3 -m pip install imageio-ffmpeg
        FFMPEG_BIN=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null || true)
        if [ -n "$FFMPEG_BIN" ] && [ -f "$FFMPEG_BIN" ]; then
            sudo ln -sf "$FFMPEG_BIN" /usr/local/bin/ffmpeg 2>/dev/null || ln -sf "$FFMPEG_BIN" "$HOME/.local/bin/ffmpeg" 2>/dev/null || true
            export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"
        fi
    fi
    if ! command -v ffmpeg >/dev/null 2>&1; then
        sudo apt-get update -y && sudo apt-get install -y ffmpeg
    fi
fi
echo "  [✓] FFmpeg: ready"

# 2. Secure API Key prompt (hidden, never saved to disk)
echo ""
echo "[Step 2/4] Gemini / Google Veo API Key Authentication"
if [ -z "$GEMINI_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ]; then
    echo "  Please enter your Google Gemini / Veo API Key."
    echo "  (Your input is completely hidden for security and is NEVER saved to disk.)"
    echo -n "  Enter API Key: "
    read -s USER_API_KEY
    echo ""
    if [ -z "$USER_API_KEY" ]; then
        echo "  [ERROR] No API key provided. Exiting."
        exit 1
    fi
    export GEMINI_API_KEY="$USER_API_KEY"
else
    echo "  [✓] Using existing GEMINI_API_KEY from current session."
fi

# 3. Run automated Veo pipeline
echo ""
echo "[Step 3/4] Launching Google Veo 3.1 generation pipeline..."
python3 "$SCRIPT_DIR/run_veo_pipeline.py"

# Clean up API key from memory
unset GEMINI_API_KEY
unset USER_API_KEY

# 4. Open output folder in Windows File Explorer
echo ""
echo "[Step 4/4] Opening output video folder..."
if command -v explorer.exe >/dev/null 2>&1; then
    WIN_PATH=$(wslpath -w "$OUTPUT_DIR" 2>/dev/null || echo "")
    if [ -n "$WIN_PATH" ]; then
        echo "  Opening Windows File Explorer: $WIN_PATH"
        explorer.exe "$WIN_PATH" || true
    else
        explorer.exe . || true
    fi
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$OUTPUT_DIR" || true
fi

echo ""
echo "=============================================================================="
echo " WORKFLOW FINISHED"
echo " Final 32-second video: $OUTPUT_DIR/S03-Cf57dd5c3-T80b6a594.mp4"
echo "=============================================================================="
