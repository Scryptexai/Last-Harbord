"""
Complete Realistic 3D Asset Generator for Last Harbor Pipeline Test.
Generates genuine high-fidelity 3D assets with proper UV unwrapping,
PBR materials (Albedo, Normal, Roughness), and exports to standard GLB.
"""

import os
import math
import numpy as np
from PIL import Image
import trimesh

OUT_BASE = "assets/models"
os.makedirs(f"{OUT_BASE}/vegetation", exist_ok=True)
os.makedirs(f"{OUT_BASE}/rocks", exist_ok=True)
os.makedirs(f"{OUT_BASE}/architecture", exist_ok=True)
os.makedirs(f"{OUT_BASE}/boats", exist_ok=True)
os.makedirs(f"{OUT_BASE}/terrain", exist_ok=True)

# Load PBR texture sets
def get_pbr_material(name, roughness=0.8, metallic=0.0):
    albedo_path = f"assets/textures/{name}_albedo.png"
    normal_path = f"assets/textures/{name}_normal.png"
    rough_path = f"assets/textures/{name}_roughness.png"
    
    albedo_img = Image.open(albedo_path).convert("RGB")
    normal_img = Image.open(normal_path).convert("RGB") if os.path.exists(normal_path) else None
    
    mat = trimesh.visual.material.PBRMaterial(
        name=name,
        baseColorTexture=albedo_img,
        normalTexture=normal_img,
        roughnessFactor=roughness,
        metallicFactor=metallic,
        doubleSided=True
    )
    return mat

# ==============================================================================
# 1. REALISTIC PALM TREE
# ==============================================================================
def create_palm_tree():
    print("Generating Realistic Coconut Palm Asset...")
    mat_bark = get_pbr_material("palm_bark", roughness=0.85, metallic=0.0)
    mat_leaf = get_pbr_material("palm_leaf", roughness=0.6, metallic=0.0)
    
    # 1. Trunk: Curved lofted cylinder with 18 cross-sections
    num_rings = 24
    num_radial = 14
    height = 7.5
    curve_amount = 1.4
    
    verts = []
    uvs = []
    indices = []
    
    for r in range(num_rings):
        t = r / (num_rings - 1)
        # S-curve / leaning trunk
        cx = math.sin(t * 1.5) * curve_amount
        cz = math.sin(t * 0.8) * (curve_amount * 0.4)
        cy = t * height
        
        # Radius: base swelling (0.36m) -> waist (0.22m) -> crown (0.28m)
        radius = 0.22 + (1.0 - t)**2 * 0.16 + (t**3) * 0.08
        
        for i in range(num_radial):
            angle = (i / num_radial) * math.pi * 2
            px = cx + math.cos(angle) * radius
            pz = cz + math.sin(angle) * radius
            py = cy
            verts.append([px, py, pz])
            uvs.append([i / num_radial, t * 5.0]) # Repeated 5 times along trunk
            
    for r in range(num_rings - 1):
        for i in range(num_radial):
            next_i = (i + 1) % num_radial
            v0 = r * num_radial + i
            v1 = r * num_radial + next_i
            v2 = (r + 1) * num_radial + i
            v3 = (r + 1) * num_radial + next_i
            indices.extend([[v0, v2, v1], [v1, v2, v3]])
            
    trunk_mesh = trimesh.Trimesh(
        vertices=np.array(verts, dtype=np.float32),
        faces=np.array(indices, dtype=np.int32),
        process=True
    )
    trunk_mesh.visual = trimesh.visual.TextureVisuals(uv=np.array(uvs, dtype=np.float32), material=mat_bark)
    
    # 2. Fronds: 12 arched drooping leaves with realistic feathered leaflets
    frond_meshes = []
    crown_pos = np.array([math.sin(1.5) * curve_amount, height, math.sin(0.8) * (curve_amount * 0.4)])
    num_fronds = 14
    
    for f in range(num_fronds):
        angle = (f / num_fronds) * math.pi * 2 + (f * 0.18)
        length = 3.6 + (f % 3) * 0.35
        num_leaflets = 16
        
        f_verts = []
        f_uvs = []
        f_faces = []
        
        # Central stem (rachis) points
        stem_pts = []
        for s in range(num_leaflets):
            st = s / (num_leaflets - 1)
            # Natural parabolic arch: rises up then gracefully droops
            local_y = math.sin(st * math.pi * 0.7) * 0.9 - (st**2) * 1.85
            local_dist = st * length
            
            dx = math.cos(angle)
            dz = math.sin(angle)
            center_x = crown_pos[0] + dx * local_dist
            center_z = crown_pos[2] + dz * local_dist
            center_y = crown_pos[1] + local_y
            stem_pts.append(np.array([center_x, center_y, center_z]))
            
        # Left and Right drooping leaflets along stem
        v_idx = 0
        px = -math.sin(angle)
        pz = math.cos(angle)
        
        for s in range(1, num_leaflets - 1):
            st = s / (num_leaflets - 1)
            p_stem = stem_pts[s]
            p_next = stem_pts[s + 1]
            
            # Leaflet length widest in middle, tapering at base and tip
            leaflet_len = math.sin(st * math.pi) * 0.85
            droop_y = -0.25 * (st**1.5)
            
            # Left leaflet
            l_tip = p_stem + np.array([px * leaflet_len, droop_y, pz * leaflet_len])
            # Right leaflet
            r_tip = p_stem + np.array([-px * leaflet_len, droop_y, -pz * leaflet_len])
            
            # Triangle fans for leaflets
            f_verts.extend([p_stem, p_next, l_tip, r_tip])
            f_uvs.extend([[0.5, st], [0.5, st + 0.05], [0.0, st], [1.0, st]])
            
            # Left triangle: p_stem, p_next, l_tip
            f_faces.append([v_idx, v_idx + 1, v_idx + 2])
            f_faces.append([v_idx, v_idx + 2, v_idx + 1]) # Double sided
            # Right triangle: p_stem, r_tip, p_next
            f_faces.append([v_idx, v_idx + 3, v_idx + 1])
            f_faces.append([v_idx, v_idx + 1, v_idx + 3]) # Double sided
            v_idx += 4
            
        frond_m = trimesh.Trimesh(
            vertices=np.array(f_verts, dtype=np.float32),
            faces=np.array(f_faces, dtype=np.int32),
            process=True
        )
        frond_m.visual = trimesh.visual.TextureVisuals(uv=np.array(f_uvs, dtype=np.float32), material=mat_leaf)
        frond_meshes.append(frond_m)
        
    scene = trimesh.Scene([trunk_mesh] + frond_meshes)
    glb_data = scene.export(file_type="glb")
    out_path = f"{OUT_BASE}/vegetation/coconut_palm.glb"
    with open(out_path, "wb") as f:
        f.write(glb_data)
    print(f"Exported {out_path} ({len(glb_data):,} bytes)")

# ==============================================================================
# 2. REALISTIC TROPICAL TREE
# ==============================================================================
def create_tropical_tree():
    print("Generating Realistic Tropical Tree Asset...")
    mat_bark = get_pbr_material("tropical_bark", roughness=0.88, metallic=0.0)
    mat_leaf = get_pbr_material("palm_leaf", roughness=0.6, metallic=0.0)
    
    # Main trunk with buttress flare
    num_rings = 16
    num_radial = 12
    height = 6.2
    verts = []
    uvs = []
    indices = []
    
    for r in range(num_rings):
        t = r / (num_rings - 1)
        cy = t * height
        # Buttress flare near ground
        flare = math.exp(-t * 6.0) * 0.45
        radius = 0.35 * (1.0 - t * 0.5) + flare
        
        for i in range(num_radial):
            angle = (i / num_radial) * math.pi * 2
            # Fluted buttress cross-section
            buttress = 1.0 + math.sin(angle * 4.0) * 0.25 * flare
            px = math.cos(angle) * radius * buttress
            pz = math.sin(angle) * radius * buttress
            verts.append([px, cy, pz])
            uvs.append([i / num_radial, t * 4.0])
            
    for r in range(num_rings - 1):
        for i in range(num_radial):
            next_i = (i + 1) % num_radial
            v0 = r * num_radial + i
            v1 = r * num_radial + next_i
            v2 = (r + 1) * num_radial + i
            v3 = (r + 1) * num_radial + next_i
            indices.extend([[v0, v2, v1], [v1, v2, v3]])
            
    trunk_mesh = trimesh.Trimesh(
        vertices=np.array(verts, dtype=np.float32),
        faces=np.array(indices, dtype=np.int32),
        process=True
    )
    trunk_mesh.visual = trimesh.visual.TextureVisuals(uv=np.array(uvs, dtype=np.float32), material=mat_bark)
    
    # Layered dense tropical foliage domes
    canopy_parts = []
    branch_offsets = [
        ([0.0, 5.8, 0.0], 2.8, 1.8),
        ([1.5, 5.2, 0.8], 2.2, 1.5),
        ([-1.4, 4.8, 1.2], 2.0, 1.4),
        ([0.8, 5.0, -1.5], 2.3, 1.6),
        ([-1.2, 4.6, -1.1], 1.9, 1.3),
    ]
    
    for pos, rxz, ry in branch_offsets:
        sphere = trimesh.creation.icosphere(subdivisions=3, radius=1.0)
        # Deform sphere into organic leafy volume
        v = sphere.vertices.copy()
        # Squash vertically and stretch horizontally
        v[:, 0] *= rxz * (1.0 + np.sin(v[:, 1] * 3.0) * 0.15)
        v[:, 2] *= rxz * (1.0 + np.cos(v[:, 0] * 3.0) * 0.15)
        v[:, 1] *= ry
        v += np.array(pos)
        
        # Cylindrical / spherical UV mapping
        theta = np.arctan2(v[:, 2] - pos[2], v[:, 0] - pos[0])
        u = (theta / (2.0 * math.pi)) + 0.5
        y_norm = (v[:, 1] - pos[1]) / (2.0 * ry) + 0.5
        uv = np.stack([u * 3.0, y_norm * 3.0], axis=-1)
        
        part = trimesh.Trimesh(vertices=v, faces=sphere.faces, process=True)
        part.visual = trimesh.visual.TextureVisuals(uv=uv, material=mat_leaf)
        canopy_parts.append(part)
        
    scene = trimesh.Scene([trunk_mesh] + canopy_parts)
    glb_data = scene.export(file_type="glb")
    out_path = f"{OUT_BASE}/vegetation/tropical_tree.glb"
    with open(out_path, "wb") as f:
        f.write(glb_data)
    print(f"Exported {out_path} ({len(glb_data):,} bytes)")

# ==============================================================================
# 3. REALISTIC ROCK ASSET
# ==============================================================================
def create_rock_asset():
    print("Generating Realistic Coastal Granite Boulder...")
    mat_rock = get_pbr_material("granite_rock", roughness=0.82, metallic=0.0)
    
    # Create angular faceted boulder with noise displacement
    sphere = trimesh.creation.icosphere(subdivisions=3, radius=1.4)
    verts = sphere.vertices.copy()
    
    # Non-uniform scaling (wider at base, flattened top facet)
    verts[:, 0] *= 1.6 # Width X
    verts[:, 1] *= 1.1 # Height Y
    verts[:, 2] *= 1.4 # Depth Z
    
    # Fractured angular displacement (Voronoi-like planar cutting)
    planes = [
        np.array([0.7, 0.4, 0.5]),
        np.array([-0.8, 0.5, 0.3]),
        np.array([0.2, 0.9, -0.4]),
        np.array([-0.3, -0.8, 0.5]),
        np.array([0.1, -0.9, -0.4]),
    ]
    for p in planes:
        p_norm = p / np.linalg.norm(p)
        dots = np.dot(verts, p_norm)
        cutoff = 1.05
        mask = dots > cutoff
        verts[mask] -= p_norm * (dots[mask] - cutoff)[:, None] * 0.75
        
    # High frequency micro-noise for weathered stone texture
    np.random.seed(42)
    noise = (np.random.rand(*verts.shape) - 0.5) * 0.08
    verts += noise
    
    # Ground flattening (sits firmly on terrain)
    verts[verts[:, 1] < -0.6, 1] = -0.6
    
    # Triplanar / spherical UV mapping
    uv = np.zeros((len(verts), 2), dtype=np.float32)
    uv[:, 0] = np.arctan2(verts[:, 2], verts[:, 0]) / (2.0 * math.pi) + 0.5
    uv[:, 1] = verts[:, 1] * 0.6 + 0.5
    uv *= 2.5 # Tiling
    
    rock = trimesh.Trimesh(vertices=verts, faces=sphere.faces, process=True)
    rock.visual = trimesh.visual.TextureVisuals(uv=uv, material=mat_rock)
    
    glb_data = rock.export(file_type="glb")
    out_path = f"{OUT_BASE}/rocks/cliff_rock.glb"
    with open(out_path, "wb") as f:
        f.write(glb_data)
    print(f"Exported {out_path} ({len(glb_data):,} bytes)")

# ==============================================================================
# 4. REALISTIC SURVIVOR CABIN
# ==============================================================================
def create_survivor_cabin():
    print("Generating Believable Survivor Cabin Asset...")
    mat_wood = get_pbr_material("weathered_wood", roughness=0.85, metallic=0.0)
    mat_roof = get_pbr_material("corrugated_metal", roughness=0.6, metallic=0.45)
    mat_tarp = get_pbr_material("tarp", roughness=0.7, metallic=0.0) if os.path.exists("assets/textures/tarp_albedo.png") else mat_roof
    
    meshes_wood = []
    meshes_roof = []
    
    # Helper to create textured box with box-mapping UVs
    def make_box(size, pos, rot=(0,0,0), uv_scale=0.35):
        b = trimesh.creation.box(extents=size)
        if rot != (0,0,0):
            r_mat = trimesh.transformations.euler_matrix(rot[0], rot[1], rot[2])
            b.apply_transform(r_mat)
        b.apply_translation(pos)
        v = b.vertices - np.array(pos)
        uv = np.zeros((len(v), 2), dtype=np.float32)
        # Planar box UV projection based on dominant normal
        normals = b.vertex_normals
        for i in range(len(v)):
            nx, ny, nz = abs(normals[i, 0]), abs(normals[i, 1]), abs(normals[i, 2])
            if nx >= ny and nx >= nz:
                uv[i, 0] = v[i, 2] * uv_scale
                uv[i, 1] = v[i, 1] * uv_scale
            elif ny >= nx and ny >= nz:
                uv[i, 0] = v[i, 0] * uv_scale
                uv[i, 1] = v[i, 2] * uv_scale
            else:
                uv[i, 0] = v[i, 0] * uv_scale
                uv[i, 1] = v[i, 1] * uv_scale
        b.visual = trimesh.visual.TextureVisuals(uv=uv)
        return b
        
    width = 4.8
    depth = 3.8
    wall_h = 2.4
    stilt_h = 0.65
    
    # 1. Foundation stilts (6 sturdy logs)
    for sx in [-width/2 + 0.3, 0.0, width/2 - 0.3]:
        for sz in [-depth/2 + 0.3, depth/2 + 0.9]:
            stilt = trimesh.creation.cylinder(radius=0.14, height=stilt_h + 0.4)
            stilt.apply_translation([sx, (stilt_h + 0.4)/2 - 0.2, sz])
            uv = np.zeros((len(stilt.vertices), 2), dtype=np.float32)
            uv[:, 0] = stilt.vertices[:, 0] * 2.0
            uv[:, 1] = stilt.vertices[:, 1] * 2.0
            stilt.visual = trimesh.visual.TextureVisuals(uv=uv)
            meshes_wood.append(stilt)
            
    # 2. Main Floor Deck & Extended Front Porch
    deck = make_box([width + 0.2, 0.16, depth + 1.4], [0.0, stilt_h, 0.5])
    meshes_wood.append(deck)
    
    # Porch steps
    step1 = make_box([1.4, 0.18, 0.45], [0.0, stilt_h * 0.45, depth/2 + 1.3])
    step2 = make_box([1.6, 0.18, 0.45], [0.0, 0.1, depth/2 + 1.65])
    meshes_wood.extend([step1, step2])
    
    # 3. Walls (Back, Left, Right, Front with Door opening)
    back_wall = make_box([width, wall_h, 0.14], [0.0, stilt_h + wall_h/2, -depth/2])
    left_wall = make_box([0.14, wall_h, depth], [-width/2, stilt_h + wall_h/2, 0.0])
    right_wall = make_box([0.14, wall_h, depth], [width/2, stilt_h + wall_h/2, 0.0])
    
    # Front wall: left panel, right panel, door header
    front_left = make_box([(width - 1.2)/2, wall_h, 0.14], [-width/4 - 0.3, stilt_h + wall_h/2, depth/2])
    front_right = make_box([(width - 1.2)/2, wall_h, 0.14], [width/4 + 0.3, stilt_h + wall_h/2, depth/2])
    front_header = make_box([1.2, 0.5, 0.14], [0.0, stilt_h + wall_h - 0.25, depth/2])
    meshes_wood.extend([back_wall, left_wall, right_wall, front_left, front_right, front_header])
    
    # 4. Gabled Ends & Rafter Beams
    gable_back = make_box([width, 0.14, 0.14], [0.0, stilt_h + wall_h + 0.6, -depth/2])
    ridge_beam = make_box([0.16, 0.18, depth + 1.8], [0.0, stilt_h + wall_h + 0.95, 0.4])
    meshes_wood.extend([gable_back, ridge_beam])
    
    # Porch support posts & railing
    post_l = make_box([0.12, wall_h, 0.12], [-width/2 + 0.2, stilt_h + wall_h/2, depth/2 + 1.1])
    post_r = make_box([0.12, wall_h, 0.12], [width/2 - 0.2, stilt_h + wall_h/2, depth/2 + 1.1])
    railing = make_box([width/2 - 0.7, 0.08, 0.08], [-width/4 - 0.35, stilt_h + 0.9, depth/2 + 1.1])
    meshes_wood.extend([post_l, post_r, railing])
    
    # 5. Corrugated Tin Roof panels with realistic slope and overhang
    roof_len = depth + 1.8
    roof_w = 2.85
    roof_left = make_box([roof_w, 0.06, roof_len], [-roof_w * 0.42, stilt_h + wall_h + 0.62, 0.4], rot=(0.0, 0.0, 0.38), uv_scale=0.4)
    roof_right = make_box([roof_w, 0.06, roof_len], [roof_w * 0.42, stilt_h + wall_h + 0.62, 0.4], rot=(0.0, 0.0, -0.38), uv_scale=0.4)
    meshes_roof.extend([roof_left, roof_right])
    
    # 6. Blue Tarp Patch on roof
    tarp = make_box([1.8, 0.04, 1.6], [-0.8, stilt_h + wall_h + 0.66, 0.2], rot=(0.0, 0.0, 0.38), uv_scale=0.5)
    tarp_mesh = tarp
    tarp_mesh.visual = trimesh.visual.TextureVisuals(uv=tarp.visual.uv, material=mat_tarp)
    
    # Combine wood parts
    wood_combined = trimesh.util.concatenate(meshes_wood)
    wood_combined.visual = trimesh.visual.TextureVisuals(uv=wood_combined.visual.uv, material=mat_wood)
    
    roof_combined = trimesh.util.concatenate(meshes_roof)
    roof_combined.visual = trimesh.visual.TextureVisuals(uv=roof_combined.visual.uv, material=mat_roof)
    
    cabin_scene = trimesh.Scene([wood_combined, roof_combined, tarp_mesh])
    glb_data = cabin_scene.export(file_type="glb")
    out_path = f"{OUT_BASE}/architecture/survivor_cabin.glb"
    with open(out_path, "wb") as f:
        f.write(glb_data)
    print(f"Exported {out_path} ({len(glb_data):,} bytes)")

# ==============================================================================
# 5. REALISTIC WOODEN DOCK
# ==============================================================================
def create_wooden_dock():
    print("Generating Weathered Wooden Boardwalk Dock...")
    mat_wood = get_pbr_material("weathered_wood", roughness=0.88, metallic=0.0)
    
    meshes = []
    dock_len = 10.5
    dock_w = 2.8
    deck_y = 0.58
    
    # Heavy log pilings
    for z in np.arange(1.2, dock_len, 2.2):
        for sx in [-dock_w/2 + 0.2, dock_w/2 - 0.2]:
            piling = trimesh.creation.cylinder(radius=0.16, height=2.4)
            piling.apply_translation([sx, deck_y - 0.9, z])
            uv = np.zeros((len(piling.vertices), 2), dtype=np.float32)
            uv[:, 0] = piling.vertices[:, 0] * 2.0
            uv[:, 1] = piling.vertices[:, 1] * 2.0
            piling.visual = trimesh.visual.TextureVisuals(uv=uv)
            meshes.append(piling)
            
        # Cross-beam
        beam = trimesh.creation.box(extents=[dock_w + 0.1, 0.18, 0.22])
        beam.apply_translation([0.0, deck_y - 0.14, z])
        uv = np.zeros((len(beam.vertices), 2), dtype=np.float32)
        uv[:, 0] = beam.vertices[:, 0] * 1.5
        uv[:, 1] = beam.vertices[:, 2] * 1.5
        beam.visual = trimesh.visual.TextureVisuals(uv=uv)
        meshes.append(beam)
        
    # 34 individual deck planks with slight irregular weathering
    num_planks = 34
    spacing = dock_len / num_planks
    for i in range(num_planks):
        pz = i * spacing + 0.15
        plank_w = dock_w + math.sin(i * 3.5) * 0.08
        plank = trimesh.creation.box(extents=[plank_w, 0.08, spacing * 0.88])
        plank.apply_translation([0.0, deck_y + math.sin(i * 5.0) * 0.01, pz])
        # Slight yaw variation for aged look
        r_mat = trimesh.transformations.euler_matrix(0.0, math.sin(i * 7.0) * 0.015, 0.0)
        plank.apply_transform(r_mat)
        
        uv = np.zeros((len(plank.vertices), 2), dtype=np.float32)
        uv[:, 0] = plank.vertices[:, 0] * 1.8
        uv[:, 1] = (plank.vertices[:, 2] + i * 0.4) * 1.8
        plank.visual = trimesh.visual.TextureVisuals(uv=uv)
        meshes.append(plank)
        
    dock_combined = trimesh.util.concatenate(meshes)
    dock_combined.visual = trimesh.visual.TextureVisuals(uv=dock_combined.visual.uv, material=mat_wood)
    
    glb_data = dock_combined.export(file_type="glb")
    out_path = f"{OUT_BASE}/architecture/wooden_dock.glb"
    with open(out_path, "wb") as f:
        f.write(glb_data)
    print(f"Exported {out_path} ({len(glb_data):,} bytes)")

# ==============================================================================
# 6. REALISTIC SURVIVOR BOAT
# ==============================================================================
def create_survivor_boat():
    print("Generating Realistic Survivor Fishing Boat...")
    mat_wood = get_pbr_material("weathered_wood", roughness=0.82, metallic=0.0)
    
    # Lofted curved hull (bow stem to transom)
    length = 4.8
    num_sections = 16
    num_points = 14
    
    verts = []
    uvs = []
    faces = []
    
    for s in range(num_sections):
        st = s / (num_sections - 1) # 0 = stern, 1 = bow
        sz = (st - 0.5) * length
        
        # Beam width curve: wide at midship, narrow at stern, sharp at bow
        beam = math.sin(st * math.pi * 0.85 + 0.15) * 0.95
        depth = 0.65 - st * 0.15
        sheer_rise = (st - 0.4)**2 * 0.35 + (0.0 if st > 0.4 else (0.4 - st)**2 * 0.2)
        
        for p in range(num_points):
            pt = p / (num_points - 1) # 0 = port gunwale, 0.5 = keel, 1 = starboard gunwale
            angle = pt * math.pi
            
            px = -math.cos(angle) * beam
            py = sheer_rise - math.sin(angle) * depth
            verts.append([px, py, sz])
            uvs.append([pt * 2.0, st * 4.0])
            
    for s in range(num_sections - 1):
        for p in range(num_points - 1):
            v0 = s * num_points + p
            v1 = s * num_points + (p + 1)
            v2 = (s + 1) * num_points + p
            v3 = (s + 1) * num_points + (p + 1)
            faces.extend([[v0, v1, v2], [v1, v3, v2]])
            # Double sided for interior
            faces.extend([[v0, v2, v1], [v1, v2, v3]])
            
    hull_mesh = trimesh.Trimesh(
        vertices=np.array(verts, dtype=np.float32),
        faces=np.array(faces, dtype=np.int32),
        process=True
    )
    hull_mesh.visual = trimesh.visual.TextureVisuals(uv=np.array(uvs, dtype=np.float32), material=mat_wood)
    
    # Bench seats (thwarts) & Transom board
    bench1 = trimesh.creation.box(extents=[1.5, 0.06, 0.35])
    bench1.apply_translation([0.0, 0.1, -0.6])
    
    bench2 = trimesh.creation.box(extents=[1.4, 0.06, 0.35])
    bench2.apply_translation([0.0, 0.15, 0.8])
    
    transom = trimesh.creation.box(extents=[1.3, 0.6, 0.08])
    transom.apply_translation([0.0, 0.15, -length/2])
    
    # Pair of wooden oars
    oar1 = trimesh.creation.cylinder(radius=0.04, height=2.4)
    oar1.apply_transform(trimesh.transformations.euler_matrix(0.2, 0.3, 0.5))
    oar1.apply_translation([0.3, 0.25, 0.2])
    
    boat_parts = [hull_mesh, bench1, bench2, transom, oar1]
    for p in boat_parts[1:]:
        uv = np.zeros((len(p.vertices), 2), dtype=np.float32)
        uv[:, 0] = p.vertices[:, 0] * 1.5
        uv[:, 1] = p.vertices[:, 2] * 1.5
        p.visual = trimesh.visual.TextureVisuals(uv=uv, material=mat_wood)
        
    scene = trimesh.Scene(boat_parts)
    glb_data = scene.export(file_type="glb")
    out_path = f"{OUT_BASE}/boats/survivor_boat.glb"
    with open(out_path, "wb") as f:
        f.write(glb_data)
    print(f"Exported {out_path} ({len(glb_data):,} bytes)")

if __name__ == "__main__":
    create_palm_tree()
    create_tropical_tree()
    create_rock_asset()
    create_survivor_cabin()
    create_wooden_dock()
    create_survivor_boat()
    print("All 6 major 3D GLB assets generated successfully!")
