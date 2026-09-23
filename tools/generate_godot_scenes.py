"""
Generates Godot 4 .tscn files for all 28 GLB assets, with CollisionShape3D where appropriate.
"""

import os

MODELS = [
    ("vegetation", "coconut_palm", "CoconutPalm", True, 0.4, 7.0),
    ("vegetation", "tropical_tree", "TropicalTree", True, 0.6, 5.0),
    ("vegetation", "dead_tree", "DeadTree", True, 0.4, 4.2),
    ("vegetation", "tropical_bush", "TropicalBush", False, 0.0, 0.0),
    ("vegetation", "tall_grass", "TallGrass", False, 0.0, 0.0),
    ("vegetation", "small_plants", "SmallPlants", False, 0.0, 0.0),
    ("vegetation", "fallen_branch", "FallenBranch", False, 0.0, 0.0),
    ("rocks", "rock_small", "RockSmall", True, 0.4, 0.4),
    ("rocks", "rock_medium", "RockMedium", True, 0.9, 0.9),
    ("rocks", "rock_large", "RockLarge", True, 1.8, 1.8),
    ("rocks", "cliff_rock", "CliffRock", True, 1.8, 4.5),
    ("architecture", "survivor_cabin", "SurvivorCabin", True, 5.2, 3.2),
    ("architecture", "fishing_hut", "FishingHut", True, 3.6, 2.5),
    ("architecture", "storage_shed", "StorageShed", True, 2.8, 2.4),
    ("architecture", "wooden_dock", "WoodenDock", True, 2.8, 0.6),
    ("boats", "survivor_boat", "SurvivorBoat", True, 1.8, 0.9),
    ("props", "wooden_crate", "WoodenCrate", True, 0.85, 0.85),
    ("props", "barrel", "Barrel", True, 0.4, 0.95),
    ("props", "rope", "Rope", False, 0.0, 0.0),
    ("props", "fishing_net", "FishingNet", False, 0.0, 0.0),
    ("props", "lantern", "Lantern", False, 0.0, 0.0),
    ("props", "wooden_plank", "WoodenPlank", False, 0.0, 0.0),
    ("props", "toolbox", "Toolbox", False, 0.0, 0.0),
    ("props", "water_container", "WaterContainer", False, 0.0, 0.0),
    ("props", "fuel_container", "FuelContainer", False, 0.0, 0.0),
    ("props", "scrap_metal", "ScrapMetal", False, 0.0, 0.0),
    ("props", "campfire", "Campfire", True, 0.8, 0.5),
    ("props", "debris", "Debris", False, 0.0, 0.0),
]

def generate():
    for category, glb_name, class_name, has_collision, r, h in MODELS:
        folder = f"scenes/models/{category}"
        os.makedirs(folder, exist_ok=True)
        tscn_path = f"{folder}/{class_name}.tscn"
        glb_res = f"res://assets/models/{category}/{glb_name}.glb"
        
        content = f"""[gd_scene load_steps=3 format=3]

[ext_resource type="PackedScene" path="{glb_res}" id="1_model"]

[node name="{class_name}" type="StaticBody3D"]

[node name="VisualModel" parent="." instance=ExtResource("1_model")]
"""
        if has_collision:
            content += f"""
[node name="CollisionShape3D" type="CollisionShape3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, {h*0.5:.2f}, 0)
"""
        with open(tscn_path, "w") as f:
            f.write(content)
        print(f"Generated {tscn_path}")

if __name__ == "__main__":
    generate()
