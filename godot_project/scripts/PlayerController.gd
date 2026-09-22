<<<<<<< HEAD
extends CharacterBody3D

# ==============================================================================
# Last Harbor - PlayerController (Godot 4)
# Karakter 2.5D dengan proyeksi kamera 3/4 down (~35° pitch).
=======
extends CharacterBody2D

# ==============================================================================
# Last Harbor - PlayerController (Godot 4)
# Karakter 2.5D dengan proyeksi kamera 3/4 down (~30° pitch).
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
# Terintegrasi penuh dengan model 3D GLB karakter (character_glb_idle_box_03_run_walk_7.glb)
# beralur 4 animasi: idle, walk, run, box_03 (attack dayung).
# ==============================================================================

<<<<<<< HEAD
@export var move_speed: float = 6.5
@export var sprint_speed: float = 9.8
@export var attack_damage: int = 26
@export var attack_range: float = 2.2

@onready var anim_player: AnimationPlayer = $CharacterModel/AnimationPlayer if has_node("CharacterModel/AnimationPlayer") else null
@onready var char_model: Node3D = $CharacterModel if has_node("CharacterModel") else null
@onready var attack_area: Area3D = $AttackArea if has_node("AttackArea") else null
@onready var lantern_light: OmniLight3D = $LanternLight if has_node("LanternLight") else null
=======
@export var move_speed: float = 148.0
@export var sprint_speed: float = 210.0
@export var attack_damage: int = 26
@export var attack_range: float = 46.0

@onready var anim_player: AnimationPlayer = $Character3DViewport/CharacterModel/AnimationPlayer if has_node("Character3DViewport/CharacterModel/AnimationPlayer") else null
@onready var char_model: Node3D = $Character3DViewport/CharacterModel if has_node("Character3DViewport/CharacterModel") else null
@onready var attack_area: Area2D = $AttackArea
@onready var attack_slash_fx: Sprite2D = $AttackSlashFX
@onready var lantern_light: PointLight2D = $LanternLight
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5

var is_attacking: bool = false
var is_gathering: bool = false
var gather_target = null
var gather_timer: float = 0.0

<<<<<<< HEAD
var facing_direction: Vector3 = Vector3.BACK
var current_anim: String = "idle"

func _ready() -> void:
=======
var facing_direction: Vector2 = Vector2.DOWN
var current_anim: String = "idle"

func _ready() -> void:
	if attack_slash_fx:
		attack_slash_fx.visible = false
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
	play_anim("idle")

func _physics_process(delta: float) -> void:
	if is_gathering:
		handle_gathering(delta)
		return
		
	if is_attacking:
<<<<<<< HEAD
		velocity.x = move_toward(velocity.x, 0.0, 15.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 15.0 * delta)
=======
		velocity = velocity.move_toward(Vector2.ZERO, 350.0 * delta)
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		move_and_slide()
		return
		
	handle_movement(delta)
	handle_combat()

func handle_movement(delta: float) -> void:
<<<<<<< HEAD
	var input_dir = Vector2(
=======
	var input_vector = Vector2(
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_down") - Input.get_action_strength("move_up")
	)
	
<<<<<<< HEAD
	if input_dir.length_squared() > 0.01:
		input_dir = input_dir.normalized()
		var move_vec = Vector3(input_dir.x, 0.0, input_dir.y)
		facing_direction = move_vec
		
		var is_sprinting = Input.is_action_pressed("sprint")
		var target_speed = sprint_speed if is_sprinting else move_speed
		
		velocity.x = move_toward(velocity.x, move_vec.x * target_speed, 35.0 * delta)
		velocity.z = move_toward(velocity.z, move_vec.z * target_speed, 35.0 * delta)
		
		var anim_name = "run" if is_sprinting else "walk"
		play_anim(anim_name)
		
		# Putar karakter menghadap arah gerak
		if char_model:
			var target_rot = atan2(move_vec.x, move_vec.z)
			char_model.rotation.y = lerp_angle(char_model.rotation.y, target_rot, 14.0 * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, 40.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 40.0 * delta)
=======
	if input_vector.length_squared() > 0.01:
		input_vector = input_vector.normalized()
		facing_direction = input_vector
		
		# Proyeksi 2.5D camera 3/4 down: sumbu Y diperas vertikal (dimetric 2:1 ratio)
		var is_sprinting = Input.is_action_pressed("sprint")
		var target_speed = sprint_speed if is_sprinting else move_speed
		
		velocity.x = move_toward(velocity.x, input_vector.x * target_speed, 900.0 * delta)
		velocity.y = move_toward(velocity.y, input_vector.y * target_speed * 0.75, 900.0 * delta)
		
		var anim_name = "run" if is_sprinting else "walk"
		play_anim(anim_name)
		update_3d_rotation(facing_direction)
	else:
		velocity = velocity.move_toward(Vector2.ZERO, 950.0 * delta)
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
		play_anim("idle")
		
	move_and_slide()

func handle_combat() -> void:
	if Input.is_action_just_pressed("attack") and not is_attacking:
		start_attack()

func start_attack() -> void:
	is_attacking = true
	play_anim("box_03") # Animasi serangan tinju / ayunan bilah dayung
	
<<<<<<< HEAD
	# Deteksi musuh di area tebasan 3D
	if attack_area:
		var enemies = attack_area.get_overlapping_bodies()
		for enemy in enemies:
			if enemy.is_in_group("zombies") and enemy.has_method("take_damage"):
				var knock_dir = (enemy.global_position - global_position).normalized()
				enemy.take_damage(attack_damage, knock_dir)
				
	await get_tree().create_timer(0.35).timeout
	is_attacking = false

func handle_gathering(delta: float) -> void:
	velocity = Vector3.ZERO
=======
	if attack_slash_fx:
		attack_slash_fx.visible = true
		attack_slash_fx.rotation = facing_direction.angle()
		
	# Deteksi musuh di area tebasan
	var enemies = attack_area.get_overlapping_bodies()
	for enemy in enemies:
		if enemy.is_in_group("zombies") and enemy.has_method("take_damage"):
			var knock_dir = (enemy.global_position - global_position).normalized()
			enemy.take_damage(attack_damage, knock_dir)
			
	await get_tree().create_timer(0.35).timeout
	if attack_slash_fx:
		attack_slash_fx.visible = false
	is_attacking = false

func handle_gathering(delta: float) -> void:
	velocity = Vector2.ZERO
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
	gather_timer -= delta
	if gather_timer <= 0:
		if gather_target and gather_target.has_method("harvest"):
			gather_target.harvest()
		is_gathering = false
		gather_target = null

func start_gather(node_target, duration: float) -> void:
	is_gathering = true
	gather_target = node_target
	gather_timer = duration
	play_anim("idle")

func cancel_gather() -> void:
	is_gathering = false
	gather_target = null

<<<<<<< HEAD
=======
func update_3d_rotation(dir: Vector2) -> void:
	if char_model:
		# Putar model 3D GLB mengikuti arah hadap kontinu 360°
		var angle_rad = -dir.angle() + PI / 2.0
		char_model.rotation.y = angle_rad

>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
func play_anim(anim_name: String) -> void:
	if current_anim == anim_name:
		return
	current_anim = anim_name
	if anim_player and anim_player.has_animation(anim_name):
		anim_player.play(anim_name, 0.15)
