# Gen 6/7 Stream Tuning — Session Handoff

## Current State

Gen 6/7 emulation is working via Azahar (Citra/Lime3DS successor). Native desktop play works perfectly — saves load, game runs, save bridging handles Checkpoint `main` files. Browser streaming connects and shows video, but needs tuning.

## What Works

- **Native Play**: Click Play on a Gen 6/7 save → Azahar opens with correct save data
- **Save Bridging**: `saveBridge3ds.ts` creates Azahar's expected directory structure (including the required 16-byte metadata file) using `XDG_DATA_HOME` env var for isolation
- **Stream Connection**: `StreamSession` creates Xvfb + spawns Azahar + FFmpeg captures video → WebRTC relay → browser receives video
- **Save Preview**: Backend parses Gen 6/7 saves and returns party/box data for the launcher UI
- **Save Parsing**: Full PK6/PK7 decoder with PRNG decryption — verified against 50+ real saves, 85+ shinies detected correctly

## Stream Issues — Fixed

### 1. Window Size Mismatch — FIXED

**Root cause:** Azahar's Qt chrome (menu bar, toolbar, status bar) added ~100px of overhead, clipping the 400×480 render area on the 400×480 Xvfb display.

**Fix:** Pre-seed `qt-config.ini` via `seedAzaharConfig()` in `saveBridge3ds.ts` — sets `fullscreen=true`, hides all chrome (`showStatusBar=false`, `showFilterBar=false`, `displayTitleBars=false`), and forces 1x resolution. The `XDG_CONFIG_HOME` env var points Azahar to this config. Now the 400×480 Xvfb display matches the render area exactly.

### 2. Input Not Working — FIXED

**Root cause:** `LIME3DS_KEY_MAP` sends X11 keys (arrow keys, 'x', 'z', etc.) via xdotool, but Azahar's default config expects different keys (T/G/F/H for D-pad, A/S for A/B buttons). The Qt key codes didn't match what xdotool was sending.

**Fix:** `seedAzaharConfig()` translates the xdotool key names from `LIME3DS_KEY_MAP` to Qt key codes and writes them into the pre-seeded `qt-config.ini`. Both D-pad buttons AND circle pad analog are mapped to arrow keys so movement works in all Gen 6/7 contexts.

### 3. Touch Screen Support — FIXED (backend)

**Fix:** `InputInjector.handleTouch({ x, y })` converts bottom-screen coordinates (0–320, 0–240) to Xvfb pixel positions by adding the layout offset (x+40, y+240) and executes `xdotool mousemove` + `click 1`. `StreamSession.handleInputMessage()` now handles `{ action: 'touch', x, y }` messages.

**Frontend:** `StreamPlayer.tsx` has a transparent overlay (`z-[5]`, below TouchControls at `z-10`) that captures taps/drags on the video. `clientToBottomScreen()` handles object-fit:contain letterboxing math to convert client coordinates → video-space → bottom-screen coordinates. Sends `{ action: 'touch', x, y }` over the DataChannel. Supports `onTouchMove` for drag interactions (Pokemon Amie, etc.).

### 4. Audio Lag (Minor)

Audio has noticeable latency. This is a known issue with the FFmpeg pulse → opus → RTP pipeline. The same latency exists for mGBA streams but it's less noticeable for slower GB games.

**Fix approach:**
- Reduce FFmpeg audio buffer sizes
- Try lower opus bitrate
- Consider disabling audio for 3DS streams if it's too distracting

### 5. Azahar Qt Config Pre-seeding — DONE

Implemented as `seedAzaharConfig()` in `saveBridge3ds.ts`. Generates a minimal `qt-config.ini` dynamically from the `EmulatorConfig` keyMap (translating X11 key names → Qt key codes). Sets fullscreen, hides chrome, maps circle pad + D-pad to arrow keys, disables pause-on-background.

Written to `<tempDir>/azahar-config/azahar-emu/qt-config.ini`, with `XDG_CONFIG_HOME` set to the `azahar-config` dir.

## Architecture Reference

```
StreamSession (server/src/services/streamSession.ts)
  ├── Xvfb virtual display (set to windowSize from emulatorConfigs)
  ├── Azahar process (spawned with XDG_DATA_HOME for save bridging)
  ├── FFmpeg video (x11grab from Xvfb → VP8 → RTP)
  ├── FFmpeg audio (pulse capture → Opus → RTP)
  ├── InputInjector (xdotool → Xvfb display)
  └── MediaMTX relay (RTP → WebRTC → browser)

Save Bridging (server/src/services/saveBridge3ds.ts)
  ├── Title ID lookup (game name → 3DS title ID)
  ├── Creates: <tempDir>/azahar-data/azahar-emu/sdmc/Nintendo 3DS/.../title/<id>/data/00000001/main
  ├── Creates: .../00000001.metadata (16 bytes, required by Azahar)
  └── Sets XDG_DATA_HOME=<tempDir>/azahar-data on emulator spawn

Emulator Config (server/src/services/emulatorConfigs.ts)
  └── 'azahar' entry: binary path, window size, key map, soft reset combo
```

## Key Files

| File | What it does |
|------|-------------|
| `server/src/services/streamSession.ts` | Xvfb + emulator + FFmpeg + WebRTC lifecycle |
| `server/src/services/saveBridge3ds.ts` | 3DS save directory bridging |
| `server/src/services/emulatorConfigs.ts` | Emulator configs including window size, key map |
| `server/src/services/inputInjector.ts` | xdotool-based keyboard input to Xvfb |
| `server/src/services/sessionManager.ts` | Native play sessions (non-streamed) |
| `server/src/routes/stream.ts` | Stream API endpoints |
| `server/src/routes/launcher.ts` | Play/preview API endpoints |
| `client/src/components/launcher/StreamPlayer.tsx` | Frontend video + controls |
| `client/src/components/launcher/TouchControls.tsx` | Touch/gamepad input UI |

## Future: Shiny Hunt Automation

The emulator setup was designed with future hunt automation in mind:
- `XDG_DATA_HOME` isolation enables multiple Azahar instances with separate saves
- Xvfb headless mode is already working (just needs correct window sizing)
- Shiny detection approach: external C++ binary reads `/proc/<pid>/mem` to find emulated 3DS RAM, checks battle state + personality values
- Input via xdotool to Xvfb display (same as streaming, no touch needed for hunts)
- See `docs/superpowers/specs/2026-04-02-gen67-emulation-design.md` for the full architecture
