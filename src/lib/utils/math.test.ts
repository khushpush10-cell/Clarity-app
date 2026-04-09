import { describe, expect, it } from 'vitest';

import { clamp } from '$lib/utils/math';

describe('clamp', () => {
	it('returns min when value is too low', () => {
		expect(clamp(-5, 0, 10)).toBe(0);
	});

	it('returns max when value is too high', () => {
		expect(clamp(100, 0, 10)).toBe(10);
	});

	it('returns value when in range', () => {
		expect(clamp(7, 0, 10)).toBe(7);
	});
});
