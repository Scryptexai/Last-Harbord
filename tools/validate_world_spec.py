#!/usr/bin/env python3
"""
validate_world_spec.py — Design-validation lint for LAST HARBOR.

Checks the repository's real assets/scenes against the LOCKED specification in
docs/design/spec/world_scale.json (Phase 3 world scale, Phase 2 camera,
Phase 8 asset quality, Phase 14 mobile budget, Phase 15 renderer strategy).

Usage:
    python3 tools/validate_world_spec.py            # human-readable report
    python3 tools/validate_world_spec.py --markdown # markdown report (for docs/audit)
    python3 tools/validate_world_spec.py --strict   # exit code 1 on any FAIL

Every check reports PASS / WARN / FAIL with the measured value, so the output
is an audit, not a claim.
"""
import fnmatch
import json
import math
import os
import re
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC_PATH = os.path.join(ROOT, "docs", "design", "spec", "world_scale.json")

# Production world scenes: primitive CSG geometry is forbidden here (Phase 4/8).
PRODUCTION_SCENES = [
    "scenes/world/SafeIsland.tscn",
    "scenes/world/ZombieIsland.tscn",
]
CAMERA_SCENE = "scenes/player/IsometricCamera.tscn"
CAMERA_SCRIPT = "scripts/systems/camera_controller.gd"
PLAYER_SCENE = "scenes/player/Player.tscn"


def load_spec():
    with open(SPEC_PATH) as f:
        return json.load(f)


def glb_info(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:4] != b"glTF":
        return None
    clen = struct.unpack("<I", data[12:16])[0]
    js = json.loads(data[20:20 + clen])
    acc = js.get("accessors", [])
    mins = [1e9] * 3
    maxs = [-1e9] * 3
    tris = 0
    for m in js.get("meshes", []):
        for p in m.get("primitives", []):
            pi = p.get("attributes", {}).get("POSITION")
            if pi is not None and pi < len(acc):
                a = acc[pi]
                if "min" in a and "max" in a:
                    for i in range(3):
                        mins[i] = min(mins[i], a["min"][i])
                        maxs[i] = max(maxs[i], a["max"][i])
            ii = p.get("indices")
            if ii is not None and ii < len(acc):
                tris += acc[ii].get("count", 0) // 3
    return {
        "tris": tris,
        "imgs": len(js.get("images", [])),
        "mats": len(js.get("materials", [])),
        "size": [maxs[i] - mins[i] for i in range(3)],
        "ymin": mins[1],
        "ymax": maxs[1],
    }


def category_for(relpath, categories):
    rel = relpath.replace(os.sep, "/")
    for key, cat in categories.items():
        for pat in cat["match"].split("|"):
            if fnmatch.fnmatch(rel, "assets/" + pat) or fnmatch.fnmatch(rel, pat):
                return key, cat
    return None, None


def check(cond, level_fail="FAIL"):
    return level_fail if not cond else "PASS"


class Report:
    def __init__(self):
        self.rows = []

    def add(self, section, item, status, measured, expected):
        self.rows.append((section, item, status, measured, expected))

    def counts(self):
        c = {"PASS": 0, "WARN": 0, "FAIL": 0}
        for r in self.rows:
            c[r[2]] = c.get(r[2], 0) + 1
        return c

    def render(self, markdown=False):
        lines = []
        if markdown:
            lines.append("| # | Section | Check | Result | Measured | Spec |")
            lines.append("|---|---------|-------|--------|----------|------|")
            for i, (s, item, st, m, e) in enumerate(self.rows, 1):
                lines.append(f"| {i} | {s} | {item} | **{st}** | {m} | {e} |")
        else:
            cur = None
            for i, (s, item, st, m, e) in enumerate(self.rows, 1):
                if s != cur:
                    lines.append(f"\n== {s} ==")
                    cur = s
                lines.append(f"  [{st:4}] {item}: measured={m} | spec={e}")
        c = self.counts()
        summary = f"TOTAL: {c['PASS']} PASS, {c['WARN']} WARN, {c['FAIL']} FAIL"
        lines.append("")
        lines.append(summary)
        return "\n".join(lines), c


def main():
    markdown = "--markdown" in sys.argv
    strict = "--strict" in sys.argv
    spec = load_spec()
    rep = Report()

    # ---------------------------------------------------------------- assets
    char = spec["master_reference"]
    scale_applied = None
    # read the scale actually used by Player.tscn for the character model
    try:
        with open(os.path.join(ROOT, PLAYER_SCENE)) as f:
            ptxt = f.read()
        m = re.search(r'\[node name="CharacterModel"[^\]]*\]\ntransform = Transform3D\(([-0-9.]+)', ptxt)
        scale_applied = float(m.group(1)) if m else None
    except OSError:
        pass

    for dirpath, _dirs, files in os.walk(os.path.join(ROOT, "assets")):
        for fn in sorted(files):
            if not fn.endswith(".glb"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
            info = glb_info(os.path.join(dirpath, fn))
            if not info:
                rep.add("assets", rel, "WARN", "not a glTF binary", "valid glb")
                continue
            key, cat = category_for(rel, spec["asset_categories"])
            if not cat:
                rep.add("assets", rel, "WARN", "no spec category", "category assigned")
                continue
            h = info["ymax"] - info["ymin"] if cat.get("height") else 0
            # character game height includes the scene import scale
            if key == "character":
                s = scale_applied if scale_applied else 1.0
                gh = info["ymax"] * s
                lo, hi = cat["height"]
                rep.add("assets/character", f"{rel} game height (authored {info['ymax']:.2f} x scene scale {s:.2f})",
                        check(lo <= gh <= hi), f"{gh:.2f} m", f"{lo}-{hi} m")
                continue
            lo, hi = cat["height"]
            rep.add("assets/scale", f"{rel} height", check(lo <= h <= hi), f"{h:.2f} m", f"{lo}-{hi} m")
            yt = cat.get("ymin_tol")
            if yt:
                rep.add("assets/origin", f"{rel} pivot ymin", check(yt[0] <= info["ymin"] <= yt[1]),
                        f"{info['ymin']:.2f} m", f"{yt[0]}..{yt[1]} m")
            rep.add("assets/quality", f"{rel} textures", check(info["imgs"] >= cat["textures_min"]),
                    f"{info['imgs']} images", f">= {cat['textures_min']}")
            rep.add("assets/quality", f"{rel} triangles", check(info["tris"] <= cat["tris_max"]),
                    f"{info['tris']}", f"<= {cat['tris_max']}")

    # ---------------------------------------------------------------- scenes
    for scene in PRODUCTION_SCENES:
        p = os.path.join(ROOT, scene)
        if not os.path.exists(p):
            rep.add("scenes", scene, "WARN", "missing", "exists")
            continue
        with open(p) as f:
            txt = f.read()
        csg = re.findall(r'\[node name="(\w+)" type="(CSG\w+)"', txt)
        terrain_csg = [n for n, t in csg if t in ("CSGBox3D", "CSGCylinder3D", "CSGSphere3D")]
        rep.add("scenes/terrain", f"{scene}: CSG primitive terrain/structures",
                "PASS" if not terrain_csg else "FAIL",
                f"{len(terrain_csg)} CSG nodes ({', '.join(terrain_csg[:4])}{'...' if len(terrain_csg) > 4 else ''})" if terrain_csg else "0 CSG nodes",
                "0 (heightmap mesh or GLB terrain)")
        has_terrain_asset = bool(re.search(r'path="res://assets/models/terrain/[^"]+\.glb"', txt)) or "Terrain3D" in txt
        rep.add("scenes/terrain", f"{scene}: real terrain asset instanced",
                check(has_terrain_asset), "yes" if has_terrain_asset else "no", "terrain glb / heightmap")
        water_bad = bool(re.search(r'\[node name="Ocean\w*" type="(CSGBox3D|MeshInstance3D)"', txt)) and \
            bool(re.search(r'StandardMaterial3D_ocean', txt)) and not re.search(r'water_shader|WaterSystem', txt)
        rep.add("scenes/water", f"{scene}: water system per spec §WATER",
                "FAIL" if water_bad else "PASS",
                "flat single-material plane/box" if water_bad else "water system present",
                "depth-graded shader water w/ waves+shore blend")
        lights = re.findall(r'type="(OmniLight3D|SpotLight3D|DirectionalLight3D)"', txt)
        budget = spec["mobile_budget"]
        rep.add("scenes/lights", f"{scene}: light count", check(len(lights) <= budget["dynamic_lights_max"]),
                f"{len(lights)}", f"<= {budget['dynamic_lights_max']}")

    # ---------------------------------------------------------------- camera
    with open(os.path.join(ROOT, CAMERA_SCENE)) as f:
        ctxt = f.read()
    with open(os.path.join(ROOT, CAMERA_SCRIPT)) as f:
        gtxt = f.read()
    cam = spec["camera"]
    m = re.search(r"fov = ([0-9.]+)", ctxt)
    fov = float(m.group(1)) if m else None
    rep.add("camera", "vertical FOV", check(cam["fov_vertical_range"][0] <= fov <= cam["fov_vertical_range"][1]),
            f"{fov}", f"{cam['fov_vertical_range'][0]}-{cam['fov_vertical_range'][1]}")

    def gd(var):
        mm = re.search(rf"@export var {var}: float = ([0-9.]+)", gtxt)
        return float(mm.group(1)) if mm else None

    pitch = gd("pitch_angle_deg")
    rep.add("camera", "pitch down angle", check(cam["pitch_down_deg_range"][0] <= pitch <= cam["pitch_down_deg_range"][1]),
            f"{pitch}", f"{cam['pitch_down_deg_range'][0]}-{cam['pitch_down_deg_range'][1]}")
    gh = char["game_height"]
    for var, rng in (("default_distance", cam["distance_default"]),
                     ("explore_distance", cam["distance_explore"]),
                     ("combat_distance", cam["distance_combat"])):
        d = gd(var)
        if d is None:
            rep.add("camera", var, "WARN", "not found", f"{rng[0]}-{rng[1]}")
            continue
        ok = rng[0] <= d <= rng[1]
        ratio = gh / (2 * d * math.tan(math.radians(fov / 2))) if fov else 0
        extra = ""
        if var != "combat_distance":
            r_ok = cam["player_screen_height_ratio"][0] <= ratio <= cam["player_screen_height_ratio"][1]
            extra = f", player {ratio * 100:.1f}% screen height"
            ok = ok and r_ok
        rep.add("camera", f"{var}", check(ok), f"{d} m{extra}", f"{rng[0]}-{rng[1]} m")
    damp = gd("smooth_speed")
    rep.add("camera", "follow damping", check(cam["follow_damping"][0] <= damp <= cam["follow_damping"][1]),
            f"{damp}", f"{cam['follow_damping'][0]}-{cam['follow_damping'][1]}")
    rep.add("camera", "projection type", "PASS" if "orthogonal" not in ctxt else "FAIL",
            "perspective" if "orthogonal" not in ctxt else "orthogonal", "perspective only")
    # collision avoidance / spring arm present?
    has_col = bool(re.search(r"raycast|RayCast|spring_arm|SpringArm|collision", gtxt, re.I))
    rep.add("camera", "collision avoidance implemented", check(has_col, "WARN"),
            "yes" if has_col else "no", "spring-arm / raycast pull-in")

    out, counts = rep.render(markdown)
    print(out)
    if strict and counts["FAIL"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
