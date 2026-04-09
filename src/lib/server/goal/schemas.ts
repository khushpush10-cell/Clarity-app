import { z } from 'zod';

export const goalCreateSchema = z.object({
	workspaceId: z.string().cuid().optional(),
	title: z.string().min(1).max(191),
	description: z.string().max(5000).optional().nullable(),
	targetMetric: z.string().min(1).max(191),
	currentValue: z.number().min(0).default(0),
	targetValue: z.number().positive(),
	deadline: z.string().datetime().optional().nullable(),
	color: z.string().max(32).default('#0EA5E9'),
	icon: z.string().max(64).optional().nullable()
});

export const goalUpdateSchema = goalCreateSchema.partial();

export const goalProgressSchema = z.object({
	currentValue: z.number().min(0),
	targetValue: z.number().positive().optional()
});
