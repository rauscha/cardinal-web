# Visual direction: how far can the modules move away from skeuomorphism?

Date: 2026-10-15. Andrew's question: should we simplify the module designs
(flat, "mod", abstract-representative, even Star Trek console style) while
keeping Cardinal's connectable, interchangeable engine underneath?

Short answer: yes, and the right amount of abstraction depends on which
renderer draws the rack. On the stock canvas (option A) we can reskin but
not re-lay-out. With our own HTML rack (option B+) anything goes, and an
abstract design actually makes B+ *cheaper*, because the expensive part of
B+ was reproducing 66 panels faithfully.

## 1. Where the look lives (solid, from the fork)

- **Panel**: one SVG per module in its plugin's `res/` folder.
- **Components** (knobs, ports, lights, switches): SVGs. Fundamental,
  Audible Instruments and Cardinal's own modules use Rack's Component
  Library; Bogaudio and Impromptu ship their own component sets.
- **Geometry**: positions and hit sizes are hard-coded in each module's C++
  `ModuleWidget` constructor (`mm2px(Vec(...))`). A different SVG does not
  move or enlarge anything.
- **Custom displays** (scopes, the text editor, the Plaits mode display,
  Surge's displays) are drawn in C++ with nanovg, not SVG.

## 2. What we may legally restyle (solid, Cardinal `docs/LICENSES.md` and Rack `LICENSE.md`)

| Art | Licence | May we derive? |
|---|---|---|
| Rack Component Library (knobs, ports, lights used by Fundamental, Audible, Cardinal) | CC BY-NC 4.0 | Yes, non-commercial, with attribution |
| Fundamental panels | GPL-3.0-or-later, same as code | Yes |
| Bogaudio panels and components | CC BY-SA 4.0 | Yes, share-alike |
| Surge XT panels | CC BY-NC-SA 4.0 | Yes, non-commercial, share-alike |
| Aria Modules panels | CC BY-SA 4.0 | Yes, share-alike |
| Cardinal's own panels | CC0 | Yes |
| Impromptu panels | CC BY-NC-**ND** 4.0 | **No derivatives.** Leave as is, or replace with wholly original art |
| Audible Instruments panels | Émilie Gillet's permission to Cardinal | Do not modify. Leave as is, or replace with original art |
| Mockba Modular | not checked | check before touching |

Two rules fall out. First, "ND" and "permission" art is either untouched or
replaced outright; an original panel is not a derivative. Second, brand
names and logos (Impromptu, Bogaudio, Mutable's product names) stay off
anything we draw ourselves. Cardinal already renames the Mutable modules
("Macro Oscillator 2" for Plaits); we inherit those names.

A note on Star Trek: the LCARS look is CBS/Paramount trade dress. "Big
rounded tiles, colour bands, bars instead of knobs" is a generic console
language we can use; a recognisable replica is not.

## 3. What each renderer allows

**Option A (stock canvas, what ships today).** We can swap SVG files in the
fork's resources. That gives a consistent flat restyle of every knob, port
and light across Fundamental, Audible and Cardinal in one go (one Component
Library set), plus simplified panels where the licence allows. We cannot
make touch targets bigger, move controls, or change module widths without
editing each `ModuleWidget` in C++ (66 modules). Custom displays stay as
they are.

**Option B+ (our HTML/SVG rack over the headless engine).** Everything is
ours: layout, size, shape, portrait or landscape, per-signal colour and
shape coding, live visualisations. The engine does not care what a module
looks like; it only needs `addModule`, `addCable`, `setParamValue`, and
`toJson`/`fromJson`, which already exist. Rack's `ParamQuantity` and
`PortInfo` give every parameter's name, unit, range, default and
description at runtime, so a generic card can be generated for any module
with no art at all. Only the handful of custom displays need bespoke work.

## 4. Six directions, brainstormed

Each is marked for touch fit, teaching fit, protanope safety and which
renderer it needs. "Solid" means the mechanism is known; "plausible" means
it is a design judgment not yet tested on a phone.

### D1. Flat Eurorack (reskin, keeps the metaphor)
Panels become flat dark or light slabs with one typeface; knobs become a
ring with a bright pointer and the value shown while touched; ports get a
shape code by signal type. The rack, cables and module widths stay.
- Touch: unchanged geometry, so the 450 ms menu and pinch do the work.
- Teaching: keeps the "this is what a real rack is like" transfer.
- Protanope: shape coding fixes the cable-colour problem.
- Renderer: **A, today.** Cost about two days of SVG work plus a rebuild.
- Legal: Component Library and Fundamental, Bogaudio, Surge, Aria panels
  yes; Impromptu and Audible panels stay stock, so the rack is mixed.

### D2. Signal-flow schematic
Modules are plain nodes (a box with a title and its jacks), cables are
orthogonal lines like a patch diagram, params live in a side sheet when a
node is selected. Looks like a synthesis textbook figure.
- Touch: excellent, every target is ours to size.
- Teaching: strongest for *understanding* signal flow; weakest for
  transferring to a physical rack (no panel to recognise).
- Renderer: **B+**.

### D3. Cards in a ladder (portrait first)
One card per module, stacked top to bottom in signal order. A card shows
its title, three or four primary controls as large sliders or arcs, and a
"more" row for the rest. Cables are drawn in a narrow left margin like a
transit map, or shown as a connection list under each jack. Landscape puts
cards side by side.
- Touch: excellent. Fits the tall-and-skinny form factor Andrew flagged.
- Teaching: good; the ladder *is* the lesson order.
- Renderer: **B+**, but cheap: generic cards need no art. Docs/09 option
  A4 (one module per Rack row) is a poor man's version on option A.

### D4. Instrument console (the Trek direction, legally generic)
Large rounded tiles, colour bands with text labels, horizontal bars and
drag-anywhere value fields instead of knobs, jacks as labelled pads along
the tile's edge. Dark background, high contrast, very few lines.
- Touch: best of all for value entry; bars beat knobs on glass.
- Teaching: panel memory does not transfer to hardware; mitigate by
  keeping Eurorack *vocabulary* (V/oct, gate, CV in) on every label.
- Protanope: bands must carry text, not just colour.
- Renderer: **B+**. Same generic-card machinery as D3 with a different skin.

### D5. Live-glyph modules (abstract-representative)
Each module shows *what it is doing* instead of a static faceplate: the
oscillator shows its waveform, the envelope shows its curve with the
playhead, the sequencer shows its step grid, the VCA shows a level bar,
the filter shows its response. Controls sit on or beside the picture.
- Touch: good.
- Teaching: the strongest idea here for a learner; the picture is the
  explanation. Pairs with the Learn drawer.
- Renderer: **B+** plus a readout of output voltages from the engine.
  Rack's UI already reads module state for lights, and output port
  voltages are readable from the UI side, so the data path exists
  (solid); the cost is one small visualiser per module *type*, not per
  module (plausible: about a dozen glyph kinds cover the Mini).

### D6. Hardware-honest but reduced (the compromise)
Keep what transfers to a physical rack and strip the rest: jacks stay
jacks, cables stay cables, 1 V/oct and gates stay literal; panels lose
screws, wood, brushed metal and brand art; controls become whatever works
on glass. This is D1's semantics with D3/D4's controls.
- Renderer: D1 half on **A today**, the rest on **B+**.

## 5. A signal-type code to use in any of them (protanope-safe)

Shape first, label second, colour third, so that no state is carried by
hue alone:

| Signal | Jack shape | Cable end | Suggested colour |
|---|---|---|---|
| Audio | filled circle | round plug | warm (orange/yellow) |
| Pitch and CV | ring | round plug with ring | cool (blue/teal) |
| Gate and trigger | square | square plug | high-luminance (white/light) |
| Clock | diamond | diamond plug | mid grey |

Rack's `PortInfo` does not type its ports, so the type comes from a small
table we maintain per module (plausible: a few hundred entries for the
Mini, mostly inferable from port names like "V/OCT", "GATE", "CLK").

## 6. How abstraction changes the B+ decision

Docs/06 priced B+ in months because it assumed faithful reproduction of
every panel and display. Directions D2 to D5 drop that assumption: a
generic card generated from runtime metadata covers most of the 66
modules with zero art, and only four or five custom displays need
attention. That turns B+ from "rewrite the UI" into "write one card
renderer, one cable renderer, one glyph set", which is weeks, not months
(plausible; the spike in docs/06 still has to be run). The thing that
decides it is still the headless engine spike, now with a smaller UI
behind it.

## 7. Recommendation

Two tracks, no decision on the big one yet:

1. **Now, on option A:** a D1 Component Library reskin (flat knobs with a
   value readout on touch, shape-coded ports, bigger-looking lights) and
   the shape code above. Legal everywhere it applies, two days, one
   rebuild, visible on the phone immediately. Impromptu and Audible panels
   stay stock for now.
2. **Before any B+ code:** a static HTML mock of the startup patch (SEQ 3,
   VCO, ADSR, VCA, Audio) in two skins, D3 cards and D5 live glyphs, that
   Andrew can open on the phone and poke. Half a day. If it feels right,
   it becomes the target for the B+ spike; if not, we have lost half a
   day and keep D1.

What this does not change: the engine, patch format, module list, the
export plans or the learning content. Patches made in any of these looks
load in desktop Cardinal unchanged, because the look is not in the patch.

## 8. Done on 2026-10-15 (Andrew said yes to both)

**Track 1, flat components on option A: shipped in test build 0.3.**
`build/reskin/generate.py` writes 57 original SVGs (CC0) at the exact sizes
of the graphics they replace: Rack's Round*BlackKnob, Trimpot, Rogan 1/2/3/6
families (static disc, rotating pointer, colour as a thin static ring),
PJ301M ports; Fundamental's knob, small knob, port and buttons. The build
script copies them over the fork's resources. Screenshot:
`docs/spikes/2026-10-15-reskin-build-0.3.png`. Data package shrank from
3.73 MB to 3.53 MB because the flat SVGs are tiny.

**Shape-coded jacks: shipped in the same build**, as a hook in Cardinal's
`ModuleWidget` override (`build/cardinal-web-port-shapes.patch`). It swaps a
port's SVG by its name: CLOCK or CLK gives a diamond, GATE, TRIG, RUN,
RESET, RST or SYNC a rounded square, V/OCT or PITCH a double ring, anything
else the plain round jack. Jack centres are preserved. It applies to every
plugin's ports, including Impromptu's and Audible's, because it replaces
the graphic at runtime rather than editing their art. Known weakness: it is
a name heuristic; the per-module table from section 5 would be exact.
Untouched this round: the cable plugs (still round), Rack's lights (nanovg,
not SVG), panel art, Bogaudio's and Impromptu's own knob sets, Cardinal's
Host Audio big knob.

**Track 2, the mock: live at https://andrewrausch.com/cardinal-web/mock/.**
`shell/mock/index.html`, one file, no engine. Two skins over the startup
patch: cards (ladder, bars for controls, IN and OUT jack lists) and live
glyphs (step grid with playhead, scrolling saw, envelope with playhead,
level bar, meters, all simulated at 120 bpm). Cables are drawn in the left
margin as a transit map with the signal-type shapes. Landscape lays the
cards side by side. Screenshots `docs/spikes/2026-10-15-mock-*.png`.
Nothing in it is wired to Cardinal; it exists to be judged on a phone.

## 9. Phone verdict (Andrew, 2026-10-15)

"Love these flatter cards. Works in landscape or portrait. Glyphs is
better for teaching." Landscape originally hid the cables; fixed the same
day: landscape now draws Rack-style curves from each OUT jack to its IN
jack across the cards, portrait keeps the margin transit map.

What this decides: the live-glyph card is the target look for any UI we
draw ourselves. What it does not decide: whether we draw the UI ourselves
(option B+). Glyphs need two things the stock canvas cannot give: our own
layout, and a readout of what each module is doing. Both are B+ work, so
the glyph verdict raises the value of the B+ spike (docs/06) rather than
replacing it.
