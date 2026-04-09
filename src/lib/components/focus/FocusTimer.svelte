<script lang="ts">
	import { onMount } from 'svelte';

	import { apiRequest } from '$lib/utils/http';

	let { className = '' } = $props<{ className?: string }>();

	let duration = $state(25);
	let remainingSeconds = $state(25 * 60);
	let running = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let activeSessionId = $state<string | null>(null);

	let stats = $state({
		totalMinutes: 0,
		totalSessions: 0,
		averageMinutes: 0
	});

	let timer: ReturnType<typeof setInterval> | null = null;

	const progressPercentage = $derived.by(() => {
		const total = duration * 60;
		if (!total) return 0;
		return Math.max(0, Math.min(100, Math.round(((total - remainingSeconds) / total) * 100)));
	});

	const timeText = $derived.by(() => {
		const minutes = Math.floor(remainingSeconds / 60)
			.toString()
			.padStart(2, '0');
		const seconds = Math.floor(remainingSeconds % 60)
			.toString()
			.padStart(2, '0');
		return `${minutes}:${seconds}`;
	});

	onMount(() => {
		void loadStats();

		return () => {
			if (timer) clearInterval(timer);
		};
	});

	async function loadStats() {
		const result = await apiRequest<{ totalMinutes?: number; totalSessions?: number; averageMinutes?: number; error?: string }>(
			'/api/focus-sessions/stats'
		).catch(() => null);

		if (!result) {
			error = 'Unable to load focus stats';
			return;
		}

		if (!result.ok) {
			error = result.error ?? 'Unable to load focus stats';
			return;
		}

		const payload = result.data;
		stats = {
			totalMinutes: payload?.totalMinutes ?? 0,
			totalSessions: payload?.totalSessions ?? 0,
			averageMinutes: payload?.averageMinutes ?? 0
		};
	}

	async function start() {
		error = null;
		loading = true;

		try {
			const result = await apiRequest<{ item?: { id: string }; error?: string }>('/api/focus-sessions/start', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ durationMinutes: duration })
			});

			if (!result.ok || !result.data?.item?.id) {
				error = result.error ?? 'Unable to start focus session';
				return;
			}

			activeSessionId = result.data.item.id;
			remainingSeconds = duration * 60;
			running = true;

			if (timer) clearInterval(timer);
			timer = setInterval(() => {
				remainingSeconds -= 1;
				if (remainingSeconds <= 0) {
					remainingSeconds = 0;
					void finish();
				}
			}, 1000);
		} catch {
			error = 'Unable to start focus session';
		} finally {
			loading = false;
		}
	}

	async function finish() {
		if (!activeSessionId) return;

		if (timer) {
			clearInterval(timer);
			timer = null;
		}

		running = false;
		loading = true;

		try {
			const result = await apiRequest<{ item?: { id: string }; error?: string }>(
				`/api/focus-sessions/${activeSessionId}/end`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ interruptions: 0 })
				}
			);

			if (!result.ok) {
				error = result.error ?? 'Unable to complete focus session';
				return;
			}

			activeSessionId = null;
			await loadStats();
		} catch {
			error = 'Unable to complete focus session';
		} finally {
			loading = false;
		}
	}

	function setDuration(next: number) {
		if (running) return;
		duration = next;
		remainingSeconds = next * 60;
	}
</script>

<section class={`rounded-[8px] border border-border bg-surface p-5 ${className}`}>
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold tracking-[0.08em] text-text-secondary uppercase">Focus Timer</h2>
		<p class="text-xs text-text-secondary">Pomodoro + custom sessions</p>
	</div>

	{#if error}
		<p class="mt-3 rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-xs text-urgent">{error}</p>
	{/if}

	<div class="mt-4 rounded-[8px] border border-border bg-background p-4">
		<div class="mb-3 flex flex-wrap gap-2">
			{#each [15, 25, 30, 45, 60] as option}
				<button
					class={`rounded-[8px] px-2.5 py-1 text-xs font-medium ${
						duration === option
							? 'bg-primary text-white'
							: 'border border-border bg-surface text-text-primary'
					}`}
					onclick={() => setDuration(option)}
					type="button"
				>
					{option}m
				</button>
			{/each}
		</div>

		<div class="grid place-items-center">
			<p class="text-4xl font-bold text-text-primary">{timeText}</p>
			<div class="mt-3 h-2 w-full rounded-full bg-border">
				<div
					class="h-2 rounded-full bg-primary transition-all"
					style={`width:${progressPercentage}%`}
				></div>
			</div>
		</div>

		<div class="mt-4 flex gap-2">
			{#if !running}
				<button
					class="rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
					disabled={loading}
					onclick={start}
					type="button"
				>
					{loading ? 'Starting...' : 'Start'}
				</button>
			{:else}
				<button
					class="rounded-[8px] bg-success px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
					disabled={loading}
					onclick={finish}
					type="button"
				>
					{loading ? 'Ending...' : 'Finish session'}
				</button>
			{/if}
		</div>
	</div>

	<div class="mt-4 grid grid-cols-3 gap-3 text-sm">
		<div class="rounded-[8px] border border-border bg-background p-3">
			<p class="text-xs text-text-secondary">Total Minutes</p>
			<p class="mt-1 text-lg font-semibold text-text-primary">{stats.totalMinutes}</p>
		</div>
		<div class="rounded-[8px] border border-border bg-background p-3">
			<p class="text-xs text-text-secondary">Sessions</p>
			<p class="mt-1 text-lg font-semibold text-text-primary">{stats.totalSessions}</p>
		</div>
		<div class="rounded-[8px] border border-border bg-background p-3">
			<p class="text-xs text-text-secondary">Average</p>
			<p class="mt-1 text-lg font-semibold text-text-primary">{stats.averageMinutes}m</p>
		</div>
	</div>
</section>
