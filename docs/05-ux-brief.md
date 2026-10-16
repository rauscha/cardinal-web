# UX brief: the mobile shell

Written 2026-10-14. This fixes the screens, the navigation model and the
constraints before any visual design or prototype. Facts carry **[SOLID]**
when read from the Cardinal source or measured; design calls are mine and
marked **[DECISION]** when I think they should be locked now, or **[OPEN]**
when a spike has to answer first.

## 1. Who and where

One primary user: an adult beginner who is technical, reads fast, wants the
truth, and is red-green colour-blind. He picks the phone up for ten to
forty minutes at a time, often without MIDI gear, sometimes with
headphones, occasionally with a USB controller on Android. A laptop or
tablet session is the long-form case; the phone is the daily one.

Devices in order of priority: Android phone (Chrome, installed PWA),
Android tablet or Chromebook, laptop browser, iPad, iPhone. iPhone is last
because it can never see MIDI hardware and its audio lifecycle is the
flakiest (document 02).

## 2. The one constraint everything bends around

**[SOLID]** The patching surface is Cardinal's desktop UI drawn on a single
canvas. The shell cannot restyle it, cannot read what is selected, cannot
read knob values, and cannot inject patches through a URL in the Mini
variant as shipped. Touch reaches it as one emulated mouse pointer. The
canvas also asks the browser to lock orientation to landscape.

So the shell is **chrome around a window it does not control**. Every
screen in this brief is either the canvas with a thin frame, or a surface
that slides over the canvas and slides away again. Nothing in the shell may
permanently shrink the canvas.

Three capabilities would change the design. Spikes ran on 2026-10-15
(document 07); status after them:

- **[RESOLVED] Loading a patch programmatically.** Proven end to end from
  JavaScript against the stock build (synthetic menu taps plus a file
  assigned to the created input). A fork bridge function is the robust
  form and is planned, but lessons do not wait on it.
- **[OPEN] Knowing which module was tapped.** Without it the help drawer is
  a searchable module list, not a context panel. A small C++ hook that posts
  a message on module selection would upgrade it. Design for the list; leave
  room for the upgrade.
- **[RESOLVED] Gesture translation.** Synthetic touch and wheel events
  from page scripts drive the canvas once the user has tapped once. Long
  press to context menu, ctrl-wheel zoom and wheel pan are all proven. No
  C++ touch work is required.

## 3. Orientation [DECISION]

Landscape, always, on phones. Cardinal asks for it anyway, the rack is
wide, and a side drawer beside a landscape canvas is the only layout that
keeps the canvas usable while text is open. The installed app declares
`orientation: landscape` in the manifest. Tablets and laptops get the same
layout with more room. Portrait on a phone shows a single full-screen
"rotate your phone" card with the lesson list underneath, so reading still
works one-handed.

## 4. The screens

Five surfaces. One is the canvas; four slide over it.

### 4.1 Rack (the canvas)

The default and the home. Full screen minus a **rail** along the left
edge, 56 px wide, always visible, six targets at 48 px or more:

| Rail item | What it opens | State shown on the rail (text or shape, never hue alone) |
|---|---|---|
| Audio | Audio and MIDI status sheet | "ON", "OFF", or "!" plus a one-word label such as "muted" |
| Learn | Lesson drawer | Current lesson number |
| Modules | Module help drawer | none |
| Record | Record bar | Elapsed time while recording |
| Patches | Patch library sheet | Unsaved-changes dot with "•" and the word "unsaved" on long-press |
| More | Settings, install, about, licences | none |

The rail sits on the left because the right thumb does the patching. Left
thumb reaches the rail without crossing the canvas. [DECISION]

A **status strip** 24 px tall along the bottom shows sample rate, latency
in words ("Wired, 12 ms" or "Bluetooth, about 200 ms, not for live
playing"), CPU warning text when audio stutters, and the MIDI device name.
Text only. It can be hidden from Settings.

### 4.2 Learn drawer

Slides in from the left to 40 percent of the width, canvas stays live on
the right. Two levels:

- **Track list**: the concepts track (ten lessons) and the build track
  (twelve tutorials) from document 02, each row with a title, a one-line
  outcome, and a done mark drawn as a filled square with the word "done".
- **Lesson**: a title, one paragraph of why, then **steps**. Each step is
  one instruction, one optional "listen for" line, one optional external
  link with its source named ("Synth Secrets 7", "Learning Modular lesson
  8"). A **Load patch** button at the top of the lesson loads that lesson's
  pre-built patch. A **Scope** reminder tells the learner where the Scope
  module is in that patch.

Steps do not advance automatically because the shell cannot see the
canvas. A large **Next** at the bottom of the drawer, reachable with the
left thumb, moves on. Embedded video is a thumbnail that opens the player
in a sheet, never autoplaying beside live audio.

### 4.3 Module help drawer

Same geometry as Learn. A search field at the top, then the module list
grouped by maker and filtered by function tags from the plugin manifests
(oscillator, filter, envelope, sequencer, utility). A module page has: what
it is in one sentence, each port and knob in one line, a "try this" patch
fragment, and a **Manual** link using the manifest URL where one exists.
About half the Mini set has a working manual link (document 02 section
5.2); the rest gets our own text. If the selection hook lands, opening this
drawer jumps straight to the tapped module.

### 4.4 Record bar

A bar that drops from the top edge, 64 px, leaving the canvas live. Record
button, elapsed time, a level meter drawn as a bar with a numeric peak
readout, and a stop button. Stop opens the **Take sheet**: WAV and MIDI
toggles (both on by default), a name field prefilled with the patch name
and time, and a **Share** button first, **Save** second. Share uses the
system share sheet; Save falls back to a download.

### 4.5 Patch library sheet

A bottom sheet to 60 percent height. Current patch at the top with Save,
Save as, Share link, Export file. Below it, saved patches as rows with
name, date and a module-count badge. Import file button. Lesson patches
appear here too, marked "lesson" in text.

## 5. Start, install, offline

- First launch shows one card: title, one sentence, a large **Start audio**
  button, and the sentence "Browsers only make sound after a tap." The
  button also loads the engine; a progress bar with megabytes counts down
  the first download.
- Second card, first launch only: "Install for offline use" with the
  browser's install prompt, and "Not now" as plain text.
- Third card, first launch only: "Rotate to landscape to patch", shown only
  if the phone is in portrait.
- Then Lesson 1 opens with its patch loaded. No tour, no tooltips.
- Returning launches go straight to the canvas with the last patch.

Audio interruptions (phone call, Bluetooth switch, backgrounding) show one
sheet: "Audio stopped. Tap to resume." If resume fails twice, the sheet
says "Restarting audio engine" and does so. Rules in document 02 section 1.

## 6. Gestures on the canvas [proven, see document 07]

| Gesture | Today | Intended |
|---|---|---|
| One-finger drag on a knob or cable | Works (mouse drag) | Unchanged |
| One-finger drag on empty rack | Works as a drag, does not pan | Pan the rack |
| Long-press | Nothing | Right-click context menu at that point |
| Pinch | Nothing | Zoom around the pinch centre |
| Two-finger drag | Nothing | Pan |
| Double-tap on a knob | Nothing | Reset to default (Cardinal's double-click) |

If the translation layer cannot deliver these, the shell adds a small
**canvas toolbar** inside the rail's More menu: zoom in, zoom out, fit,
and a "menu" button that right-clicks at the last touch point.

## 7. Accessibility and colour rules

Binding, from CLAUDE.md and parallax's product principles:

- No state by hue alone. Every status has a word or a shape. Recording is
  a filled circle plus the word "REC" plus a timer, not a red dot.
- Text contrast WCAG AA in both themes, enforced by a test as in parallax.
- Touch targets 48 px minimum in the shell; the canvas is Cardinal's.
- Inputs at 16 px or larger so iOS does not zoom.
- Reduced-motion setting respected; no drawer animation longer than 200 ms.
- Lesson diagrams encode signal type by line style and label, never by
  cable colour, and captions translate any video's colour convention.

## 8. Voice

Plain, specific, truthful. Say what a control does right now. Name sources
when linking out. Never promise background audio, iOS MIDI or latency the
device cannot deliver; say the limit in one sentence where it bites.

## 9. Out of scope for the first version

Any change to the Cardinal canvas beyond the two one-line fork edits,
custom module panels, a shell-side on-screen keyboard (it comes right
after, once the MIDI interposer exists), cloud sync, accounts, comments,
and anything that needs the full Cardinal build.

## 10. What visual design needs from here

1. The three spikes in section 2, in that order, because the Learn drawer
   and the gesture table depend on them.
2. Then the Design artboards: Rack with rail, Learn drawer open, Module
   help page, Record bar with Take sheet, first-launch cards. Landscape
   phone at 844 by 390 logical pixels first, tablet second.
3. Then the HTML prototype on a real phone, with a placeholder canvas, to
   test the rail reach and the drawer widths before anything is built.
