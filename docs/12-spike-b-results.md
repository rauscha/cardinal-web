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

## 6. Cables by touch (added the same day, test build 0.5)

Andrew asked for press OUT, drag to IN, and raised the problem of cards
that live far apart (swapping cards side by side would break the mental
layout). Decision: never move cards; make the gesture work at any distance.

**Bridge additions.** `cardinalweb_add_cable(outModule, outPort, inModule,
inPort)` creates the cable exactly as the stock UI does (a `CableWidget`
that owns the engine `Cable`, next cable colour from Rack's own cycle), so
it also appears in the fallback canvas and saves with the patch; an input
already in use is cleared first, since Rack allows one cable per input.
`cardinalweb_remove_cable(id)` removes through the same widget.

**Interaction (one armed state, three ways to finish it):**

1. **Press a jack** (OUT or IN): it arms, every jack of the other kind
   becomes a target, targets of the same signal shape light brighter, a
   chip at the bottom names the jack and says what to do.
2. **Drag**: a ghost cable follows the finger; near the top (below the
   sticky header) or bottom edge the page auto-scrolls; releasing on a
   target connects. Releasing on nothing keeps the jack armed.
3. **Lift, scroll, tap**: with a jack armed, tap any target anywhere to
   connect. Tap the armed jack or the background to cancel.
4. **Connected input**: tapping it (nothing armed) arms it for re-routing
   and offers Disconnect in the chip. Tapping an OUT then moves the cable.

**Verified headlessly** (`docs/spikes/2026-10-15-cables-log.txt`):

| Step | Result |
|---|---|
| Arm SEQ 3 CV 2 | 19 targets, 8 with the matching shape, chip shown |
| Scroll to VCO, tap FM input | 7 cables, new one SEQ 3 CV 2 → VCO FM |
| Tap the connected FM input | chip names the source and offers Disconnect; Disconnect → 6 cables |
| Mouse drag Clock OUT → Reset IN inside one card | 7 cables, correct ends |
| Drag to the bottom edge and hold | page scrolled 50 → 624 px; lifting on nothing kept the jack armed |
| Arm SEQ 3 CV 2, tap VCA CV (occupied by ADSR) | replaced: ADSR → VCA gone, SEQ 3 → VCA present, count unchanged |
| Tap background while armed | disarmed |
| Audio throughout | running, engine about 4 % |

Not done: undo history for cable edits (Rack's `history::CableAdd` is
easy to add), module add and remove, saving the patch from this UI.

## 7. Undo and redo (test build 0.6)

Rack's own history stack does the work. The bridge now pushes
`history::CableAdd` on connect, `history::CableRemove` on disconnect, and
a `history::ParamChange` when a bar gesture ends (the page remembers the
value at touch-down and commits old and new on release, so a drag is one
undo step, not hundreds). Exposed: `cardinalweb_undo`, `cardinalweb_redo`,
`can_undo`, `can_redo`, `undo_name`, `redo_name`. The page shows the action
name on the buttons ("Undo connect cable", "Redo change parameter") and
also takes Ctrl+Z and Ctrl+Shift+Z with a keyboard attached.

Verified headlessly (`docs/spikes/2026-10-15-undo-log.txt`): connect →
undo → redo moves the cable count 6, 7, 6, 7 with the right button labels;
disconnect then undo restores the cable; a tempo change 2.0 → 3.4 undoes
to 2.0 and the bar follows; redo and undo from the keyboard work; audio
keeps running. Because the actions are Rack's, the stock canvas (the
fallback view) shares the same undo stack.

Not done: module add and remove, saving.

## 8. Plugs, not jacks (test build 0.7)

Andrew's two findings from the desktop: opening a card's "More" section
left the drawn cables where they were, and the model let you draw from a
jack but not pick up an existing cable at either end, which is what hands
do with a real rack.

**Wires now follow the layout.** They are redrawn whenever any card
changes size (a ResizeObserver per card and on the column), on `details`
toggles, resize and orientation change. Verified: with a cable into ADSR,
opening VCO's More section moved the jack by 230 px and the wire end moved
with it in both orientations.

**The patching model is now "you hold a plug":**

| Press on | Means |
|---|---|
| an OUT jack | start a new cable from it (outputs feed many inputs; Rack's rule). The chip says how many cables are already there |
| a free IN jack | start a new cable into it |
| a connected IN jack | pick up the plug that sits in it: the wire dims, a ghost runs from its source; drop on another IN to move the cable, or on an OUT to change its source; Disconnect is offered |
| a drawn cable | the chip names both ends and offers **Move OUT end**, **Move IN end**, **Disconnect** |

Every move and every replace of an occupied input is one Rack
`ComplexAction` ("move cable", "replace cable"), so one undo restores the
previous cable rather than leaving the input empty.

Bridge additions: `cardinalweb_move_cable(cableId, out, in)`; `add_cable`
now records the cables it displaces.

Verified headlessly (`docs/spikes/2026-10-15-move-log.txt`): pick up the
plug in VCO pitch and drop on VCO FM moves the cable (count unchanged);
pick it up again and tap SEQ 3 CV 3 re-sources it; two undos restore the
start; tapping the drawn cable offers the three actions; Move OUT end to
CV 2 works; replacing ADSR → VCA CV with SEQ 3 CV 1 then undo brings the
ADSR cable back; pressing the busy VCA output offers a new cable and
reports two existing. Audio ran throughout.

Still not built: module add and remove, saving.

## 9. Add and remove modules (test build 0.8, 2026-10-16)

**Bridge.** `cardinalweb_get_models_json` lists every module the build can
create (plugin, brand, model, name, description, tags, manual URL; 66 in
the Mini). `cardinalweb_add_module(plugin, model)` does what Rack's own
browser does: create the module and its widget, add both, place it after
the right-most module of the top row (widget positions carry Rack's
2000 HP by 100 row offset, which bit me once), load the user's template
preset, and record one "add module" history step. `cardinalweb_remove_module`
calls Rack's `removeAction`, which removes the cables and the module as one
"delete module" step. Module positions in `get_modules_json` are now
reported relative to the rack origin, matching the patch file.

**Page.** "Add module" opens a bottom sheet: search box, tag chips with
counts (Polyphonic 49, Utility 11, External 9, Oscillator…), and the list
sorted by name with plugin and description. Tapping a row adds the module,
closes the sheet, scrolls to the new card and flashes it. Each card header
has a × that asks "Remove X and its cables? Undo brings it back." Undo and
redo of module changes rebuild the cards. While a chip is open the column
gets extra bottom padding so the last card's jacks can be scrolled above
it (the chip had covered them).

Verified headlessly (`docs/spikes/2026-10-16-module-log.txt`): 66 models,
19 tags; search "filter" finds Filtah and both VCFs; adding Fundamental
VCF puts a seventh card last; VCO Saw → VCF In connects; remove drops to
six modules and six cables; undo restores module, cable and card; two more
undos return to the starting patch. Audio ran throughout.

Not done: saving the patch from this UI, custom displays, audio-rate
readout, the help drawer bound to the metadata (descriptions and manual
URLs are already in the JSON).

## 10. Saving (test build 0.9, 2026-10-16)

No engine change. The bridge's `get_patch_json` is Rack's own `toJson`,
the same plain-text `.vcv` the stock File menu opens, so a saved patch
loads in desktop Cardinal and in the fallback canvas unchanged.

Four layers, all in the page:

1. **Autosave.** Every change (cable, parameter gesture, module add or
   remove, undo, redo) schedules a save 0.8 s later into the browser's
   IndexedDB; the page also saves when it goes to the background. On the
   next load, if the autosave differs from the patch the engine started
   with, a chip offers **Restore** or **Keep this**.
2. **Named library.** Save asks for a name the first time and then saves
   in place; the header shows the name and the last save time, or
   "unsaved changes". The Patches sheet lists saved patches newest first
   with Load, File and Delete, plus New patch (the startup patch).
3. **Files out.** Download writes `Name.vcv`; Share uses the Web Share API
   with the file where the browser supports it (Android Chrome) and falls
   back to download.
4. **Files in.** Import opens the file picker and loads any `.vcv` or
   `.json` patch, including desktop Cardinal patches.

Storage is per browser and per origin. It is not synced and a cleared site
storage loses it, which is why the file routes exist; a future shell could
add the share-URL pattern from parallax for small patches.

Verified headlessly (`docs/spikes/2026-10-16-save-log.txt`): fresh boot
offers nothing; adding a module stores a 7-module autosave within 1.5 s;
reloading offers the restore and restoring yields 7 modules and 7 cards;
Save as "Arp with filter" shows the name and time and one library row; New
patch returns to 6 modules; Load returns to 7; Download produced
`Arp_with_filter.vcv` with 7 modules; importing `startup.vcv` gave 6 and
set the name; the downloaded file loads back through the bridge. Audio
ran throughout.

Remaining from the original list: custom displays, audio-rate readout,
the help drawer. Beyond that list, the card UI now needs what the shell
plan always had: service worker for the 10 s load, install manifest,
onboarding, and the learning content.

## 11. Help drawer (test build 0.10, 2026-10-16)

No engine change. The drawer is the first piece of the learning layer's
**explanation** half (what a module and each knob does) and binds to the
metadata the bridge already returns.

**Hard fact found first.** Rack lets module authors describe every
parameter and port in code, and the bridge exports those fields, but
across all 66 Mini models every one is empty: 0 of 38 SEQ 3 params, 0 of
8 VCO params, 0 jacks anywhere. Module descriptions exist for all 66 and
manual URLs for 58 (Cardinal, Fundamental, Bogaudio, Impromptu, Aria and
Audible link to their own docs; Surge XT and Mockba ship none). So the
engine gives the one-liner and the link, and the per-knob and per-jack
text had to be written. It lives in `shell/spike-b/help.json` (60 KB, CC0,
ours), keyed `Plugin/Model` with `about`, `try`, `params`, `inputs`,
`outputs` keyed by name or `#id`, and `names` for knobs and jacks the
module left unnamed (dead parameter slots are dropped from the cards too,
which also fixed an empty bar on the VCO card). Repeated knobs such as
Surge's "Mod 1 to Pitch" or GateSeq64's 64 step buttons are covered by
regex patterns and folded into one collapsed group per drawer. Coverage:
module text for all 66; full knob and jack text for Fundamental, Cardinal
host modules, Bogaudio, Impromptu, Plaits, Aria and Mockba; Surge XT has
module text and its main controls, with the modulation matrix grouped.
Mockba's knob names are read from its source (the panel has none);
plugin-level manual fallbacks point Surge XT at its Rack manual and
Mockba at its repository.

**Three ways in.** The `?` button on every card, a tap on the card title,
or a tap on any knob's label (opens with that knob highlighted and
scrolled into view). Pressing a jack now also offers **What is this
jack?** in the chip, which opens the drawer on that jack. Inside: the
author's description, our paragraph, a **Try:** suggestion that refers to
the startup patch where possible, then every knob with its live value,
text, range and default or switch positions; then every input and output
with its shape glyph, signal type word, live voltage, text, and where it
is connected. Connection rows are buttons: tapping "← from SEQ 3 · CV 1"
closes the drawer, scrolls to that card and flashes it. The Manual button
opens the author's page in a new tab. The footer states what is the
author's and what is ours.

Verified headlessly (`docs/spikes/2026-10-16-help-log.txt`, screenshots
`2026-10-16-help-vco.png`, `2026-10-16-help-jack.png`): VCO drawer has
description, about, try, 6 knob rows all with text and live display
values, 8 jack rows with correct types, "← from SEQ 3 · CV 1" and
"→ to VCA · Channel" connections and live voltages (0.33 V on pitch,
4.87 V on Sawtooth); the goto button closed the drawer and flashed SEQ 3;
tapping ADSR's Attack label opened with that row highlighted; pressing a
SEQ 3 output offered the chip button and opened on that jack with the arm
cleared; Nimbus showed the plugin-level manual, 14 main knobs and one
"Modulation depths (48)" group; undoing the add closed the drawer; audio
ran throughout. Live at `/spike-b/` as test build 0.10.

**Candour about the text.** It was written from knowledge of the modules
and a read of their source, not tested knob by knob against the engine;
the drawer says so and defers to the manual. Expect wording to need
correction as Andrew uses it. What this does not do yet: the **build
tutorials** half of the learning layer, and any text search across the
help.

Remaining from the original list: custom displays and audio-rate readout.
Then the shell items: service worker, install manifest, onboarding,
learning content.

## 12. First phone test of the card UI (Andrew, 2026-10-16) and test build 0.11

Andrew's report on build 0.10 at `/spike-b/`, Android Chrome, portrait,
with a screenshot: the engine sat at 12 % with the page at a steady
16.7 ms frame (60 fps), so the frame-rate question is answered for his
phone. Four problems, all in the page, all fixed in build 0.11 without a
rebuild:

1. **Random text highlighted when tapping.** Android's long-press text
   selection grabbed jack labels ("Square" in the screenshot). Fix:
   `user-select: none` on the body (inputs and the help drawer's text stay
   selectable).
2. **Cannot drag a cable out of one OUT and into another.** Pressing a
   connected OUT only started a new cable; moving the source end needed a
   tap on the drawn wire and a chip button, which nobody finds. Now a
   pressed OUT that has cables targets both kinds of jack: drop on an IN
   adds a cable as before; drop on another OUT moves every cable from this
   output there (one cable, the common case, is one undo step; several are
   one step each, since the bridge has no batch move). The chip says both.
3. **Wires hard to track in portrait, colour the only clue.** Colour codes
   signal type, not identity, and is the one channel Andrew cannot use.
   Three changes: every connected jack now carries a text label with the
   other end ("← SEQ 3 · CV 1", "→ VCA · Channel, VCF · Audio"), so the
   patch reads without tracing; portrait wires are assigned to lanes so
   that overlapping spans never share an x (greedy interval colouring,
   verified 0 clashes on the startup patch); while a jack is pressed,
   wires not touching it dim to 18 %.
4. **Header far too big.** One row now: Audio, Add, Patches, undo and redo
   arrows, and `⋯` which opens the debug controls (stock UI, latency,
   reload, the stats line). Save moved into the Patches sheet next to
   Save as. Header 83 px instead of 325 at 390 px wide; the undo action
   name moved to the patch line.

Also fixed from the same screenshot: SEQ 3 read "stopped" while running.
The card read the Run **output**, which SEQ 3 only pulses when run
toggles; it now watches the module's Run **light** through the bridge's
light channel. The help text for that output was wrong the same way and
is corrected.

Verified headlessly (`docs/spikes/2026-10-16-phone1-log.txt`,
`2026-10-16-phone1-labels.png`): selection none on labels and text in the
drawer; header one row at 390 and 360 px; labels on VCO pitch and
Sawtooth, none on unconnected Sine; 6 wires in 4 lanes, 0 clashes;
pressing Sawtooth offered both actions and dimmed 5 of 6 wires; tapping
Sine moved the cable (6 cables before and after, VCA fed by Sine, undo name
"move cable", undo restored Sawtooth); a second cable from Sawtooth to a
new VCF then both moved to Triangle in one gesture; SEQ 3 reads
"running". Audio ran throughout.

Still open from Andrew's note: he knows the header was debug chrome; the
rest of the shell (install, service worker) is unchanged.
