import { Prisma } from '@prisma/client';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { canManageWorkspace, getWorkspaceMembership } from '$lib/server/workspace';
import { workspaceMemberCreateSchema } from '$lib/server/workspace/schemas';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const membership = await getWorkspaceMembership(locals.user.id, params.id);
	if (!membership) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	const items = await prisma.workspaceMember.findMany({
		where: { workspaceId: params.id },
		orderBy: { joinedAt: 'asc' },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					avatarUrl: true
				}
			}
		}
	});

	return json({ items });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const membership = await getWorkspaceMembership(locals.user.id, params.id);
	if (!membership) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	if (!canManageWorkspace(membership.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const parsed = workspaceMemberCreateSchema.safeParse(await request.json());
	if (!parsed.success) {
		return json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
	}

	const userExists = await prisma.user.findUnique({
		where: { id: parsed.data.userId },
		select: { id: true }
	});

	if (!userExists) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const item = await prisma.workspaceMember.upsert({
		where: {
			workspaceId_userId: {
				workspaceId: params.id,
				userId: parsed.data.userId
			}
		},
		update: {
			role: parsed.data.role,
			...(typeof parsed.data.permissions !== 'undefined'
				? { permissions: parsed.data.permissions as Prisma.InputJsonValue }
				: {})
		},
		create: {
			workspaceId: params.id,
			userId: parsed.data.userId,
			role: parsed.data.role,
			...(typeof parsed.data.permissions !== 'undefined'
				? { permissions: parsed.data.permissions as Prisma.InputJsonValue }
				: {})
		}
	});

	return json({ item }, { status: 201 });
};
