# cardinal-web

## Plan
Build a private, installable, mobile-first web app (PWA) version of Cardinal
(https://github.com/DISTRHO/Cardinal): mostly like the official web build,
designed for touch and small screens, with module documentation one tap
away (Andrew is teaching himself modular), usable with or without MIDI
hardware, and able to export WAV and MIDI.

**Architecture decided 2026-10-14 (Andrew accepted):** Option A on the
Cardinal **Mini** variant. The stock Cardinal WASM runs unchanged on a canvas;
everything new (PWA shell, onboarding, lessons, help drawer, MIDI handling,
WAV and MIDI export, patch library) is HTML/JS around it. Phones are a
learning and sketching surface, not a performance instrument. Read
`docs/01-feasibility-and-architecture.md` (why) and
`docs/02-research-audio-midi-education.md` (audio/MIDI rules, export design,
learning content, module-manual coverage) before proposing anything.

**Option A is proven on the engine side only (phone test 2026-10-15).**
Its touch ergonomics are not settled and the rack-style canvas is not
sacred: Andrew's instruction is to continue on A but not treat it as
settled. The failures are traced to the pugl wasm touch backend and
Rack's mouse-era menus, all in the fork and all ours to change; options,
recommendation (fix the backend first) and the triggers for abandoning the
canvas are in `docs/09-touch-input-findings.md`. Hexen's two-zoom-mode
model is summarised there as a reference, not a template.

**Visual direction (brainstorm 2026-10-15, docs/11):** the modules need
not stay skeuomorphic. On option A only an SVG reskin is possible (legal
for Rack's component library, Fundamental, Bogaudio, Surge, Aria, Cardinal;
Impromptu is ND and Audible is by permission, so leave or fully replace
those). An abstract card or live-glyph design makes option B+ cheaper, not
dearer. Signal types are coded by shape and label first, colour third.
**Andrew's verdict on the mock (2026-10-15):** loves the flat cards, they
work in both orientations, and live glyphs are the better direction for
teaching. That is the target look for anything we draw ourselves; it does
not by itself decide option B+ (see the spike criteria in docs/06).

**Option B+ spiked 2026-10-15 (docs/12), decided in principle as a
hybrid:** the same web build carries a C API (`build/cardinal-web-bridge.patch`,
exported from the fork's UI file) that hides the C++ UI at runtime and
exposes patch load/save, module metadata, params and per-frame signal
readout, plus add/remove cable. `shell/spike-b/` builds glyph cards for
every module from that metadata and is live at `/spike-b/`; cables are
patched by touch (press a jack, drag or lift-scroll-tap the other end;
connected inputs offer Disconnect; cards never move). Engine CPU about
4 % either way; param-to-engine 38 ms. Undo/redo use Rack's history
(cables and parameter gestures). Not yet built: add/remove modules from
the page, saving, custom displays, audio-rate readout. The stock canvas stays as
the fallback view in the same build. `CardinalMini_dsp.wasm` is the LV2
plugin binary, not a runnable headless engine (docs/08 was wrong).

**Mini module list is ours, not upstream's (decided 2026-10-14):** add
slew limiter (Bogaudio SLEW), 8:1 switch (Bogaudio SWITCH81, Fundamental
Sequential Switch), clock and divider (Impromptu Clocked and Clkd, Bogaudio
RGATE) and gate/CV sequencers (Impromptu GateSeq64, Fundamental SEQ 3,
Bogaudio ADDR-SEQ). Recipe in `docs/03-mini-module-additions.md`.

The learning layer has two halves, both first-class: **explanation** (what a
module and each knob does, Parallax-style) and **build tutorials** (how to
make specific sounds, arps and rhythm without a sequencer module, expression
via MIDI CC/MPE, and song or sound design ideas).

Reference repo: `rauscha/parallax` (Andrew's Braids/Plaits/FM PWA, same
origin, same stack constraints). Reuse its PWA manifest and Workbox config,
CSP meta plugin, tap-to-start overlay, Web MIDI device recall, share-URL
pattern, contrast tests and product principles. Do not reuse its
MediaRecorder export (lossy) or its Tone.js transport. Clone read-only with
`git clone --depth 1 https://github.com/rauscha/parallax` when needed.

Development planning happens in a Claude cloud session in this repo.

## Constraints already known
- **Public distribution decided 2026-10-14.** Andrew is on GitHub Free, so
  the repo goes public and the app is GPLv3+ with Source and Licences linked
  from the app. The repo is private only until the first publishable build.
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
- Stock Mini web build (v26.02) is hosted at minicardinal.kx.studio: 32.5 MB
  wasm + 3.0 MB data decompressed, about 9 MB brotli. Fits GitHub Pages and
  iOS memory easily. Its URL patch loading is compiled out (docs/02 §6).
- cardinal.kx.studio sends no CORS headers; we must host our own copy.
- iOS Safari has no Web MIDI API. MIDI hardware is Android/desktop only.
- Combined binary is GPLv3+. Private use is fine; sharing the URL means
  offering source.
- `Module.WebAudioBridge.audioContext` is reachable from page scripts, so
  WAV recording can be done in the shell without touching Cardinal.
- Spikes 2026-10-15 (docs/07): synthetic TouchEvent and WheelEvent from
  page JS drive the canvas after one real tap; synthetic MouseEvents die
  once a touch has been seen. Long-press (2 s) is already a right-click in
  the stock build. The stock File menu loads plain-text `.vcv` patches.
  Plugin manifests are readable at runtime from `/resources/PluginManifests`.

## Build facts (2026-10-15, see docs/08)
- We can build Cardinal Mini for WebAssembly ourselves: `build/build-mini-wasm.sh`
  (Cardinal's PawPaw bootstrap, pinned Emscripten 3.1.27, `make mini`).
  One-time setup about 40 min, incremental builds about 3 to 11 min.
- The module additions are applied by `build/cardinal-web-mini-additions.patch`
  and verified: 66 modules, +0.4 MB wasm, +0.7 MB data.
- `build/cardinal-web-touch-backend.patch` (applied inside `dpf/`) replaces
  the pugl web touch emulation: 450 ms long-press with 10 px slop, right
  press+release so menus get hover, slide-and-lift selects, two-finger pan,
  pinch zoom. Verified headlessly, docs/10. Tunables are `#define`s.
- `build/reskin/generate.py` produces the flat component SVGs (original,
  CC0) that the build script copies over Rack's component library and
  Fundamental's components; `build/cardinal-web-port-shapes.patch` adds the
  jack-shape hook in `src/override/ModuleWidget.cpp`. Both are in build 0.3.
- `build/cardinal-web-bridge.patch` adds the page-side C API (docs/12).
  `CardinalMini_dsp.wasm` in the LV2 bundle is the plugin binary, not a
  headless engine; the headless build path is not used.
- In this cloud session GitHub archive downloads are blocked (git clones are
  not); Emscripten's SDL2 port needs `EMCC_LOCAL_PORTS` pointing at a clone.

## Deployment state (2026-10-15)
- Branch `pages` (orphan) holds test build 0: `site/` with the prebuilt Mini
  plus additions and a minimal shell (`shell/test-build-0/` on this branch
  is the same shell without binaries). `.github/workflows/pages.yml` deploys
  `site/` with actions/deploy-pages on push to `pages` or by manual run.
- Live at https://andrewrausch.com/cardinal-web/ (repo public, Pages on
  GitHub Actions, confirmed by Andrew 2026-10-15). Test build 0.1 loads a
  self-playing arpeggio patch (`shell/test-build-0/startup.vcv`, also the
  fork's `patches/welcome-wasm-mini.vcv`). Only the SIMD build is shipped.
  Test build 0.2 (2026-10-15) adds the touch backend (docs/10). Test
  build 0.3 (2026-10-15) adds flat component graphics (`build/reskin/`),
  shape-coded jacks (`build/cardinal-web-port-shapes.patch`) and the design
  mock at `/mock/` (`shell/mock/index.html`, docs/11 §8); Andrew: loves the
  cards, glyphs better for teaching. Test build 0.4 (2026-10-15) adds the
  engine bridge and the live glyph spike at `/spike-b/` (docs/12); 0.5
  adds cables by touch there (docs/12 §6); 0.6 adds undo/redo (§7).
- Phone result 2026-10-15 (Andrew, docs/08): sound works, audio starts on
  the one tap, engine keeps up with live knob turns, about 10 s first load
  on slow Wi-Fi. Menus: 2 s long-press too long, rows hard to slide over,
  menus close on lift; no touch pan, no pinch zoom. Mechanism and fixes in
  docs/09. The engine is proven; the input layer is not.
- Patch-authoring gotcha: SEQ 3 reads its saved `gates` array as integers;
  JSON booleans disable every step. Resource dirs are copied by directory
  mtime, so after replacing a file under `patches/` delete
  `bin/CardinalMini.lv2/resources/patches` and the `.data` before `make mini`.

## Hosting facts (2026-10-14, see docs/04)
- GitHub Free publishes Pages from public repos only; Pro allows private
  repos; the site is public to anyone with the URL on any personal plan.
- Serving the wasm publicly is GPL distribution: publish the Cardinal fork
  and the shell (GPLv3+) and link Source and Licences from the app.
- GitHub Pages gzips `.wasm` on the fly with `application/wasm` (measured on
  parallax). Site limit 1 GB; git refuses files over 100 MiB; build in CI
  and deploy with actions/deploy-pages rather than committing binaries.
- Candidate extra modules and their licences: docs/04 part A. Avoid in the
  web build: Stoermelder STRIP, Lilac Looper, Bogaudio Analyzer.
