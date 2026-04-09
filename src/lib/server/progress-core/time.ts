export function startOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function daysAgo(from: Date, days: number): Date {
	const d = new Date(from);
	d.setDate(d.getDate() - days);
	return d;
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
