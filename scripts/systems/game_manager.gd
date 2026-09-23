extends Node

# ==============================================================================
# Driftholm / Last Harbor — Game Manager (Singleton)
# Mengelola siklus ekspedisi, status pulau aman, dan persediaan komunitas.
# ==============================================================================

signal inventory_changed(carried, capacity)
signal community_stockpile_changed(stockpile)
signal expedition_started(destination_island)
signal expedition_ended(success, loot)

enum GameState {
	SAFE_ISLAND,
	SAILING,
	EXPEDITION_ISLAND,
	DEBRIEF
}

var current_state: GameState = GameState.SAFE_ISLAND

# Persediaan Komunitas di Safe Island (Gudang Bersama)
var community_stockpile = {
	"food": 18,
	"wood": 14,
	"metal": 6,
	"medicine": 4,
	"fuel": 8,
	"rare_parts": 0
}

# Kebutuhan Harian Komunitas (Community Upkeep)
var daily_needs = {
	"food": 4,
	"wood": 2,
	"medicine": 1
}

# Muatan di Tangan Pemain / Perahu saat Ekspedisi
var boat_capacity: int = 12
var carried_cargo = {
	"food": 0,
	"wood": 0,
	"metal": 0,
	"medicine": 0,
	"fuel": 0,
	"rare_parts": 0
}

# Statistik Ekspedisi
var day_count: int = 1
var expeditions_count: int = 0
var survivors_saved: int = 0

func _ready() -> void:
	print("[GameManager] Sistem Ekspedisi & Komunitas Terinisialisasi.")

func get_carried_total() -> int:
	var total: int = 0
	for key in carried_cargo:
		total += carried_cargo[key]
	return total

func get_capacity_percent() -> float:
	return float(get_carried_total()) / float(boat_capacity)

func add_cargo(res_type: String, amount: int = 1) -> bool:
	if get_carried_total() + amount > boat_capacity:
		return false
	if not carried_cargo.has(res_type):
		carried_cargo[res_type] = 0
	carried_cargo[res_type] += amount
	inventory_changed.emit(carried_cargo, boat_capacity)
	return true

func deposit_cargo_to_community() -> Dictionary:
	var deposited = carried_cargo.duplicate()
	for key in carried_cargo:
		if community_stockpile.has(key):
			community_stockpile[key] += carried_cargo[key]
		carried_cargo[key] = 0
	inventory_changed.emit(carried_cargo, boat_capacity)
	community_stockpile_changed.emit(community_stockpile)
	return deposited

func start_expedition(target_island: String = "Island_A") -> void:
	current_state = GameState.SAILING
	expeditions_count += 1
	expedition_started.emit(target_island)
	print("[GameManager] Memulai pelayaran menuju: ", target_island)

func return_to_safe_island() -> void:
	current_state = GameState.SAFE_ISLAND
	var loot = deposit_cargo_to_community()
	day_count += 1
	# Konsumsi harian komunitas
	community_stockpile["food"] = max(0, community_stockpile["food"] - daily_needs["food"])
	community_stockpile["wood"] = max(0, community_stockpile["wood"] - daily_needs["wood"])
	expedition_ended.emit(true, loot)
