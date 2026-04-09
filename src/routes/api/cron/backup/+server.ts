import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ request }) => {
	const auth = request.headers.get('authorization');
	if (auth !== `Bearer ${env.JWT_SECRET}`) {
		return json({ error: 'Unauthorized cron call' }, { status: 401 });
	}

	const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });
	for (const user of users) {
		const payload = await Promise.all([
			prisma.task.count({ where: { creatorId: user.id, deletedAt: null } }),
			prisma.habit.count({ where: { userId: user.id, deletedAt: null } }),
			prisma.goal.count({ where: { userId: user.id, deletedAt: null } })
		]);

		await prisma.notification.create({
			data: {
				userId: user.id,
				type: 'backup',
				title: 'Scheduled backup snapshot',
				message: `Tasks: ${payload[0]}, Habits: ${payload[1]}, Goals: ${payload[2]}`,
				link: '/settings'
			}
		});
	}

	return json({ success: true, users: users.length });
};
