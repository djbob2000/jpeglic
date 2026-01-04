export function qualityToDistance(quality: number): number {
	if (quality >= 100) return 0.0;
	return 0.1 + (100 - quality) * 0.09;
}

export function distanceToQuality(distance: number): number {
	if (distance <= 0) return 100;
	// distance = 0.1 + (100 - quality) * 0.09
	// (distance - 0.1) / 0.09 = 100 - quality
	// quality = 100 - (distance - 0.1) / 0.09
	return 100 - (distance - 0.1) / 0.09;
}
