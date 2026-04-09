import { WorkspaceRole } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { canManageWorkspace, getWorkspaceMembership } from '$lib/server/workspace';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const actorMembership = await getWorkspaceMembership(locals.user.id, params.id);
	if (!actorMembership) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	if (!canManageWorkspace(actorMembership.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const member = await getWorkspaceMembership(params.userId, params.id);
	if (!member) {
		return json({ error: 'Member not found' }, { status: 404 });
	}

	if (member.role === WorkspaceRole.OWNER) {
		return json({ error: 'Cannot remove owner' }, { status: 400 });
	}

	await prisma.workspaceMember.delete({
		where: {
			workspaceId_userId: {
				workspaceId: params.id,
				userId: params.userId
			}
		}
	});

	return json({ success: true });
};
