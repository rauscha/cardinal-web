# Research: mobile audio, MIDI, export, and the learning layer

Written 2026-10-14. Builds on `01-feasibility-and-architecture.md`. Scope
decision recorded the same day: **Option A on the Cardinal Mini variant**
(HTML shell around the stock WASM; everything new is HTML/JS). This document
collects the facts that shape the shell and the learning content.

Tags as before: **[SOLID]** primary source fetched or code read;
**[PLAUSIBLE]** secondary source or inference. Research was done by four
parallel agents plus direct reads of the Cardinal source, the plugin
manifests, and Andrew's `rauscha/parallax` repo. Source URLs are inline.

## 1. Mobile web audio: what the shell has to handle

### Lifecycle facts

- [SOLID] Chrome and Safari start an AudioContext `suspended` until a user
  gesture; call `resume()` inside a tap handler. Home-screen installs on
  Android get unmuted autoplay. https://www.chromium.org/audio-video/autoplay
- [SOLID] The browser's own autoplay suspension and the app's `suspend()`
  look identical from JS, so keep your own "user paused" flag.
  https://github.com/WebAudio/web-audio-api/issues/1802
- [SOLID] `interrupted` is the state after a phone call or another app
  takes audio on iOS; `resume()` is the documented recovery.
  https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state
- [PLAUSIBLE] iOS sometimes reports `running` while silent after
  app-switching; the field fix is `suspend()` then `resume()`, retried.
  WebKit bugs 283419, 217606.
- [SOLID] Still open as of iOS 26.0: a Home Screen web app can come back
  from background with a silent context even though `resume()` succeeds.
  https://bugs.webkit.org/show_bug.cgi?id=291892
- [SOLID] On iOS a speaker-to-Bluetooth route change can change the
  context's sample rate mid-session and distort Web Audio output. Bug still
  NEW. https://bugs.webkit.org/show_bug.cgi?id=258864
- [PLAUSIBLE] iOS home-screen apps stop audio on screen lock; Android Chrome
  keeps an audible tab alive. Do not promise background playback.

### ScriptProcessorNode (what Cardinal uses)

- [SOLID] Deprecated but not scheduled for removal in any browser; Godot and
  Faust both still ship it as a fallback. Buffer sizes 256 to 16384.
  https://lists.w3.org/Archives/Public/public-audio/2023JanMar/0003.html
- [SOLID] Glitches come from sharing the main thread with layout, JS and GC.
  On iOS a larger buffer did not help in WebKit's own report (bug 223380).
- [PLAUSIBLE] A recorder node downstream of Cardinal's output adds no
  main-thread load; it just copies rendered blocks.

### Recording to WAV

- [SOLID] Neither Safari nor Chromium's MediaRecorder can produce WAV.
  Safari gives MP4/AAC (ALAC or PCM in fragmented MP4 since 18.4); Chromium
  gives WebM/Opus or MP4. https://webkit.org/blog/16574/webkit-features-in-safari-18-4/
  https://chromium.googlesource.com/chromium/src/media/+/refs/heads/main/muxers/README.md
- Verdict [PLAUSIBLE, strong]: tap PCM from `Module.WebAudioBridge` in the
  page, buffer Float32 blocks, write a 16- or 24-bit WAV in JS. Lossless and
  identical on every platform.
- [SOLID] Saving on iOS: Blob plus `download` attribute is unreliable
  (WebKit bug 263608, still open). Web Share with files works on iOS 12.2+
  and Chrome Android and must be called from a gesture.
  `showSaveFilePicker` is Chromium desktop only. https://caniuse.com/web-share

### Sample rate, latency, wake lock, silent switch

- [SOLID] iOS inherits the hardware rate at construction (44.1 or 48 kHz).
  `outputLatency` is readable in Chrome 102+, Firefox 70+, Safari 18.4+.
  https://web.dev/articles/audio-output-latency
- [PLAUSIBLE] Bluetooth adds roughly 110 to 240 ms. Anything over 100 ms is
  not playable live. https://www.rtings.com/headphones/learn/latency
- [SOLID] Screen Wake Lock works in Safari 16.4+ and Chrome Android, but not
  in iOS Home Screen apps before iOS 18.4. https://caniuse.com/wake-lock
- [PLAUSIBLE] `navigator.audioSession.type = "playback"` (Safari only) keeps
  Web Audio audible with the silent switch on. WebKit bug 264473.

### Storage for a large WASM app

- [SOLID] Safari 17+ allows up to 60 percent of disk per origin; eviction is
  whole-origin and skipped for persistent origins; Home Screen apps are
  granted persistence heuristically. https://webkit.org/blog/14403/updates-to-storage-policy/
- [SOLID] The 7-day eviction rule applies to Safari tabs, not to installed
  Home Screen apps. https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- [SOLID] Emscripten `--use-preload-cache` stores the data file in IndexedDB
  keyed by hash and falls back to fetch on failure. We should cache the
  compressed artefacts in the service worker instead, and not run both.

### Design rules for the shell (derived)

1. One large "Start audio" button; create and resume the context only in
   its handler.
2. Keep a `userPaused` flag; auto-resume on visibility or focus only when
   the user did not pause.
3. A recovery routine for `interrupted` and "running but silent": suspend,
   resume, retry, then a visible "Tap to restore audio" that recreates the
   context.
4. Set `audioSession.type = "playback"` when the property exists.
5. Watch `sampleRate` and `outputLatency`; on a rate change offer "Restart
   audio engine"; show latency as text ("Bluetooth, about 200 ms, not for
   live playing"), never as a colour.
6. Hold a Screen Wake Lock while a patch runs.
7. Say plainly that iOS stops audio on screen lock.
8. Record by tapping PCM and writing WAV in JS; never MediaRecorder for the
   lossless path.
9. Deliver files by Web Share first, Blob download second with
   `application/octet-stream`.
10. Precache the compressed WASM and data in the service worker; call
    `navigator.storage.persist()`; show cached size and a Re-download button.
11. Push Home Screen install: it fixes eviction, autoplay and persistence.

## 2. MIDI on mobile

### Facts

- [SOLID] Android Chrome, Samsung Internet and WebView browsers have Web
  MIDI; Firefox Android does not. Since Chrome 124 the whole API sits behind
  a permission prompt. https://caniuse.com/midi
  https://developer.chrome.com/blog/web-midi-permission-prompt
- [SOLID] Chrome marks unplugged ports `disconnected` rather than removing
  them, and port IDs change across reconnects. Re-enumerate on user action,
  not only on `onstatechange`.
- [PLAUSIBLE] USB class-compliant controllers work over USB-C OTG; bus-
  powered keyboards may exceed what a phone supplies. Document "powered hub
  or self-powered controller."
- [SOLID] Android exposes Bluetooth MIDI devices to apps only while some app
  holds `openBluetoothDevice()`; OS pairing alone is not enough. Google's
  "MIDI BLE Connect" app does this. Alternatively the page can speak BLE-MIDI
  itself through Web Bluetooth (service `03B80E5A-EDE8-4B33-A751-6CE34EC4C700`).
  https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/media/java/android/media/midi/MidiManager.java
- [SOLID] iOS has neither Web MIDI nor Web Bluetooth through Safari 27.2,
  and WebKit is on record as opposed to generic peripheral APIs. No Safari
  PWA can see MIDI hardware. https://caniuse.com/web-bluetooth
- [SOLID] The one real iOS route is **MIDIWeb Browser** by 5of12 (free, iOS
  17.6+, actively updated): a browser with Web MIDI, so our PWA runs in it
  unchanged. https://apps.apple.com/app/midiweb-browser/id6757226617
- [SOLID] Native wrappers (Capacitor, Cordova) have no maintained iOS MIDI
  plugin; building one means a Mac, Xcode, the Developer Program and a Swift
  CoreMIDI bridge. Not for this project.
- [SOLID] Network MIDI is possible: jzz-midi-ws and jzz-midi-rtc (MIT, Sep
  2025) expose remote ports as Web MIDI ports; a Pi or laptop running
  rtpmidid plus a small Node relay would feed an iPad over Wi-Fi. Adds a
  device and setup friction. https://github.com/jazz-soft/JZZ-midi-RTC
- [SOLID] Web MIDI cannot create virtual or loopback ports.
  https://www.w3.org/TR/webmidi/
- [SOLID] `MIDIOutput.send(data, timestamp)` timestamps are on the
  `performance.now()` clock. https://developer.mozilla.org/en-US/docs/Web/API/MIDIOutput/send
- [PLAUSIBLE] Phone soft keyboards deliver `keyCode 229`, so the desktop
  "QWERTY as MIDI" fallback does not work on phones. Physical Bluetooth
  keyboards do.
- [SOLID] Libraries: JZZ 1.9.6 (MIT, 2025-09), with jzz-midi-smf for
  Standard MIDI Files, jzz-midi-ws, jzz-midi-rtc. WEBMIDI.js 3.3.1
  (Apache-2.0, 2026-09). midi-file 1.2.4 (MIT, 47 kB, arbitrary PPQ).
  @tonejs/midi 2.0.28 (MIT, 2022, what parallax uses).

### Recommended MIDI architecture

- Interpose `navigator.requestMIDIAccess` before Cardinal's script loads.
  The shell returns a MIDIAccess-shaped object that merges real ports with
  virtual ones: a Touch Keyboard/XY input, an optional Network input, and a
  "Recorder" output. Cardinal's own behaviour (attach to every input, open
  every output) then works unchanged on every platform, including iOS where
  only the virtual ports exist. [PLAUSIBLE: needs a prototype]
- Wrap `send` on real and virtual outputs to log `(bytes, timestamp)` into
  a ring buffer. Export as SMF type 0 at PPQ 960 with a user-chosen tempo.
- Android: request access with no sysex from a tap; Rescan button; one-line
  hints about OTG power and Chrome's site-settings reset.
- Android Bluetooth: a "Connect Bluetooth MIDI" button via Web Bluetooth
  feeding the virtual input, with MIDI BLE Connect named as the alternative.
- iOS: when `requestMIDIAccess` is missing, show a text banner: touch
  keyboard active; for hardware MIDI open this page in MIDIWeb Browser or
  connect a network bridge.
- Touch instrument: `touch-action: none` surface, one pointer per voice,
  MPE member channels for per-note bend, pressure only when the hardware
  reports it. Every state labelled with text and icon.
- One MIDI library, JZZ preferred.

## 3. WAV and MIDI export: design

| Export | Source of data | Encoder | Delivery | Status |
|---|---|---|---|---|
| WAV | PCM tap on `Module.WebAudioBridge` output (a second ScriptProcessor or an AudioWorklet fed from the engine node) | ~80 lines of JS writing RIFF/WAVE 16- or 24-bit | Web Share, then Blob download | [SOLID] objects reachable; [PLAUSIBLE] glitch-free on phones |
| MIDI | Wrapped `send()` on real and virtual outputs, fed by Cardinal's Host MIDI module | midi-file or jzz-midi-smf, PPQ 960 | same | [PLAUSIBLE] |
| Patch | Cardinal's own `.vcv` via `Module.FS` | none | same, plus a share URL | [SOLID] |

Both exports live entirely in the shell. Neither needs a Cardinal change.
A "record" session should capture WAV and MIDI together so a take can be
reopened in a DAW with both.

## 4. What parallax already solved, and what to carry over

Read from `rauscha/parallax` at commit 0c4da8f (2026-10-01). It is a
Svelte 5 + Vite + vite-plugin-pwa app with Emscripten-compiled DSP in
AudioWorklets, hosted on GitHub Pages at andrewrausch.com/parallax/.

**Reuse as-is or near-as-is**

- The PWA manifest and Workbox precache configuration in `vite.config.ts`:
  explicit `id: './'`, `base` set to the project path at build time,
  manual service-worker registration to satisfy a strict CSP, precache of
  WASM and worklets for offline use. Same origin and same constraints as
  this project. [SOLID]
- The CSP-as-meta-tag build plugin, with its `wasm-unsafe-eval` and
  `worker-src blob:` notes. Cardinal's loader will need the same
  `wasm-unsafe-eval`. [SOLID]
- `TapToStart.svelte` and the `AudioEngine` visibility handler: the
  "browsers require a click" overlay with a confirmation note on start, and
  resume on `visibilitychange`. Extend with the recovery routine from
  section 1. [SOLID]
- `state/midi-input.ts`: enable flow, device list, remembered device by
  name with a visible notice when the saved port is renamed or missing
  ("never switch silently"), activity dot, panic. This is the device picker
  the shell needs. [SOLID]
- `sequencer/midi/convert.ts`: tick-based SMF writing with `@tonejs/midi`,
  tempo in the header. For live capture we need arbitrary timestamps, so
  midi-file or jzz-midi-smf fit better, but the structure carries over.
- `share-url.ts`: whole state compressed with lz-string into the URL hash,
  nothing sent to a server. Works for lesson deep links and patch sharing.
  Cardinal's web build already accepts a `?patchstorage=` parameter, so a
  `#patch=` hash carrying a compressed `.vcv` is the natural analogue.
- `contrast.test.ts` and the token-based themes: WCAG AA enforced by test,
  colour never the only channel. Same rule as CLAUDE.md here. [SOLID]
- The product principles in `PRODUCT.md`: tell the truth about the
  instrument, teach toward the hardware, keep playing while learning. These
  transfer verbatim.

**Reuse the pattern, not the code**

- The Explain panel data model (`data/braids-models.ts`): per model, one
  sentence of description, what each macro knob does, and a two-line detail
  of "listen for" and "good for", with a "show me" sweep that moves the knob
  while the card is lit. For Cardinal the equivalent unit is a module, with
  per-port and per-knob lines. Plaits (16 models) and Surge's 11 VCOs are the
  first candidates; parallax already has `plaits-models.ts`, which may be
  reusable as a starting corpus (check its licence and wording).
- The Match tool (`MatchPanel.svelte`, `suggest.ts`): load a sound, loop a
  region, compare spectra, get a ranked starting patch. Heavy; a later idea
  for "find this sound" lessons.
- The FM flowsheet teacher: live traces at each node. Not feasible inside
  Cardinal's canvas, but Fundamental Scope in every lesson patch is the
  low-cost version of the same idea.

**Do not carry over**

- `audio/export.ts` uses MediaRecorder and ships WebM/Opus, explicitly
  deferring WAV. Its own spec (`2026-06-20-one-loop-audio-export.md`) names
  the PCM-tap route as the follow-up. We go straight to the PCM tap.
- Tone.js: parallax uses it only for transport scheduling. Cardinal has its
  own engine clock and Host Time; the shell does not need Tone.
- Monophonic assumptions in the MIDI note stack: Cardinal is polyphonic.

## 5. The learning layer

### 5.1 Beginner curricula worth linking

| Resource | Format | VCV-based | Free | Fit | Tag |
|---|---|---|---|---|---|
| Learning Modular, *Basic Concepts of Synthesis* (Chris Meyer), courses.learningmodular.com/courses/basic-concepts | 10 videos with transcripts | Hardware | Yes, email signup | The theory spine: one concept per video, shown on a scope and heard | SOLID |
| Learning Modular glossary, learningmodular.com/glossary/ | Text | Agnostic | Yes | Definitions for the help drawer (link, do not copy) | SOLID |
| VCV manual *Getting Started* and *Core*, vcvrack.com/manual/ | Text | Yes | Yes | Canonical definitions of audio, CV, 1 V/oct, gate, trigger; Core maps to Cardinal's Host MIDI family | SOLID |
| VCV Community beginner video index, community.vcvrack.com/t/.../11204 | Curated list | Yes | Yes | Source of truth for video links | SOLID |
| Omri Cohen, *Your first minutes in VCV 2*, youtube.com/watch?v=c-27PRPxwTg | Video, embeddable | Yes | Yes | Standard first video | SOLID link |
| Omri Cohen, *Learning Synthesis with Interzone* (Jan 2026) | Video, chaptered EG/VCO/LFO/filter | Yes | Yes | Teaches a bundled module | PLAUSIBLE |
| Red Means Recording, *Let's Learn Eurorack (ft. VCV Rack)*, 4 parts | Video, embeddable | Yes | Yes | Good adult register | SOLID link |
| Jakub Ciupinski, *VCV Rack Getting started* | Video, embeddable | Yes | Yes | | SOLID link |
| Sound On Sound *Synth Secrets* (Gordon Reid), 63 parts | Text with spectra and one equation per article | No | Yes | The right depth for a medicine-trained reader | SOLID |
| Ableton *Learning Synths*, learningsynths.ableton.com | Interactive | No | Yes | The best model for how to teach, not what | SOLID exists |
| Syntorial, syntorial.com | Interactive ear training | No | First 22 of 199 lessons | Model for recreate-by-ear challenges | SOLID |
| Chrome Music Lab (open source) | Interactive toys | No | Yes | Physics-of-sound warm-ups | SOLID repo |
| Sarah Belle Reid, Omri Cohen paid courses, Mylar Melodies, DivKid, Loopop | Video | Mixed | Mostly paid or hardware | "Go deeper" links only | PLAUSIBLE |

### 5.2 Module documentation for the Mini set (verified against the manifests)

Read directly from each plugin's `plugin.json` at the commits Cardinal pins,
then each URL was fetched.

| Family (modules in Mini) | Manual | Per-module links | Doc licence | Verdict |
|---|---|---|---|---|
| Cardinal host modules (Host Audio, CV, MIDI, MIDI CC, MIDI Gate, MIDI Map, Parameters, Parameters Map, Time, Text Editor, Audio To CV Pitch) | docs/CARDINAL-MODULES.md in the Cardinal repo | Yes, anchors per module | GPLv3+ | May embed with attribution |
| Fundamental (14 modules) | vcvrack.com/Fundamental, which now redirects to vcvrack.com/Free; manual text is on that page with `#VCO`-style anchors | Yes | Unstated | Link out |
| Bogaudio (11) | README with named anchors (`#vco`, `#lfo`, `#ad`, `#samplehold`, `#switch18`...) | Yes | README unstated; graphics CC BY-SA 4.0 | Paraphrase, link out |
| Surge XT (27 modules: 11 VCOs, VCF, Waveshaper, Delay, two Tuned Delays, LFO x EG, EG x VCA, Quad AD, Quad LFO, two Mixers, Mod Matrix, Nimbus, Digital Ring Mods, Unison Helper + expander) | One long page at surge-synthesizer.github.io/rack_xt_manual/; the 11 VCOs are bullet entries, not sections | No module-level `manualUrl` in the manifest | Unstated | Link to the page; write our own per-VCO lines |
| Audible Instruments Macro Oscillator 2 (Plaits) | pichenettes.github.io/mutable-instruments-documentation/modules/plaits/manual/ (the old mutable-instruments.net URL redirects there) | One page, 16 models | Unstated; firmware MIT | Paraphrase |
| Valley Dexter, Interzone | Dexter: a PDF linked from the README. Interzone: nothing. valleyaudio.github.io has only Home and About | None | n/a | Write our own; third-party guide at chilloutwithbeats.com for Dexter |
| Mockba Modular (7) | README, one line per module; ReVoltah described only in plugin.json | None | MIT | May embed; still needs our own text |
| Aria Salvatrice Spleet, Swerge | Manifest URL aria.dog/modules/splitmerge returns 404; her site was restructured and the new /modular/ path refused the fetch | None | Unknown | Write our own (they are split/merge utilities) |

Net: of roughly 75 Mini modules, about 35 have a direct, working manual
link. The rest need original help text. That is a content job, not a
technical one.

### 5.3 Plaits, the richest single teaching object [SOLID]

Sixteen models, each with HARMONICS / TIMBRE / MORPH meanings:

| # | Model | Harmonics / Timbre / Morph |
|---|---|---|
| 1 | Detuned VA pair | detune / square to pulse to sync / triangle to saw |
| 2 | Waveshaper and folder | wave / fold amount / asymmetry |
| 3 | Two-operator FM | ratio / index / feedback |
| 4 | Formant (VOSIM, pulsar, grainlet, CZ) | formant ratio / formant frequency / width |
| 5 | Additive | number of bumps / dominant harmonic / bump shape |
| 6 | Wavetable | bank / row (brightness) / column |
| 7 | Chords | chord type / inversion / waveform |
| 8 | Speech | algorithm and word bank / species / phoneme |
| 9 | Swarm (8 saw grains) | pitch randomness / density / grain length |
| 10 | Filtered noise | LP to BP to HP / clock rate / resonance |
| 11 | Dust / particle noise | frequency randomness / density / filter |
| 12 | String (mini-Rings) | inharmonicity / excitation brightness / decay |
| 13 | Modal (mini-Rings) | same |
| 14 | Analog kick | attack overdrive / brightness / decay |
| 15 | Analog snare | harmonic-noise balance / mode balance / decay |
| 16 | Hi-hat | metallic-noise balance / HPF cutoff / decay |

Firmware 1.2 added eight more models in hardware; there is no evidence the
Audible Instruments port in Cardinal has them. Plan on 16. [PLAUSIBLE]

For FM (Surge FM2/FM3 and Dexter): Synth Secrets parts 12 and 13 are the
primary text. Dexter is 4 operators, 23 algorithms, 35 wavetables, two
layers. [PLAUSIBLE on the Dexter numbers]

### 5.4 Pedagogy patterns to copy

1. **Learning Synths**: one concept per screen, a live widget on every
   page, "Open in Playground" carries the lesson state into the full
   instrument. In our terms: each lesson is a pre-built Mini patch loaded
   into the real Cardinal canvas, with one knob or cable highlighted.
2. **Syntorial**: hear a target, recreate it by ear, A/B against yours.
3. **Learning Modular**: one parameter class per lesson, shown on a scope
   and heard. Fundamental Scope goes in every lesson patch.
4. **Chrome Music Lab**: zero-text warm-ups on sound physics.
5. **Omri Cohen patch-along**: build from an empty rack, chaptered by
   module, with the patch file shared.
6. **Synth Secrets**: one diagram and one equation per article for the
   "why".
7. **Parallax's own loop**: prose that rewrites itself as the knob moves, and
   a "show me" sweep. Doable in the shell for any knob Cardinal exposes
   through Host Parameters Map. [PLAUSIBLE: needs a check that parameter
   values are readable from the shell at runtime]

### 5.5 Colour, cables and protanopia

- [SOLID] VCV and Cardinal cable colours carry no meaning; the palette just
  cycles and is user-editable since Rack 2.5.
- [SOLID] Teaching videos nonetheless rely on hue (Omri Cohen's four default
  colours for pulses, CV, V/oct, audio). No community thread considers
  colour-blind viewers.
- Rule for our diagrams and captions: signal class by line style plus an
  end label (A, CV, G, V/oct), never by hue. When embedding a video, add a
  caption translating its colour convention.

### 5.6 Licensing of learning material

| Source | May we embed text? | Notes |
|---|---|---|
| Cardinal docs | Yes, GPLv3+, with notice | |
| Mockba README | Yes, MIT | |
| VCV Rack manual | Probably, CC BY-SA 4.0 with attribution and share-alike | [PLAUSIBLE: licence seen only in a search snippet] |
| Fundamental page, Bogaudio README, Surge manual, Plaits manual | No licence stated | Link out or paraphrase |
| Synth Secrets | No, all rights reserved | Link only |
| Learning Modular, Ableton, Syntorial | No | Link only |
| YouTube (Omri Cohen, Red Means Recording, Ciupinski) | Embed, do not download | oEmbed confirmed enabled; recheck IDs at build time |

### 5.7 Ten-lesson "learn modular" track, bundled modules only

1. **Sound is voltage.** Host Audio, Fundamental VCO, Scope. Four waveforms
   seen and heard. Links: Synth Secrets 1; Learning Modular lesson 2.
2. **Pitch is 1 V/oct.** Host MIDI to VCO; Bogaudio Offset adds exactly 1 V
   and you hear an octave. Link: VCV Getting Started.
3. **Gates, triggers, envelopes.** Host MIDI Gate to ADSR to VCA; ADSR
   against Bogaudio AD. Links: Synth Secrets 7; Learning Modular 8.
4. **The VCA.** VCA Mix against Fundamental VCA; linear against exponential
   (Bogaudio VCA in dB mode). Link: Synth Secrets 9.
5. **Filters: mode, slope, resonance.** Fundamental VCF, Bogaudio VCF,
   Mockba Filtah; three A/B screens. Links: Synth Secrets 4 to 6.
6. **Modulation.** LFO to cutoff; Noise to S&H to Quantizer to VCO for a
   random melody. Links: Synth Secrets 10; Learning Modular 9 and 10.
7. **Polyphony, split and merge.** Unison to Spleet/Swerge, Merge/Split,
   Sum. Link: VCV Core polyphony.
8. **One box, sixteen engines.** Plaits model tour with the table above;
   Mockba CZ as the phase-distortion sibling. Link: Plaits manual.
9. **FM from first principles.** Surge FM2 and FM3, then Dexter. Links:
   Synth Secrets 12 and 13.
10. **A complete voice, two ways.** Rebuild the lesson 1 to 6 chain, then
    compare to Interzone and to Surge EG x VCA plus Waveshaper plus Nimbus,
    clocked from Host Time. Links: Omri Cohen Interzone video; Surge manual.

## 6. Build tutorials: sounds, arps, expression, song design

The fourth research pass looked for recipe-style material the app can link
to or adapt. Three structural facts first, verified in the Cardinal source:

- [SOLID] The Mini web build does receive Web MIDI. Its plugin header sets
  MIDI input, MIDI output and MPE on, and the same web bridge serves it
  (`src/CardinalMini/DistrhoPluginInfo.h`). Host MIDI, Host MIDI CC and
  Host MIDI Gate therefore work from a phone's USB controller on Android.
  Runtime check still owed.
- [SOLID] Loading a patch from the URL is switched off in the Mini variant.
  All three mechanisms (`?patch=` inline, `?patchurl=`, `?patchstorage=`)
  are behind `! CARDINAL_VARIANT_MINI` in `src/CardinalUI.cpp`, and the two
  remote ones call same-origin PHP proxies that exist only on kx.studio.
  Lesson deep links need a one-line fork change (drop the gate on the
  inline `?patch=` path) or a shell-side loader through `Module.FS`. This is
  the first justified C++ change in the project.
- [SOLID] Mini has no sequencer, arpeggiator, clock divider, slew limiter,
  logic or drum module. Rhythm and melody come from LFO, Random, Sample &
  Hold, Quantizer, Switch, looping AD envelopes, or external MIDI. Every
  recipe below is checked against that.

### 6.1 Classic sounds

| Sound | Best source | Our modules | Gap |
|---|---|---|---|
| Sine kick and sub | VCV thread "Kick drums and basslines from sine oscillators" community.vcvrack.com/t/.../10548 (settings given); SOS "Synthesizing Drums: The Bass Drum" | Fundamental VCO sine with FM input, two ADSR, VCA; LFO square as clock | none [SOLID] |
| Snare, clap, hat | SOS "Synthesizing Drums: The Snare Drum"; Noise Engineering "Quick patch: claps" | Noise to VCF (BPF/HPF) to ADSR to VCA; sine body via VCA Mix; Surge Waveshaper for saturation | none [SOLID/PLAUSIBLE] |
| Metallic hats (808 method) | SOS "Analysing Metallic Percussion", "Practical Cymbal Synthesis" | six detuned squares: Surge Classic VCO unison or Bogaudio Unison into a poly VCO, then HPF | none [PLAUSIBLE] |
| Acid bass | VCV Rack Ideas acid-techno video (2018, patch on Patreon) | Interzone as the voice (built-in glide, resonant filter); or VCO to VCF with Bogaudio AD on cutoff | no slew limiter for the VCO version; sequencer from 6.2 or MIDI [PLAUSIBLE] |
| PWM pad and strings | SOS "Synthesizing Strings: PWM and String Sounds", "String Machines" | VCO pulse width from a slow Bogaudio LFO, slow ADSR, Surge Delay as chorus or Nimbus | none [PLAUSIBLE] |
| Supersaw | VCV thread "Bogaudio Unison to make monster sounds" community.vcvrack.com/t/.../16772 (patch attached) | Bogaudio Unison after Quantizer into poly Fundamental VCO; or Surge VCO unison | none [SOLID] |
| FM bell | SOS "Synthesizing Bells" | Dexter or Surge FM2 at ratios near 1.67:1 or 2.33:1, fast attack, long decay | none [SOLID] |
| Pluck | SOS "Synthesizing Plucked Strings" | saw to VCF with fast-decay envelope; Plaits or Surge String VCO as shortcuts | none [SOLID] |
| Karplus-Strong | Learning Modular glossary; VCV thread community.vcvrack.com/t/.../10150 | Noise to short AD and VCA to Surge Tuned Delay with feedback and a VCF in the loop | none [PLAUSIBLE] |
| Lead with vibrato | Omri Cohen paid course lesson list | LFO to VCO FM through a VCA for depth | none [PLAUSIBLE] |

### 6.2 Arps and rhythm without a sequencer

| Technique | Source | Our modules | Gap |
|---|---|---|---|
| Random melody | Chillout With Beats "Create a sequence with sample and hold" chilloutwithbeats.com/vcv-rack-s-and-h/; VCV "Patches for beginners" `random_melodies.vcv` | Bogaudio S&H normals to internal noise when its input is empty [SOLID from README]; clock from Bogaudio LFO square; Quantizer | none [SOLID] |
| Classic S&H arp | cmtext.com chapter 4; Muzines "Advanced Music Synthesis" | sample a triangle for up-down, a saw for one direction; Bogaudio LFO gives both at once | none [PLAUSIBLE] |
| Switch as step sequencer | Bogaudio README (Switch 1:8 has clock, reset, steps, direction) | eight Bogaudio Offset constants into a 1:8 switch, mixed back through two VCA Mix | clumsy: an 8:1 switch or ADDR-SEQ would be natural; neither is in Mini [SOLID] |
| No-sequencer challenge | VCP Challenge 73 community.vcvrack.com/t/.../18209 (three patches, two videos) | LFO plus mixer plus S&H plus Quantizer | the shift-register tricks need modules we lack [SOLID] |
| Phone or laptop as arpeggiator | iOS AUv3 arps exist (ArpBud 2, Kebarp); no free browser arp found | Host MIDI receives it over Web MIDI on Android | iOS cannot send MIDI to a Safari PWA; see section 2 [PLAUSIBLE] |

### 6.3 Expression

| Topic | Source | Our modules | Gap |
|---|---|---|---|
| Velocity and aftertouch | AJH Synth video "Velocity and Aftertouch: how to control VCA, LFO, VCF" (chaptered) | Host MIDI VEL and AFT outputs to VCA CV, VCF cutoff, and an LFO-depth VCA; Bogaudio Offset for scaling | none [SOLID] |
| Mod wheel and CC | VCV Core manual (CC 0 to 10 V, no 14-bit) | Host MIDI CC exposes channel pressure and pitch bend too [SOLID, Cardinal docs] | none |
| MPE | VCV forum thread 10580 (MIDI-CV poly 16, mode MPE) | Mini sets MPE on in its plugin header [SOLID] | the menu path in Cardinal is unverified |
| Performance macros | Craig Anderton "Use Matrix Modulation for More Synth Expressiveness" | Surge Mod Matrix | no tutorial exists for Surge's matrix in Rack; we write it [PLAUSIBLE] |

### 6.4 Generative and self-playing

- **Krell patch**: feasible with Bogaudio AD in loop mode with its end-of-cycle
  output, Random's smooth output, S&H and Quantizer. Sources: Omri Cohen
  "Let's build a Krell Patch" (patch attached, community thread 2614); Todd
  Barton's original; Eric Schlappi's "Introduction to Generative Patching"
  lecture. [SOLID]
- **Cross-modulating LFOs**: two slow Bogaudio LFOs into a third's FM input.
  [PLAUSIBLE]
- **Probability gating**: Random's trigger output into Switch. [PLAUSIBLE]
- Not feasible with Mini: Turing machine, Benjolin, Marbles-style patterns.
  No shift register or logic.

### 6.5 Song structure and sound-design process

Nothing free and specific to arranging with a modular was found. Closest:
Omri Cohen "Building a Techno patch from scratch" (chaptered: kick, hats,
bass, performance controls; uses paid VCV Drums), Attack Magazine "4 ways to
break out of the loop" (DAW-oriented, principles transfer), the
modulations.substack VCV ambient-track walk-through, and cyball's riser
video. The app will have to author this layer itself, built on the
twelve tutorials below. [SOLID that the gap exists]

### 6.6 Patch sharing and what may be bundled

- [SOLID] Patchstorage has a Cardinal platform (id 7834, about 213 patches)
  and a public beta API with CORS enabled for both metadata and `.vcv`
  downloads, so a static GitHub Pages app can fetch patches client-side.
  https://patchstorage.com/platform/cardinal/
- [SOLID] Patchstorage licences are chosen per upload (CC BY 4.0, AFL 3.0,
  WTFPL seen). Nothing can be bundled without a per-patch check.
- [SOLID] Cardinal's own `patches/` directory (examples, mini, templates,
  `welcome-wasm-mini.vcv`) is stated to be public domain or CC0. Directly
  bundleable. https://github.com/DISTRHO/Cardinal/tree/main/patches
- [SOLID] No existing lesson pack uses only the Mini module set. Patch and
  Tweak's 50 patches, Spektralisk's templates, SATURATA's ambient set and
  the Patchstorage "Drone Synth for Beginners" (WTFPL, uses Plaits) all
  pull in modules we do not ship. Omri Cohen's free "5 Patchlets with
  Fundamental" video is the closest match and needs checking.

### 6.7 Twelve build tutorials for the app

1. **Sine kick.** Fundamental VCO sine with FM input, two ADSR, VCA, LFO
   square as clock. Links: VCV thread 10548; SOS bass drum.
2. **Noise snare and hat.** Noise to VCF to ADSR to VCA, sine body through
   VCA Mix. Links: SOS snare; Noise Engineering claps.
3. **Sub and acid bass.** Interzone as the voice, or VCO to VCF with
   Bogaudio AD on cutoff. Link: VCV Rack Ideas acid video. Gap: no slew
   limiter for the VCO version; melody from tutorial 8 or MIDI.
4. **PWM pad.** VCO pulse width from Bogaudio LFO, slow ADSR, Surge Delay or
   Nimbus. Link: SOS PWM strings.
5. **Supersaw.** Bogaudio Unison after Quantizer into poly VCO, or Surge
   Classic unison. Link: VCV thread 16772.
6. **FM bell and pluck.** Dexter or Surge FM2; pluck via VCF decay
   envelope. Links: SOS bells; SOS plucked strings.
7. **Karplus-Strong.** Noise to short AD and VCA to Surge Tuned Delay with
   feedback and a VCF in the loop. Link: Learning Modular glossary.
8. **Random melody and S&H arp.** Bogaudio LFO as clock and source, Bogaudio
   S&H, Quantizer, VCO. Links: Chillout S&H; `random_melodies.vcv`.
9. **Switch as sequencer.** Offset constants into Switch 1:8 clocked by LFO,
   mixed back, Quantizer. Link: Bogaudio README. Gap: wants an 8:1 switch.
10. **Krell self-player.** Three looping Bogaudio AD, Random smooth, S&H,
    Quantizer, VCA. Links: Omri Cohen Krell thread; Todd Barton.
11. **Expressive voice.** Host MIDI velocity to VCA and VCF, aftertouch to
    LFO depth, mod wheel via Host MIDI CC to cutoff, Surge Mod Matrix as a
    macro. Links: AJH video; VCV Core manual; Anderton. Gap: MPE menu path
    unverified in Cardinal.
12. **From loop to track.** Layer tutorials 1, 2, 3 and 8; mutes and
    transitions through Switch and VCA; riser from Noise and a VCF sweep;
    performance macros. Links: Omri Cohen techno-from-scratch chapters;
    Attack "break out of the loop"; cyball riser. Gap: no clock divider or
    gate sequencer, so rhythms come from LFO divisions or external MIDI.

The recurring gaps (slew limiter, 8:1 switch, clock divider, gate
sequencer) are all small utility modules that exist in the full Cardinal
build. **Decided 2026-10-14: add them.** The picks and the build-list
recipe are in `03-mini-module-additions.md`; the "Gap" notes above describe
the stock Mini and no longer apply to our build.

## 7. Verifications I can run next, in order

1. Prototype the `requestMIDIAccess` interposer and the `send` wrapper
   against the stock loader in headless Chromium. Decides the MIDI export
   and iOS touch-input design.
2. Attach a PCM recorder to `Module.WebAudioBridge` in headless Chromium and
   write a WAV. Decides the WAV export design.
3. Check whether knob values are readable from the shell at runtime (for
   the self-rewriting explain text). Likely through Host Parameters.
4. Confirm at runtime that Host MIDI in the Mini web build receives Web
   MIDI on Android Chrome, and find the MPE menu path.
5. Apply the Mini module additions from document 03 before the first build.
6. Build Cardinal Mini for WASM and measure it (still the gating item from
   document 01), with the one-line change that enables `?patch=` deep links
   in Mini.
7. Real-device tests on your Android phone. I cannot do these from here.
