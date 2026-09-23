extends Node3D

# ==============================================================================
# Boat (Perahu Ekspedisi)
# Bersandar di dermaga Safe Island, menjadi sarana transportasi menuju
# pulau ekspedisi dan tempat penyimpanan muatan palka.
# ==============================================================================

signal player_boarded()

@export var boat_name: String = "Harbor Skiff Lv.1"
@export var capacity: int = 12

@onready var interaction_area: Area3D = $InteractionArea
@onready var visual_boat: Node3D = $VisualBoat

var bob_time: float = 0.0

func _process(delta: float) -> void:
	# Efek gelombang air laut lembut saat bersandar
	bob_time += delta * 1.8
	visual_boat.position.y = sin(bob_time) * 0.06
	visual_boat.rotation.z = sin(bob_time * 0.8) * 0.025
	visual_boat.rotation.x = cos(bob_time * 0.7) * 0.015

func get_interaction_prompt() -> String:
	return "Tekan E untuk Naik Perahu & Buka Peta Ekspedisi"

func interact(player: CharacterBody3D) -> void:
	print("[Boat] Pemain menaiki perahu di dermaga.")
	player_boarded.emit()
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		gm.start_expedition("Island_A")
