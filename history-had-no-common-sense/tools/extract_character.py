#!/usr/bin/env python3
"""
Cuts the Common Sense Correspondent out of the character reference sheet
into individual transparent PNGs usable as on-screen host assets.

Background removal is a flood fill inward from the crop border rather than
a colour key. The character's face and shirt highlights are close to the
paper colour, so keying by colour punches holes straight through him;
flood fill only clears background that is actually connected to the edge.

    python3 tools/extract_character.py

Writes brand/poses/*.png
"""

import base64
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
SHEET = PROJECT / "brand" / "character-sheet.png"
OUT = PROJECT / "brand" / "poses"

PAPER = np.array([244, 241, 230])
# Generous enough to swallow the paper's fibre texture, tight enough that
# the figure's own light fills stay opaque.
TOLERANCE = 66

# Boxes read off a coordinate-gridded copy of the sheet.
REGIONS = {
    # full-body poses
    "front-neutral": (228, 115, 395, 470),
    "side-narration": (425, 112, 580, 470),
    "pointing-at-map": (635, 105, 920, 470),
    "skeptical": (918, 105, 1042, 470),
    # right edge pulled in to 1258 — past that the at-desk chair leg bleeds in
    "surprised": (1078, 100, 1258, 470),
    # left edge pushed to 1262 to drop the surprised figure's raised hand
    "at-desk": (1262, 112, 1532, 470),
    # inset from the sheet's dashed "usage notes" callout border behind him
    "making-a-point": (1358, 678, 1536, 1024),
    # expression heads
    "face-amused": (30, 598, 148, 744),
    "face-curious": (170, 598, 295, 744),
    "face-disbelief": (315, 598, 432, 744),
    "face-concerned": (460, 598, 580, 744),
    "face-determined": (598, 598, 718, 744),
    "face-relieved": (738, 598, 858, 744),
    "face-exasperated": (878, 598, 1012, 744),
    # props
    "prop-notebook": (1052, 598, 1168, 725),
    "prop-coffee": (1192, 612, 1302, 725),
    "prop-mic": (1038, 758, 1102, 852),
    "prop-lamp": (1118, 762, 1198, 852),
    "prop-books": (1206, 778, 1312, 858),
}


# Dashes from the sheet's callout borders run ~40-80px; real detached art
# (the wall map, the desk, motion lines) is comfortably larger.
MIN_COMPONENT_AREA = 160


def drop_specks(opaque: np.ndarray) -> np.ndarray:
    """Clear small disconnected fragments left by neighbouring sheet artwork.

    Keeping only the largest component would delete legitimately detached
    pieces — the map in pointing-at-map, the desk and mic in at-desk — so
    this filters by area instead.
    """
    h, w = opaque.shape
    seen = np.zeros((h, w), dtype=bool)
    keep = np.zeros((h, w), dtype=bool)

    for sy in range(h):
        for sx in range(w):
            if not opaque[sy, sx] or seen[sy, sx]:
                continue
            component = []
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            while q:
                y, x = q.popleft()
                component.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if len(component) >= MIN_COMPONENT_AREA:
                for y, x in component:
                    keep[y, x] = True
    return keep


def cut(rgb: np.ndarray) -> Image.Image:
    """Return an RGBA image with edge-connected background made transparent."""
    h, w, _ = rgb.shape
    bg_like = np.abs(rgb.astype(int) - PAPER).sum(axis=2) < TOLERANCE

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_like[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg_like[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_like[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    opaque = ~visited
    opaque = drop_specks(opaque)

    alpha = np.where(opaque, 255, 0).astype(np.uint8)
    out = np.dstack([rgb, alpha])
    img = Image.fromarray(out, "RGBA")

    # Tighten to the remaining opaque content so layout maths in the
    # composition can rely on the asset being flush to its own bounds.
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = np.asarray(Image.open(SHEET).convert("RGB"))

    # Compositions also get the poses as base64 CSS so a composition file
    # stays self-contained — same reasoning as the vendored fonts. Relative
    # <img src> breaks the moment the HTML is uploaded or moved.
    css = [
        "/* Generated by tools/extract_character.py — do not edit by hand. */",
        ".pose{background-repeat:no-repeat;background-size:contain;"
        "background-position:center bottom;}",
    ]
    total = 0

    for name, (x0, y0, x1, y1) in REGIONS.items():
        crop = sheet[y0:y1, x0:x1]
        img = cut(crop)
        path = OUT / f"{name}.png"
        # Flat hand-drawn artwork palettes extremely well: ~13x smaller than
        # full RGBA with no visible loss, which matters because every pose is
        # inlined as base64 into the composition. FASTOCTREE is the only
        # quantizer here that preserves the alpha channel.
        img.quantize(colors=192, method=Image.FASTOCTREE).save(path, optimize=True)

        b64 = base64.b64encode(path.read_bytes()).decode()
        total += len(b64)
        w, h = img.size
        css.append(
            f".pose-{name}{{aspect-ratio:{w}/{h};"
            f"background-image:url(data:image/png;base64,{b64});}}"
        )
        print(f"{name:20s} {w:4d}x{h:4d}  {len(b64)//1024:4d}KB")

    (PROJECT / "brand" / "poses.css").write_text("\n".join(css))
    print(f"\nwrote brand/poses.css ({total // 1024}KB inlined)")


if __name__ == "__main__":
    main()
