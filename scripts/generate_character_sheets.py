#!/usr/bin/env python3
"""Generator sprite-sheet karakter Last Harbor (5 arah unik x 3 frame per karakter).

Kenapa file ini ada:
  Game memuat 60 frame arah-jalan (SHEET_SPEC di js/assets.js):
  player / zombie_slow / zombie_fast / zombie_tank, masing-masing
  front/back/side/ne/se x frame 0..2 (0 = diam, 1-2 = siklus langkah).
  Frame W/NW/SW didapat game dengan mencerminkan side/ne/se (lihat js/sheets.js).

Gaya:
  Flat pixel-art penuh warna, senada assets/characters/player.png dkk hasil
  generate_all_assets.py — bukan line-art. Badan diisi penuh (alpha solid),
  digambar 4x lalu di-downsample LANCZOS untuk anti-aliasing.

  Setiap keluarga pose mengikuti kamera miring game: kaki berpijak di ~y=118
  (kerangka 128x128), kepala di atas; jangkar bawah sesuai konvensi
  drawCharSprite() (-sz*0.92) di js/sheets.js.

Jalankan:  python3 scripts/generate_character_sheets.py
"""

import os
import math
from PIL import Image, ImageDraw

os.makedirs("assets/characters", exist_ok=True)

S = 4           # faktor supersampling
W = H = 128     # kanvas akhir
GY = 118        # garis tanah (pijakan kaki), dalam unit kanvas akhir
CX = 64         # sumbu tengah


def canvas():
    return Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))


def finish(img):
    return img.resize((W, H), Image.Resampling.LANCZOS)


def shade(rgb, k):
    """Gelapkan/terangkan warna: k<0 gelap, k>0 terang."""
    if k >= 0:
        return tuple(int(c + (255 - c) * k) for c in rgb)
    return tuple(int(c * (1 + k)) for c in rgb)


# ---------------------------------------------------------------- rig --------

def P(x, y):
    """Unit kanvas -> koordinat supersampled."""
    return (x * S, y * S)


def ellipse(d, cx, cy, rx, ry, fill, outline=None, width=0):
    d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S],
              fill=fill, outline=outline, width=width * S)


def poly(d, pts, fill, outline=None, width=0):
    pts = [(x * S, y * S) for x, y in pts]
    d.polygon(pts, fill=fill)
    if outline and width > 0:
        d.line(pts + [pts[0]], fill=outline, width=width * S, joint="curve")


def seg(d, x1, y1, x2, y2, fill, w):
    d.line([P(x1, y1), P(x2, y2)], fill=fill, width=int(w * S))


def capsule(d, x1, y1, x2, y2, fill, w):
    """Segmen garis berujung bulat (tungkai/lengan)."""
    seg(d, x1, y1, x2, y2, fill, w)
    r = w / 2 - 0.4
    ellipse(d, x1, y1, r, r, fill)
    ellipse(d, x2, y2, r, r, fill)


class Ctx:
    """Pembungkus ImageDraw dengan akses ke image untuk layer terotasi."""
    def __init__(self, img):
        self._image = img
        self.draw = ImageDraw.Draw(img)


# ------------------------------------------------------------ anatomi --------

def leg_points(hip, swing, lift):
    """Posisi kaki: swing>0 = melangkah ke depan; lift 0..1 = fase angkat lutut."""
    hx, hy = hip
    fx = hx + swing * 11
    fy = GY - lift * 7 - abs(swing) * 2.0
    kx = hx + (fx - hx) * 0.45 + (0.9 if swing >= 0 else -0.9)
    ky = hy + (fy - hy) * 0.55 - 1.5
    return (kx, ky, fx, fy)


def draw_leg(ctx, hip, knee, foot, pants, boot, w=7.0, back=False):
    d = ctx.draw
    col_p = shade(pants, -0.28) if back else pants
    col_b = shade(boot, -0.28) if back else boot
    capsule(d, hip[0], hip[1], knee[0], knee[1], col_p, w)
    capsule(d, knee[0], knee[1], foot[0], foot[1], col_p, w - 1.2)
    # sepatu/boots: tumpul ke depan
    fwd = 3.2 if foot[0] >= hip[0] else -3.2
    ellipse(d, foot[0] + fwd * 0.4, foot[1] - 1.2, 4.6, 2.6, col_b)


def draw_arm(ctx, shoulder, elbow, hand, sleeve, skin, w=6.0, back=False, hand_r=2.8):
    d = ctx.draw
    col_s = shade(sleeve, -0.28) if back else sleeve
    col_h = shade(skin, -0.28) if back else skin
    capsule(d, shoulder[0], shoulder[1], elbow[0], elbow[1], col_s, w)
    capsule(d, elbow[0], elbow[1], hand[0], hand[1], col_s, w - 1.4)
    ellipse(d, hand[0], hand[1], hand_r, hand_r, col_h)


# ------------------------------------------------------------ karakter --------

def draw_player(view, frame):
    """Penyintas berjas hujan oranye (selaras player.png)."""
    img = canvas(); ctx = Ctx(img); d = ctx.draw

    ORANGE   = (224, 122, 30); ORANGE_D = (168, 84, 16); HOLE = (94, 42, 8)
    SKIN     = (238, 192, 150); PANTS = (56, 62, 74); BOOT = (34, 34, 42)
    PACK     = (106, 72, 44); PACK_D = (72, 46, 26); STRAP = (52, 36, 22)

    swing = 0 if frame == 0 else (1 if frame == 1 else -1)
    bob = 0 if frame == 0 else -1.6
    side = view == 'side'
    diag = view in ('ne', 'se')
    toward = view in ('front', 'se')     # wajah kelihatan
    away = view in ('back', 'ne')

    hipL = (CX - 4.5, 74 + bob); hipR = (CX + 4.5, 74 + bob)
    if side:
        hipL = (CX - 1.5, 74 + bob); hipR = (CX + 1.5, 74 + bob)

    sL, sR = swing, -swing
    if diag: sL, sR = swing * 0.75, -swing * 0.75

    legL = leg_points(hipL, sL, 0.55 if frame == 2 else 0.0)
    legR = leg_points(hipR, sR, 0.55 if frame == 1 else 0.0)
    if side:
        legL = leg_points(hipL, sL * 1.15, 0.55 if frame == 2 else 0.0)
        legR = leg_points(hipR, sR * 1.15, 0.55 if frame == 1 else 0.0)

    # ---- bagian jauh (gelap) dulu ----
    if view != 'back':
        pass
    if side:
        draw_leg(ctx, hipL, (legL[0], legL[1]), (legL[2], legL[3]), PANTS, BOOT, back=True)
    else:
        back_leg = legR if view != 'back' else legL
        bhip = hipR if view != 'back' else hipL
        draw_leg(ctx, bhip, (back_leg[0], back_leg[1]), (back_leg[2], back_leg[3]), PANTS, BOOT, back=True)

    # lengan jauh
    shL = (CX - 8.5, 56 + bob); shR = (CX + 8.5, 56 + bob)
    if side: shL, shR = (CX - 2.5, 56 + bob), (CX + 3, 56 + bob)
    if diag: shL, shR = (CX - 7, 56 + bob), (CX + 7, 56 + bob)
    aL = (shL[0] + sR * 7, shL[1] + 12, shL[0] + sR * 9)         # elbow xy, hand xy offset
    aR = (shR[0] + sL * 7, shR[1] + 12, shR[0] + sL * 9)
    far_sh = shR if not (side or view == 'back') else shL
    far_a = aR if not (side or view == 'back') else aL
    if view == 'back':
        far_sh, far_a = shL, aL
    draw_arm(ctx, (far_sh[0], far_sh[1]), (far_a[0], far_a[1]),
             (far_a[2], far_a[1] + 8 + bob * 0.3), ORANGE_D, SKIN, w=6.4, back=True)

    # ---- ransel (paling mencolok dari belakang & samping) ----
    def backpack(ox, w, hump=True):
        x = CX + ox
        poly(d, [(x - w, 54 + bob), (x + w, 54 + bob), (x + w - 1, 76 + bob), (x - w + 1, 76 + bob)],
             PACK)
        # tutup ransel
        poly(d, [(x - w, 54 + bob), (x + w, 54 + bob), (x + w - 0.6, 61 + bob), (x - w + 0.6, 61 + bob)], PACK_D)
        # kantong bawah
        ellipse(d, x, 70 + bob, w * 0.28, 3.4, PACK_D)
    if view == 'back':
        backpack(-1, 10)
        # ransel menutupi punggung: tali bahu
        seg(d, CX - 8, 56 + bob, CX - 3, 74 + bob, STRAP, 2.6)
        seg(d, CX + 6, 56 + bob, CX + 1, 74 + bob, STRAP, 2.6)
    elif side:
        backpack(-8.5, 6.5)
    elif diag and away:
        backpack(-6.5, 8.5)
    elif diag:
        backpack(7.5, 5.5)   # sempil di sisi jauh

    # ---- badan jas hujan ----
    if side:
        body = [(CX - 7, 50 + bob), (CX + 6.5, 48 + bob), (CX + 8.5, 66 + bob),
                (CX + 7, 79 + bob), (CX - 7.5, 79 + bob), (CX - 8.5, 62 + bob)]
    elif diag:
        body = [(CX - 8, 50 + bob), (CX + 7.5, 50 + bob), (CX + 9, 66 + bob),
                (CX + 8, 79 + bob), (CX - 8.5, 79 + bob), (CX - 9.5, 64 + bob)]
    else:
        body = [(CX - 10, 52 + bob), (CX + 10, 52 + bob), (CX + 11.5, 66 + bob),
                (CX + 9.5, 79 + bob), (CX - 9.5, 79 + bob), (CX - 11.5, 66 + bob)]
    poly(d, body, ORANGE)
    # lipatan bayangan sisi kiri badan
    poly(d, [(body[0][0], body[0][1]), (CX - 3, body[0][1] + 1), (CX - 4, body[-2][1]),
             (body[-1][0], body[-1][1])], ORANGE_D)

    # kaki dekat
    if side:
        draw_leg(ctx, hipR, (legR[0], legR[1]), (legR[2], legR[3]), PANTS, BOOT)
    else:
        near_leg, nhip = (legL, hipL) if view != 'back' else (legR, hipR)
        draw_leg(ctx, nhip, (near_leg[0], near_leg[1]), (near_leg[2], near_leg[3]), PANTS, BOOT)

    # ---- kepala berhood ----
    hy = 38 + bob
    hx = CX + (3.5 if side else (2 if diag else 0))
    # tudung: lingkaran oranye besar
    ellipse(d, hx, hy, 10.5, 11.5, ORANGE)
    ellipse(d, hx - (2.5 if not side else 0), hy - 5, 8, 7.5, ORANGE)
    if toward:
        # bukaan tudung gelap + wajah tan + mata
        ellipse(d, hx + (1.5 if diag else 0), hy + 0.5, 6.8, 7.6, HOLE)
        ellipse(d, hx + (2 if diag else 0), hy + 1.2, 4.6, 5.4, SKIN)
        ex = hx + (3.2 if diag else 0)
        ellipse(d, ex - (3.4 if not diag else 1.6), hy, 0.9, 1.3, (30, 20, 20))
        if not diag:
            ellipse(d, ex + 2.2, hy, 0.9, 1.3, (30, 20, 20))
        else:
            ellipse(d, ex + 3.4, hy, 0.85, 1.25, (30, 20, 20))
        # hidung samar
        ellipse(d, ex + (0.2 if not diag else 1.2), hy + 3.4, 0.8, 0.7, shade(SKIN, -0.2))
    elif side:
        # profil: tudung meruncing ke depan, wajah tan di depan-bawah
        poly(d, [(hx - 2, hy - 8), (hx + 12.5, hy - 2), (hx + 2, hy + 2)], ORANGE)
        ellipse(d, hx + 4.4, hy + 2.2, 5.4, 6.2, HOLE)
        ellipse(d, hx + 5, hy + 2.6, 3.7, 4.4, SKIN)
        ellipse(d, hx + 7, hy + 1.6, 0.9, 1.25, (30, 20, 20))
        ellipse(d, hx + 8.2, hy + 4.6, 0.8, 0.7, shade(SKIN, -0.2))
    else:
        # belakang: tudung polos + garis leher
        ellipse(d, hx, hy - 2, 8.5, 8, ORANGE_D)
        seg(d, hx - 3, hy + 8, hx + 3, hy + 8, ORANGE_D, 1.6)

    # lengan dekat
    near_sh = shL if not (side or view == 'back') else shR
    near_a = aL if not (side or view == 'back') else aR
    if view == 'back':
        near_sh, near_a = shR, aR
    draw_arm(ctx, (near_sh[0], near_sh[1]), (near_a[0], near_a[1]),
             (near_a[2], near_a[1] + 8 + bob * 0.3), ORANGE, SKIN, w=6.4)

    return finish(img)


# --------------------------------- zombie ------------------------------------
def draw_zombie(view, frame, kind):
    img = canvas(); ctx = Ctx(img); d = ctx.draw

    if kind == 'slow':
        A = (125, 155, 74); A_D = (88, 112, 48)      # kulit hijau
        SHIRT = (58, 74, 40); SHIRT_D = (40, 52, 28)
        PANTS = (52, 60, 44); BOOT = (36, 40, 32)
        EYE = (226, 240, 120)
        hunch, bulk, armw = 7, 1.0, 5.6
        head_r = 9.0
    elif kind == 'fast':
        A = (212, 84, 66); A_D = (156, 50, 38)       # kulit merah
        SHIRT = (122, 34, 28); SHIRT_D = (86, 22, 18)
        PANTS = (56, 44, 46); BOOT = (38, 32, 34)
        EYE = (255, 214, 90)
        hunch, bulk, armw = 11, 0.82, 5.0
        head_r = 8.2
    else:  # tank
        A = (122, 78, 182); A_D = (82, 48, 130)      # kulit ungu
        SHIRT = (66, 42, 104); SHIRT_D = (44, 26, 72)
        PANTS = (48, 36, 70); BOOT = (30, 24, 44)
        EYE = (205, 160, 255)
        hunch, bulk, armw = 6, 1.55, 9.2
        head_r = 8.4

    swing = 0 if frame == 0 else (1 if frame == 1 else -1)
    bob = 0 if frame == 0 else -1.4
    side = view == 'side'
    diag = view in ('ne', 'se')
    toward = view in ('front', 'se')

    t = 1.35 if kind == 'tank' else 1.0
    gy = GY
    hipY = 76 + bob if kind != 'tank' else 80 + bob
    shY = hipY - 19 + hunch * 0.55
    hy = shY - 12 - hunch * 0.35

    spread = 5.6 * t
    hipL = (CX - spread, hipY); hipR = (CX + spread, hipY)
    if side:
        hipL = (CX - 2 * t, hipY); hipR = (CX + 2 * t, hipY)

    sL, sR = swing, -swing
    if diag: sL, sR = swing * 0.7, -swing * 0.7
    if side: sL, sR = swing * 1.15, -swing * 1.15

    legR_ = leg_points(hipR, sR, 0.55 if frame == 1 else 0.0)
    legL_ = leg_points(hipL, sL, 0.55 if frame == 2 else 0.0)

    # kaki jauh
    if side:
        draw_leg(ctx, hipL, (legL_[0], legL_[1]), (legL_[2], legL_[3]), PANTS, BOOT, w=6.6 * t, back=True)
    else:
        far_leg, fhip = (legR_, hipR) if view != 'back' else (legL_, hipL)
        draw_leg(ctx, fhip, (far_leg[0], far_leg[1]), (far_leg[2], far_leg[3]), PANTS, BOOT, w=6.6 * t, back=True)

    # ---- lengan: zombie meraih ke depan ----
    shSpread = (8.5 + 3.5 * (t - 1)) * t
    shL = (CX - shSpread, shY + (0 if side else 1.5)); shR = (CX + shSpread, shY + (0 if side else 1.5))
    if side:
        shL = (CX - 1, shY); shR = (CX + 2.5, shY)

    def reach_arm(sh, ph, back=False):
        """Lengan meraih: siku ke depan, tangan turun sedikit; fase ph ikut ayun."""
        reach = 13 + (2 if kind == 'fast' else 4 if kind == 'tank' else 6)
        ex = sh[0] + (reach * 0.55) + ph * 2.5
        ey = sh[1] + 9 + ph * 1.5
        hx2 = sh[0] + reach + ph * 4
        hy2 = sh[1] + 16 + ph * 2.5
        draw_arm(ctx, (sh[0], sh[1]), (ex, ey), (hx2, hy2),
                 shade(SHIRT, 0.1), A, w=armw, back=back, hand_r=(3.4 if kind == 'tank' else 2.8))
        # cakar kecil
        if kind != 'tank':
            dd = ctx.draw
            for k in (-1, 1):
                seg(dd, hx2, hy2, hx2 + 2.6, hy2 + k * 2.2 + 1.5, shade(A, -0.3), 1.0)

    if not toward or side:
        reach_arm(shL if side else shR, sR * 0.6, back=True)
    else:
        reach_arm(shR, sR * 0.6, back=True)

    # ---- badan (kemeja compang) ----
    bw = 10.5 * bulk + 1.5
    if side: bw = 7.5 * bulk + 1.5
    if diag: bw = 9 * bulk + 1.5
    topY = shY - 3
    botY = hipY + 3
    # punggung bungkuk: garis punggung miring
    lean = hunch * 0.8
    body = [
        (CX - bw + lean * 0.2, topY), (CX + bw - lean * 0.3, topY - 1 + (1 if side else 0)),
        (CX + bw + 1.5 + (lean if side else 0), (topY + botY) / 2),
        (CX + bw - 0.5 + (lean * 0.5 if side else 0), botY),
        (CX - bw - 1.5, botY), (CX - bw - 2.5 + (lean * 0.4 if side else 0), (topY + botY) / 2),
    ]
    poly(d, body, SHIRT)
    poly(d, [(body[0][0], body[0][1]), (CX - 2, body[0][1]), (CX - 3, botY - 1), (body[-1][0], body[-1][1])], SHIRT_D)
    # pinggiran compang-compang
    n_tear = 5
    for i in range(n_tear):
        tx = CX - bw + (2 * bw) * (i + 0.5) / n_tear
        tw = bw * 0.28
        poly(d, [(tx - tw, botY - 0.5), (tx + tw, botY - 0.5), (tx + (0.6 if i % 2 else -0.4), botY + 3.6)],
             SHIRT_D if i % 2 else SHIRT)

    # kaki dekat
    if side:
        draw_leg(ctx, hipR, (legR_[0], legR_[1]), (legR_[2], legR_[3]), PANTS, BOOT, w=6.6 * t)
    else:
        near_leg, nhip = (legL_, hipL) if view != 'back' else (legR_, hipR)
        draw_leg(ctx, nhip, (near_leg[0], near_leg[1]), (near_leg[2], near_leg[3]), PANTS, BOOT, w=6.6 * t)

    # ---- kepala ----
    hx = CX + (lean * 0.9 if side else (lean * 0.5 if diag else 0))
    ellipse(d, hx, hy, head_r * (0.9 if diag else 1), head_r * 1.02, A)
    # rahang: mulut menganga gelap (front/side)
    if toward:
        ellipse(d, hx + (1.5 if diag else 0), hy + head_r * 0.55, head_r * 0.42, head_r * 0.38, shade(A_D, -0.25))
        # gigi atas
        if kind == 'tank':
            for i in (-1, 0, 1):
                poly(d, [(hx + i * 3 - 1, hy + head_r * 0.32), (hx + i * 3 + 1, hy + head_r * 0.32), (hx + i * 3, hy + head_r * 0.52)], (228, 224, 214))
    elif side:
        ellipse(d, hx + head_r * 0.32, hy + head_r * 0.6, head_r * 0.36, head_r * 0.34, shade(A_D, -0.25))

    # mata menyala
    if toward:
        eyx = (3.4 if not diag else 2.6)
        ellipse(d, hx - eyx + (0.8 if diag else 0), hy - 1.5, 1.5, 1.7, EYE)
        ellipse(d, hx + eyx + (2.4 if diag else 0), hy - 1.5, 1.5, 1.7, EYE)
        ellipse(d, hx - eyx + (0.8 if diag else 0), hy - 1.4, 0.7, 0.8, (26, 30, 20))
        ellipse(d, hx + eyx + (2.4 if diag else 0), hy - 1.4, 0.7, 0.8, (26, 30, 20))
    elif side:
        ellipse(d, hx + head_r * 0.35, hy - 2, 1.5, 1.7, EYE)
        ellipse(d, hx + head_r * 0.38, hy - 1.9, 0.7, 0.8, (26, 30, 20))
    else:
        # belakang kepala: garis rambut/kerutan
        seg(d, hx - 2.5, hy + head_r * 0.5, hx + 2.5, hy + head_r * 0.5, A_D, 1.4)

    # benjolan/tahi lalat khas zombie
    if kind == 'slow':
        ellipse(d, hx - head_r * 0.5, hy - 4, 1.4, 1.2, A_D)
    if kind == 'tank':
        # bahu bergelombang + totol ungu tua
        ellipse(d, shL[0] - 1, shL[1] - 2, 3.2, 2.6, shade(A_D, 0.0))
        ellipse(d, shR[0] + 1.5, shR[1] - 3, 2.4, 2.0, shade(A_D, 0.1))
        ellipse(d, hx, hy - head_r * 0.75, 3.4, 2.2, shade(A, 0.12))

    # lengan dekat
    if side:
        reach_arm(shR, sL * 0.6)
    else:
        reach_arm(shL if view != 'back' else shL, sL * 0.6)

    return finish(img)


# ------------------------------------------------------------ driver ----------

VIEWS = ['front', 'back', 'side', 'ne', 'se']

def main():
    chars = {
        'player': lambda v, f: draw_player(v, f),
        'zombie_slow': lambda v, f: draw_zombie(v, f, 'slow'),
        'zombie_fast': lambda v, f: draw_zombie(v, f, 'fast'),
        'zombie_tank': lambda v, f: draw_zombie(v, f, 'tank'),
    }
    count = 0
    for name, fn in chars.items():
        for v in VIEWS:
            for f in range(3):
                img = fn(v, f)
                out = f"assets/characters/{name}_{v}_{f}.png"
                img.save(out)
                count += 1
    print(f"{count} frame sheet berhasil digenerate -> assets/characters/")


if __name__ == '__main__':
    main()
