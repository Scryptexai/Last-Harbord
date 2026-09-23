"""
High-Resolution PBR Texture Generator for Realistic Survival Assets.
Generates Albedo, Normal Map (Sobel tangent-space), and Roughness/Metallic maps.
"""

import os
import numpy as np
from PIL import Image
from scipy.ndimage import sobel, gaussian_filter

OUT_DIR = "assets/textures"
os.makedirs(OUT_DIR, exist_ok=True)

def height_to_normal(height_map, strength=4.0):
    """Computes a tangent-space normal map from a height map using Sobel filters."""
    h = height_map.astype(np.float32) / 255.0
    dx = sobel(h, axis=1) * strength
    dy = sobel(h, axis=0) * strength
    dz = np.ones_like(h)
    norm = np.sqrt(dx**2 + dy**2 + dz**2) + 1e-6
    nx = (-dx / norm) * 0.5 + 0.5
    ny = (-dy / norm) * 0.5 + 0.5
    nz = (dz / norm) * 0.5 + 0.5
    normal_map = np.stack([nx, ny, nz], axis=-1) * 255.0
    return normal_map.clip(0, 255).astype(np.uint8)

def perlin_noise(shape, scale=32):
    """Generates smooth 2D value noise."""
    res = (shape[0] // scale + 1, shape[1] // scale + 1)
    grid = np.random.rand(*res)
    img = Image.fromarray((grid * 255).astype(np.uint8))
    img = img.resize((shape[1], shape[0]), Image.BICUBIC)
    return np.array(img, dtype=np.float32)

def generate_wood():
    print("Generating Wood PBR...")
    W, H = 512, 512
    y_coords = np.linspace(0, 16, H)[:, None]
    
    # Planks and grain
    plank_stripes = np.abs(np.sin(y_coords * np.pi)) ** 0.3
    grain = np.sin(np.linspace(0, 60, W)[None, :] + np.sin(y_coords * 4) * 3) * 0.5 + 0.5
    fine_noise = perlin_noise((H, W), 8) / 255.0
    
    height = (plank_stripes * 0.4 + grain * 0.4 + fine_noise * 0.2) * 255
    normal = height_to_normal(height, strength=3.5)
    
    # Albedo: weathered warm brown planks with darker grooves
    base_color = np.array([120, 85, 52], dtype=np.float32)
    variation = (grain * 0.4 + fine_noise * 0.6)[:, :, None]
    albedo = base_color * (0.7 + variation * 0.5)
    # Darker seams between planks
    seams = (np.abs(np.sin(y_coords * np.pi)) < 0.15)[:, :, None]
    albedo[seams.squeeze()] *= 0.45
    albedo = albedo.clip(0, 255).astype(np.uint8)
    
    # Roughness: 0.65 to 0.95
    roughness = (0.7 + fine_noise * 0.25) * 255
    roughness = roughness.clip(0, 255).astype(np.uint8)
    
    Image.fromarray(albedo).save(f"{OUT_DIR}/wood_albedo.png")
    Image.fromarray(normal).save(f"{OUT_DIR}/wood_normal.png")
    Image.fromarray(roughness).save(f"{OUT_DIR}/wood_roughness.png")

def generate_corrugated_metal():
    print("Generating Corrugated Metal PBR...")
    W, H = 512, 512
    x_coords = np.linspace(0, 32, W)[None, :]
    
    # Wave ridges
    ridges = np.sin(x_coords * np.pi) * 0.5 + 0.5
    rust_spots = perlin_noise((H, W), 16) / 255.0
    rust_mask = (rust_spots > 0.55).astype(np.float32) * rust_spots
    
    height = (ridges * 0.8 + rust_mask * 0.2) * 255
    normal = height_to_normal(height, strength=6.0)
    
    # Galvanized steel base + oxidized orange/brown rust
    metal_gray = np.array([140, 145, 150], dtype=np.float32)
    rust_color = np.array([135, 55, 25], dtype=np.float32)
    
    albedo = metal_gray * (0.8 + ridges[:, :, None] * 0.2)
    albedo = albedo * (1 - rust_mask[:, :, None]) + rust_color * rust_mask[:, :, None]
    albedo = albedo.clip(0, 255).astype(np.uint8)
    
    # Metalness: 0.85 on clean metal, 0.05 on rust
    metalness = ((1.0 - rust_mask) * 0.85) * 255
    # Roughness: 0.35 on metal, 0.9 on rust
    roughness = (0.35 + rust_mask * 0.55) * 255
    
    # glTF metallicRoughness texture: Green channel = Roughness, Blue channel = Metalness
    pbr_combined = np.zeros((H, W, 3), dtype=np.uint8)
    pbr_combined[:, :, 1] = roughness.clip(0, 255).astype(np.uint8)
    pbr_combined[:, :, 2] = metalness.clip(0, 255).astype(np.uint8)
    
    Image.fromarray(albedo).save(f"{OUT_DIR}/metal_albedo.png")
    Image.fromarray(normal).save(f"{OUT_DIR}/metal_normal.png")
    Image.fromarray(pbr_combined).save(f"{OUT_DIR}/metal_pbr.png")

def generate_rock():
    print("Generating Rock PBR...")
    W, H = 512, 512
    c1 = perlin_noise((H, W), 32) / 255.0
    c2 = perlin_noise((H, W), 12) / 255.0
    c3 = perlin_noise((H, W), 4) / 255.0
    
    height = (c1 * 0.5 + c2 * 0.35 + c3 * 0.15) * 255
    normal = height_to_normal(height, strength=5.0)
    
    base = np.array([115, 118, 122], dtype=np.float32)
    mineral = (c2 * 0.6 + c3 * 0.4)[:, :, None]
    albedo = base * (0.75 + mineral * 0.5)
    albedo = albedo.clip(0, 255).astype(np.uint8)
    
    roughness = (0.8 + c3 * 0.18) * 255
    roughness = roughness.clip(0, 255).astype(np.uint8)
    
    Image.fromarray(albedo).save(f"{OUT_DIR}/rock_albedo.png")
    Image.fromarray(normal).save(f"{OUT_DIR}/rock_normal.png")
    Image.fromarray(roughness).save(f"{OUT_DIR}/rock_roughness.png")

def generate_palm_frond():
    print("Generating Palm Frond PBR...")
    W, H = 512, 512
    x = np.linspace(-1, 1, W)[None, :]
    y = np.linspace(0, 1, H)[:, None]
    
    # Veins radiating outwards
    vein_angle = np.abs(x) - (1 - y) * 0.1
    veins = np.sin(vein_angle * 45) * 0.5 + 0.5
    
    height = veins * 255
    normal = height_to_normal(height, strength=2.5)
    
    base_green = np.array([45, 115, 65], dtype=np.float32)
    albedo = base_green * (0.85 + veins[:, :, None] * 0.25)
    # Central stem
    stem_mask = (np.abs(x) < 0.04)[:, :, None]
    albedo[stem_mask.squeeze()] = np.array([120, 140, 70], dtype=np.float32)
    albedo = albedo.clip(0, 255).astype(np.uint8)
    
    roughness = (0.45 + veins * 0.3) * 255
    roughness = roughness.clip(0, 255).astype(np.uint8)
    
    Image.fromarray(albedo).save(f"{OUT_DIR}/leaf_albedo.png")
    Image.fromarray(normal).save(f"{OUT_DIR}/leaf_normal.png")
    Image.fromarray(roughness).save(f"{OUT_DIR}/leaf_roughness.png")

def generate_palm_bark():
    print("Generating Palm Bark PBR...")
    W, H = 512, 512
    y = np.linspace(0, 12, H)[:, None]
    x = np.linspace(0, 6, W)[None, :]
    
    rings = np.abs(np.sin(y * np.pi)) ** 0.5
    fibers = perlin_noise((H, W), 8) / 255.0
    
    height = (rings * 0.65 + fibers * 0.35) * 255
    normal = height_to_normal(height, strength=4.5)
    
    base_bark = np.array([90, 65, 45], dtype=np.float32)
    albedo = base_bark * (0.8 + fibers[:, :, None] * 0.4)
    albedo = albedo.clip(0, 255).astype(np.uint8)
    
    roughness = (0.85 + fibers * 0.12) * 255
    roughness = roughness.clip(0, 255).astype(np.uint8)
    
    Image.fromarray(albedo).save(f"{OUT_DIR}/palm_bark_albedo.png")
    Image.fromarray(normal).save(f"{OUT_DIR}/palm_bark_normal.png")
    Image.fromarray(roughness).save(f"{OUT_DIR}/palm_bark_roughness.png")

def generate_tarp():
    print("Generating Tarp PBR...")
    W, H = 512, 512
    x = np.linspace(0, 64, W)[None, :]
    y = np.linspace(0, 64, H)[:, None]
    
    # Cross weave pattern
    weave = (np.sin(x * np.pi) * np.cos(y * np.pi)) * 0.5 + 0.5
    wrinkles = perlin_noise((H, W), 24) / 255.0
    
    height = (weave * 0.3 + wrinkles * 0.7) * 255
    normal = height_to_normal(height, strength=3.5)
    
    base_blue = np.array([28, 85, 175], dtype=np.float32)
    albedo = base_blue * (0.8 + weave[:, :, None] * 0.3 + wrinkles[:, :, None] * 0.2)
    albedo = albedo.clip(0, 255).astype(np.uint8)
    
    roughness = (0.55 + wrinkles * 0.25) * 255
    roughness = roughness.clip(0, 255).astype(np.uint8)
    
    Image.fromarray(albedo).save(f"{OUT_DIR}/tarp_albedo.png")
    Image.fromarray(normal).save(f"{OUT_DIR}/tarp_normal.png")
    Image.fromarray(roughness).save(f"{OUT_DIR}/tarp_roughness.png")

def generate_rope():
    print("Generating Rope PBR...")
    W, H = 256, 256
    y = np.linspace(0, 16, H)[:, None]
    x = np.linspace(0, 8, W)[None, :]
    braid = np.sin((y + x * 0.5) * np.pi * 2) * 0.5 + 0.5
    
    height = braid * 255
    normal = height_to_normal(height, strength=4.0)
    
    base_hemp = np.array([170, 140, 95], dtype=np.float32)
    albedo = base_hemp * (0.8 + braid[:, :, None] * 0.3)
    albedo = albedo.clip(0, 255).astype(np.uint8)
    
    roughness = np.full((H, W), 220, dtype=np.uint8)
    
    Image.fromarray(albedo).save(f"{OUT_DIR}/rope_albedo.png")
    Image.fromarray(normal).save(f"{OUT_DIR}/rope_normal.png")
    Image.fromarray(roughness).save(f"{OUT_DIR}/rope_roughness.png")

if __name__ == "__main__":
    generate_wood()
    generate_corrugated_metal()
    generate_rock()
    generate_palm_frond()
    generate_palm_bark()
    generate_tarp()
    generate_rope()
    print("All PBR Textures successfully generated!")
