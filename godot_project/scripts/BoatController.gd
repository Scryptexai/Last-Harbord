extends CharacterBody2D

# ==============================================================================
# Last Harbor - BoatController (Godot 4)
# Mengontrol fisika pelayaran perahu di laut lepas, inersia berat,
# dan batasan kapasitas palka (Problem 1).
# ==============================================================================

@export var max_speed: float = 168.0
@export var acceleration: float = 285.0
@export var drag_factor: float = 0.985
@export var turn_speed: float = 2.8

@onready var wake_particles: GPUParticles2D = $WakeParticles
@onready var bow_lantern: PointLight2D = $BowLantern
@onready var cargo_label: Label = $CargoLabel

var heading_angle: float = 0.0

func _physics_process(delta: float) -> void:
	if GameManager.current_state != GameManager.GameState.OPEN_SEA:
		return
		
	var input_vector = Vector2(
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_down") - Input.get_action_strength("move_up")
	)
	
	if input_vector.length_squared() > 0.05:
		input_vector = input_vector.normalized()
		var target_angle = input_vector.angle()
		heading_angle = rotate_toward(heading_angle, target_angle, turn_speed * delta)
		rotation = heading_angle
		
		# Dorong perahu ke depan sesuai arah haluan
		var forward = Vector2.RIGHT.rotated(heading_angle)
		velocity += forward * acceleration * delta
		velocity = velocity.limit_length(max_speed)
		
		if wake_particles:
			wake_particles.emitting = true
	else:
		# Inersia luncur perahu (coasting)
		velocity *= drag_factor
		if wake_particles:
			wake_particles.emitting = velocity.length() > 20.0
			
	move_and_slide()
	update_cargo_ui()

func update_cargo_ui() -> void:
	if cargo_label:
		var current = GameManager.get_total_carried()
		var max_cap = GameManager.get_palka_capacity()
		cargo_label.text = "Palka: %d / %d" % [current, max_cap]
		if current >= max_cap:
			cargo_label.modulate = Color(1.0, 0.2, 0.2)
		else:
			cargo_label.modulate = Color(1.0, 1.0, 1.0)
