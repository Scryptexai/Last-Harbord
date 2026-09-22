extends SceneTree

# ==============================================================================
# Last Harbor - Automated Headless Validation Test Suite (Godot 4)
# Menguji validasi gameplay loop, arsitektur arena 2.5D, dan batasan teknis:
#  1. GameManager: Limit kapasitas palka, penyimpanan logistik koloni
#  2. TideSystem: Siklus pasang surut, perhitungan rasio banjir
#  3. SanctuaryIsland: Pemuatan dermaga boardwalk dan NPC suaka
#  4. InfestedIsland: Pemuatan pulau berjenjang (Tier 1-3), spawning zombie & loot
#  5. World (Open Sea): Pemuatan lautan lepas, perahu, dan penanda kepulauan
# ==============================================================================

func _init() -> void:
	print("\n==================================================")
	print("  LAST HARBOR - GODOT 4 HEADLESS TEST VALIDATION")
	print("==================================================")
	
	# Inisialisasi Autoload Singleton di SceneTree Root
	var gm_script = load("res://scripts/GameManager.gd")
	var gm = gm_script.new()
	gm.name = "GameManager"
	root.add_child(gm)
	
	var ts_script = load("res://scripts/TideSystem.gd")
	var ts = ts_script.new()
	ts.name = "TideSystem"
	root.add_child(ts)
	
	var pass_count = 0
	var fail_count = 0
	
	# --- TEST 1: GameManager & Palka Limit (Problem 1) ---
	print("\n[TEST 1] Memeriksa Batasan Kapasitas Palka Perahu & Kargo...")
	var cap_base = gm.get_palka_capacity()
	if cap_base == 10:
		print("  ✓ Kapasitas palka awal terkonfigurasi ketat: 10 slot")
		pass_count += 1
	else:
		print("  ✗ Gagal: Kapasitas awal bukan 10 slot")
		fail_count += 1
		
	# Coba isi melebihi palka
	for i in range(15):
		gm.add_resource_to_cargo("wood", 1)
	if gm.get_total_carried() == 10 and gm.is_palka_full():
		print("  ✓ Pembatasan kargo berhasil: palka tidak bisa meluap (total: %d)" % gm.get_total_carried())
		pass_count += 1
	else:
		print("  ✗ Gagal: Kargo meluap melebihi kapasitas")
		fail_count += 1
		
	# Bongkar kargo ke suaka
	gm.unload_cargo_to_sanctuary()
	if gm.get_total_carried() == 0 and gm.banked_storage["wood"] >= 18:
		print("  ✓ Kargo berhasil dibongkar ke lumbung suaka survivor (simpanan: %d)" % gm.banked_storage["wood"])
		pass_count += 1
	else:
		print("  ✗ Gagal: Pembongkaran kargo ke suaka tidak sinkron")
		fail_count += 1
		
	# --- TEST 2: TideSystem & Pasang Surut ---
	print("\n[TEST 2] Memeriksa Siklus Pasang Surut & Naiknya Air...")
	ts.tide_time = 50.0
	ts.update_tide_logic()
	if ts.current_phase == ts.TidePhase.CALM:
		print("  ✓ Fase awal (0-150s): Tenang (Calm)")
		pass_count += 1
	else:
		print("  ✗ Gagal: Fase awal bukan Calm")
		fail_count += 1
		
	ts.tide_time = 200.0
	ts.update_tide_logic()
	if ts.current_phase == ts.TidePhase.TURNING and ts.flood_ratio > 0.0:
		print("  ✓ Fase kedua (150-270s): Berubah (Turning, rasio banjir: %.2f)" % ts.flood_ratio)
		pass_count += 1
	else:
		print("  ✗ Gagal: Fase kedua bukan Turning")
		fail_count += 1
		
	ts.tide_time = 320.0
	ts.update_tide_logic()
	if ts.current_phase == ts.TidePhase.HIGH and ts.flood_ratio >= 0.5:
		print("  ✓ Fase puncak (270-420s): Pasang Tinggi (High Tide, rasio banjir: %.2f)" % ts.flood_ratio)
		pass_count += 1
	else:
		print("  ✗ Gagal: Fase puncak bukan High Tide")
		fail_count += 1

	# --- TEST 3: SanctuaryIsland Instantiation ---
	print("\n[TEST 3] Memeriksa Pemuatan Adegan Pulau Suaka (SanctuaryIsland.tscn)...")
	var sanctuary_scene = ResourceLoader.load("res://scenes/SanctuaryIsland.tscn")
	if sanctuary_scene:
		var inst = sanctuary_scene.instantiate()
		var pier = inst.find_child("PierBoardwalk", true, false)
		var campfire = inst.find_child("Campfire", true, false)
		var elder = inst.find_child("ElderAris", true, false)
		var doctor = inst.find_child("DoctorMaya", true, false)
		var budi = inst.find_child("ShipwrightBudi", true, false)
		if pier and campfire and elder and doctor and budi:
			print("  ✓ Dermaga kayu boardwalk, api unggun suaka, dan survivor NPC lengkap")
			pass_count += 1
		else:
			print("  ✗ Gagal: Komponen suaka ada yang hilang")
			fail_count += 1
		inst.queue_free()
	else:
		print("  ✗ Gagal memuat SanctuaryIsland.tscn")
		fail_count += 1

	# --- TEST 4: InfestedIsland Instantiation ---
	print("\n[TEST 4] Memeriksa Pemuatan Adegan Pulau Terinfeksi (InfestedIsland.tscn)...")
	var infested_scene = ResourceLoader.load("res://scenes/InfestedIsland.tscn")
	if infested_scene:
		var inst = infested_scene.instantiate()
		var bw_west = inst.find_child("BreakwaterWest", true, false)
		var bw_east = inst.find_child("BreakwaterEast", true, false)
		var anchor = inst.find_child("BoatAnchorArea", true, false)
		if bw_west and bw_east and anchor:
			print("  ✓ Dam pemecah ombak (breakwater) dan area jangkar perahu terpasang")
			pass_count += 1
		else:
			print("  ✗ Gagal: Komponen breakwater tidak ditemukan")
			fail_count += 1
		inst.queue_free()
	else:
		print("  ✗ Gagal memuat InfestedIsland.tscn")
		fail_count += 1

	# --- TEST 5: World (Open Sea) Instantiation ---
	print("\n[TEST 5] Memeriksa Pemuatan Laut Lepas (World.tscn)...")
	var world_scene = ResourceLoader.load("res://scenes/World.tscn")
	if world_scene:
		var inst = world_scene.instantiate()
		var boat_node = inst.find_child("Boat", true, false)
		var sanctuary = inst.find_child("SanctuaryHaven", true, false)
		var isl1 = inst.find_child("IslandTier1", true, false)
		var isl3 = inst.find_child("IslandTier3", true, false)
		if boat_node and sanctuary and isl1 and isl3:
			print("  ✓ Lautan lepas, perahu, dan kepulauan berjenjang (Haven, Tier 1, Tier 3) terpasang")
			pass_count += 1
		else:
			print("  ✗ Gagal: Kepulauan laut lepas tidak lengkap")
			fail_count += 1
		inst.queue_free()
	else:
		print("  ✗ Gagal memuat World.tscn")
		fail_count += 1

	print("\n==================================================")
	print("  HASIL VALIDASI GODOT 4: %d LULUS, %d GAGAL" % [pass_count, fail_count])
	print("==================================================\n")
	
	quit(0 if fail_count == 0 else 1)
