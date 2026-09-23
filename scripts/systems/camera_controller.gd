extends Node3D

# ==============================================================================
# Camera Controller — 2.5D Isometric-like Perspective Camera (Godot 4)
# Mengikuti player dengan smoothing, sudut pitch 38-45°, dan yaw horizontal ~15°
# Menghadirkan depth visual pulau, elevasi daratan, dan garis cakrawala laut.
# ==============================================================================

@export var target: Node3D = null
@export var smooth_speed: float = 6.0

# Pengaturan Sudut Kamera 3/4
@export var pitch_angle_deg: float = 42.0     # Kemiringan ke bawah (35-50°)
@export var yaw_angle_deg: float = 18.0       # Sedikit rotasi horizontal untuk depth
@export var default_distance: float = 9.5     # Jarak kamera ke player
@export var combat_distance: float = 7.5      # Zoom-in saat bertarung
@export var explore_distance: float = 12.0    # Zoom-out saat observasi luas

@onready var camera_node: Camera3D = $Camera3D

var current_distance: float = 9.5
var target_distance: float = 9.5

func _ready() -> void:
	current_distance = default_distance
	target_distance = default_distance
	_apply_angles()

func _apply_angles() -> void:
	rotation_degrees.x = -pitch_angle_deg
	rotation_degrees.y = yaw_angle_deg
	rotation_degrees.z = 0.0
	if camera_node:
		camera_node.position = Vector3(0, 0, current_distance)

func _process(delta: float) -> void:
	if not target:
		return

	# Smooth follow posisi player
	global_position = global_position.lerp(target.global_position, smooth_speed * delta)

	# Smooth zoom
	if abs(current_distance - target_distance) > 0.05:
		current_distance = lerp(current_distance, target_distance, smooth_speed * delta)
		if camera_node:
			camera_node.position.z = current_distance

func set_combat_mode(active: bool) -> void:
	target_distance = combat_distance if active else default_distance

func set_explore_mode(active: bool) -> void:
	target_distance = explore_distance if active else default_distance
