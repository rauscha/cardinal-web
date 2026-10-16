# Touch input on the stock canvas: what fails, why, and the options

Date: 2026-10-15. Source of the observations: Andrew, test build 0.1 on his
phone. Source of the mechanism: the Cardinal fork at
`scratchpad/src/Cardinal` (DPF pugl backend `dpf/dgl/src/pugl-extra/wasm.c`,
Rack `src/Rack/src/widget/event.cpp`, `ui/MenuOverlay.cpp`,
`ui/MenuItem.cpp`, `ui/Menu.cpp`, `app/ModuleWidget.cpp`,
`app/RackScrollWidget.cpp`, `ui/ScrollWidget.cpp`) and `src/CardinalUI.cpp`.

**Status this doc sets:** option A is proven on the engine side only. Its
touch ergonomics are *not* settled and the rack-style canvas is not
sacred. We continue on option A because its fixes are cheap and every
shell piece carries over, but the option B+ decision stays open and has
explicit trigger criteria (section 6).

## 1. What Andrew observed (solid, first-hand)

1. Sound works; audio starts on the one tap; engine keeps up with live knob
   turns; about 10 s first load on slow Wi-Fi.
2. Opening a menu: the 2 s long-press is far too long.
3. Once open: sliding the finger over the rows is hard to do accurately.
4. Menus are hard to keep open; lifting the finger tends to close them.
5. No scrolling or panning of the rack by touch.
6. No pinch to zoom.

## 2. Why, traced through the code (solid: read from source)

### 2.1 How a touch becomes a mouse event today

`puglTouchCallback` in `wasm.c` (lines 460 to 597):

- `touchstart`: the press is *not* delivered. It is stored as a
  **right-button** press and a 2000 ms timer starts
  (`emscripten_set_timeout(puglTouchStartDelay, 2000, view)`). A motion
  event to the finger position is delivered immediately.
- Any `touchmove` or `touchend` before the timer fires: the timer is
  cancelled, the stored press is relabelled **left** and delivered, then
  the move or the release is delivered.
- Timer fires: the stored **right** press is delivered. Nothing else.
- `touchend`: always delivers a **left** release (button 0).
  `touchcancel` delivers a right release.
- Only `touches[0]` is read. A second finger is ignored entirely.
- There is no movement tolerance (slop) anywhere.

Cardinal's `onMouse` (`CardinalUI.cpp` line 1020) delivers the button at
`lastMousePos`, the position of the most recent motion event, so the
deferred press lands where the finger was at touchstart. That part is
correct.

### 2.2 Why opening fails (observation 2)

2000 ms is about four times the platform long-press (Android and iOS both
use roughly 400 to 500 ms). Worse, because there is no slop, **any finger
movement during the hold cancels the long-press and turns it into a left
drag** at the touchstart position. On a module body a left drag moves the
module once the finger travels 1 HP (`ModuleWidget::onDragMove`,
`minDist = RACK_GRID_WIDTH`). On a knob it turns the knob. So a slightly
unsteady finger never gets a menu and instead nudges the patch.

### 2.3 Why sliding over rows fails (observation 3)

When the timer fires, Rack receives a right **press** with no release.
`EventState::handleButton` therefore calls
`setDraggedWidget(moduleWidget, RIGHT)`: Rack is now in drag mode with the
module as the dragged widget, and stays there until the finger lifts.
While dragging, `EventState::handleHover` delivers `DragHover` events and
returns before the plain `Hover` event, so `MenuItem::onEnter` never runs:
**no row highlights under the finger and no submenu opens**. Lifting over
a row delivers `DragDrop` with `origin = moduleWidget`, and
`MenuItem::onDragDrop` only acts when `origin == this`, so nothing
happens. The finger must come up and tap again. Rows are blendish
`BND_WIDGET_HEIGHT`, about 21 px at zoom 1, against a fingertip of roughly
40 to 50 CSS px, and the menu opens *under* the finger, which hides the
first rows.

### 2.4 Why menus close on lift (observation 4)

Three paths, all real:

- A tap that lands on the overlay background instead of a 21 px row
  delivers a left press to `MenuOverlay::onButton`, which calls
  `requestDelete()` on any press it receives directly. With rows that
  small, missing is the common case.
- Holding a row for more than 2 s delivers a **right** press to the row,
  so the row becomes the dragged widget, and the release then fires
  `onDragDrop` with `origin == this`: the item **activates** on lift even
  though the user was only hesitating.
- Holding the background for more than 2 s delivers a right press to the
  overlay, which closes the menu.

Long menus cannot be scrolled by touch at all: `Menu::onHoverScroll` only
responds to wheel events.

### 2.5 Why there is no pan or pinch (observations 5 and 6)

Rack pans on wheel, middle-drag or alt-left-drag (`ScrollWidget::onButton`
lines 114 to 131) and zooms on ctrl-wheel, mouse buttons 4 and 5, or the
View menu. A one-finger drag on empty rack is **rubber-band selection**
(`RackWidget::onDragStart`). The pugl backend never produces a scroll
event from touches and ignores the second finger, so none of these are
reachable. The shell's viewport meta already sets `user-scalable=0`, so the
browser's own pinch zoom is off and observation 6 is entirely the
backend's doing. The canvas sets no `touch-action`, which should be added
anyway so no gesture ever reaches the page.

**Summary:** every failure Andrew hit is in about 140 lines of the pugl
wasm backend plus Rack's mouse-era menu widgets. None of it is in the DSP
engine, the module code or the rendering. We build this fork ourselves, so
all of it is ours to change (DPF is ISC, Rack and Cardinal are GPLv3+).

## 3. How Hexen does it (solid: Hexen user manual v2.38, 4 Feb 2026, pages 5 to 7)

Hexen is Silicon Droid's touch-first virtual Eurorack for Android (Play
Store; the manual also mentions a mouse wheel, so desktop-class input is
supported too). Its interaction model:

- **Two zoom modes, zoomed-in and zoomed-out**, with the threshold about
  halfway along an on-screen zoom slider. Zoomed-in: controls and cables
  are live, and dragging a module *body* pans. Zoomed-out: modules can be
  moved and deleted, and a one-finger drag anywhere pans.
- **Zoom input:** the slider, mouse wheel, pinch, and double-tap anywhere
  to toggle between the two levels. Double-tap a module to zoom into it.
- **Pan input:** two fingers held about the same distance apart drag the
  whole rack, at any zoom.
- **Cables:** push an input jack and slide; a new cable appears from the
  input; drag the plug to an output. Drag to the screen edge to autoscroll.
  Outputs stack; inputs do not.
- **Knobs:** tap and drag when zoomed in; double-tap resets to default.
- **Menus:** one main-menu button bottom-left; menus close by tapping any
  non-button area or an exit button. No long-press anywhere in the manual.

What this buys them: a one-finger drag always has exactly one meaning,
decided by the zoom mode, and nothing waits on a timer. The cost is a
modal UI the user must keep in their head, which Andrew already finds a
little cumbersome.

## 4. Options, with what I know about each

Costs are my estimates (plausible, not measured). Confidence is about
whether the approach works, not the estimate.

### A1. Fix the pugl touch backend in the fork (engine input layer)

Change `puglTouchCallback`:

- Long-press 450 ms, with a movement slop of about 10 CSS px: inside slop
  the timer keeps running; beyond slop it becomes a left press at the
  origin plus a drag; a lift before the timer is a tap (left press and
  release).
- On timer: deliver right press **and right release** so Rack is not left
  in drag mode. Hover then works, rows highlight under the finger and
  submenus open.
- Remember that this touch opened a menu; on lift, deliver a left press and
  release at the lift position. Result: long-press, slide, lift selects,
  which is how both platforms' context menus behave. Lifting on the
  background closes the menu, also standard.
- Two fingers: stop treating `touches[0]` as the mouse. Emit scroll events
  from the midpoint delta (pan) and scroll events with the ctrl modifier
  from the distance ratio (zoom at the midpoint). `RackScrollWidget::
  onHoverScroll` reads ctrl from the context mods that `CardinalUI::
  onScroll` sets from the event, and the 2026-10-15 spike already proved
  ctrl-wheel zooms and plain wheel pans on this build.
- Set `touch-action: none` on the canvas so the browser never steals a
  gesture (the viewport already disables browser zoom).

Confidence high: every piece is a direct consequence of the traced code.
Cost: a day of C, one rebuild (3 to 11 min), headless tests with
synthetic touches as in the spikes, then Andrew on device. Fixes
observations 2, 3, 4 (two of three paths), 5 and 6.

### A2. Touch-size the Rack menus in the fork

Scale `MenuItem` height and font when touch has been seen (about 2x),
open the menu beside the finger rather than under it, let `Menu` scroll by
drag when taller than the screen. Confidence high, cost about a day. Fixes
the "missed the row" close path and long menus. Alternative: skip this and
let the shell's own sheets replace the menus we care about (module
browser, module help, patch library), leaving stock menus only for rare
per-module options. Recommended order: shell sheets first, A2 only if the
stock menus still matter after that.

### A3. Hexen-style zoom modes in option A

Rack already has continuous zoom 0.25x to 4x with a pivot. Two presets and
a double-tap toggle are cheap once A1 exists (double-tap detection in the
backend, zoom via a ctrl-scroll burst or a one-line fork hook). The mode
rule that matters most is "one-finger drag on empty rack pans instead of
rubber-band selecting", which is a few lines in `RackWidget::onDragStart`
or `ScrollWidget`. Module moving can then require long-press-then-drag.
Confidence high, cost a day. Decide after A1 is on the phone, not before.

### A4. Portrait "ladder" layout inside option A (plausible, untested)

Rack rows are unlimited and a module may sit alone on a row. A patch can
be laid out one module per row at x = 0 and viewed at a zoom where one
module fills the screen width (a 10 HP module is 150 px at zoom 1, so
about 2.5x on a 390 px phone). One-finger vertical pan then walks the
chain top to bottom, which is Andrew's "ladder". Cables run between rows
and get long, which Rack handles. Nothing here is verified; it needs a
spike with a relaid startup patch. If it works, the tall-and-skinny
problem is addressed without leaving option A.

### B+. Our own HTML/SVG rack over the headless engine

`docs/06`. Everything above becomes free (HTML gets touch, scroll, pinch
and accessible menus for nothing) and the layout can be anything, portrait
included. Cost is months, and the custom displays of modules like Plaits,
the scopes and the text editor would need per-module work. Nothing in the
phone test changed this estimate.

## 5. Recommendation

Do A1 now, verify on Andrew's phone, then the shell's own sheets, then
decide A2 and A3 from how the fixed canvas feels, and run the A4 spike as
a half-day experiment because it is the only cheap answer to the form
factor. Keep docs/06 open.

## 6. Triggers for abandoning the canvas (B+)

Reopen the B+ decision immediately if, after A1 and the shell sheets are
on the phone, any of these holds:

1. Knob precision with a finger is unusable even with a larger knob drag
   area or a value readout in the shell.
2. Cable patching by touch (press jack, drag to jack) fails on most
   attempts at the zoom level where a module fills the screen.
3. A4 fails and landscape-only is judged unacceptable for the learning
   use case.
4. The maintenance cost of the fork's input patches grows past what the
   module-list patch already costs us.

## 7. Facts worth re-checking on device

- Frame rate while a menu is open (nanovg redraw of the overlay).
- Whether iOS Safari behaves the same; everything above was observed on
  Android.

Sources: Hexen user manual https://silicondroid.com/hexen/hexen_user_manual.pdf ;
Hexen announcement https://www.matrixsynth.com/2020/03/hexen-multi-platform-virtual-eurorack.html ;
Play Store listing summary https://appfollow.io/android/hexen-modular-eurorack-synthesizer/com.silicondroid.hexen
