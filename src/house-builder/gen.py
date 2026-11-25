"""Generate the isometric house-builder artboard (project/Main.dc.html)."""
import math, json

C30, S30 = math.cos(math.radians(30)), 0.5
SCENE_W, SCENE_H = 358, 260

# palette
WALL_L, WALL_R, WALL_TOP = "#f3efe7", "#e2ddd2", "#ece8df"
ROOF_F, ROOF_G = "#3b4a50", "#56656b"
MUTED_L, MUTED_R, MUTED_ROOF = "#e4e7e2", "#d5d9d3", "#9aa6a8"
WIN, WIN_FRAME, DOOR = "#a9c3cf", "#7f9aa6", "#5b6f63"
GROUND, DRIVE = "#dce8d7", "#cfd6cd"


class Iso:
    def __init__(self, s, ox, oy):
        self.s, self.ox, self.oy = s, ox, oy

    def p(self, x, y, z):
        return (self.ox + self.s * (x - y) * C30, self.oy + self.s * ((x + y) * S30 - z))

    def poly(self, pts, fill, extra=""):
        d = " ".join(f"{a:.1f},{b:.1f}" for a, b in (self.p(*q) for q in pts))
        return f'<polygon points="{d}" fill="{fill}"{extra}></polygon>'

    def box(self, x0, x1, y0, y1, z0, z1, top, left, right):
        return (self.poly([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], right)
                + self.poly([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], left)
                + self.poly([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], top))

    def win_front(self, y, x0, x1, z0, z1, fill=WIN, frame=WIN_FRAME, sw=1):
        return self.poly([(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], fill, f' stroke="{frame}" stroke-width="{sw}"')

    def win_right(self, x, y0, y1, z0, z1, fill=WIN, frame=WIN_FRAME, sw=1):
        return self.poly([(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)], fill, f' stroke="{frame}" stroke-width="{sw}"')

    def matrix(self, p0, pu, pv):
        a0, b0 = self.p(*p0); au, bu = self.p(*pu); av, bv = self.p(*pv)
        return f"matrix({(au-a0)/100:.4f},{(bu-b0)/100:.4f},{(av-a0)/100:.4f},{(bv-b0)/100:.4f},{a0:.1f},{b0:.1f})"


def fit(points_fn, pad=14):
    xs, ys = zip(*points_fn(Iso(1, 0, 0)))
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    s = min((SCENE_W - 2 * pad) / w, (SCENE_H - 2 * pad) / h)
    iso = Iso(s, 0, 0)
    xs, ys = zip(*points_fn(iso))
    return Iso(s, (SCENE_W - (max(xs) - min(xs))) / 2 - min(xs), (SCENE_H - (max(ys) - min(ys))) / 2 - min(ys))


def svg(inner):
    return (f'<svg width="{SCENE_W}" height="{SCENE_H}" viewBox="0 0 {SCENE_W} {SCENE_H}" aria-hidden="true" '
            f'style="position: absolute; left: 0; top: 0">{inner}</svg>')


def gable_house(iso, x0, W, D, H, R, muted=False, right_visible=True):
    wl, wr, rf, rg = (MUTED_L, MUTED_R, MUTED_ROOF, MUTED_ROOF) if muted else (WALL_L, WALL_R, ROOF_F, ROOF_G)
    x1, o = x0 + W, 0.35
    out = ""
    if right_visible:
        out += iso.poly([(x1, 0, 0), (x1, D, 0), (x1, D, H), (x1, 0, H)], wr)
        out += iso.poly([(x1, 0, H), (x1, D, H), (x1, D / 2, H + R)], wr)
    out += iso.poly([(x0, D, 0), (x1, D, 0), (x1, D, H), (x0, D, H)], wl)
    out += iso.poly([(x0 - o * 0, D + o, H - o * 0.8), (x1 + o, D + o, H - o * 0.8), (x1 + o, D / 2, H + R), (x0, D / 2, H + R)], rf)
    if right_visible:
        out += iso.poly([(x1 + o, D / 2, H + R), (x1 + o, D + o, H - o * 0.8), (x1 + o + 0.05, D + o, H - o * 0.8 - 0.25), (x1 + o + 0.05, D / 2, H + R - 0.25)], rg)
    return out


def sleek_car(iso, x0, y0, body="#f2f3f5", side="#dfe3e8", end="#c9cfd6", glass="#1d2731"):
    """A low fastback electric saloon, along x, 4.6 long and 1.9 wide."""
    L, Wd = 4.6, 1.9
    y1 = y0 + Wd
    prof = [(0, 0.32), (0, 0.72), (0.15, 0.82), (1.15, 0.95), (1.9, 1.48), (3.0, 1.52), (4.35, 1.0), (4.6, 0.86), (4.6, 0.32)]
    tops = [body, body, glass, glass, glass, body, body]
    out = iso.poly([(x0 + L, y0, 0.32), (x0 + L, y1, 0.32), (x0 + L, y1, 0.86), (x0 + L, y0, 0.86)], end)
    out += iso.poly([(x0 + L, y0 + 0.15, 0.62), (x0 + L, y1 - 0.15, 0.62), (x0 + L, y1 - 0.15, 0.72), (x0 + L, y0 + 0.15, 0.72)], "#c8423b")
    for i in range(1, len(prof) - 2):
        (xa, za), (xb, zb) = prof[i], prof[i + 1]
        out += iso.poly([(x0 + xa, y0, za), (x0 + xb, y0, zb), (x0 + xb, y1, zb), (x0 + xa, y1, za)], tops[i - 1])
    out += iso.poly([(x0 + a, y1, b) for a, b in prof], side, ' stroke="#b9c1c9" stroke-width="0.6"')
    out += iso.poly([(x0 + a, y1, b) for a, b in [(1.3, 1.0), (1.95, 1.4), (2.95, 1.43), (3.95, 1.02)]], glass)
    for wx in (0.95, 3.65):
        pts = [(x0 + wx + 0.36 * math.cos(t * math.pi / 8), y1 + 0.01, 0.34 + 0.36 * math.sin(t * math.pi / 8)) for t in range(16)]
        out += iso.poly(pts, "#1b1f22")
        pts = [(x0 + wx + 0.2 * math.cos(t * math.pi / 8), y1 + 0.02, 0.34 + 0.2 * math.sin(t * math.pi / 8)) for t in range(16)]
        out += iso.poly(pts, "#9aa3ab")
    return out


def build():
    T = {}
    # ---------- detached ----------
    W, D, H, R = 10, 8, 5.2, 3.6
    pts = lambda i: [i.p(-3, -2, 0), i.p(W + 8, -2, 0), i.p(W + 8, D + 5, 0), i.p(-3, D + 5, 0), i.p(0, D / 2, H + R + 1.4)]
    iso = fit(pts)
    base = iso.poly([(-3, -2, 0), (W + 8, -2, 0), (W + 8, D + 5, 0), (-3, D + 5, 0)], GROUND)
    base += iso.poly([(W + 0.5, D - 4, 0), (W + 7, D - 4, 0), (W + 7, D + 5, 0), (W + 0.5, D + 5, 0)], DRIVE)
    base += gable_house(iso, 0, W, D, H, R)
    for xa in (1.2, 6.8):
        base += iso.win_front(D, xa, xa + 2, 1.4, 3.4)
    base += iso.poly([(4.3, D, 0), (5.7, D, 0), (5.7, D, 3.2), (4.3, D, 3.2)], DOOR)
    base += iso.win_right(W, 1.5, 3.5, 1.4, 3.4)
    T["detached"] = dict(
        iso=iso, base=base, maxp=20, cols=7, rows=3,
        panel=iso.matrix((0.6, D + 0.1, H - 0.1), (W - 0.4, D + 0.1, H - 0.1), (0.6, D / 2 + 0.6, H + R - 0.5)),
        battery=iso.box(W, W + 0.35, D - 2.6, D - 1.5, 0.3, 2.2, "#2d3b40", "#3d4c52", "#26343a"),
        heatpump=iso.box(W, W + 1.2, 0.8, 3.0, 0, 1.4, "#d9dde0", "#c9ced2", "#b9bfc4")
        + iso.poly([(W + 1.2, 1.3, 0.3), (W + 1.2, 2.5, 0.3), (W + 1.2, 2.5, 1.1), (W + 1.2, 1.3, 1.1)], "#8a949b"),
        eboiler=iso.box(W, W + 0.7, 3.7, 4.6, 0, 2.0, "#f7f7f3", "#e9eae5", "#d6d9d3")
        + iso.poly([(W + 0.7, 3.7, 1.5), (W + 0.7, 4.6, 1.5), (W + 0.7, 4.6, 1.65), (W + 0.7, 3.7, 1.65)], "#e0703a"),
        chimney=iso.box(2.0, 2.8, D / 2 - 0.5, D / 2 + 0.3, H + R - 0.8, H + R + 1.2, "#6c5a52", "#8a7166", "#76625a"),
        car=sleek_car(iso, W + 1.6, D + 0.3),
        charger=iso.box(W + 0.55, W + 0.85, D - 0.3, D, 0, 1.8, "#2d3b40", "#3d4c52", "#26343a"),
        anchors=dict(roof=iso.p(W / 2, D * 0.78, H + R * 0.35), wall=iso.p(W, D - 2.0, 1.4), drive=iso.p(W + 4.0, D + 1.2, 0.8), garden=iso.p(W + 0.6, 1.9, 0.8), eboiler=iso.p(W + 0.35, 4.15, 1.0)),
    )

    # ---------- terraced ----------
    W, D, H, R = 6.5, 8, 5.2, 3.0
    pts = lambda i: [i.p(-2, -2, 0), i.p(3 * W + 7, -2, 0), i.p(3 * W + 7, D + 5, 0), i.p(-2, D + 5, 0), i.p(0, D / 2, H + R + 1.4)]
    iso = fit(pts)
    base = iso.poly([(-2, -2, 0), (3 * W + 7, -2, 0), (3 * W + 7, D + 5, 0), (-2, D + 5, 0)], GROUND)
    base += iso.poly([(3 * W + 0.5, D - 3, 0), (3 * W + 7, D - 3, 0), (3 * W + 7, D + 5, 0), (3 * W + 0.5, D + 5, 0)], DRIVE)
    for k, muted in ((0, True), (1, False), (2, True)):
        base += gable_house(iso, k * W, W, D, H, R, muted=muted, right_visible=(k == 2))
        x0 = k * W
        f = WIN if not muted else "#c9d3d6"
        base += iso.win_front(D, x0 + 0.8, x0 + 2.6, 1.4, 3.4, fill=f, frame=WIN_FRAME if not muted else "#b5c0c3")
        base += iso.poly([(x0 + 3.8, D, 0), (x0 + 5.0, D, 0), (x0 + 5.0, D, 3.1), (x0 + 3.8, D, 3.1)], DOOR if not muted else "#aab4ad")
    x0 = W
    T["terraced"] = dict(
        iso=iso, base=base, maxp=12, cols=4, rows=3,
        panel=iso.matrix((x0 + 0.4, D + 0.1, H - 0.1), (x0 + W - 0.4, D + 0.1, H - 0.1), (x0 + 0.4, D / 2 + 0.6, H + R - 0.4)),
        battery=iso.box(x0 + 5.1, x0 + 6.0, D, D + 0.3, 0.3, 2.0, "#2d3b40", "#3d4c52", "#26343a"),
        heatpump=iso.box(x0 + 0.6, x0 + 2.8, D + 0.4, D + 1.5, 0, 1.3, "#d9dde0", "#c9ced2", "#b9bfc4")
        + iso.poly([(x0 + 1.1, D + 1.5, 0.3), (x0 + 2.3, D + 1.5, 0.3), (x0 + 2.3, D + 1.5, 1.0), (x0 + 1.1, D + 1.5, 1.0)], "#8a949b"),
        eboiler=iso.box(x0 + 2.85, x0 + 3.6, D, D + 0.7, 0, 1.9, "#f7f7f3", "#e9eae5", "#d6d9d3")
        + iso.poly([(x0 + 2.85, D + 0.7, 1.4), (x0 + 3.6, D + 0.7, 1.4), (x0 + 3.6, D + 0.7, 1.55), (x0 + 2.85, D + 0.7, 1.55)], "#e0703a"),
        chimney=iso.box(x0 + 1.2, x0 + 2.0, D / 2 - 0.5, D / 2 + 0.3, H + R - 0.6, H + R + 1.2, "#6c5a52", "#8a7166", "#76625a"),
        car=sleek_car(iso, 3 * W + 1.4, D + 0.5),
        charger=iso.box(3 * W + 0.6, 3 * W + 0.9, D - 0.3, D, 0, 1.8, "#2d3b40", "#3d4c52", "#26343a"),
        anchors=dict(roof=iso.p(x0 + W / 2, D * 0.78, H + R * 0.35), wall=iso.p(x0 + 5.5, D, 1.3), drive=iso.p(3 * W + 3.8, D + 1.4, 0.8), garden=iso.p(x0 + 1.7, D + 1.0, 0.7), eboiler=iso.p(x0 + 3.2, D + 0.35, 1.0)),
    )

    # ---------- apartment ----------
    W, D, H = 11, 8, 15
    pts = lambda i: [i.p(-2, -2, 0), i.p(W + 7, -2, 0), i.p(W + 7, D + 5, 0), i.p(-2, D + 5, 0), i.p(0, 0, H + 1.5)]
    iso = fit(pts)
    base = iso.poly([(-2, -2, 0), (W + 7, -2, 0), (W + 7, D + 5, 0), (-2, D + 5, 0)], GROUND)
    base += iso.poly([(W + 0.5, D - 3, 0), (W + 7, D - 3, 0), (W + 7, D + 5, 0), (W + 0.5, D + 5, 0)], DRIVE)
    base += iso.box(0, W, 0, D, 0, H, WALL_TOP, WALL_L, WALL_R)
    base += iso.box(-0.2, W + 0.2, -0.2, D + 0.2, H, H + 0.4, "#cfcac0", "#ddd8ce", "#c9c4ba")
    for fl in range(4):
        z = 1.5 + fl * 3.4
        for xa in (1.0, 4.4, 7.8):
            mine = (fl == 2 and xa == 4.4)
            base += iso.win_front(D, xa, xa + 2.2, z, z + 2.0, fill="#e2f57c" if mine else WIN, frame="#153b32" if mine else WIN_FRAME, sw=1.6 if mine else 1)
        for ya in (1.3, 4.6):
            base += iso.win_right(W, ya, ya + 2.1, z, z + 2.0)
    base += iso.poly([(4.6, D, 0), (6.4, D, 0), (6.4, D, 2.6), (4.6, D, 2.6)], DOOR)
    T["apartment"] = dict(
        iso=iso, base=base, maxp=8, cols=4, rows=2,
        panel=iso.matrix((1.0, 1.0, H + 0.45), (W - 1.0, 1.0, H + 0.45), (1.0, D - 3.2, H + 0.45)),
        battery=iso.box(W, W + 0.35, D - 2.4, D - 1.4, 0.3, 2.1, "#2d3b40", "#3d4c52", "#26343a"),
        heatpump=iso.box(W - 3.4, W - 1.2, D - 2.6, D - 1.0, H + 0.4, H + 1.5, "#d9dde0", "#c9ced2", "#b9bfc4"),
        eboiler=iso.box(W, W + 0.7, 3.5, 4.3, 0, 1.9, "#f7f7f3", "#e9eae5", "#d6d9d3")
        + iso.poly([(W + 0.7, 3.5, 1.4), (W + 0.7, 4.3, 1.4), (W + 0.7, 4.3, 1.55), (W + 0.7, 3.5, 1.55)], "#e0703a"),
        chimney=iso.box(1.2, 2.0, D - 2.2, D - 1.4, H + 0.4, H + 1.9, "#6c5a52", "#8a7166", "#76625a"),
        car=sleek_car(iso, W + 1.4, D + 0.5),
        charger=iso.box(W + 0.6, W + 0.9, D - 0.3, D, 0, 1.8, "#2d3b40", "#3d4c52", "#26343a"),
        anchors=dict(roof=iso.p(W / 2 - 1.5, D / 2 - 1, H + 0.5), wall=iso.p(W, D - 1.9, 1.3), drive=iso.p(W + 3.8, D + 1.4, 0.8), garden=iso.p(W - 2.3, D - 1.8, H + 1.0), eboiler=iso.p(W + 0.35, 3.9, 1.0)),
    )
    return T


def scene_markup(T):
    out = []
    for t, d in T.items():
        out.append(f'<sc-if value="{{{{ is_{t} }}}}" hint-placeholder-val="{{{{ {str(t == "terraced").lower()} }}}}">{svg(d["base"])}</sc-if>')
        out.append(f'<sc-if value="{{{{ chimney_{t} }}}}" hint-placeholder-val="{{{{ {str(t == "terraced").lower()} }}}}">{svg(d["chimney"])}</sc-if>')
        out.append(f'<sc-if value="{{{{ solar_{t} }}}}" hint-placeholder-val="{{{{ {str(t == "terraced").lower()} }}}}">'
                   f'<div style="position: absolute; left: 0; top: 0; width: 100px; height: 100px; transform-origin: 0 0; transform: {d["panel"]}">'
                   f'<div style="display: flex; flex-wrap: wrap; align-content: flex-start; gap: 2px; padding: 3px; width: 100px; height: 100px; box-sizing: border-box">'
                   f'<sc-for list="{{{{ panelList }}}}" as="p" hint-placeholder-count="10"><span style="{{{{ p.style }}}}"></span></sc-for>'
                   f'</div></div></sc-if>')
        for key, content in (("heatpump", d["heatpump"]), ("eboiler", d["eboiler"]), ("battery", d["battery"]), ("ev", d["charger"] + d["car"])):
            out.append(f'<sc-if value="{{{{ {key}_{t} }}}}" hint-placeholder-val="{{{{ false }}}}"><div style="{{{{ glow_{key} }}}}">{svg(content)}</div></sc-if>')
    return "\n".join(out)


T = build()
LABELS = {
    "detached": {"roof": (70, 40), "wall": (110, 200), "drive": (290, 238), "garden": (300, 112), "eboiler": (305, 160)},
    "terraced": {"roof": (95, 32), "wall": (60, 135), "drive": (305, 180), "garden": (55, 190), "eboiler": (110, 236)},
    "apartment": {"roof": (85, 30), "wall": (300, 140), "drive": (295, 238), "garden": (275, 40), "eboiler": (305, 185)},
}
panel_geo = {t: {"labels": {k: list(v) for k, v in LABELS[t].items()}, "cols": d["cols"], "rows": d["rows"], "max": d["maxp"], "anchors": {k: [round(v[0]), round(v[1])] for k, v in d["anchors"].items()}} for t, d in T.items()}
src = open("/home/claude/builder/template2.html", encoding="utf-8").read()
src = src.replace("%%SCENE%%", scene_markup(T)).replace("%%PANELGEO%%", json.dumps(panel_geo))
open("/home/claude/builder/project/Main.dc.html", "w", encoding="utf-8").write(src)
print("ok", len(src))
