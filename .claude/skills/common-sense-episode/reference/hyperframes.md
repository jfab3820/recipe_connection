# HyperFrames — composition reference

HyperFrames (HeyGen) renders HTML compositions to MP4. The renderer seeks
each frame in headless Chrome and encodes with FFmpeg, so **the composition
must be seekable, not merely playable**.

Source: <https://github.com/heygen-com/hyperframes> (Apache 2.0)

## Minimal composition

```html
<div id="stage" data-composition-id="launch" data-start="0"
     data-width="1920" data-height="1080">
  <video class="clip" data-start="0" data-duration="6" data-track-index="0"
         src="intro.mp4" muted playsinline></video>

  <h1 id="title" class="clip" data-start="1" data-duration="4"
      data-track-index="1">Launch day</h1>

  <audio data-start="0" data-duration="6" data-track-index="2"
         data-volume="0.5" src="music.wav"></audio>
</div>
```

## Attributes

| Attribute | Meaning |
| --- | --- |
| `data-composition-id` | Unique id; also the `window.__timelines` key |
| `data-start` | Enter time, seconds |
| `data-duration` | How long the element lives, seconds |
| `data-track-index` | Layer assignment (0, 1, 2, …) |
| `data-width` / `data-height` | Canvas size; 1920×1080 default |
| `data-volume` | Audio only, 0–1 |
| `class="clip"` | Marks the element as timed/renderable |

Frame rate defaults to 30fps. Aspect ratio is set purely by the canvas
dimensions — 1080×1920 for vertical shorts.

## Animation runtime

Adapter-based: GSAP, CSS animations, Lottie, Three.js, Anime.js, WAAPI, or
a custom runtime. The GSAP pattern:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script>
  const tl = gsap.timeline({ paused: true });
  tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 1);
  window.__timelines = window.__timelines || {};
  window.__timelines.launch = tl;
</script>
```

The timeline **must be paused** and registered under the composition id.
The renderer drives it by seeking.

## Hard constraints

1. **Seekable only.** No `setTimeout`, no `requestAnimationFrame` loops, no
   CSS `@keyframes` for anything that must appear in the render. Seeking to
   frame N must produce the same pixels every time.
2. **Deterministic.** Same input → same frames → same output. Never
   `Math.random()`; seed a small LCG instead.
3. No build step — compositions are plain HTML that play as-is in a browser.
4. Node 22+ if running the CLI locally. The MCP connector renders in the
   cloud, so no local install is needed.

## MCP tools

- `compose` — author a new composition, or apply an edit to an existing one
- `render_video` — render to MP4

The connector must be authorized in the active chat before these appear.
There are also related skills in the upstream repo worth borrowing from —
`/faceless-explainer` is the closest fit to this channel's format
(invented visuals only: typography, abstract graphics, diagrams, data-viz).

## Useful patterns from `/faceless-explainer`

- Time-coded shot sequences per frame, with `focal`, `roles`, `layout`,
  and `motion` fields per scene.
- Reveals paced to voiceover duration — never front-load a frame's content.
- No static frames after a visual is introduced.
- Validate before render: lint, frame-overflow check, snapshot contact
  sheet review.
