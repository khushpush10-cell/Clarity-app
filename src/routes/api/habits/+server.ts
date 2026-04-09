import type { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { habitCreateSchema } from '$lib/server/habit/schemas';
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

	const where: Prisma.HabitWhereInput = {
		userId: locals.user.id,
		deletedAt: null,
		...(selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : {})
	};

	const items = await prisma.habit.findMany({
		where,
		orderBy: { createdAt: 'desc' }
	});

	return json({ items });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = habitCreateSchema.safeParse(await request.json());
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

	const item = await prisma.habit.create({
		data: {
			userId: locals.user.id,
			workspaceId,
			name: parsed.data.name,
			description: parsed.data.description ?? null,
			color: parsed.data.color,
			frequency: parsed.data.frequency,
			targetCount: parsed.data.targetCount
		}
	});

	return json({ item }, { status: 201 });
};
