---
name: common-sense-episode
description: Write and render an episode of the YouTube channel "History Had No Common Sense" using the HyperFrames (HeyGen) connector. Use when the user asks for a new video, short, or episode for the channel; when they want a script, hook, or storyboard for the Common Sense Correspondent; or when they want an existing composition.html rendered to MP4. Covers topic vetting, the six-beat format engine, brand tokens, HyperFrames composition authoring, and the render workflow.
---

# Common Sense Episode

Produces episodes for **History Had No Common Sense**, hosted by the
animated *Common Sense Correspondent*. Content lanes: recovery,
productivity, historical comedy.

## Non-negotiables

**Never ship V1.** Draft, then revise at least twice before showing the
user anything. Keep a revision log at the bottom of `SCRIPT.md` recording
what each pass fixed. If the log has one entry, the script is not ready.

**Vet the topic before writing a word.** Reject anything in the listicle
canon — Emu War, Dancing Plague, Tulip Mania, Molasses Flood, Napoleon's
rabbits, mokusatsu, Mike the Headless Chicken, Defenestration of Prague.
Search the topic first; if it surfaces on "50 funniest historical events"
aggregators, pick something else. Saturated topics lose to channels with
bigger budgets.

**Never punch down.** The contempt goes to whoever sold the fix, never to
the people who bought it. This is load-bearing for the recovery lane.

## The format engine

> Somebody sold people a magic fix. It didn't work.
> The boring thing worked.

Six beats. The turn is mandatory — without it you have trivia, and trivia
does not compound into a channel.

| Beat | Job | Budget |
| --- | --- | --- |
| 1. Hook | Absurd claim, immediately undercut | ≤ 6s |
| 2. The pitch | What was sold, played straight | ~18s |
| 3. The scale | Numbers. How many fell for it | ~18s |
| 4. The debunk | The moment it collapses | ~14s |
| 5. The turn | "So, open and shut. Except…" — what they got *right* | ~22s |
| 6. The payoff | The common-sense lesson, as a concrete image | ~16s |

End on an image, never a moral. "It was never in the syringe, it was in the
waiting room" beats "and maybe we're not so different today."

## Host voice

Dry, grounded, blue-collar, curious, hates nonsense. Short sentences. He
explains things like a guy on a job site, not a narrator. Banned: "buckle
up," "you won't believe," "little did they know," rhetorical questions to
camera, and any hype adverb.

Pace at ~150 wpm. A 90-second short is ~230 words. Let numbers land in
silence rather than selling them.

## Workflow

1. **Pick and vet the topic.** Web-search for saturation. Confirm there is
   a real turn — if the story is only "people were dumb," drop it.
2. **Write `RESEARCH.md`** in `episodes/NNN-slug/`. Table of verified facts
   with sources. Mark anything unconfirmed with ⚠️ and never let a ⚠️ fact
   into the script. Include a tone guardrail section.
3. **Write `SCRIPT.md`** — time-coded to the six beats, with title options,
   a delivery note, and the revision log. Revise twice.
4. **Build `composition.html`** — see the authoring rules below.
5. **Render** — see the render workflow below.

## HyperFrames composition rules

Reference: `reference/hyperframes.md`. Core contract:

- Root `#stage` carries `data-composition-id`, `data-width`, `data-height`,
  `data-fps`, `data-duration`.
- Vertical shorts are **1080×1920 at 30fps**. Horizontal is 1920×1080.
- Every timed element carries `class="clip"` plus `data-start`,
  `data-duration`, `data-track-index` (all seconds).
- Track convention: `0` background, `1` scene content, `2` persistent
  chrome, `3+` audio.
- **All motion goes on one paused GSAP timeline** registered at
  `window.__timelines["<composition-id>"]`. The renderer seeks to arbitrary
  frames — anything driven by `setTimeout`, `requestAnimationFrame`, or CSS
  `animation` will not render correctly.
- **Determinism is required.** Never call `Math.random()`. Use a seeded LCG
  if you need scatter, so every render is identical.
- Scene shells cut hard via `tl.set(sel, {opacity:1})` at the in-point and
  `{opacity:0}` at the out-point. Use motion inside a scene, not between.

## Putting the host on screen

`tools/extract_character.py` cuts poses off the reference sheet and emits
`brand/poses.css` with each inlined as base64. Use:

```html
<div class="pose pose-making-a-point" style="height: 400px"></div>
```

Classes carry their own `aspect-ratio` — set height only, and **cap it at
400px**; the source art is ~350px tall and softens past that.

Cast by beat, don't wallpaper: `skeptical` on the hook, `pointing-at-map`
or `side-narration` on the pitch, `face-disbelief` as a reaction cut-in on
the debunk, `making-a-point` on the turn, `at-desk` on the payoff. Leave the
pure-data scenes (the scale, big counters) hostless — the rhythm of him
appearing and disappearing is what keeps him from becoming furniture.

Scenes carrying a full-body host need `class="scene has-host"` so the
copy lifts clear of his footprint. Centre him with auto margins, never
`translateX(-50%)` — a CSS transform fights GSAP's on the same element.

## Brand tokens

```
--ink:   #1A1A1A    --navy:  #223A5E    --teal:  #32B3A6
--gray:  #777777    --paper: #F4F1E6    --red:   #B94A48
```

Hand-drawn ink doodle on off-white paper. Thick + thin line weight. Teal
and navy accents only — red is reserved for the debunk beat and nothing
else. Keep movement clear and readable; this is a phone-sized canvas.

Typography: `Archivo Black` for display, `Caveat` for handwritten kickers,
`Patrick Hand` for body, `Roboto Mono` for labels and eyebrows.

## Render workflow

Rendering needs the **HyperFrames by HeyGen** connector authorized in the
active chat. It exposes two tools:

- `compose` — author a new composition or apply an edit to an existing one
- `render_video` — render the composition to MP4

If those tools are not in the tool list, the connector is unauthorized.
This cannot be fixed from a headless or non-interactive session — tell the
user to authorize it in their claude.ai connector settings, and do not
attempt to work around it. Everything upstream (research, script,
composition) can still be completed and staged for a one-call render.

Before rendering: confirm total duration against `data-duration`, confirm
no `.clip` extends past it, and confirm the timeline's last tween ends
before the composition does.
