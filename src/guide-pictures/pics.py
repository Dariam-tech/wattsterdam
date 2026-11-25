"""McKinsey-style explainer charts for the battery trading guide."""
NAVY, BLUE, LBLUE, GREY, LGREY, MGREY, RED = "#051C2C", "#2251FF", "#DCE4FF", "#7F8C99", "#E6E9EE", "#B3BCC6", "#D7263D"
F = 'font-family="Arial,Helvetica,sans-serif"'
def T(x, y, s, size=12, w=400, c=NAVY, a="start"):
    return f'<text x="{x}" y="{y}" {F} font-size="{size}" font-weight="{w}" fill="{c}" text-anchor="{a}">{s}</text>'
def title(lines, sub=None):
    out = "".join(T(14, 26 + i * 19, l, 15, 700) for i, l in enumerate(lines))
    y = 26 + len(lines) * 19
    if sub: out += T(14, y + 2, sub, 11.5, 400, GREY); y += 16
    out += f'<line x1="14" y1="{y}" x2="346" y2="{y}" stroke="{NAVY}" stroke-width="1"/>'
    return out, y
def foot(y, s): return T(14, y, s, 10, 400, GREY)
def arrow(x1, y1, x2, y2, c=BLUE):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="2"/><path d="M{x2} {y2} l-7 -4.5 v9 z" fill="{c}"/>'
def svg(h, inner, label):
    return f'<svg viewBox="0 0 360 {h}" role="img" aria-label="{label}" xmlns="http://www.w3.org/2000/svg"><rect width="360" height="{h}" fill="#fff"/>{inner}</svg>'

# ---- icons (line style) ----
def panels(cx, cy):
    # tilted solar panel on a roof line
    x0, y0 = cx - 34, cy + 16
    pts = f"{x0},{y0} {x0+56},{y0} {x0+68},{y0-34} {x0+12},{y0-34}"
    g = f'<polygon points="{pts}" fill="{LBLUE}" stroke="{NAVY}" stroke-width="1.6" stroke-linejoin="round"/>'
    for k in (1, 2, 3):
        g += f'<line x1="{x0+14*k}" y1="{y0}" x2="{x0+12+14*k}" y2="{y0-34}" stroke="{NAVY}" stroke-width="1"/>'
    g += f'<line x1="{x0+6}" y1="{y0-17}" x2="{x0+62}" y2="{y0-17}" stroke="{NAVY}" stroke-width="1"/>'
    g += f'<line x1="{x0-6}" y1="{y0+6}" x2="{x0+74}" y2="{y0+6}" stroke="{NAVY}" stroke-width="1.6"/>'
    return g
def battery(cx, cy, lvl=0.75, c=BLUE):
    w, h = 30, 52; x, y = cx - w / 2, cy - h / 2
    fh = (h - 8) * lvl
    return (f'<rect x="{x+9}" y="{y-5}" width="12" height="5" fill="{NAVY}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="#fff" stroke="{NAVY}" stroke-width="1.6"/>'
            f'<rect x="{x+4}" y="{y+h-4-fh:.1f}" width="{w-8}" height="{fh:.1f}" fill="{c}"/>')
def cooking(cx, cy):
    # pot on a hob, with steam
    g = f'<line x1="{cx-34}" y1="{cy+18}" x2="{cx+34}" y2="{cy+18}" stroke="{NAVY}" stroke-width="1.6"/>'
    g += f'<rect x="{cx-26}" y="{cy+18}" width="52" height="4" fill="{MGREY}"/>'
    g += f'<path d="M{cx-22} {cy-6} h44 v18 a6 6 0 0 1 -6 6 h-32 a6 6 0 0 1 -6 -6 z" fill="{LBLUE}" stroke="{NAVY}" stroke-width="1.6"/>'
    g += f'<line x1="{cx-30}" y1="{cy-2}" x2="{cx-22}" y2="{cy-2}" stroke="{NAVY}" stroke-width="1.6"/><line x1="{cx+22}" y1="{cy-2}" x2="{cx+30}" y2="{cy-2}" stroke="{NAVY}" stroke-width="1.6"/>'
    g += f'<line x1="{cx-25}" y1="{cy-8}" x2="{cx+25}" y2="{cy-8}" stroke="{NAVY}" stroke-width="1.6"/>'
    for dx in (-9, 0, 9):
        g += f'<path d="M{cx+dx} {cy-14} q-4 -6 0 -11 q4 -5 0 -11" fill="none" stroke="{GREY}" stroke-width="1.3"/>'
    return g
def meter(x, y):
    return (f'<rect x="{x}" y="{y}" width="34" height="26" rx="3" fill="#fff" stroke="{NAVY}" stroke-width="1.6"/>'
            + T(x + 17, y + 18, "0", 14, 700, BLUE, "middle"))

# ---- 1. NOM ----
t, y = title(["NOM pays: each unit you store saves you", "about 26¢ you’d otherwise pay (from 2027)"], "NOM = nul op de meter, “zero on the meter”")
top = y + 22
cols = [(66, "Midday", "Panels make more", "than you use"), (180, "Afternoon", "The battery stores", "the spare power"), (294, "Evening", "It powers cooking,", "lights and TV")]
g = t
for cx, when, l1, l2 in cols:
    g += T(cx, top, when.upper(), 10.5, 700, GREY, "middle")
iy = top + 48
g += panels(66, iy) + battery(180, iy, 0.8) + cooking(294, iy)
g += arrow(108, iy, 152, iy) + arrow(208, iy, 252, iy)
ly = iy + 50
for cx, when, l1, l2 in cols:
    g += T(cx, ly, l1, 11.5, 400, NAVY, "middle") + T(cx, ly + 15, l2, 11.5, 400, NAVY, "middle")
by = ly + 34
g += f'<rect x="14" y="{by}" width="332" height="40" fill="{LGREY}"/>' + meter(26, by + 7)
g += T(72, by + 17, "Grid meter stays close to zero:", 11.5, 700) + T(72, by + 32, "almost nothing bought, almost nothing sent back", 11.5)
H1 = by + 62
g += foot(H1 - 8, "Illustrative.")
nom = svg(H1, g, "NOM: midday solar panels make more than the home uses, the battery stores the spare power, and in the evening it powers cooking, lights and TV, so the grid meter stays close to zero")

# ---- 2. Trading ----
t, y = title(["Trading earns only about 8¢ a unit,", "and about 2¢ on a winter day"], "Hourly power price on an example day, cents per unit before tax")
prices = [9, 8, 7, 7, 7, 8, 11, 13, 12, 10, 8, 7, 6, 6, 7, 9, 12, 15, 16, 15, 13, 11, 10, 9]
cy0, ch = y + 150, 112   # baseline y, chart height for 18c
x0, bw, gap = 22, 11, 2.6
sc = ch / 18
g = t
for i, p in enumerate(prices):
    x = x0 + i * (bw + gap); h = p * sc
    col = BLUE if i == 13 else NAVY if i == 18 else MGREY
    g += f'<rect x="{x:.1f}" y="{cy0-h:.1f}" width="{bw}" height="{h:.1f}" fill="{col}"/>'
    if i % 6 == 0: g += T(x + bw / 2, cy0 + 14, f"{i:02d}:00", 9.5, 400, GREY, "middle")
g += f'<line x1="{x0-4}" y1="{cy0}" x2="{x0+24*(bw+gap)}" y2="{cy0}" stroke="{NAVY}" stroke-width="1"/>'
xc = x0 + 13 * (bw + gap) + bw / 2; xe = x0 + 18 * (bw + gap) + bw / 2
g += T(xc, cy0 - 6 * sc - 22, "Charge", 11, 700, BLUE, "middle") + T(xc, cy0 - 6 * sc - 8, "6¢", 11, 700, BLUE, "middle")
g += T(xe, cy0 - 16 * sc - 22, "Use or sell", 11, 700, NAVY, "middle") + T(xe, cy0 - 16 * sc - 8, "16¢", 11, 700, NAVY, "middle")
by = cy0 + 30
g += f'<rect x="14" y="{by}" width="332" height="40" fill="{LGREY}"/>'
g += T(24, by + 17, "Charge at 6¢, use at 16¢: after charging losses", 11.5, 700) + T(24, by + 32, "about 8¢ a unit is left, before battery wear", 11.5)
H2 = by + 64
g += foot(H2 - 10, "Illustrative day. Source: Energievergelijk, Jul 2025–Jun 2026.")
trade = svg(H2, g, "Bar chart of an example day: power costs 6 cents at 13:00, when the battery charges, and 16 cents at 18:00, when it is used or sold. After losses about 8 cents a unit is left on a normal day, 2 cents in winter")

# ---- 3. Tax trap (waterfall) ----
t, y = title(["Selling stored grid power back loses about", "5¢ a unit, because the tax is not refunded"], "Charging and selling back one unit from 2027, cents")
base = y + 168; sc = 7.2
bars = [("Power", 0, 7, LBLUE, "7"), ("Energy tax", 7, 18, NAVY, "+11"), ("You pay", 0, 18, NAVY, "18"), ("Sold back", 5, 18, MGREY, "−13"), ("Your loss", 0, 5, RED, "5")]
bw, step, x0 = 46, 64, 30
g = t
for i, (lab, lo, hi, col, val) in enumerate(bars):
    x = x0 + i * step
    fill = col if lab != "You pay" else "#fff"
    stroke = f' stroke="{NAVY}" stroke-width="1.6"' if lab == "You pay" else ""
    g += f'<rect x="{x}" y="{base-hi*sc:.1f}" width="{bw}" height="{(hi-lo)*sc:.1f}" fill="{fill}"{stroke}/>'
    g += T(x + bw / 2, base - hi * sc - 7, val, 12, 700, RED if lab == "Your loss" else NAVY, "middle")
    g += T(x + bw / 2, base + 15, lab, 10.5, 400, NAVY, "middle")
    if i < len(bars) - 1:
        nxt = bars[i + 1]; ylev = base - (hi if lab != "Sold back" else lo) * sc
        g += f'<line x1="{x+bw}" y1="{ylev:.1f}" x2="{x+step}" y2="{ylev:.1f}" stroke="{GREY}" stroke-width="1" stroke-dasharray="3 2"/>'
g += f'<line x1="22" y1="{base}" x2="346" y2="{base}" stroke="{NAVY}" stroke-width="1"/>'
# callout on sold back
cx = x0 + 3 * step + bw / 2
g += T(cx, base - 18 * sc - 22, "No tax back", 10.5, 700, RED, "middle")
by = base + 30
g += f'<rect x="14" y="{by}" width="332" height="40" fill="{LGREY}"/>'
g += T(24, by + 17, "The next home that uses this power pays the", 11.5, 700) + T(24, by + 32, "tax again: the same unit is taxed twice", 11.5)
H3 = by + 64
g += foot(H3 - 10, "Bought at 6¢, sold at 14¢ before tax; 90% returns. Rounded.")
tax = svg(H3, g, "Waterfall: power 7 cents plus energy tax 11 cents means you pay 18 cents to charge one unit; selling it back returns 13 cents with no tax back, so you lose about 5 cents")

for n, s in (("nom", nom), ("trade", trade), ("tax", tax)):
    open(f"{n}.svg", "w").write(s)
print("ok", H1, H2, H3)
