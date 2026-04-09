import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = new Date();
	const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const [
		tasksCompletedWeek,
		tasksCreatedWeek,
		habitLogsWeek,
		focusMinutesWeek,
		tasksCompletedMonth,
		habitLogsMonth,
		focusMinutesMonth
	] = await Promise.all([
		prisma.task.count({
			where: { creatorId: locals.user.id, status: 'DONE', completedAt: { gte: weekStart }, deletedAt: null }
		}),
		prisma.task.count({
			where: { creatorId: locals.user.id, createdAt: { gte: weekStart }, deletedAt: null }
		}),
		prisma.habitLog.count({ where: { userId: locals.user.id, completedDate: { gte: weekStart } } }),
		prisma.focusSession.aggregate({
			where: { userId: locals.user.id, startedAt: { gte: weekStart } },
			_sum: { durationMinutes: true }
		}),
		prisma.task.count({
			where: { creatorId: locals.user.id, status: 'DONE', completedAt: { gte: monthStart }, deletedAt: null }
		}),
		prisma.habitLog.count({ where: { userId: locals.user.id, completedDate: { gte: monthStart } } }),
		prisma.focusSession.aggregate({
			where: { userId: locals.user.id, startedAt: { gte: monthStart } },
			_sum: { durationMinutes: true }
		})
	]);

	const completionRate = tasksCreatedWeek > 0 ? Math.round((tasksCompletedWeek / tasksCreatedWeek) * 100) : 0;

	return json({
		week: {
			tasksCompleted: tasksCompletedWeek,
			tasksCreated: tasksCreatedWeek,
			completionRate,
			habitLogs: habitLogsWeek,
			focusMinutes: focusMinutesWeek._sum.durationMinutes ?? 0
		},
		month: {
			tasksCompleted: tasksCompletedMonth,
			habitLogs: habitLogsMonth,
			focusMinutes: focusMinutesMonth._sum.durationMinutes ?? 0
		}
	});
};
