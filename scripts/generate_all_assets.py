import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Make sure directories exist
os.makedirs("assets/characters", exist_ok=True)
os.makedirs("assets/environment", exist_ok=True)
os.makedirs("assets/resources", exist_ok=True)
os.makedirs("assets/ui", exist_ok=True)
os.makedirs("assets/branding", exist_ok=True)

# ----------------- Helper Functions -----------------

def get_canvas(w, h, scale=8):
    sw, sh = w * scale, h * scale
    return Image.new("RGBA", (sw, sh), (0, 0, 0, 0)), scale

def downsample(img, w, h):
    return img.resize((w, h), Image.Resampling.LANCZOS)

def draw_shadow(base_img, draw_fn, offset=(2, 3), blur=2.0, opacity=110, scale=8):
    sw, sh = base_img.size
    shadow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    draw_fn(sdraw, offset[0] * scale, offset[1] * scale, (0, 0, 0, opacity))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur * scale))
    base_img.alpha_composite(shadow)

# ----------------- 1. CHARACTERS & ENTITIES -----------------

def generate_boat_lv1():
    w, h = 64, 64
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    bw, bl = 11 * s, 23 * s
    
    hull_pts = [
        (cx, cy - bl),
        (cx + bw * 0.7, cy - bl * 0.6),
        (cx + bw, cy),
        (cx + bw * 0.9, cy + bl * 0.8),
        (cx + bw * 0.6, cy + bl),
        (cx - bw * 0.6, cy + bl),
        (cx - bw * 0.9, cy + bl * 0.8),
        (cx - bw, cy),
        (cx - bw * 0.7, cy - bl * 0.6),
    ]
    
    # Shadow
    def shadow_fn(d, ox, oy, col):
        pts = [(p[0] + ox, p[1] + oy) for p in hull_pts]
        d.polygon(pts, fill=col)
    draw_shadow(im, shadow_fn, offset=(1.5, 2.5), blur=2.0, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Outer hull (Navy Blue #2c3e50 / #1a2a3a)
    draw.polygon(hull_pts, fill=(35, 52, 70, 255), outline=(18, 28, 40, 255), width=int(1.6 * s))
    
    # Deck (Wood)
    deck_w, deck_l = bw * 0.76, bl * 0.88
    deck_pts = [
        (cx, cy - deck_l),
        (cx + deck_w * 0.7, cy - deck_l * 0.55),
        (cx + deck_w, cy),
        (cx + deck_w * 0.9, cy + deck_l * 0.75),
        (cx + deck_w * 0.5, cy + deck_l * 0.95),
        (cx - deck_w * 0.5, cy + deck_l * 0.95),
        (cx - deck_w * 0.9, cy + deck_l * 0.75),
        (cx - deck_w, cy),
        (cx - deck_w * 0.7, cy - deck_l * 0.55),
    ]
    draw.polygon(deck_pts, fill=(108, 75, 48, 255), outline=(52, 34, 18, 255), width=int(1.2 * s))
    
    # Wood planks
    for yo in range(int(-deck_l * 0.7), int(deck_l * 0.85), int(4.5 * s)):
        draw.line([(cx - deck_w * 0.75, cy + yo), (cx + deck_w * 0.75, cy + yo)],
                  fill=(132, 92, 58, 255), width=int(1.2 * s))
        draw.line([(cx - deck_w * 0.75, cy + yo + 1 * s), (cx + deck_w * 0.75, cy + yo + 1 * s)],
                  fill=(72, 48, 28, 255), width=int(0.8 * s))
        
    # Wooden benches
    # Middle thwart
    draw.rectangle([cx - deck_w * 0.88, cy - 2.5 * s, cx + deck_w * 0.88, cy + 2.5 * s],
                   fill=(155, 110, 72, 255), outline=(55, 36, 20, 255), width=int(1 * s))
    # Bow seat
    draw.polygon([(cx - deck_w * 0.55, cy - bl * 0.45), (cx + deck_w * 0.55, cy - bl * 0.45),
                  (cx + deck_w * 0.35, cy - bl * 0.45 - 4 * s), (cx - deck_w * 0.35, cy - bl * 0.45 - 4 * s)],
                 fill=(155, 110, 72, 255), outline=(55, 36, 20, 255), width=int(1 * s))
    
    # Outboard motor at stern
    motor_y = cy + bl * 0.95
    draw.rectangle([cx - 4 * s, motor_y - 1 * s, cx + 4 * s, motor_y + 5.5 * s],
                   fill=(44, 58, 75, 255), outline=(20, 28, 38, 255), width=int(1 * s))
    draw.rectangle([cx - 2 * s, motor_y + 4.5 * s, cx + 2 * s, motor_y + 8.5 * s],
                   fill=(70, 85, 105, 255), outline=(20, 28, 38, 255), width=int(0.8 * s))
    draw.ellipse([cx - 3 * s, motor_y + 7.5 * s, cx + 3 * s, motor_y + 9.5 * s], fill=(180, 195, 210, 255))
    
    # Coiled rope at bow & orange lantern on bench
    draw.ellipse([cx - 3.2 * s, cy - 3.2 * s, cx + 3.2 * s, cy + 3.2 * s],
                 fill=(230, 126, 34, 255), outline=(175, 75, 10, 255), width=int(0.8 * s))
    draw.ellipse([cx - 1.5 * s, cy - 1.5 * s, cx + 1.5 * s, cy + 1.5 * s], fill=(255, 230, 140, 255))
    
    draw.line([(cx, cy - bl), (cx, cy - bl + 5 * s)], fill=(220, 190, 140, 255), width=int(1.5 * s))
    
    return downsample(im, w, h)

def generate_boat_lv2():
    w, h = 80, 80
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    bw, bl = 16 * s, 31 * s
    
    hull_pts = [
        (cx, cy - bl),
        (cx + bw * 0.7, cy - bl * 0.65),
        (cx + bw, cy - bl * 0.1),
        (cx + bw * 0.95, cy + bl * 0.75),
        (cx + bw * 0.65, cy + bl),
        (cx - bw * 0.65, cy + bl),
        (cx - bw * 0.95, cy + bl * 0.75),
        (cx - bw, cy - bl * 0.1),
        (cx - bw * 0.7, cy - bl * 0.65),
    ]
    
    def shadow_fn(d, ox, oy, col):
        pts = [(p[0] + ox, p[1] + oy) for p in hull_pts]
        d.polygon(pts, fill=col)
    draw_shadow(im, shadow_fn, offset=(2, 3.5), blur=2.5, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Outer hull (Navy #233549)
    draw.polygon(hull_pts, fill=(35, 53, 73, 255), outline=(16, 26, 38, 255), width=int(2 * s))
    
    # Deck inner boundary
    deck_w, deck_l = bw * 0.8, bl * 0.9
    deck_pts = [
        (cx, cy - deck_l),
        (cx + deck_w * 0.7, cy - deck_l * 0.6),
        (cx + deck_w, cy - deck_l * 0.1),
        (cx + deck_w * 0.92, cy + deck_l * 0.75),
        (cx + deck_w * 0.58, cy + deck_l * 0.95),
        (cx - deck_w * 0.58, cy + deck_l * 0.95),
        (cx - deck_w * 0.92, cy + deck_l * 0.75),
        (cx - deck_w, cy - deck_l * 0.1),
        (cx - deck_w * 0.7, cy - deck_l * 0.6),
    ]
    draw.polygon(deck_pts, fill=(75, 88, 102, 255), outline=(30, 42, 54, 255), width=int(1.2 * s))
    
    # Wooden deck inlay at bow and stern
    for yo in range(int(-deck_l * 0.75), int(-deck_l * 0.25), int(4 * s)):
        draw.line([(cx - deck_w * 0.6, cy + yo), (cx + deck_w * 0.6, cy + yo)],
                  fill=(125, 90, 58, 255), width=int(1.2 * s))
    for yo in range(int(deck_l * 0.45), int(deck_l * 0.85), int(4 * s)):
        draw.line([(cx - deck_w * 0.7, cy + yo), (cx + deck_w * 0.7, cy + yo)],
                  fill=(125, 90, 58, 255), width=int(1.2 * s))
        
    # Bow Cargo Storage Crate (with ropes)
    draw.rectangle([cx - 5.5 * s, cy - bl * 0.55, cx + 5.5 * s, cy - bl * 0.3],
                   fill=(155, 110, 72, 255), outline=(55, 36, 20, 255), width=int(1 * s))
    draw.line([(cx, cy - bl * 0.55), (cx, cy - bl * 0.3)], fill=(220, 190, 140, 255), width=int(1 * s))
    
    # Small Wheelhouse / Cabin in middle
    cabin_w, cabin_h = 10 * s, 14 * s
    cabin_y = cy + 2 * s
    draw.rounded_rectangle([cx - cabin_w, cabin_y - cabin_h/2, cx + cabin_w, cabin_y + cabin_h/2], radius=2.5 * s,
                           fill=(44, 62, 80, 255), outline=(18, 28, 40, 255), width=int(1.5 * s))
    
    # Cabin Glass Windshield (Aqua/Blue #7fd4ff)
    draw.rounded_rectangle([cx - 8 * s, cabin_y - cabin_h/2 + 2 * s, cx + 8 * s, cabin_y - cabin_h/2 + 6 * s], radius=1.5 * s,
                           fill=(127, 212, 255, 255), outline=(30, 80, 110, 255), width=int(0.8 * s))
    draw.line([(cx, cabin_y - cabin_h/2 + 2 * s), (cx, cabin_y - cabin_h/2 + 6 * s)], fill=(30, 80, 110, 255), width=int(0.8 * s))
    
    # Roof Mast / Antenna
    draw.circle((cx, cabin_y), 2.5 * s, fill=(189, 195, 199, 255), outline=(40, 50, 60, 255), width=int(0.8 * s))
    draw.line([(cx, cabin_y), (cx, cabin_y - 6 * s)], fill=(230, 126, 34, 255), width=int(1.2 * s))
    
    # Orange Lifebuoy on side
    draw.ellipse([cx + cabin_w + 0.5 * s, cabin_y - 3 * s, cx + cabin_w + 4.5 * s, cabin_y + 3 * s],
                 fill=(230, 126, 34, 255), outline=(175, 75, 10, 255), width=int(0.8 * s))
    draw.ellipse([cx + cabin_w + 1.7 * s, cabin_y - 1.2 * s, cx + cabin_w + 3.3 * s, cabin_y + 1.2 * s],
                 fill=(75, 88, 102, 255))
    
    # Side Railings
    draw.line([(cx - bw * 0.9, cy - bl * 0.3), (cx - bw * 0.9, cy + bl * 0.7)], fill=(189, 195, 199, 255), width=int(1 * s))
    draw.line([(cx + bw * 0.9, cy - bl * 0.3), (cx + bw * 0.9, cy + bl * 0.7)], fill=(189, 195, 199, 255), width=int(1 * s))
    
    # Stern outboard motor
    draw.rectangle([cx - 5 * s, cy + bl * 0.95, cx + 5 * s, cy + bl * 0.95 + 6 * s],
                   fill=(44, 58, 75, 255), outline=(20, 28, 38, 255), width=int(1 * s))
    
    return downsample(im, w, h)

def generate_boat_lv3():
    w, h = 96, 96
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    bw, bl = 21 * s, 40 * s
    
    hull_pts = [
        (cx, cy - bl),
        (cx + bw * 0.68, cy - bl * 0.7),
        (cx + bw, cy - bl * 0.15),
        (cx + bw * 0.98, cy + bl * 0.72),
        (cx + bw * 0.7, cy + bl),
        (cx - bw * 0.7, cy + bl),
        (cx - bw * 0.98, cy + bl * 0.72),
        (cx - bw, cy - bl * 0.15),
        (cx - bw * 0.68, cy - bl * 0.7),
    ]
    
    def shadow_fn(d, ox, oy, col):
        pts = [(p[0] + ox, p[1] + oy) for p in hull_pts]
        d.polygon(pts, fill=col)
    draw_shadow(im, shadow_fn, offset=(2.5, 4.0), blur=3.0, opacity=130, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Heavy armored dark navy / steel hull (#1a2a3a)
    draw.polygon(hull_pts, fill=(28, 44, 62, 255), outline=(12, 20, 30, 255), width=int(2.2 * s))
    
    # Orange bow hazard accent stripe
    draw.line([(cx - bw * 0.62, cy - bl * 0.7), (cx, cy - bl + 6 * s)], fill=(230, 126, 34, 255), width=int(2.5 * s))
    draw.line([(cx + bw * 0.62, cy - bl * 0.7), (cx, cy - bl + 6 * s)], fill=(230, 126, 34, 255), width=int(2.5 * s))
    
    # Reinforced Steel Deck
    deck_w, deck_l = bw * 0.82, bl * 0.92
    deck_pts = [
        (cx, cy - deck_l),
        (cx + deck_w * 0.7, cy - deck_l * 0.65),
        (cx + deck_w, cy - deck_l * 0.15),
        (cx + deck_w * 0.94, cy + deck_l * 0.75),
        (cx + deck_w * 0.62, cy + deck_l * 0.95),
        (cx - deck_w * 0.62, cy + deck_l * 0.95),
        (cx - deck_w * 0.94, cy + deck_l * 0.75),
        (cx - deck_w, cy - deck_l * 0.15),
        (cx - deck_w * 0.7, cy - deck_l * 0.65),
    ]
    draw.polygon(deck_pts, fill=(60, 74, 90, 255), outline=(24, 34, 46, 255), width=int(1.5 * s))
    
    # Bow gear locker & anchor winch
    draw.rectangle([cx - 8 * s, cy - bl * 0.6, cx + 8 * s, cy - bl * 0.38],
                   fill=(45, 60, 75, 255), outline=(20, 30, 42, 255), width=int(1.2 * s))
    draw.circle((cx, cy - bl * 0.7), 3.5 * s, fill=(189, 195, 199, 255), outline=(30, 40, 50, 255), width=int(1 * s))
    
    # Main Command Bridge / Cabin
    cab_w, cab_h = 13.5 * s, 18 * s
    cab_y = cy - 2 * s
    draw.rounded_rectangle([cx - cab_w, cab_y - cab_h/2, cx + cab_w, cab_y + cab_h/2], radius=3.5 * s,
                           fill=(38, 55, 75, 255), outline=(15, 24, 35, 255), width=int(1.8 * s))
    
    # Bridge Windows (Cyan Glow #7fd4ff)
    draw.rounded_rectangle([cx - 11 * s, cab_y - cab_h/2 + 2.5 * s, cx + 11 * s, cab_y - cab_h/2 + 7.5 * s], radius=2 * s,
                           fill=(127, 212, 255, 255), outline=(25, 70, 95, 255), width=int(1 * s))
    draw.line([(cx - 3.8 * s, cab_y - cab_h/2 + 2.5 * s), (cx - 3.8 * s, cab_y - cab_h/2 + 7.5 * s)], fill=(25, 70, 95, 255), width=int(1 * s))
    draw.line([(cx + 3.8 * s, cab_y - cab_h/2 + 2.5 * s), (cx + 3.8 * s, cab_y - cab_h/2 + 7.5 * s)], fill=(25, 70, 95, 255), width=int(1 * s))
    
    # Smokestack / Exhaust with soot and orange ember glow
    sm_y = cy + 15 * s
    draw.rounded_rectangle([cx - 4.5 * s, sm_y - 6 * s, cx + 4.5 * s, sm_y + 4 * s], radius=2 * s,
                           fill=(30, 40, 50, 255), outline=(15, 20, 26, 255), width=int(1.2 * s))
    # Smokestack rim & glowing top
    draw.ellipse([cx - 3.8 * s, sm_y - 7 * s, cx + 3.8 * s, sm_y - 4 * s], fill=(230, 126, 34, 255), outline=(180, 80, 10, 255), width=int(1 * s))
    draw.ellipse([cx - 2 * s, sm_y - 6.5 * s, cx + 2 * s, sm_y - 4.5 * s], fill=(255, 230, 140, 255))
    
    # Mast with Orange Nautical Pennant Flag
    mast_y = cab_y
    draw.circle((cx, mast_y), 3.2 * s, fill=(189, 195, 199, 255), outline=(30, 40, 50, 255), width=int(1 * s))
    # Flag pointing to right / aft
    draw.polygon([(cx, mast_y), (cx + 12 * s, mast_y + 4 * s), (cx, mast_y + 8 * s)],
                 fill=(230, 126, 34, 255), outline=(175, 75, 10, 255), width=int(1 * s))
    
    # Searchlights on cabin corners
    draw.circle((cx - 10 * s, cab_y - cab_h/2 + 2 * s), 2.2 * s, fill=(255, 240, 160, 255), outline=(40, 50, 60, 255), width=int(0.8 * s))
    draw.circle((cx + 10 * s, cab_y - cab_h/2 + 2 * s), 2.2 * s, fill=(255, 240, 160, 255), outline=(40, 50, 60, 255), width=int(0.8 * s))
    
    # Dual Lifebuoys on sides
    for side in [-1, 1]:
        draw.ellipse([cx + side * (cab_w + 1 * s) - 2.5 * s, cab_y - 3 * s, cx + side * (cab_w + 1 * s) + 2.5 * s, cab_y + 3 * s],
                     fill=(230, 126, 34, 255), outline=(175, 75, 10, 255), width=int(0.8 * s))
        draw.ellipse([cx + side * (cab_w + 1 * s) - 1.2 * s, cab_y - 1.2 * s, cx + side * (cab_w + 1 * s) + 1.2 * s, cab_y + 1.2 * s],
                     fill=(60, 74, 90, 255))
        
    # Stern Twin Outboard / Inboard exhausts & heavy railing
    draw.rectangle([cx - 8 * s, cy + bl * 0.94, cx - 2 * s, cy + bl * 0.94 + 6 * s],
                   fill=(35, 48, 62, 255), outline=(15, 22, 30, 255), width=int(1 * s))
    draw.rectangle([cx + 2 * s, cy + bl * 0.94, cx + 8 * s, cy + bl * 0.94 + 6 * s],
                   fill=(35, 48, 62, 255), outline=(15, 22, 30, 255), width=int(1 * s))
    
    return downsample(im, w, h)

def generate_player():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - 9 * s + ox, cy - 8 * s + oy, cx + 9 * s + ox, cy + 9 * s + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(1.2, 2.0), blur=1.8, opacity=110, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Tactical Backpack on back
    draw.rounded_rectangle([cx - 5.5 * s, cy - 1.5 * s, cx + 5.5 * s, cy + 8.5 * s], radius=2.5 * s,
                           fill=(36, 48, 62, 255), outline=(18, 26, 36, 255), width=int(1 * s))
    draw.line([(cx - 3.5 * s, cy + 4 * s), (cx + 3.5 * s, cy + 4 * s)], fill=(127, 140, 141, 255), width=int(1 * s))
    
    # Orange Raincoat Shoulders (#e67e22)
    draw.rounded_rectangle([cx - 8.5 * s, cy - 6 * s, cx + 8.5 * s, cy + 5 * s], radius=4 * s,
                           fill=(230, 126, 34, 255), outline=(160, 70, 10, 255), width=int(1.4 * s))
    
    # High-vis reflective stripes
    draw.line([(cx - 7.5 * s, cy - 2 * s), (cx - 3.5 * s, cy - 5 * s)], fill=(255, 235, 120, 255), width=int(1.2 * s))
    draw.line([(cx + 7.5 * s, cy - 2 * s), (cx + 3.5 * s, cy - 5 * s)], fill=(255, 235, 120, 255), width=int(1.2 * s))
    
    # Left Arm & Hand
    draw.rounded_rectangle([cx - 9 * s, cy - 9.5 * s, cx - 4.5 * s, cy - 2 * s], radius=2 * s,
                           fill=(211, 84, 0, 255), outline=(140, 55, 5, 255), width=int(1 * s))
    draw.ellipse([cx - 8.5 * s, cy - 10.5 * s, cx - 5 * s, cy - 7.5 * s], fill=(235, 185, 145, 255), outline=(140, 55, 5, 255), width=int(0.8 * s))
    
    # Right Arm & Hand holding Survival Machete/Flashlight
    draw.rounded_rectangle([cx + 4.5 * s, cy - 9.5 * s, cx + 9 * s, cy - 2 * s], radius=2 * s,
                           fill=(211, 84, 0, 255), outline=(140, 55, 5, 255), width=int(1 * s))
    draw.ellipse([cx + 5 * s, cy - 10.5 * s, cx + 8.5 * s, cy - 7.5 * s], fill=(235, 185, 145, 255), outline=(140, 55, 5, 255), width=int(0.8 * s))
    # Survival blade
    draw.line([(cx + 6.8 * s, cy - 8 * s), (cx + 6.8 * s, cy - 13.5 * s)], fill=(220, 230, 240, 255), width=int(1.6 * s))
    draw.polygon([(cx + 6.8 * s, cy - 14 * s), (cx + 9 * s, cy - 11.5 * s), (cx + 6.8 * s, cy - 10 * s)], fill=(240, 245, 255, 255))
    
    # Raincoat Hood (facing top)
    draw.ellipse([cx - 5.5 * s, cy - 7.5 * s, cx + 5.5 * s, cy + 3 * s], fill=(243, 156, 18, 255), outline=(160, 70, 10, 255), width=int(1.2 * s))
    # Face visor opening
    draw.ellipse([cx - 3.2 * s, cy - 6 * s, cx + 3.2 * s, cy - 1 * s], fill=(30, 22, 18, 255))
    
    return downsample(im, w, h)

def generate_zombie_slow():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - 10.5 * s + ox, cy - 9 * s + oy, cx + 10.5 * s + ox, cy + 10.5 * s + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(1.5, 2.5), blur=2.0, opacity=110, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Bloated rotten swamp green body (#385032)
    draw.ellipse([cx - 10 * s, cy - 8.5 * s, cx + 10 * s, cy + 9 * s],
                 fill=(58, 83, 53, 255), outline=(28, 42, 24, 255), width=int(1.4 * s))
    
    # Rotting texture patches & pustules
    draw.ellipse([cx - 6 * s, cy + 1 * s, cx - 1.5 * s, cy + 5.5 * s], fill=(88, 122, 80, 255))
    draw.ellipse([cx + 2 * s, cy - 4 * s, cx + 6.5 * s, cy + 0.5 * s], fill=(88, 122, 80, 255))
    draw.ellipse([cx + 1 * s, cy + 3.5 * s, cx + 4.5 * s, cy + 7 * s], fill=(40, 60, 36, 255))
    
    # Shredded rags
    draw.polygon([(cx - 7 * s, cy - 2 * s), (cx - 2 * s, cy + 6.5 * s), (cx + 4.5 * s, cy + 7.5 * s), (cx + 7.5 * s, cy - 1 * s)],
                 fill=(35, 45, 48, 220))
    
    # Rotting arms reaching forward
    draw.rounded_rectangle([cx - 11 * s, cy - 10.5 * s, cx - 6.5 * s, cy - 2 * s], radius=2 * s,
                           fill=(68, 98, 62, 255), outline=(28, 42, 24, 255), width=int(1 * s))
    draw.rounded_rectangle([cx + 6.5 * s, cy - 10.5 * s, cx + 11 * s, cy - 2 * s], radius=2 * s,
                           fill=(68, 98, 62, 255), outline=(28, 42, 24, 255), width=int(1 * s))
    
    # Decayed hands / claws
    draw.ellipse([cx - 10.5 * s, cy - 12.5 * s, cx - 7 * s, cy - 9 * s], fill=(88, 122, 80, 255))
    draw.ellipse([cx + 7 * s, cy - 12.5 * s, cx + 10.5 * s, cy - 9 * s], fill=(88, 122, 80, 255))
    
    # Zombie Head
    draw.ellipse([cx - 6 * s, cy - 8 * s, cx + 6 * s, cy + 2 * s],
                 fill=(75, 106, 68, 255), outline=(28, 42, 24, 255), width=int(1.2 * s))
    # Glowing infected yellow-green eyes
    draw.ellipse([cx - 4 * s, cy - 6.5 * s, cx - 1.8 * s, cy - 4.2 * s], fill=(220, 240, 90, 255))
    draw.ellipse([cx + 1.8 * s, cy - 6.5 * s, cx + 4 * s, cy - 4.2 * s], fill=(220, 240, 90, 255))
    
    return downsample(im, w, h)

def generate_zombie_fast():
    w, h = 28, 28
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - 8 * s + ox, cy - 7 * s + oy, cx + 8 * s + ox, cy + 8 * s + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(1.2, 2.0), blur=1.6, opacity=110, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Slender, sinewy crimson/maroon body (#8b3a3a)
    draw.ellipse([cx - 6.5 * s, cy - 6 * s, cx + 6.5 * s, cy + 7 * s],
                 fill=(138, 48, 48, 255), outline=(75, 20, 20, 255), width=int(1.2 * s))
    
    # Exposed muscle / tendon stripes
    draw.line([(cx - 4 * s, cy - 2 * s), (cx + 4 * s, cy + 3 * s)], fill=(195, 75, 75, 255), width=int(1 * s))
    draw.line([(cx - 3 * s, cy + 2 * s), (cx + 3 * s, cy + 5 * s)], fill=(195, 75, 75, 255), width=int(1 * s))
    
    # Sharp elongated claw arms reaching aggressively forward
    draw.polygon([(cx - 5.5 * s, cy - 1 * s), (cx - 9.5 * s, cy - 10 * s), (cx - 7.5 * s, cy - 11.5 * s), (cx - 3.5 * s, cy - 3 * s)],
                 fill=(155, 55, 55, 255), outline=(75, 20, 20, 255))
    draw.polygon([(cx + 5.5 * s, cy - 1 * s), (cx + 9.5 * s, cy - 10 * s), (cx + 7.5 * s, cy - 11.5 * s), (cx + 3.5 * s, cy - 3 * s)],
                 fill=(155, 55, 55, 255), outline=(75, 20, 20, 255))
    
    # Sharp bone claws
    draw.line([(cx - 8.5 * s, cy - 11 * s), (cx - 9.5 * s, cy - 13 * s)], fill=(240, 220, 200, 255), width=int(1.2 * s))
    draw.line([(cx + 8.5 * s, cy - 11 * s), (cx + 9.5 * s, cy - 13 * s)], fill=(240, 220, 200, 255), width=int(1.2 * s))
    
    # Lean Head
    draw.ellipse([cx - 4.5 * s, cy - 7.5 * s, cx + 4.5 * s, cy + 0.5 * s],
                 fill=(165, 62, 62, 255), outline=(75, 20, 20, 255), width=int(1 * s))
    # Glowing bloodshot red eyes
    draw.ellipse([cx - 3 * s, cy - 6 * s, cx - 1 * s, cy - 4 * s], fill=(255, 100, 100, 255))
    draw.ellipse([cx + 1 * s, cy - 6 * s, cx + 3 * s, cy - 4 * s], fill=(255, 100, 100, 255))
    
    return downsample(im, w, h)

def generate_zombie_tank():
    w, h = 40, 40
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - 15 * s + ox, cy - 12 * s + oy, cx + 15 * s + ox, cy + 14 * s + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(2.0, 3.0), blur=2.8, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Huge bruised mutated purple body (#4d3360)
    draw.ellipse([cx - 14 * s, cy - 10 * s, cx + 14 * s, cy + 12 * s],
                 fill=(72, 48, 92, 255), outline=(36, 22, 48, 255), width=int(2 * s))
    
    # Mutated back plates / spikes
    for angle in [-0.8, -0.4, 0, 0.4, 0.8]:
        sx = cx + math.sin(angle) * 8 * s
        sy = cy + 4 * s + math.cos(angle) * 4 * s
        draw.ellipse([sx - 2.5 * s, sy - 2.5 * s, sx + 2.5 * s, sy + 2.5 * s],
                     fill=(115, 80, 145, 255), outline=(45, 28, 60, 255), width=int(1 * s))
        
    # Massive thick mutated arms with huge fists
    draw.rounded_rectangle([cx - 17 * s, cy - 13 * s, cx - 9.5 * s, cy + 2 * s], radius=3.5 * s,
                           fill=(85, 56, 108, 255), outline=(36, 22, 48, 255), width=int(1.5 * s))
    draw.rounded_rectangle([cx + 9.5 * s, cy - 13 * s, cx + 17 * s, cy + 2 * s], radius=3.5 * s,
                           fill=(85, 56, 108, 255), outline=(36, 22, 48, 255), width=int(1.5 * s))
    
    # Giant Knuckles
    draw.ellipse([cx - 16.5 * s, cy - 15.5 * s, cx - 10 * s, cy - 9 * s], fill=(110, 75, 140, 255), outline=(36, 22, 48, 255), width=int(1 * s))
    draw.ellipse([cx + 10 * s, cy - 15.5 * s, cx + 16.5 * s, cy - 9 * s], fill=(110, 75, 140, 255), outline=(36, 22, 48, 255), width=int(1 * s))
    
    # Hulking Head embedded into shoulders
    draw.ellipse([cx - 6.5 * s, cy - 9 * s, cx + 6.5 * s, cy + 1 * s],
                 fill=(92, 60, 118, 255), outline=(36, 22, 48, 255), width=int(1.4 * s))
    
    # Glowing violet mutated eyes
    draw.ellipse([cx - 4.5 * s, cy - 7 * s, cx - 1.8 * s, cy - 4.5 * s], fill=(210, 140, 255, 255))
    draw.ellipse([cx + 1.8 * s, cy - 7 * s, cx + 4.5 * s, cy - 4.5 * s], fill=(210, 140, 255, 255))
    
    # Pulsing glowing veins on shoulders
    draw.line([(cx - 11 * s, cy - 6 * s), (cx - 7 * s, cy - 2 * s)], fill=(185, 120, 240, 220), width=int(1.2 * s))
    draw.line([(cx + 11 * s, cy - 6 * s), (cx + 7 * s, cy - 2 * s)], fill=(185, 120, 240, 220), width=int(1.2 * s))
    
    return downsample(im, w, h)

# ----------------- 2. ENVIRONMENT -----------------

def generate_island():
    w, h = 128, 128
    im, s = get_canvas(w, h, scale=4)
    cx, cy = (w * s) / 2, (h * s) / 2
    r_base = 44 * s
    
    # Shallow water aqua halo / surf
    water_halo = Image.new("RGBA", im.size, (0, 0, 0, 0))
    w_draw = ImageDraw.Draw(water_halo)
    
    # Generate natural island blob points
    rng = random.Random(42)
    n_pts = 32
    pts_sand = []
    pts_grass = []
    for i in range(n_pts):
        angle = (i / n_pts) * 2 * math.pi
        rad = r_base * (0.82 + rng.random() * 0.34)
        pts_sand.append((cx + math.cos(angle) * rad, cy + math.sin(angle) * rad))
        pts_grass.append((cx + math.cos(angle) * (rad * 0.72), cy + math.sin(angle) * (rad * 0.72)))
        
    # Draw water surf
    w_draw.ellipse([cx - r_base * 1.25, cy - r_base * 1.25, cx + r_base * 1.25, cy + r_base * 1.25],
                   fill=(30, 95, 130, 80))
    water_halo = water_halo.filter(ImageFilter.GaussianBlur(8 * s))
    im.alpha_composite(water_halo)
    
    # Draw Sand Beach
    draw = ImageDraw.Draw(im)
    draw.polygon(pts_sand, fill=(222, 198, 142, 255), outline=(168, 142, 90, 255), width=int(2 * s))
    
    # Draw Lush Grass interior plateau
    draw.polygon(pts_grass, fill=(46, 110, 63, 255), outline=(28, 70, 40, 255), width=int(2 * s))
    
    # Internal grassy hill contour
    pts_hill = [(p[0]*0.7 + cx*0.3, p[1]*0.7 + cy*0.3) for p in pts_grass]
    draw.polygon(pts_hill, fill=(58, 138, 78, 255))
    
    # Decorative Trees on island
    def draw_island_tree(tx, ty, tr):
        # Tree shadow
        draw.ellipse([tx - tr + 2*s, ty - tr + 3*s, tx + tr + 2*s, ty + tr + 3*s], fill=(0, 0, 0, 70))
        # Canopy rings
        draw.ellipse([tx - tr, ty - tr, tx + tr, ty + tr], fill=(28, 72, 40, 255), outline=(15, 42, 22, 255), width=int(1*s))
        draw.ellipse([tx - tr*0.7, ty - tr*0.7 - 1*s, tx + tr*0.7, ty + tr*0.7 - 1*s], fill=(42, 105, 58, 255))
        draw.ellipse([tx - tr*0.4, ty - tr*0.4 - 2*s, tx + tr*0.4, ty + tr*0.4 - 2*s], fill=(62, 148, 84, 255))
        # Woody center
        draw.circle((tx, ty), 1.8*s, fill=(110, 75, 45, 255))
        
    draw_island_tree(cx - 14 * s, cy - 8 * s, 11 * s)
    draw_island_tree(cx + 12 * s, cy - 12 * s, 9 * s)
    draw_island_tree(cx + 6 * s, cy + 14 * s, 10 * s)
    
    # Rocks on beach
    def draw_island_rock(rx, ry, rr):
        draw.polygon([(rx - rr, ry), (rx - rr*0.5, ry - rr*0.8), (rx + rr*0.8, ry - rr*0.4), (rx + rr, ry + rr*0.5), (rx - rr*0.3, ry + rr*0.8)],
                     fill=(90, 105, 120, 255), outline=(40, 50, 60, 255), width=int(1*s))
        draw.polygon([(rx - rr*0.5, ry - rr*0.8), (rx + rr*0.8, ry - rr*0.4), (rx, ry)], fill=(125, 142, 160, 255))
        
    draw_island_rock(cx - 28 * s, cy + 18 * s, 5.5 * s)
    draw_island_rock(cx + 26 * s, cy - 6 * s, 4.5 * s)
    
    return downsample(im, w, h)

def generate_tree():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    tr = 12 * s
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - tr + ox, cy - tr + oy, cx + tr + ox, cy + tr + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(1.5, 2.5), blur=2.0, opacity=110, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Layer 1: Dark Outer Canopy (#1c4627)
    draw.ellipse([cx - tr, cy - tr, cx + tr, cy + tr],
                 fill=(28, 70, 39, 255), outline=(15, 42, 22, 255), width=int(1.4 * s))
    
    # Foliage bumps
    for a_deg in range(0, 360, 45):
        rad = math.radians(a_deg)
        bx = cx + math.cos(rad) * (tr * 0.82)
        by = cy + math.sin(rad) * (tr * 0.82)
        draw.circle((bx, by), 4 * s, fill=(28, 70, 39, 255))
        
    # Layer 2: Mid Canopy (#2c683b)
    draw.ellipse([cx - tr * 0.72, cy - tr * 0.72 - 1 * s, cx + tr * 0.72, cy + tr * 0.72 - 1 * s],
                 fill=(44, 104, 59, 255))
    
    # Layer 3: Top Highlight Canopy (#3d8c51)
    draw.ellipse([cx - tr * 0.42, cy - tr * 0.42 - 2 * s, cx + tr * 0.42, cy + tr * 0.42 - 2 * s],
                 fill=(61, 140, 81, 255))
    
    # Woody core trunk
    draw.circle((cx, cy), 2.2 * s, fill=(115, 78, 48, 255), outline=(55, 36, 20, 255), width=int(0.8 * s))
    
    return downsample(im, w, h)

def generate_rock():
    w, h = 24, 24
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    rr = 8.5 * s
    
    rock_pts = [
        (cx - rr, cy + 2 * s),
        (cx - rr * 0.7, cy - rr * 0.8),
        (cx + rr * 0.2, cy - rr),
        (cx + rr * 0.9, cy - rr * 0.4),
        (cx + rr, cy + rr * 0.6),
        (cx + rr * 0.2, cy + rr),
        (cx - rr * 0.6, cy + rr * 0.8),
    ]
    
    def shadow_fn(d, ox, oy, col):
        pts = [(p[0] + ox, p[1] + oy) for p in rock_pts]
        d.polygon(pts, fill=col)
    draw_shadow(im, shadow_fn, offset=(1.5, 2.5), blur=1.8, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Slate grey base (#4b5866)
    draw.polygon(rock_pts, fill=(65, 78, 92, 255), outline=(28, 36, 44, 255), width=int(1.2 * s))
    
    # Facet 1: Top Light Facet (#7f8c8d / #95a5a6)
    f1 = [(cx - rr * 0.7, cy - rr * 0.8), (cx + rr * 0.2, cy - rr), (cx + rr * 0.9, cy - rr * 0.4), (cx, cy - 1 * s)]
    draw.polygon(f1, fill=(135, 150, 165, 255))
    
    # Facet 2: Left Shadow Facet
    f2 = [(cx - rr, cy + 2 * s), (cx - rr * 0.7, cy - rr * 0.8), (cx, cy - 1 * s), (cx - rr * 0.6, cy + rr * 0.8)]
    draw.polygon(f2, fill=(82, 98, 115, 255))
    
    # Facet 3: Right Dark Facet
    f3 = [(cx, cy - 1 * s), (cx + rr * 0.9, cy - rr * 0.4), (cx + rr, cy + rr * 0.6), (cx + rr * 0.2, cy + rr)]
    draw.polygon(f3, fill=(50, 62, 74, 255))
    
    # Sharp facet lines
    draw.line([(cx, cy - 1 * s), (cx - rr * 0.7, cy - rr * 0.8)], fill=(180, 195, 210, 255), width=int(1 * s))
    draw.line([(cx, cy - 1 * s), (cx + rr * 0.9, cy - rr * 0.4)], fill=(180, 195, 210, 255), width=int(1 * s))
    draw.line([(cx, cy - 1 * s), (cx + rr * 0.2, cy + rr)], fill=(28, 36, 44, 255), width=int(1 * s))
    
    return downsample(im, w, h)

def generate_ocean_bg():
    w, h = 1920, 1080
    im = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    draw = ImageDraw.Draw(im)
    
    # Atmospheric dark oceanic gradient
    for y in range(h):
        t = y / h
        # Top: #091724 -> Mid: #132738 -> Bottom: #07121b
        if t < 0.5:
            t2 = t / 0.5
            r = int(9 * (1 - t2) + 19 * t2)
            g = int(23 * (1 - t2) + 39 * t2)
            b = int(36 * (1 - t2) + 56 * t2)
        else:
            t2 = (t - 0.5) / 0.5
            r = int(19 * (1 - t2) + 7 * t2)
            g = int(39 * (1 - t2) + 18 * t2)
            b = int(56 * (1 - t2) + 27 * t2)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    # Deep water current curves
    rng = random.Random(101)
    for i in range(24):
        base_y = rng.randint(0, h)
        alpha = rng.randint(15, 35)
        color = (127, 212, 255, alpha)
        pts = []
        for x in range(0, w + 40, 40):
            y = base_y + math.sin(x * 0.004 + i) * 35 + math.cos(x * 0.008 + i * 2) * 15
            pts.append((x, y))
        for j in range(len(pts) - 1):
            draw.line([pts[j], pts[j+1]], fill=color, width=2)
            
    # Vignette
    vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    v_draw = ImageDraw.Draw(vignette)
    v_draw.rectangle([0, 0, w, h], outline=(0, 0, 0, 180), width=120)
    vignette = vignette.filter(ImageFilter.GaussianBlur(80))
    im.alpha_composite(vignette)
    
    return im

def generate_wave_pattern():
    w, h = 256, 128
    im, s = get_canvas(w, h, scale=2)
    sw, sh = w * s, h * s
    draw = ImageDraw.Draw(im)
    
    # Seamless wave foam curves
    for row, y_base in enumerate([sh * 0.25, sh * 0.55, sh * 0.85]):
        alpha = 180 if row == 1 else 130
        col = (140, 210, 255, alpha)
        pts = []
        for x in range(0, sw + 10, 6 * s):
            y = y_base + math.sin(x * (2 * math.pi / sw) * 2) * (8 * s) + math.cos(x * (2 * math.pi / sw) * 4) * (3 * s)
            pts.append((x, y))
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i+1]], fill=col, width=int(2 * s))
            
    return downsample(im, w, h)

def generate_land_bg():
    w, h = 512, 512
    im = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    draw = ImageDraw.Draw(im)
    
    # Base dark mossy earth gradient
    for y in range(h):
        t = y / h
        r = int(28 * (1 - t) + 20 * t)
        g = int(72 * (1 - t) + 52 * t)
        b = int(40 * (1 - t) + 30 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    # Grass tuft noise & patterns
    rng = random.Random(77)
    for _ in range(800):
        gx = rng.randint(0, w - 1)
        gy = rng.randint(0, h - 1)
        gl = rng.randint(3, 7)
        c = rng.choice([(38, 98, 54, 255), (48, 122, 68, 255), (20, 52, 28, 255)])
        draw.line([(gx, gy), (gx + rng.randint(-2, 2), gy - gl)], fill=c, width=1)
        
    return im

# ----------------- 3. RESOURCES -----------------

def generate_fuel():
    w, h = 24, 24
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.rounded_rectangle([cx - 7 * s + ox, cy - 8 * s + oy, cx + 7 * s + ox, cy + 9 * s + oy], radius=3 * s, fill=col)
    draw_shadow(im, shadow_fn, offset=(1.2, 2.0), blur=1.6, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Jerrycan Body (Vibrant Orange #e67e22)
    draw.rounded_rectangle([cx - 7.5 * s, cy - 6 * s, cx + 7.5 * s, cy + 9.5 * s], radius=2.8 * s,
                           fill=(230, 126, 34, 255), outline=(150, 60, 5, 255), width=int(1.4 * s))
    
    # Jerrycan Handle
    draw.rounded_rectangle([cx - 5.5 * s, cy - 10 * s, cx + 5.5 * s, cy - 5 * s], radius=1.8 * s,
                           fill=(200, 95, 15, 255), outline=(150, 60, 5, 255), width=int(1.2 * s))
    draw.rectangle([cx - 3.2 * s, cy - 8.2 * s, cx + 3.2 * s, cy - 6 * s], fill=(0, 0, 0, 0))
    
    # Cap on top-left
    draw.rounded_rectangle([cx - 7 * s, cy - 10.5 * s, cx - 2.8 * s, cy - 6.5 * s], radius=1.2 * s,
                           fill=(52, 73, 94, 255), outline=(20, 30, 42, 255), width=int(1 * s))
    
    # X indent lines on side
    draw.line([(cx - 4.5 * s, cy - 3 * s), (cx + 4.5 * s, cy + 6.5 * s)], fill=(185, 80, 10, 255), width=int(1.4 * s))
    draw.line([(cx + 4.5 * s, cy - 3 * s), (cx - 4.5 * s, cy + 6.5 * s)], fill=(185, 80, 10, 255), width=int(1.4 * s))
    
    # Left edge highlight
    draw.line([(cx - 6 * s, cy - 4 * s), (cx - 6 * s, cy + 7.5 * s)], fill=(255, 195, 120, 255), width=int(1 * s))
    
    return downsample(im, w, h)

def generate_wood():
    w, h = 24, 24
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - 9 * s + ox, cy - 6 * s + oy, cx + 9 * s + ox, cy + 8.5 * s + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(1.2, 2.0), blur=1.6, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    def draw_log(lx, ly):
        draw.rounded_rectangle([lx - 8.5 * s, ly - 3.5 * s, lx + 5.5 * s, ly + 3.5 * s], radius=1.8 * s,
                               fill=(115, 75, 42, 255), outline=(52, 32, 16, 255), width=int(1.2 * s))
        draw.ellipse([lx + 2 * s, ly - 3.5 * s, lx + 8.5 * s, ly + 3.5 * s],
                     fill=(215, 172, 128, 255), outline=(52, 32, 16, 255), width=int(1.2 * s))
        draw.ellipse([lx + 3.8 * s, ly - 2 * s, lx + 7 * s, ly + 2 * s],
                     fill=(195, 150, 105, 255), outline=(135, 95, 60, 255), width=int(0.8 * s))
        draw.circle((lx + 5.2 * s, ly), 1 * s, fill=(90, 55, 30, 255))
        
    # Stack: 2 logs on bottom, 1 on top
    draw_log(cx - 0.5 * s, cy + 4 * s)
    draw_log(cx + 0.5 * s, cy - 3.5 * s)
    
    # Twine rope binding
    draw.rectangle([cx - 3 * s, cy - 7.5 * s, cx - 0.8 * s, cy + 7.5 * s],
                   fill=(235, 205, 145, 255), outline=(140, 105, 55, 255), width=int(0.8 * s))
    
    return downsample(im, w, h)

def generate_food():
    w, h = 24, 24
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - 8.5 * s + ox, cy - 6 * s + oy, cx + 8.5 * s + ox, cy + 8.5 * s + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(1.2, 2.0), blur=1.6, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Red Can Body (#e74c3c)
    draw.rounded_rectangle([cx - 8.5 * s, cy - 3.5 * s, cx + 8.5 * s, cy + 7.5 * s], radius=2.8 * s,
                           fill=(231, 76, 60, 255), outline=(140, 30, 20, 255), width=int(1.4 * s))
    # Bottom silver trim
    draw.line([(cx - 7.5 * s, cy + 6.5 * s), (cx + 7.5 * s, cy + 6.5 * s)], fill=(189, 195, 199, 255), width=int(1.6 * s))
    
    # Fish silhouette on red label
    draw.ellipse([cx - 4 * s, cy - 1 * s, cx + 2.5 * s, cy + 3.5 * s], fill=(255, 255, 255, 240))
    draw.polygon([(cx + 1.5 * s, cy + 1.2 * s), (cx + 5 * s, cy - 1.5 * s), (cx + 5 * s, cy + 4 * s)], fill=(255, 255, 255, 240))
    
    # Silver Top Lid
    draw.ellipse([cx - 8.5 * s, cy - 8 * s, cx + 8.5 * s, cy - 1.5 * s],
                 fill=(225, 230, 235, 255), outline=(130, 140, 150, 255), width=int(1.2 * s))
    # Pull-ring
    draw.ellipse([cx - 3.2 * s, cy - 6 * s, cx + 3.2 * s, cy - 3.5 * s],
                 fill=(180, 190, 200, 255), outline=(90, 100, 110, 255), width=int(1 * s))
    draw.ellipse([cx - 1.5 * s, cy - 5.2 * s, cx + 1.5 * s, cy - 4.2 * s], fill=(225, 230, 235, 255))
    
    return downsample(im, w, h)

def generate_medicine():
    w, h = 24, 24
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.rounded_rectangle([cx - 8.5 * s + ox, cy - 7 * s + oy, cx + 8.5 * s + ox, cy + 8.5 * s + oy], radius=3 * s, fill=col)
    draw_shadow(im, shadow_fn, offset=(1.2, 2.0), blur=1.6, opacity=120, scale=s)
    
    draw = ImageDraw.Draw(im)
    # White Medkit Case (#f5f7fa)
    draw.rounded_rectangle([cx - 8.5 * s, cy - 5.5 * s, cx + 8.5 * s, cy + 8 * s], radius=2.8 * s,
                           fill=(245, 248, 250, 255), outline=(145, 160, 175, 255), width=int(1.4 * s))
    
    # Top Handle (Emerald Green #2ecc71)
    draw.rounded_rectangle([cx - 4.5 * s, cy - 9 * s, cx + 4.5 * s, cy - 4.5 * s], radius=1.8 * s,
                           fill=(46, 204, 113, 255), outline=(25, 130, 68, 255), width=int(1.2 * s))
    draw.rectangle([cx - 2.5 * s, cy - 7.5 * s, cx + 2.5 * s, cy - 5.5 * s], fill=(0, 0, 0, 0))
    
    # Emerald Green Medical Cross
    cw, cl = 2.5 * s, 6 * s
    draw.rectangle([cx - cw, cy - cl + 1.2 * s, cx + cw, cy + cl + 1.2 * s], fill=(46, 204, 113, 255))
    draw.rectangle([cx - cl, cy - cw + 1.2 * s, cx + cl, cy + cw + 1.2 * s], fill=(46, 204, 113, 255))
    draw.rectangle([cx - cw, cy - cl + 1.2 * s, cx + cw, cy + cl + 1.2 * s], outline=(25, 130, 68, 255), width=int(0.8 * s))
    draw.rectangle([cx - cl, cy - cw + 1.2 * s, cx + cl, cy + cw + 1.2 * s], outline=(25, 130, 68, 255), width=int(0.8 * s))
    
    # Side Latches
    draw.rectangle([cx - 8.8 * s, cy - 0.5 * s, cx - 7.2 * s, cy + 3 * s], fill=(120, 140, 160, 255))
    draw.rectangle([cx + 7.2 * s, cy - 0.5 * s, cx + 8.8 * s, cy + 3 * s], fill=(120, 140, 160, 255))
    
    return downsample(im, w, h)

# ----------------- 4. UI ICONS -----------------

def generate_icon_sail():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Hull
    hull_pts = [(cx - 11 * s, cy + 6 * s), (cx + 11 * s, cy + 6 * s), (cx + 7 * s, cy + 11 * s), (cx - 7 * s, cy + 11 * s)]
    draw.polygon(hull_pts, fill=(44, 62, 80, 255), outline=(20, 30, 42, 255), width=int(1.2 * s))
    draw.line([(cx - 9 * s, cy + 7 * s), (cx + 9 * s, cy + 7 * s)], fill=(230, 126, 34, 255), width=int(1.5 * s))
    
    # Mast
    draw.line([(cx - 1 * s, cy - 12 * s), (cx - 1 * s, cy + 6 * s)], fill=(189, 195, 199, 255), width=int(1.6 * s))
    
    # Main Sail (billowing triangle)
    main_sail = [(cx, cy - 11 * s), (cx + 9 * s, cy + 3 * s), (cx, cy + 3 * s)]
    draw.polygon(main_sail, fill=(245, 250, 255, 255), outline=(140, 160, 180, 255), width=int(1.2 * s))
    
    # Jib / Fore Sail
    jib_sail = [(cx - 2 * s, cy - 9 * s), (cx - 9 * s, cy + 3 * s), (cx - 2 * s, cy + 3 * s)]
    draw.polygon(jib_sail, fill=(210, 225, 240, 255), outline=(140, 160, 180, 255), width=int(1.2 * s))
    
    # Wave under boat
    draw.arc([cx - 12 * s, cy + 9 * s, cx + 12 * s, cy + 14 * s], start=0, end=180, fill=(127, 212, 255, 255), width=int(1.5 * s))
    
    return downsample(im, w, h)

def generate_icon_fish():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Curved fish leaping upwards
    fish_body = [(cx - 9 * s, cy + 4 * s), (cx - 4 * s, cy - 7 * s), (cx + 6 * s, cy - 8 * s),
                 (cx + 10 * s, cy - 2 * s), (cx + 5 * s, cy + 6 * s), (cx - 3 * s, cy + 8 * s)]
    draw.polygon(fish_body, fill=(52, 152, 219, 255), outline=(24, 44, 66, 255), width=int(1.4 * s))
    
    # Fish belly
    belly = [(cx - 7 * s, cy + 5 * s), (cx + 3 * s, cy + 6 * s), (cx + 8 * s, cy + 1 * s), (cx - 2 * s, cy + 7.5 * s)]
    draw.polygon(belly, fill=(230, 242, 255, 255))
    
    # Tail fin
    tail = [(cx - 8 * s, cy + 4 * s), (cx - 13 * s, cy + 2 * s), (cx - 12 * s, cy + 9 * s)]
    draw.polygon(tail, fill=(41, 128, 185, 255), outline=(24, 44, 66, 255), width=int(1.2 * s))
    
    # Eye & Gill
    draw.circle((cx + 6 * s, cy - 4 * s), 1.2 * s, fill=(255, 255, 255, 255))
    draw.circle((cx + 6.5 * s, cy - 4 * s), 0.6 * s, fill=(0, 0, 0, 255))
    
    # Fishing Hook
    draw.arc([cx - 2 * s, cy - 12 * s, cx + 8 * s, cy - 2 * s], start=220, end=90, fill=(241, 196, 15, 255), width=int(1.5 * s))
    
    return downsample(im, w, h)

def generate_icon_upgrade():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Glowing Double Upward Chevrons (Emerald Green #2ecc71 & Gold #f1c40f)
    p1 = [(cx, cy - 11 * s), (cx + 10 * s, cy - 2 * s), (cx + 6.5 * s, cy + 0.5 * s),
          (cx, cy - 5.5 * s), (cx - 6.5 * s, cy + 0.5 * s), (cx - 10 * s, cy - 2 * s)]
    draw.polygon(p1, fill=(46, 204, 113, 255), outline=(20, 110, 55, 255), width=int(1.4 * s))
    
    p2 = [(cx, cy - 2 * s), (cx + 10 * s, cy + 7 * s), (cx + 6.5 * s, cy + 9.5 * s),
          (cx, cy + 3.5 * s), (cx - 6.5 * s, cy + 9.5 * s), (cx - 10 * s, cy + 7 * s)]
    draw.polygon(p2, fill=(241, 196, 15, 255), outline=(150, 115, 10, 255), width=int(1.4 * s))
    
    return downsample(im, w, h)

def generate_icon_inventory():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Tactical Backpack Silhouette (#34495e)
    draw.rounded_rectangle([cx - 9 * s, cy - 7 * s, cx + 9 * s, cy + 11 * s], radius=3 * s,
                           fill=(44, 62, 80, 255), outline=(20, 30, 42, 255), width=int(1.4 * s))
    # Top flap
    draw.rounded_rectangle([cx - 8 * s, cy - 10 * s, cx + 8 * s, cy - 2 * s], radius=2.5 * s,
                           fill=(52, 73, 94, 255), outline=(20, 30, 42, 255), width=int(1.2 * s))
    # Front pocket
    draw.rounded_rectangle([cx - 6.5 * s, cy + 0.5 * s, cx + 6.5 * s, cy + 8.5 * s], radius=2 * s,
                           fill=(36, 50, 66, 255), outline=(20, 30, 42, 255), width=int(1 * s))
    # Orange Straps & Buckles
    draw.line([(cx - 4.5 * s, cy - 10 * s), (cx - 4.5 * s, cy + 8.5 * s)], fill=(230, 126, 34, 255), width=int(1.5 * s))
    draw.line([(cx + 4.5 * s, cy - 10 * s), (cx + 4.5 * s, cy + 8.5 * s)], fill=(230, 126, 34, 255), width=int(1.5 * s))
    draw.rectangle([cx - 5.5 * s, cy - 2 * s, cx - 3.5 * s, cy], fill=(241, 196, 15, 255))
    draw.rectangle([cx + 3.5 * s, cy - 2 * s, cx + 5.5 * s, cy], fill=(241, 196, 15, 255))
    
    return downsample(im, w, h)

def generate_icon_explore():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Outer Compass Ring (#2c3e50 / Gold #f1c40f)
    draw.ellipse([cx - 12 * s, cy - 12 * s, cx + 12 * s, cy + 12 * s],
                 fill=(24, 38, 54, 255), outline=(241, 196, 15, 255), width=int(1.6 * s))
    draw.ellipse([cx - 9.5 * s, cy - 9.5 * s, cx + 9.5 * s, cy + 9.5 * s],
                 outline=(75, 95, 115, 255), width=int(0.8 * s))
    
    # Compass Rose Needle (North = Red/Orange #e67e22, South = Silver/White)
    north_needle = [(cx, cy - 9.5 * s), (cx + 3.2 * s, cy), (cx, cy - 1 * s)]
    draw.polygon(north_needle, fill=(231, 76, 60, 255))
    north_needle_l = [(cx, cy - 9.5 * s), (cx - 3.2 * s, cy), (cx, cy - 1 * s)]
    draw.polygon(north_needle_l, fill=(192, 57, 43, 255))
    
    south_needle = [(cx, cy + 9.5 * s), (cx + 3.2 * s, cy), (cx, cy + 1 * s)]
    draw.polygon(south_needle, fill=(235, 240, 245, 255))
    south_needle_l = [(cx, cy + 9.5 * s), (cx - 3.2 * s, cy), (cx, cy + 1 * s)]
    draw.polygon(south_needle_l, fill=(180, 190, 200, 255))
    
    # Center Pivot
    draw.circle((cx, cy), 2 * s, fill=(241, 196, 15, 255), outline=(40, 30, 10, 255), width=int(0.8 * s))
    
    return downsample(im, w, h)

def generate_icon_attack():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Crossed Combat Swords / Machetes
    def draw_sword(angle):
        rad = math.radians(angle)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        
        blade = [(-1.5*s, -12*s), (1.5*s, -12*s), (2*s, 3*s), (-2*s, 3*s)]
        guard = [(-4.5*s, 3*s), (4.5*s, 3*s), (4.5*s, 5*s), (-4.5*s, 5*s)]
        handle = [(-1.2*s, 5*s), (1.2*s, 5*s), (1.2*s, 11*s), (-1.2*s, 11*s)]
        pommel = [(-2.2*s, 11*s), (2.2*s, 11*s), (2.2*s, 13*s), (-2.2*s, 13*s)]
        
        def rot(pts):
            return [(cx + p[0]*cos_a - p[1]*sin_a, cy + p[0]*sin_a + p[1]*cos_a) for p in pts]
            
        draw.polygon(rot(blade), fill=(235, 240, 245, 255), outline=(120, 140, 160, 255), width=int(1*s))
        draw.polygon(rot(guard), fill=(241, 196, 15, 255), outline=(140, 100, 10, 255), width=int(0.8*s))
        draw.polygon(rot(handle), fill=(180, 80, 20, 255))
        draw.polygon(rot(pommel), fill=(241, 196, 15, 255))
        
    draw_sword(-40)
    draw_sword(40)
    
    return downsample(im, w, h)

def generate_icon_collect():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Open Grasping Hand reaching for glowing item
    palm = [(cx - 7 * s, cy + 2 * s), (cx + 7 * s, cy + 2 * s), (cx + 5 * s, cy + 10 * s), (cx - 5 * s, cy + 10 * s)]
    draw.polygon(palm, fill=(230, 180, 140, 255), outline=(140, 95, 60, 255), width=int(1.2 * s))
    
    for fx in [-5 * s, -1.8 * s, 1.8 * s, 5 * s]:
        draw.rounded_rectangle([cx + fx - 1.2 * s, cy - 6 * s, cx + fx + 1.2 * s, cy + 3 * s], radius=1.2 * s,
                               fill=(240, 195, 155, 255), outline=(140, 95, 60, 255), width=int(1 * s))
        
    draw.polygon([(cx - 7 * s, cy + 3 * s), (cx - 10 * s, cy - 1 * s), (cx - 7 * s, cy - 2 * s)],
                 fill=(240, 195, 155, 255), outline=(140, 95, 60, 255))
    
    # Glowing Diamond Sparkle
    draw.polygon([(cx, cy - 12 * s), (cx + 4.5 * s, cy - 8 * s), (cx, cy - 4 * s), (cx - 4.5 * s, cy - 8 * s)],
                 fill=(46, 204, 113, 255), outline=(20, 120, 60, 255), width=int(1 * s))
    
    return downsample(im, w, h)

def generate_icon_back():
    w, h = 32, 32
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    draw = ImageDraw.Draw(im)
    
    # Curved Return U-Turn Arrow pointing left/back
    draw.arc([cx - 6 * s, cy - 9 * s, cx + 11 * s, cy + 8 * s], start=270, end=90, fill=(127, 212, 255, 255), width=int(3.2 * s))
    draw.line([(cx - 4 * s, cy - 9 * s), (cx + 2.5 * s, cy - 9 * s)], fill=(127, 212, 255, 255), width=int(3.2 * s))
    draw.line([(cx - 4 * s, cy + 8 * s), (cx + 2.5 * s, cy + 8 * s)], fill=(127, 212, 255, 255), width=int(3.2 * s))
    
    head = [(cx - 11 * s, cy + 8 * s), (cx - 4 * s, cy + 1 * s), (cx - 4 * s, cy + 15 * s)]
    draw.polygon(head, fill=(230, 126, 34, 255), outline=(160, 70, 10, 255), width=int(1.2 * s))
    
    return downsample(im, w, h)

def generate_icon_hp():
    w, h = 24, 24
    im, s = get_canvas(w, h, scale=8)
    cx, cy = (w * s) / 2, (h * s) / 2
    
    def shadow_fn(d, ox, oy, col):
        d.ellipse([cx - 8 * s + ox, cy - 8 * s + oy, cx + 8 * s + ox, cy + 8 * s + oy], fill=col)
    draw_shadow(im, shadow_fn, offset=(1.2, 1.8), blur=1.5, opacity=110, scale=s)
    
    draw = ImageDraw.Draw(im)
    # Heart Silhouette (#e74c3c)
    hr = 4.8 * s
    draw.circle((cx - 3.8 * s, cy - 3 * s), hr, fill=(231, 76, 60, 255))
    draw.circle((cx + 3.8 * s, cy - 3 * s), hr, fill=(231, 76, 60, 255))
    draw.polygon([(cx - 8.2 * s, cy - 1.2 * s), (cx + 8.2 * s, cy - 1.2 * s), (cx, cy + 9 * s)], fill=(231, 76, 60, 255))
    
    draw.arc([cx - 8.6 * s, cy - 7.8 * s, cx + 1 * s, cy + 1.8 * s], start=140, end=360, fill=(140, 25, 18, 255), width=int(1.2 * s))
    draw.arc([cx - 1 * s, cy - 7.8 * s, cx + 8.6 * s, cy + 1.8 * s], start=180, end=40, fill=(140, 25, 18, 255), width=int(1.2 * s))
    draw.line([(cx - 8.2 * s, cy - 1.2 * s), (cx, cy + 9 * s)], fill=(140, 25, 18, 255), width=int(1.2 * s))
    draw.line([(cx + 8.2 * s, cy - 1.2 * s), (cx, cy + 9 * s)], fill=(140, 25, 18, 255), width=int(1.2 * s))
    
    # Inner White Cross
    cw, cl = 1.8 * s, 4.2 * s
    draw.rectangle([cx - cw, cy - cl, cx + cw, cy + cl], fill=(255, 255, 255, 255))
    draw.rectangle([cx - cl, cy - cw, cx + cl, cy + cw], fill=(255, 255, 255, 255))
    
    return downsample(im, w, h)

# ----------------- 5. BRANDING & LOGO -----------------

def generate_logo_final():
    w, h = 512, 256
    scale = 2
    sw, sh = w * scale, h * scale
    im = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    cx, cy = sw / 2, sh / 2
    
    # Ambient dark blue & warm orange glow
    glow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([cx - 220 * scale, cy - 85 * scale, cx + 220 * scale, cy + 85 * scale], fill=(15, 38, 62, 200))
    gdraw.ellipse([cx - 130 * scale, cy - 50 * scale, cx + 130 * scale, cy + 50 * scale], fill=(230, 126, 34, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(28 * scale))
    im.alpha_composite(glow)
    
    draw = ImageDraw.Draw(im)
    
    # 8-point Compass Rose behind text
    def draw_compass_rose(cx, cy, r_out, r_in):
        for i in range(8):
            a1 = i * math.pi / 4
            a2 = (i + 0.5) * math.pi / 4
            a3 = (i + 1) * math.pi / 4
            p1 = (cx, cy)
            p2 = (cx + math.cos(a1) * r_out, cy + math.sin(a1) * r_out)
            p3 = (cx + math.cos(a2) * r_in, cy + math.sin(a2) * r_in)
            p4 = (cx + math.cos(a3) * r_out, cy + math.sin(a3) * r_out)
            draw.polygon([p1, p2, p3], fill=(241, 196, 15, 170))
            draw.polygon([p1, p3, p4], fill=(180, 135, 10, 170))
            
    draw_compass_rose(cx, cy - 22 * scale, 88 * scale, 30 * scale)
    
    # Compass Outer Ring
    draw.ellipse([cx - 42 * scale, cy - 64 * scale, cx + 42 * scale, cy + 20 * scale],
                 outline=(241, 196, 15, 230), width=int(3 * scale))
    
    # Ribbon Banner
    banner_y = cy + 32 * scale
    banner_w = 200 * scale
    banner_h = 28 * scale
    
    # Banner tails
    draw.polygon([(cx - banner_w - 22 * scale, banner_y + 12 * scale),
                  (cx - banner_w + 10 * scale, banner_y - 8 * scale),
                  (cx - banner_w + 10 * scale, banner_y + banner_h),
                  (cx - banner_w - 22 * scale, banner_y + banner_h + 12 * scale),
                  (cx - banner_w - 12 * scale, banner_y + banner_h / 2 + 6 * scale)],
                 fill=(16, 28, 42, 255), outline=(180, 140, 20, 255), width=int(2 * scale))
    
    draw.polygon([(cx + banner_w + 22 * scale, banner_y + 12 * scale),
                  (cx + banner_w - 10 * scale, banner_y - 8 * scale),
                  (cx + banner_w - 10 * scale, banner_y + banner_h),
                  (cx + banner_w + 22 * scale, banner_y + banner_h + 12 * scale),
                  (cx + banner_w + 12 * scale, banner_y + banner_h / 2 + 6 * scale)],
                 fill=(16, 28, 42, 255), outline=(180, 140, 20, 255), width=int(2 * scale))
    
    # Banner Body
    draw.rounded_rectangle([cx - banner_w, banner_y - 12 * scale, cx + banner_w, banner_y + banner_h],
                           radius=5 * scale, fill=(14, 26, 38, 255), outline=(241, 196, 15, 255), width=int(2.5 * scale))
    
    try:
        font_sub = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(13 * scale))
        font_main = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', int(48 * scale))
    except:
        font_sub = ImageFont.load_default()
        font_main = ImageFont.load_default()
        
    sub_text = "⚓ SURVIVAL ROGUELIKE ⚓"
    bbox_sub = font_sub.getbbox(sub_text)
    sub_w = bbox_sub[2] - bbox_sub[0]
    draw.text((cx - sub_w / 2, banner_y - 2 * scale), sub_text, font=font_sub, fill=(241, 196, 15, 255))
    
    title_text = "LAST HARBOR"
    bbox = font_main.getbbox(title_text)
    tw = bbox[2] - bbox[0]
    tx = cx - tw / 2
    ty = cy - 42 * scale
    
    # 3D Text shadows & outlines
    for ox, oy in [(-3, -3), (3, -3), (-3, 3), (3, 3), (0, 4*scale), (0, 6*scale)]:
        draw.text((tx + ox, ty + oy), title_text, font=font_main, fill=(6, 14, 22, 255))
        
    draw.text((tx, ty + 2 * scale), title_text, font=font_main, fill=(185, 135, 12, 255))
    draw.text((tx, ty), title_text, font=font_main, fill=(255, 235, 135, 255))
    
    # Filigree divider lines
    draw.line([(cx - 165 * scale, ty - 6 * scale), (cx - 20 * scale, ty - 6 * scale)], fill=(241, 196, 15, 220), width=int(2 * scale))
    draw.line([(cx + 20 * scale, ty - 6 * scale), (cx + 165 * scale, ty - 6 * scale)], fill=(241, 196, 15, 220), width=int(2 * scale))
    draw.polygon([(cx - 5 * scale, ty - 9 * scale), (cx + 5 * scale, ty - 9 * scale), (cx, ty - 3 * scale)], fill=(241, 196, 15, 255))
    
    return downsample(im, w, h)

def generate_appicon_final():
    w, h = 512, 512
    scale = 2
    sw, sh = w * scale, h * scale
    im = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    
    bg = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    
    # Sky & Ocean deep background
    for y in range(sh):
        t = y / sh
        if t < 0.44:
            r = int(10 * (1 - t/0.44) + 16 * (t/0.44))
            g = int(18 * (1 - t/0.44) + 32 * (t/0.44))
            b = int(28 * (1 - t/0.44) + 50 * (t/0.44))
        else:
            t2 = (t - 0.44) / 0.56
            r = int(16 * (1 - t2) + 6 * t2)
            g = int(32 * (1 - t2) + 16 * t2)
            b = int(50 * (1 - t2) + 28 * t2)
        bg_draw.line([(0, y), (sw, y)], fill=(r, g, b, 255))
        
    icon_radius = 110 * scale
    mask = Image.new("L", (sw, sh), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, sw, sh], radius=icon_radius, fill=255)
    
    # Moon & Atmospheric Glow
    moon_x, moon_y, moon_r = sw * 0.74, sh * 0.2, 44 * scale
    moon_glow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    mg_draw = ImageDraw.Draw(moon_glow)
    mg_draw.ellipse([moon_x - moon_r * 2.2, moon_y - moon_r * 2.2, moon_x + moon_r * 2.2, moon_y + moon_r * 2.2],
                    fill=(190, 225, 255, 60))
    moon_glow = moon_glow.filter(ImageFilter.GaussianBlur(24 * scale))
    bg.alpha_composite(moon_glow)
    
    bg_draw.ellipse([moon_x - moon_r, moon_y - moon_r, moon_x + moon_r, moon_y + moon_r], fill=(245, 250, 255, 235))
    
    # Moonlit Clouds
    for cy_pos, alpha, sz in [(sh * 0.16, 110, 40), (sh * 0.26, 150, 55), (sh * 0.36, 190, 70)]:
        clouds = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        cld_draw = ImageDraw.Draw(clouds)
        for cx_pos in range(-50 * scale, sw + 100 * scale, 70 * scale):
            cld_draw.ellipse([cx_pos, cy_pos, cx_pos + sz * 2 * scale, cy_pos + sz * scale], fill=(14, 26, 38, alpha))
        clouds = clouds.filter(ImageFilter.GaussianBlur(14 * scale))
        bg.alpha_composite(clouds)
        
    # Ocean Waves with smooth solid polygons & foam crests
    horizon_y = sh * 0.44
    wave_configs = [
        (horizon_y, (16, 38, 58, 255), (60, 115, 155, 180), 10 * scale, 1.0),
        (horizon_y + 45 * scale, (12, 30, 48, 255), (80, 150, 195, 200), 16 * scale, 1.3),
        (horizon_y + 105 * scale, (8, 22, 36, 255), (100, 185, 225, 220), 22 * scale, 1.7),
        (horizon_y + 175 * scale, (5, 16, 26, 255), (125, 210, 255, 240), 26 * scale, 2.1),
    ]
    
    for base_y, wave_col, foam_col, wave_amp, freq in wave_configs:
        w_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        w_draw = ImageDraw.Draw(w_layer)
        pts = [(0, sh)]
        crest_pts = []
        for x in range(0, sw + 10, 4 * scale):
            y = base_y + math.sin(x * 0.007 * freq) * wave_amp + math.cos(x * 0.014 * freq) * (wave_amp * 0.35)
            pts.append((x, y))
            crest_pts.append((x, y))
        pts.append((sw, sh))
        w_draw.polygon(pts, fill=wave_col)
        for i in range(len(crest_pts) - 1):
            w_draw.line([crest_pts[i], crest_pts[i+1]], fill=foam_col, width=int(2.5 * scale))
        bg.alpha_composite(w_layer)
        
    # Boat in center on waves
    boat_x, boat_y = sw * 0.48, sh * 0.58
    
    # Warm lantern ambient light on water
    lantern_glow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    lg_draw = ImageDraw.Draw(lantern_glow)
    lg_draw.ellipse([boat_x - 130 * scale, boat_y - 80 * scale, boat_x + 130 * scale, boat_y + 100 * scale], fill=(243, 156, 18, 95))
    lg_draw.ellipse([boat_x - 65 * scale, boat_y - 40 * scale, boat_x + 65 * scale, boat_y + 60 * scale], fill=(255, 225, 110, 150))
    lantern_glow = lantern_glow.filter(ImageFilter.GaussianBlur(28 * scale))
    bg.alpha_composite(lantern_glow)
    
    boat_draw = ImageDraw.Draw(bg)
    hull_pts = [
        (boat_x - 72 * scale, boat_y - 12 * scale),
        (boat_x - 46 * scale, boat_y + 22 * scale),
        (boat_x + 62 * scale, boat_y + 20 * scale),
        (boat_x + 78 * scale, boat_y + 2 * scale),
        (boat_x + 68 * scale, boat_y - 6 * scale),
        (boat_x - 20 * scale, boat_y - 5 * scale),
    ]
    boat_draw.polygon(hull_pts, fill=(20, 32, 46, 255), outline=(10, 18, 28, 255), width=int(3 * scale))
    boat_draw.line([(boat_x - 56 * scale, boat_y + 12 * scale), (boat_x + 66 * scale, boat_y + 11 * scale)],
                   fill=(230, 126, 34, 255), width=int(3.2 * scale))
    
    # Wheelhouse
    cabin_pts = [
        (boat_x + 5 * scale, boat_y - 6 * scale),
        (boat_x + 5 * scale, boat_y - 32 * scale),
        (boat_x + 52 * scale, boat_y - 30 * scale),
        (boat_x + 54 * scale, boat_y - 6 * scale),
    ]
    boat_draw.polygon(cabin_pts, fill=(35, 52, 70, 255), outline=(14, 24, 36, 255), width=int(2.5 * scale))
    
    # Glowing Windows
    boat_draw.rectangle([boat_x + 12 * scale, boat_y - 26 * scale, boat_x + 26 * scale, boat_y - 14 * scale],
                        fill=(255, 235, 140, 255), outline=(180, 140, 30, 255), width=int(1.5 * scale))
    boat_draw.rectangle([boat_x + 32 * scale, boat_y - 25 * scale, boat_x + 45 * scale, boat_y - 14 * scale],
                        fill=(255, 235, 140, 255), outline=(180, 140, 30, 255), width=int(1.5 * scale))
    
    # Mast & Flag
    mast_top = (boat_x - 10 * scale, boat_y - 78 * scale)
    mast_base = (boat_x - 10 * scale, boat_y - 5 * scale)
    boat_draw.line([mast_base, mast_top], fill=(52, 68, 84, 255), width=int(3.5 * scale))
    
    flag_pts = [mast_top, (mast_top[0] + 30 * scale, mast_top[1] + 9 * scale), (mast_top[0], mast_top[1] + 18 * scale)]
    boat_draw.polygon(flag_pts, fill=(230, 126, 34, 255), outline=(175, 75, 10, 255), width=int(1.5 * scale))
    
    boat_draw.line([mast_top, (boat_x - 70 * scale, boat_y - 10 * scale)], fill=(120, 150, 180, 180), width=int(1.5 * scale))
    boat_draw.line([mast_top, (boat_x + 62 * scale, boat_y - 28 * scale)], fill=(120, 150, 180, 180), width=int(1.5 * scale))
    
    # Lantern
    lantern_pos = (boat_x - 28 * scale, boat_y - 36 * scale)
    boat_draw.line([(boat_x - 28 * scale, boat_y - 50 * scale), lantern_pos], fill=(100, 120, 140, 255), width=int(2 * scale))
    boat_draw.ellipse([lantern_pos[0] - 6.5 * scale, lantern_pos[1] - 6.5 * scale, lantern_pos[0] + 6.5 * scale, lantern_pos[1] + 8.5 * scale],
                      fill=(255, 240, 160, 255), outline=(230, 126, 34, 255), width=int(2 * scale))
    
    # Foreground rolling dark wave
    fg_wave = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    fg_draw = ImageDraw.Draw(fg_wave)
    fg_pts = [(0, sh)]
    for x in range(0, sw + 10, 4 * scale):
        y = sh * 0.73 + math.sin(x * 0.011) * (18 * scale) + math.cos(x * 0.02) * (8 * scale)
        fg_pts.append((x, y))
    fg_pts.append((sw, sh))
    fg_draw.polygon(fg_pts, fill=(4, 12, 20, 255))
    
    # Foam highlights on foreground wave
    for x in range(0, sw + 10, 4 * scale):
        y = sh * 0.73 + math.sin(x * 0.011) * (18 * scale) + math.cos(x * 0.02) * (8 * scale)
        fg_draw.line([(x, y), (x + 3 * scale, y)], fill=(140, 215, 255, 200), width=int(2 * scale))
    bg.alpha_composite(fg_wave)
    
    # Glassmorphic border
    border_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border_layer)
    b_draw.rounded_rectangle([2 * scale, 2 * scale, sw - 2 * scale, sh - 2 * scale],
                             radius=icon_radius, outline=(255, 255, 255, 45), width=int(4 * scale))
    b_draw.rounded_rectangle([6 * scale, 6 * scale, sw - 6 * scale, sh - 6 * scale],
                             radius=icon_radius - 4 * scale, outline=(230, 126, 34, 40), width=int(2 * scale))
    bg.alpha_composite(border_layer)
    
    final_icon = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    final_icon.paste(bg, (0, 0), mask=mask)
    
    return downsample(final_icon, w, h)

# ----------------- MAIN EXECUTION -----------------

def generate_all():
    print("Generating Character & Entity Assets...")
    generate_boat_lv1().save("assets/characters/boat_lv1.png")
    generate_boat_lv2().save("assets/characters/boat_lv2.png")
    generate_boat_lv3().save("assets/characters/boat_lv3.png")
    generate_player().save("assets/characters/player.png")
    generate_zombie_slow().save("assets/characters/zombie_slow.png")
    generate_zombie_fast().save("assets/characters/zombie_fast.png")
    generate_zombie_tank().save("assets/characters/zombie_tank.png")
    
    print("Generating Environment Assets...")
    generate_island().save("assets/environment/island.png")
    generate_tree().save("assets/environment/tree.png")
    generate_rock().save("assets/environment/rock.png")
    generate_ocean_bg().save("assets/environment/ocean_bg.png")
    generate_wave_pattern().save("assets/environment/wave_pattern.png")
    generate_land_bg().save("assets/environment/land_bg.png")
    
    print("Generating Resource Assets...")
    generate_fuel().save("assets/resources/fuel.png")
    generate_wood().save("assets/resources/wood.png")
    generate_food().save("assets/resources/food.png")
    generate_medicine().save("assets/resources/medicine.png")
    
    print("Generating UI Icons...")
    generate_icon_sail().save("assets/ui/icon_sail.png")
    generate_icon_fish().save("assets/ui/icon_fish.png")
    generate_icon_upgrade().save("assets/ui/icon_upgrade.png")
    generate_icon_inventory().save("assets/ui/icon_inventory.png")
    generate_icon_explore().save("assets/ui/icon_explore.png")
    generate_icon_attack().save("assets/ui/icon_attack.png")
    generate_icon_collect().save("assets/ui/icon_collect.png")
    generate_icon_back().save("assets/ui/icon_back.png")
    generate_fuel().save("assets/ui/icon_fuel.png")
    generate_wood().save("assets/ui/icon_wood.png")
    generate_food().save("assets/ui/icon_food.png")
    generate_medicine().save("assets/ui/icon_medicine.png")
    generate_icon_hp().save("assets/ui/icon_hp.png")
    
    print("Generating Branding & Logo Assets...")
    generate_logo_final().save("assets/branding/logo.png")
    generate_appicon_final().save("assets/branding/appicon.png")
    
    print("ALL ASSETS GENERATED SUCCESSFULLY!")

if __name__ == "__main__":
    generate_all()
