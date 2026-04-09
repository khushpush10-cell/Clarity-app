import { Prisma, TaskPriority, TaskStatus, type Prisma as PrismaTypes } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { logAudit } from '$lib/server/audit/log';
import { prisma } from '$lib/server/prisma';
import { taskCreateSchema, taskQuerySchema } from '$lib/server/task/schemas';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = taskQuerySchema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId =
		parsed.data.workspaceId && workspaceIds.includes(parsed.data.workspaceId)
			? parsed.data.workspaceId
			: workspaceIds[0];

	if (!workspaceId) {
		return json({ items: [], total: 0, page: parsed.data.page, pageSize: parsed.data.pageSize });
	}

	const where: Prisma.TaskWhereInput = {
		workspaceId,
		deletedAt: null,
		...(parsed.data.status ? { status: parsed.data.status } : {}),
		...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
		...(parsed.data.search
			? {
					OR: [
						{ title: { contains: parsed.data.search } },
						{ description: { contains: parsed.data.search } }
					]
				}
			: {})
	};

	const [items, total] = await Promise.all([
		prisma.task.findMany({
			where,
			orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
			skip: (parsed.data.page - 1) * parsed.data.pageSize,
			take: parsed.data.pageSize,
			select: {
				id: true,
				workspaceId: true,
				title: true,
				description: true,
				status: true,
				priority: true,
				dueDate: true,
				dueTime: true,
				colorTag: true,
				parentTaskId: true,
				createdAt: true,
				updatedAt: true,
				completedAt: true,
				assigneeId: true,
				creatorId: true,
				position: true
			}
		}),
		prisma.task.count({ where })
	]);

	return json({
		items,
		total,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		workspaceId
	});
};

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = taskCreateSchema.safeParse(await request.json());
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

	const maxPositionTask = await prisma.task.findFirst({
		where: {
			workspaceId,
			deletedAt: null
		},
		orderBy: { position: 'desc' },
		select: { position: true }
	});

	const data: PrismaTypes.TaskUncheckedCreateInput = {
		workspaceId,
		creatorId: locals.user.id,
		assigneeId: parsed.data.assigneeId ?? null,
		title: parsed.data.title,
		description: parsed.data.description ?? null,
		status: parsed.data.status ?? TaskStatus.TODO,
		priority: parsed.data.priority ?? TaskPriority.MEDIUM,
		dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
		dueTime: parsed.data.dueTime ?? null,
		colorTag: parsed.data.colorTag ?? null,
		parentTaskId: parsed.data.parentTaskId ?? null,
		position: (maxPositionTask?.position ?? 0) + 1
	};

	if (typeof parsed.data.recurringRule !== 'undefined') {
		data.recurringRule =
			parsed.data.recurringRule === null
				? Prisma.JsonNull
				: (parsed.data.recurringRule as PrismaTypes.InputJsonValue);
	}

	const item = await prisma.task.create({
		data,
		select: {
			id: true,
			workspaceId: true,
			title: true,
			description: true,
			status: true,
			priority: true,
			dueDate: true,
			dueTime: true,
			colorTag: true,
			parentTaskId: true,
			createdAt: true,
			updatedAt: true,
			completedAt: true,
			assigneeId: true,
			creatorId: true
		}
	});

	await logAudit({
		workspaceId,
		userId: locals.user.id,
		action: 'CREATE',
		entityType: 'TASK',
		entityId: item.id,
		changes: { title: item.title, priority: item.priority, status: item.status },
		ipAddress: getClientAddress?.() ?? null,
		userAgent: request.headers.get('user-agent')
	});

	return json({ item }, { status: 201 });
};



