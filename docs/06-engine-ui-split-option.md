# The middle path: Cardinal's engine, our UI

Written 2026-10-14 in answer to "is the canvas set in stone?" Short answer:
no. There is a real option between wrapping Cardinal's canvas (document 01,
option A) and writing a synth from scratch (option C). Licence is not what
blocks it. Effort is. This document lays out the facts, the cost, and a way
to decide without betting the project on it.

Tags: **[SOLID]** read from the Rack or Cardinal source at the pinned
commits, or from 4ms's published SDK docs; **[PLAUSIBLE]** my inference or
estimate.

## 1. Licence: not a blocker

**[SOLID]** Everything in the Cardinal binary is GPLv3-or-later or more
permissive. The GPL explicitly permits modifying the program, replacing its
user interface, and distributing the result, provided the source is
published under the same terms. That is already our plan (document 04).

Two side constraints survive, both minor:

- Panel artwork under "no derivatives" terms (Impromptu, Orbits) must be
  shown unmodified. An HTML page that draws the SVG as-is and places
  controls on top does not modify it. Cardinal's own dark-mode recolouring
  was granted to Cardinal by specific authors (Mutable, Befaco); we would
  not inherit that for our own recolouring, so we do not recolour panels.
- Present it as built on Cardinal and VCV Rack, not as either.

## 2. What the code actually separates

**[SOLID]** Rack is already split into an engine and an app:

- The engine has a small, complete API: `addModule`, `removeModule`,
  `addCable`, `removeCable`, `setParamValue`, `getParamValue`, `toJson`,
  `fromJson`, `stepBlock` (`src/Rack/include/engine/Engine.hpp`). A patch is
  JSON. Modules are DSP objects with numbered params, inputs, outputs and
  lights. Nothing in the engine draws.
- Every module's panel is a `ModuleWidget` subclass whose constructor places
  widgets. Those widgets are introspectable: `getParams()`, `getInputs()`,
  `getOutputs()` return widgets that each carry a `paramId` or `portId` and a
  `box` (position and size in panel pixels), and `setPanel` takes the panel
  SVG (`include/app/ModuleWidget.hpp`, `ParamWidget.hpp`, `PortWidget.hpp`,
  `widget/Widget.hpp`). Panel SVGs are files in each plugin's `res/`.
- **Cardinal ships a headless build.** `HEADLESS=true` produces
  `plugins-mini-headless.a` and a DSP-only Cardinal that links
  `RemoteNanoVG.cpp` and `RemoteWindow.cpp` in place of the real UI
  (`src/Makefile.cardinal.mk`, `plugins/Makefile`). This is how the
  CardinalMiniSep variant runs DSP in one process and the UI in another.
  The engine without a window is a supported, tested configuration, not a
  hack we would invent.

So "Cardinal's engine in WebAssembly with no C++ UI, driven from JavaScript"
is a build that upstream half-provides already.

## 3. Someone has done the hard version: 4ms MetaModule

**[SOLID]** The MetaModule is Eurorack hardware that runs VCV Rack modules
(Befaco, Bogaudio, Valley, ChowDSP, HetrickCV, NonlinearCircuits and about
200 third-party modules) with its own screen UI. Its public plugin SDK
describes the approach:

- Plugin authors rebuild the Rack C++ sources against a re-implemented Rack
  API; the `ModuleWidget` code runs and the SDK records element positions.
- "Param, Jack, and Light widgets are drawn with the MetaModule engine, not
  with nanovg." Panels are PNGs converted from the SVGs.
- Any other widget is marked **dynamic**: it gets a pixel buffer the size of
  its box, the module's own `draw()` code runs each frame, and "calls to
  nvg* functions end up rendering to the pixel buffer." A subset of nanovg
  is implemented; SVG and texture calls are not; text wrapping differs;
  frame rate is low on their hardware.
- A module's `appendContextMenu()` items appear in the MetaModule's native
  menu.

Sources: https://github.com/4ms/metamodule-plugin-sdk (README,
docs/graphic-displays.md, docs/context-menus.md).

Two things follow. First, the engine/UI split works at scale on third-party
modules nobody rewrote. Second, the one hard part, custom-drawn displays,
has a known solution: run the module's drawing code against a recording
nanovg and replay it. In a browser that replay target is Canvas 2D, whose
API (paths, fills, strokes, text, transforms) is the same shape as nanovg.
**[PLAUSIBLE]** That mapping is closer than MetaModule's, which had to
target an embedded GUI toolkit.

## 4. What the middle path would be

Call it **option B+**. One WebAssembly module, built headless from our
Cardinal fork, exposing a small C API to JavaScript. Everything the user
sees is HTML, SVG and Canvas 2D:

| Layer | Source | Status |
|---|---|---|
| Audio engine, modules, patch load/save, MIDI | Cardinal headless WASM, unchanged DSP | [SOLID] exists |
| Bridge: create module by slug, add/remove cable, set/get param, read lights, load/save patch JSON, step | ~500 to 1,500 lines of C++ over Rack's Engine API plus Emscripten bindings | [PLAUSIBLE] bounded |
| Panel layout per module: panel SVG path plus every knob, port, switch, light with position, size, type, default, label | generated by instantiating each `ModuleWidget` against stub nanovg and walking its children; emitted as JSON at build time or on demand | [PLAUSIBLE] API supports it; the stub-window path needs the spike |
| Standard controls | our HTML/SVG knobs, sliders, buttons, ports, lights; touch-first, any size | ours to design |
| Cables | our SVG, drawn by us: labelled by signal type and line style, not hue | ours; fixes the protanopia problem at the root |
| Custom displays (Scope, Clocked's BPM, Surge displays, Dexter) | MetaModule's trick: module `draw()` runs against a recording nanovg in WASM, commands replay onto a per-widget Canvas 2D | [PLAUSIBLE] the riskiest piece; some displays will need hand-written HTML replacements |
| Context menus | call `appendContextMenu` with a recording `Menu`, render the items as an HTML sheet, callbacks run in WASM | [PLAUSIBLE] Rack menu items are plain objects with text and an action |
| Rack layout on a phone | ours: one module per screen width with swipe, or a zoomable board, or both; portrait becomes possible | the whole point |

What option B+ unlocks for the educational goal, which option A cannot:

- Knob values readable live, so explain text rewrites itself as in parallax.
- Known selection, so help is contextual.
- Lesson highlighting of a specific knob or cable.
- Cables and ports labelled by signal type; no colour dependence anywhere.
- Touch targets, type size and layout chosen for a phone, including portrait.
- MIDI, recording, patch library and lessons unchanged from option A; they
  live in the shell either way.

## 5. What it costs, honestly

- **Time.** Option A's shell is weeks of work. Option B+ is months: the
  bridge, the layout generator, the control library, the cable editor, the
  display replay, menus, and then per-module fixes where replay fails. My
  estimate for a usable first version on the Mini set plus additions is
  three to six months of steady part-time work with Claude doing the
  typing. [PLAUSIBLE, and the kind of estimate that is usually optimistic]
- **Toolchain.** It needs our own Emscripten build of Cardinal from day one.
  Option A can start from the stock Mini files already hosted at
  minicardinal.kx.studio. Document 03 already commits us to a custom build
  for the module additions, so this cost arrives anyway, just sooner.
- **Fidelity.** Some displays will not replay cleanly (MetaModule's docs
  list text wrapping, clipping and missing nanovg calls). Each such module
  needs either a hand-written HTML display or a "no display" badge. Surge's
  modules are the heaviest users of custom drawing in our set.
- **Upstream drift.** Cardinal moves; a bridge over Rack's public engine API
  is stable, but the stub-nanovg and menu recorders touch internals and
  will need care on each upstream update.
- **Audio thread.** Unchanged from option A: ScriptProcessorNode on the main
  thread, unless we also take on the AudioWorklet work. The HTML UI adds
  layout and paint load to that same thread, so a heavy rack view could
  glitch audio more than the C++ canvas does. Keep the rack view cheap.

## 6. What it does not cost

- No licence risk beyond what public distribution already carries.
- No loss of the module library: the DSP code is untouched.
- No throwaway work from option A: the PWA, lessons, module help, MIDI
  interposer, WAV and MIDI export, patch library and all research carry
  over unchanged. Only the rack view changes.

## 7. Recommendation

Do not choose yet. Run one spike, then choose with evidence:

**Spike: headless Mini to WASM with a JS bridge, plus layout extraction for
five modules.** Build Cardinal Mini headless for Emscripten (the Makefile
already supports both flags; whether they combine cleanly is the first
thing we learn). Export a C API that loads a patch JSON, sets a param, and
reports a light. Instantiate the `ModuleWidget` for Fundamental VCO, VCF,
ADSR, Scope and Plaits against the stub window and dump their widget boxes
to JSON. Render one of them as HTML with working knobs.

Pass criteria: audio plays from a JSON patch; a knob in HTML changes the
sound; four of five layouts extract without crashing; Scope's display
either replays through a recording nanovg or is clearly a hand-write.

If it passes, option B+ becomes the rack view and the UX brief's section 2
constraint is lifted: the brief's screens stay, the canvas becomes ours,
portrait becomes a layout question instead of a prohibition. If it fails on
the headless-plus-WASM combination or on widget instantiation, option A
proceeds exactly as planned and nothing is lost but the spike.

Sequence that protects shipping: option A's shell first, because every
piece of it survives either outcome; the spike alongside; the rack view
decision after. The spike can run in this session once the Emscripten
toolchain and Cardinal's dependency bootstrap are shown to work here, which
is itself unverified.
