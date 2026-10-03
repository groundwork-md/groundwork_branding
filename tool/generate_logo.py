#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generates the groundwork logo masters into assets/logo/svg/ (and, on request, assets/logo/png/).

Direction "Below grade": the wordmark's g has its tail dropping through a ground line.
The g is Space Grotesk's own outline (600 for the wordmark and the fine mark, 700 for the heavier
avatar form). Only the tail is redrawn: every point of the descender is lowered by a fixed offset
so the tail clears the ground line. The ground line in the mark sits exactly where the wordmark's
rule sits, so the mark is the wordmark's g plus its ground. All text is outlined to paths.

Colours come from tokens/color.json (primitive ink, paper, tile); nothing is hard-coded here.
Font: fonts/space-grotesk, SIL OFL 1.1, no Reserved Font Name.

  python3 tool/generate_logo.py            write the SVG masters
  python3 tool/generate_logo.py --png      also write the PNG exports (needs rsvg-convert)
  python3 tool/generate_logo.py --check    fail if a committed SVG master differs from a fresh one

Python dependencies are pinned in tool/requirements.txt. Run via `npm run build:logo`.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "fonts", "space-grotesk", "SpaceGrotesk[wght].ttf")
SVG_DIR = os.path.join(ROOT, "assets", "logo", "svg")
PNG_DIR = os.path.join(ROOT, "assets", "logo", "png")
TAGLINE = "The base layer under your Claude Code setup"
REPO = "github.com/groundwork-md/groundwork"
RSVG = "rsvg-convert"


def _primitive(name):
    with open(os.path.join(ROOT, "tokens", "color.json"), encoding="utf8") as f:
        return json.load(f)["color"]["primitive"][name]["$value"]


INK = _primitive("ink")
PAPER = _primitive("paper")
TILE = _primitive("tile")  # avatar tile: lifted so the round avatar keeps an edge on a dark page

# Per weight, in font units (upm 1000, y up):
#   rule: the ground line's top and bottom (same as the wordmark rule: 0.035-0.110 em below baseline)
#   drop: how far the descender is lowered; gap: clearance between the ground line and the stem
SPEC = {
    600: dict(rule=(-35, -110), drop=50, gap=40),
    700: dict(rule=(-30, -125), drop=75, gap=46),  # the heavier avatar form
}
GROUND_LEFT = 150   # the ground runs this far left of the bowl ...
GROUND_RIGHT = 230  # ... and this far right of the stem's gap, so neither end reads as a dot


# ---------------------------------------------------------------- text outlining
class Fonts:
    """Static instances of the variable font, written to a temporary directory."""

    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix="gw-fonts-")
        self.cache = {}

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def instance(self, wght):
        if wght not in self.cache:
            inst = instantiateVariableFont(TTFont(FONT), {"wght": wght})
            path = os.path.join(self.dir, f"SpaceGrotesk-wght{wght}.ttf")
            inst.save(path)
            self.cache[wght] = path
        return self.cache[wght]


def fmt(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def text_outline(fonts, wght, text, size, track=0.0):
    """Shape `text` with HarfBuzz, return per-glyph outlines in px (y down, baseline at 0)."""
    p = fonts.instance(wght)
    tt = TTFont(p)
    upm = tt["head"].unitsPerEm
    face = hb.Face(hb.Blob.from_file_path(p))
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": False})
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    s = size / upm
    x = 0.0
    glyphs = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, -pos.y_offset * s)))
        bp = BoundsPen(gs)
        gs[name].draw(TransformPen(bp, (s, 0, 0, -s, x, 0)))
        glyphs.append(dict(name=name, d=pen.getCommands(), bounds=bp.bounds, x=x))
        x += pos.x_advance * s + track * size
    x -= track * size
    return glyphs, x


def svg_doc(w, h, body, title="groundwork"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{fmt(w)}" height="{fmt(h)}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')


# ---------------------------------------------------------------- the g and the ground
def g_record(fonts, wght, drop=None):
    tt = TTFont(fonts.instance(wght))
    rp = RecordingPen()
    tt.getGlyphSet()[tt.getBestCmap()[ord("g")]].draw(rp)
    drop = SPEC[wght]["drop"] if drop is None else drop
    # the bowl never goes below -3; everything under -50 is the descender
    return [(op, tuple((x, y - drop) if y < -50 else (x, y) for x, y in args)) for op, args in rp.value]


def g_path(fonts, wght, transform):
    pen = SVGPathPen(None)
    tp = TransformPen(pen, transform)
    for op, args in g_record(fonts, wght):
        getattr(tp, op)(*args)
    return pen.getCommands()


def stem_x(fonts, wght):
    """Left and right edge of the g's stem (font units), read from the outline."""
    pts = [a[0] for op, a in g_record(fonts, wght) if op == "lineTo"]
    right = max(x for x, y in pts)
    # the stem's left edge is the inner line that rises from the tail to the bowl joint
    left = min(x for x, y in pts if x > 300 and y in (73, 69))
    return left, right


def mark_body(fonts, wght, fg):
    """The mark in font units (y up): the g plus its ground line, broken around the stem."""
    l, r = stem_x(fonts, wght)
    top, bot = SPEC[wght]["rule"]
    gap = SPEC[wght]["gap"]
    x0, x1 = 49 - GROUND_LEFT, r + gap + GROUND_RIGHT
    g = g_path(fonts, wght, (1, 0, 0, 1, 0, 0))
    ground = (f"M{fmt(x0)},{top}H{l - gap}V{bot}H{fmt(x0)}Z"
              f"M{r + gap},{top}H{fmt(x1)}V{bot}H{r + gap}Z")
    ys = [y for op, a in g_record(fonts, wght) for _, y in a]
    return f'<path fill="{fg}" d="{g}{ground}"/>', (x0, min(ys), x1, max(ys))


def mark_in_box(fonts, wght, fg, box=100, fill=0.70):
    """Fit the mark into a box, centred, its height `fill` of the box."""
    body, (x0, y0, x1, y1) = mark_body(fonts, wght, fg)
    s = box * fill / (y1 - y0)
    tx = box / 2 - s * (x0 + x1) / 2
    ty = box / 2 + s * (y0 + y1) / 2
    return f'<g transform="translate({fmt(tx)},{fmt(ty)}) scale({fmt(s)},{fmt(-s)})">{body}</g>'


# ---------------------------------------------------------------- the masters
def avatar(fonts):
    return svg_doc(100, 100, f'<rect width="100" height="100" fill="{TILE}"/>' + mark_in_box(fonts, 700, PAPER))


def favicon():
    # drawn on the 16 px grid: bowl, stem, the flat tail of the font's g, the broken ground line
    fg = PAPER
    return svg_doc(16, 16, (
        f'<rect width="16" height="16" rx="3" fill="{INK}"/>'
        f'<path fill="{fg}" fill-rule="evenodd" d="M2,5a4,4 0 1,0 8,0a4,4 0 1,0 -8,0ZM4,5a2,2 0 1,1 4,0a2,2 0 1,1 -4,0Z"/>'
        f'<path fill="{fg}" d="M8,1h2v12a2,2 0 0 1 -2,2h-5v-2h5Z"/>'
        f'<rect x="1" y="10" width="6" height="1" fill="{fg}"/><rect x="11" y="10" width="4" height="1" fill="{fg}"/>'))


def wordmark(fonts, color, size=100):
    """'groundwork' in Space Grotesk 600 with the reconciled g and the ground rule."""
    glyphs, width = text_outline(fonts, 600, "groundwork", size, -0.015)
    s = size / 1000
    g = glyphs[0]
    g_d = g_path(fonts, 600, (s, 0, 0, -s, g["x"], 0))
    rest = "".join(f'<path d="{x["d"]}"/>' for x in glyphs[1:])
    l, r = stem_x(fonts, 600)
    top, bot = SPEC[600]["rule"]
    run = size * 0.9
    gx = g["x"] + (r + SPEC[600]["gap"] + 15) * s
    rule = f'<rect x="{fmt(gx)}" y="{fmt(-top * s)}" width="{fmt(width + run - gx)}" height="{fmt((top - bot) * s)}"/>'
    ymin = min(y for op, a in g_record(fonts, 600) for _, y in a)
    tops = [b["bounds"][1] for b in glyphs if b["bounds"]]
    return (f'<g fill="{color}"><path d="{g_d}"/>{rest}{rule}</g>',
            width + run, min(tops), -ymin * s, gx)


def lockup(fonts, theme):
    fg = INK if theme == "light" else PAPER
    wm, w, top, bottom, _ = wordmark(fonts, fg)
    pad = 8
    return svg_doc(w + 2 * pad, bottom - top + 2 * pad, f'<g transform="translate({pad},{fmt(pad - top)})">{wm}</g>')


def social(fonts):
    W, H = 1280, 640
    wm, w, top, bottom, gx = wordmark(fonts, PAPER, size=100)
    k = 1.72
    ox, base = 120, 300
    word = f'<g transform="translate({ox},{base}) scale({k})">{wm}</g>'
    top_r, bot_r = SPEC[600]["rule"]
    # the ground runs off the card: one rect from the rule's start to the right edge
    ground = (f'<rect x="{fmt(ox + gx * k)}" y="{fmt(base - top_r / 10 * k)}" width="{fmt(W - ox - gx * k)}" '
              f'height="{fmt((top_r - bot_r) / 10 * k)}" fill="{PAPER}"/>')
    tl, _ = text_outline(fonts, 400, TAGLINE, 44, 0)
    rp, _ = text_outline(fonts, 400, REPO, 26, 0)
    paths = lambda gs: "".join(f'<path d="{g["d"]}"/>' for g in gs)
    body = (f'<rect width="{W}" height="{H}" fill="{INK}"/>' + word + ground +
            f'<g fill="{PAPER}" transform="translate(120,476)">{paths(tl)}</g>'
            f'<g fill="{PAPER}" fill-opacity=".62" transform="translate(120,540)">{paths(rp)}</g>')
    return svg_doc(W, H, body)


def masters(fonts):
    """{file name: SVG text} for every SVG master."""
    return {
        "avatar.svg": avatar(fonts),
        "favicon.svg": favicon(),
        "mark-light.svg": svg_doc(100, 100, mark_in_box(fonts, 600, INK, fill=0.86)),
        "mark-dark.svg": svg_doc(100, 100, mark_in_box(fonts, 600, PAPER, fill=0.86)),
        "wordmark-light.svg": lockup(fonts, "light"),
        "wordmark-dark.svg": lockup(fonts, "dark"),
        "social-preview.svg": social(fonts),
    }


# name -> (source svg, width, height or None)
PNGS = {
    "avatar.png": ("avatar.svg", 500, None),
    "favicon-16.png": ("favicon.svg", 16, None),
    "favicon-32.png": ("favicon.svg", 32, None),
    "favicon-180.png": ("favicon.svg", 180, None),
    "wordmark-light.png": ("wordmark-light.svg", 1200, None),
    "wordmark-dark.png": ("wordmark-dark.svg", 1200, None),
    "social-preview.png": ("social-preview.svg", 1280, 640),
}


def write_png():
    for name, (src, w, h) in PNGS.items():
        cmd = [RSVG, "-w", str(w)] + (["-h", str(h)] if h else [])
        subprocess.run(cmd + ["-o", os.path.join(PNG_DIR, name), os.path.join(SVG_DIR, src)], check=True)


def main(argv):
    unknown = [a for a in argv if a not in ("--png", "--check")]
    if unknown:
        sys.exit(f"generate_logo: unknown argument {unknown[0]}; use --png or --check")
    fonts = Fonts()
    try:
        files = masters(fonts)
    finally:
        fonts.close()
    if "--check" in argv:
        stale = []
        for name, text in files.items():
            path = os.path.join(SVG_DIR, name)
            if not os.path.exists(path) or open(path, encoding="utf8").read() != text:
                stale.append(name)
        if stale:
            sys.exit(f"generate_logo: stale: {', '.join(stale)}. Run `npm run build:logo` and commit the result.")
        print(f"generate_logo: {len(files)} SVG masters are up to date.")
        return
    os.makedirs(SVG_DIR, exist_ok=True)
    for name, text in files.items():
        with open(os.path.join(SVG_DIR, name), "w", encoding="utf8") as f:
            f.write(text)
    print(f"generate_logo: wrote {len(files)} SVG masters to assets/logo/svg/")
    if "--png" in argv:
        os.makedirs(PNG_DIR, exist_ok=True)
        write_png()
        print(f"generate_logo: wrote {len(PNGS)} PNG exports to assets/logo/png/")


if __name__ == "__main__":
    main(sys.argv[1:])
