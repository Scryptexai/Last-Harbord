<<<<<<< HEAD
extends CharacterBody3D
=======
extends CharacterBody2D
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5

# ==============================================================================
# Last Harbor - SurvivorNPC (Godot 4)
# Karakter korban selamat di Pulau Suaka.
# Memberikan dialog, misi bantuan resource, dan menyuarakan keputusasaan/harapan koloni.
# ==============================================================================

enum NPCRole { ELDER_ARIS, DOCTOR_MAYA, SHIPWRIGHT_BUDI, REFUGEE_FAMILY }
@export var role: NPCRole = NPCRole.ELDER_ARIS

<<<<<<< HEAD
@onready var dialogue_label: Label = $CanvasLayer/DialogueBubble/Label if has_node("CanvasLayer/DialogueBubble/Label") else null
@onready var bubble_node: Control = $CanvasLayer/DialogueBubble if has_node("CanvasLayer/DialogueBubble") else null
=======
@onready var dialogue_label: Label = $DialogueBubble/Label if has_node("DialogueBubble/Label") else null
@onready var bubble_node: Node2D = $DialogueBubble if has_node("DialogueBubble") else null
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5

var player_near: bool = false

func _ready() -> void:
	if bubble_node:
		bubble_node.visible = false

<<<<<<< HEAD
func _on_interaction_area_body_entered(body: Node3D) -> void:
=======
func _on_interaction_area_body_entered(body: Node2D) -> void:
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
	if body.is_in_group("player"):
		player_near = true
		show_dialogue()

<<<<<<< HEAD
func _on_interaction_area_body_exited(body: Node3D) -> void:
=======
func _on_interaction_area_body_exited(body: Node2D) -> void:
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
	if body.is_in_group("player"):
		player_near = false
		if bubble_node:
			bubble_node.visible = false

func show_dialogue() -> void:
	if not bubble_node or not dialogue_label:
		return
	
<<<<<<< HEAD
	var gm = get_node_or_null("/root/GameManager")
	var food_stock = gm.banked_storage["food"] if gm else 0
	var med_stock = gm.banked_storage["medicine"] if gm else 0
	
	bubble_node.visible = true
	match role:
		NPCRole.ELDER_ARIS:
			if food_stock < 3:
=======
	bubble_node.visible = true
	match role:
		NPCRole.ELDER_ARIS:
			if GameManager.banked_storage["food"] < 3:
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
				dialogue_label.text = "Kakek Aris: 'Anak-anak kelaparan, nak. Tolong prioritaskan makanan dari perahu.'"
			else:
				dialogue_label.text = "Kakek Aris: 'Terima kasih telah berlayar demi kami. Lautan ganas, selalu waspada!'"
		NPCRole.DOCTOR_MAYA:
<<<<<<< HEAD
			if med_stock < 2:
=======
			if GameManager.banked_storage["medicine"] < 2:
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
				dialogue_label.text = "Dokter Maya: 'Banyak pengungsi demam tinggi! Kami sangat membutuhkan Pasokan Obat.'"
			else:
				dialogue_label.text = "Dokter Maya: 'Obat yang kau bawa menyelamatkan korban gigitan. Tetaplah selamat di luar sana.'"
		NPCRole.SHIPWRIGHT_BUDI:
			dialogue_label.text = "Budi: 'Palka perahu awalmu hanya muat 10 barang! Kumpulkan Kayu & Solar di meja kerjaku untuk memasang Palka I (+6 slot).'"
		NPCRole.REFUGEE_FAMILY:
			dialogue_label.text = "Pengungsi: 'Pulau ini satu-satunya rumah kita yang tersisa dari wabah zombie.'"
