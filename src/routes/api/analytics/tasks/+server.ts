import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = Date.now();
	const points: Array<{ label: string; completed: number; created: number }> = [];

	for (let i = 6; i >= 0; i -= 1) {
		const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

		const [completed, created] = await Promise.all([
			prisma.task.count({
				where: {
					creatorId: locals.user.id,
					status: 'DONE',
					completedAt: { gte: dayStart, lt: dayEnd },
					deletedAt: null
				}
			}),
			prisma.task.count({
				where: {
					creatorId: locals.user.id,
					createdAt: { gte: dayStart, lt: dayEnd },
					deletedAt: null
				}
			})
		]);

		points.push({
			label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
			completed,
			created
		});
	}

	return json({ points });
};
