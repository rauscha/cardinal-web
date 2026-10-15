# Spike B+: a page-side glyph UI on the real Cardinal engine

Date: 2026-10-15. Live at https://andrewrausch.com/cardinal-web/spike-b/
(test build 0.4). Code: `build/cardinal-web-bridge.patch` (fork,
`src/CardinalUI.cpp`) and `shell/spike-b/index.html`. Headless run log:
`docs/spikes/2026-10-15-spike-b-log.txt`; test `docs/spikes/spike-b-test.cjs`.

## 1. What was built

**A correction first.** Docs/08 called `CardinalMini_dsp.wasm` a headless
engine. It is the LV2 plugin binary compiled to wasm, with no `main` and no
audio path; Cardinal's `HEADLESS=true` build would need DPF's standalone
wrapper changed for the web (it blocks in a sleep loop when there is no
UI). Neither was used.

**What was used instead: the existing UI build with the C++ UI switched
off at runtime.** A small C API, exported from the fork's UI file and only
compiled for the web build:

| Function | Does |
|---|---|
| `cardinalweb_ready` | engine and scene exist |
| `cardinalweb_set_ui_hidden(1)` | the C++ draw and idle paths return immediately; the engine keeps running in the audio callback |
| `cardinalweb_load_patch(json)` | writes the text to a temp file and calls Rack's `loadAction`, same path as File > Open |
| `cardinalweb_get_patch_json` | Rack's `toJson` |
| `cardinalweb_get_modules_json` | every module: id, plugin, model, name, description, rack position, params (name, unit, min, max, default, value, display string, snap, switch labels, description), inputs and outputs (name, description, connected), light count |
| `cardinalweb_get_cables_json` | every cable with module and port ids |
| `cardinalweb_set_param` / `get_param` / `get_param_display` | clamped to the parameter's range |
| `cardinalweb_watch(list)` + `read_watched(buf)` | one call per frame fills a float buffer with any set of input voltages, output voltages, light brightnesses or param values |
| `cardinalweb_set_cpu_meter`, `meter_average`, `meter_max` | Rack's engine meter |

Module and cable ids are Rack's 53-bit random ids, which fit a JavaScript
number exactly (Rack masks them to 2^53 on creation).

The page (`shell/spike-b`) builds a card for **every** module from that
metadata, with no per-module art: title, description, primary parameters
as bars (a table picks which are primary for five known modules, the first
four otherwise), the rest behind "More", and IN/OUT jack lists with the
shape code. Five modules get a live glyph on top: SEQ 3 (step grid lit
from the STEP outputs, note names from the CV knobs, running state from
the RUN output), VCO (waveform of the connected output, the note and
frequency implied by the incoming pitch CV), ADSR (a four-second trace of
the envelope output, a level bar, gate state), VCA (output level with the
envelope CV marked), Audio 2 (two meters). Jacks glow when their voltage
is above half a volt and show the value. Cables are drawn from the
engine's cable list.

## 2. Measurements (headless Chromium, software GL, phone viewport)

Solid, from the run log:

| Measure | Value |
|---|---|
| Cards built from engine metadata | 6 of 6 modules, including Text Editor as a generic card |
| SEQ 3 current step read from the engine over 1.4 s | 6, 7, 0, 1, 2, 3 (4 steps per second, correct) |
| Parameter change to engine-visible output change | 38 ms (one audio buffer is 46 ms at 2048 samples, 44.1 kHz) |
| Engine CPU, C++ UI hidden | 3.9 to 4.6 % of real time average |
| Engine CPU, C++ UI shown | 5.1 % average |
| Tempo bar tapped at 90 % | 633 bpm displayed by Rack's own formatter |
| Patch reload through the bridge | works, cards rebuilt, audio kept running |

Not meaningful here and left to the phone: page frame time. Headless
software rendering gives 40 to 130 ms frames; a phone's GPU compositor
will not behave like that, and the stock C++ UI on the same machine was
twice as slow in the same measurement.

Not measured: speaker latency. Param-to-engine is 38 ms; the audio
context adds its output latency on top, about 40 ms on the phone per the
status strip in the main app.

## 3. What the spike settles

1. **The engine can be driven entirely from the page.** Patch in, patch
   out, parameters both ways, any signal readable at frame rate, cables
   known. No change to any module.
2. **The same binary serves both UIs.** The C++ canvas is a runtime toggle,
   so a hybrid is free: glyph cards by default, the stock rack one tap
   away for anything the cards do not cover yet. This removes the
   "months before anything works" risk from option B+.
3. **Generic cards cover modules with no art at all.** The Text Editor got
   a usable card with zero special code. Only the live pictures are per
   module *type*, and five of them took an afternoon.
4. **CPU is not the problem.** Engine around 4 % of real time either way.
   What remains to be measured on a phone is the page's own frame time
   with the engine running, which the headless run cannot tell us.

## 4. What it does not settle

- **Patching by touch** in the page UI: adding and removing cables. The
  bridge has no `add_cable` yet; the obvious route is Rack's
  `patchUtils` or editing the patch JSON and reloading. Not built.
- **Adding and removing modules**: same.
- **Custom displays** (scopes, Plaits model names, the text editor's
  text): not addressed. The honest options are per-type glyphs for the
  common ones and the stock canvas toggle for the rest.
- **Clouds-type modules** (Andrew's example): a granular processor has no
  obvious picture. Likely answer: the generic card plus a meter, and the
  teaching happens in the help drawer, not the glyph.
- **Audio-rate readout**: `read_watched` samples one value per frame, so
  audio signals alias. Meters use smoothed absolute value, which is
  fine for level but not for waveform display; a proper scope needs an
  engine-side ring buffer (small addition to the bridge).
- **iOS**: untested, as everything so far.

## 5. Recommendation

Treat option B+ as **decided in principle, hybrid form**: the page UI is
the product, the stock canvas stays as the fallback view in the same
build. Next steps in order: Andrew's phone read of `/spike-b/` (frame
rate, whether the live cards teach what he hoped); then `add_cable` and
touch patching in the card UI, because connecting is the act he said the
cards make logical; then the help drawer bound to the same metadata
(descriptions are already in the JSON).
