import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { buildSimplePdf } from '$lib/server/review/pdf';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const period = params.period === 'monthly' ? 'monthly' : 'weekly';
	const days = period === 'monthly' ? 30 : 7;
	const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

	const [tasksDone, habitLogs, focusAggregate, goals] = await Promise.all([
		prisma.task.count({
			where: {
				creatorId: locals.user.id,
				status: 'DONE',
				completedAt: { gte: from },
				deletedAt: null
			}
		}),
		prisma.habitLog.count({ where: { userId: locals.user.id, completedDate: { gte: from } } }),
		prisma.focusSession.aggregate({
			where: { userId: locals.user.id, startedAt: { gte: from } },
			_sum: { durationMinutes: true }
		}),
		prisma.goal.findMany({
			where: { userId: locals.user.id, deletedAt: null },
			select: { title: true, progressPercentage: true },
			take: 5,
			orderBy: { updatedAt: 'desc' }
		})
	]);

	const report = {
		period,
		from: from.toISOString(),
		to: new Date().toISOString(),
		tasksCompleted: tasksDone,
		habitLogs,
		focusHours: Math.round(((focusAggregate._sum.durationMinutes ?? 0) / 60) * 10) / 10,
		topGoals: goals,
		achievements: [
			tasksDone >= 10 ? 'Task finisher badge' : null,
			habitLogs >= 15 ? 'Consistency streak badge' : null,
			(focusAggregate._sum.durationMinutes ?? 0) >= 300 ? 'Deep work badge' : null
		].filter(Boolean)
	};

	const format = url.searchParams.get('format');
	if (format === 'pdf') {
		const lines = [
			`Clarity ${period.toUpperCase()} Review`,
			`From: ${report.from}`,
			`To: ${report.to}`,
			`Tasks Completed: ${report.tasksCompleted}`,
			`Habit Logs: ${report.habitLogs}`,
			`Focus Hours: ${report.focusHours}`,
			`Achievements: ${report.achievements.join(', ') || 'None'}`
		];
		for (const goal of report.topGoals) {
			lines.push(`Goal: ${goal.title} (${goal.progressPercentage}%)`);
		}

		const pdf = buildSimplePdf(lines);
		const body = pdf as unknown as BodyInit;
		return new Response(body, {
			status: 200,
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': `inline; filename="clarity-${period}-review.pdf"`
			}
		});
	}

	return json({ report });
};


