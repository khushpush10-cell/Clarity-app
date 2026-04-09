import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sessions = await prisma.focusSession.findMany({
		where: { userId: locals.user.id },
		orderBy: { startedAt: 'desc' },
		take: 30,
		select: {
			id: true,
			startedAt: true,
			durationMinutes: true,
			interruptions: true,
			taskId: true
		}
	});

	const aggregate = await prisma.focusSession.aggregate({
		where: { userId: locals.user.id },
		_sum: { durationMinutes: true },
		_avg: { durationMinutes: true }
	});

	return json({
		sessions,
		totalMinutes: aggregate._sum.durationMinutes ?? 0,
		averageMinutes: Math.round(aggregate._avg.durationMinutes ?? 0)
	});
};
