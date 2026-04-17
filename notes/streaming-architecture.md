# Streaming Architecture (mgba-stream + rtc-relay)

How the "Play" feature streams a live emulator session from the desktop sidecar to a browser/phone client. Touches three native binaries, four files in the Tauri bundle config, and two CI workflows. This doc covers what's wired, why it's wired that way, and what's still open.

## What gets streamed and how

```
┌──────────────────────┐     stdin (JSON button events)     ┌─────────────────────┐
│  Bun sidecar         │  ────────────────────────────────► │  mgba-stream (C)    │
│  directStreamSession │                                    │  - libmgba @ 60fps  │
│                      │  ◄──── stdout (status JSON) ────── │  - VP8 video (vpx)  │
└──────────┬───────────┘                                    │  - Opus audio (opus)│
           │                                                └──────────┬──────────┘
           │ spawn / lifecycle                                         │
           │                                                           │ RTP/UDP
           │                                                           │ to localhost
           ▼                                                           ▼
┌──────────────────────┐                                    ┌─────────────────────┐
│  rtc-relay (Go/Pion) │  ◄──── RTP packets on UDP ──────── │  (loopback)         │
│  - WebRTC SFU        │                                    └─────────────────────┘
│  - signaling via WS  │
└──────────┬───────────┘
           │ WebRTC (DTLS+SRTP)
           ▼
┌──────────────────────┐
│  Browser client       │
│  StreamPlayer.tsx     │
└──────────────────────┘
```

Three processes, two of which are native:

1. **`tools/mgba-stream/mgba-stream`** — our C bridge. Loads a ROM via libmgba, runs emulation, encodes each frame as VP8 (libvpx) and audio as Opus, sends RTP packets to `localhost:<port>`. Reads JSON button events from stdin. Source: `tools/mgba-stream/mgba-stream.c` (672 lines). Built with `make` from a sibling Makefile.

2. **`tools/rtc-relay/rtc-relay`** — our Go program (Pion WebRTC). Receives RTP from mgba-stream on UDP, peers with a browser via WebRTC, handles SDP offer/answer over a WebSocket signaling channel. Replaced an earlier `mediamtxManager.ts` + bundled mediamtx binary; that path is dead and the `tools/mediamtx/` directory is unused.

3. **Bun sidecar** — `server/src/services/directStreamSession.ts` orchestrates. Per session: copies ROM + save into a temp dir, spawns mgba-stream + rtc-relay, manages shutdown, computes save-changed checksum on exit. Exposed via `server/src/routes/stream.ts`.

The mgba-stream binary path is resolved by `paths.mgba` (`server/src/paths.ts:70`), which points at `<resourcesDir>/tools/mgba-stream/mgba-stream`. In dev mode `resourcesDir` is the repo root; in packaged mode it's the Tauri resources dir.

## How the binary is built (and why those specific flags)

The Makefile at `tools/mgba-stream/Makefile` is intentionally similar to `scripts/build-hunters.sh` because both compile against the same libmgba and need the same rpath trick.

**Inputs** (env vars, defaulted for dev convenience):
- `MGBA_SRC` (default `~/mgba`) — mGBA source tree, for headers
- `MGBA_BUILD` (default `$MGBA_SRC/build`) — directory containing built `libmgba.so.X` / `libmgba.X.dylib`

**Compile-time deps** (must be installed locally):
- libmgba built from source against the pinned commit (see "mGBA pin" below)
- libvpx-dev (Linux) / libvpx (Homebrew) — VP8 encoder
- libopus-dev (Linux) / opus (Homebrew) — Opus encoder

**Linker rpath strategy.** The Makefile sets two rpath entries:
- `$ORIGIN` (Linux) / `@loader_path` (macOS) — find libraries in the binary's own directory; this is what packaged/CI builds use after libmgba is copied alongside
- `$(MGBA_BUILD)` — absolute path; preserves the existing dev workflow where you have libmgba built at `~/mgba/build` but no copy alongside the binary yet

The runtime dynamic linker tries entries in order, so old dev binaries with only the absolute rpath keep working *and* new packaged binaries find a bundled libmgba next to themselves.

**Shell-quoting gotcha.** The literal `$ORIGIN` token must reach the linker without expansion. In the Makefile it's written `'-Wl,-rpath,$$ORIGIN'`: `$$` escapes Make → `$ORIGIN` reaches the shell → single quotes prevent shell expansion → linker sees the literal string. If you ever see `RUNPATH: [:/path/to/something]` (empty entry before the colon) when running `readelf -d`, the shell ate `$ORIGIN`.

## How the binary gets into a release

Three places must agree on the path `tools/mgba-stream/mgba-stream`:

1. **`src-tauri/tauri.conf.json` → `bundle.resources`** maps `../tools/mgba-stream/mgba-stream` → `tools/mgba-stream/mgba-stream`. Tauri's bundler validates that the source path exists at bundle time. (It doesn't validate during `cargo check` — but our `check.yml` workflow runs `cargo check` with the build script enabled, which also validates resources, so the path needs to exist there too via stub.)

2. **`.github/workflows/release.yml`**:
   - Linux: builds libmgba (commit `c80f3afd...`), builds hunt binaries, then *separately* builds mgba-stream after `apt-get install libvpx-dev libopus-dev`. Copies libmgba alongside via `readelf` SONAME lookup.
   - macOS: builds libmgba, builds hunt binaries, builds mgba-stream after `brew install libvpx opus`. Copies the dylib alongside, then uses `install_name_tool -change` to rewrite the binary's libmgba reference to `@rpath/<dylib_name>` so the rpath lookup succeeds.
   - Windows: stubs the binary file. The C source uses POSIX headers (`<unistd.h>`, `<strings.h>`, fcntl flags) and won't compile under MSVC. Cross-compiling via mingw is doable but adds significant CI time and isn't a v1 priority.

3. **`.github/workflows/check.yml`** stubs `tools/mgba-stream/mgba-stream` so `cargo check` doesn't fail Tauri's resource-existence validation in PR checks.

## mGBA version pin

The hunt binaries and mgba-stream both link against libmgba commit `c80f3afd7708e2e7d2f0f5175ba21fa2b70a424c` (~0.10.0-599-gc80f3afd7 on master, not a release tag). This is pinned in `release.yml` at the `MGBA_COMMIT` env var. The pin matters because:

- Hunt binaries reference internal `gb/input.h` headers that have changed between mGBA versions
- Bumping the pin requires verifying both the 3 hunt `.c` files and `mgba-stream.c` still compile and behave the same (memory reads, signal handling, save-state semantics)

Don't bump casually.

## Runtime dependencies (the open issue)

`readelf -d tools/mgba-stream/mgba-stream` shows:

| Library | Where it comes from | Bundled? |
|---|---|---|
| `libmgba.so.0.11` | built alongside in CI, copied next to the binary | ✅ yes, via $ORIGIN rpath |
| `libvpx.so.9` | system | ❌ **no** — user's system must have it |
| `libopus.so.0` | system | ❌ **no** — user's system must have it |
| `libc.so.6` | system | n/a (always present) |

Plus libmgba's own transitive deps (`libz`, `libepoxy`, `liblua5.4.so.0`, `libm`) which are inherited from whatever distro the user runs.

**Implication:** the mgba-stream binary that ships in the .deb / .dmg today does *not* run on a clean machine without those codec libraries. The user has to have libvpx9 + libopus0 installed (Ubuntu 24.04 package names; older distros may have libvpx7 instead and won't satisfy the soname).

**Why this is structurally different from the hunt binaries:** hunters only link libmgba, whose transitive deps (zlib, lua, opengl/epoxy) are ubiquitous. Codec libraries are common but not universal — most desktops have them via Firefox/VLC/etc., but it's not guaranteed and version skew bites.

**Current shipping state** (as of the commit that landed this doc): the binary builds in CI and gets bundled, but is *not* self-contained at runtime. On a clean Ubuntu 24.04 install with neither `libvpx9` nor `libopus0` present, launching the Play feature will fail at `dlopen` time with a missing-shared-library error. On a clean macOS install without those libraries available, same. Until one of the options below ships, "works out of the box" is conditional on the user's system.

**Options to fix** (none implemented yet — this is the decision to make):

| Option | Effort | Tradeoff | Cross-platform? |
|---|---|---|---|
| **A. Bundle libvpx + libopus alongside the binary** (mirrors how libmgba is already bundled) | Low — CI step copies 2 .so / .dylib files, existing $ORIGIN/`@loader_path` rpath finds them, `bundle.resources` adds the entries | +~2 MB bundle. Glibc still tethers to Ubuntu 24+ — but that's already true for the whole sidecar, so no new constraint | Linux ✅, macOS ✅ (Windows is moot — binary is stubbed) |
| **B. Static-link libvpx + libopus** at compile time (`-Wl,-Bstatic -lvpx -lopus -Wl,-Bdynamic` in Makefile LDFLAGS) | Medium — Makefile change + CI installs static dev packages (Linux's `libvpx-dev` ships `.a`; macOS Homebrew may need `--build-from-source --HEAD` or vendored `.a`) | Cleanest single binary, no rpath fragility, slightly bigger executable. libmgba stays dynamic (cmake config doesn't easily produce a static libmgba) | Linux ✅, macOS ⚠️ (Homebrew static libs are inconsistent) |
| **C. Declare deb/rpm dependencies** in `tauri.conf.json → bundle.linux.deb.depends: ["libvpx9", "libopus0"]` plus rpm equivalent | Trivial — config-only | Linux package-manager users only. No help for `.dmg` users on macOS. Fragile across distro versions: a user on 22.04 (libvpx7) would have apt refuse to install. Doesn't help anyone running the AppImage either | Linux .deb/.rpm only |
| **D. Do nothing**, document `apt install libvpx9 libopus0` / `brew install libvpx opus` in README | Trivial | "Works for users who happen to have the deps." User-hostile for anyone not already running a streaming-heavy desktop | n/a |

**Recommendation:** option A. Same shape as the existing libmgba bundling, no new patterns to learn, only place that gets touched is `release.yml` (two more `cp` calls) + `tauri.conf.json` (two more resource entries) + this doc. Glibc compatibility is already a constraint of the whole sidecar so it doesn't introduce a new one.

**Why not B as default:** the static-linking approach is technically cleaner but brings its own pain — Homebrew on macOS doesn't ship `.a` files for opus/vpx by default, so we'd need to vendor or build them. For an alpha-stage project, the bundling approach gets to the same user-visible result with less yak-shaving.

**Why not C:** the project ships AppImages in addition to .deb/.rpm, and AppImages don't honor package-manager dependencies. So C only helps a subset of Linux users and doesn't help macOS at all. Worth doing as a *belt-and-suspenders* on top of A, but not as the primary fix.

**Why this doc exists:** the runtime dependency story is non-obvious from reading the code. A future agent looking at `paths.mgba` and `directStreamSession.ts` would see the binary path and assume "if the binary is present, it works" — which is false on most user systems today. Decide before users hit the mismatch.

## What's tracked vs ignored in this directory

`.gitignore` carves out a per-tool exception for the source:

```
tools/*                       # everything in tools/ is ignored by default
!tools/rtc-relay/             # except our Go relay source
tools/rtc-relay/rtc-relay     # but ignore the compiled binary
!tools/mgba-stream/           # except our C streaming source
tools/mgba-stream/mgba-stream # but ignore the compiled binary
tools/mgba-stream/mgba-stream-debug
tools/mgba-stream/libmgba.so* # and ignore any libmgba copies bundled for rpath
tools/mgba-stream/libmgba*.dylib
```

Tracked files in `tools/mgba-stream/`: `Makefile`, `mgba-stream.c`. Everything else is local-build artifact.

## When you change something here, also check…

- **Renaming or moving the binary path**: update `paths.mgba` in `server/src/paths.ts`, `bundle.resources` in `src-tauri/tauri.conf.json`, the build steps in `.github/workflows/release.yml`, the stub in `.github/workflows/check.yml`, and the `.gitignore` rules.
- **Adding more codec libraries**: update the Makefile `pkg-config` line, the Linux apt step + macOS brew step in release.yml, and update this doc's "Runtime dependencies" table.
- **Bumping the mGBA pin**: see "mGBA version pin" — affects hunters too.

## Related docs

- `notes/gen67-stream-tuning.md` — Azahar/3DS streaming notes (separate path; that's not mgba-stream)
- `docs/superpowers/specs/2026-03-31-webrtc-game-streaming-design.md` — original WebRTC design
- `docs/superpowers/specs/2026-04-12-dependency-auto-install-design.md` — broader emulator install system; doesn't currently cover mgba-stream codec deps but option C above would slot in there
- `scripts/build-hunters.sh` — reference for the rpath / libmgba-bundling pattern this Makefile mirrors
