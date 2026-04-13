# Alacrity

Pokemon shiny hunting automation platform + collection tracker. Combines multi-instance emulator farming with a web dashboard for monitoring hunts, managing saves, and tracking a living dex.

## Architecture

- **Desktop shell** (`src-tauri/`): Tauri 2 (Rust). Bundles the client, spawns the server as a sidecar (`binaries/alacrity-server`), and ships seed data via `tauri.conf.json` resources. Product name is **Alacrity**; the folder is Tauri's default convention.
- **Frontend** (`client/`): React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui. No state library — just hooks + an in-memory API cache (5-min TTL). Real-time hunt logs via SSE (EventSource).
- **Backend** (`server/`): Express 5 + TypeScript + SQLite (`bun:sqlite`, WAL mode). Runs as a compiled Bun sidecar inside Tauri. Spawns emulator child processes, parses binary save files, handles 3DS FTP sync.
- **Hunt Scripts** (`scripts/`): C++ binaries (`shiny_hunter_core`, `shiny_hunter_wild`, `shiny_hunter_egg`) and Lua scripts for mGBA automation. Instances log to `hunts/hunt_N/logs/`.
- **Saves** (`saves/`): Library of save files organized by source (3ds/Checkpoint, pksm banks, manual uploads).

## Running

```bash
# Full desktop dev loop (spawns client on 5173 + sidecar server on 3001)
cd src-tauri && bun run tauri dev
```

## Database

SQLite at `data/pokemon.db` (root). Schema in `server/src/schema.sql`. The Tauri bundle ships a seeded copy via the `../data/pokemon.db` → `data/pokemon.db` resource mapping in `tauri.conf.json`.

Key tables: `species` (1025 Pokemon from PokeAPI), `pokemon` (caught/collected), `hunts` + `hunt_logs`, `save_files`, `shiny_availability`.

Seeding: `server/src/seed.ts` fetches from PokeAPI in batches of 50. Runs automatically if DB is empty on startup.

## Key Patterns

- API routes live in `server/src/routes/` — one file per resource (species, pokemon, hunts, saves, sync).
- Services in `server/src/services/` — binary parsers (gen1Parser, gen2Parser, saveParser), FTP client (ftpSync), constants (pkConstants).
- Frontend pages in `client/src/pages/` — Pokedex, HuntDashboard, SaveManager, Stats.
- API client at `client/src/api/client.ts` — wraps fetch with caching + cache invalidation on mutations.
- Hunt lifecycle: `stopped → running → (hit | stopped)`. Polling every 2s. Shiny detection via "!!!" marker in logs. Push notifications via ntfy.sh.
- PokemonGrid uses TanStack React Virtual for virtualized rendering.
- All SQL uses prepared statements.

## Hunt System

Hunts spawn 16-30 parallel emulator instances (mGBA headless or C++ binaries). Each instance gets its own ROM copy + save in `hunts/hunt_N/instance_N/`. Logs are tailed via file watching for SSE streaming. On shiny hit, save state filename encodes DVs (e.g., `SHINY_Pikachu_A14_D10_Sp10_Sc10.ss1`).

## 3DS Integration

Network discovery scans local subnet for FTP (ports 5000/5001/21). Syncs Checkpoint backups and PKSM banks. Can push save states back to 3DS after catching a shiny in mGBA.

## No Tests

No test framework is set up. TypeScript + ESLint are the only checks.

## Git Workflow

Prefer **feature branches on the main checkout** over `git worktree`. Alacrity's data directories (`saves/`, `roms/`, `hunts/`, `data/pokemon.db`, `config.json`, `node_modules/`) are all gitignored and per-checkout. Worktrees isolate code but split your 9 GB ROM library and active DB across checkouts, which is almost always more pain than parallel isolation is worth. Only reach for a worktree when you actually need two Alacrity dev sessions running simultaneously or genuinely parallel features.

Default workflow:
```bash
git checkout -b feature/whatever  # from main
# work, iterate — saves/ROMs/DB are right there
git commit -am "..."
git checkout main && git merge feature/whatever
```

## Documentation

- `notes/shiny-hunt-guide.md` — Full reference for the hunt system: how shiny detection works, engine comparison (mGBA vs core), all hunt scripts, how to set up/test/run hunts, post-shiny workflow, writing new Lua scripts, and troubleshooting.
- `notes/gen1-transfer-pikachu.md` — Gen 1→7+ transfer notes: nature control via EXP mod 25, what gets preserved on transfer.

## Current Priorities

See `TODO.md` for the active roadmap.

## Style Notes

- Path alias: `@/*` maps to `client/src/*`.
- Pokemon Red theme (custom CSS vars in `client/src/index.css`).
- shadcn components in `client/src/components/ui/` (base-nova style).
