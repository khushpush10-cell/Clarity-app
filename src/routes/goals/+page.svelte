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
	let color = $state('#0EA5E9');
	let deadline = $state('');

	onMount(() => {
		void loadGoals();
	});

	async function loadGoals() {
		loading = true;
		error = null;

		try {
			const result = await apiRequest<{ items?: GoalItem[]; error?: string }>('/api/goals');
			if (!result.ok) {
				error = result.error ?? 'Unable to load goals';
				return;
			}

			items = result.data?.items ?? [];
		} catch {
			error = 'Unable to load goals';
		} finally {
			loading = false;
		}
	}

	async function createGoal(event: SubmitEvent) {
		event.preventDefault();
		error = null;

		const result = await apiRequest<{ item?: GoalItem; error?: string }>('/api/goals', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				title,
				description: description || null,
				targetMetric,
				currentValue: 0,
				targetValue,
				deadline: deadline ? new Date(deadline).toISOString() : null,
				color
			})
		});

		if (!result.ok) {
			error = result.error ?? 'Unable to create goal';
			return;
		}

		title = '';
		description = '';
		targetMetric = 'sessions';
		targetValue = 10;
		deadline = '';
		color = '#0EA5E9';

		await loadGoals();
	}

	async function updateGoalProgress(event: CustomEvent<{ id: string; currentValue: number }>) {
		error = null;

		const item = items.find((goal) => goal.id === event.detail.id);
		if (!item) return;

		const result = await apiRequest<{ item?: GoalItem; error?: string }>(
			`/api/goals/${event.detail.id}/update-progress`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					currentValue: event.detail.currentValue,
					targetValue: item.targetValue
				})
			}
		);

		if (!result.ok) {
			error = result.error ?? 'Unable to update goal';
			return;
		}

		await loadGoals();
	}

	async function deleteGoal(event: CustomEvent<string>) {
		error = null;
		const ok = confirm('Delete this goal?');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/goals/${event.detail}`, {
			method: 'DELETE'
		});
		if (!result.ok) {
			error = result.error ?? 'Unable to delete goal';
			return;
		}

		await loadGoals();
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<h1 class="text-2xl font-bold text-text-primary">Goals</h1>

		<form class="grid grid-cols-12 gap-3 rounded-[8px] border border-border bg-surface p-4" onsubmit={createGoal}>
			<input
				bind:value={title}
				class="col-span-3 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
				placeholder="Goal title"
				required
				type="text"
			/>
			<input
				bind:value={description}
				class="col-span-3 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
				placeholder="Description"
				type="text"
			/>
			<input
				bind:value={targetMetric}
				class="col-span-2 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
				placeholder="Metric"
				type="text"
			/>
			<input
				bind:value={targetValue}
				class="col-span-1 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
				min="1"
				type="number"
			/>
			<input bind:value={color} class="col-span-1 h-10 rounded-[8px] border border-border px-2" type="color" />
			<input
				bind:value={deadline}
				class="col-span-1 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
				type="date"
			/>
			<button class="col-span-1 rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white" type="submit">
				Add
			</button>
		</form>

		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">{error}</p>
		{/if}

		{#if loading}
			<p class="text-sm text-text-secondary">Loading goals...</p>
		{:else if items.length === 0}
			<p class="rounded-[8px] border border-border bg-surface p-4 text-sm text-text-secondary">No goals yet.</p>
		{:else}
			<div class="grid grid-cols-2 gap-4">
				{#each items as item (item.id)}
					<GoalCard {item} on:update={updateGoalProgress} on:delete={deleteGoal} />
				{/each}
			</div>
		{/if}
	</section>
</MainLayout>
