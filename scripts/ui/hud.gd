extends CanvasLayer

# ==============================================================================
# In-Game HUD (Godot 4)
# Menampilkan indikator persediaan komunitas, kapasitas perahu, dan
# prompt interaksi kontekstual pada Safe Island & pulau ekspedisi.
# ==============================================================================

@onready var prompt_box: PanelContainer = $PromptBox
@onready var prompt_label: Label = $PromptBox/PromptLabel
@onready var dialogue_panel: PanelContainer = $DialoguePanel
@onready var speaker_label: Label = $DialoguePanel/VBox/Speaker
@onready var dialogue_text: Label = $DialoguePanel/VBox/Text

@onready var food_val: Label = $TopBar/ResourcesHBox/FoodContainer/Val
@onready var wood_val: Label = $TopBar/ResourcesHBox/WoodContainer/Val
@onready var metal_val: Label = $TopBar/ResourcesHBox/MetalContainer/Val
@onready var med_val: Label = $TopBar/ResourcesHBox/MedContainer/Val
@onready var day_label: Label = $TopBar/DayLabel

var prompt_timer: float = 0.0

func _ready() -> void:
	add_to_group("hud")
	if prompt_box:
		prompt_box.visible = false
	if dialogue_panel:
		dialogue_panel.visible = false
	
	# Connect to player signals if player exists
	var player = get_tree().get_first_node_in_group("player")
	if player:
		player.interaction_available.connect(_on_interaction_available)
		player.interaction_unavailable.connect(_on_interaction_unavailable)

func _process(delta: float) -> void:
	if dialogue_panel.visible and Input.is_action_just_pressed("interact"):
		dialogue_panel.visible = false

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

func update_stockpile(stockpile: Dictionary) -> void:
	if food_val and stockpile.has("food"):
		food_val.text = str(stockpile["food"])
	if wood_val and stockpile.has("wood"):
		wood_val.text = str(stockpile["wood"])
	if metal_val and stockpile.has("metal"):
		metal_val.text = str(stockpile["metal"])
	if med_val and stockpile.has("medicine"):
		med_val.text = str(stockpile["medicine"])

func _on_interaction_available(_target, prompt_text: String) -> void:
	show_prompt(prompt_text)

func _on_interaction_unavailable() -> void:
	hide_prompt()
