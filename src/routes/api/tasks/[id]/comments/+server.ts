import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

function extractMentions(content: string): string[] {
	const matches = content.match(/@([a-zA-Z0-9._-]+)/g) ?? [];
	return matches.map((match) => match.slice(1).toLowerCase());
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.user.id;
	const workspaceIds = await getAccessibleWorkspaceIds(userId);
	const task = await prisma.task.findFirst({
		where: {
			id: params.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		},
		select: { id: true }
	});

	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const items = await prisma.comment.findMany({
		where: {
			taskId: params.id,
			deletedAt: null
		},
		orderBy: { createdAt: 'asc' },
		include: {
			user: {
				select: {
					id: true,
					name: true,
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

	const userId = locals.user.id;
	const body = (await request.json()) as { content?: string };
	const content = body.content?.trim();
	if (!content) {
		return json({ error: 'Comment content is required' }, { status: 400 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(userId);
	const task = await prisma.task.findFirst({
		where: {
			id: params.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		},
		select: { id: true, workspaceId: true, title: true }
	});

	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const item = await prisma.comment.create({
		data: {
			taskId: params.id,
			userId,
			content
		}
	});

	const mentions = extractMentions(content);
	if (mentions.length > 0) {
		const members = await prisma.workspaceMember.findMany({
			where: { workspaceId: task.workspaceId },
			include: { user: { select: { id: true, name: true } } }
		});

		const targets = members
			.filter((member) => mentions.some((mention) => member.user.name.toLowerCase().includes(mention)))
			.filter((member) => member.user.id !== userId)
			.map((member) => member.user.id);

		if (targets.length > 0) {
			await prisma.notification.createMany({
				data: targets.map((targetUserId) => ({
					userId: targetUserId,
					type: 'mention',
					title: 'You were mentioned',
					message: `Mentioned in task: ${task.title}`,
					link: `/tasks/${task.id}`
				}))
			});
		}
	}

	return json({ item }, { status: 201 });
};
