import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { calculateProgressCore } from '$lib/server/progress-core/service';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const core = await calculateProgressCore(locals.user.id);
	return json({ core });
};
