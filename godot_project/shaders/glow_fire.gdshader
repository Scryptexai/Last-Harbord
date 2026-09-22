shader_type canvas_item;

// =============================================================================
// Last Harbor - GlowFire Shader (Godot 4)
// Cahaya api unggun dan lentera 2D dengan radial falloff dan flickering.
// =============================================================================

uniform vec4 flame_core : source_color = vec4(1.0, 0.95, 0.6, 1.0);
uniform vec4 flame_rim : source_color = vec4(1.0, 0.45, 0.1, 0.0);
uniform float flicker_speed : hint_range(1.0, 20.0) = 9.0;
uniform float flicker_amount : hint_range(0.0, 0.5) = 0.15;

void fragment() {
	vec2 center = vec2(0.5, 0.5);
	float dist = distance(UV, center);
	
	float flick = 1.0 + sin(TIME * flicker_speed) * flicker_amount;
	float radial = clamp(1.0 - (dist * 2.0 * flick), 0.0, 1.0);
	
	COLOR = mix(flame_rim, flame_core, radial);
	COLOR.a *= radial;
}
