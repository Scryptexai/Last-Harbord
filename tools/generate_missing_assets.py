import os
import math
import numpy as np
from PIL import Image
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

def make_wooden_fence():
    parts = []
    for i in range(2):
        post = trimesh.creation.cylinder(radius=0.08, height=1.2)
        post.apply_translation([i*1.8 - 0.9, 0.6, 0])
        color_mesh(post, [100, 80, 60])
        parts.append(post)
    for y in [0.4, 0.9]:
        plank = trimesh.creation.box(extents=(2.0, 0.1, 0.04))
        plank.apply_translation([0, y, 0.08])
        color_mesh(plank, [120, 95, 70])
        parts.append(plank)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/buildings/wooden_fence.glb")

def make_gate():
    parts = []
    for i in range(2):
        post = trimesh.creation.cylinder(radius=0.1, height=1.5)
        post.apply_translation([i*1.8 - 0.9, 0.75, 0])
        color_mesh(post, [90, 70, 50])
        parts.append(post)
    gate = trimesh.creation.box(extents=(1.7, 1.0, 0.05))
    gate.apply_translation([0, 0.7, 0])
    color_mesh(gate, [110, 85, 60])
    parts.append(gate)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/buildings/gate.glb")

def make_bollard():
    parts = []
    base = trimesh.creation.cylinder(radius=0.15, height=0.6)
    base.apply_translation([0, 0.3, 0])
    color_mesh(base, [80, 80, 80])
    parts.append(base)
    top = trimesh.creation.icosphere(radius=0.15, subdivisions=2)
    top.apply_translation([0, 0.6, 0])
    color_mesh(top, [80, 80, 80])
    parts.append(top)
    cross = trimesh.creation.cylinder(radius=0.04, height=0.4)
    cross.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [1,0,0]))
    cross.apply_translation([0, 0.4, 0])
    color_mesh(cross, [80, 80, 80])
    parts.append(cross)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/dock/bollard.glb")

def make_coconut_palm_var():
    # Simple variation
    trunk = trimesh.creation.cylinder(radius=0.2, height=6.0)
    trunk.apply_translation([0, 3.0, 0])
    trunk.apply_transform(trimesh.transformations.rotation_matrix(0.2, [1,0,0]))
    color_mesh(trunk, [115, 80, 52])
    save_glb(trunk, f"{OUT_BASE}/vegetation/coconut_palm_variation.glb")

def make_abandoned_vehicle():
    parts = []
    body = trimesh.creation.box(extents=(1.8, 0.8, 3.5))
    body.apply_translation([0, 0.6, 0])
    color_mesh(body, [120, 50, 40])
    parts.append(body)
    top = trimesh.creation.box(extents=(1.6, 0.6, 1.8))
    top.apply_translation([0, 1.3, -0.2])
    color_mesh(top, [100, 40, 30])
    parts.append(top)
    for x in [-0.9, 0.9]:
        for z in [-1.2, 1.2]:
            w = trimesh.creation.cylinder(radius=0.35, height=0.2)
            w.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [0,0,1]))
            w.apply_translation([x, 0.35, z])
            color_mesh(w, [30, 30, 30])
            parts.append(w)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/apocalypse/abandoned_vehicle.glb")

def make_abandoned_containers():
    parts = []
    for i in range(3):
        c = trimesh.creation.box(extents=(1.0, 1.0, 1.0))
        c.apply_translation([i*1.1 - 1.1, 0.5, i*0.2])
        c.apply_transform(trimesh.transformations.rotation_matrix(i*0.3, [0,1,0]))
        color_mesh(c, [140, 150, 140])
        parts.append(c)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/apocalypse/abandoned_containers.glb")

def make_broken_fence():
    parts = []
    post = trimesh.creation.cylinder(radius=0.08, height=1.2)
    post.apply_translation([-0.9, 0.6, 0])
    color_mesh(post, [100, 80, 60])
    parts.append(post)
    post2 = trimesh.creation.cylinder(radius=0.08, height=1.2)
    post2.apply_transform(trimesh.transformations.rotation_matrix(0.4, [0,0,1]))
    post2.apply_translation([0.9, 0.5, 0])
    color_mesh(post2, [100, 80, 60])
    parts.append(post2)
    plank = trimesh.creation.box(extents=(2.0, 0.1, 0.04))
    plank.apply_transform(trimesh.transformations.rotation_matrix(-0.2, [0,0,1]))
    plank.apply_translation([0, 0.4, 0.08])
    color_mesh(plank, [120, 95, 70])
    parts.append(plank)
    save_glb(trimesh.util.concatenate(parts), f"{OUT_BASE}/apocalypse/broken_fence.glb")

def generate():
    make_wooden_fence()
    make_gate()
    make_bollard()
    make_coconut_palm_var()
    make_abandoned_vehicle()
    make_abandoned_containers()
    make_broken_fence()
    
generate()
