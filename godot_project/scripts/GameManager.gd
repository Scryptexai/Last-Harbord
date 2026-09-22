extends Node

# ==============================================================================
# Last Harbor - GameManager (Godot 4 Singleton)
# Mengelola siklus permainan, ekonomi kargo kapal, status Pulau Suaka,
<<<<<<< HEAD
# dan progresi ekspedisi kepulauan zombie.
=======
# dan progresi ekspedisi pulau zombie.
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
# ==============================================================================

signal cargo_changed
signal colony_status_changed
signal health_changed(current_hp, max_hp)

enum GameState { HARBOR_SANCTUARY, OPEN_SEA, COMBAT_ISLAND, GAMEOVER }
var current_state: GameState = GameState.HARBOR_SANCTUARY

# ---- Kapal & Kapasitas Palka ----
var refit_level: int = 0
var max_hull: int = 100
var current_hull: int = 100
var base_storage_capacity: int = 10 # Problem 1: Kapasitas palka terbatas!

var carried_cargo: Dictionary = {
	"wood": 0,
	"fuel": 0,
	"food": 0,
	"medicine": 0
}

var banked_storage: Dictionary = {
	"wood": 8,
	"fuel": 5,
	"food": 6,
	"medicine": 4
}

# ---- Status Koloni Korban Selamat di Pulau Suaka ----
# Konsep Apocalypse: 1 pulau aman tanpa zombie, warga kekurangan resource!
var colony: Dictionary = {
	"population": 6,
	"hunger": 75,      # 0..100 (butuh makanan)
	"health": 80,      # 0..100 (butuh obat)
	"generator": 65,   # 0..100 (butuh solar untuk suar & penjernih air)
	"dam_strength": 90 # 0..100 (butuh kayu untuk tanggul pemecah ombak)
}

# ---- Daftar Pulau Ekspedisi ----
# Problem 2: Setiap pulau punya zombie level kekuatan berbeda & resource beda
var islands_data: Array = [
	{
		"id": 1,
<<<<<<< HEAD
		"name": "Pulau Karang (Shallows)",
=======
		"name": "Pulau Karang",
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		"ring": 1,
		"threat_level": 1,
		"zombie_types": ["scavenger"],
		"resource_bias": "wood_food",
		"richness": "Sedang",
		"desc": "Perairan dekat, ombak tenang. Zombi lambat dan mudah dihindari."
	},
	{
		"id": 2,
<<<<<<< HEAD
		"name": "Kepulauan Karam (Sunken Ruins)",
=======
		"name": "Pulau Tengkorak",
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		"ring": 2,
		"threat_level": 2,
		"zombie_types": ["armored_brute", "stalker_runner"],
		"resource_bias": "fuel_wood",
		"richness": "Melimpah",
		"desc": "Puing kapal karam. Dihuni zombi berzirah besi rongsokan & pelari gesit."
	},
	{
		"id": 3,
<<<<<<< HEAD
		"name": "Karang Maut (Blood Reef)",
=======
		"name": "Pulau Api & Reruntuhan",
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		"ring": 3,
		"threat_level": 3,
		"zombie_types": ["night_terror", "toxic_spitter"],
		"resource_bias": "medicine_fuel",
		"richness": "Sangat Kaya",
		"desc": "Zona maut perairan terdalam. Mutasi zombi mematikan dengan mata merah membara."
	}
]

var selected_expedition_island: Dictionary = {}

func _ready() -> void:
	selected_expedition_island = islands_data[0]

func get_palka_capacity() -> int:
	match refit_level:
		0: return 10
		1: return 16 # Palka I
		2: return 16
		3: return 16
		4: return 22 # Palka II
		_: return 22

func get_total_carried() -> int:
	var total: int = 0
	for count in carried_cargo.values():
		total += count
	return total

func is_palka_full() -> bool:
	return get_total_carried() >= get_palka_capacity()

func add_resource_to_cargo(type: String, amount: int = 1) -> bool:
	if is_palka_full():
		return false
	var room_left = get_palka_capacity() - get_total_carried()
	var to_add = min(amount, room_left)
	carried_cargo[type] = carried_cargo.get(type, 0) + to_add
	cargo_changed.emit()
	return true

func unload_cargo_to_sanctuary() -> void:
	for key in carried_cargo.keys():
		var amt = carried_cargo[key]
		banked_storage[key] = banked_storage.get(key, 0) + amt
		carried_cargo[key] = 0
	
	# Penuhi kebutuhan komunitas korban selamat
	if banked_storage["food"] >= 4:
		colony["hunger"] = min(100, colony["hunger"] + 25)
	if banked_storage["medicine"] >= 3:
		colony["health"] = min(100, colony["health"] + 30)
	if banked_storage["fuel"] >= 3:
		colony["generator"] = min(100, colony["generator"] + 35)
	if banked_storage["wood"] >= 5:
		colony["dam_strength"] = min(100, colony["dam_strength"] + 20)
		
	cargo_changed.emit()
	colony_status_changed.emit()

func damage_player(amount: int) -> void:
	current_hull = max(0, current_hull - amount)
	health_changed.emit(current_hull, max_hull)
	if current_hull <= 0:
		on_player_death()

func on_player_death() -> void:
	current_state = GameState.GAMEOVER
	# Muatan yang dibawa jatuh jadi pelampung di pulau itu
	for key in carried_cargo.keys():
		carried_cargo[key] = 0
	current_hull = int(max_hull * 0.5)
	cargo_changed.emit()
