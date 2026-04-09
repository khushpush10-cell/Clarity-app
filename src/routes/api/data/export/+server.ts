import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

function toCsv(rows: Array<Record<string, unknown>>): string {
	if (rows.length === 0) return '';

	const first = rows.at(0);
	if (!first) return '';

	const headers = Object.keys(first);
	const headerRow = headers.join(',');
	const bodyRows = rows.map((row) => {
		return headers
			.map((header) => {
				const raw = row[header];
				const value = raw == null ? '' : String(raw).replaceAll('"', '""');
				return `"${value}"`;
			})
			.join(',');
	});

	return [headerRow, ...bodyRows].join('\n');
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const format = url.searchParams.get('format') ?? 'json';
	const scope = url.searchParams.get('scope') ?? 'all';

	const [tasks, habits, goals, focusSessions] = await Promise.all([
		(scope === 'all' || scope === 'tasks')
			? prisma.task.findMany({ where: { creatorId: locals.user.id, deletedAt: null } })
			: Promise.resolve([]),
		(scope === 'all' || scope === 'habits')
			? prisma.habit.findMany({ where: { userId: locals.user.id, deletedAt: null } })
			: Promise.resolve([]),
		(scope === 'all' || scope === 'goals')
			? prisma.goal.findMany({ where: { userId: locals.user.id, deletedAt: null } })
			: Promise.resolve([]),
		(scope === 'all' || scope === 'focus')
			? prisma.focusSession.findMany({ where: { userId: locals.user.id } })
			: Promise.resolve([])
	]);

	if (format === 'csv') {
		const csvPayload = {
			tasks: toCsv(tasks as unknown as Array<Record<string, unknown>>),
			habits: toCsv(habits as unknown as Array<Record<string, unknown>>),
			goals: toCsv(goals as unknown as Array<Record<string, unknown>>),
			focusSessions: toCsv(focusSessions as unknown as Array<Record<string, unknown>>)
		};

		return json({ format: 'csv', data: csvPayload });
	}

	return json({
		format: 'json',
		generatedAt: new Date().toISOString(),
		data: {
			tasks,
			habits,
			goals,
			focusSessions
		}
	});
};
