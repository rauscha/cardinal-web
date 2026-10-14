# cardinal-web

## Plan
Build a private, installable, mobile-first web app (PWA) version of Cardinal
(https://github.com/DISTRHO/Cardinal): mostly like the official web build,
designed for touch and small screens, with module documentation one tap
away (Andrew is teaching himself modular), usable with or without MIDI
hardware, and able to export WAV and MIDI.

Architecture is not yet decided. The feasibility study and recommendation
are in `docs/01-feasibility-and-architecture.md` (read it before proposing
architecture). Development planning happens in a Claude cloud session in
this repo.

## Constraints already known
- Repo is private.
- If it is served from `andrewrausch.com/<repo>/` (GitHub Pages), it shares one
  origin with Andrew's other PWAs. The manifest must set an explicit `"id": "./"`
  and relative `start_url` / `scope` (`"./"`), never a literal `"/"`. Never
  change the app's identity after it has been installed.
- Andrew is a protanope: no UI state may be carried by hue alone. Pair color
  with a label, shape, position, weight or luminance.

## Verified facts about Cardinal's web build (2026-10-14, see docs/01)
- It is the desktop C++ UI compiled with Emscripten onto one canvas. There is
  no HTML UI inside it to restyle. Touch is single-pointer mouse emulation.
- Single-threaded; audio via main-thread ScriptProcessorNode. No
  SharedArrayBuffer, so no COOP/COEP headers are needed.
- Full build (CardinalNative v26.02): 100.5 MB wasm + 162.6 MB data
  decompressed (about 87 MB brotli). Both files exceed GitHub's 100 MB
  per-file limit, so the full build cannot live on GitHub Pages.
- cardinal.kx.studio sends no CORS headers; we must host our own copy.
- iOS Safari has no Web MIDI API. MIDI hardware is Android/desktop only.
- Combined binary is GPLv3+. Private use is fine; sharing the URL means
  offering source.
- `Module.WebAudioBridge.audioContext` is reachable from page scripts, so
  WAV recording can be done in the shell without touching Cardinal.
