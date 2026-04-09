import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);

	const habit = await prisma.habit.findFirst({
		where: {
			id: params.id,
			userId: locals.user.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		}
	});

	if (!habit) {
		return json({ error: 'Habit not found' }, { status: 404 });
	}

	const logs = await prisma.habitLog.findMany({
		where: {
			habitId: habit.id,
			userId: locals.user.id
		},
		orderBy: { completedDate: 'desc' },
		take: 90
	});

	const totalCompletions = logs.reduce((sum, log) => sum + log.count, 0);
	const currentMonthCompletions = logs
		.filter((log) => {
			const now = new Date();
			return (
				log.completedDate.getUTCFullYear() === now.getUTCFullYear() &&
				log.completedDate.getUTCMonth() === now.getUTCMonth()
			);
		})
		.reduce((sum, log) => sum + log.count, 0);

	return json({
		streakCurrent: habit.streakCurrent,
		streakBest: habit.streakBest,
		totalCompletions,
		currentMonthCompletions,
		logs
	});
};
