<script lang="ts">
	import { onMount } from 'svelte';

	import ChartWrapper, { type ChartPoint } from '$lib/components/analytics/ChartWrapper.svelte';
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { apiRequest } from '$lib/utils/http';

	type LocalTask = {
		id: string;
		createdAt: string;
		updatedAt: string;
		completedAt: string | null;
		status: 'TODO' | 'IN_PROGRESS' | 'DONE';
	};
	type LocalHabit = {
		id: string;
		logs?: Array<{ completedDate: string; count: number }>;
	};
	type LocalFocusSession = {
		startedAt: string;
		durationMinutes: number;
		interruptions: number;
	};

	let loading = $state(false);
	let error = $state<string | null>(null);

	let overview = $state({
		week: { tasksCompleted: 0, tasksCreated: 0, completionRate: 0, habitLogs: 0, focusMinutes: 0 },
		month: { tasksCompleted: 0, habitLogs: 0, focusMinutes: 0 }
	});

	let taskPoints = $state([] as ChartPoint[]);
	let habitHeatmap = $state([] as Array<{ date: string; count: number }>);
	let focusSessions = $state([] as Array<{ startedAt: string; durationMinutes: number; interruptions: number }>);

	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';
	const LOCAL_HABITS_KEY = 'clarity_local_habits_v1';
	const LOCAL_FOCUS_SESSIONS_KEY = 'clarity_local_focus_sessions_v1';

	onMount(() => { void loadAnalytics(); });

	function readLocal<T>(key: string, fallback: T): T {
		try {
			const raw = localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as T) : fallback;
		} catch {
			return fallback;
		}
	}

	function formatDay(date: Date) {
		return date.toLocaleDateString(undefined, { weekday: 'short' });
	}

	function dateOnlyIso(date: Date) {
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);
	}

	function subDays(date: Date, days: number) {
		const next = new Date(date);
		next.setDate(next.getDate() - days);
		return next;
	}

	function loadAnalyticsFromLocal() {
		const now = new Date();
		const weekStart = subDays(now, 6);
		const monthStart = subDays(now, 29);
		const tasks = readLocal<LocalTask[]>(LOCAL_TASKS_KEY, []);
		const habits = readLocal<LocalHabit[]>(LOCAL_HABITS_KEY, []);
		const sessions = readLocal<LocalFocusSession[]>(LOCAL_FOCUS_SESSIONS_KEY, []);
		focusSessions = sessions;

		const inWeek = (iso: string | null | undefined) => !!iso && new Date(iso) >= weekStart;
		const inMonth = (iso: string | null | undefined) => !!iso && new Date(iso) >= monthStart;

		const tasksCreatedWeek = tasks.filter((task) => inWeek(task.createdAt)).length;
		const tasksDoneWeek = tasks.filter((task) => inWeek(task.completedAt) || (task.status === 'DONE' && inWeek(task.updatedAt))).length;
		const completionRate = tasksCreatedWeek > 0 ? Math.round((tasksDoneWeek / tasksCreatedWeek) * 100) : 0;
		const tasksDoneMonth = tasks.filter((task) => inMonth(task.completedAt) || (task.status === 'DONE' && inMonth(task.updatedAt))).length;

		const habitLogsFlat = habits.flatMap((habit) => habit.logs ?? []);
		const habitLogsWeek = habitLogsFlat
			.filter((log) => inWeek(new Date(log.completedDate + 'T00:00:00.000Z').toISOString()))
			.reduce((sum, log) => sum + (log.count ?? 1), 0);
		const habitLogsMonth = habitLogsFlat
			.filter((log) => inMonth(new Date(log.completedDate + 'T00:00:00.000Z').toISOString()))
			.reduce((sum, log) => sum + (log.count ?? 1), 0);

		const focusWeek = sessions
			.filter((session) => inWeek(session.startedAt))
			.reduce((sum, session) => sum + session.durationMinutes, 0);
		const focusMonth = sessions
			.filter((session) => inMonth(session.startedAt))
			.reduce((sum, session) => sum + session.durationMinutes, 0);

		overview = {
			week: {
				tasksCompleted: tasksDoneWeek,
				tasksCreated: tasksCreatedWeek,
				completionRate,
				habitLogs: habitLogsWeek,
				focusMinutes: focusWeek
			},
			month: {
				tasksCompleted: tasksDoneMonth,
				habitLogs: habitLogsMonth,
				focusMinutes: focusMonth
			}
		};

		const points: ChartPoint[] = [];
		for (let i = 6; i >= 0; i -= 1) {
			const day = subDays(now, i);
			const dayIso = dateOnlyIso(day);
			const created = tasks.filter((task) => task.createdAt?.slice(0, 10) === dayIso).length;
			const completed = tasks.filter((task) => (task.completedAt?.slice(0, 10) === dayIso) || (task.status === 'DONE' && task.updatedAt?.slice(0, 10) === dayIso)).length;
			points.push({ label: formatDay(day), value: completed, secondaryValue: created });
		}
		taskPoints = points;

		const heatmapMap = new Map<string, number>();
		for (let i = 29; i >= 0; i -= 1) {
			const day = subDays(now, i);
			heatmapMap.set(dateOnlyIso(day), 0);
		}
		for (const log of habitLogsFlat) {
			const key = log.completedDate?.slice(0, 10);
			if (!key) continue;
			if (!heatmapMap.has(key)) continue;
			heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + (log.count ?? 1));
		}
		habitHeatmap = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }));
	}

	async function loadAnalytics() {
		loading = true; error = null;
		try {
			const dashboardRes = await apiRequest<{ overview?: typeof overview; points?: Array<{ label: string; completed: number; created: number }>; heatmap?: Array<{ date: string; count: number }>; sessions?: Array<{ startedAt: string; durationMinutes: number; interruptions: number }>; error?: string; }>('/api/analytics/dashboard');
			if (!dashboardRes.ok) {
				loadAnalyticsFromLocal();
				error = 'Using offline mode (local browser storage)';
				return;
			}
			overview = dashboardRes.data?.overview ?? overview;
			taskPoints = (dashboardRes.data?.points ?? []).map((point) => ({ label: point.label, value: point.completed, secondaryValue: point.created }));
			habitHeatmap = dashboardRes.data?.heatmap ?? [];
			focusSessions = dashboardRes.data?.sessions ?? [];
		} catch {
			loadAnalyticsFromLocal();
			error = 'Using offline mode (local browser storage)';
		}
		finally { loading = false; }
	}

	const focusTrend = $derived.by(() => focusSessions.slice(0, 7).reverse().map((session, index) => ({ label: `S${index + 1}`, value: session.durationMinutes, secondaryValue: session.interruptions })));
</script>

<MainLayout>
	<section class="space-y-4">
		<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<h1 class="text-3xl font-semibold text-text-primary">Analytics</h1>
			<div class="flex gap-2">
				<a class="rounded-full border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary" href="/api/analytics/export" target="_blank">Export JSON</a>
				<a class="rounded-full border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary" href="/api/reviews/weekly" target="_blank">Weekly Review</a>
				<a class="rounded-full border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary" href="/api/reviews/monthly" target="_blank">Monthly Review</a>
			</div>
		</div>

		{#if error}<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>{/if}
		{#if loading}
			<p class="text-sm text-text-secondary">Loading analytics...</p>
		{:else}
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
				<article class="app-card p-4"><p class="text-xs text-text-secondary">Weekly Completion</p><p class="mt-1 text-4xl font-semibold text-text-primary">{overview.week.completionRate}%</p></article>
				<article class="app-card p-4"><p class="text-xs text-text-secondary">Tasks Done (7d)</p><p class="mt-1 text-4xl font-semibold text-text-primary">{overview.week.tasksCompleted}</p></article>
				<article class="app-card p-4"><p class="text-xs text-text-secondary">Habit Logs (7d)</p><p class="mt-1 text-4xl font-semibold text-text-primary">{overview.week.habitLogs}</p></article>
				<article class="app-card p-4"><p class="text-xs text-text-secondary">Focus Minutes (7d)</p><p class="mt-1 text-4xl font-semibold text-text-primary">{overview.week.focusMinutes}</p></article>
			</div>

			<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<ChartWrapper title="Task Completion Trend" points={taskPoints} primaryLabel="Completed" secondaryLabel="Created" />
				<ChartWrapper title="Focus Session Trend" points={focusTrend} primaryLabel="Minutes" secondaryLabel="Interruptions" />
			</div>

			<section class="app-card p-4">
				<h2 class="text-sm font-semibold text-text-primary">Habit Heatmap (30 days)</h2>
				<div class="mt-3 grid grid-cols-10 gap-2">
					{#each habitHeatmap as point (point.date)}
						<div class="h-6 rounded-[6px] border border-border" title={`${point.date}: ${point.count}`} style={`background: color-mix(in srgb, var(--primary) ${Math.min(90, point.count * 16)}%, var(--surface-2));`}></div>
					{/each}
				</div>
			</section>
		{/if}
	</section>
</MainLayout>
