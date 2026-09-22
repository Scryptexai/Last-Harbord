<<<<<<< HEAD
extends CharacterBody3D
=======
extends CharacterBody2D
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5

# ==============================================================================
# Last Harbor - BoatController (Godot 4)
# Mengontrol fisika pelayaran perahu di laut lepas, inersia berat,
# dan batasan kapasitas palka (Problem 1).
# ==============================================================================

<<<<<<< HEAD
@export var max_speed: float = 12.0
@export var acceleration: float = 8.5
@export var drag_factor: float = 0.985
@export var turn_speed: float = 1.8

@onready var bow_lantern: OmniLight3D = $BowLantern if has_node("BowLantern") else null
@onready var cargo_label: Label = $CanvasLayer/CargoLabel if has_node("CanvasLayer/CargoLabel") else null
=======
@export var max_speed: float = 168.0
@export var acceleration: float = 285.0
@export var drag_factor: float = 0.985
@export var turn_speed: float = 2.8

@onready var wake_particles: GPUParticles2D = $WakeParticles
@onready var bow_lantern: PointLight2D = $BowLantern
@onready var cargo_label: Label = $CargoLabel
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5

var heading_angle: float = 0.0

func _physics_process(delta: float) -> void:
<<<<<<< HEAD
	var gm = get_node_or_null("/root/GameManager")
	if gm and gm.get("current_state") != 1: # 1 = OPEN_SEA
=======
	if GameManager.current_state != GameManager.GameState.OPEN_SEA:
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		return
		
	var input_vector = Vector2(
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_down") - Input.get_action_strength("move_up")
	)
	
	if input_vector.length_squared() > 0.05:
		input_vector = input_vector.normalized()
<<<<<<< HEAD
		var target_angle = atan2(-input_vector.x, -input_vector.y)
		heading_angle = lerp_angle(heading_angle, target_angle, turn_speed * delta)
		rotation.y = heading_angle
		
		var forward = -transform.basis.z
		velocity += forward * acceleration * delta
		velocity = velocity.limit_length(max_speed)
	else:
		velocity.x *= drag_factor
		velocity.z *= drag_factor
=======
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
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
			
	move_and_slide()
	update_cargo_ui()

func update_cargo_ui() -> void:
<<<<<<< HEAD
	var gm = get_node_or_null("/root/GameManager")
	if cargo_label and gm:
		var current = gm.get_total_carried()
		var max_cap = gm.get_palka_capacity()
		cargo_label.text = "📦 Palka: %d / %d" % [current, max_cap]
=======
	if cargo_label:
		var current = GameManager.get_total_carried()
		var max_cap = GameManager.get_palka_capacity()
		cargo_label.text = "Palka: %d / %d" % [current, max_cap]
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		if current >= max_cap:
			cargo_label.modulate = Color(1.0, 0.2, 0.2)
		else:
			cargo_label.modulate = Color(1.0, 1.0, 1.0)
