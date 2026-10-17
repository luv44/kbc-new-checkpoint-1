# Google Flow / Veo 3.1 Lite — 32-Second Educational Reel Workflow

This workflow uses your **Google AI Pro (Jio) / Google Flow credits** directly in the browser—with zero separate Gemini API charges.

---

## 1. Quick Step-by-Step Flow Workflow

1. Open **Google Flow** (or VideoFX / Google AI Studio) in your browser where your Jio Google AI Pro account is active.
2. Select **Veo 3.1 Lite** (or Veo 3.1 / Veo Fast) model.
3. Set **Aspect Ratio**: `16:9` and **Duration**: `8 seconds`.
4. Generate each of the 4 scene prompts below.
5. Download each clip and drop them into:
   ```
   public/videos/flow_clips/
   ```
   *(Names: `scene1.mp4`, `scene2.mp4`, `scene3.mp4`, `scene4.mp4`)*
6. Double-click **`ASSEMBLE_VEO_FLOW.bat`** (Windows) or run `bash assemble_veo_flow.sh` (WSL).

---

## 2. The 4 Veo 3.1 Lite Scene Prompts

### Scene 1 (0–8s): Palaeolithic Nomadic Life
- **Veo 3.1 Lite Prompt**:
  > Cinematic 3D animation. Small group of Palaeolithic nomadic early humans in animal hides walking forward with steady walking strides across rocky limestone terrain and ancient forest. One hunter carries a chipped flint stone tool. Smooth tracking camera. Subtle small white text: "PALAEOLITHIC LIFE", "MOVE FOR FOOD". Fluid human movement, no large boxes or subtitles, 1080p.
- **Synchronized Hindi Narration** (0–8s):
  > *“पुरापाषाण काल में लोग भोजन की तलाश में एक जगह से दूसरी जगह जाते थे।”*
- **Native White Keywords**: `PALAEOLITHIC LIFE` • `MOVE FOR FOOD`

---

### Scene 2 (8–16s): Food = Hunting + Gathering
- **Veo 3.1 Lite Prompt**:
  > Cinematic 3D animation. Split action composition. Left: early humans bending down, gathering wild roots and berries into woven baskets with active hand movement. Right: coordinated prehistoric hunters tracking game with stone-tipped spears. Camera drifts smoothly between both. Subtle small white text: "FOOD = HUNT + GATHER", "GATHER", "HUNT". Fluid human locomotion, 1080p.
- **Synchronized Hindi Narration** (8–16s):
  > *“वे शिकार करते थे और फल, जड़ें तथा दूसरी खाने की चीजें इकट्ठा करते थे।”*
- **Native White Keywords**: `FOOD = HUNT + GATHER` • `GATHER` • `HUNT`

---

### Scene 3 (16–24s): Rock Shelter, Tools & Fire
- **Veo 3.1 Lite Prompt**:
  > Cinematic 3D animation. Massive limestone rock shelter cave entrance. Campfire burning in center with licking flames, glowing embers, and curling smoke. Early humans knapping stone tools with hammerstones and resting on furs. Slow push-in camera. Soft glow outlines cave, tools, and fire. Subtle small white text: "CAVE", "TOOLS", "FIRE". Strictly Stone Age, 1080p.
- **Synchronized Hindi Narration** (16–24s):
  > *“रहने के लिए चट्टानी आश्रय काम आते थे, और पत्थर के औजार रोज़ के काम में मदद करते थे।”*
- **Native White Keywords**: `CAVE` • `TOOLS` • `FIRE`

---

### Scene 4 (24–32s): 4-Clue Summary
- **Veo 3.1 Lite Prompt**:
  > Cinematic 3D animation summary shot. Palaeolithic family sitting together peacefully around campfire. Four clean 3D holographic icons orbit gently: footprints (MOVE), meat and berries (HUNT + GATHER), stone axe (STONE TOOLS), and cave shelter (ROCK SHELTERS). Friendly blue guide character points to icons. Subtle small white text: "PALEOLITHIC = 4 CLUES" and "MOVE • FOOD • TOOLS • SHELTER". 1080p.
- **Synchronized Hindi Narration** (24–32s):
  > *“बस याद रखें—घूमना, शिकार और भोजन जुटाना, पत्थर के औजार और चट्टानी आश्रय।”*
- **Native White Keywords**: `PALEOLITHIC = 4 CLUES` • `MOVE • FOOD • TOOLS • SHELTER`

---

## 3. Local One-Click Assembly

- **Windows**: Double-click `ASSEMBLE_VEO_FLOW.bat`.
- **WSL / Ubuntu**: Run `bash assemble_veo_flow.sh`.

The assembler:
1. Validates all 4 clips.
2. Joins them with clean hard cuts at exact 8-second boundaries.
3. Preserves native audio from Flow if present, or muxes the verified spoken Hindi narration if video-only.
4. Outputs the finished 32-second 1080p MP4 to `public/videos/S03-Cf57dd5c3-T80b6a594.mp4`.
5. Automatically opens the folder in Windows File Explorer.
