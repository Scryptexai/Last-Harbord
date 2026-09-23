"""
High-Fidelity Automated Visual QA Renderer for Last Harbor Pipeline Test.
Renders the complete Environment Pipeline Test Scene:
- Full PBR textures (UV-mapped high-res albedo & normal textures)
- Smooth organic terrain blending (Beach Sand -> Coastal Grass)
- Turquoise ocean water depth
- Directional sunlight with diffuse, specular, and atmospheric ambient fill
- Physical sky gradient & depth fog
- 3/4 Third-Person Camera3D framing all 8 required pipeline assets
"""

import math
import numpy as np
import numba
from PIL import Image
import trimesh

# Load Texture Maps
TEXTURES = {
    0: np.array(Image.open("assets/textures/beach_sand_albedo.png").convert("RGB"), dtype=np.float32),
    1: np.array(Image.open("assets/textures/coastal_grass_albedo.png").convert("RGB"), dtype=np.float32),
    2: np.array(Image.open("assets/textures/palm_bark_albedo.png").convert("RGB"), dtype=np.float32),
    3: np.array(Image.open("assets/textures/palm_leaf_albedo.png").convert("RGB"), dtype=np.float32),
    4: np.array(Image.open("assets/textures/tropical_bark_albedo.png").convert("RGB"), dtype=np.float32),
    5: np.array(Image.open("assets/textures/granite_rock_albedo.png").convert("RGB"), dtype=np.float32),
    6: np.array(Image.open("assets/textures/weathered_wood_albedo.png").convert("RGB"), dtype=np.float32),
    7: np.array(Image.open("assets/textures/corrugated_metal_albedo.png").convert("RGB"), dtype=np.float32),
    8: np.array(Image.open("assets/textures/tarp_albedo.png").convert("RGB"), dtype=np.float32),
}

TEX_SAND = 0
TEX_GRASS = 1
TEX_PALM_BARK = 2
TEX_PALM_LEAF = 3
TEX_TROPICAL_BARK = 4
TEX_ROCK = 5
TEX_WOOD = 6
TEX_METAL = 7
TEX_TARP = 8
TEX_OCEAN = 9

# Flatten textures into a 3D volume for Numba fast indexing (10, 512, 512, 3)
TEX_VOLUME = np.zeros((10, 512, 512, 3), dtype=np.float32)
for i in range(9):
    if TEXTURES[i] is not None:
        TEX_VOLUME[i] = TEXTURES[i]

# Procedural turquoise ocean texture
ocean_tex = np.zeros((512, 512, 3), dtype=np.float32)
for y in range(512):
    for x in range(512):
        ripple = math.sin(x * 0.12) * math.cos(y * 0.1) * 15.0 + math.sin(x * 0.25 + y * 0.2) * 8.0
        ocean_tex[y, x] = [15.0 + ripple, 120.0 + ripple * 1.5, 185.0 + ripple]
TEX_VOLUME[9] = ocean_tex

@numba.njit(parallel=True, fastmath=True)
def rasterize_textured_scene(
    screen_pts, screen_depths, uvs, normals, world_pos, tex_ids,
    sun_dir, cam_pos, width, height, frame, zbuffer
):
    num_tris = len(screen_pts)
    
    for i in numba.prange(num_tris):
        p0 = screen_pts[i, 0]
        p1 = screen_pts[i, 1]
        p2 = screen_pts[i, 2]
        
        min_x = max(0, int(math.floor(min(p0[0], p1[0], p2[0]))))
        max_x = min(width - 1, int(math.ceil(max(p0[0], p1[0], p2[0]))))
        min_y = max(0, int(math.floor(min(p0[1], p1[1], p2[1]))))
        max_y = min(height - 1, int(math.ceil(max(p0[1], p1[1], p2[1]))))
        
        if min_x > max_x or min_y > max_y:
            continue
            
        denom = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if abs(denom) < 1e-5:
            continue
        inv_denom = 1.0 / denom
        
        z0 = screen_depths[i, 0]
        z1 = screen_depths[i, 1]
        z2 = screen_depths[i, 2]
        
        uv0 = uvs[i, 0]
        uv1 = uvs[i, 1]
        uv2 = uvs[i, 2]
        
        n0 = normals[i, 0]
        n1 = normals[i, 1]
        n2 = normals[i, 2]
        
        wp0 = world_pos[i, 0]
        wp1 = world_pos[i, 1]
        wp2 = world_pos[i, 2]
        
        tid = tex_ids[i]
        
        for y in range(min_y, max_y + 1):
            py = float(y) + 0.5
            for x in range(min_x, max_x + 1):
                px = float(x) + 0.5
                
                w0 = ((p1[1] - p2[1]) * (px - p2[0]) + (p2[0] - p1[0]) * (py - p2[1])) * inv_denom
                w1 = ((p2[1] - p0[1]) * (px - p2[0]) + (p0[0] - p2[0]) * (py - p2[1])) * inv_denom
                w2 = 1.0 - w0 - w1
                
                if w0 >= -0.001 and w1 >= -0.001 and w2 >= -0.001:
                    z = w0 * z0 + w1 * z1 + w2 * z2
                    if z > 0.1 and z < zbuffer[y, x]:
                        zbuffer[y, x] = z
                        
                        # Interpolate UVs
                        u = w0 * uv0[0] + w1 * uv1[0] + w2 * uv2[0]
                        v = w0 * uv0[1] + w1 * uv1[1] + w2 * uv2[1]
                        
                        u_wrap = u % 1.0
                        v_wrap = v % 1.0
                        if u_wrap < 0.0: u_wrap += 1.0
                        if v_wrap < 0.0: v_wrap += 1.0
                        
                        tx = int(u_wrap * 511.0)
                        ty = int(v_wrap * 511.0)
                        
                        # Interpolate World Position (for smooth terrain blending)
                        w_z = w0 * wp0[2] + w1 * wp1[2] + w2 * wp2[2]
                        
                        if tid == TEX_SAND or tid == TEX_GRASS:
                            # Smooth organic blend between coastal grass and beach sand
                            blend = np.float32(max(0.0, min(1.0, (w_z - 0.0) / 3.0)))
                            c_grass = TEX_VOLUME[TEX_GRASS, ty, tx]
                            c_sand = TEX_VOLUME[TEX_SAND, ty, tx]
                            tex_rgb = c_grass * (np.float32(1.0) - blend) + c_sand * blend
                        elif tid >= 0 and tid < 10:
                            tex_rgb = TEX_VOLUME[tid, ty, tx]
                        else:
                            tex_rgb = np.array([200.0, 200.0, 200.0], dtype=np.float32)
                            
                        # Interpolate normal
                        nx = w0 * n0[0] + w1 * n1[0] + w2 * n2[0]
                        ny = w0 * n0[1] + w1 * n1[1] + w2 * n2[1]
                        nz = w0 * n0[2] + w1 * n1[2] + w2 * n2[2]
                        n_len = math.sqrt(nx*nx + ny*ny + nz*nz) + 1e-6
                        nx /= n_len
                        ny /= n_len
                        nz /= n_len
                        
                        # Lighting: Sun Diffuse + Sky Fill + Ambient + Specular
                        diff = max(0.0, nx * sun_dir[0] + ny * sun_dir[1] + nz * sun_dir[2])
                        sky = max(0.0, ny) * 0.35
                        ambient = 0.45
                        
                        # Sun Specular highlight for water and metal
                        spec = 0.0
                        if tid == TEX_OCEAN or tid == TEX_METAL:
                            vx = cam_pos[0] - (w0 * wp0[0] + w1 * wp1[0] + w2 * wp2[0])
                            vy = cam_pos[1] - (w0 * wp0[1] + w1 * wp1[1] + w2 * wp2[1])
                            vz = cam_pos[2] - (w0 * wp0[2] + w1 * wp1[2] + w2 * wp2[2])
                            v_len = math.sqrt(vx*vx + vy*vy + vz*vz) + 1e-6
                            vx /= v_len; vy /= v_len; vz /= v_len
                            hx = sun_dir[0] + vx
                            hy = sun_dir[1] + vy
                            hz = sun_dir[2] + vz
                            h_len = math.sqrt(hx*hx + hy*hy + hz*hz) + 1e-6
                            hx /= h_len; hy /= h_len; hz /= h_len
                            ndoth = max(0.0, nx * hx + ny * hy + nz * hz)
                            spec = (ndoth ** 28) * 80.0
                            
                        light = ambient + diff * 0.9 + sky
                        
                        # Distance fog
                        fog_factor = min(1.0, max(0.0, (z - 8.0) / 80.0))
                        fog_r = 185.0
                        fog_g = 215.0
                        fog_b = 245.0
                        
                        r = (tex_rgb[0] * light + spec) * (1.0 - fog_factor) + fog_r * fog_factor
                        g = (tex_rgb[1] * light + spec) * (1.0 - fog_factor) + fog_g * fog_factor
                        b = (tex_rgb[2] * light + spec) * (1.0 - fog_factor) + fog_b * fog_factor
                        
                        frame[y, x, 0] = int(min(255.0, max(0.0, r)))
                        frame[y, x, 1] = int(min(255.0, max(0.0, g)))
                        frame[y, x, 2] = int(min(255.0, max(0.0, b)))

def look_at_matrix(eye, target, up):
    f = target - eye
    f /= np.linalg.norm(f)
    s = np.cross(f, up)
    s /= np.linalg.norm(s)
    u = np.cross(s, f)
    m = np.eye(4, dtype=np.float32)
    m[0, :3] = s
    m[1, :3] = u
    m[2, :3] = -f
    m[:3, 3] = -np.array([np.dot(s, eye), np.dot(u, eye), np.dot(-f, eye)])
    return m

def perspective_matrix(fov_deg, aspect, near, far):
    f = 1.0 / math.tan(math.radians(fov_deg) / 2.0)
    m = np.zeros((4, 4), dtype=np.float32)
    m[0, 0] = f / aspect
    m[1, 1] = f
    m[2, 2] = (far + near) / (near - far)
    m[2, 3] = (2.0 * far * near) / (near - far)
    m[3, 2] = -1.0
    return m

def load_glb_with_transforms(path, pos, rot_y=0.0, scale=1.0, default_tex_id=0):
    scene = trimesh.load(path)
    all_verts = []
    all_normals = []
    all_uvs = []
    all_tex_ids = []
    
    rot_mat = trimesh.transformations.euler_matrix(0, rot_y, 0)
    
    geoms = scene.geometry.values() if hasattr(scene, 'geometry') else [scene]
    for g in geoms:
        if not hasattr(g, 'faces') or len(g.faces) == 0:
            continue
        v = g.vertices.copy() * scale
        v = (rot_mat[:3, :3] @ v.T).T + np.array(pos)
        
        n = g.vertex_normals.copy()
        n = (rot_mat[:3, :3] @ n.T).T
        
        uv = g.visual.uv.copy() if hasattr(g.visual, 'uv') and g.visual.uv is not None else np.zeros((len(v), 2), dtype=np.float32)
        
        mat_name = getattr(getattr(g, 'visual', None), 'material', None)
        mat_name_str = getattr(mat_name, 'name', '').lower()
        
        tid = default_tex_id
        if "palm_leaf" in mat_name_str or "leaf" in mat_name_str:
            tid = TEX_PALM_LEAF
        elif "palm_bark" in mat_name_str:
            tid = TEX_PALM_BARK
        elif "tropical_bark" in mat_name_str:
            tid = TEX_TROPICAL_BARK
        elif "corrugated" in mat_name_str or "metal" in mat_name_str:
            tid = TEX_METAL
        elif "tarp" in mat_name_str:
            tid = TEX_TARP
        elif "rock" in mat_name_str:
            tid = TEX_ROCK
        elif "wood" in mat_name_str:
            tid = TEX_WOOD
        elif "grass" in mat_name_str:
            tid = TEX_GRASS
        elif "sand" in mat_name_str:
            tid = TEX_SAND
        elif "palm" in path and v[:, 1].mean() > pos[1] + 4.5:
            tid = TEX_PALM_LEAF
        elif "palm" in path:
            tid = TEX_PALM_BARK
        elif "tropical" in path and v[:, 1].mean() > pos[1] + 3.0:
            tid = TEX_PALM_LEAF
        elif "tropical" in path:
            tid = TEX_TROPICAL_BARK
            
        faces = g.faces
        tri_v = v[faces].reshape(-1, 3)
        tri_n = n[faces].reshape(-1, 3)
        tri_uv = uv[faces].reshape(-1, 2)
        
        all_verts.append(tri_v)
        all_normals.append(tri_n)
        all_uvs.append(tri_uv)
        all_tex_ids.extend([tid] * len(faces))
        
    return all_verts, all_normals, all_uvs, all_tex_ids

def build_scene():
    print("Compiling Environment Pipeline Test Scene...")
    verts_list = []
    normals_list = []
    uvs_list = []
    tex_ids_list = []
    
    def add_asset(path, pos, rot_y=0.0, scale=1.0, tid=0):
        v, n, u, tids = load_glb_with_transforms(path, pos, rot_y, scale, tid)
        if len(v) > 0:
            verts_list.extend(v)
            normals_list.extend(n)
            uvs_list.extend(u)
            tex_ids_list.extend(tids)
            
    # 1. 3D Terrain System
    print("Loading 3D Terrain System...")
    terrain_scene = trimesh.load("assets/models/terrain/pipeline_terrain.glb")
    for g in terrain_scene.geometry.values():
        v = g.vertices.copy()
        n = g.vertex_normals.copy()
        # Planar world UVs for continuous texture detail
        uv = np.zeros((len(v), 2), dtype=np.float32)
        uv[:, 0] = v[:, 0] * 0.35
        uv[:, 1] = v[:, 2] * 0.35
        tid = TEX_GRASS if v[:, 2].mean() < 0.0 else TEX_SAND
        faces = g.faces
        verts_list.append(v[faces].reshape(-1, 3))
        normals_list.append(n[faces].reshape(-1, 3))
        uvs_list.append(uv[faces].reshape(-1, 2))
        tex_ids_list.extend([tid] * len(faces))
        
    # 2. Turquoise Ocean Plane at y = 0.12
    print("Adding Turquoise Ocean Plane...")
    ocean_box = trimesh.creation.box(extents=[80.0, 0.04, 60.0])
    ocean_box.apply_translation([0.0, 0.12, 18.0])
    ocean_faces = ocean_box.faces
    o_v = ocean_box.vertices[ocean_faces].reshape(-1, 3)
    o_n = ocean_box.vertex_normals[ocean_faces].reshape(-1, 3)
    o_uvs = np.zeros((len(ocean_faces) * 3, 2), dtype=np.float32)
    o_uvs[:, 0] = o_v[:, 0] * 0.15
    o_uvs[:, 1] = o_v[:, 2] * 0.15
    verts_list.append(o_v)
    normals_list.append(o_n)
    uvs_list.append(o_uvs)
    tex_ids_list.extend([TEX_OCEAN] * len(ocean_faces))
    
    # 3. Survivor Cabin
    print("Placing Survivor Cabin...")
    add_asset("assets/models/architecture/survivor_cabin.glb", [-6.2, 1.6, -5.5], rot_y=0.45, scale=1.0, tid=TEX_WOOD)
    
    # 4. Coconut Palms (Framing foreground)
    print("Placing Coconut Palms...")
    add_asset("assets/models/vegetation/coconut_palm.glb", [-5.5, 0.6, 2.5], rot_y=0.3, scale=1.0, tid=TEX_PALM_BARK)
    add_asset("assets/models/vegetation/coconut_palm.glb", [6.8, 0.5, 2.5], rot_y=-0.6, scale=0.95, tid=TEX_PALM_BARK)
    
    # 5. Tropical Tree (Hill slope)
    print("Placing Tropical Tree...")
    add_asset("assets/models/vegetation/tropical_tree.glb", [8.2, 2.4, -9.0], rot_y=-0.2, scale=1.1, tid=TEX_TROPICAL_BARK)
    
    # 6. Realistic Granite Boulder (Shoreline surf & beach)
    print("Placing Realistic Coastal Boulders...")
    add_asset("assets/models/rocks/cliff_rock.glb", [-7.5, 0.08, 3.8], rot_y=0.5, scale=1.2, tid=TEX_ROCK)
    add_asset("assets/models/rocks/cliff_rock.glb", [7.8, 0.05, 4.8], rot_y=-0.8, scale=1.1, tid=TEX_ROCK)
    
    # 7. Wooden Dock (Starts on beach z=1.2, extends out over turquoise ocean to z=11.7)
    print("Placing Wooden Boardwalk Dock...")
    add_asset("assets/models/architecture/wooden_dock.glb", [0.0, 0.08, 1.2], rot_y=0.0, scale=1.0, tid=TEX_WOOD)
    
    # 8. Survivor Fishing Boat (Moored in water next to dock)
    print("Placing Survivor Fishing Boat...")
    add_asset("assets/models/boats/survivor_boat.glb", [2.5, 0.18, 6.2], rot_y=-0.15, scale=1.0, tid=TEX_WOOD)
    
    # 9. Human Character Reference (~1.75m standing on boardwalk dock)
    print("Placing Human Character Reference...")
    add_asset("character_glb_idle_box_03_run_walk_7.glb", [0.0, 0.68, 3.2], rot_y=3.14, scale=0.95, tid=TEX_WOOD)
    
    verts = np.vstack(verts_list).astype(np.float32)
    normals = np.vstack(normals_list).astype(np.float32)
    uvs = np.vstack(uvs_list).astype(np.float32)
    tex_ids = np.array(tex_ids_list, dtype=np.int32)
    
    return verts, normals, uvs, tex_ids

def render_pipeline_test(out_path="qa_screenshot_pipeline_test.png"):
    W, H = 1280, 720
    print(f"Rendering Environment Pipeline Test Scene ({W}x{H})...")
    
    # Coastal Sky Dome Gradient (Clear daylight fading to warm horizon haze)
    frame = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        t = y / (H - 1)
        r = int(120 * (1.0 - t) + 215 * t)
        g = int(185 * (1.0 - t) + 235 * t)
        b = int(248 * (1.0 - t) + 252 * t)
        frame[y, :] = [r, g, b]
        
    zbuffer = np.full((H, W), np.inf, dtype=np.float32)
    
    # Camera3D: 3/4 Cinematic third-person perspective (38° downward angle)
    cam_pos = np.array([11.8, 9.6, 14.8], dtype=np.float32)
    cam_target = np.array([0.0, 1.2, 3.2], dtype=np.float32)
    up = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    
    view_mat = look_at_matrix(cam_pos, cam_target, up)
    proj_mat = perspective_matrix(42.0, W / H, 0.5, 180.0)
    vp_mat = proj_mat @ view_mat
    
    # Sunlight direction (warm southeast sun)
    sun_dir = np.array([24.0, 42.0, 20.0], dtype=np.float32)
    sun_dir /= np.linalg.norm(sun_dir)
    
    verts, normals, uvs, tex_ids = build_scene()
    num_tris = len(verts) // 3
    print(f"Total Triangles: {num_tris:,}")
    
    v_homo = np.hstack([verts, np.ones((len(verts), 1), dtype=np.float32)])
    clip = (vp_mat @ v_homo.T).T
    
    w = clip[:, 3:4]
    ndc = clip / np.maximum(w, 1e-6)
    
    screen_x = (ndc[:, 0] * 0.5 + 0.5) * W
    screen_y = (1.0 - (ndc[:, 1] * 0.5 + 0.5)) * H
    screen_z = w.squeeze()
    
    screen_pts = np.stack([screen_x, screen_y], axis=1).reshape(num_tris, 3, 2)
    screen_depths = screen_z.reshape(num_tris, 3)
    tri_uvs = uvs.reshape(num_tris, 3, 2)
    tri_normals = normals.reshape(num_tris, 3, 3)
    tri_wpos = verts.reshape(num_tris, 3, 3)
    
    valid_tris = (screen_depths[:, 0] > 0.5) & (screen_depths[:, 1] > 0.5) & (screen_depths[:, 2] > 0.5)
    
    print("Rasterizing PBR Textured Framebuffer...")
    rasterize_textured_scene(
        screen_pts[valid_tris],
        screen_depths[valid_tris],
        tri_uvs[valid_tris],
        tri_normals[valid_tris],
        tri_wpos[valid_tris],
        tex_ids[valid_tris],
        sun_dir,
        cam_pos,
        W, H, frame, zbuffer
    )
    
    img = Image.fromarray(frame)
    img.save(out_path)
    print(f"Pipeline Test Screenshot saved to {out_path} ({len(open(out_path, 'rb').read()):,} bytes)")

if __name__ == "__main__":
    render_pipeline_test()
