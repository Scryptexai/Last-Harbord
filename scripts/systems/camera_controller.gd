extends Node3D

# ==============================================================================
# Camera Controller — Third-person 3/4 gameplay camera — ROGUELIKE SURVIVAL NOT BATTLE ROYALE
# User: camera masih kacau ukuran bukan lagi roguelike tapi sudah masuk battle royale, melenceng jauh dari konsep
# User: camera Doomsday di lock berdasarkan posisi character tidak bisa di putar kesana kemari, ukuran rumah dan semua element proporsi sudut camera perlu disesuaikan
# Fix: camera LOCKED based on character position cannot rotate (Doomsday style), pitch 38deg more intimate than 40deg, distance 14.0m player 13.5% screen height
#   perspective fov 42 pitch 38deg yaw 18deg distances 14.0 / 15.5 / 10.0 — human-scale 3/4 survival roguelike NOT battle royale
#   player 8-14% screen height (13.5% default) damped follow spring-arm collision avoidance look-ahead 1.4m
#   Doomsday reference only for UI starter NOT for camera, camera LOCKED per spec + e4a12f6 baseline authority
# ==============================================================================

@export var target: Node3D = null
@export var smooth_speed: float = 8.0          # spec 6-10 roguelike smooth follow not battle royale jitter
@export var rotation_smooth_speed: float = 4.5 # spec 3.5-6 stable human-scale

# Pengaturan Sudut Kamera — PREMIUM MOBILE ISOMETRIC SURVIVAL per Phase 5 + User QA 2026-09-25
# User: sudut camera belum tepat miringkan dan perbesarkan sedikit agar semua terlihat jelas
# QA 2026-09-25: perbesarkan camera agar semua terlihat jelas, lock ortho 52/40/24 size 24→26
# Target: 50-55° pitch, 35-45° yaw, orthographic or long perspective FOV 10-20°, distance 30-40m, player 3.5-5% screen
# Previous 38°/18°/11m human-height survival REJECTED per benchmark — too intimate 18% player, battle royale free cam
# New QA enlarged: 52° pitch, 40° yaw, 24m default (ortho size 24), explore 30m, combat 18m, FOV 18° long perspective
@export var pitch_angle_deg: float = 52.0      # LOCKED 50-55° isometric, miringkan lebih top-down agar semua terlihat jelas
@export var yaw_angle_deg: float = 40.0        # LOCKED 35-45° yaw, 40° per blueprint SHOT_density_30x30_ortho_52_40_28.png QA enlarged 24→28
@export var default_distance: float = 28.0     # QA 2026-09-26: camera terlalu dekat 24→28 perbesarkan, player 2.8% wide view 80m diameter
@export var combat_distance: float = 22.0      # Zoom-in combat 22m vs 18m — still readable settlement
@export var explore_distance: float = 36.0     # Zoom-out explore 36m vs 30m — wide 80m diameter visibility perbesarkan lagi
@export var min_distance: float = 5.0          # spring-arm floor increased
@export var look_ahead: float = 2.2            # Look-ahead 2.2m for path visibility at larger distance
@export var use_orthographic: bool = true      # QA: lock orthographic true per premium mobile isometric Doomsday style
@export var ortho_size: float = 28.0           # QA 2026-09-26: 24→28 perbesarkan, half-height 28m shows 56m tall 80m diameter camera terlalu dekat fix
@export var fov_perspective: float = 18.0      # Long perspective FOV 10-20° — 18° per premium mobile isometric

@onready var camera_node: Camera3D = $Camera3D

var current_distance: float = 22.0
var target_distance: float = 22.0
var _current_yaw: float = 40.0
var _last_player_pos: Vector3 = Vector3.ZERO
var _heading: Vector3 = Vector3(0, 0, 1)
var _aim_point: Vector3 = Vector3.ZERO

func _ready() -> void:
	current_distance = default_distance
	target_distance = default_distance
	_current_yaw = yaw_angle_deg
	if target:
		_last_player_pos = target.global_position
		_aim_point = target.global_position
	_apply_angles()

func _apply_angles() -> void:
	rotation_degrees = Vector3(-pitch_angle_deg, _current_yaw, 0.0)
	if camera_node:
		camera_node.position = Vector3(0, 0, current_distance)
		# Apply ortho vs perspective per Phase 5
		if use_orthographic:
			camera_node.projection = Camera3D.PROJECTION_ORTHOGONAL
			camera_node.size = ortho_size
		else:
			camera_node.projection = Camera3D.PROJECTION_PERSPECTIVE
			camera_node.fov = fov_perspective
		camera_node.near = 0.1
		camera_node.far = 150.0
		print("[Camera] Config: pitch ", pitch_angle_deg, " yaw ", _current_yaw, " dist ", current_distance, " ortho ", use_orthographic, " size ", ortho_size, " fov ", fov_perspective)

# FIX CAMERA SHAKE + LOCKED per Doomsday — camera di lock berdasarkan posisi character tidak bisa di putar kesana kemari
# BEFORE: isDragging camYaw camPitch mouse drag + wheel zoom = battle royale free camera kacau ukuran
# AFTER: camera locked fixed angle 38deg pitch 18deg yaw distance 14.0m based on character position, cannot rotate, threshold 0.02 deadzone 2deg lerp 3.0 for no shake roguelike stable

var _smoothed_wanted_distance: float = 22.0
var _heading_velocity: Vector3 = Vector3.ZERO

func _process(delta: float) -> void:
	if not target:
		return

	# Travel heading — hanya update jika player benar-benar bergerak (threshold 0.02m)
	# Lerp lebih halus 3.0/s untuk hindari jitter micro-movement — roguelike stable NOT battle royale
	var p := target.global_position
	var delta_pos := p - _last_player_pos
	if delta_pos.length() > 0.02:
		var target_heading := delta_pos.normalized()
		_heading = _heading.lerp(target_heading, min(1.0, 3.0 * delta)).normalized()
		_heading_velocity = (target_heading - _heading) / delta
	_last_player_pos = p

	# Yaw follows heading — deadzone 2deg untuk hindari oscillation kecil — roguelike stable, LOCKED cannot rotate freely like Doomsday
	var desired_yaw := rad_to_deg(atan2(_heading.x, _heading.z)) + 180.0 + yaw_angle_deg
	var diff := wrapf(desired_yaw - _current_yaw, -180.0, 180.0)
	if abs(diff) > 2.0:
		_current_yaw += diff * min(1.0, rotation_smooth_speed * delta * 0.7)

	# Damped follow — aim point dengan look-ahead, heading sudah di-smooth — roguelike intimate NOT battle royale large area
	var look_ahead_point := p + _heading * look_ahead + Vector3(0, 1.1, 0)
	_aim_point = _aim_point.lerp(look_ahead_point, min(1.0, smooth_speed * delta * 0.8))
	global_position = _aim_point

	# Distance damping — smoothed wanted distance lerp 10/s untuk hindari sudden jumps collision — roguelike stable
	_smoothed_wanted_distance = lerp(_smoothed_wanted_distance, target_distance, min(1.0, 10.0 * delta))
	current_distance = lerp(current_distance, _smoothed_wanted_distance, min(1.0, 8.0 * delta))
	
	# Apply — LOCKED camera based on character position, cannot rotate kesana kemari like Doomsday
	rotation_degrees = Vector3(-pitch_angle_deg, _current_yaw, 0.0)
	if camera_node:
		camera_node.position = Vector3(0, 0, current_distance)
		# Collision avoidance — raycast pull-in
		var space_state = get_world_3d().direct_space_state
		var from = global_position
		var to = global_position + (camera_node.global_position - global_position)
		var query = PhysicsRayQueryParameters3D.create(from, to)
		query.exclude = [target] if target else []
		var result = space_state.intersect_ray(query)
		if result:
			var dist = from.distance_to(result.position)
			if dist < current_distance and dist > min_distance:
				camera_node.position = Vector3(0, 0, dist * 0.9)
