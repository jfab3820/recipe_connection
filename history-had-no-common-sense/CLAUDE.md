# History Had No Common Sense — production repo

YouTube channel hosted by **The Common Sense Correspondent**, an animated
hand-drawn narrator. Videos are authored as HTML and rendered to MP4 with
HyperFrames (HeyGen).

## Working agreements

**Never ship V1.** First drafts are raw material, not deliverables. Every
script, hook, and composition gets at least two revision passes before it is
shown. If you are about to present a first attempt, revise it again instead.
This applies to scripts, titles, hooks, and visual treatments alike.

**Kill saturated topics.** If a story appears on listicle sites
(Bored Panda / "50 funniest historical events" tier), it is already
strip-mined. The Emu War, the Dancing Plague, Napoleon's rabbits, Tulip
Mania, the Molasses Flood, and mokusatsu are all burned. Prefer stories with
real primary-source depth and a payoff that is *useful*, not just weird.

**Every episode needs a turn.** Trivia does not compound. The channel's job
is a worldview, not facts. See the format engine below.

## The format engine — "History's Worst Life Hacks"

One structure runs all three content lanes (recovery, productivity,
historical comedy):

> Somebody sold people a magic fix. It didn't work.
> The boring thing worked.

Beat structure:

1. **Hook** — the absurd claim, immediately undercut. Under 6 seconds.
2. **The pitch** — what was actually sold, played straight.
3. **The scale** — numbers. How many people fell for it.
4. **The debunk** — the moment it falls apart.
5. **The turn** — "So, total fraud. Except…" What they got *right*.
6. **The payoff** — the common-sense lesson that still applies today.

The turn is non-negotiable. Without it the video is a listicle.

## Host voice

Dry, grounded, blue-collar, curious, hates nonsense. Never sneering at the
victims — the contempt is aimed at the people selling the fix, never the
people who bought it. This matters especially in the recovery lane.

Short sentences. No "buckle up." No "you won't believe." No narrator
throat-clearing. He talks like a guy explaining something at a job site.

## Layout

- `brand/` — style guide and character reference
- `episodes/NNN-slug/` — one directory per episode
  - `RESEARCH.md` — verified facts with sources, and what is still unverified
  - `SCRIPT.md` — the voiceover, time-coded
  - `composition.html` — the HyperFrames composition
- `.claude/skills/common-sense-episode/` — the episode factory skill

## Rendering

Rendering requires the **HyperFrames by HeyGen** connector to be authorized
in the active chat. It exposes `compose` and `render_video`. If those tools
are not loaded, the connector needs authorizing in claude.ai connector
settings — it cannot be done from a headless session.
