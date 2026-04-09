import type { Prisma } from '@prisma/client';

import { prisma } from '$lib/server/prisma';

interface AuditInput {
	workspaceId: string;
	userId: string;
	action: string;
	entityType: string;
	entityId: string;
	changes?: unknown;
	ipAddress?: string | null;
	userAgent?: string | null;
}

export async function logAudit(input: AuditInput) {
	await prisma.auditLog.create({
		data: {
			workspaceId: input.workspaceId,
			userId: input.userId,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId,
			changes: (input.changes ?? {}) as Prisma.InputJsonValue,
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent ?? null
		}
	});
}
