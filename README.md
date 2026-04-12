# Alacrity

> A self-hosted shiny hunting automation platform and living dex tracker for Pokémon emulators.

**Status:** Early alpha — under heavy development. Expect breaking changes.

Alacrity is a desktop application that automates Pokémon shiny hunting across multiple emulator instances while tracking your collection, saves, and playthroughs in one unified dashboard. It runs entirely on your machine — no cloud, no telemetry, no account required.

## Features

- **Multi-instance hunting** — Spawn 16–30 parallel emulator instances and detect shinies automatically
- **Collection tracking** — Parse save files across Gen 1–7, build a living dex from your actual saves
- **Save library** — Organize catches, checkpoints, and playthroughs with git-tree timeline visualization
- **Route-by-route guide** — Walkthrough data for every location, with encounter tables and collection progress
- **3DS sync** — Discover 3DS consoles on your network, sync Checkpoint backups and PKSM banks over FTP
- **Hunt dashboard** — Live logs, progress metrics, push notifications via ntfy.sh and native OS alerts

## Supported Games

Gen 1 (R/B/Y) · Gen 2 (G/S/C) · Gen 3 (R/S/E/FR/LG) · Gen 4 (D/P/Pt/HG/SS) · Gen 5 (B/W/B2/W2) · Gen 6 (X/Y/OR/AS) · Gen 7 (S/M/US/UM)

## Requirements

You provide your own:

- **ROMs** — Alacrity does not distribute copyrighted game files
- **Emulators** — mGBA, melonDS, Azahar (downloaded separately)
- **BIOS files** — DS/3DS emulation requires firmware dumped from your own hardware

## Architecture

- **Desktop shell:** Tauri 2 (Rust)
- **Backend:** Bun + Express + SQLite (bun:sqlite) running as a sidecar
- **Frontend:** React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui
- **Hunt engine:** Custom C binaries linking against libmgba for headless automation

## Disclaimer

Alacrity is not affiliated with, endorsed by, or connected to Nintendo, Game Freak, or The Pokémon Company. "Pokémon" and Pokémon character names are trademarks of Nintendo. This project is provided for personal use with legally owned game files.

## License

GPL-3.0 — see [LICENSE](LICENSE)
