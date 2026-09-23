extends CharacterBody3D

# ==============================================================================
# Zombie AI Controller (Godot 4)
# Musuh infeksi di pulau ekspedisi.
# Memiliki sistem State Machine: IDLE, WANDER, CHASE, WINDUP, ATTACK, HURT, DEAD.
# ==============================================================================

signal died(zombie)
signal took_damage(current_hp, max_hp)

enum State {
	IDLE,
	WANDER,
	CHASE,
	WINDUP,
	ATTACK,
	HURT,
	DEAD
}

@export_enum("walker", "runner") var zombie_type: String = "walker"
@export var max_health: int = 60
@export var move_speed: float = 1.8
@export var chase_speed: float = 2.8
@export var damage: int = 20
@export var detection_radius: float = 9.0
@export var attack_radius: float = 1.5

var current_health: int = 60
var current_state: State = State.IDLE
var player_target: CharacterBody3D = null

var wander_timer: float = 0.0
var wander_dir: Vector3 = Vector3.ZERO
var attack_timer: float = 0.0
var attack_cooldown: float = 1.6
var is_flashing: bool = false

@onready var visual_model: Node3D = $VisualModel
@onready var hp_label: Label3D = $HPLabel
@onready var detection_area: Area3D = $DetectionArea
@onready var attack_area: Area3D = $AttackArea

func _ready() -> void:
	add_to_group("enemies")
	if zombie_type == "runner":
		max_health = 35
		move_speed = 2.2
		chase_speed = 4.0
		damage = 15
		attack_cooldown = 1.0
	current_health = max_health
	_update_hp_display()

func _physics_process(delta: float) -> void:
	if current_state == State.DEAD:
		return
	
	# Apply gravity
	if not is_on_floor():
		velocity.y -= 9.8 * delta
	
	# Find player if not assigned
	if not player_target:
		player_target = get_tree().get_first_node_in_group("player")
	
	match current_state:
		State.IDLE:
			velocity.x = move_toward(velocity.x, 0, 5.0 * delta)
			velocity.z = move_toward(velocity.z, 0, 5.0 * delta)
			wander_timer -= delta
			if wander_timer <= 0:
				wander_timer = randf_range(2.0, 4.0)
				wander_dir = Vector3(randf_range(-1, 1), 0, randf_range(-1, 1)).normalized()
				current_state = State.WANDER
			_check_player_detection()
		
		State.WANDER:
			velocity.x = wander_dir.x * move_speed
			velocity.z = wander_dir.z * move_speed
			if wander_dir.length_squared() > 0.01:
				rotation.y = lerp_angle(rotation.y, atan2(wander_dir.x, wander_dir.z), 6.0 * delta)
			wander_timer -= delta
			if wander_timer <= 0:
				wander_timer = randf_range(1.5, 3.0)
				current_state = State.IDLE
			_check_player_detection()
		
		State.CHASE:
			if player_target:
				var to_player = player_target.global_position - global_position
				to_player.y = 0
				var dist = to_player.length()
				if dist <= attack_radius:
					current_state = State.WINDUP
					attack_timer = 0.35 # windup time
				elif dist > detection_radius * 1.5:
					# Lost player
					current_state = State.IDLE
				else:
					var dir = to_player.normalized()
					velocity.x = dir.x * chase_speed
					velocity.z = dir.z * chase_speed
					rotation.y = lerp_angle(rotation.y, atan2(dir.x, dir.z), 10.0 * delta)
		
		State.WINDUP:
			velocity.x = move_toward(velocity.x, 0, 8.0 * delta)
			velocity.z = move_toward(velocity.z, 0, 8.0 * delta)
			attack_timer -= delta
			if attack_timer <= 0:
				_execute_attack()
		
		State.ATTACK:
			velocity.x = move_toward(velocity.x, 0, 10.0 * delta)
			velocity.z = move_toward(velocity.z, 0, 10.0 * delta)
			attack_timer -= delta
			if attack_timer <= 0:
				current_state = State.CHASE
		
		State.HURT:
			velocity.x = move_toward(velocity.x, 0, 6.0 * delta)
			velocity.z = move_toward(velocity.z, 0, 6.0 * delta)
			attack_timer -= delta
			if attack_timer <= 0:
				current_state = State.CHASE
	
	move_and_slide()

func _check_player_detection() -> void:
	if player_target:
		var d = global_position.distance_to(player_target.global_position)
		if d <= detection_radius:
			alert_zombie()

func alert_zombie() -> void:
	if current_state != State.CHASE && current_state != State.DEAD:
		current_state = State.CHASE
		# Flocking alert to nearby zombies
		var all_zombies = get_tree().get_nodes_in_group("enemies")
		for z in all_zombies:
			if z != self and is_instance_valid(z) and z.has_method("alert_zombie"):
				if global_position.distance_to(z.global_position) < 7.0:
					z.alert_zombie()

func _execute_attack() -> void:
	current_state = State.ATTACK
	attack_timer = 0.5
	if player_target:
		var dist = global_position.distance_to(player_target.global_position)
		if dist <= attack_radius + 0.6:
			if player_target.has_method("take_damage"):
				var knockback = (player_target.global_position - global_position).normalized()
				player_target.take_damage(damage, knockback)

func take_damage(amount: int, knockback_dir: Vector3 = Vector3.ZERO) -> void:
	if current_state == State.DEAD:
		return
	
	current_health = max(0, current_health - amount)
	_update_hp_display()
	took_damage.emit(current_health, max_health)
	
	# Apply knockback
	velocity = knockback_dir * 4.5
	current_state = State.HURT
	attack_timer = 0.3
	alert_zombie()
	_flash_red()
	
	if current_health <= 0:
		_die()

func _flash_red() -> void:
	if visual_model:
		var tween = create_tween()
		tween.tween_property(visual_model, "scale", Vector3(1.15, 0.9, 1.15), 0.08)
		tween.tween_property(visual_model, "scale", Vector3(1.0, 1.0, 1.0), 0.12)

func _die() -> void:
	current_state = State.DEAD
	died.emit(self)
	if hp_label:
		hp_label.visible = false
	
	# Spawn scrap loot
	var loot_res = preload("res://scenes/resources/ResourceNode.tscn")
	if loot_res:
		var loot = loot_res.instantiate()
		loot.resource_type = "metal" if randf() > 0.5 else "food"
		loot.amount = 1
		loot.position = global_position + Vector3(0, 0.2, 0)
		get_parent().call_deferred("add_child", loot)
	
	var tween = create_tween()
	tween.tween_property(visual_model, "rotation:x", -1.4, 0.3)
	tween.tween_property(self, "scale", Vector3(0.01, 0.01, 0.01), 0.4)
	tween.tween_callback(queue_free)

func _update_hp_display() -> void:
	if hp_label:
		var bar = ""
		var filled = int((float(current_health) / float(max_health)) * 5.0)
		for i in range(5):
			bar += "■" if i < filled else "□"
		hp_label.text = bar
