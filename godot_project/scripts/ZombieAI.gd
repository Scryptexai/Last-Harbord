extends CharacterBody2D

# ==============================================================================
# Last Harbor - ZombieAI (Godot 4)
# Mengatur kecerdasan buatan zombie berjenjang tingkat bahaya (Problem 2).
# Tier 1 (Scavenger) -> Tier 2 (Armored Brute & Runner) -> Tier 3 (Night Terror).
# Dilengkapi telegraph serangan merah, mata bersinar 2D Light, dan panggilan kawanan.
# ==============================================================================

enum ZombieTier { TIER1_SCAVENGER, TIER2_ARMORED, TIER2_RUNNER, TIER3_NIGHT_TERROR }
@export var tier: ZombieTier = ZombieTier.TIER1_SCAVENGER

var hp: int = 60
var max_hp: int = 60
var move_speed: float = 42.0
var damage: int = 6
var aggro_range: float = 160.0

@onready var eye_light: PointLight2D = $EyeLight
@onready var telegraph_indicator: Line2D = $TelegraphIndicator
@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D if has_node("AnimatedSprite2D") else null

var player_target: Node2D = null
var is_chasing: bool = false
var is_telegraphing: bool = false
var telegraph_timer: float = 0.0

func _ready() -> void:
	add_to_group("zombies")
	setup_tier_attributes()
	if telegraph_indicator:
		telegraph_indicator.visible = false

func setup_tier_attributes() -> void:
	match tier:
		ZombieTier.TIER1_SCAVENGER:
			max_hp = 60
			move_speed = 42.0
			damage = 6
			aggro_range = 150.0
			if eye_light:
				eye_light.color = Color(1.0, 0.2, 0.2, 0.7)
		ZombieTier.TIER2_ARMORED:
			max_hp = 130
			move_speed = 30.0
			damage = 14
			aggro_range = 140.0
			if eye_light:
				eye_light.color = Color(1.0, 0.5, 0.1, 0.9)
		ZombieTier.TIER2_RUNNER:
			max_hp = 25
			move_speed = 104.0
			damage = 4
			aggro_range = 210.0
			if eye_light:
				eye_light.color = Color(1.0, 0.85, 0.1, 0.85)
		ZombieTier.TIER3_NIGHT_TERROR:
			max_hp = 180
			move_speed = 68.0
			damage = 22
			aggro_range = 260.0
			if eye_light:
				eye_light.color = Color(0.9, 0.05, 0.2, 1.0)
				eye_light.energy = 1.6
	hp = max_hp

func _physics_process(delta: float) -> void:
	if not player_target:
		var players = get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			player_target = players[0]
			
	if is_telegraphing:
		telegraph_timer -= delta
		if telegraph_timer <= 0:
			execute_attack()
		return
		
	if player_target:
		var d = global_position.distance_to(player_target.global_position)
		if d < aggro_range:
			if not is_chasing:
				start_chase()
			
			if d < 38.0:
				start_telegraph()
			else:
				var dir = (player_target.global_position - global_position).normalized()
				# 2.5D foreshortening: gerakan vertikal diperas
				velocity = Vector2(dir.x * move_speed, dir.y * move_speed * 0.75)
				move_and_slide()
		else:
			is_chasing = false
			velocity = velocity.move_toward(Vector2.ZERO, 100.0 * delta)
			move_and_slide()

func start_chase() -> void:
	is_chasing = true
	# Panggilan kawanan (pack alert)
	call_pack_alert()

func call_pack_alert() -> void:
	var nearby_zombies = get_tree().get_nodes_in_group("zombies")
	for z in nearby_zombies:
		if z != self and global_position.distance_to(z.global_position) < 220.0:
			z.aggro_range = 300.0 # Bangunkan tetangga terdekat

func start_telegraph() -> void:
	is_telegraphing = true
	telegraph_timer = 0.45
	velocity = Vector2.ZERO
	if telegraph_indicator:
		telegraph_indicator.visible = true

func execute_attack() -> void:
	if telegraph_indicator:
		telegraph_indicator.visible = false
	if player_target and global_position.distance_to(player_target.global_position) < 48.0:
		GameManager.damage_player(damage)
	is_telegraphing = false

func take_damage(amount: int, knock_direction: Vector2) -> void:
	hp -= amount
	velocity = knock_direction * 180.0
	move_and_slide()
	if hp <= 0:
		die()

func die() -> void:
	# Jatuhkan resource node untuk dipanen
	queue_free()
