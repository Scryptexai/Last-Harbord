extends Node

# ==============================================================================
# Last Harbor - TideSystem (Godot 4 Singleton)
# Mengelola siklus pasang surut air laut, atmosfer malam, dan naiknya garis air.
# ==============================================================================

signal tide_phase_changed(phase_name)
signal flood_level_changed(water_height)

enum TidePhase { CALM, TURNING, HIGH, DAWN }
var current_phase: TidePhase = TidePhase.CALM

var tide_time: float = 0.0
var night_count: int = 1

# Durasi fase dalam detik
const CALM_DURATION: float = 150.0
const TURNING_DURATION: float = 120.0
const HIGH_TIDE_DURATION: float = 150.0
const DAWN_DURATION: float = 20.0

var flood_ratio: float = 0.0 # 0.0 = pantai kering, 1.0 = pasang puncak
var dark_tint_alpha: float = 0.0

func _process(delta: float) -> void:
	if GameManager.current_state == GameManager.GameState.HARBOR_SANCTUARY:
		# Di Pulau Suaka waktu pasang dibekukan (zona damai di luar waktu)
		return
		
	tide_time += delta
	update_tide_logic()

func update_tide_logic() -> void:
	var prev_phase = current_phase
	
	if tide_time < CALM_DURATION:
		current_phase = TidePhase.CALM
		flood_ratio = 0.0
		dark_tint_alpha = lerp(0.0, 0.25, tide_time / CALM_DURATION)
	elif tide_time < (CALM_DURATION + TURNING_DURATION):
		current_phase = TidePhase.TURNING
		var t = (tide_time - CALM_DURATION) / TURNING_DURATION
		flood_ratio = lerp(0.0, 0.5, t)
		dark_tint_alpha = lerp(0.25, 0.65, t)
	elif tide_time < (CALM_DURATION + TURNING_DURATION + HIGH_TIDE_DURATION):
		current_phase = TidePhase.HIGH
		var t = (tide_time - CALM_DURATION - TURNING_DURATION) / HIGH_TIDE_DURATION
		flood_ratio = lerp(0.5, 1.0, t)
		dark_tint_alpha = 0.75
		# Pasang tinggi di laut terbuka mengikis hull kapal bila tidak dekat daratan
	else:
		current_phase = TidePhase.DAWN
		flood_ratio = lerp(1.0, 0.0, (tide_time - 420.0) / DAWN_DURATION)
		dark_tint_alpha = 0.15
		if tide_time >= 440.0:
			reset_night()
			
	if prev_phase != current_phase:
		tide_phase_changed.emit(get_phase_name())
	flood_level_changed.emit(flood_ratio)

func reset_night() -> void:
	tide_time = 0.0
	night_count += 1
	current_phase = TidePhase.CALM

func get_phase_name() -> String:
	match current_phase:
		TidePhase.CALM: return "Tenang"
		TidePhase.TURNING: return "Berubah"
		TidePhase.HIGH: return "Pasang Tinggi"
		TidePhase.DAWN: return "Fajar"
	return "Tenang"
