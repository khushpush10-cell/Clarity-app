import { HabitFrequency } from '@prisma/client';
import { z } from 'zod';

export const habitCreateSchema = z.object({
	workspaceId: z.string().cuid().optional(),
	name: z.string().min(1).max(191),
	description: z.string().max(5000).optional().nullable(),
	color: z.string().max(32).default('#10B981'),
	frequency: z.nativeEnum(HabitFrequency).default(HabitFrequency.DAILY),
	targetCount: z.number().int().positive().max(100).default(1)
});

export const habitUpdateSchema = habitCreateSchema.partial();

export const habitLogSchema = z.object({
	date: z.string().date().optional(),
	count: z.number().int().positive().max(100).default(1),
	notes: z.string().max(1000).optional().nullable()
});
