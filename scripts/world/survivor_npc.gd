extends Node3D

# ==============================================================================
# Survivor NPC (Penyintas di Safe Island)
# Menghuni area desa di pulau perlindungan aman.
# Memberikan dialog, misi persediaan, dan konteks cerita bahwa hasil jarahan
# pemain sangat dibutuhkan untuk menyambung hidup komunitas.
# ==============================================================================

signal talked_to_player(npc_name, message)

@export var npc_name: String = "Paman Jamil"
@export var role: String = "Pengelola Gudang"
@export_multiline var dialogue: String = "Persediaan obat dan makanan kita hampir habis. Kalau kau berlayar hari ini, berhati-hatilah saat pasang naik."

@onready var prompt_label: Label3D = $PromptLabel

func _ready() -> void:
	if prompt_label:
		prompt_label.text = npc_name + " (" + role + ")"
		prompt_label.visible = false

func get_interaction_prompt() -> String:
	return "Tekan E untuk Bicara dengan " + npc_name

func interact(player: CharacterBody3D) -> void:
	print("[NPC] " + npc_name + ": " + dialogue)
	talked_to_player.emit(npc_name, dialogue)
	var ui = get_tree().get_first_node_in_group("hud")
	if ui and ui.has_method("show_dialogue"):
		ui.show_dialogue(npc_name, role, dialogue)
