import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { calculateStreak } from '$lib/server/habit/streak';
import { startOfDay } from '$lib/server/habit/time';
import { habitLogSchema } from '$lib/server/habit/schemas';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = habitLogSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const habit = await prisma.habit.findFirst({
		where: {
			id: params.id,
			userId: locals.user.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		}
	});

	if (!habit) {
		return json({ error: 'Habit not found' }, { status: 404 });
	}

	const completedDate = parsed.data.date
		? startOfDay(new Date(parsed.data.date))
		: startOfDay(new Date());

	await prisma.habitLog.upsert({
		where: {
			habitId_completedDate: {
				habitId: habit.id,
				completedDate
			}
		},
		update: {
			count: parsed.data.count,
			notes: parsed.data.notes ?? null
		},
		create: {
			habitId: habit.id,
			userId: locals.user.id,
			completedDate,
			count: parsed.data.count,
			notes: parsed.data.notes ?? null
		}
	});

	const nextCurrentStreak = calculateStreak(
		habit.lastCompletedDate,
		habit.streakCurrent,
		completedDate
	);
	const nextBestStreak = Math.max(habit.streakBest, nextCurrentStreak);

	const item = await prisma.habit.update({
		where: { id: habit.id },
		data: {
			streakCurrent: nextCurrentStreak,
			streakBest: nextBestStreak,
			lastCompletedDate: completedDate
		}
	});

	return json({ item });
};
