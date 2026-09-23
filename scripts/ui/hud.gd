extends CanvasLayer

# ==============================================================================
# In-Game HUD (Godot 4)
# Menampilkan indikator persediaan komunitas, kapasitas palka perahu,
# status kesehatan pemain, dan prompt interaksi kontekstual.
# ==============================================================================

@onready var prompt_box: PanelContainer = $PromptBox
@onready var prompt_label: Label = $PromptBox/PromptLabel
@onready var dialogue_panel: PanelContainer = $DialoguePanel
@onready var speaker_label: Label = $DialoguePanel/VBox/Speaker
@onready var dialogue_text: Label = $DialoguePanel/VBox/Text

@onready var hp_bar: ProgressBar = $TopBar/HPContainer/HPBar
@onready var cargo_label: Label = $TopBar/CargoContainer/CargoLabel

@onready var food_val: Label = $TopBar/ResourcesHBox/FoodContainer/Val
@onready var wood_val: Label = $TopBar/ResourcesHBox/WoodContainer/Val
@onready var metal_val: Label = $TopBar/ResourcesHBox/MetalContainer/Val
@onready var med_val: Label = $TopBar/ResourcesHBox/MedContainer/Val
@onready var day_label: Label = $TopBar/DayLabel

@onready var debrief_modal: PanelContainer = $DebriefModal
@onready var debrief_text: Label = $DebriefModal/VBox/DebriefText

func _ready() -> void:
	add_to_group("hud")
	if prompt_box: prompt_box.visible = false
	if dialogue_panel: dialogue_panel.visible = false
	if debrief_modal: debrief_modal.visible = false
	
	var player = get_tree().get_first_node_in_group("player")
	if player:
		player.interaction_available.connect(_on_interaction_available)
		player.interaction_unavailable.connect(_on_interaction_unavailable)
		if player.has_signal("health_changed"):
			player.health_changed.connect(update_health)

func _process(delta: float) -> void:
	if dialogue_panel.visible and Input.is_action_just_pressed("interact"):
		dialogue_panel.visible = false
	if debrief_modal.visible and (Input.is_action_just_pressed("interact") or Input.is_action_just_pressed("ui_accept")):
		debrief_modal.visible = false

func show_prompt(text: String) -> void:
	if prompt_label and prompt_box:
		prompt_label.text = text
		prompt_box.visible = true

func hide_prompt() -> void:
	if prompt_box:
		prompt_box.visible = false

func show_dialogue(speaker: String, role: String, text: String) -> void:
	if dialogue_panel:
		speaker_label.text = speaker + " — " + role
		dialogue_text.text = text
		dialogue_panel.visible = true

func update_health(current_hp: int, max_hp: int) -> void:
	if hp_bar:
		hp_bar.max_value = max_hp
		hp_bar.value = current_hp

func update_cargo(cargo: Dictionary, capacity: int) -> void:
	if cargo_label:
		var total = 0
		for k in cargo:
			total += cargo[k]
		cargo_label.text = "📦 Palka: " + str(total) + "/" + str(capacity)

func update_stockpile(stockpile: Dictionary) -> void:
	if food_val and stockpile.has("food"): food_val.text = str(stockpile["food"])
	if wood_val and stockpile.has("wood"): wood_val.text = str(stockpile["wood"])
	if metal_val and stockpile.has("metal"): metal_val.text = str(stockpile["metal"])
	if med_val and stockpile.has("medicine"): med_val.text = str(stockpile["medicine"])

func show_debrief(loot: Dictionary) -> void:
	if debrief_modal and debrief_text:
		var txt = "Hasil Ekspedisi Pulau Berhasil Dibongkar ke Gudang Desa:\n"
		var any_loot = false
		for k in loot:
			if loot[k] > 0:
				txt += " • " + k.capitalize() + ": +" + str(loot[k]) + " unit\n"
				any_loot = true
		if not any_loot:
			txt += " (Palka kosong saat kembali)\n"
		txt += "\nKomunitas penyintas terlindungi untuk hari ini!"
		debrief_text.text = txt
		debrief_modal.visible = true

func _on_interaction_available(_target, prompt_text: String) -> void:
	show_prompt(prompt_text)

func _on_interaction_unavailable() -> void:
	hide_prompt()
