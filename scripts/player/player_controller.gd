extends CharacterBody3D

# ==============================================================================
# Player Controller (Godot 4)
# Mengontrol pergerakan, rotasi isometrik, dan animasi karakter 3D GLB bawaan:
#   - Model: character_glb_idle_box_03_run_walk_7.glb (LOCKED VISUAL ASSET)
#   - Animasi: idle, walk, run, box_03 (attack)
#   - Sistem Tempur & Kesehatan: Health, Hitbox Serangan, Damage Feedback
# ==============================================================================

signal interaction_available(target_node, prompt_text)
signal interaction_unavailable()
signal health_changed(current_hp, max_hp)
signal player_died()

@export var max_health: int = 100
@export var walk_speed: float = 3.8
@export var run_speed: float = 6.2
@export var turn_speed: float = 12.0
@export var acceleration: float = 14.0
@export var friction: float = 18.0
@export var attack_damage: int = 25
@export var attack_duration: float = 0.55

@onready var visual_root: Node3D = $VisualRoot
@onready var animation_player: AnimationPlayer = $VisualRoot/CharacterModel/AnimationPlayer
@onready var interaction_detector: Area3D = $InteractionDetector
@onready var attack_hitbox: Area3D = $VisualRoot/AttackHitbox

var current_health: int = 100
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity", 9.8)
var is_attacking: bool = false
var attack_timer: float = 0.0
var has_hit_in_attack: bool = false
var invulnerable_timer: float = 0.0
var current_interactive: Node3D = null

func _ready() -> void:
	add_to_group("player")
	current_health = max_health
	if animation_player:
		_play_anim("idle")
	
	if interaction_detector:
		interaction_detector.area_entered.connect(_on_interaction_area_entered)
		interaction_detector.area_exited.connect(_on_interaction_area_exited)

func _physics_process(delta: float) -> void:
	if invulnerable_timer > 0.0:
		invulnerable_timer -= delta
	
	# Terapkan gravitasi
	if not is_on_floor():
		velocity.y -= gravity * delta

	# Tangani state serangan
	if is_attacking:
		attack_timer -= delta
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)
		velocity.z = move_toward(velocity.z, 0.0, friction * delta)
		
		# Deteksi kena pukulan pada jendela aktif serangan
		if not has_hit_in_attack and attack_timer <= attack_duration * 0.65 and attack_timer >= attack_duration * 0.2:
			_check_attack_hits()
		
		move_and_slide()
		if attack_timer <= 0.0:
			is_attacking = false
			has_hit_in_attack = false
		return

	# Input serangan
	if Input.is_action_just_pressed("attack"):
		_perform_attack()
		return

	# Input interaksi (misal naik perahu, panen resource, bicara)
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
	
	var target_clip: String = ""
	for clip in animation_player.get_animation_list():
		if anim_name.to_lower() in clip.to_lower():
			target_clip = clip
			break
	
	if target_clip != "" and animation_player.current_animation != target_clip:
		animation_player.play(target_clip, 0.15)

func _perform_attack() -> void:
	is_attacking = true
	has_hit_in_attack = false
	attack_timer = attack_duration
	_play_anim("box_03")

func _check_attack_hits() -> void:
	if not attack_hitbox:
		return
	
	var overlapping_bodies = attack_hitbox.get_overlapping_bodies()
	for body in overlapping_bodies:
		if body != self and body.is_in_group("enemies") and body.has_method("take_damage"):
			var knock_dir = (body.global_position - global_position).normalized()
			body.take_damage(attack_damage, knock_dir)
			has_hit_in_attack = true

func take_damage(amount: int, knockback_dir: Vector3 = Vector3.ZERO) -> void:
	if invulnerable_timer > 0.0 or current_health <= 0:
		return
	
	invulnerable_timer = 0.5
	current_health = max(0, current_health - amount)
	health_changed.emit(current_health, max_health)
	
	# Apply knockback
	velocity = knockback_dir * 5.5
	
	var hud = get_tree().get_first_node_in_group("hud")
	if hud and hud.has_method("show_damage_vignette"):
		hud.show_damage_vignette()
	
	if current_health <= 0:
		_die()

func _die() -> void:
	player_died.emit()
	print("[Player] Karakter tumbang! Kembali ke dermaga perlindungan.")
	var gm = get_node_or_null("/root/GameManager")
	if gm:
		gm.return_to_safe_island()

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
