import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { env } from '$lib/server/env';
import { prisma } from '$lib/server/prisma';
import { calculateProgressCore } from '$lib/server/progress-core/service';

export const GET: RequestHandler = async ({ request }) => {
	if (env.CRON_SECRET) {
		const secret = request.headers.get('x-cron-secret');
		if (secret !== env.CRON_SECRET) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	const users = await prisma.user.findMany({
		where: { deletedAt: null },
		select: { id: true }
	});

	for (const user of users) {
		await calculateProgressCore(user.id);
	}

	return json({ success: true, processed: users.length });
};
