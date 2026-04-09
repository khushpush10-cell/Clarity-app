import { TaskPriority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

const jsonRecurringRule = z
	.object({
		type: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
		interval: z.number().int().positive().optional(),
		skipWeekends: z.boolean().optional(),
		endDate: z.string().datetime().optional()
	})
	.passthrough();

export const taskCreateSchema = z.object({
	workspaceId: z.string().cuid().optional(),
	assigneeId: z.string().cuid().optional().nullable(),
	title: z.string().min(1).max(255),
	description: z.string().max(5000).optional().nullable(),
	priority: z.nativeEnum(TaskPriority).optional(),
	status: z.nativeEnum(TaskStatus).optional(),
	dueDate: z.string().datetime().optional().nullable(),
	dueTime: z.string().max(8).optional().nullable(),
	colorTag: z.string().max(32).optional().nullable(),
	parentTaskId: z.string().cuid().optional().nullable(),
	recurringRule: jsonRecurringRule.optional().nullable(),
	position: z.number().int().positive().optional()
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskReorderSchema = z.object({
	workspaceId: z.string().cuid().optional(),
	status: z.nativeEnum(TaskStatus),
	orderedIds: z.array(z.string().cuid()).min(1)
});

export const taskQuerySchema = z.object({
	workspaceId: z.string().cuid().optional(),
	status: z.nativeEnum(TaskStatus).optional(),
	priority: z.nativeEnum(TaskPriority).optional(),
	search: z.string().optional(),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20)
});
