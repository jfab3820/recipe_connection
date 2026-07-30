# Brand — History Had No Common Sense

## Host: The Common Sense Correspondent

Animated hand-drawn narrator. Character sheet: `character-sheet.png`.

**Traits:** dry humor · curious · grounded · blue-collar · loves history ·
hates nonsense

**Poses available:** front neutral, side narration, pointing at map,
skeptical, surprised, at desk / recording

**Expressions:** amused, curious, disbelief, concerned, determined,
relieved, exasperated

**Props:** Common Sense notebook, coffee (fuel), mic, lamp, books

**Usage:** on-screen host / narrator. He reacts to history, points at maps,
presents facts. Design stays consistent across every episode.

### Pose assets

`tools/extract_character.py` cuts every pose, expression head, and prop off
the reference sheet into transparent PNGs in `poses/`, and emits
`poses.css` with each one inlined as base64:

```html
<div class="pose pose-making-a-point" style="height: 400px"></div>
```

Each class carries its own `aspect-ratio`, so set height only.

Source art is roughly 350px tall. **400px is the ceiling** — beyond that the
hand-drawn linework visibly softens. On a 1920px canvas that reads as a
host presence at the lower third, which is the intended scale.

Cast him by beat rather than putting him in every scene. Overuse turns a
host into wallpaper:

| Beat | Pose |
| --- | --- |
| Hook | `skeptical` |
| The pitch | `pointing-at-map`, `side-narration` |
| The debunk | `face-disbelief` as a reaction cut-in |
| The turn | `making-a-point` |
| The payoff | `at-desk`, `front-neutral` |

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Ink black | `#1A1A1A` | Body copy, linework |
| Navy | `#223A5E` | Display headings, primary |
| Teal | `#32B3A6` | Accents, the "turn" beat, payoff line |
| Warm gray | `#777777` | Eyebrows, labels, de-emphasis |
| Paper | `#F4F1E6` | Background, always |
| Accent red | `#B94A48` | **Debunk beat only** — the thing that's wrong |

All six confirmed by reading the swatch labels off the character sheet at
full resolution — no guesswork remaining.

Red is disciplined on purpose. If red shows up everywhere it stops meaning
"this is the lie," which is the one job it has.

## Style notes

- Hand-drawn ink + doodle style
- Simple, expressive, consistent
- Off-white paper background
- Limited colors with teal + navy accents
- Thick + thin line weight
- Keep movement clear + readable

## Typography

| Role | Face | Fallback |
| --- | --- | --- |
| Display | Archivo Black | Impact, sans-serif |
| Handwritten kicker | Caveat | Bradley Hand, cursive |
| Body | Patrick Hand | Comic Sans MS, sans-serif |
| Labels / eyebrows | Roboto Mono | ui-monospace |

## Canvas

- Shorts: **1080 × 1920**, 30fps
- Long form: 1920 × 1080, 30fps
- Safe padding: 130px top/bottom, 88px sides on vertical
