<script lang="ts">
	import { onMount } from 'svelte';

	import GoalCard, { type GoalItem } from '$lib/components/goals/GoalCard.svelte';
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { apiRequest } from '$lib/utils/http';

	let items = $state([] as GoalItem[]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let title = $state('');
	let description = $state('');
	let targetMetric = $state('sessions');
	let targetValue = $state(10);
	let color = $state('#7F9C8A');
	let deadline = $state('');
	const LOCAL_GOALS_KEY = 'clarity_local_goals_v1';

	const colorPresets = ['#7F9C8A', '#8FB3A0', '#B7A6C9', '#C48A95'];

	function readLocalGoals(): GoalItem[] {
		try {
			const raw = localStorage.getItem(LOCAL_GOALS_KEY);
			return raw ? (JSON.parse(raw) as GoalItem[]) : [];
		} catch {
			return [];
		}
	}

	function writeLocalGoals(next: GoalItem[]) {
		localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(next));
	}

	onMount(() => { void loadGoals(); });

	async function loadGoals() {
		loading = true; error = null;
		try {
			const result = await apiRequest<{ items?: GoalItem[]; error?: string }>('/api/goals');
			if (!result.ok) {
				items = readLocalGoals();
				error = 'Using offline mode (local browser storage)';
				return;
			}
			items = result.data?.items ?? [];
		} catch {
			items = readLocalGoals();
			error = 'Using offline mode (local browser storage)';
		}
		finally { loading = false; }
	}

	async function createGoal(event: SubmitEvent) {
		event.preventDefault(); error = null;
		const result = await apiRequest<{ item?: GoalItem; error?: string }>('/api/goals', {
			method: 'POST', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title, description: description || null, targetMetric, currentValue: 0, targetValue, deadline: deadline ? new Date(deadline).toISOString() : null, color })
		});
		if (!result.ok) {
			const now = new Date().toISOString();
			const local: GoalItem = {
				id: crypto.randomUUID(),
				title,
				description: description || null,
				targetMetric,
				currentValue: 0,
				targetValue,
				progressPercentage: 0,
				deadline: deadline ? new Date(deadline).toISOString() : null,
				color
			};
			const next = [local, ...readLocalGoals()];
			writeLocalGoals(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			title = ''; description = ''; targetMetric = 'sessions'; targetValue = 10; deadline = ''; color = '#7F9C8A';
			return;
		}
		title = ''; description = ''; targetMetric = 'sessions'; targetValue = 10; deadline = ''; color = '#7F9C8A';
		await loadGoals();
	}

	async function updateGoalProgress(event: CustomEvent<{ id: string; currentValue: number }>) {
		error = null;
		const item = items.find((goal) => goal.id === event.detail.id); if (!item) return;
		const result = await apiRequest<{ item?: GoalItem; error?: string }>(`/api/goals/${event.detail.id}/update-progress`, {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentValue: event.detail.currentValue, targetValue: item.targetValue })
		});
		if (!result.ok) {
			const next = readLocalGoals().map((goal) => {
				if (goal.id !== event.detail.id) return goal;
				const progress = Math.max(
					0,
					Math.min(100, Math.round((event.detail.currentValue / goal.targetValue) * 100))
				);
				return { ...goal, currentValue: event.detail.currentValue, progressPercentage: progress };
			});
			writeLocalGoals(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadGoals();
	}

	async function deleteGoal(event: CustomEvent<string>) {
		error = null;
		const ok = confirm('Delete this goal?'); if (!ok) return;
		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/goals/${event.detail}`, { method: 'DELETE' });
		if (!result.ok) {
			const next = readLocalGoals().filter((goal) => goal.id !== event.detail);
			writeLocalGoals(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadGoals();
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<h1 class="text-3xl font-semibold text-text-primary">Goals</h1>

		<form class="app-card grid grid-cols-1 gap-3 p-4 md:grid-cols-12" onsubmit={createGoal}>
			<input bind:value={title} class="md:col-span-3 rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="Goal title" required type="text" />
			<input bind:value={description} class="md:col-span-3 rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="Description" type="text" />
			<input bind:value={targetMetric} class="md:col-span-2 rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="Metric" type="text" />
			<input bind:value={targetValue} class="md:col-span-1 rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" min="1" type="number" />
			<select bind:value={color} class="md:col-span-1 rounded-[14px] border border-border bg-surface-2 px-2 py-2 text-sm">{#each colorPresets as preset}<option value={preset}>{preset}</option>{/each}</select>
			<input bind:value={deadline} class="md:col-span-1 rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" type="date" />
			<button class="md:col-span-1 rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary" type="submit">Add</button>
		</form>

		{#if error}<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>{/if}
		{#if loading}
			<p class="text-sm text-text-secondary">Loading goals...</p>
		{:else if items.length === 0}
			<div class="empty-state"><p class="text-sm">No goals yet. Define one measurable outcome and track progress from tasks/habits.</p></div>
		{:else}
			<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
				{#each items as item (item.id)}
					<GoalCard {item} on:update={updateGoalProgress} on:delete={deleteGoal} />
				{/each}
			</div>
		{/if}
	</section>
</MainLayout>
