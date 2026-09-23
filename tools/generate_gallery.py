import glob
import os

assets = sorted(glob.glob('assets/environment/**/*.glb', recursive=True))

header = """[gd_scene load_steps=2 format=3 uid="uid://asset_gallery"]

[ext_resource type="Environment" uid="uid://df5wrtn0sffn4" path="res://scenes/world/DefaultEnv.tres" id="1_env"]

[node name="EnvironmentAssetGallery" type="Node3D"]

[node name="DirectionalLight3D" type="DirectionalLight3D" parent="."]
transform = Transform3D(-0.866025, -0.433013, 0.25, 0, 0.5, 0.866025, -0.5, 0.75, -0.433013, 0, 10, 0)
shadow_enabled = true

[node name="WorldEnvironment" type="WorldEnvironment" parent="."]
environment = ExtResource("1_env")

"""

ext_resources = []
nodes = []

categories = {}
# Group by folder
for path in assets:
    folder = os.path.basename(os.path.dirname(path))
    if folder not in categories:
        categories[folder] = []
    categories[folder].append(path)

ext_id = 2
for folder, items in categories.items():
    nodes.append(f'[node name="{folder.upper()}" type="Node3D" parent="."]')
    nodes.append(f'transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0)')
    
    # Layout items in a grid for this category
    for i, path in enumerate(items):
        name = os.path.basename(path).replace('.glb', '')
        
        # Add ext resource
        ext_resources.append(f'[ext_resource type="PackedScene" uid="uid://{name}_{ext_id}" path="res://{path}" id="{ext_id}_glb"]')
        
        # Position
        row = i // 5
        col = i % 5
        # Category offset
        cat_idx = list(categories.keys()).index(folder)
        z_offset = cat_idx * 10
        x_pos = col * 4 - 8
        z_pos = row * 4 + z_offset - 10
        
        nodes.append(f'[node name="{name}" parent="{folder.upper()}" instance=ExtResource("{ext_id}_glb")]')
        nodes.append(f'transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, {x_pos}, 0, {z_pos})')
        
        ext_id += 1

with open('scenes/test/environment_asset_gallery.tscn', 'w') as f:
    f.write(header)
    f.write('\n'.join(ext_resources) + '\n\n')
    f.write('\n'.join(nodes))

print("Gallery generated!")
