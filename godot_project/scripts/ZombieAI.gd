extends CharacterBody3D

# ==============================================================================
# Last Harbor - ZombieAI (Godot 4)
# Mengatur kecerdasan buatan zombie berjenjang tingkat bahaya (Problem 2).
# Tier 1 (Scavenger) -> Tier 2 (Armored Brute & Runner) -> Tier 3 (Night Terror).
# Dilengkapi telegraph serangan merah, mata bersinar OmniLight3D, dan panggilan kawanan.
# ==============================================================================

enum ZombieTier { TIER1_SCAVENGER, TIER2_ARMORED, TIER2_RUNNER, TIER3_NIGHT_TERROR }
@export var tier: ZombieTier = ZombieTier.TIER1_SCAVENGER

var hp: int = 60
var max_hp: int = 60
var move_speed: float = 2.4
var damage: int = 6
var aggro_range: float = 12.0

@onready var eye_light: OmniLight3D = $EyeLight if has_node("EyeLight") else null

var player_target: Node3D = null
var is_chasing: bool = false
var is_telegraphing: bool = false
var telegraph_timer: float = 0.0

func _ready() -> void:
	add_to_group("zombies")
	setup_tier_attributes()

func setup_tier_attributes() -> void:
	match tier:
		ZombieTier.TIER1_SCAVENGER:
			max_hp = 60
			move_speed = 2.4
			damage = 6
			aggro_range = 11.0
			if eye_light:
				eye_light.light_color = Color(1.0, 0.2, 0.2, 1.0)
				eye_light.light_energy = 1.0
		ZombieTier.TIER2_ARMORED:
			max_hp = 130
			move_speed = 1.8
			damage = 14
			aggro_range = 10.0
			if eye_light:
				eye_light.light_color = Color(1.0, 0.5, 0.1, 1.0)
				eye_light.light_energy = 1.4
		ZombieTier.TIER2_RUNNER:
			max_hp = 25
			move_speed = 5.2
			damage = 4
			aggro_range = 15.0
			if eye_light:
				eye_light.light_color = Color(1.0, 0.85, 0.1, 1.0)
				eye_light.light_energy = 1.3
		ZombieTier.TIER3_NIGHT_TERROR:
			max_hp = 180
			move_speed = 3.8
			damage = 22
			aggro_range = 18.0
			if eye_light:
				eye_light.light_color = Color(0.95, 0.05, 0.1, 1.0)
				eye_light.light_energy = 2.5
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
			
			if d < 1.8:
				start_telegraph()
			else:
				var dir = (player_target.global_position - global_position).normalized()
				velocity.x = dir.x * move_speed
				velocity.z = dir.z * move_speed
				move_and_slide()
				
				var target_rot = atan2(dir.x, dir.z)
				rotation.y = lerp_angle(rotation.y, target_rot, 10.0 * delta)
		else:
			is_chasing = false
			velocity.x = move_toward(velocity.x, 0.0, 10.0 * delta)
			velocity.z = move_toward(velocity.z, 0.0, 10.0 * delta)
			move_and_slide()

func start_chase() -> void:
	is_chasing = true
	call_pack_alert()

func call_pack_alert() -> void:
	var nearby_zombies = get_tree().get_nodes_in_group("zombies")
	for z in nearby_zombies:
		if z != self and global_position.distance_to(z.global_position) < 14.0:
			z.aggro_range = 22.0

func start_telegraph() -> void:
	is_telegraphing = true
	telegraph_timer = 0.45
	velocity = Vector3.ZERO

func execute_attack() -> void:
	if player_target and global_position.distance_to(player_target.global_position) < 2.2:
		var gm = get_node_or_null("/root/GameManager")
		if gm:
			gm.damage_player(damage)
	is_telegraphing = false

func take_damage(amount: int, knock_direction: Vector3) -> void:
	hp -= amount
	velocity = knock_direction * 8.0
	move_and_slide()
	if hp <= 0:
		die()

func die() -> void:
	queue_free()
