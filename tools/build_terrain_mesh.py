"""
Builds the 3D Terrain System for the Environment Pipeline Test Scene.
Features:
- Organic elevation:
  - Hill slope (z <= -10): y = 2.0m to 4.5m
  - Village terrace (-10 < z <= 0): y = 1.5m to 0.9m
  - Sloping beach (0 < z <= 3.5): y = 0.9m down to 0.0m (shoreline)
  - Ocean seabed (z > 3.5): y = -0.1m down to -2.0m (submerged)
- High-res repeating UV coordinates for PBR textures
"""

import math
import numpy as np
from PIL import Image
import trimesh

def build_test_terrain():
    print("Building Organic 3D Terrain System with Clear Shoreline...")
    
    mat_sand = trimesh.visual.material.PBRMaterial(
        name="beach_sand",
        baseColorTexture=Image.open("assets/textures/beach_sand_albedo.png").convert("RGB"),
        normalTexture=Image.open("assets/textures/beach_sand_normal.png").convert("RGB"),
        roughnessFactor=0.9,
        metallicFactor=0.0
    )
    
    mat_grass = trimesh.visual.material.PBRMaterial(
        name="coastal_grass",
        baseColorTexture=Image.open("assets/textures/coastal_grass_albedo.png").convert("RGB"),
        normalTexture=Image.open("assets/textures/coastal_grass_normal.png").convert("RGB"),
        roughnessFactor=0.85,
        metallicFactor=0.0
    )
    
    size_x = 48.0
    size_z = 48.0
    res_x = 80
    res_z = 80
    
    verts = []
    uvs = []
    
    for r in range(res_z):
        tz = r / (res_z - 1)
        z = (tz - 0.5) * size_z
        
        for c in range(res_x):
            tx = c / (res_x - 1)
            x = (tx - 0.5) * size_x
            
            # Organic noise contours
            noise = math.sin(x * 0.22) * math.cos(z * 0.18) * 0.35 + math.sin(x * 0.45) * math.cos(z * 0.35) * 0.18

            if z > 3.0:
                # Submerged seabed sloping into ocean
                t_sea = (z - 3.0) / 10.0
                y = -0.15 - t_sea * 1.5 + min(0.0, noise * 0.5)
            elif z > -0.5 and z <= 3.0:
                # Sloping beach from village down to water line
                t_beach = (3.0 - z) / 3.5
                y = t_beach * 0.85 + noise * 0.4
            elif z <= -0.5 and z > -10.0:
                # Village plateau
                t_plat = (-z) / 10.0
                y = 0.85 + t_plat * 0.95 + noise
            else:
                # Inland hill slope
                t_hill = (-10.0 - z) / (size_z * 0.5 - 10.0)
                y = 1.8 + t_hill * 3.2 + noise
                
            verts.append([x, y, z])
            # High-resolution tiled UVs (12 repeats across 48m -> ~4m per texture tile)
            uvs.append([tx * 12.0, tz * 12.0])
            
    verts = np.array(verts, dtype=np.float32)
    uvs = np.array(uvs, dtype=np.float32)
    
    faces_sand = []
    faces_grass = []
    
    for r in range(res_z - 1):
        for c in range(res_x - 1):
            v0 = r * res_x + c
            v1 = r * res_x + (c + 1)
            v2 = (r + 1) * res_x + c
            v3 = (r + 1) * res_x + (c + 1)
            
            avg_z = (verts[v0, 2] + verts[v1, 2] + verts[v2, 2] + verts[v3, 2]) / 4.0
            
            if avg_z > -1.0:
                faces_sand.extend([[v0, v2, v1], [v1, v2, v3]])
            else:
                faces_grass.extend([[v0, v2, v1], [v1, v2, v3]])
                
    mesh_sand = trimesh.Trimesh(vertices=verts, faces=np.array(faces_sand, dtype=np.int32), process=True)
    mesh_sand.visual = trimesh.visual.TextureVisuals(uv=uvs, material=mat_sand)
    
    mesh_grass = trimesh.Trimesh(vertices=verts, faces=np.array(faces_grass, dtype=np.int32), process=True)
    mesh_grass.visual = trimesh.visual.TextureVisuals(uv=uvs, material=mat_grass)
    
    scene = trimesh.Scene([mesh_sand, mesh_grass])
    out_path = "assets/models/terrain/pipeline_terrain.glb"
    glb_data = scene.export(file_type="glb")
    with open(out_path, "wb") as f:
        f.write(glb_data)
    print(f"Exported {out_path} ({len(glb_data):,} bytes)")

if __name__ == "__main__":
    build_test_terrain()
