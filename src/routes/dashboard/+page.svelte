<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { TaskItem } from '$lib/stores/tasks';
	import { apiRequest } from '$lib/utils/http';

	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let allTasks = $state([] as TaskItem[]);

	const now = () => new Date();

	function startOfWeek() {
		const date = new Date();
		const day = date.getDay();
		const diff = date.getDate() - day + (day === 0 ? -6 : 1);
		date.setDate(diff);
		date.setHours(0, 0, 0, 0);
		return date;
	}

	let pendingTasks = $derived(allTasks.filter((task) => task.status !== 'DONE'));
	let completedTasks = $derived(allTasks.filter((task) => task.status === 'DONE'));
	let completedThisWeek = $derived(
		completedTasks.filter((task) => task.completedAt && new Date(task.completedAt) >= startOfWeek())
	);
	let dueTodayTasks = $derived(
		pendingTasks.filter((task) => {
			if (!task.dueDate) return false;
			const due = new Date(task.dueDate);
			const today = now();
			return due.toDateString() === today.toDateString();
		})
	);
	let overdueTasks = $derived(pendingTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now()));
	let topTasks = $derived(
		[...pendingTasks]
			.sort((a, b) => {
				const weights: Record<TaskItem['priority'], number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
				const priorityDiff = weights[b.priority] - weights[a.priority];
				if (priorityDiff !== 0) return priorityDiff;
				return (
					(a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER) -
					(b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER)
				);
			})
			.slice(0, 3)
	);
	let completionRate = $derived(allTasks.length ? Math.round((completedTasks.length / allTasks.length) * 100) : 0);
	let completionStyle = $derived(`width: ${completionRate}%`);
	let nextAction = $derived(topTasks[0]?.title ?? 'Add one clear task to start your plan.');

	onMount(() => {
		void loadDashboard();
	});

	function readLocalTasks(): TaskItem[] {
		try {
			const raw = localStorage.getItem(LOCAL_TASKS_KEY);
			return raw ? (JSON.parse(raw) as TaskItem[]) : [];
		} catch {
			return [];
		}
	}

	async function loadDashboard() {
		loading = true;
		error = null;
		try {
			const result = await apiRequest<{ items?: TaskItem[]; error?: string }>('/api/tasks?pageSize=100');
			if (!result.ok) {
				allTasks = readLocalTasks();
				error = 'Using local browser data. Database sync is not available for this session.';
				return;
			}
			allTasks = result.data?.items ?? [];
		} catch {
			allTasks = readLocalTasks();
			error = 'Using local browser data. Database sync is not available for this session.';
		} finally {
			loading = false;
		}
	}
</script>

<DashboardLayout>
	<section class="space-y-4 xl:col-span-12">
		<section class="app-card p-5 md:p-6">
			<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">This week</p>
					<h1 class="mt-2 text-3xl font-semibold text-text-primary">Plan calmly. Finish clearly.</h1>
					<p class="mt-2 text-sm text-text-secondary">A simple view of what needs attention now.</p>
				</div>
				<button aria-label="New task" class="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary" onclick={() => goto('/tasks')} type="button"><Icon name="plus" size={18} /></button>
			</div>

			{#if error}
				<p class="mt-4 rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>
			{/if}

			<div class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.08em] text-text-secondary">Completed</p>
					<p class="mt-2 text-3xl font-semibold text-text-primary">{completedThisWeek.length}</p>
					<p class="text-sm text-text-secondary">finished this week</p>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.08em] text-text-secondary">Pending</p>
					<p class="mt-2 text-3xl font-semibold text-text-primary">{pendingTasks.length}</p>
					<p class="text-sm text-text-secondary">open tasks</p>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.08em] text-text-secondary">Due today</p>
					<p class="mt-2 text-3xl font-semibold text-text-primary">{dueTodayTasks.length}</p>
					<p class="text-sm text-text-secondary">need attention</p>
				</article>
				<article class="muted-panel p-4">
					<p class="text-xs uppercase tracking-[0.08em] text-text-secondary">Completion</p>
					<p class="mt-2 text-3xl font-semibold text-text-primary">{completionRate}%</p>
					<div class="mt-3 h-2 rounded-full bg-surface-2">
						<div class="h-2 rounded-full bg-primary" style={completionStyle}></div>
					</div>
				</article>
			</div>
		</section>

		<section class="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.8fr]">
			<article class="app-card p-5">
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-xl font-semibold text-text-primary">Today plan</h2>
					<button aria-label="Open tasks" class="grid h-9 w-9 place-items-center rounded-full border border-border text-text-primary" onclick={() => goto('/tasks')} type="button"><Icon name="tasks" size={16} /></button>
				</div>

				{#if loading}
					<p class="mt-4 text-sm text-text-secondary">Loading your plan...</p>
				{:else if topTasks.length === 0}
					<div class="empty-state mt-4">
						<p>No tasks yet. Add your first task and keep the plan light.</p>
						<button aria-label="Add task" class="mt-3 grid h-9 w-9 place-items-center rounded-full bg-primary text-on-primary" onclick={() => goto('/tasks')} type="button"><Icon name="plus" size={16} /></button>
					</div>
				{:else}
					<div class="mt-4 space-y-3">
						{#each topTasks as task}
							<div class="rounded-[14px] border border-border bg-surface-2 p-3">
								<div class="flex items-center justify-between gap-3">
									<p class="font-medium text-text-primary">{task.title}</p>
									<span class="rounded-full bg-secondary-tint px-2 py-1 text-xs text-secondary">{task.priority}</span>
								</div>
								{#if task.description}
									<p class="mt-1 text-sm text-text-secondary">{task.description}</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</article>

			<article class="app-card p-5">
				<h2 class="text-xl font-semibold text-text-primary">Next recommended action</h2>
				<p class="mt-3 text-sm text-text-secondary">{nextAction}</p>
				{#if overdueTasks.length > 0}
					<p class="mt-4 rounded-[14px] bg-warning-tint px-3 py-2 text-sm text-warning">{overdueTasks.length} overdue task{overdueTasks.length === 1 ? '' : 's'} need a decision.</p>
				{/if}
				<button aria-label="Review tasks" class="mt-4 grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary" onclick={() => goto('/tasks')} type="button"><Icon name="tasks" size={17} /></button>
			</article>
		</section>
	</section>
</DashboardLayout>
