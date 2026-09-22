extends Node3D

# ==============================================================================
# Last Harbor - Main Coordinator (Godot 4)
# Menghubungkan transisi antara Pulau Suaka (Haven Sanctuary),
# Pelayaran Laut Lepas (World), dan Ekspedisi Pulau Terinfeksi (Infested Island).
# ==============================================================================

@onready var scene_container: Node3D = $SceneContainer

func _ready() -> void:
	print("[Main] Menginisialisasi Last Harbor (Godot 4 2.5D Arena)...")
	load_scene("res://scenes/SanctuaryIsland.tscn")

func load_scene(scene_path: String) -> void:
	for child in scene_container.get_children():
		child.queue_free()
		
	var new_scene = load(scene_path).instantiate()
	scene_container.add_child(new_scene)
	print("[Main] Adegan aktif berhasil dimuat: ", scene_path)
