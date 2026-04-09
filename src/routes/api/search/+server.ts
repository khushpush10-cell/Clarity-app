import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const q = (url.searchParams.get('q') ?? '').trim();
	if (q.length < 2) {
		return json({ error: 'Query must be at least 2 characters' }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);

	const [tasks, habits, goals] = await Promise.all([
		prisma.task.findMany({
			where: {
				workspaceId: { in: workspaceIds },
				deletedAt: null,
				OR: [{ title: { contains: q } }, { description: { contains: q } }]
			},
			take: 20,
			orderBy: { updatedAt: 'desc' },
			select: { id: true, title: true, status: true, priority: true, dueDate: true }
		}),
		prisma.habit.findMany({
			where: {
				workspaceId: { in: workspaceIds },
				deletedAt: null,
				OR: [{ name: { contains: q } }, { description: { contains: q } }]
			},
			take: 20,
			orderBy: { updatedAt: 'desc' },
			select: { id: true, name: true, streakCurrent: true, targetCount: true }
		}),
		prisma.goal.findMany({
			where: {
				workspaceId: { in: workspaceIds },
				deletedAt: null,
				OR: [{ title: { contains: q } }, { description: { contains: q } }]
			},
			take: 20,
			orderBy: { updatedAt: 'desc' },
			select: { id: true, title: true, progressPercentage: true, deadline: true }
		})
	]);

	return json({ query: q, tasks, habits, goals });
};
