import { TaskPriority, TaskStatus } from '@prisma/client';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

const importSchema = z.object({
	tasks: z
		.array(
			z.object({
				title: z.string().min(1).max(255),
				description: z.string().max(5000).optional().nullable(),
				priority: z.nativeEnum(TaskPriority).optional(),
				status: z.nativeEnum(TaskStatus).optional()
			})
		)
		.optional()
		.default([]),
	habits: z
		.array(
			z.object({
				name: z.string().min(1).max(191),
				description: z.string().max(5000).optional().nullable(),
				color: z.string().max(32).optional().default('#10B981'),
				targetCount: z.number().int().positive().max(100).optional().default(1)
			})
		)
		.optional()
		.default([]),
	goals: z
		.array(
			z.object({
				title: z.string().min(1).max(191),
				targetMetric: z.string().min(1).max(191),
				targetValue: z.number().positive(),
				currentValue: z.number().min(0).optional().default(0),
				color: z.string().max(32).optional().default('#0EA5E9')
			})
		)
		.optional()
		.default([])
});

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.user.id;

	const parsed = importSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid import payload', issues: parsed.error.issues }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(userId);
	const workspaceId = workspaceIds[0];
	if (!workspaceId) {
		return json({ error: 'No workspace available' }, { status: 400 });
	}

	const [tasksCreated, habitsCreated, goalsCreated] = await Promise.all([
		prisma.task.createMany({
			data: parsed.data.tasks.map((task, index) => ({
				workspaceId,
				creatorId: userId,
				title: task.title,
				description: task.description ?? null,
				priority: task.priority ?? TaskPriority.MEDIUM,
				status: task.status ?? TaskStatus.TODO,
				position: index + 1
			}))
		}),
		prisma.habit.createMany({
			data: parsed.data.habits.map((habit) => ({
				workspaceId,
				userId,
				name: habit.name,
				description: habit.description ?? null,
				color: habit.color ?? '#10B981',
				frequency: 'DAILY',
				targetCount: habit.targetCount ?? 1
			}))
		}),
		prisma.goal.createMany({
			data: parsed.data.goals.map((goal) => ({
				workspaceId,
				userId,
				title: goal.title,
				targetMetric: goal.targetMetric,
				currentValue: goal.currentValue ?? 0,
				targetValue: goal.targetValue,
				progressPercentage: Math.max(
					0,
					Math.min(100, Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100))
				),
				color: goal.color ?? '#0EA5E9'
			}))
		})
	]);

	return json({
		success: true,
		imported: {
			tasks: tasksCreated.count,
			habits: habitsCreated.count,
			goals: goalsCreated.count
		}
	});
};
