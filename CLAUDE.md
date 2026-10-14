# cardinal-web

## Plan
Build a private, installable web app (PWA) version of Cardinal
(https://github.com/DISTRHO/Cardinal). That is the whole plan so far:
architecture, build approach and scope have not been decided. Development
planning happens in a Claude cloud session in this repo.

## Constraints already known
- Repo is private.
- If it is served from `andrewrausch.com/<repo>/` (GitHub Pages), it shares one
  origin with Andrew's other PWAs. The manifest must set an explicit `"id": "./"`
  and relative `start_url` / `scope` (`"./"`), never a literal `"/"`. Never
  change the app's identity after it has been installed.
- Andrew is a protanope: no UI state may be carried by hue alone. Pair color
  with a label, shape, position, weight or luminance.
