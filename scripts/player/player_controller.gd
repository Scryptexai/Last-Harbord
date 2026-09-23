extends CharacterBody3D

# ==============================================================================
# Player Controller (Godot 4)
# Mengontrol pergerakan, rotasi isometrik, dan animasi karakter 3D GLB bawaan:
#   - Model: character_glb_idle_box_03_run_walk_7.glb (LOCKED VISUAL ASSET)
#   - Animasi: idle, walk, run, box_03 (attack)
# ==============================================================================

signal interaction_available(target_node, prompt_text)
signal interaction_unavailable()

@export var walk_speed: float = 3.8
@export var run_speed: float = 6.2
@export var turn_speed: float = 12.0
@export var acceleration: float = 14.0
@export var friction: float = 18.0
@export var attack_duration: float = 1.1

@onready var visual_root: Node3D = $VisualRoot
@onready var animation_player: AnimationPlayer = $VisualRoot/CharacterModel/AnimationPlayer
@onready var interaction_detector: Area3D = $InteractionDetector

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity", 9.8)
var is_attacking: bool = false
var attack_timer: float = 0.0
var current_interactive: Node3D = null

func _ready() -> void:
	if animation_player:
		# Putar idle default
		_play_anim("idle")
	
	if interaction_detector:
		interaction_detector.area_entered.connect(_on_interaction_area_entered)
		interaction_detector.area_exited.connect(_on_interaction_area_exited)

func _physics_process(delta: float) -> void:
	# Terapkan gravitasi
	if not is_on_floor():
		velocity.y -= gravity * delta

	# Tangani state serangan
	if is_attacking:
		attack_timer -= delta
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)
		velocity.z = move_toward(velocity.z, 0.0, friction * delta)
		move_and_slide()
		if attack_timer <= 0.0:
			is_attacking = false
		return

	# Input serangan
	if Input.is_action_just_pressed("attack"):
		_perform_attack()
		return

	# Input interaksi (misal naik perahu, bicara dengan survivor)
	if Input.is_action_just_pressed("interact") and current_interactive:
		if current_interactive.has_method("interact"):
			current_interactive.interact(self)

	# Baca input gerak (WASD / Stick)
	var input_dir: Vector2 = Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var is_sprinting: bool = Input.is_action_pressed("sprint")

	# Transformasi arah gerak relatif terhadap orientasi kamera 3/4
	var camera = get_viewport().get_camera_3d()
	var move_dir: Vector3 = Vector3.ZERO
	if camera and input_dir != Vector2.ZERO:
		var cam_forward = -camera.global_transform.basis.z
		var cam_right = camera.global_transform.basis.x
		cam_forward.y = 0.0
		cam_right.y = 0.0
		cam_forward = cam_forward.normalized()
		cam_right = cam_right.normalized()
		move_dir = (cam_right * input_dir.x + cam_forward * -input_dir.y).normalized()

	# Kecepatan target
	var target_speed: float = run_speed if is_sprinting else walk_speed
	var target_velocity_x: float = move_dir.x * target_speed
	var target_velocity_z: float = move_dir.z * target_speed

	# Akselerasi & friksi
	if move_dir != Vector3.ZERO:
		velocity.x = move_toward(velocity.x, target_velocity_x, acceleration * delta)
		velocity.z = move_toward(velocity.z, target_velocity_z, acceleration * delta)

		# Rotasi mulus menghadap arah pergerakan
		var target_angle = atan2(-move_dir.x, -move_dir.z)
		visual_root.rotation.y = lerp_angle(visual_root.rotation.y, target_angle, turn_speed * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)
		velocity.z = move_toward(velocity.z, 0.0, friction * delta)

	move_and_slide()

	# Pemilihan Animasi
	_update_animation(move_dir, is_sprinting)

func _update_animation(move_dir: Vector3, is_sprinting: bool) -> void:
	if is_attacking:
		return
	
	var horizontal_speed: float = Vector2(velocity.x, velocity.z).length()
	if horizontal_speed > 0.3:
		if is_sprinting or horizontal_speed > walk_speed + 0.5:
			_play_anim("run")
		else:
			_play_anim("walk")
	else:
		_play_anim("idle")

func _play_anim(anim_name: String) -> void:
	if not animation_player:
		return
	
	# Cari animasi yang cocok di animation library
	var target_clip: String = ""
	for clip in animation_player.get_animation_list():
		if anim_name.to_lower() in clip.to_lower():
			target_clip = clip
			break
	
	if target_clip != "" and animation_player.current_animation != target_clip:
		animation_player.play(target_clip, 0.15)

func _perform_attack() -> void:
	is_attacking = true
	attack_timer = attack_duration
	_play_anim("box_03")

func _on_interaction_area_entered(area: Area3D) -> void:
	var parent = area.get_parent()
	if parent and parent.has_method("get_interaction_prompt"):
		current_interactive = parent
		interaction_available.emit(parent, parent.get_interaction_prompt())

func _on_interaction_area_exited(area: Area3D) -> void:
	var parent = area.get_parent()
	if parent == current_interactive:
		current_interactive = null
		interaction_unavailable.emit()
