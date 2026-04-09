import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { rotateSession } from '$lib/server/auth/service';

export const POST: RequestHandler = async (event) => {
	const user = await rotateSession(event);
	if (!user) {
		return json({ error: 'Invalid refresh session' }, { status: 401 });
	}

	return json({ user });
};
