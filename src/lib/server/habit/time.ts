export function startOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function isSameDay(a: Date, b: Date): boolean {
	return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function differenceInCalendarDays(a: Date, b: Date): number {
	const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
	return Math.round(ms / 86_400_000);
}
