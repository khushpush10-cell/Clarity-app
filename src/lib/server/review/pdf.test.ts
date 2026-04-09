import { describe, expect, it } from 'vitest';

import { buildSimplePdf } from '$lib/server/review/pdf';

describe('buildSimplePdf', () => {
	it('generates a PDF buffer', () => {
		const bytes = buildSimplePdf(['Clarity Weekly Review', 'Tasks: 10']);
		const text = new TextDecoder().decode(bytes.slice(0, 8));
		expect(text).toContain('%PDF-1.4');
		expect(bytes.length).toBeGreaterThan(100);
	});
});
