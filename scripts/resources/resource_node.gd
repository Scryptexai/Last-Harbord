extends Node3D

# ==============================================================================
# Resource Node (Titik Persediaan di Pulau Ekspedisi)
# Pemain berinteraksi untuk memanen material (Makanan, Kayu, Besi, Obat, BBM).
# Hasil panen mengisi palka perahu untuk dibawa pulang ke Safe Island.
# ==============================================================================

signal harvested(res_type, amount)

@export_enum("food", "wood", "metal", "medicine", "fuel") var resource_type: String = "food"
@export var amount: int = 2
@export var harvest_time: float = 1.0 # waktu memanen (detik)

@onready var interaction_area: Area3D = $InteractionArea
@onready var label_3d: Label3D = $Label3D
@onready var visual_mesh: Node3D = $VisualMesh

var is_harvested: bool = false
var harvest_progress: float = 0.0
var is_player_harvesting: bool = false

func _ready() -> void:
	_update_appearance()

func _update_appearance() -> void:
	if label_3d:
		match resource_type:
			"food":
				label_3d.text = "🌾 Peti Ransum (+" + str(amount) + ")"
			"wood":
				label_3d.text = "🪵 Tumpukan Kayu (+" + str(amount) + ")"
			"metal":
				label_3d.text = "🔩 Rongsokan Besi (+" + str(amount) + ")"
			"medicine":
				label_3d.text = "💊 Kotak Obat Klinik (+" + str(amount) + ")"
			"fuel":
				label_3d.text = "⛽ Jeriken Solar (+" + str(amount) + ")"

func get_interaction_prompt() -> String:
	if is_harvested:
		return ""
	match resource_type:
		"food": return "Tekan E untuk Panen Makanan (+" + str(amount) + ")"
		"wood": return "Tekan E untuk Ambil Kayu (+" + str(amount) + ")"
		"metal": return "Tekan E untuk Bongkar Besi (+" + str(amount) + ")"
		"medicine": return "Tekan E untuk Ambil Obat (+" + str(amount) + ")"
		"fuel": return "Tekan E untuk Ambil Solar (+" + str(amount) + ")"
	return "Tekan E untuk Panen"

func interact(player: CharacterBody3D) -> void:
	if is_harvested:
		return
	
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		if gm.get_carried_total() + amount > gm.boat_capacity:
			var hud = get_tree().get_first_node_in_group("hud")
			if hud and hud.has_method("show_prompt"):
				hud.show_prompt("⚠️ Palka Perahu Penuh! Kembali ke dermaga.")
			return
		
		var added = gm.add_cargo(resource_type, amount)
		if added:
			is_harvested = true
			harvested.emit(resource_type, amount)
			_play_harvest_feedback()

func _play_harvest_feedback() -> void:
	var tween = create_tween()
	tween.tween_property(self, "scale", Vector3(1.2, 1.2, 1.2), 0.1)
	tween.tween_property(self, "scale", Vector3(0.01, 0.01, 0.01), 0.2)
	tween.tween_callback(queue_free)
