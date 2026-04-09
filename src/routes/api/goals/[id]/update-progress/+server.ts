import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { goalProgressSchema } from '$lib/server/goal/schemas';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = goalProgressSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const existing = await prisma.goal.findFirst({
		where: {
			id: params.id,
			userId: locals.user.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		}
	});

	if (!existing) {
		return json({ error: 'Goal not found' }, { status: 404 });
	}

	const targetValue = parsed.data.targetValue ?? existing.targetValue;
	const progressPercentage = Math.max(
		0,
		Math.min(100, Math.round((parsed.data.currentValue / targetValue) * 100))
	);

	const item = await prisma.goal.update({
		where: { id: params.id },
		data: {
			currentValue: parsed.data.currentValue,
			targetValue,
			progressPercentage
		}
	});

	return json({ item });
};
