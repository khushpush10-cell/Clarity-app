import { error } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const token = url.searchParams.get('token');
	if (!token) {
		throw error(400, 'Missing verification token.');
	}

	const response = await fetch('/api/auth/verify-email', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ token })
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({ error: 'Verification failed' }));
		throw error(response.status, payload.error ?? 'Verification failed');
	}

	return { verified: true };
};
