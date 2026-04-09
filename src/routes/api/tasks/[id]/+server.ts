import { Prisma, TaskStatus, type Prisma as PrismaTypes } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { logAudit } from '$lib/server/audit/log';
import { prisma } from '$lib/server/prisma';
import { taskUpdateSchema } from '$lib/server/task/schemas';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

async function getAuthorizedTask(userId: string, taskId: string) {
	const workspaceIds = await getAccessibleWorkspaceIds(userId);

	return prisma.task.findFirst({
		where: {
			id: taskId,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		}
	});
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const item = await getAuthorizedTask(locals.user.id, params.id);
	if (!item) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	return json({ item });
};

export const PUT: RequestHandler = async ({ locals, params, request, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const existing = await getAuthorizedTask(locals.user.id, params.id);
	if (!existing) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const parsed = taskUpdateSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const data: PrismaTypes.TaskUncheckedUpdateInput = {};

	if (typeof parsed.data.title !== 'undefined') data.title = parsed.data.title;
	if (typeof parsed.data.description !== 'undefined') data.description = parsed.data.description;
	if (typeof parsed.data.status !== 'undefined') data.status = parsed.data.status;
	if (typeof parsed.data.priority !== 'undefined') data.priority = parsed.data.priority;
	if (typeof parsed.data.assigneeId !== 'undefined') data.assigneeId = parsed.data.assigneeId;
	if (typeof parsed.data.dueTime !== 'undefined') data.dueTime = parsed.data.dueTime;
	if (typeof parsed.data.colorTag !== 'undefined') data.colorTag = parsed.data.colorTag;
	if (typeof parsed.data.parentTaskId !== 'undefined') data.parentTaskId = parsed.data.parentTaskId;

	if (typeof parsed.data.recurringRule !== 'undefined') {
		data.recurringRule =
			parsed.data.recurringRule === null
				? Prisma.JsonNull
				: (parsed.data.recurringRule as PrismaTypes.InputJsonValue);
	}

	if (typeof parsed.data.dueDate !== 'undefined') {
		data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
	}

	if (parsed.data.status === TaskStatus.DONE) {
		data.completedAt = new Date();
	} else if (typeof parsed.data.status !== 'undefined') {
		data.completedAt = null;
	}

	const item = await prisma.task.update({
		where: { id: params.id },
		data
	});

	await logAudit({
		workspaceId: existing.workspaceId,
		userId: locals.user.id,
		action: 'UPDATE',
		entityType: 'TASK',
		entityId: existing.id,
		changes: parsed.data,
		ipAddress: getClientAddress?.() ?? null,
		userAgent: request.headers.get('user-agent')
	});

	return json({ item });
};

export const DELETE: RequestHandler = async ({ locals, params, request, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const existing = await getAuthorizedTask(locals.user.id, params.id);
	if (!existing) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	await prisma.task.update({
		where: { id: params.id },
		data: {
			deletedAt: new Date()
		}
	});

	await logAudit({
		workspaceId: existing.workspaceId,
		userId: locals.user.id,
		action: 'DELETE',
		entityType: 'TASK',
		entityId: existing.id,
		changes: { title: existing.title },
		ipAddress: getClientAddress?.() ?? null,
		userAgent: request.headers.get('user-agent')
	});

	return json({ success: true });
};
