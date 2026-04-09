import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [aggregate, sessionsThisWeek] = await Promise.all([
		prisma.focusSession.aggregate({
			where: {
				userId: locals.user.id
			},
			_sum: { durationMinutes: true },
			_count: { _all: true },
			_avg: { durationMinutes: true }
		}),
		prisma.focusSession.findMany({
			where: {
				userId: locals.user.id,
				startedAt: {
					gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
				}
			},
			select: {
				startedAt: true,
				durationMinutes: true,
				interruptions: true
			}
		})
	]);

	return json({
		totalMinutes: aggregate._sum.durationMinutes ?? 0,
		totalSessions: aggregate._count._all,
		averageMinutes: Math.round(aggregate._avg.durationMinutes ?? 0),
		week: sessionsThisWeek
	});
};
