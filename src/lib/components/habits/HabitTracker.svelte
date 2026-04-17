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
	let color = $state('#7F9C8A');
	let targetCount = $state(1);

	let activeHabitId = $state<string | null>(null);
	let activeLogs = $state([] as HabitLogItem[]);

	let mood = $state(3);
	let energy = $state(3);
	let reflection = $state('');
	let checkIns = $state([] as Array<{ id: string; createdAt: string; changes: { mood?: number; energy?: number; reflection?: string } }>);

	const colorPresets = ['#7F9C8A', '#8FB3A0', '#B7A6C9', '#C7B6D8', '#C48A95'];

	const unsubscribe = habits.subscribe((value) => {
		items = value.items;
		loading = value.loading;
		error = value.error;
	});

	const moodTrend = $derived.by(() => checkIns.slice(0, 7).map((entry) => entry.changes?.mood ?? 0).reverse());
	const energyTrend = $derived.by(() => checkIns.slice(0, 7).map((entry) => entry.changes?.energy ?? 0).reverse());

	onMount(() => {
		void loadHabits();
		void loadCheckIns();
		return () => unsubscribe();
	});

	async function loadHabits() {
		habits.setLoading(true); habits.setError(null);
		try {
			const result = await apiRequest<{ items?: HabitItem[]; error?: string }>('/api/habits');
			if (!result.ok) { habits.setError(result.error ?? 'Unable to load habits'); return; }
			habits.setItems(result.data?.items ?? []);
		} catch { habits.setError('Unable to load habits'); }
		finally { habits.setLoading(false); }
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
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mood, energy, reflection: reflection || null })
		});
		if (!result.ok) { error = result.error ?? 'Unable to submit check-in'; return; }
		reflection = '';
		await loadCheckIns();
	}

	async function createHabit(event: SubmitEvent) {
		event.preventDefault();
		const result = await apiRequest<{ item?: HabitItem; error?: string }>('/api/habits', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, description: description || null, color, targetCount, frequency: 'DAILY' })
		});
		if (!result.ok) { habits.setError(result.error ?? 'Unable to create habit'); return; }
		name = ''; description = ''; color = '#7F9C8A'; targetCount = 1;
		await loadHabits();
	}

	async function logHabit(event: CustomEvent<string>) {
		const result = await apiRequest<{ item?: HabitItem; error?: string }>(`/api/habits/${event.detail}/log`, {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ count: 1 })
		});
		if (!result.ok) { habits.setError(result.error ?? 'Unable to log habit'); return; }
		await loadHabits();
		if (activeHabitId === event.detail) await loadStats(event.detail);
	}

	async function deleteHabit(event: CustomEvent<string>) {
		const ok = confirm('Delete this habit?'); if (!ok) return;
		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/habits/${event.detail}`, { method: 'DELETE' });
		if (!result.ok) { habits.setError(result.error ?? 'Unable to delete habit'); return; }
		if (activeHabitId === event.detail) { activeHabitId = null; activeLogs = []; }
		await loadHabits();
	}

	async function loadStats(habitId: string) {
		const result = await apiRequest<{ logs?: HabitLogItem[]; error?: string }>(`/api/habits/${habitId}/stats`);
		if (!result.ok) { habits.setError(result.error ?? 'Unable to load habit stats'); return; }
		activeHabitId = habitId; activeLogs = result.data?.logs ?? [];
	}
</script>

<section class="space-y-4">
	<h1 class="text-3xl font-semibold text-text-primary">Habits</h1>

	<form class="app-card grid grid-cols-1 gap-3 p-4 md:grid-cols-12" onsubmit={submitCheckIn}>
		<p class="md:col-span-12 text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Daily check-in</p>
		<div class="md:col-span-3">
			<label class="mb-1 block text-xs text-text-secondary" for="mood-input">Mood ({mood}/5)</label>
			<input id="mood-input" bind:value={mood} class="w-full" max="5" min="1" type="range" />
		</div>
		<div class="md:col-span-3">
			<label class="mb-1 block text-xs text-text-secondary" for="energy-input">Energy ({energy}/5)</label>
			<input id="energy-input" bind:value={energy} class="w-full" max="5" min="1" type="range" />
		</div>
		<input bind:value={reflection} class="md:col-span-5 rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="Quick reflection" type="text" />
		<button class="md:col-span-1 rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary" type="submit">Log</button>
		<div class="md:col-span-12 grid grid-cols-2 gap-2 text-xs">
			<div class="muted-panel p-2">Mood trend: {moodTrend.join(' • ') || '-'}</div>
			<div class="muted-panel p-2">Energy trend: {energyTrend.join(' • ') || '-'}</div>
		</div>
	</form>

	<form class="app-card grid grid-cols-1 gap-3 p-4 md:grid-cols-12" onsubmit={createHabit}>
		<div class="md:col-span-4">
			<label class="mb-1 block text-xs text-text-secondary" for="habit-name">Habit name</label>
			<input id="habit-name" bind:value={name} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" required type="text" />
		</div>
		<div class="md:col-span-4">
			<label class="mb-1 block text-xs text-text-secondary" for="habit-description">Description</label>
			<input id="habit-description" bind:value={description} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" type="text" />
		</div>
		<div class="md:col-span-2">
			<label class="mb-1 block text-xs text-text-secondary" for="habit-color">Color</label>
			<select id="habit-color" bind:value={color} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm">
				{#each colorPresets as preset}
					<option value={preset}>{preset}</option>
				{/each}
			</select>
		</div>
		<div class="md:col-span-1">
			<label class="mb-1 block text-xs text-text-secondary" for="habit-target">Target</label>
			<input id="habit-target" bind:value={targetCount} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" min="1" type="number" />
		</div>
		<div class="md:col-span-1 md:self-end">
			<button class="w-full rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary" type="submit">Add</button>
		</div>
	</form>

	{#if error}<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>{/if}

	{#if loading}
		<p class="text-sm text-text-secondary">Loading habits...</p>
	{:else if items.length === 0}
		<div class="empty-state">
			<p class="text-sm">No habits yet. Add one routine and track it for a week.</p>
			<div class="mt-3"><a class="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-on-primary" href="/habits">Add your first habit</a></div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
			<div class="space-y-3 xl:col-span-7">
				{#each items as item (item.id)}
					<div>
						<HabitCard {item} on:log={logHabit} on:delete={deleteHabit} />
						<button class="mt-1 text-xs text-secondary" onclick={() => loadStats(item.id)} type="button">View streak calendar</button>
					</div>
				{/each}
			</div>
			<div class="xl:col-span-5"><StreakCalendar logs={activeLogs} /></div>
		</div>
	{/if}
</section>
