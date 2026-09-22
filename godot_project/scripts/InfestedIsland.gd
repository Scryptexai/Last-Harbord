extends Node3D

# ==============================================================================
# Last Harbor - InfestedIsland (Godot 4)
# Mengelola Pulau Terinfeksi Zombie Berjenjang (Tier 1 - 3).
# Setiap pulau memiliki karakteristik visual, musuh, dan kekayaan resource berbeda:
#  - Tier 1: Pantai Dangkal (Shallows) - Zombi lambat, kayu & makanan
#  - Tier 2: Kepulauan Karam (Sunken Ruins) - Zombi pelari & berzirah, solar & logam
#  - Tier 3: Karang Maut (Blood Reef) - Zombi raksasa, obat-obatan langka & badai
# ==============================================================================

@export var island_tier: int = 1
@export var island_radius: float = 35.0

@onready var water_mesh: MeshInstance3D = $OceanWater if has_node("OceanWater") else null
@onready var nodes_container: Node3D = $ResourceNodes if has_node("ResourceNodes") else null
@onready var zombies_container: Node3D = $Zombies if has_node("Zombies") else null
@onready var player_node: CharacterBody3D = $Player if has_node("Player") else null
@onready var tier_hud_label: Label = $CanvasLayer/IslandHUD/TierLabel if has_node("CanvasLayer/IslandHUD/TierLabel") else null
@onready var cargo_hud_label: Label = $CanvasLayer/IslandHUD/CargoLabel if has_node("CanvasLayer/IslandHUD/CargoLabel") else null

var zombie_scene = preload("res://scenes/Zombie.tscn")

func _ready() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		gm.current_state = 2 # COMBAT_ISLAND
		var isl_data = gm.selected_expedition_island
		if not isl_data.is_empty():
			island_tier = isl_data.get("threat_level", 1)
		gm.cargo_changed.connect(_update_cargo_hud)
		
	setup_island_environment()
	spawn_resources()
	spawn_zombies()
	
	var ts = get_node_or_null("/root/TideSystem")
	if ts:
		ts.flood_level_changed.connect(_on_tide_flood_changed)
	_update_cargo_hud()

func setup_island_environment() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if tier_hud_label and gm:
		var isl_data = gm.selected_expedition_island
		var isl_name = isl_data.get("name", "Pulau Tak Bertuan")
		tier_hud_label.text = "⚠️ %s (TIER %d) | Bahaya: %s" % [
			isl_name, island_tier, isl_data.get("richness", "Normal")
		]
		match island_tier:
			1: tier_hud_label.modulate = Color(0.95, 0.95, 0.4)
			2: tier_hud_label.modulate = Color(1.0, 0.6, 0.2)
			3: tier_hud_label.modulate = Color(1.0, 0.2, 0.2)

func spawn_resources() -> void:
	if not nodes_container:
		return
	var count = 8 + (island_tier * 4)
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	
	var res_types = ["wood", "food"]
	if island_tier >= 2:
		res_types.append("fuel")
	if island_tier >= 3:
		res_types.append("medicine")
		
	for i in range(count):
		var angle = rng.randf_range(0.0, TAU)
		var dist = rng.randf_range(5.0, island_radius * 0.75)
		var pos = Vector3(cos(angle) * dist, 1.2, sin(angle) * dist)
		
		var type = res_types[rng.randi() % res_types.size()]
		create_resource_node(pos, type)

func create_resource_node(pos: Vector3, type: String) -> void:
	var area = Area3D.new()
	area.position = pos
	area.collision_layer = 0
	area.collision_mask = 2 # Player
	
	var col = CollisionShape3D.new()
	var shape = SphereShape3D.new()
	shape.radius = 1.8
	col.shape = shape
	area.add_child(col)
	
	var mesh_inst = MeshInstance3D.new()
	var box = BoxMesh.new()
	box.size = Vector3(0.8, 0.8, 0.8)
	mesh_inst.mesh = box
	
	var mat = StandardMaterial3D.new()
	var color_map = {
		"wood": Color(0.65, 0.45, 0.2),
		"fuel": Color(0.85, 0.75, 0.15),
		"food": Color(0.2, 0.75, 0.35),
		"medicine": Color(0.2, 0.6, 0.95)
	}
	mat.albedo_color = color_map.get(type, Color.WHITE)
	mesh_inst.set_surface_override_material(0, mat)
	area.add_child(mesh_inst)
	
	area.body_entered.connect(func(body):
		if body.is_in_group("player"):
			var gm = get_node_or_null("/root/GameManager")
			if gm:
				var success = gm.add_resource_to_cargo(type, 1)
				if success:
					print("[Harvest] Mengambil %s! Sisa slot palka: %d" % [
						type, gm.get_palka_capacity() - gm.get_total_carried()
					])
					area.queue_free()
				else:
					print("[Palka Penuh] Kapasitas perahu sudah maksimal! Kembali ke dermaga!")
	)
	
	nodes_container.add_child(area)

func spawn_zombies() -> void:
	if not zombies_container:
		return
	var count = 5 + (island_tier * 5)
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	
	for i in range(count):
		var z = zombie_scene.instantiate()
		var angle = rng.randf_range(0.0, TAU)
		var dist = rng.randf_range(10.0, island_radius * 0.85)
		z.position = Vector3(cos(angle) * dist, 1.0, sin(angle) * dist)
		
		match island_tier:
			1:
				z.tier = 0 # TIER1_SCAVENGER
			2:
				z.tier = 2 if rng.randf() < 0.55 else 1 # TIER2_RUNNER / ARMORED
			3:
				z.tier = 3 if rng.randf() < 0.65 else 2 # TIER3_NIGHT_TERROR / RUNNER
				
		zombies_container.add_child(z)

func _on_tide_flood_changed(flood_ratio: float) -> void:
	if water_mesh:
		water_mesh.position.y = lerp(-0.2, 0.75, flood_ratio)
	
	if player_node:
		var dist_to_center = Vector2(player_node.position.x, player_node.position.z).length()
		if dist_to_center > (island_radius * 0.65) and flood_ratio > 0.4:
			player_node.move_speed = 3.8
		else:
			player_node.move_speed = 6.5

func _update_cargo_hud() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if cargo_hud_label and gm:
		var carried = gm.get_total_carried()
		var max_cap = gm.get_palka_capacity()
		cargo_hud_label.text = "📦 PALKA: %d / %d %s" % [
			carried, max_cap, "(PENUH!)" if carried >= max_cap else ""
		]
		cargo_hud_label.modulate = Color(1, 0.3, 0.3) if carried >= max_cap else Color(1, 1, 1)

func _on_boat_anchor_area_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		print("[Pulau Terinfeksi] Pemain kembali ke perahu! Siap berlayar pulang ke Pulau Suaka.")
