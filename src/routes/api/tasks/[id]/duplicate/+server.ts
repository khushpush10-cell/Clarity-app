import { Prisma, type Prisma as PrismaTypes } from '@prisma/client';
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

	const source = await prisma.task.findFirst({
		where: {
			id: params.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		}
	});

	if (!source) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const maxPositionTask = await prisma.task.findFirst({
		where: {
			workspaceId: source.workspaceId,
			deletedAt: null
		},
		orderBy: { position: 'desc' },
		select: { position: true }
	});

	const item = await prisma.task.create({
		data: {
			workspaceId: source.workspaceId,
			creatorId: locals.user.id,
			assigneeId: source.assigneeId,
			title: `${source.title} (Copy)`,
			description: source.description,
			status: source.status,
			priority: source.priority,
			dueDate: source.dueDate,
			dueTime: source.dueTime,
			colorTag: source.colorTag,
			parentTaskId: source.parentTaskId,
			recurringRule:
				source.recurringRule === null
					? Prisma.JsonNull
					: (source.recurringRule as PrismaTypes.InputJsonValue),
			position: (maxPositionTask?.position ?? 0) + 1
		}
	});

	await logAudit({
		workspaceId: source.workspaceId,
		userId: locals.user.id,
		action: 'DUPLICATE',
		entityType: 'TASK',
		entityId: source.id,
		changes: { duplicateId: item.id },
		ipAddress: getClientAddress?.() ?? null,
		userAgent: request.headers.get('user-agent')
	});

	return json({ item }, { status: 201 });
};
