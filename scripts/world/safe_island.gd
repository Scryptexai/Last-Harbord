extends Node3D

# ==============================================================================
# Safe Island — Hub Utama Pulau Penyintas (Godot 4)
# Geografi Terintegrasi:
#   Desa (Village di dataran tinggi)
#      ↓
#   Jalan Setapak (Path menurun di antara pepohonan)
#      ↓
#   Dermaga (Dock terpancang menyatu di bebatuan pantai)
#      ↓
#   Perahu (Boat bersandar di air laut)
# ==============================================================================

@onready var player: CharacterBody3D = $Player
@onready var boat: Node3D = $Dock/Boat
@onready var camera_rig: Node3D = $IsometricCamera
@onready var hud: CanvasLayer = $HUD

func _ready() -> void:
	print("[SafeIsland] Pulau Aman dimuat. Geografi: Desa -> Jalan -> Dermaga -> Perahu.")
	
	# Hubungkan kamera ke player
	if camera_rig and player:
		camera_rig.target = player
	
	# Sinkronisasi status awal komunitas
	var gm = get_node_or_null("/root/GameManager")
	if gm and hud:
		hud.update_stockpile(gm.community_stockpile)
		gm.community_stockpile_changed.connect(hud.update_stockpile)

func _on_boat_player_boarded() -> void:
	print("[SafeIsland] Pemain berlayar meninggalkan Safe Island...")
