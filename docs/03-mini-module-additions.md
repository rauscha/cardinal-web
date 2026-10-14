# Mini build: module additions

Decision 2026-10-14 (Andrew): the four utility gaps the tutorial research
exposed are filled. Our Cardinal Mini build adds a slew limiter, an 8:1
switch, a clock with dividers, and a gate/trigger sequencer. All picks come
from plugins Cardinal already bundles in its full build, so there is no new
code or licence to bring in. Everything below is GPL-3.0-or-later like the
rest of the binary.

Tags: **[SOLID]** read from the Cardinal source tree (commit 0a530b7) or a
plugin manifest at the commit Cardinal pins; **[PLAUSIBLE]** my estimate.

## 1. The picks

| Gap | Module (slug) | Plugin | Why this one | Docs |
|---|---|---|---|---|
| Slew limiter | **SLEW** (`Bogaudio-Slew`) | Bogaudio, already in Mini | Polyphonic, separate rise and fall, shape control. Same plugin as modules already shipped, so no new shared code. | Bogaudio README `#slew` [SOLID] |
| 8:1 switch | **SWITCH81** (`Bogaudio-Switch81`) | Bogaudio | The exact mirror of the SWITCH18 already in Mini: clock, reset, steps, direction, select CV. Makes the "switch as step sequencer" recipe clean. | README `#switch81` [SOLID] |
| 8:1 switch, classic form | **Sequential Switch 1 to 4** and **4 to 1** (`SequentialSwitch1`, `SequentialSwitch2`) | Fundamental, already in Mini | The textbook Eurorack sequential switch; tiny. | vcvrack.com/Free `#SequentialSwitch` [SOLID] |
| Clock and divider | **Clocked** (`Clocked`) and **Clkd** (`Clocked-Clkd`) | Impromptu Modular, **new to Mini** | The de facto VCV master clock: BPM, run/reset, three ratio outputs with swing and pulse width (Clocked), or the compact version (Clkd). | marcboule.github.io/ImpromptuModular/#clocked [SOLID URL from manifest, page not fetched] |
| Clock divider and multiplier with gate length | **RGATE** (`Bogaudio-RGate`) | Bogaudio | Divides or multiplies an incoming clock and sets gate length and phase; polyphonic. Covers "divider" when Clocked is overkill. | README `#rgate` [SOLID] |
| Gate/trigger sequencer | **GateSeq64** (`Gate-Seq-64`) | Impromptu Modular | 64-step gate sequencer with probability and per-step gate modes; the module the techno-patch tutorials use. | marcboule.github.io/ImpromptuModular/#gate-seq-64 [SOLID URL] |
| CV and gate step sequencer, classic form | **SEQ 3** (`SEQ3`) | Fundamental | The classic 8-step, three-row CV sequencer with eight gate rows. The Eurorack "first sequencer" in one module. | vcvrack.com/Free `#SEQ3` [SOLID] |
| Addressable 8-step CV sequencer | **ADDR-SEQ** (`Bogaudio-AddrSeq`) | Bogaudio | Steps by clock or by CV address; pairs with SWITCH81 recipes. Polyphonic. | README `#addrseq` [SOLID] |

Nine modules, three already-bundled plugins plus one new plugin
(Impromptu). All are explicitly excluded from Mini today by
`spl.removeModule(...)` lines in `plugins/plugins-mini.cpp`, which means
upstream considered them and left them out for size, not for technical
reasons. [SOLID]

## 2. Proposed small extras, not yet decided

Also absent from Mini, also in already-bundled plugins, each a few
kilobytes of code and one SVG. Default is **not** to add them unless you say
so.

- Fundamental **Pulses** (ten manual trigger/gate buttons): teaches gates
  without any MIDI gear.
- Fundamental **Mutes** (ten mutes): performance control for tutorial 12.
- Fundamental **8vert** (eight attenuverters): the single most common
  Eurorack utility; Bogaudio Offset partly covers it.
- Bogaudio **MULT** (buffered multiple): purely pedagogical, since VCV lets
  you stack cables.

## 3. What the build-list edit looks like

Verified against the current `plugins/Makefile` and
`plugins/plugins-mini.cpp` structure. [SOLID on the structure; file names
inside the Impromptu and Fundamental submodules still need confirming when
they are checked out]

**For a module from a plugin already in Mini (Bogaudio, Fundamental):**

1. `plugins/Makefile`: add a `MINIPLUGIN_FILES += <Plugin>/src/<Module>.cpp`
   line next to that plugin's existing Mini lines (Bogaudio block starts at
   the `MINIPLUGIN_FILES += BogaudioModules/src/AD.cpp` line; Fundamental at
   `Fundamental/src/ADSR.cpp`).
2. `plugins/Makefile`: uncomment the matching panel line in the
   `MINIRESOURCE_FILES` block, for example `BogaudioModules/res/Slew-dark.svg`
   and `Fundamental/res/SEQ3.svg`. Mirror whatever variants SWITCH18 and VCO
   already list.
3. `plugins/plugins-mini.cpp`: add `extern Model* model<Name>;` in that
   plugin's declaration block, add `p->addModel(model<Name>);` in its
   `initStatic__` function, and delete the `spl.removeModule("<slug>")` line
   for it.

**For Impromptu (new to Mini):**

1. `plugins/Makefile`: add `MINIPLUGIN_FILES` lines for
   `ImpromptuModular/src/Clocked.cpp`, `GateSeq64.cpp`, the shared
   `ImpromptuModular/src/comp/*.cpp` files except `PanelTheme.cpp`, plus
   `ImpromptuModularDark/PanelTheme.cpp`, following the full build's lines
   780 to 784. Add its panel SVGs to `MINIRESOURCE_FILES`.
2. `plugins/plugins-mini.cpp`: add a `pluginInstance__ImpromptuModular`,
   an `initStatic__ImpromptuModular()` copied from `plugins/plugins.cpp`
   line 2532 onward, keeping only `addModel` for Clocked, Clkd and GateSeq64
   and adding `spl.removeModule` for every other Impromptu slug in the
   manifest (the Mini convention). Register it in the static init list.
3. The per-file compile flags for Impromptu (`IMPROMPTUMODULAR_CUSTOM`
   symbol renames at Makefile lines 2501 to 2523) already apply to any
   Impromptu file in any target, so no new rules are needed. [PLAUSIBLE]

Expected cost: one extra plugin's shared code in the wasm and nine panels in
the data file. Single-digit megabytes decompressed is my estimate; measure
on the first build. [PLAUSIBLE]

## 4. Effect on the tutorial outline

- Tutorial 3 (acid bass): the VCO version now has SLEW for 303-style glide.
- Tutorial 9 (switch as sequencer): becomes a proper lesson with SWITCH81,
  then SEQ 3, then ADDR-SEQ as three ways to say "step".
- Tutorial 12 (loop to track): Clocked as master clock, RGATE for
  divisions, GateSeq64 for drum gates, so rhythm no longer depends on LFO
  tricks or external MIDI.
- Lesson 3 of the concepts track (gates and triggers) can use Clocked and
  SEQ 3 instead of relying on a MIDI keyboard.

## 5. Documentation coverage of the additions

All nine have working manual links: Bogaudio README anchors, the Fundamental
page anchors, and the Impromptu manual at marcboule.github.io. Impromptu's
manual licence is unstated like most; link out. [SOLID for Bogaudio and
Fundamental; Impromptu URLs from the manifest, page not fetched]
