import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const task = await prisma.task.findFirst({
		where: { id: params.id, workspaceId: { in: workspaceIds }, deletedAt: null },
		select: { id: true }
	});

	if (!task) return json({ error: 'Task not found' }, { status: 404 });

	const [audit, comments] = await Promise.all([
		prisma.auditLog.findMany({
			where: {
				entityType: 'TASK',
				entityId: params.id,
				workspaceId: { in: workspaceIds }
			},
			orderBy: { createdAt: 'desc' },
			take: 50,
			include: {
				user: { select: { id: true, name: true, avatarUrl: true } }
			}
		}),
		prisma.comment.findMany({
			where: { taskId: params.id, deletedAt: null },
			orderBy: { createdAt: 'desc' },
			take: 50,
			include: { user: { select: { id: true, name: true, avatarUrl: true } } }
		})
	]);

	return json({ audit, comments });
};
