# Spike results: the stock Cardinal Mini web build under headless Chromium

Run 2026-10-15 in the cloud session against the stock v26.02 Mini files
downloaded from minicardinal.kx.studio, served locally, driven by Playwright
with the bundled Chromium (software WebGL). Scripts are in `docs/spikes/`
and can be re-run anywhere Node and Playwright exist. Everything below is
**[SOLID]**: observed, with screenshots.

## What was tested and what happened

| # | Test | Result |
|---|---|---|
| 1 | Load the Mini build at 1280 by 720 | Canvas live in 1.7 s after page load. No page errors. Audio context `running` at 44.1 kHz through a ScriptProcessorNode with a 2048-frame buffer. |
| 2 | `Module.WebAudioBridge` reachable from page scripts | Yes: `audioContext`, `processor`, and sample rate all readable. WAV recording from the shell is confirmed feasible. |
| 3 | Virtual filesystem contents | `/resources/PluginManifests` holds the seven plugin manifests as JSON (Aria, Audible Instruments, Bogaudio, Cardinal, Fundamental, Mockba, Surge). `/userfiles` is mounted (IndexedDB). The shell can read module metadata and manual URLs at runtime. |
| 4 | Real right-click on empty rack | Opens Cardinal's module browser, 53 modules. |
| 5 | Real ctrl+wheel | Zooms the rack. |
| 6 | Load at phone size, 844 by 390 at 2x, touch enabled | Renders crisp at 2x. A real tap starts audio (`running`). |
| 7 | Synthetic `MouseEvent` dispatched from JS before any real input | Ignored. |
| 8 | Synthetic `MouseEvent` after one real click | **Works**: a dispatched right-click opened the module browser. |
| 9 | Synthetic `TouchEvent` after one real tap | **Works**: a dispatched tap on "File" opened the File menu. |
| 10 | Synthetic `MouseEvent` after a real touch | Ignored, by design: the DPF backend removes its mouse handlers once it sees a touch (`pugl-extra/wasm.c`). |
| 11 | Patch import through the stock File menu and the browser file chooser | **Works**: `Moogy.vcv` from Cardinal's own `patches/mini/` (plain-text JSON) loaded and rendered. The file lands in `/userfiles`. |
| 12 | Synthetic `WheelEvent` with `ctrlKey` in the touch context | **Works**: the rack zoomed. Wheel handlers survive the touch switch. |
| 13 | Synthetic long-press: `touchstart`, 2.3 s, `touchend` | **Works**: the ADSR module's context menu opened (ADSR, VCV, Info, Preset). |

| 14 | Synthetic `WheelEvent` without `ctrlKey`, `deltaX` then `deltaY` | **Works**: the rack panned horizontally, then vertically. Two-finger pan can be translated to wheel events. |
| 15 | Synthetic single-touch drag on empty rack | No visible effect (Rack treats it as a selection drag). Pan must go through wheel events. |
| 16 | Fully scripted patch import: synthetic taps on File and Import patch, then a `File` assigned to the created input through `DataTransfer` and a `change` event | **Works end to end**: "Loading patch /userfiles/Lesson.vcv" with no human input. The input is created on demand with id `CardinalDGL_file_open`. |

Screenshots: `docs/spikes/2026-10-15-mini-desktop-1280x720.png`,
`...-phone-patch-import.png`, `...-phone-longpress-menu.png`.

## What this settles for the UX brief (document 05, section 2)

1. **Gesture translation: feasible without touching C++.** A transparent
   layer can drive Cardinal with synthetic touch and wheel events once the
   user has tapped once (which the Start audio button guarantees). The stock
   backend already maps a two-second press to a right-click; our layer can
   shorten that to a normal long-press by sending `touchstart`, waiting, and
   sending `touchend`, turn pinch into ctrl-wheel zoom, and turn two-finger
   drag into plain wheel events for pan. Every gesture in the UX brief's
   table now has a proven path.
2. **Loading a lesson patch: works today from JavaScript alone.** Test 16
   drove the stock File menu with synthetic taps and handed the created file
   input a patch built in memory. It depends on menu coordinates, so it is
   brittle across Cardinal versions and zoom levels; the small exported
   function in our fork (load patch from a string) is the robust form and
   stays planned. But lessons no longer wait on the fork.
3. **Module selection and knob values: still need the bridge.** Nothing in
   the stock build exposes them. The same thin fork bridge that loads
   patches should post selection and parameter changes to the page. This is
   the keystone change for option A and it is small.

## Toolchain status

- Emscripten SDK 6.0.12 installed in the session and `emcc` runs. Brotli,
  gperf and meson installed from apt.
- Cardinal's full submodule tree is being fetched to attempt the Mini
  WebAssembly build with the dependency bootstrap Cardinal's own CI uses.
  Outcome not yet known.

## What still needs a real device

Headless Chromium with software WebGL says nothing about frame rate or
audio glitching on a phone. The numbers on the canvas overlay here (2 to
18 fps) are the software renderer's, not a phone's. Real-device testing
remains the first thing to do once a build is deployable.
