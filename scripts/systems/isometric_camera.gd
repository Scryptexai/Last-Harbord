extends Node3D
# =============================================================================
# Isometric Camera — Premium Mobile Isometric Survival 3D — LOCKED per Phase 5
# Benchmark: Doomsday: Last Survivors settlement screenshots
# Previous 38° pitch 18° yaw 11-14.5m distance 42° FOV human-height survival cam REJECTED
# New: Ortho 52° pitch 40° yaw size 22 OR Persp FOV 15° distance 35m
# Player 1.70m ruler, player screen 3.5-5% (3.8% target), HQ 12-16% (11.9% target), visible 60-80m (65m target)
# Walls parallel, roof 70% top 30% side, wide world visibility, premium mobile isometric
# LOCKED: cannot rotate freely like Doomsday locked based on character position
# =============================================================================

@export var target: Node3D = null
@export var smooth_speed: float = 6.0  # 5-8 damping per CAMERA_BENCHMARK.md

# LOCKED per CAMERA_COMPARISON.md — Ortho 52°/40°/22 primary
@export var pitch_angle_deg: float = 52.0  # LOCKED 50-55° range, 52° target — roof 70% top 30% side
@export var yaw_angle_deg: float = 40.0    # LOCKED 35-45° range, 40° target — classic isometric diagonal
@export var ortho_size: float = 28.0       # QA 2026-09-26: camera terlalu dekat -> perbesarkan 24→28-30 wide view 56m tall 80m diameter
@export var is_orthographic: bool = true   # true = ortho, false = long perspective fallback
@export var perspective_fov: float = 15.0  # if not ortho, FOV 10-20° range, 15° target
@export var perspective_distance: float = 42.0  # QA 2026-09-26: 38→42 lebih jauh agar semua terlihat, distance 28-45m range

@export var min_distance: float = 5.0
@export var look_ahead: float = 2.2  # QA 2026-09-26: 2.0→2.2 path visibility lebih luas

@onready var camera_node: Camera3D = $Camera3D

var _current_yaw: float = 40.0
var _last_player_pos: Vector3 = Vector3.ZERO
var _heading: Vector3 = Vector3(0, 0, 1)
var _aim_point: Vector3 = Vector3.ZERO

func _ready() -> void:
	_current_yaw = yaw_angle_deg
	if target:
		_last_player_pos = target.global_position
		_aim_point = target.global_position
	_apply_camera_config()

func _apply_camera_config() -> void:
	rotation_degrees = Vector3(-pitch_angle_deg, _current_yaw, 0.0)
	if camera_node:
		if is_orthographic:
			camera_node.projection = Camera3D.PROJECTION_ORTHOGONAL
			camera_node.size = ortho_size
		else:
			camera_node.projection = Camera3D.PROJECTION_PERSPECTIVE
			camera_node.fov = perspective_fov
			camera_node.position = Vector3(0, 0, perspective_distance)

func _process(delta: float) -> void:
	if not target:
		return

	var p := target.global_position
	var delta_pos := p - _last_player_pos
	if delta_pos.length() > 0.02:
		var target_heading := delta_pos.normalized()
		_heading = _heading.lerp(target_heading, min(1.0, 3.0 * delta)).normalized()
	_last_player_pos = p

	# Yaw follows heading with deadzone 2deg to avoid oscillation — locked azimuth per Doomsday
	var desired_yaw := rad_to_deg(atan2(_heading.x, _heading.z)) + 180.0 + yaw_angle_deg
	var diff := wrapf(desired_yaw - _current_yaw, -180.0, 180.0)
	if abs(diff) > 2.0:
		_current_yaw += diff * min(1.0, 4.5 * delta * 0.7)

	# Damped follow with look-ahead
	var look_ahead_point := p + _heading * look_ahead + Vector3(0, 1.1, 0)
	_aim_point = _aim_point.lerp(look_ahead_point, min(1.0, smooth_speed * delta * 0.8))
	global_position = _aim_point

	# Apply locked angles — cannot rotate freely like Doomsday
	rotation_degrees = Vector3(-pitch_angle_deg, _current_yaw, 0.0)
	if camera_node:
		if is_orthographic:
			camera_node.projection = Camera3D.PROJECTION_ORTHOGONAL
			camera_node.size = ortho_size
			camera_node.position = Vector3.ZERO
		else:
			camera_node.projection = Camera3D.PROJECTION_PERSPECTIVE
			camera_node.fov = perspective_fov
			camera_node.position = Vector3(0, 0, perspective_distance)
			# Collision avoidance for perspective
			var space_state = get_world_3d().direct_space_state
			var from = global_position
			var to = global_position + (camera_node.global_position - global_position)
			var query = PhysicsRayQueryParameters3D.create(from, to)
			query.exclude = [target] if target else []
			var result = space_state.intersect_ray(query)
			if result:
				var dist = from.distance_to(result.position)
				if dist < perspective_distance and dist > min_distance:
					camera_node.position = Vector3(0, 0, dist * 0.9)
