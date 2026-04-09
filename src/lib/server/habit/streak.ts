import { isSameDay, differenceInCalendarDays } from './time';

export function calculateStreak(
	lastCompletedDate: Date | null,
	currentStreak: number,
	completedDate: Date
): number {
	if (!lastCompletedDate) {
		return 1;
	}

	if (isSameDay(lastCompletedDate, completedDate)) {
		return currentStreak;
	}

	const diff = differenceInCalendarDays(completedDate, lastCompletedDate);
	if (diff === 1) {
		return currentStreak + 1;
	}

	return 1;
}
