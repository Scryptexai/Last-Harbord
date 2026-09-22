extends Node3D

# ==============================================================================
# Last Harbor - SanctuaryIsland (Godot 4)
# Mengelola Pulau Suaka (Haven Sanctuary Island):
# Pulau aman tanpa zombie, tempat tinggal pengungsi korban selamat apocalypse.
# Dermaga kayu berada di pantai pulau ini, menjorok ke air tempat perahu berlabuh.
# ==============================================================================

@onready var campfire_light: OmniLight3D = $Campfire/PointLight3D if has_node("Campfire/PointLight3D") else null
@onready var colony_hud_label: Label = $CanvasLayer/ColonyHUD/StatusLabel if has_node("CanvasLayer/ColonyHUD/StatusLabel") else null

func _ready() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		gm.current_state = 0 # HARBOR_SANCTUARY
		gm.colony_status_changed.connect(_on_colony_status_updated)
	_on_colony_status_updated()

func _on_colony_status_updated() -> void:
	var gm = get_node_or_null("/root/GameManager")
	if colony_hud_label and gm:
		var c = gm.colony
		var b = gm.banked_storage
		colony_hud_label.text = "🏝️ PULAU SUAKA | 👥 Pengungsi: %d Jiwa | 🍞 Makan: %d | 💊 Obat: %d | 🪵 Kayu: %d | ⚡ Solar: %d" % [
			c["population"], b["food"], b["medicine"], b["wood"], b["fuel"]
		]

# ---- Titik Interaksi di Pulau Suaka ----

func _on_dock_pier_area_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		print("[Sanctuary] Pemain berada di ujung dermaga: Siap berlayar ekspedisi!")

func _on_chart_table_interacted(body: Node3D) -> void:
	if body.is_in_group("player"):
		print("[Sanctuary] Membuka Meja Peta Bahari...")

func _on_workbench_interacted(body: Node3D) -> void:
	if body.is_in_group("player"):
		print("[Sanctuary] Membuka Bengkel Perahu Budi Si Tukang Kapal...")

func _on_colony_depot_interacted(body: Node3D) -> void:
	if body.is_in_group("player"):
		var gm = get_node_or_null("/root/GameManager")
		if gm:
			gm.unload_cargo_to_sanctuary()
		print("[Sanctuary] Kargo dibongkar ke gudang koloni pengungsi.")
