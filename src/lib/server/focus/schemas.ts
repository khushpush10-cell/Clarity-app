import { z } from 'zod';

export const focusStartSchema = z.object({
	workspaceId: z.string().cuid().optional(),
	taskId: z.string().cuid().optional().nullable(),
	durationMinutes: z.number().int().positive().max(240).default(25),
	notes: z.string().max(2000).optional().nullable()
});

export const focusEndSchema = z.object({
	interruptions: z.number().int().min(0).max(100).default(0),
	notes: z.string().max(2000).optional().nullable()
});
