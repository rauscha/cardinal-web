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
- cardinal.kx.studio sends no CORS headers; we must host our own copy.
- iOS Safari has no Web MIDI API. MIDI hardware is Android/desktop only.
- Combined binary is GPLv3+. Private use is fine; sharing the URL means
  offering source.
- `Module.WebAudioBridge.audioContext` is reachable from page scripts, so
  WAV recording can be done in the shell without touching Cardinal.

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
