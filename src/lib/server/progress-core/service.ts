import { TaskStatus } from '@prisma/client';

import { prisma } from '$lib/server/prisma';
import { clamp, daysAgo, startOfDay } from '$lib/server/progress-core/time';

export interface ProgressCoreSnapshot {
	level: number;
	experiencePoints: number;
	weeklyCompletionPercentage: number;
	consistencyScore: number;
	totalTasksCompleted: number;
	totalStreakDays: number;
	unlockedFeatures: string[];
	rewards: string[];
}

function getUnlockedFeatures(level: number): string[] {
	const features: string[] = ['core_dashboard'];
	if (level >= 2) features.push('custom_widgets');
	if (level >= 3) features.push('advanced_analytics');
	if (level >= 4) features.push('team_sync_view');
	if (level >= 5) features.push('theme_customization');
	return features;
}

function getRewards(level: number, consistencyScore: number): string[] {
	const rewards: string[] = [];
	if (level >= 2) rewards.push('Widget slot unlocked');
	if (level >= 3) rewards.push('Trend insights unlocked');
	if (level >= 4) rewards.push('Sync streak board unlocked');
	if (consistencyScore >= 80) rewards.push('Consistency badge active');
	return rewards;
}

export async function calculateProgressCore(userId: string): Promise<ProgressCoreSnapshot> {
	const now = new Date();
	const weekStart = startOfDay(daysAgo(now, 6));

	const [
		totalTasksCompleted,
		weeklyTasksCompleted,
		weeklyTasksCreated,
		weeklyHabitLogs,
		weeklyFocusMinutes,
		bestHabitStreak
	] = await Promise.all([
		prisma.task.count({
			where: {
				creatorId: userId,
				status: TaskStatus.DONE,
				deletedAt: null
			}
		}),
		prisma.task.count({
			where: {
				creatorId: userId,
				status: TaskStatus.DONE,
				completedAt: { gte: weekStart },
				deletedAt: null
			}
		}),
		prisma.task.count({
			where: {
				creatorId: userId,
				createdAt: { gte: weekStart },
				deletedAt: null
			}
		}),
		prisma.habitLog.count({
			where: {
				userId,
				completedDate: { gte: weekStart }
			}
		}),
		prisma.focusSession.aggregate({
			where: {
				userId,
				startedAt: { gte: weekStart }
			},
			_sum: { durationMinutes: true }
		}),
		prisma.habit.aggregate({
			where: {
				userId,
				deletedAt: null
			},
			_max: { streakCurrent: true }
		})
	]);

	const base = weeklyTasksCreated > 0 ? (weeklyTasksCompleted / weeklyTasksCreated) * 100 : 0;
	const habitBoost = clamp(weeklyHabitLogs * 2, 0, 20);
	const focusBoost = clamp((weeklyFocusMinutes._sum.durationMinutes ?? 0) / 30, 0, 20);

	const weeklyCompletionPercentage = clamp(Math.round(base), 0, 100);
	const consistencyScore = clamp(Math.round(base + habitBoost + focusBoost), 0, 100);

	const xpFromTasks = weeklyTasksCompleted * 20;
	const xpFromHabits = weeklyHabitLogs * 8;
	const xpFromFocus = Math.round((weeklyFocusMinutes._sum.durationMinutes ?? 0) / 5);
	const experiencePoints = xpFromTasks + xpFromHabits + xpFromFocus;

	const level = Math.max(1, Math.floor(experiencePoints / 100) + 1);
	const totalStreakDays = bestHabitStreak._max.streakCurrent ?? 0;

	const unlockedFeatures = getUnlockedFeatures(level);
	const rewards = getRewards(level, consistencyScore);

	await prisma.progressCore.upsert({
		where: { userId },
		update: {
			level,
			experiencePoints,
			weeklyCompletionPercentage,
			consistencyScore,
			totalTasksCompleted,
			totalStreakDays,
			unlockedFeatures,
			lastCalculatedAt: now
		},
		create: {
			userId,
			level,
			experiencePoints,
			weeklyCompletionPercentage,
			consistencyScore,
			totalTasksCompleted,
			totalStreakDays,
			unlockedFeatures,
			lastCalculatedAt: now
		}
	});

	return {
		level,
		experiencePoints,
		weeklyCompletionPercentage,
		consistencyScore,
		totalTasksCompleted,
		totalStreakDays,
		unlockedFeatures,
		rewards
	};
}

export async function getProgressCore(userId: string): Promise<ProgressCoreSnapshot> {
	const core = await prisma.progressCore.findUnique({ where: { userId } });

	if (!core) {
		return calculateProgressCore(userId);
	}

	const unlockedFeatures = (core.unlockedFeatures as string[] | null) ?? ['core_dashboard'];

	return {
		level: core.level,
		experiencePoints: core.experiencePoints,
		weeklyCompletionPercentage: core.weeklyCompletionPercentage,
		consistencyScore: core.consistencyScore,
		totalTasksCompleted: core.totalTasksCompleted,
		totalStreakDays: core.totalStreakDays,
		unlockedFeatures,
		rewards: getRewards(core.level, core.consistencyScore)
	};
}
