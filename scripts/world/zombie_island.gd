extends Node3D

# ==============================================================================
# Zombie Island 1 — Pulau Ekspedisi Pertama (Vertical Slice)
# Biome:
#   1. Pantai & Dermaga Pendaratan (Beach & Moored Boat)
#   2. Hutan Kecil (Forest with Timber & lurking Runner)
#   3. Reruntuhan Klinik & Gudang (Ruins with Medicine, Food, Metal & Walkers)
# ==============================================================================

@onready var player: CharacterBody3D = $Player
@onready var camera_rig: Node3D = $IsometricCamera
@onready var hud: CanvasLayer = $HUD
@onready var boat: Node3D = $LandingBeach/Boat

func _ready() -> void:
	print("[ZombieIsland] Mendarat di Pulau Zombie Pertama.")
	if camera_rig and player:
		camera_rig.target = player
	
	var gm = get_node_or_null("/root/GameManager")
	if gm and hud:
		hud.update_cargo(gm.carried_cargo, gm.boat_capacity)
		gm.inventory_changed.connect(hud.update_cargo)
	
	if boat:
		boat.player_boarded.connect(_on_boat_extracted)

func _on_boat_extracted() -> void:
	print("[ZombieIsland] Pemain kembali ke perahu dan berlayar pulang!")
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		gm.return_to_safe_island()
