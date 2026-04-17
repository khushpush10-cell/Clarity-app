<script lang="ts">
	import { onMount } from 'svelte';

	import { progressCore } from '$lib/stores/progressCore';
	import { apiRequest } from '$lib/utils/http';

	let state = $state({
		level: 1,
		experiencePoints: 0,
		weeklyCompletionPercentage: 0,
		consistencyScore: 0,
		totalTasksCompleted: 0,
		totalStreakDays: 0,
		unlockedFeatures: ['core_dashboard'] as string[],
		rewards: [] as string[],
		loading: false,
		error: null as string | null
	});

	const unsubscribe = progressCore.subscribe((value) => {
		state = { ...state, ...value };
	});

	const ringStroke = $derived.by(() => Math.min(100, Math.max(0, state.weeklyCompletionPercentage)));

	onMount(() => {
		void loadCore();
		return () => unsubscribe();
	});

	async function loadCore() {
		progressCore.setLoading(true);
		progressCore.setError(null);
		try {
			const result = await apiRequest<{ core?: typeof state; error?: string }>('/api/progress-core');
			if (!result.ok || !result.data?.core) {
				progressCore.setError(result.error ?? 'Unable to load progress core');
				return;
			}
			progressCore.setState(result.data.core);
		} catch {
			progressCore.setError('Unable to load progress core');
		} finally {
			progressCore.setLoading(false);
		}
	}

	async function recalculateCore() {
		progressCore.setLoading(true);
		progressCore.setError(null);
		try {
			const result = await apiRequest<{ core?: typeof state; error?: string }>('/api/progress-core/calculate', { method: 'POST' });
			if (!result.ok || !result.data?.core) {
				progressCore.setError(result.error ?? 'Unable to recalculate progress core');
				return;
			}
			progressCore.setState(result.data.core);
		} catch {
			progressCore.setError('Unable to recalculate progress core');
		} finally {
			progressCore.setLoading(false);
		}
	}
</script>

<section class="app-card p-5">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">Progress Core</h2>
		<button class="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface disabled:opacity-50" disabled={state.loading} onclick={recalculateCore} type="button">
			{state.loading ? 'Syncing...' : 'Recalculate'}
		</button>
	</div>

	{#if state.error}
		<p class="mt-3 rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-xs text-warning">{state.error}</p>
	{/if}

	<div class="mt-5 grid place-items-center">
		<div class="relative grid h-48 w-48 place-items-center rounded-full border border-border bg-surface-2">
			<svg class="absolute h-44 w-44 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
				<circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" stroke-width="8" />
				<circle
					cx="50"
					cy="50"
					r="42"
					fill="none"
					stroke="var(--primary)"
					stroke-linecap="round"
					stroke-width="8"
					stroke-dasharray={`${2 * Math.PI * 42}`}
					stroke-dashoffset={`${2 * Math.PI * 42 * (1 - ringStroke / 100)}`}
				/>
			</svg>
			<div class="text-center">
				<p class="text-4xl font-semibold text-text-primary">{state.weeklyCompletionPercentage}%</p>
				<p class="text-xs text-text-secondary">Weekly completion</p>
			</div>
		</div>
	</div>

	<div class="mt-4 grid w-full grid-cols-2 gap-3 text-sm">
		<div class="muted-panel p-3"><p class="text-xs text-text-secondary">Level</p><p class="mt-1 text-lg font-semibold text-text-primary">{state.level}</p></div>
		<div class="muted-panel p-3"><p class="text-xs text-text-secondary">XP</p><p class="mt-1 text-lg font-semibold text-text-primary">{state.experiencePoints}</p></div>
		<div class="muted-panel p-3"><p class="text-xs text-text-secondary">Consistency</p><p class="mt-1 text-lg font-semibold text-text-primary">{state.consistencyScore}</p></div>
		<div class="muted-panel p-3"><p class="text-xs text-text-secondary">Streak Days</p><p class="mt-1 text-lg font-semibold text-text-primary">{state.totalStreakDays}</p></div>
	</div>

	<div class="mt-4 muted-panel p-3">
		<p class="text-xs font-semibold uppercase tracking-[0.05em] text-text-secondary">Unlocked Features</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each state.unlockedFeatures as feature}
				<span class="rounded-full bg-secondary-tint px-2 py-1 text-xs text-secondary">{feature}</span>
			{/each}
		</div>
	</div>

	<div class="mt-3 muted-panel p-3">
		<p class="text-xs font-semibold uppercase tracking-[0.05em] text-text-secondary">Rewards</p>
		{#if state.rewards.length === 0}
			<p class="mt-2 text-xs text-text-secondary">Complete more tasks and habits to unlock rewards.</p>
		{:else}
			<ul class="mt-2 space-y-1 text-xs text-text-primary">
				{#each state.rewards as reward}
					<li>- {reward}</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>
