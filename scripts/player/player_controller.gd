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
@export var walk_speed: float = 2.2
@export var run_speed: float = 4.2
@export var turn_speed: float = 20.0
@export var acceleration: float = 14.0
@export var friction: float = 16.0
@export var attack_damage: int = 25
@export var attack_duration: float = 0.55
# Animation reference — after root motion fix, walk/run are in-place seamless loop
# Original drift: walk 1.46m/2.33s=0.63m/s, run 2.85m/1.25s=2.28m/s
# New playback scales to match movement to avoid foot sliding
@export var walk_anim_ref_speed: float = 1.4
@export var run_anim_ref_speed: float = 3.2

@onready var visual_root: Node3D = $VisualRoot
@onready var character_model_node: Node3D = $VisualRoot/CharacterModel
@onready var animation_player: AnimationPlayer = null
@onready var interaction_detector: Area3D = $InteractionDetector
@onready var attack_hitbox: Area3D = $VisualRoot/AttackHitbox

func _find_animation_player() -> AnimationPlayer:
	# Try direct path first
	var ap = character_model_node.get_node_or_null("AnimationPlayer") as AnimationPlayer
	if ap:
		return ap
	# Try recursive search inside CharacterModel (GLB may have Armature/AnimationPlayer)
	ap = character_model_node.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if ap:
		return ap
	# Try inside VisualRoot
	ap = visual_root.find_child("AnimationPlayer", true, false) as AnimationPlayer
	return ap

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
	# Robust AnimationPlayer discovery — fixes dead walk/run animations
	animation_player = _find_animation_player()
	if animation_player:
		print("[Player] AnimationPlayer found: ", animation_player.get_path(), " clips: ", animation_player.get_animation_list())
		# Ensure root motion disabled, in-place loop
		_play_anim("idle")
	else:
		print("[Player] ERROR: AnimationPlayer NOT found at $VisualRoot/CharacterModel/AnimationPlayer — searching...")
		# Retry after a frame (GLB may load async)
		await get_tree().process_frame
		animation_player = _find_animation_player()
		if animation_player:
			print("[Player] AnimationPlayer found on retry: ", animation_player.get_path())
			_play_anim("idle")
		else:
			print("[Player] FATAL: AnimationPlayer still not found — check GLB import")
	
	# Ensure player scale 1.70m LOCKED per Phase 3 — authored 0.978m x1.738=1.70m
	if character_model_node:
		character_model_node.scale = Vector3(1.738, 1.738, 1.738)
		print("[Player] Scale set to 1.738 for 1.70m locked")
	
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

	# Baca input gerak (WASD / Stick) — 8 arah 360° world-relative FIX
	# User: arah tidak tepat klik kanan ke kiri dan sebaliknya, harusnya 8 arah 360°
	# Fix: world-relative 8-direction, bukan camera-relative yang terbalik, W=north -Z, S=south +Z, A=west -X, D=east +X, diagonal normalized
	var input_dir: Vector2 = Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var is_sprinting: bool = Input.is_action_pressed("sprint")

	# 8 arah 360° world-relative — FIX arah terbalik, kanan ke kiri dll
	var move_dir: Vector3 = Vector3.ZERO
	if input_dir != Vector2.ZERO:
		# World-relative: input_dir.x = east/west, input_dir.y = south/north (up=-1 north, down=+1 south)
		# Jadi W (up y=-1) -> move_dir.z = -1 north, S (down y=+1) -> +1 south, A (left x=-1) -> -1 west, D (right x=+1) -> +1 east
		move_dir = Vector3(input_dir.x, 0, input_dir.y).normalized()
		# Debug: print arah
		# print("[Player] input ", input_dir, " move_dir ", move_dir)

	# Kecepatan target
	var target_speed: float = run_speed if is_sprinting else walk_speed
	var target_velocity_x: float = move_dir.x * target_speed
	var target_velocity_z: float = move_dir.z * target_speed

	# Akselerasi & friksi — 8 arah 360° fix
	if move_dir != Vector3.ZERO:
		velocity.x = move_toward(velocity.x, target_velocity_x, acceleration * delta)
		velocity.z = move_toward(velocity.z, target_velocity_z, acceleration * delta)

		# Rotasi mulus menghadap arah pergerakan — FIX arah terbalik, harus 8 arah 360°
		# World-relative: move_dir.x east/west, move_dir.z north/south, atan2(x,z) gives correct facing
		var target_angle = atan2(move_dir.x, move_dir.z)
		visual_root.rotation.y = lerp_angle(visual_root.rotation.y, target_angle, turn_speed * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)
		velocity.z = move_toward(velocity.z, 0.0, friction * delta)

	move_and_slide()

	# Pemilihan Animasi
	_update_animation(move_dir, is_sprinting)

var _current_anim: String = ""
var _anim_speed: float = 1.0

func _update_animation(move_dir: Vector3, is_sprinting: bool) -> void:
	if is_attacking:
		return
	
	var horizontal_speed: float = Vector2(velocity.x, velocity.z).length()
	var desired_anim: String = "idle"
	var desired_speed: float = 1.0
	
	if horizontal_speed > 0.25:
		if is_sprinting or horizontal_speed > walk_speed + 0.3:
			desired_anim = "run"
			# Scale animation speed to match ground speed — prevents foot sliding
			desired_speed = clamp(horizontal_speed / run_anim_ref_speed, 0.7, 1.6)
		else:
			desired_anim = "walk"
			desired_speed = clamp(horizontal_speed / walk_anim_ref_speed, 0.6, 1.5)
	else:
		desired_anim = "idle"
		desired_speed = 1.0
	
	# Smooth speed transition to avoid jitter
	_anim_speed = lerp(_anim_speed, desired_speed, 0.15)
	
	_play_anim(desired_anim, _anim_speed)

func _play_anim(anim_name: String, playback_speed: float = 1.0) -> void:
	if not animation_player:
		return
	
	var target_clip: String = ""
	for clip in animation_player.get_animation_list():
		if anim_name.to_lower() in clip.to_lower():
			target_clip = clip
			break
	
	if target_clip == "":
		return
	
	# If same animation, just update speed
	if _current_anim == target_clip:
		animation_player.speed_scale = playback_speed
		return
	
	# Switch animation with crossfade
	_current_anim = target_clip
	animation_player.speed_scale = playback_speed
	if animation_player.has_animation(target_clip):
		# Use custom blend for smooth transition — fix pop
		animation_player.play(target_clip, 0.18)

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
	var deg := rad_to_deg(atan2(knockback_dir.x, -knockback_dir.z)) + 180.0
	GameFlow.report_damage(deg, amount)
	
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
