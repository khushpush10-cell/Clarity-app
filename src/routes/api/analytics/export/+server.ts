import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [tasks, habits, goals, focusSessions] = await Promise.all([
		prisma.task.findMany({ where: { creatorId: locals.user.id, deletedAt: null } }),
		prisma.habit.findMany({ where: { userId: locals.user.id, deletedAt: null } }),
		prisma.goal.findMany({ where: { userId: locals.user.id, deletedAt: null } }),
		prisma.focusSession.findMany({ where: { userId: locals.user.id } })
	]);

	return json({
		generatedAt: new Date().toISOString(),
		tasks,
		habits,
		goals,
		focusSessions
	});
};
