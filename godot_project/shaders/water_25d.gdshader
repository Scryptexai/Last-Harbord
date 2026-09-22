shader_type canvas_item;

// =============================================================================
// Last Harbor - Water25D Shader (Godot 4)
// Simulasi air laut 2.5D dengan gradien kedalaman, riak kaustik bergerak,
// dan garis buih pantai dinamis.
// =============================================================================

uniform vec4 deep_color : source_color = vec4(0.04, 0.12, 0.18, 0.95);
uniform vec4 shallow_color : source_color = vec4(0.12, 0.42, 0.54, 0.75);
uniform vec4 foam_color : source_color = vec4(0.85, 0.94, 1.0, 0.85);

uniform float wave_speed : hint_range(0.1, 5.0) = 1.6;
uniform float wave_frequency : hint_range(1.0, 50.0) = 14.0;
uniform float foam_threshold : hint_range(0.0, 1.0) = 0.82;

void fragment() {
	vec2 uv = UV;
	
	// Riak gelombang 2.5D (arah horizontal & vertikal miring)
	float wave1 = sin(uv.x * wave_frequency + TIME * wave_speed);
	float wave2 = cos(uv.y * (wave_frequency * 0.6) - TIME * (wave_speed * 0.8));
	float caustics = (wave1 + wave2) * 0.5;
	
	// Campur warna laut dalam ke dangkal
	vec4 base_water = mix(deep_color, shallow_color, uv.y + caustics * 0.15);
	
	// Buih ombak di tepi pantai (atas atau batas daratan)
	float foam_wave = sin(uv.x * 24.0 + TIME * 2.2) * 0.04;
	float is_foam = step(foam_threshold + foam_wave, uv.y);
	
	vec4 final_color = mix(base_water, foam_color, is_foam * 0.7);
	COLOR = final_color;
}
