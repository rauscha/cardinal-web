# Build results: Cardinal Mini for WebAssembly, in the cloud session

Run 2026-10-15. Everything here is **[SOLID]**: it happened, with logs,
sizes and screenshots. The reproducible recipe is `build/build-mini-wasm.sh`
and the module additions are `build/cardinal-web-mini-additions.patch`.

## The toolchain works here

| Step | Time | Notes |
|---|---|---|
| Fetch Cardinal with all 158 submodules, shallow | about 20 min | 3.1 GB |
| Cardinal's own dependency bootstrap for the wasm target (`deps/PawPaw/bootstrap-cardinal.sh wasm`) | 17 min | Installs its own pinned Emscripten 3.1.27 and builds every library. 2.2 GB in `~/PawPawBuilds`. |
| `make mini` (stock module list) | 8 min on 4 cores | Output byte-for-byte comparable to upstream's hosted build: 32,493,542 B wasm against 32,491,354 B upstream; identical 2,988,946 B data file. |
| `make mini` with our additions | about 2.5 min incremental | See below. |

**One workaround was needed.** Emscripten's SDL2 "port" (pulled in by
Carla's engine) downloads a GitHub archive zip. This session's proxy only
serves git reads of public repos, not archive downloads, and returned a JSON
error body whose hash naturally failed the check. Cloning the same SDL
release over git and pointing Emscripten at the directory with
`EMCC_LOCAL_PORTS` fixed it. No other port was fetched. On a machine with
plain internet access this step is unnecessary.

**Side product.** The standard `make mini` also emits the DSP/UI split
variant: `CardinalMini_dsp.wasm` (23.9 MB) is a headless engine with no
user interface compiled in. That is the starting artifact for the option B+
spike in document 06, obtained for free.

## The additions build

The nine modules from document 03 needed four extra things the recipe did
not list, all found by link errors and now in the patch:

- Bogaudio shared sources: `addressable_sequence.cpp`, `slew_common.cpp`,
  `output_range.cpp`.
- Bogaudio **ADDR-SEQ X** (the ADDR-SEQ expander), because the sequencer
  references its model; it is registered too, so the module count is one
  higher than planned.
- Impromptu `PhraseSeqUtil.cpp`, which GateSeq64 calls into.
- Impromptu's `ClockedExpander` and `GateSeq64Expander`, referenced by their
  parents; registered as modules as well.

Net: 13 modules added (53 to 66 in the module browser).

| File | Stock Mini | With additions | Delta |
|---|---|---|---|
| CardinalMini.wasm | 32,493,542 B | 32,886,351 B | +0.39 MB |
| CardinalMini.data | 2,988,946 B | 3,730,761 B | +0.74 MB |
| CardinalMini.js | 3,904,142 B | 3,916,545 B | +0.01 MB |

Over the wire with brotli the stock build is about 9 MB; the additions add
well under 1 MB. Size was never going to be the constraint on Mini.

## Verified in headless Chromium

- The additions build loads, audio starts, the module browser lists 66
  modules, and a patch instantiating Clocked, Clkd, GateSeq64, SEQ 3, both
  Sequential Switches, SLEW, SWITCH81, RGATE and ADDR-SEQ loads with every
  panel SVG reported as loaded by Rack and no page errors.
  Screenshots: `docs/spikes/2026-10-15-own-build-66-modules.png`,
  `docs/spikes/2026-10-15-own-build-additions-patch.png`; the test patch is
  `docs/spikes/additions-smoke-test.vcv`.
- A note for anyone repeating this: the software WebGL renderer draws
  module panels lazily at a few frames per second, so a screenshot taken a
  few seconds after a patch loads can show lights without panels. Twelve
  seconds in, everything had drawn. It is a renderer artefact, not a
  missing resource.

## What this unlocks

1. Our own build pipeline exists and takes about 11 minutes incremental
   after a one-time 40-minute setup. Cardinal's CI workflow can be copied
   for GitHub Actions; the SDL2 workaround is unnecessary there.
2. The fork bridge (load patch from a string, selection event, parameter
   readout) can now be written and tested in the same loop: edit, build,
   headless test.
3. The headless engine wasm for the option B+ spike already exists.
