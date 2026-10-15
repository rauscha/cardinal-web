# Touch backend rewrite (test build 0.2)

Date: 2026-10-15. Code: `build/cardinal-web-touch-backend.patch`, applied to
the fork's DPF submodule (`dpf/dgl/src/pugl-extra/wasm.c` and `wasm.h`).
Verification: `docs/spikes/touch-test.cjs` driving the built Mini in
headless Chromium (phone viewport 844x390, device pixel ratio 2) with
synthetic TouchEvents; screenshots `docs/spikes/2026-10-15-touch-*.png`.

## What the new backend does

| Gesture | Delivered to Rack | Result |
|---|---|---|
| Tap (lift inside 450 ms, moved under 10 px) | left press + release at the touch origin | click (RUN button toggles, ports patch) |
| Move more than 10 px | left press at origin, then motion | drag (knob turns, module moves, cable pulls) |
| Hold 450 ms without moving more than 10 px | right press + right release at origin, then plain motion | context menu opens and the finger hovers it: rows highlight, submenus open; the phone vibrates 15 ms where supported |
| ... then lift without having moved | nothing | menu stays open for tapping |
| ... then slide and lift | left press + release where lifted | the row under the finger activates; lifting on the background closes the menu |
| Second finger joins | any left drag is released where it is | enters two-finger mode |
| Two fingers move together | scroll event, midpoint delta / 50 | rack pans by exactly the finger movement |
| Two fingers change distance | ctrl-scroll event, 4 x log2(ratio), at the midpoint | rack zooms by the pinch ratio around the fingers |
| Fingers lift after a two-finger gesture | nothing until all are up | no stray clicks |
| touchcancel | releases any held button | state reset |

Numbers that are policy, not physics: 450 ms long-press, 10 CSS px slop.
Both are `#define`s at the top of the touch section and can be tuned.

## Verified headlessly (solid)

1. Hold 700 ms on a module: its context menu opens. Lift in place: the
   menu stays. Escape closes it.
2. Hold with a 3 px wobble: the menu still opens (the stock build turned
   this into a module drag).
3. Quick tap on a module title: no menu. Tap on RUN: run light off,
   audio meters fall; tap again: back on.
4. Drag TEMPO up 60 px: 120 to 324 bpm, so drags work.
5. One-finger drag of 120 px on a module body: the module moves, no menu.
6. Two-finger pan of 200 px: the rack shifts 198 px.
7. Pinch out to twice the distance: everything twice the size, pivot under
   the fingers; pinch back: original size, pan preserved.
8. Hold, slide 157 px down to "Bypass", lift: the row highlighted while
   sliding, the menu closed on lift, SEQ 3 is bypassed (dimmed, lights off,
   meters fall). Hold, lift in place, tap "Bypass": toggled back.

## Not verified (needs the phone)

- Real finger jitter and real long-press feel at 450 ms.
- The browser's compatibility mouse events after a tap (headless synthetic
  touches do not produce them). The canvas now has `touch-action: none`
  and the stock backend already drops mousedown/mouseup once touch is
  seen, so the expected effect is nil.
- iOS Safari.
- Whether the hover tooltips that now follow the finger (visible in the
  screenshots) are helpful or noise on a phone.

## Known leftovers (by design, this round)

- One finger on empty rack still draws a selection box (stock). Pan is two
  fingers. Changing this is option A3 in docs/09.
- Menu rows are still 21 px tall (option A2 in docs/09).
- A long-press on empty rack opens the stock module browser, which is
  mouse-sized.
