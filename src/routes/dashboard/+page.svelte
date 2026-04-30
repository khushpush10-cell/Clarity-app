<script lang="ts">
import { goto } from '$app/navigation';
import { onMount } from 'svelte';

import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
	import type { HabitItem } from '$lib/stores/habits';
	import type { TaskItem } from '$lib/stores/tasks';
	import { apiRequest } from '$lib/utils/http';

	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';
	const LOCAL_HABITS_KEY = 'clarity_local_habits_v1';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let fabOpen = $state(false);

	let todayTasks = $state([] as TaskItem[]);
	let habitSuggestion = $state<HabitItem | null>(null);
	let focusSuggestionMinutes = $state(25);

	onMount(() => {
		void loadTodayPlan();
	});

	function readLocalTasks(): TaskItem[] {
		try {
			const raw = localStorage.getItem(LOCAL_TASKS_KEY);
			return raw ? (JSON.parse(raw) as TaskItem[]) : [];
		} catch {
			return [];
		}
	}

	function readLocalHabits(): HabitItem[] {
		try {
			const raw = localStorage.getItem(LOCAL_HABITS_KEY);
			return raw ? (JSON.parse(raw) as HabitItem[]) : [];
		} catch {
			return [];
		}
	}

	function rankTask(task: TaskItem) {
		const priorityWeight: Record<TaskItem['priority'], number> = {
			URGENT: 4,
			HIGH: 3,
			MEDIUM: 2,
			LOW: 1
		};
		const due = task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
		return priorityWeight[task.priority] * 10_000_000_000 - due;
	}

	function pickTopTasks(input: TaskItem[]) {
		return input
			.filter((task) => task.status !== 'DONE')
			.sort((a, b) => rankTask(b) - rankTask(a))
			.slice(0, 3);
	}

	async function loadTodayPlan() {
		loading = true;
		error = null;
		try {
			const [tasksRes, habitsRes, focusRes] = await Promise.all([
				apiRequest<{ items?: TaskItem[]; error?: string }>('/api/tasks?pageSize=100'),
				apiRequest<{ items?: HabitItem[]; error?: string }>('/api/habits'),
				apiRequest<{ averageMinutes?: number; error?: string }>('/api/focus-sessions/stats')
			]);

			const tasksPool = tasksRes.ok ? (tasksRes.data?.items ?? []) : readLocalTasks();
			const habitsPool = habitsRes.ok ? (habitsRes.data?.items ?? []) : readLocalHabits();

			todayTasks = pickTopTasks(tasksPool);
			habitSuggestion = habitsPool[0] ?? null;
			const average = focusRes.ok ? (focusRes.data?.averageMinutes ?? 25) : 25;
			focusSuggestionMinutes = [15, 25, 30, 45, 60].find((value) => value >= average) ?? 60;

			if (!tasksRes.ok || !habitsRes.ok) {
				error = 'Using local data mode. Connect database to sync across devices.';
			}
		} catch {
			todayTasks = pickTopTasks(readLocalTasks());
			habitSuggestion = readLocalHabits()[0] ?? null;
			focusSuggestionMinutes = 25;
			error = 'Using local data mode. Connect database to sync across devices.';
		} finally {
			loading = false;
		}
	}

function startSuggestedFocus() {
	fabOpen = false;
	window.dispatchEvent(
		new CustomEvent('clarity:focus-quick-start', {
			detail: { minutes: focusSuggestionMinutes }
		})
	);
	void goto('/tasks');
}

	async function goToTasks() {
		fabOpen = false;
		await goto('/tasks');
	}

	async function goToHabits() {
		fabOpen = false;
		await goto('/habits');
	}
</script>

<DashboardLayout>
	<section class="space-y-4 xl:col-span-12">
		<section class="app-card p-5 md:p-6">
			<h1 class="text-3xl font-semibold text-text-primary">Dashboard</h1>
			<p class="mt-2 text-sm text-text-secondary">A calm overview for planning your day with steady momentum.</p>

			{#if error}
				<p class="mt-3 rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>
			{/if}

			<div class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Today plan</p>
					{#if loading}
						<p class="mt-2 text-sm text-text-secondary">Preparing your day...</p>
					{:else if todayTasks.length === 0}
						<p class="mt-2 text-sm text-text-secondary">No pending tasks. Add one priority action.</p>
						<button class="mt-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-on-primary" onclick={goToTasks} type="button">Add a task</button>
					{:else}
						<ul class="mt-2 space-y-1 text-sm text-text-primary">
							{#each todayTasks as task}
								<li>- {task.title}</li>
							{/each}
						</ul>
					{/if}
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Habit suggestion</p>
					{#if habitSuggestion}
						<p class="mt-2 text-lg font-semibold text-text-primary">{habitSuggestion.name}</p>
						<p class="mt-1 text-sm text-text-secondary">Current streak: {habitSuggestion.streakCurrent} days</p>
					{:else}
						<p class="mt-2 text-sm text-text-secondary">No habits added yet.</p>
					{/if}
					<button class="mt-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-primary" onclick={goToHabits} type="button">Open habits</button>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Focus suggestion</p>
					<p class="mt-2 text-lg font-semibold text-text-primary">{focusSuggestionMinutes} minute session</p>
					<p class="mt-1 text-sm text-text-secondary">Start one sprint to keep momentum steady.</p>
					<button class="mt-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-on-primary" onclick={startSuggestedFocus} type="button">Start focus</button>
				</article>
			</div>

			<div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">This week</p>
					<p class="mt-2 text-2xl font-semibold text-text-primary">{todayTasks.length}</p>
					<p class="text-sm text-text-secondary">priority items in active plan</p>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Habit momentum</p>
					<p class="mt-2 text-2xl font-semibold text-text-primary">{habitSuggestion?.streakCurrent ?? 0}</p>
					<p class="text-sm text-text-secondary">current streak days</p>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.05em] text-text-secondary">Next action</p>
					<p class="mt-2 text-sm text-text-primary">
						{#if todayTasks.length > 0}
							Complete: {todayTasks[0]?.title}
						{:else}
							Add one task to start momentum
						{/if}
					</p>
				</article>
			</div>
		</section>
	</section>
</DashboardLayout>

<div class="fixed bottom-20 right-4 z-30 lg:bottom-6 lg:right-6">
	{#if fabOpen}
		<div class="mb-2 space-y-2">
			<button class="block w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-sm" onclick={goToTasks} type="button">+ Task</button>
			<button class="block w-full rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-sm" onclick={goToHabits} type="button">+ Habit</button>
			<button class="block w-full rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-sm" onclick={startSuggestedFocus} type="button">+ Focus</button>
		</div>
	{/if}
	<button class="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-md" onclick={() => (fabOpen = !fabOpen)} type="button">
		{fabOpen ? 'Close' : 'Quick Add'}
	</button>
</div>
