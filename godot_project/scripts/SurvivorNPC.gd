extends CharacterBody2D

# ==============================================================================
# Last Harbor - SurvivorNPC (Godot 4)
# Karakter korban selamat di Pulau Suaka.
# Memberikan dialog, misi bantuan resource, dan menyuarakan keputusasaan/harapan koloni.
# ==============================================================================

enum NPCRole { ELDER_ARIS, DOCTOR_MAYA, SHIPWRIGHT_BUDI, REFUGEE_FAMILY }
@export var role: NPCRole = NPCRole.ELDER_ARIS

@onready var dialogue_label: Label = $DialogueBubble/Label if has_node("DialogueBubble/Label") else null
@onready var bubble_node: Node2D = $DialogueBubble if has_node("DialogueBubble") else null

var player_near: bool = false

func _ready() -> void:
	if bubble_node:
		bubble_node.visible = false

func _on_interaction_area_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_near = true
		show_dialogue()

func _on_interaction_area_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		player_near = false
		if bubble_node:
			bubble_node.visible = false

func show_dialogue() -> void:
	if not bubble_node or not dialogue_label:
		return
	
	bubble_node.visible = true
	match role:
		NPCRole.ELDER_ARIS:
			if GameManager.banked_storage["food"] < 3:
				dialogue_label.text = "Kakek Aris: 'Anak-anak kelaparan, nak. Tolong prioritaskan makanan dari perahu.'"
			else:
				dialogue_label.text = "Kakek Aris: 'Terima kasih telah berlayar demi kami. Lautan ganas, selalu waspada!'"
		NPCRole.DOCTOR_MAYA:
			if GameManager.banked_storage["medicine"] < 2:
				dialogue_label.text = "Dokter Maya: 'Banyak pengungsi demam tinggi! Kami sangat membutuhkan Pasokan Obat.'"
			else:
				dialogue_label.text = "Dokter Maya: 'Obat yang kau bawa menyelamatkan korban gigitan. Tetaplah selamat di luar sana.'"
		NPCRole.SHIPWRIGHT_BUDI:
			dialogue_label.text = "Budi: 'Palka perahu awalmu hanya muat 10 barang! Kumpulkan Kayu & Solar di meja kerjaku untuk memasang Palka I (+6 slot).'"
		NPCRole.REFUGEE_FAMILY:
			dialogue_label.text = "Pengungsi: 'Pulau ini satu-satunya rumah kita yang tersisa dari wabah zombie.'"
