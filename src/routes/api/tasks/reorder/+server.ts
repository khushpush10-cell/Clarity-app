import { TaskStatus } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { logAudit } from '$lib/server/audit/log';
import { prisma } from '$lib/server/prisma';
import { taskReorderSchema } from '$lib/server/task/schemas';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = taskReorderSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId =
		parsed.data.workspaceId && workspaceIds.includes(parsed.data.workspaceId)
			? parsed.data.workspaceId
			: workspaceIds[0];

	if (!workspaceId) {
		return json({ error: 'No workspace available' }, { status: 400 });
	}

	const existing = await prisma.task.findMany({
		where: {
			id: { in: parsed.data.orderedIds },
			workspaceId,
			deletedAt: null
		},
		select: { id: true }
	});

	if (existing.length !== parsed.data.orderedIds.length) {
		return json({ error: 'Some tasks were not found in workspace' }, { status: 404 });
	}

	await prisma.$transaction(async (tx) => {
		for (let index = 0; index < parsed.data.orderedIds.length; index += 1) {
			const id = parsed.data.orderedIds[index]!;
			await tx.task.update({
				where: { id },
				data: {
					position: index + 1,
					status: parsed.data.status
				}
			});
		}
	});

	await logAudit({
		workspaceId,
		userId: locals.user.id,
		action: 'REORDER',
		entityType: 'TASK',
		entityId: parsed.data.orderedIds.join(','),
		changes: {
			status: parsed.data.status,
			count: parsed.data.orderedIds.length
		},
		ipAddress: getClientAddress?.() ?? null,
		userAgent: request.headers.get('user-agent')
	});

	return json({ success: true, status: parsed.data.status as TaskStatus });
};

