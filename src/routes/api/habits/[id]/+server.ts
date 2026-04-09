import type { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { habitUpdateSchema } from '$lib/server/habit/schemas';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

async function getAuthorizedHabit(userId: string, habitId: string) {
	const workspaceIds = await getAccessibleWorkspaceIds(userId);

	return prisma.habit.findFirst({
		where: {
			id: habitId,
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

	const item = await getAuthorizedHabit(locals.user.id, params.id);
	if (!item) {
		return json({ error: 'Habit not found' }, { status: 404 });
	}

	return json({ item });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const habit = await getAuthorizedHabit(locals.user.id, params.id);
	if (!habit) {
		return json({ error: 'Habit not found' }, { status: 404 });
	}

	const parsed = habitUpdateSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const data: Prisma.HabitUpdateInput = {};
	if (typeof parsed.data.name !== 'undefined') data.name = parsed.data.name;
	if (typeof parsed.data.description !== 'undefined') data.description = parsed.data.description;
	if (typeof parsed.data.color !== 'undefined') data.color = parsed.data.color;
	if (typeof parsed.data.frequency !== 'undefined') data.frequency = parsed.data.frequency;
	if (typeof parsed.data.targetCount !== 'undefined') data.targetCount = parsed.data.targetCount;

	const item = await prisma.habit.update({
		where: { id: habit.id },
		data
	});

	return json({ item });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const habit = await getAuthorizedHabit(locals.user.id, params.id);
	if (!habit) {
		return json({ error: 'Habit not found' }, { status: 404 });
	}

	await prisma.habit.update({
		where: { id: habit.id },
		data: { deletedAt: new Date() }
	});

	return json({ success: true });
};
