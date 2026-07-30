# History Had No Common Sense

Production repo for the YouTube channel, hosted by **The Common Sense
Correspondent**. Episodes are authored as HTML and rendered to MP4.

Content lanes: **recovery**, **productivity**, **historical comedy** — all
running through one format engine (see `CLAUDE.md`).

## Layout

```
brand/                     style guide + character sheet
episodes/NNN-slug/         one directory per episode
  RESEARCH.md              verified facts, sources, unverified flags
  SCRIPT.md                time-coded VO + revision log
  composition.html         the HyperFrames composition
tools/
  render.mjs               local preview renderer (Chromium + FFmpeg)
  vendor-assets.mjs        vendors GSAP + fonts into vendor/
vendor/                    generated; GSAP and base64 woff2 fonts
renders/                   generated; MP4 output (gitignored)
```

## Episodes

| # | Title | Runtime | Status |
| --- | --- | --- | --- |
| 001 | The Gold Cure | ~1:34 | Composition complete, rendered |

## Setup

```bash
npm install playwright gsap ffmpeg-static \
  @fontsource/caveat @fontsource/patrick-hand \
  @fontsource/archivo-black @fontsource/roboto-mono

node tools/vendor-assets.mjs
```

`vendor-assets.mjs` inlines the fonts as base64 woff2 and copies GSAP
locally, so compositions never touch the network at render time. Rerun it
if you add a typeface.

## Previewing

Open any `composition.html` directly in a browser to scrub it, or render:

```bash
# contact sheet of key frames — fast, use this while designing
node tools/render.mjs episodes/001-the-gold-cure/composition.html \
  --contact /tmp/frames --marks 4,20,32,48,64,75,92

# full video
FFMPEG_BIN=./node_modules/ffmpeg-static/ffmpeg \
node tools/render.mjs episodes/001-the-gold-cure/composition.html \
  --out renders/the-gold-cure.mp4
```

The renderer auto-detects a preinstalled Chromium at
`/opt/pw-browsers/chromium`; override with `CHROMIUM_BIN`.

## Rendering through HyperFrames

`tools/render.mjs` is a local stand-in that does what the HyperFrames cloud
renderer does — seek a paused GSAP timeline frame by frame, encode with
FFmpeg. For the hosted path, the **HyperFrames by HeyGen** connector must be
authorized in the active chat; it exposes `compose` and `render_video`.

## Authoring notes

Compositions must be **seekable and deterministic** — the renderer jumps to
arbitrary frames rather than playing forward. No `setTimeout`, no
`requestAnimationFrame`, no CSS `@keyframes`, and never `Math.random()`.
All motion belongs on the single paused GSAP timeline registered at
`window.__timelines["<composition-id>"]`.

Two traps worth knowing, both hit during episode 001:

- A `scaleX(0)` set in CSS produces a degenerate matrix that GSAP cannot
  recover a rotation from, and the tween silently never draws. Set zero
  states on the timeline with `fromTo()`, not in the stylesheet.
- Group a figure with its caption and animate the wrapper. Animating only
  the number leaves its label on screen ahead of it, which reads as a bug.
