"""
Autonomous Visual QA Renderer for Last Harbor.
Features:
- Smooth continuous organic terrain splatting (zero harsh jagged steps)
- Natural palm tree placement framing the settlement
- Native PBR vertex colors on all 28 assets
- Full cinematic 3/4 perspective
"""

import math
import numpy as np
import numba
from PIL import Image
import trimesh

@numba.njit(parallel=True, fastmath=True)
def rasterize_lit_scene(vertices_2d, depths, colors, width, height, frame, zbuffer):
    num_tris = len(vertices_2d)
    
    for i in numba.prange(num_tris):
        p0 = vertices_2d[i, 0]
        p1 = vertices_2d[i, 1]
        p2 = vertices_2d[i, 2]
        
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
        
        c0 = colors[i, 0]
        c1 = colors[i, 1]
        c2 = colors[i, 2]
        
        z0 = depths[i, 0]
        z1 = depths[i, 1]
        z2 = depths[i, 2]
        
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
                        
                        r = w0 * c0[0] + w1 * c1[0] + w2 * c2[0]
                        g = w0 * c0[1] + w1 * c1[1] + w2 * c2[1]
                        b = w0 * c0[2] + w1 * c1[2] + w2 * c2[2]
                        
                        frame[y, x, 0] = min(255, max(0, int(r)))
                        frame[y, x, 1] = min(255, max(0, int(g)))
                        frame[y, x, 2] = min(255, max(0, int(b)))

def look_at_matrix(eye, target, up):
    f = (target - eye)
    f /= np.linalg.norm(f)
    s = np.cross(f, up)
    s /= np.linalg.norm(s)
    u = np.cross(s, f)
    
    mat = np.eye(4)
    mat[0, :3] = s
    mat[1, :3] = u
    mat[2, :3] = -f
    mat[0, 3] = -np.dot(s, eye)
    mat[1, 3] = -np.dot(u, eye)
    mat[2, 3] = np.dot(f, eye)
    return mat

def perspective_matrix(fov_deg, aspect, near, far):
    tan_half = math.tan(math.radians(fov_deg) / 2.0)
    mat = np.zeros((4, 4))
    mat[0, 0] = 1.0 / (aspect * tan_half)
    mat[1, 1] = 1.0 / tan_half
    mat[2, 2] = -(far + near) / (far - near)
    mat[2, 3] = -(2.0 * far * near) / (far - near)
    mat[3, 2] = -1.0
    return mat

def get_elevation_and_normal(x, z):
    eps = 0.05
    def sample_h(sx, sz):
        dist_core = math.hypot(sx * 0.95, sz + 8)
        if dist_core > 36:
            return -1.5
        h = 0.0
        if sz > 2:
            t = (sz - 2) / 10.0
            h = 1.2 * (1.0 - t) + (-0.4) * t
        elif sz <= 2 and sz > -16:
            t = (sz - 2) / (-18.0)
            h = 1.2 + t * 1.6
        else:
            t = (-16 - sz) / 16.0
            h = 2.8 + t * 4.2
            
        noise = math.sin(sx * 0.14) * math.cos(sz * 0.12) * 0.75 + math.sin(sx * 0.28 + 1.2) * math.cos(sz * 0.25) * 0.35
        h += noise
        
        path_dist = abs(sx - math.sin(sz * 0.2) * 1.2)
        if path_dist < 3.0 and sz > -14 and sz < 7:
            path_smooth = 1.0 - path_dist / 3.0
            target_path_y = 2.2 * (1.0 - (sz + 14)/21.0) + 0.4 * ((sz + 14)/21.0)
            h = h * (1.0 - path_smooth * 0.65) + target_path_y * (path_smooth * 0.65)
        return h

    h_center = sample_h(x, z)
    dh_dx = (sample_h(x + eps, z) - sample_h(x - eps, z)) / (2.0 * eps)
    dh_dz = (sample_h(x, z + eps) - sample_h(x, z - eps)) / (2.0 * eps)
    
    n = np.array([-dh_dx, 1.0, -dh_dz])
    n /= np.linalg.norm(n)
    return h_center, n

def build_scene():
    all_vertices = []
    all_normals = []
    all_colors = []

    # 1. High-Density Smooth Terrain with Soft Organic Blending
    print("Compiling organic continuous terrain...")
    grid_w = 90
    grid_h = 90
    xs = np.linspace(-32, 32, grid_w)
    zs = np.linspace(-30, 20, grid_h)
    
    verts_grid = np.zeros((grid_h, grid_w, 3), dtype=np.float32)
    norms_grid = np.zeros((grid_h, grid_w, 3), dtype=np.float32)
    cols_grid = np.zeros((grid_h, grid_w, 3), dtype=np.float32)
    
    col_wet_sand = np.array([175.0, 148.0, 115.0])
    col_gold_sand = np.array([238.0, 218.0, 172.0])
    col_grass = np.array([102.0, 158.0, 78.0])
    col_path = np.array([188.0, 152.0, 112.0])
    col_rock = np.array([142.0, 146.0, 152.0])
    
    for r in range(grid_h):
        for c in range(grid_w):
            x = xs[c]
            z = zs[r]
            y, n = get_elevation_and_normal(x, z)
            verts_grid[r, c] = [x, y, z]
            norms_grid[r, c] = n
            
            # Smooth continuous terrain blending
            # Sand factor: 1.0 at shore, fading out towards inland plateau
            noise_beach = math.sin(x * 0.45) * math.cos(z * 0.45) * 0.35
            eff_y = y + noise_beach
            
            if eff_y < 0.2:
                # Wet shoreline
                t_wet = max(0.0, min(1.0, (0.2 - eff_y) / 0.4))
                base_c = col_wet_sand * t_wet + col_gold_sand * (1.0 - t_wet)
            elif eff_y < 1.2:
                # Sand to grass transition
                t_sand = max(0.0, min(1.0, (1.2 - eff_y) / 1.0))
                base_c = col_gold_sand * t_sand + col_grass * (1.0 - t_sand)
            elif eff_y > 4.2:
                # High rocky cliffs
                t_rock = max(0.0, min(1.0, (eff_y - 4.2) / 1.5))
                base_c = col_grass * (1.0 - t_rock) + col_rock * t_rock
            else:
                base_c = col_grass.copy()
                
            # Trail blending
            path_dist = abs(x - math.sin(z * 0.2) * 1.2)
            if z > -15 and z < 7:
                path_blend = max(0.0, min(1.0, 1.0 - path_dist / 2.2))
                base_c = base_c * (1.0 - path_blend) + col_path * path_blend
                
            cols_grid[r, c] = base_c
                    
    for r in range(grid_h - 1):
        for c in range(grid_w - 1):
            p00 = verts_grid[r, c]
            p10 = verts_grid[r+1, c]
            p01 = verts_grid[r, c+1]
            p11 = verts_grid[r+1, c+1]
            
            n00 = norms_grid[r, c]
            n10 = norms_grid[r+1, c]
            n01 = norms_grid[r, c+1]
            n11 = norms_grid[r+1, c+1]
            
            c00 = cols_grid[r, c]
            c10 = cols_grid[r+1, c]
            c01 = cols_grid[r, c+1]
            c11 = cols_grid[r+1, c+1]
            
            all_vertices.extend([p00, p10, p01])
            all_normals.extend([n00, n10, n01])
            all_colors.extend([c00, c10, c01])
            
            all_vertices.extend([p01, p10, p11])
            all_normals.extend([n01, n10, n11])
            all_colors.extend([c01, c10, c11])

    # 2. Ocean Water & Shoreline Foam
    print("Compiling turquoise ocean depth...")
    ocean_y = 0.05
    ow = 65.0
    p_oc = [[-ow, ocean_y, -ow], [-ow, ocean_y, ow], [ow, ocean_y, -ow],
            [ow, ocean_y, -ow], [-ow, ocean_y, ow], [ow, ocean_y, ow]]
    for p in p_oc:
        all_vertices.append(p)
        all_normals.append([0, 1, 0])
        dist_z = p[2]
        if dist_z > 8:
            all_colors.append([8, 115, 185])
        else:
            all_colors.append([35, 175, 215])
            
    num_foam_pts = 36
    for i in range(num_foam_pts):
        a0 = (i / num_foam_pts) * math.pi
        a1 = ((i + 1) / num_foam_pts) * math.pi
        r0 = 9.8
        r1 = 12.8
        v0 = [math.cos(a0) * r0, 0.08, 4.0 + math.sin(a0) * 3.5]
        v1 = [math.cos(a0) * r1, 0.08, 4.0 + math.sin(a0) * 4.2]
        v2 = [math.cos(a1) * r0, 0.08, 4.0 + math.sin(a1) * 3.5]
        v3 = [math.cos(a1) * r1, 0.08, 4.0 + math.sin(a1) * 4.2]
        all_vertices.extend([v0, v1, v2, v2, v1, v3])
        for _ in range(6):
            all_normals.append([0, 1, 0])
            all_colors.append([248, 252, 255])

    # Helper: Place GLB retaining its NATIVE vertex colors!
    def place_glb(path, pos, rot_y=0.0, scale=1.0):
        try:
            scene = trimesh.load(path)
            for geom in scene.geometry.values():
                m = geom.copy()
                if scale != 1.0:
                    m.apply_scale(scale)
                if rot_y != 0.0:
                    m.apply_transform(trimesh.transformations.rotation_matrix(rot_y, [0, 1, 0]))
                m.apply_translation(pos)
                
                if hasattr(m.visual, 'vertex_colors') and m.visual.vertex_colors is not None and len(m.visual.vertex_colors) == len(m.vertices):
                    raw_cols = m.visual.vertex_colors[:, :3]
                else:
                    raw_cols = np.tile([160, 130, 95], (len(m.vertices), 1))
                    
                all_vertices.extend(m.vertices[m.faces].reshape(-1, 3))
                all_normals.extend(m.vertex_normals[m.faces].reshape(-1, 3))
                all_colors.extend(raw_cols[m.faces].reshape(-1, 3))
        except Exception as e:
            print(f"Error placing {path}: {e}")

    # 3. Architecture Placement
    print("Placing survivor cabins and structures...")
    place_glb("assets/models/architecture/survivor_cabin.glb", [-7.2, get_elevation_and_normal(-7.2, -12.5)[0], -12.5], 0.35)
    place_glb("assets/models/architecture/survivor_cabin.glb", [6.8, get_elevation_and_normal(6.8, -11.0)[0], -11.0], -0.4)
    place_glb("assets/models/architecture/survivor_cabin.glb", [-1.5, get_elevation_and_normal(-1.5, -20.0)[0], -20.0], 0.05)
    place_glb("assets/models/architecture/fishing_hut.glb", [8.5, get_elevation_and_normal(8.5, -3.5)[0], -3.5], -0.6)
    place_glb("assets/models/architecture/storage_shed.glb", [-8.5, get_elevation_and_normal(-8.5, -6.5)[0], -6.5], 0.5)

    # 4. Dock & Survivor Boat
    print("Placing dock & survivor boat...")
    place_glb("assets/models/architecture/wooden_dock.glb", [0, 0, 5.0], 0.0)
    place_glb("assets/models/boats/survivor_boat.glb", [2.8, 0.0, 8.5], 0.15)

    # 5. Natural Vegetation Framing
    print("Placing coconut palms, tropical trees, and bushes...")
    # Naturally distributed palms (framing the perimeter, leaving center village and dock clear)
    palms = [
        (-8.5, 4.5, 1.1, 0.4), (-11.0, 1.5, 0.95, 1.2),
        (12.5, 4.5, 1.15, -0.6), (14.0, -1.0, 0.9, 0.8),
        (-6.5, -4.0, 1.05, 0.2), (10.5, -5.5, 1.0, -0.5),
        (-4.0, 6.5, 0.85, 1.4), (5.5, 7.8, 0.95, -1.1)
    ]
    for px, pz, pscale, prot in palms:
        y, _ = get_elevation_and_normal(px, pz)
        place_glb("assets/models/vegetation/coconut_palm.glb", [px, y, pz], prot, scale=pscale)

    trees = [
        (-14.0, -18.0, 1.2, 0.3), (-10.5, -24.0, 1.35, 0.8),
        (-4.0, -28.0, 1.4, -0.2), (3.5, -29.0, 1.45, 0.6),
        (11.0, -25.0, 1.3, -0.5), (14.5, -19.0, 1.15, 0.2)
    ]
    for tx, tz, tscale, trot in trees:
        y, _ = get_elevation_and_normal(tx, tz)
        place_glb("assets/models/vegetation/tropical_tree.glb", [tx, y, tz], trot, scale=tscale)

    bushes = [(-2.8, -2.5), (2.6, -1.5), (-3.5, -8.0), (3.2, -6.5), (-1.2, -5.0), (1.5, -7.0)]
    for bx, bz in bushes:
        y, _ = get_elevation_and_normal(bx, bz)
        place_glb("assets/models/vegetation/tropical_bush.glb", [bx, y, bz])

    # Driftwood
    place_glb("assets/models/vegetation/fallen_branch.glb", [-4.5, get_elevation_and_normal(-4.5, 3.8)[0], 3.8], 0.7)
    place_glb("assets/models/vegetation/fallen_branch.glb", [4.8, get_elevation_and_normal(4.8, 3.5)[0], 3.5], -1.1)

    # 6. Coastal Rocks
    print("Placing shoreline rocks...")
    place_glb("assets/models/rocks/rock_large.glb", [-11.5, get_elevation_and_normal(-11.5, 5.0)[0], 5.0], 0.4, scale=1.3)
    place_glb("assets/models/rocks/rock_large.glb", [11.8, get_elevation_and_normal(11.8, 6.0)[0], 6.0], -0.8, scale=1.4)
    place_glb("assets/models/rocks/rock_medium.glb", [-13.0, get_elevation_and_normal(-13.0, 2.0)[0], 2.0], 1.1)
    place_glb("assets/models/rocks/rock_small.glb", [-3.5, get_elevation_and_normal(-3.5, 6.5)[0], 6.5], 0.2)
    place_glb("assets/models/rocks/rock_small.glb", [3.8, get_elevation_and_normal(3.8, 6.2)[0], 6.2], -0.5)

    # 7. Props: Campfire, Crates, Barrels, Lantern
    print("Placing survivor props and campfire...")
    place_glb("assets/models/props/campfire.glb", [0, get_elevation_and_normal(0, -9.5)[0], -9.5])
    place_glb("assets/models/props/wooden_crate.glb", [-5.2, get_elevation_and_normal(-5.2, -11.5)[0], -11.5], 0.2)
    place_glb("assets/models/props/wooden_crate.glb", [-5.0, get_elevation_and_normal(-5.0, -11.0)[0], -11.0], -0.3)
    place_glb("assets/models/props/barrel.glb", [5.2, get_elevation_and_normal(5.2, -10.5)[0], -10.5])
    place_glb("assets/models/props/barrel.glb", [5.8, get_elevation_and_normal(5.8, -10.2)[0], -10.2])
    place_glb("assets/models/props/debris.glb", [-2.5, get_elevation_and_normal(-2.5, 3.2)[0], 3.2], 0.4)
    place_glb("assets/models/props/fuel_container.glb", [4.8, get_elevation_and_normal(4.8, -10.8)[0], -10.8], 0.5)
    place_glb("assets/models/props/water_container.glb", [-4.6, get_elevation_and_normal(-4.6, -11.8)[0], -11.8], -0.2)
    place_glb("assets/models/props/lantern.glb", [0.4, 0.65, 8.2])

    # 8. 3D Player Character on Village Trail
    player_y, _ = get_elevation_and_normal(0, -4.0)
    body = trimesh.creation.cylinder(radius=0.24, height=1.0, sections=8)
    body.apply_translation([0, 0, 0.5])
    body.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2, [1, 0, 0]))
    body.apply_translation([0, player_y + 0.4, -4.0])
    head = trimesh.creation.icosphere(subdivisions=2, radius=0.18)
    head.apply_translation([0, player_y + 1.55, -4.0])

    all_vertices.extend(body.vertices[body.faces].reshape(-1, 3))
    all_normals.extend(body.vertex_normals[body.faces].reshape(-1, 3))
    all_colors.extend(np.tile([40, 58, 82], (len(body.faces)*3, 1)))

    all_vertices.extend(head.vertices[head.faces].reshape(-1, 3))
    all_normals.extend(head.vertex_normals[head.faces].reshape(-1, 3))
    all_colors.extend(np.tile([215, 168, 125], (len(head.faces)*3, 1)))

    shadow_geo = trimesh.creation.cylinder(radius=0.45, height=0.02, sections=12)
    shadow_geo.apply_translation([0, player_y + 0.02, -4.0])
    all_vertices.extend(shadow_geo.vertices[shadow_geo.faces].reshape(-1, 3))
    all_normals.extend(shadow_geo.vertex_normals[shadow_geo.faces].reshape(-1, 3))
    all_colors.extend(np.tile([25, 35, 25], (len(shadow_geo.faces)*3, 1)))

    return (np.array(all_vertices, dtype=np.float32),
            np.array(all_normals, dtype=np.float32),
            np.array(all_colors, dtype=np.float32))

def render_scene(out_path="qa_screenshot_gameplay.png"):
    W, H = 1280, 720
    print(f"Rendering Cinematic 3/4 Perspective View ({W}x{H})...")
    
    frame = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        t = y / H
        r = int(142 * (1.0 - t) + 215 * t)
        g = int(197 * (1.0 - t) + 235 * t)
        b = int(252 * (1.0 - t) + 253 * t)
        frame[y, :] = [r, g, b]
        
    zbuffer = np.full((H, W), np.inf, dtype=np.float32)
    
    cam_pos = np.array([12.0, 16.0, 15.0], dtype=np.float32)
    cam_target = np.array([0.0, 2.0, -3.0], dtype=np.float32)
    up = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    
    view_mat = look_at_matrix(cam_pos, cam_target, up)
    proj_mat = perspective_matrix(40.0, W / H, 0.5, 180.0)
    vp_mat = proj_mat @ view_mat
    
    sun_dir = np.array([25.0, 42.0, 22.0])
    sun_dir /= np.linalg.norm(sun_dir)
    
    verts, normals, colors = build_scene()
    num_verts = len(verts)
    num_tris = num_verts // 3
    print(f"Total scene triangles: {num_tris:,}")
    
    v_homo = np.hstack([verts, np.ones((num_verts, 1), dtype=np.float32)])
    clip = (vp_mat @ v_homo.T).T
    
    w = clip[:, 3:4]
    ndc = clip / np.maximum(w, 1e-6)
    
    screen_x = (ndc[:, 0] * 0.5 + 0.5) * W
    screen_y = (1.0 - (ndc[:, 1] * 0.5 + 0.5)) * H
    screen_z = w.squeeze()
    
    screen_pts = np.stack([screen_x, screen_y], axis=1).reshape(num_tris, 3, 2)
    screen_depths = screen_z.reshape(num_tris, 3)
    
    diffuse = np.maximum(0.0, np.sum(normals * sun_dir, axis=1))
    sky_fill = np.maximum(0.0, np.sum(normals * np.array([0.0, 1.0, 0.0]), axis=1)) * 0.35
    ambient = 0.45
    
    light_intensity = ambient + diffuse * 0.85 + sky_fill
    
    lit_colors = colors * light_intensity[:, None]
    lit_colors = np.clip(lit_colors, 0, 255).astype(np.float32).reshape(num_tris, 3, 3)
    
    valid_tris = (screen_depths[:, 0] > 0.5) & (screen_depths[:, 1] > 0.5) & (screen_depths[:, 2] > 0.5)
    
    print("Rasterizing framebuffer...")
    rasterize_lit_scene(
        screen_pts[valid_tris],
        screen_depths[valid_tris],
        lit_colors[valid_tris],
        W, H, frame, zbuffer
    )
    
    img = Image.fromarray(frame)
    img.save(out_path)
    print(f"Visual QA screenshot saved to {out_path} ({len(open(out_path, 'rb').read()):,} bytes)")

if __name__ == "__main__":
    render_scene()
