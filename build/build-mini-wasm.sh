#!/usr/bin/env bash
# Build the Cardinal Mini variant for WebAssembly, the way it was first done
# in the 2026-10-15 cloud session. Mirrors Cardinal's own .github/workflows
# build.yml wasm job, plus one workaround for the SDL2 port download.
#
# Prerequisites (Ubuntu 24.04): git, build-essential, cmake, python3, brotli,
# gperf, meson, ninja, pkg-config. About 2.5 GB of dependency builds land in
# ~/PawPawBuilds. First run: ~17 min bootstrap + ~8 min build on 4 cores.
set -euo pipefail

CARDINAL_DIR="${CARDINAL_DIR:-$(pwd)/cardinal}"   # a clone of DISTRHO/Cardinal
PATCH="${PATCH:-$(dirname "$0")/cardinal-web-mini-additions.patch}"
TOUCH_PATCH="${TOUCH_PATCH:-$(dirname "$0")/cardinal-web-touch-backend.patch}"

if [ ! -d "$CARDINAL_DIR/.git" ]; then
  git clone --depth 1 https://github.com/DISTRHO/Cardinal.git "$CARDINAL_DIR"
fi
cd "$CARDINAL_DIR"
git submodule update --init --recursive --depth 1 --jobs 4

# Cardinal's dependency bootstrap installs its own pinned Emscripten (3.1.27)
# under ~/PawPawBuilds/emsdk and builds every library for the wasm target.
./deps/PawPaw/bootstrap-cardinal.sh wasm
source deps/PawPaw/local.env wasm

# Emscripten's SDL2 "port" fetches a GitHub archive zip. Where that endpoint
# is unreachable (it was, through the cloud session's proxy), clone the same
# release and point the ports system at the directory instead.
SDL_DIR="${SDL_DIR:-$HOME/PawPawBuilds/SDL-release-2.24.2}"
if [ ! -d "$SDL_DIR" ]; then
  git clone --depth 1 --branch release-2.24.2 https://github.com/libsdl-org/SDL.git "$SDL_DIR"
  rm -rf "$SDL_DIR/.git"
fi
export EMCC_LOCAL_PORTS="sdl2=$SDL_DIR"

# Same source tweak Cardinal's CI applies for Surge on Emscripten.
sed -i -e 's/defined(__riscv)/defined(__riscv) || defined(__EMSCRIPTEN__)/' plugins/surgext/surge/src/common/globals.h

# Our module additions (docs/03): slew, 8:1 switch, clock, sequencers.
if [ -f "$PATCH" ]; then
  git apply --check "$PATCH" && git apply "$PATCH" || echo "patch already applied or does not apply cleanly; inspect manually"
fi

# Our touch input backend for the DPF pugl web port (docs/09, docs/10).
if [ -f "$TOUCH_PATCH" ]; then
  git -C dpf apply --check "$TOUCH_PATCH" && git -C dpf apply "$TOUCH_PATCH" || echo "touch patch already applied or does not apply cleanly; inspect manually"
fi

make features
make HAVE_LIBLO=false NOOPT=true NOSIMD=false -j"$(nproc)" mini

ls -la bin/CardinalMini.{wasm,data,js,html}
