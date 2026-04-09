import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = Date.now();
	const heatmap: Array<{ date: string; count: number }> = [];

	for (let i = 29; i >= 0; i -= 1) {
		const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

		const count = await prisma.habitLog.count({
			where: {
				userId: locals.user.id,
				completedDate: { gte: dayStart, lt: dayEnd }
			}
		});

		heatmap.push({ date: dayStart.toISOString().slice(0, 10), count });
	}

	const byHabit = await prisma.habit.findMany({
		where: { userId: locals.user.id, deletedAt: null },
		select: { id: true, name: true, streakCurrent: true, streakBest: true }
	});

	return json({ heatmap, byHabit });
};
