import { TaskStatus } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { logAudit } from '$lib/server/audit/log';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const POST: RequestHandler = async ({ locals, params, request, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);

	const existing = await prisma.task.findFirst({
		where: {
			id: params.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		}
	});

	if (!existing) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const item = await prisma.task.update({
		where: { id: existing.id },
		data: {
			status: TaskStatus.DONE,
			completedAt: new Date()
		}
	});

	await logAudit({
		workspaceId: existing.workspaceId,
		userId: locals.user.id,
		action: 'COMPLETE',
		entityType: 'TASK',
		entityId: existing.id,
		changes: { status: 'DONE' },
		ipAddress: getClientAddress?.() ?? null,
		userAgent: request.headers.get('user-agent')
	});

	return json({ item });
};
