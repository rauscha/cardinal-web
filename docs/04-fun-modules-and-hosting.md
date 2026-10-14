# Fun modules worth adding, and whether this can live on andrewrausch.com

Written 2026-10-14. Companion to documents 01 to 03. Tags: **[SOLID]** read
from the Cardinal source tree (commit 0a530b7), its `docs/LICENSES.md`,
GitHub's documentation, or measured on a live server; **[PLAUSIBLE]** my
estimate or inference.

## Part A: fun modules not in Mini

Everything in the full Cardinal is GPLv3-compatible by construction, so the
question is never "may we", only "is it worth the bytes, does it work in
WebAssembly, and does it teach something". Picks are grouped by cost.

### A1. Nearly free: already-compiled code, registration only

**Surge XT effects.** Mini already compiles `surgext/src/FX.cpp`, the one
template that produces every Surge effect module, but registers only Nimbus
and removes the other nineteen by slug. [SOLID] Adding the rest is a
registration change plus panel resources. [PLAUSIBLE that no extra DSP is
linked; Surge's effect library compiles as one unit]

| Pick | Why |
|---|---|
| Reverb2, Spring Reverb | A patch is not music until it has a room. Spring Reverb is also a classic Eurorack object. |
| Chorus, Ensemble, Phaser, Flanger, Rotary Speaker | The modulation-effects family in one lesson, A/B on the same source. |
| Distortion, Treemonster, Bonsai | Saturation and tape-style grit; Treemonster is a pitch-tracking ring mod, pure fun. |
| Frequency Shifter, Ring Mod, Vocoder | Classic "what does this do" demos. Vocoder with the phone mic input is a party trick. |
| Combulator, Resonator, Exciter, Neuron, Chow | Lower priority. |

Panel art for Surge is CC-BY-NC-SA 4.0 [SOLID]; fine for a non-commercial
site.

**Fundamental extras** (same plugin as modules already in Mini, one source
file each): Delay, Wavetable VCO, Wavetable LFO, 8vert, Mutes, Pulses,
Octave, Mix. Panels GPLv3+. [SOLID]

**Bogaudio extras** (same plugin): Walk2 (two-dimensional random walk, a
joy to patch), FM-OP (single FM operator, builds Dexter from parts), LPG
(low-pass gate, the Buchla idea), Pressor (compressor), Follow (envelope
follower, lets the mic drive the patch), Shaper, XCO, Mix4 with mutes, Pan,
DADSRH. Avoid **Analyzer**: reported throwing exceptions in the web build
(issue 287, June 2024). [SOLID]

### A2. New plugins to Mini with strong payoff

| Plugin | Code licence | Panel licence | Picks | Notes |
|---|---|---|---|---|
| **Audible Instruments** (Mutable ports; Plaits already in Mini) | GPLv3+ | Used with permission granted to Cardinal by Émilie Gillet [SOLID, LICENSE-PERMISSIONS.md] | **Rings** (resonator), **Clouds** (granular), **Marbles** (random sampler, the generative heart), **Tides 2**, **Warps**, **Branches** (Bernoulli gate), **Stages**, Ripples, Links/Kinks/Shades | Each adds its own DSP files. Skip **Elements**, CPU-heavy. The permission was given to Cardinal; we distribute a Cardinal build, which I read as covered, but it is Cardinal's chain of permission, not ours. [PLAUSIBLE] |
| **Valley** (Dexter, Interzone already in Mini) | GPLv3+ (Dexter, Plateau BSD-3 per README) | GPLv3+ [SOLID] | **Plateau** (the VCV reverb everyone uses), **Topograph** (port of Mutable Grids, the drum sequencer we are missing), Amalgam, Feline | Skip Terrorform: large wavetable data. [PLAUSIBLE] |
| **Befaco** | GPLv3+ | Panels used with Befaco's permission; components CC-BY-NC 4.0 [SOLID] | **Rampage** (dual function generator, Maths-style; the canonical Krell module), **Kickall**, **Percall**, **Chopping Kinky** (wavefolder), **Muxlicer**, **Burst**, EvenVCO, Spring Reverb | Skip Noise Plethora: CPU-heavy. [PLAUSIBLE] |
| **HetrickCV** | **CC0** | **CC0** [SOLID] | **Rungler** (the Benjolin's chaos core), Dust, Crackle, Comparator, Flip Flop, Boolean Logic, Gate Junction, Random Gates, Phasor Euclidean, Phase Driven Sequencer, Scanner, Waveshape, Rotator | Licence-cleanest plugin in Cardinal: its docs and panels can be embedded freely. Unlocks the Benjolin and logic lessons the tutorial research marked impossible. |
| **Orbits** | GPLv3+ | CC-BY-NC-ND 4.0 [SOLID] | **Eugene**, **Polygene** (Euclidean rhythm generators) | Small, delightful, teaches rhythm maths. |
| **Sapphire** | GPLv3+ | GPLv3+ [SOLID] | **Elastika** (physical model), **Tube Unit**, **Nucleus**, **Frolic**, **Glee** (chaotic LFOs), **Galaxy** (reverb), Gravy, Env, Pop, Moots | The "fun" winner in current VCV. CPU on Elastika and Nucleus is real; test on the phone. [PLAUSIBLE] |
| **WSTD-Drums** | CC0 | CC0 [SOLID] | Kick, Snare, Tomi, Kicker | Drum voices; nature (synthesis vs samples) unverified. |
| **Nonlinear Circuits** | CC0 | CC0 [SOLID] | Triple Sloth, Neuron, Statues, Squid Axon | Slow chaos and odd logic; tiny. |
| **Impromptu extras** (Clocked, GateSeq64 already decided) | GPLv3+ | CC-BY-NC-ND 4.0 [SOLID] | **ProbKey**, **Variations**, **BigButtonSeq2**, **ChordKey**, **TwelveKey** (on-screen keyboard), **Tact**, SMS16 | TwelveKey is a no-gear input, but Cardinal's touch handling limits it; the shell keyboard is the better path. |

### A3. Not for this build

- **Stoermelder STRIP**: throws exceptions in the web build (issue 287,
  2024). Other Stoermelder power tools are desktop-minded.
- **Lilac Looper**: export freezes the tab in the web build (issue 287).
- **Voxglitch** samplers and anything that wants sample files: the virtual
  filesystem makes file handling awkward on a phone; later.
- **MindMeld MixMaster**: superb but a large desktop UI.
- **Bidoo**, **ZZC**, **Stoermelder**, **Aria** sequencers and quantizers:
  overlap with what is decided; Aria's documentation site is gone.
- Two modules **already in Mini** have web-build reports to watch on first
  build: Fundamental **Scope** froze with trigger on (June 2024) and the
  Surge **VCF** misbehaved in WASM (May and November 2024). [SOLID, issue 287]

### A4. Suggested order

1. Surge effects (registration only): Reverb2, Spring Reverb, Chorus,
   Phaser, Flanger, Distortion, Frequency Shifter, Vocoder.
2. Fundamental Delay, 8vert, Mutes, Pulses; Bogaudio Walk2, FM-OP, LPG,
   Follow, Pressor.
3. Audible Instruments Rings, Clouds, Marbles, Tides 2, Branches; Valley
   Plateau, Topograph; Befaco Rampage, Kickall, Percall, Chopping Kinky.
4. HetrickCV core set; Orbits; Sapphire Elastika, Frolic, Glee, Galaxy.

Every step is a build-list edit of the kind document 03 describes. The
only honest unknown is size and phone CPU, both measured on the first
build, not guessed. [PLAUSIBLE] At some point this stops being "Mini"; the
name on the build is ours to choose.

## Part B: can it live on andrewrausch.com

Three separate questions: GitHub's rules, GPL, and bytes.

### B1. GitHub Pages and a private repository

- [SOLID] GitHub Free for personal accounts offers Pages **in public
  repositories only**. GitHub Pro adds Pages for private repositories.
  Access-controlled (truly private) Pages sites exist only for organizations
  on GitHub Enterprise Cloud. https://docs.github.com/en/get-started/learning-about-github/githubs-plans
  https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site
- Consequence: on a Free account the repo must be **public** to publish at
  all. On Pro the repo may stay private, but the **site is still public** to
  anyone with the URL. "Private app" means unlisted, not access-controlled,
  either way.

### B2. Licence

- [SOLID] The combined Cardinal binary is GPLv3-or-later. Serving the wasm
  from a public URL is conveying the program to the public, so GPLv3 section
  6 applies: everyone who can fetch the binary must be able to get the
  **Corresponding Source**: our modified Cardinal tree (build-list edits,
  the `?patch=` gate change, any touch work) and the build scripts.
- The shell. HTML and JS that call into the Emscripten `Module` object in
  the same page are tightly coupled to the GPL'd program. The safe and
  simple position is to license the shell GPLv3-or-later too and publish it
  with the rest. Arguing it is a separate work is possible but buys nothing
  here. [PLAUSIBLE on the legal reading; SOLID that the safe route costs
  nothing]
- Cleanest compliance: make this repo and the Cardinal fork public, link
  "Source" and "Licences" from the app's About screen, keep Cardinal's
  `docs/LICENSES.md` and the panel permission notes intact. That also
  satisfies GitHub Free's public-repo requirement in one move.
- Non-commercial panel art (Surge CC-BY-NC-SA, Impromptu and Orbits
  CC-BY-NC-ND, Befaco components CC-BY-NC): fine as long as the site carries
  no ads, sales or paid access. [SOLID on the licences]
- Naming: present it as "built on Cardinal", not as Cardinal. Same rule
  parallax uses for Mutable Instruments. Aria Salvatrice's README asks that
  forks go by a different name; her modules keep their names inside the
  build exactly as Cardinal ships them. [SOLID on the sources]
- Nothing in the GPL requires the repo to be public if you instead offer
  source another way, but every alternative is more work than a public repo.

### B3. Bytes

- [SOLID, measured today] GitHub Pages serves `.wasm` with the correct
  `application/wasm` type **and gzips it on the fly**: parallax's
  `braids.wasm` is 101 KB on disk and 69 KB over the wire with
  `Content-Encoding: gzip`. So Cardinal's wasm will travel compressed with
  no extra work. Whether Pages also gzips the Emscripten `.data` file
  (served as a generic binary type) is **unmeasured**; Cardinal already
  builds the data package with LZ4 inside, so it is partly compressed
  regardless. [SOLID on the LZ4 flag in `Makefile.cardinal.mk`]
- [SOLID] Limits: published site at most 1 GB; soft 100 GB per month
  bandwidth; soft 10 builds per hour; 10-minute deployment timeout.
  Separately, git refuses any file over 100 MiB.
  https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Our build's sizes are unmeasured. The full build (100 MB wasm, 163 MB
  data) fails the per-file limit; Mini plus the additions above is my
  estimate of tens of megabytes per file, under the limit. [PLAUSIBLE]
- Build in CI, not on a laptop: Cardinal's own `build.yml` already contains
  a working wasm job (ubuntu-22.04, PawPaw bootstrap, brotli compression).
  Copy it, then deploy with the `actions/deploy-pages` flow instead of
  committing binaries to git. That keeps the repository small, sidesteps the
  100 MiB git limit (the artifact path has only the 1 GB site limit) and
  removes the 10-builds-per-hour cap. [SOLID on the workflow's existence;
  PLAUSIBLE on the artifact-path limits]
- Bandwidth: at roughly 40 MB per first visit [PLAUSIBLE] the 100 GB soft
  limit allows about 2,500 cold loads a month. For one person plus friends,
  irrelevant. Installed PWAs re-download only on version change.

### B4. Verdict

Yes, with two conditions you decide, not me:

1. **Make the source public** (this repo and the Cardinal fork), or hold a
   GitHub Pro plan and still publish source some other way. Public is
   simpler and is what the GPL wants anyway.
2. **Accept that the URL is public.** Unlisted, not private. No access
   control is available on a personal account.

Space is not a blocker for Mini, pending the first measured build.
