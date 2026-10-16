# Cardinal Web: feasibility and architecture

Written 2026-10-14 from the live Cardinal web build (v26.02, published
2026-02-28 at cardinal.kx.studio/live), the Cardinal and DPF source trees
as of 2026-07-28, and the browser-support references listed at the end.

Every claim is tagged:

- **[SOLID]** verified today by downloading the build, reading the source,
  or reading a primary reference.
- **[PLAUSIBLE]** my inference or a secondary source. Treat as a hypothesis
  until tested on a real device.

## 1. The ask, restated

An installable mobile-first PWA of Cardinal that:

1. mostly behaves like the existing web build;
2. is designed for touch and small screens from the start;
3. teaches modular, with module documentation one tap away;
4. runs with or without MIDI hardware;
5. exports MIDI and WAV.

## 2. What the existing web build actually is

**[SOLID]** It is the desktop Cardinal program compiled with Emscripten.
Nothing about it is web-native except the loader page. Specifically:

| Fact | Evidence |
|---|---|
| The whole Rack UI (menus, module browser, every module panel, cables) is C++ drawn with nanovg on a GLES2 canvas. There is no HTML UI to restyle. | `src/override/Window.cpp`, `src/emscripten/CardinalNative.html` (a 7.7 KB shell with one `<canvas>`) |
| Single-threaded. No pthreads, no SharedArrayBuffer. | loader has 0 references to `SharedArrayBuffer`; `Makefile.base.mk` drops `-pthread` on WASM |
| Audio runs on the main thread through the deprecated `ScriptProcessorNode`, not an AudioWorklet. UI work and audio compete for one thread. | `dpf/distrho/src/jackbridge/WebBridge.hpp` line 136 |
| MIDI in and out use the Web MIDI API. Audio input uses `getUserMedia`. | `WebBridge.hpp` lines 38, 447, 491 |
| Touch is emulated as a single mouse pointer. First touch point becomes a mouse press; no pinch, no long-press, no second finger. | `dpf/dgl/src/pugl-extra/wasm.c` lines 460-563 |
| The page locks orientation to landscape and forbids pinch-zoom of the page. | `Window.cpp` line 246, viewport meta in the shell |
| Patches persist in IndexedDB only when the user picks "Save persistent browser data" from the File menu. Open and Save use a hidden file input and an anchor download. | `src/CardinalCommon.cpp` lines 640, 936; `src/override/MenuBar.cpp` line 276 |
| Carla and Ildaeil (plugin hosting, MIDI-file playback) are excluded from the web build. | `plugins/Makefile` lines 259-263 |
| Memory starts at 64 MB and may grow to 2 GB. | loader: `INITIAL_MEMORY=67108864`, `maximum: 2147483648/65536` |

**[SOLID]** Download and memory footprint of the full build:

| File | On the wire (brotli) | Decompressed in RAM |
|---|---|---|
| CardinalNative-v26.02.wasm | 17.1 MB | 100.5 MB |
| CardinalNative-v26.02.data (panels, fonts, manifests) | 63.4 MB | 162.6 MB |
| CardinalNative-v26.02.js | 6.6 MB | 6.6 MB |
| Total before the engine allocates its own heap | about 87 MB | about 270 MB |

**[SOLID]** The maintainer's own framing, from the single tracking issue
(DISTRHO/Cardinal #287): the web build is "for playground and testing and
fun, and not all that serious." User reports in that thread call touch
"unusable" (Feb 2024) and report that on a Samsung A54 you cannot pan the
canvas or delete modules (Aug 2025).

## 3. Hard stops

These are not design problems. They are walls.

1. **iPhone and iPad cannot see MIDI hardware in a browser.** [SOLID]
   Safari has never shipped the Web MIDI API. caniuse lists every iOS
   Safari version through 26.5 as unsupported, and WebKit bug 107250 has
   been open since 2013 with no movement since 2022. Every browser on iOS
   is WebKit underneath, so Chrome on iPhone has the same limit.
   Requirement 4 ("with MIDI gear") is Android, Windows, macOS, Linux and
   ChromeOS only. "Without MIDI gear" works everywhere.

2. **The full build almost certainly will not run on iOS at all.**
   [PLAUSIBLE, strong] WebKit bug 269777 (Feb 2024) reports about 300 MB
   of RAM reliably available to WebAssembly pages on iOS 17. The full
   build needs about 270 MB before the engine allocates anything. Expect
   crashes or reloads. The Mini variant (section 5) is the only credible
   iOS path and its size is unmeasured until we build it.

3. **GitHub Pages cannot host the full build.** [SOLID] GitHub rejects any
   file over 100 MB in a push. The wasm is 100.5 MB and the data file is
   162.6 MB. Hosting the full build means another host for the large
   assets (Cloudflare R2, Netlify, a VPS) or splitting the data file at
   build time. The Mini build may fit; unmeasured.

4. **We cannot point our page at cardinal.kx.studio's files.** [SOLID]
   Their server sends no `Access-Control-Allow-Origin` header, so a page on
   another origin cannot fetch the wasm or data. We must host our own copy
   or our own build.

5. **The patching UI is, and will stay, the desktop Rack UI.** [SOLID]
   Module panels are compiled C++. A "mobile-first UI" can only wrap it
   (section 6, option A) or improve its touch handling in a C++ fork
   (option A+). Replacing it with HTML means redrawing every module panel
   by hand, which is a rewrite, not a port.

6. **Audio glitches on phones are structural.** [PLAUSIBLE, strong]
   Main-thread `ScriptProcessorNode` audio with the whole UI on the same
   thread will click under load on mid-range phones. The fix (AudioWorklet
   plus threads) is an upstream-scale change in DPF, needs
   SharedArrayBuffer, and therefore COOP/COEP headers, which GitHub Pages
   cannot set (a service-worker workaround exists). Not a first-year
   project for us.

## 4. Licensing

**[SOLID]** The combined Cardinal binary is GPLv3-or-later (docs/LICENSES.md).
The GPL triggers on distribution. A private PWA used only by you is not
distribution; no source-offer obligation. If you ever share the URL, the
shell plus any Cardinal modifications must be offered under GPLv3+. The
repo being private is fine either way. The one Cardinal rule that does not
bind us: "online access is strictly forbidden in Cardinal" is their project
policy for the C++ code, not a license term, so our HTML shell may fetch
documentation from the network.

## 5. Which Cardinal variant

**[SOLID]** When built for WASM, `make` produces two web targets:
CardinalNative (everything, what kx.studio hosts) and CardinalMini.
CardinalMini has a hand-picked module list in `plugins/Makefile`
(`MINIPLUGIN_FILES`): Fundamental (VCO, VCF, VCA, ADSR, LFO, Noise,
Random, Quantizer, Scope, Mixer, Merge/Split/Sum, MidSide), Bogaudio
(VCO, VCF, VCA, LFO, AD, Noise, Offset, S&H, switches, Unison), Surge XT
(VCO, VCF, Delay, FX, LFO, Mixer, ModMatrix, Quad AD/LFO, Waveshaper,
EG×VCA), Audible Instruments Plaits, Valley Dexter and Interzone, Mockba
oscillators and mixers, Aria Spleet/Swerge, and Cardinal's Host Audio,
Host CV, Host MIDI family, Host Time, Text Editor. Polyphony throughout.

**[SOLID, measured 2026-10-14]** The Mini web build (v26.02, same date as
the full build) is hosted at https://minicardinal.kx.studio/, which I missed
on the first pass. Its footprint:

| File | On the wire (brotli) | Decompressed |
|---|---|---|
| CardinalMini-v26.02.wasm | 3.9 MB | 32.5 MB |
| CardinalMini-v26.02.data | 1.4 MB | 3.0 MB |
| CardinalMini-v26.02.js | 3.9 MB | 3.9 MB |
| Total | about 9 MB | about 40 MB |

That is roughly one tenth of the full build in memory and one ninth on the
wire. It fits GitHub Pages with room to spare and sits far below the iOS
WebAssembly memory ceiling, so hard stops 2 and 3 above do not apply to the
Mini variant. The module additions in document 03 and the extras in document
04 will grow it; each is measured on our first build.

**[SOLID]** For a learner, Mini is the better teaching set anyway: one of
each core module type, from several authors, instead of 1,000-plus modules.

## 6. Architecture options

### Option A: HTML shell around the stock Cardinal WASM [recommended first]

We build and host the Cardinal WASM unchanged, and write everything new in
HTML/JS around the canvas:

- PWA manifest, service worker, install prompt, offline cache of the
  wasm/data files, versioned updates. [SOLID, standard web work]
- First-run onboarding, a "lesson" panel and per-module help drawer.
  The help drawer reads the bundled `PluginManifests/*.json` files out of
  the Emscripten virtual FS (`Module.FS`) for name, description and
  `manualUrl`, and opens manuals in an in-app frame or new tab.
  [PLAUSIBLE: the manifests are in the data file; that the fields are
  populated for every bundled module is unverified.]
- MIDI device picker and status (shell-side Web MIDI, same permission the
  engine already asks for). [SOLID on Chromium browsers; impossible on iOS]
- **WAV export, shell-side.** `Module.WebAudioBridge.audioContext` and
  `.processor` are reachable from page scripts, so the shell can attach a
  recorder to the engine's output node and write a 16/24-bit WAV in JS.
  This does not depend on any Cardinal module. [SOLID that the objects are
  exposed; PLAUSIBLE that recording from the processor node is glitch-free
  on phones, since it shares the main thread.]
- **MIDI export, shell-side.** Cardinal has no MIDI-file writer. The
  engine sends MIDI through Web MIDI output ports (`port.send` in
  WebBridge.hpp). The shell can register a virtual output or wrap the
  real ports, log timestamped messages, and write a Standard MIDI File.
  [PLAUSIBLE: feasible in principle; wrapping `MIDIOutput.send` from the
  page before the engine grabs the ports needs a prototype.]
- Patch library with explicit save/load instead of the hidden
  "Save persistent browser data" menu item. [SOLID, uses Module.FS + IDBFS]

What A does not fix: the patching surface itself stays mouse-shaped.
Single-touch only, no pinch zoom, right-click menus unreachable without a
long-press mapping. On a phone this is a cramped desktop app with a
helpful frame. On a tablet with a stylus or mouse it is usable today.

### Option A+: A, plus a maintained C++ fork for touch

Add to the DPF wasm backend and Cardinal's Window.cpp: long-press to
right-click, two-finger pan, pinch zoom, larger knob hit areas, a touch
toolbar for delete/duplicate/disconnect. [PLAUSIBLE: each is a contained
change in `pugl-extra/wasm.c` and `src/override/Window.cpp`; the cost is
owning a fork and the Emscripten build forever.]

Build cost [SOLID]: the official CI builds every dependency from source
with the PawPaw scripts on ubuntu-22.04 (`deps/PawPaw/bootstrap-cardinal.sh
wasm`), then `make HAVE_LIBLO=false NOOPT=true`. It is a multi-hour
cross-compile of roughly 100 submodules. Whether it fits this cloud
session's disk and time limits is untested.

### Option B: new HTML UI, Cardinal as a headless engine

Not feasible at hobby scale. Every module's panel and widgets are C++;
there is no module-UI description to render from. CardinalMiniSep
separates DSP and UI processes, but the UI side is still the Rack C++ UI.
[SOLID on the facts; the "not feasible" verdict is my judgement.]

### Option C: drop Cardinal, build a web-native touch modular

Web Audio plus AudioWorklet, HTML/SVG panels, touch-first from day one,
small, iOS-friendly. You lose the Cardinal module library and its sound,
and it is a different, larger project. Listed for completeness; it is not
the stated plan. [SOLID that it is possible; PLAUSIBLE on effort.]

## 7. Recommendation

Option A on the **Mini** variant, with A+ touch work as a later, separate
decision. Reasons:

- It is the only path where everything new is HTML/JS, which matches
  "mostly like the web version" and keeps the Cardinal engine untouched.
- Mini is the only variant with any chance on iOS and on GitHub Pages.
- WAV and MIDI export, module help, onboarding and MIDI device handling
  all live in the shell regardless of variant, so that work carries over
  if we later swap in the full build for desktop browsers.

Scope statement to accept up front: on phones this will be a learning and
sketching tool, not a performance instrument. The deeper the patch and the
cheaper the phone, the more audio will click. On Android with a mouse or
stylus, and on laptops, it should be solid.

## 8. Open questions I can answer with work, in order

1. Build CardinalMini for WASM with our module additions and measure it.
   The stock Mini is already measured (about 40 MB decompressed), so this
   is now about the delta, not the gate. Untested whether this session's
   container can complete the build.
2. Load the stock full build locally in headless Chromium and confirm
   `Module.WebAudioBridge` is reachable and a recorder node can be
   attached. Chromium is installed in this session, so this is testable
   here.
3. Inspect the bundled PluginManifests for `manualUrl` coverage.
4. Prototype MIDI output interception.
5. Only then: real-device testing on your Android phone and, if you have
   one, an iPad. I cannot do that from here.

## 9. Protanopia

Carried over from CLAUDE.md and binding on the shell: no state by hue
alone. The Rack UI inside the canvas is Cardinal's and uses colored cables
for signal types (red/green/blue/yellow). We cannot restyle it in option
A; the shell's help drawer should explain cable colors by signal name and
show the port label, not the color.

## Sources

- Live build: https://cardinal.kx.studio/live (files CardinalNative-v26.02.{js,wasm,data}, Last-Modified 2026-02-28)
- Cardinal source: https://github.com/DISTRHO/Cardinal (commit 0a530b7, 2026-07-28); DPF submodule 461ea6d
- Cardinal web tracking issue: https://github.com/DISTRHO/Cardinal/issues/287
- Cardinal build docs: https://github.com/DISTRHO/Cardinal/blob/main/docs/BUILDING.md
- Cardinal licenses: https://github.com/DISTRHO/Cardinal/blob/main/docs/LICENSES.md
- Web MIDI support table: https://caniuse.com/midi
- WebKit Web MIDI bug: https://bugs.webkit.org/show_bug.cgi?id=107250
- WebKit WASM memory on iOS: https://bugs.webkit.org/show_bug.cgi?id=269777
- GitHub file size limits: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
- GitHub Pages and COOP/COEP headers: https://github.com/orgs/community/discussions/13309
- coi-serviceworker workaround: https://github.com/gzuidhof/coi-serviceworker
