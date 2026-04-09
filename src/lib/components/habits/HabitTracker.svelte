<script lang="ts">
	import { onMount } from 'svelte';

	import HabitCard from '$lib/components/habits/HabitCard.svelte';
	import StreakCalendar from '$lib/components/habits/StreakCalendar.svelte';
	import { habits, type HabitItem, type HabitLogItem } from '$lib/stores/habits';
	import { apiRequest } from '$lib/utils/http';

	let items = $state([] as HabitItem[]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let name = $state('');
	let description = $state('');
	let color = $state('#10B981');
	let targetCount = $state(1);

	let activeHabitId = $state<string | null>(null);
	let activeLogs = $state([] as HabitLogItem[]);

	let mood = $state(3);
	let energy = $state(3);
	let reflection = $state('');
	let checkIns = $state([] as Array<{ id: string; createdAt: string; changes: { mood?: number; energy?: number; reflection?: string } }>);

	const unsubscribe = habits.subscribe((value) => {
		items = value.items;
		loading = value.loading;
		error = value.error;
	});

	onMount(() => {
		void loadHabits();
		void loadCheckIns();

		return () => {
			unsubscribe();
		};
	});

	async function loadHabits() {
		habits.setLoading(true);
		habits.setError(null);

		try {
			const result = await apiRequest<{ items?: HabitItem[]; error?: string }>('/api/habits');
			if (!result.ok) {
				habits.setError(result.error ?? 'Unable to load habits');
				return;
			}

			habits.setItems(result.data?.items ?? []);
		} catch {
			habits.setError('Unable to load habits');
		} finally {
			habits.setLoading(false);
		}
	}

	async function loadCheckIns() {
		const result = await apiRequest<{ items?: Array<{ id: string; createdAt: string; changes: { mood?: number; energy?: number; reflection?: string } }>; error?: string }>('/api/check-ins').catch(() => null);
		if (!result || !result.ok) return;
		checkIns = result.data?.items ?? [];
	}

	async function submitCheckIn(event: SubmitEvent) {
		event.preventDefault();
		error = null;

		const result = await apiRequest<{ item?: unknown; error?: string }>('/api/check-ins', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mood, energy, reflection: reflection || null })
		});

		if (!result.ok) {
			error = result.error ?? 'Unable to submit check-in';
			return;
		}

		reflection = '';
		await loadCheckIns();
	}

	async function createHabit(event: SubmitEvent) {
		event.preventDefault();

		const result = await apiRequest<{ item?: HabitItem; error?: string }>('/api/habits', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name,
				description: description || null,
				color,
				targetCount,
				frequency: 'DAILY'
			})
		});

		if (!result.ok) {
			habits.setError(result.error ?? 'Unable to create habit');
			return;
		}

		name = '';
		description = '';
		color = '#10B981';
		targetCount = 1;

		await loadHabits();
	}

	async function logHabit(event: CustomEvent<string>) {
		const result = await apiRequest<{ item?: HabitItem; error?: string }>(`/api/habits/${event.detail}/log`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ count: 1 })
		});

		if (!result.ok) {
			habits.setError(result.error ?? 'Unable to log habit');
			return;
		}

		await loadHabits();

		if (activeHabitId === event.detail) {
			await loadStats(event.detail);
		}
	}

	async function deleteHabit(event: CustomEvent<string>) {
		const ok = confirm('Delete this habit?');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/habits/${event.detail}`, { method: 'DELETE' });

		if (!result.ok) {
			habits.setError(result.error ?? 'Unable to delete habit');
			return;
		}

		if (activeHabitId === event.detail) {
			activeHabitId = null;
			activeLogs = [];
		}

		await loadHabits();
	}

	async function loadStats(habitId: string) {
		const result = await apiRequest<{ logs?: HabitLogItem[]; error?: string }>(`/api/habits/${habitId}/stats`);

		if (!result.ok) {
			habits.setError(result.error ?? 'Unable to load habit stats');
			return;
		}

		activeHabitId = habitId;
		activeLogs = result.data?.logs ?? [];
	}
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-bold text-text-primary">Habits</h1>

	<form class="grid grid-cols-12 gap-3 rounded-[8px] border border-border bg-surface p-4" onsubmit={submitCheckIn}>
		<p class="col-span-12 text-xs font-semibold tracking-[0.06em] text-text-secondary uppercase">Daily Check-In</p>
		<div class="col-span-2">
			<label class="mb-1 block text-xs text-text-secondary" for="mood-input">Mood (1-5)</label>
			<input id="mood-input" bind:value={mood} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" max="5" min="1" type="number" />
		</div>
		<div class="col-span-2">
			<label class="mb-1 block text-xs text-text-secondary" for="energy-input">Energy (1-5)</label>
			<input id="energy-input" bind:value={energy} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" max="5" min="1" type="number" />
		</div>
		<input bind:value={reflection} class="col-span-7 rounded-[8px] border border-border px-3 py-2 text-sm" placeholder="Quick reflection" type="text" />
		<button class="col-span-1 rounded-[8px] bg-secondary px-3 py-2 text-sm font-semibold text-white" type="submit">Log</button>
	</form>

	{#if checkIns.length > 0}
		<div class="rounded-[8px] border border-border bg-surface p-3">
			<p class="mb-2 text-xs font-semibold tracking-[0.06em] text-text-secondary uppercase">Recent Check-Ins</p>
			<div class="space-y-1 text-xs text-text-secondary">
				{#each checkIns.slice(0, 5) as entry (entry.id)}
					<p>{new Date(entry.createdAt).toLocaleString()} - Mood {entry.changes?.mood ?? '-'}, Energy {entry.changes?.energy ?? '-'}</p>
				{/each}
			</div>
		</div>
	{/if}

	<form
		class="grid grid-cols-12 gap-3 rounded-[8px] border border-border bg-surface p-4"
		onsubmit={createHabit}
	>
		<input
			bind:value={name}
			class="col-span-4 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
			placeholder="Habit name"
			required
			type="text"
		/>
		<input
			bind:value={description}
			class="col-span-4 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
			placeholder="Description"
			type="text"
		/>
		<input
			bind:value={color}
			class="col-span-2 h-10 rounded-[8px] border border-border px-2"
			type="color"
		/>
		<input
			bind:value={targetCount}
			class="col-span-1 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
			min="1"
			type="number"
		/>
		<button
			class="col-span-1 rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white"
			type="submit"
		>
			Add
		</button>
	</form>

	{#if error}
		<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">
			{error}
		</p>
	{/if}

	{#if loading}
		<p class="text-sm text-text-secondary">Loading habits...</p>
	{:else if items.length === 0}
		<p class="rounded-[8px] border border-border bg-surface p-4 text-sm text-text-secondary">
			No habits yet.
		</p>
	{:else}
		<div class="grid grid-cols-12 gap-4">
			<div class="col-span-7 space-y-3">
				{#each items as item (item.id)}
					<div>
						<HabitCard {item} on:log={logHabit} on:delete={deleteHabit} />
						<button
							class="mt-1 text-xs text-secondary"
							onclick={() => loadStats(item.id)}
							type="button"
						>
							View streak calendar
						</button>
					</div>
				{/each}
			</div>
			<div class="col-span-5">
				<StreakCalendar logs={activeLogs} />
			</div>
		</div>
	{/if}
</section>
