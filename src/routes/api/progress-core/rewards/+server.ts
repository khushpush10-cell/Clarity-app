import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { getProgressCore } from '$lib/server/progress-core/service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const core = await getProgressCore(locals.user.id);

	return json({
		level: core.level,
		consistencyScore: core.consistencyScore,
		unlockedFeatures: core.unlockedFeatures,
		rewards: core.rewards
	});
};
