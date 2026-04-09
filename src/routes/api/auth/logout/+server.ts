import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { revokeCurrentSession } from '$lib/server/auth/service';

export const POST: RequestHandler = async (event) => {
	await revokeCurrentSession(event);
	return json({ success: true });
};
