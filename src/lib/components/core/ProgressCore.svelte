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
		state = {
			...state,
			...value
		};
	});

	const orbColor = $derived.by(() => {
		if (state.consistencyScore >= 80) return 'var(--color-success)';
		if (state.consistencyScore >= 60) return 'var(--color-primary)';
		if (state.consistencyScore >= 40) return 'var(--color-warning)';
		return 'var(--color-urgent)';
	});

	const orbGlow = $derived.by(() => {
		const opacity = Math.max(0.2, state.weeklyCompletionPercentage / 100);
		return `0 0 40px color-mix(in srgb, ${orbColor} ${Math.round(opacity * 100)}%, white)`;
	});

	onMount(() => {
		void loadCore();

		return () => {
			unsubscribe();
		};
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
			const result = await apiRequest<{ core?: typeof state; error?: string }>(
				'/api/progress-core/calculate',
				{ method: 'POST' }
			);

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

<section class="rounded-[8px] border border-border bg-surface p-5">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold tracking-[0.08em] text-text-secondary uppercase">
			Progress Core
		</h2>
		<button
			class="rounded-[8px] border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] disabled:opacity-50"
			disabled={state.loading}
			onclick={recalculateCore}
			type="button"
		>
			{state.loading ? 'Syncing...' : 'Recalculate'}
		</button>
	</div>

	{#if state.error}
		<p
			class="mt-3 rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-xs text-urgent"
		>
			{state.error}
		</p>
	{/if}

	<div class="mt-5 flex flex-col items-center">
		<div
			class="relative grid h-48 w-48 place-items-center rounded-[8px] border border-border"
			style={`background: color-mix(in srgb, ${orbColor} 20%, white); box-shadow:${orbGlow};`}
		>
			<div
				class="h-28 w-28 rotate-45 rounded-[8px] border border-white/70"
				style={`background: color-mix(in srgb, ${orbColor} 75%, white);`}
			></div>
			<div class="absolute text-center">
				<p class="text-3xl font-bold text-text-primary">{state.weeklyCompletionPercentage}%</p>
				<p class="text-xs text-text-secondary">Weekly completion</p>
			</div>
		</div>

		<div class="mt-4 grid w-full grid-cols-2 gap-3 text-sm">
			<div class="rounded-[8px] border border-border bg-background p-3">
				<p class="text-xs text-text-secondary">Level</p>
				<p class="mt-1 text-lg font-semibold text-text-primary">{state.level}</p>
			</div>
			<div class="rounded-[8px] border border-border bg-background p-3">
				<p class="text-xs text-text-secondary">XP</p>
				<p class="mt-1 text-lg font-semibold text-text-primary">{state.experiencePoints}</p>
			</div>
			<div class="rounded-[8px] border border-border bg-background p-3">
				<p class="text-xs text-text-secondary">Consistency</p>
				<p class="mt-1 text-lg font-semibold text-text-primary">{state.consistencyScore}</p>
			</div>
			<div class="rounded-[8px] border border-border bg-background p-3">
				<p class="text-xs text-text-secondary">Streak Days</p>
				<p class="mt-1 text-lg font-semibold text-text-primary">{state.totalStreakDays}</p>
			</div>
		</div>

		<div class="mt-4 w-full rounded-[8px] border border-border bg-background p-3">
			<p class="text-xs font-semibold tracking-[0.05em] text-text-secondary uppercase">
				Unlocked Features
			</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each state.unlockedFeatures as feature}
					<span class="rounded-[8px] bg-primary/10 px-2 py-1 text-xs text-primary">{feature}</span>
				{/each}
			</div>
		</div>

		<div class="mt-3 w-full rounded-[8px] border border-border bg-background p-3">
			<p class="text-xs font-semibold tracking-[0.05em] text-text-secondary uppercase">Rewards</p>
			{#if state.rewards.length === 0}
				<p class="mt-2 text-xs text-text-secondary">
					Complete more tasks and habits to unlock rewards.
				</p>
			{:else}
				<ul class="mt-2 space-y-1 text-xs text-text-primary">
					{#each state.rewards as reward}
						<li>- {reward}</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</section>
