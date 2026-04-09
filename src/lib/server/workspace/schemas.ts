import { WorkspaceRole, WorkspaceType } from '@prisma/client';
import { z } from 'zod';

export const workspaceCreateSchema = z.object({
	name: z.string().min(1).max(191),
	type: z.nativeEnum(WorkspaceType).default(WorkspaceType.PERSONAL),
	settings: z.record(z.string(), z.unknown()).optional()
});

export const workspaceUpdateSchema = workspaceCreateSchema.partial();

export const workspaceMemberCreateSchema = z.object({
	userId: z.string().cuid(),
	role: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
	permissions: z.record(z.string(), z.unknown()).optional()
});
