import type { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { goalCreateSchema } from '$lib/server/goal/schemas';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const workspaceId = url.searchParams.get('workspaceId');
	const selectedWorkspaceId =
		workspaceId && workspaceIds.includes(workspaceId) ? workspaceId : workspaceIds[0];

	const where: Prisma.GoalWhereInput = {
		userId: locals.user.id,
		deletedAt: null,
		...(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {})
	};

	const items = await prisma.goal.findMany({
		where,
		orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }]
	});

	return json({ items });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = goalCreateSchema.safeParse(await request.json());
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

	const progressPercentage = Math.max(
		0,
		Math.min(100, Math.round((parsed.data.currentValue / parsed.data.targetValue) * 100))
	);

	const item = await prisma.goal.create({
		data: {
			userId: locals.user.id,
			workspaceId,
			title: parsed.data.title,
			description: parsed.data.description ?? null,
			targetMetric: parsed.data.targetMetric,
			currentValue: parsed.data.currentValue,
			targetValue: parsed.data.targetValue,
			deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
			progressPercentage,
			color: parsed.data.color,
			icon: parsed.data.icon ?? null
		}
	});

	return json({ item }, { status: 201 });
};
