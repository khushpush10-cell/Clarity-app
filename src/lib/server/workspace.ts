import { WorkspaceRole, WorkspaceType } from '@prisma/client';

import { prisma } from '$lib/server/prisma';

export async function ensurePersonalWorkspace(userId: string): Promise<string> {
	const membership = await prisma.workspaceMember.findFirst({
		where: { userId },
		select: { workspaceId: true }
	});

	if (membership?.workspaceId) {
		return membership.workspaceId;
	}

	const workspace = await prisma.workspace.create({
		data: {
			name: 'Personal Workspace',
			type: WorkspaceType.PERSONAL,
			ownerId: userId,
			members: {
				create: {
					userId,
					role: WorkspaceRole.OWNER
				}
			}
		},
		select: { id: true }
	});

	return workspace.id;
}

export async function getAccessibleWorkspaceIds(userId: string): Promise<string[]> {
	const memberships = await prisma.workspaceMember.findMany({
		where: { userId },
		select: { workspaceId: true }
	});

	if (memberships.length === 0) {
		const fallback = await ensurePersonalWorkspace(userId);
		return [fallback];
	}

	return memberships.map((entry) => entry.workspaceId);
}

export async function getAccessibleWorkspaces(userId: string) {
	const workspaceIds = await getAccessibleWorkspaceIds(userId);
	if (workspaceIds.length === 0) return [];

	return prisma.workspace.findMany({
		where: {
			id: { in: workspaceIds },
			deletedAt: null
		},
		orderBy: { createdAt: 'desc' }
	});
}

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
	return prisma.workspaceMember.findFirst({
		where: {
			userId,
			workspaceId
		}
	});
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
	return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}
