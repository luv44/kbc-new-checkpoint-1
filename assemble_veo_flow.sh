#!/usr/bin/env bash
# ==============================================================================
# Google Flow / Veo 3.1 Lite — Local Clip Assembler (WSL/Linux)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OUTPUT_DIR="$SCRIPT_DIR/public/videos"
mkdir -p "$OUTPUT_DIR/flow_clips"

# Dependency check
if ! command -v ffmpeg >/dev/null 2>&1 && [ ! -f /usr/local/bin/ffmpeg ]; then
    echo "[!] Installing FFmpeg..."
    sudo apt-get update -y && sudo apt-get install -y ffmpeg
fi

python3 "$SCRIPT_DIR/assemble_flow_clips.py"

# Open output in Windows explorer if in WSL
if command -v explorer.exe >/dev/null 2>&1; then
    WIN_PATH=$(wslpath -w "$OUTPUT_DIR" 2>/dev/null || echo "")
    if [ -n "$WIN_PATH" ]; then
        explorer.exe "$WIN_PATH" || true
    fi
fi
