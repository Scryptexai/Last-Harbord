extends Node3D

# ==============================================================================
# Last Harbor - World (Godot 4)
# Mengelola Laut Lepas (Open Sea Archipelago):
#  - Pulau Suaka (Haven Sanctuary) di tengah laut lepas (aman tanpa zombie)
#  - Cincin Kepulauan Terinfeksi (Ring 1-3) berjenjang bahaya & sumber daya
#  - Perahu pemain dengan fisika inersia dan limit kapasitas kargo palka
#  - Siklus pasang surut dinamis dan navigasi kompas
# ==============================================================================

@onready var boat: CharacterBody3D = $Boat if has_node("Boat") else null
@onready var sun_light: DirectionalLight3D = $SunLight if has_node("SunLight") else null
@onready var compass_label: Label = $CanvasLayer/SeaHUD/CompassLabel if has_node("CanvasLayer/SeaHUD/CompassLabel") else null
@onready var tide_label: Label = $CanvasLayer/SeaHUD/TideLabel if has_node("CanvasLayer/SeaHUD/TideLabel") else null
@onready var cargo_label: Label = $CanvasLayer/SeaHUD/CargoLabel if has_node("CanvasLayer/SeaHUD/CargoLabel") else null

func _ready() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		gm.current_state = 1 # OPEN_SEA
		gm.cargo_changed.connect(_update_cargo_display)
		
	var ts = get_node_or_null("/root/TideSystem")
	if ts:
		ts.tide_phase_changed.connect(_on_tide_phase_changed)
		ts.flood_level_changed.connect(_on_flood_level_changed)
		_on_tide_phase_changed(ts.get_phase_name())
		
	_update_cargo_display()

func _process(_delta: float) -> void:
	if boat and compass_label:
		var heading_deg = int(rad_to_deg(boat.rotation.y)) % 360
		if heading_deg < 0:
			heading_deg += 360
		compass_label.text = "🧭 HALUAN: %d° | KOOR: (%d, %d)" % [
			heading_deg, int(boat.position.x), int(boat.position.z)
		]

func _on_tide_phase_changed(phase_name: String) -> void:
	var ts = get_node_or_null("/root/TideSystem")
	if tide_label:
		var night_num = ts.night_count if ts else 1
		tide_label.text = "🌊 PASANG: %s (Malam ke-%d)" % [phase_name, night_num]
		if ts:
			match ts.current_phase:
				0: tide_label.modulate = Color(0.95, 0.95, 0.4) # CALM
				1: tide_label.modulate = Color(1.0, 0.6, 0.2)   # TURNING
				2: tide_label.modulate = Color(1.0, 0.2, 0.2)   # HIGH
				3: tide_label.modulate = Color(0.4, 0.8, 1.0)   # DAWN

func _on_flood_level_changed(flood_ratio: float) -> void:
	if sun_light:
		var dark = lerp(1.15, 0.25, flood_ratio)
		var red_tint = lerp(1.0, 0.95, flood_ratio)
		var blue_tint = lerp(0.85, 0.45, flood_ratio)
		sun_light.light_color = Color(red_tint, dark, blue_tint, 1.0)
		sun_light.light_energy = dark

func _update_cargo_display() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if cargo_label and gm:
		var carried = gm.get_total_carried()
		var max_cap = gm.get_palka_capacity()
		cargo_label.text = "📦 PALKA: %d / %d" % [carried, max_cap]
		if carried >= max_cap:
			cargo_label.modulate = Color(1.0, 0.2, 0.2)
		else:
			cargo_label.modulate = Color(1.0, 1.0, 1.0)

func _on_sanctuary_dock_entered(body: Node3D) -> void:
	if body == boat:
		print("[World] Perahu merapat di Dermaga Pulau Suaka! Beralih ke adegan Pulau Suaka...")
		get_tree().change_scene_to_file("res://scenes/SanctuaryIsland.tscn")

func _on_infested_island_entered(body: Node3D, island_tier: int) -> void:
	if body == boat:
		print("[World] Perahu mendarat di Pulau Terinfeksi (Tier %d)! Menurunkan jangkar..." % island_tier)
		var gm = get_node_or_null("/root/GameManager")
		if gm:
			gm.selected_expedition_island = gm.islands_data[clampi(island_tier - 1, 0, 2)]
		get_tree().change_scene_to_file("res://scenes/InfestedIsland.tscn")
