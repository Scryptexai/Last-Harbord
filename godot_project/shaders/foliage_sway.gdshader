shader_type canvas_item;

// =============================================================================
// Last Harbor - FoliageSway Shader (Godot 4)
// Goyangan angin organik untuk pohon, semak, dan kanopi dedaunan 2.5D.
// Bagian pucuk berayun lebih kuat dari pangkal batang.
// =============================================================================

uniform float sway_speed : hint_range(0.1, 8.0) = 2.2;
uniform float sway_strength : hint_range(0.0, 30.0) = 8.0;
uniform float wind_direction : hint_range(-1.0, 1.0) = 1.0;

void vertex() {
	// Pucuk atas daun (UV.y mendekati 0) berayun maksimal; akar (UV.y mendekati 1) tetap diam
	float sway_factor = (1.0 - UV.y);
	float wave = sin(TIME * sway_speed + VERTEX.x * 0.05) * sway_strength;
	VERTEX.x += wave * sway_factor * wind_direction;
}
