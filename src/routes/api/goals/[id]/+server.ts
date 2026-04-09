import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { goalUpdateSchema } from '$lib/server/goal/schemas';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

async function getAuthorizedGoal(userId: string, goalId: string) {
	const workspaceIds = await getAccessibleWorkspaceIds(userId);

	return prisma.goal.findFirst({
		where: {
			id: goalId,
			userId,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		}
	});
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const item = await getAuthorizedGoal(locals.user.id, params.id);
	if (!item) {
		return json({ error: 'Goal not found' }, { status: 404 });
	}

	return json({ item });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const existing = await getAuthorizedGoal(locals.user.id, params.id);
	if (!existing) {
		return json({ error: 'Goal not found' }, { status: 404 });
	}

	const parsed = goalUpdateSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const nextCurrent = parsed.data.currentValue ?? existing.currentValue;
	const nextTarget = parsed.data.targetValue ?? existing.targetValue;
	const nextProgress = Math.max(0, Math.min(100, Math.round((nextCurrent / nextTarget) * 100)));

	const item = await prisma.goal.update({
		where: { id: params.id },
		data: {
			...(typeof parsed.data.title !== 'undefined' ? { title: parsed.data.title } : {}),
			...(typeof parsed.data.description !== 'undefined'
				? { description: parsed.data.description }
				: {}),
			...(typeof parsed.data.targetMetric !== 'undefined'
				? { targetMetric: parsed.data.targetMetric }
				: {}),
			...(typeof parsed.data.currentValue !== 'undefined'
				? { currentValue: parsed.data.currentValue }
				: {}),
			...(typeof parsed.data.targetValue !== 'undefined'
				? { targetValue: parsed.data.targetValue }
				: {}),
			...(typeof parsed.data.deadline !== 'undefined'
				? { deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null }
				: {}),
			...(typeof parsed.data.color !== 'undefined' ? { color: parsed.data.color } : {}),
			...(typeof parsed.data.icon !== 'undefined' ? { icon: parsed.data.icon } : {}),
			progressPercentage: nextProgress
		}
	});

	return json({ item });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const existing = await getAuthorizedGoal(locals.user.id, params.id);
	if (!existing) {
		return json({ error: 'Goal not found' }, { status: 404 });
	}

	await prisma.goal.update({
		where: { id: params.id },
		data: {
			deletedAt: new Date()
		}
	});

	return json({ success: true });
};
