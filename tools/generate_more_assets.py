import math
import numpy as np
import trimesh

OUT_BASE = "assets/environment"

def color_mesh(mesh, color_rgb):
    rgba = [color_rgb[0], color_rgb[1], color_rgb[2], 255]
    mesh.visual.vertex_colors = np.array([rgba] * len(mesh.vertices), dtype=np.uint8)
    return mesh

def save_glb(mesh, path):
    data = mesh.export(file_type="glb")
    with open(path, "wb") as f:
        f.write(data)

def make_small_survivor_house():
    parts = []
    base = trimesh.creation.box(extents=(3.0, 2.0, 3.0))
    base.apply_translation([0, 1.0, 0])
    color_mesh(base, [135, 102, 68])
    parts.append(base)
    roof = trimesh.creation.cone(radius=2.5, height=1.5)
    roof.apply_translation([0, 2.75, 0])
    color_mesh(roof, [100, 80, 60])
    parts.append(roof)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/buildings/small_survivor_house.glb")

def make_wooden_platform():
    parts = []
    plat = trimesh.creation.box(extents=(2.0, 0.1, 2.0))
    plat.apply_translation([0, 0.5, 0])
    color_mesh(plat, [120, 95, 70])
    parts.append(plat)
    for x in [-0.9, 0.9]:
        for z in [-0.9, 0.9]:
            post = trimesh.creation.cylinder(radius=0.08, height=0.5)
            post.apply_translation([x, 0.25, z])
            color_mesh(post, [100, 80, 60])
            parts.append(post)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/buildings/wooden_platform.glb")

def make_stairs():
    parts = []
    for i in range(4):
        step = trimesh.creation.box(extents=(1.2, 0.1, 0.3))
        step.apply_translation([0, i*0.25, i*0.3])
        color_mesh(step, [120, 95, 70])
        parts.append(step)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/buildings/stairs.glb")

def make_dock_extension():
    parts = []
    plat = trimesh.creation.box(extents=(1.5, 0.1, 3.0))
    plat.apply_translation([0, 0.5, 0])
    color_mesh(plat, [120, 95, 70])
    parts.append(plat)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/dock/dock_extension.glb")

def make_support_beams():
    parts = []
    for x in [-0.4, 0.4]:
        beam = trimesh.creation.box(extents=(0.1, 1.5, 0.1))
        beam.apply_translation([x, 0.75, 0])
        color_mesh(beam, [100, 80, 60])
        parts.append(beam)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/dock/support_beams.glb")

def make_fishing_equipment():
    parts = []
    rod = trimesh.creation.cylinder(radius=0.02, height=1.8)
    rod.apply_transform(trimesh.transformations.rotation_matrix(0.5, [1,0,0]))
    rod.apply_translation([0, 0.9, 0])
    color_mesh(rod, [150, 150, 150])
    parts.append(rod)
    bucket = trimesh.creation.cylinder(radius=0.2, height=0.3)
    bucket.apply_translation([0.3, 0.15, 0.3])
    color_mesh(bucket, [80, 80, 80])
    parts.append(bucket)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/dock/fishing_equipment.glb")

def make_broken_equipment():
    parts = []
    box = trimesh.creation.box(extents=(0.6, 0.4, 0.5))
    box.apply_translation([0, 0.2, 0])
    color_mesh(box, [100, 50, 40])
    parts.append(box)
    gear = trimesh.creation.cylinder(radius=0.15, height=0.1)
    gear.apply_translation([0.2, 0.45, 0])
    color_mesh(gear, [60, 60, 60])
    parts.append(gear)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/apocalypse/broken_equipment.glb")

def generate():
    make_small_survivor_house()
    make_wooden_platform()
    make_stairs()
    make_dock_extension()
    make_support_beams()
    make_fishing_equipment()
    make_broken_equipment()

generate()
