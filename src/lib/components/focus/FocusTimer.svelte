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

	let stats = $state({ totalMinutes: 0, totalSessions: 0, averageMinutes: 0 });
	let timer: ReturnType<typeof setInterval> | null = null;
	const LOCAL_FOCUS_STATS_KEY = 'clarity_local_focus_stats_v1';
	const LOCAL_FOCUS_SESSIONS_KEY = 'clarity_local_focus_sessions_v1';

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
		const onQuickStart = (event: Event) => {
			const custom = event as CustomEvent<{ minutes?: number }>;
			const minutes = custom.detail?.minutes;
			if (typeof minutes === 'number' && [15, 25, 30, 45, 60].includes(minutes)) {
				setDuration(minutes);
			} else {
				setDuration(25);
			}
			if (!running) {
				void start();
			}
		};
		window.addEventListener('clarity:focus-quick-start', onQuickStart);
		return () => {
			window.removeEventListener('clarity:focus-quick-start', onQuickStart);
			if (timer) clearInterval(timer);
		};
	});

	function readLocalStats() {
		try {
			const raw = localStorage.getItem(LOCAL_FOCUS_STATS_KEY);
			return raw
				? (JSON.parse(raw) as { totalMinutes: number; totalSessions: number; averageMinutes: number })
				: { totalMinutes: 0, totalSessions: 0, averageMinutes: 0 };
		} catch {
			return { totalMinutes: 0, totalSessions: 0, averageMinutes: 0 };
		}
	}

	function writeLocalStats(next: { totalMinutes: number; totalSessions: number; averageMinutes: number }) {
		localStorage.setItem(LOCAL_FOCUS_STATS_KEY, JSON.stringify(next));
	}

	function appendLocalSession(session: { startedAt: string; durationMinutes: number; interruptions: number }) {
		try {
			const raw = localStorage.getItem(LOCAL_FOCUS_SESSIONS_KEY);
			const current = raw
				? (JSON.parse(raw) as Array<{ startedAt: string; durationMinutes: number; interruptions: number }>)
				: [];
			const next = [session, ...current].slice(0, 120);
			localStorage.setItem(LOCAL_FOCUS_SESSIONS_KEY, JSON.stringify(next));
		} catch {
			// Ignore malformed local data
		}
	}

	async function loadStats() {
		const result = await apiRequest<{ totalMinutes?: number; totalSessions?: number; averageMinutes?: number; error?: string }>(
			'/api/focus-sessions/stats'
		).catch(() => null);
		if (!result || !result.ok) {
			stats = readLocalStats();
			return;
		}
		stats = {
			totalMinutes: result.data?.totalMinutes ?? 0,
			totalSessions: result.data?.totalSessions ?? 0,
			averageMinutes: result.data?.averageMinutes ?? 0
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
				activeSessionId = `local-${crypto.randomUUID()}`;
				error = 'Running in offline mode (local browser storage)';
			} else {
				activeSessionId = result.data.item.id;
			}
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
			const result = await apiRequest<{ item?: { id: string }; error?: string }>(`/api/focus-sessions/${activeSessionId}/end`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ interruptions: 0 })
			});
			if (!result.ok) {
				const current = readLocalStats();
				const next = {
					totalMinutes: current.totalMinutes + duration,
					totalSessions: current.totalSessions + 1,
					averageMinutes: Math.round(
						(current.totalMinutes + duration) / Math.max(1, current.totalSessions + 1)
					)
				};
				writeLocalStats(next);
				appendLocalSession({
					startedAt: new Date().toISOString(),
					durationMinutes: duration,
					interruptions: 0
				});
				stats = next;
				error = 'Saved locally. Connect database to sync with server.';
				activeSessionId = null;
				return;
			}
			appendLocalSession({
				startedAt: new Date().toISOString(),
				durationMinutes: duration,
				interruptions: 0
			});
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

<section class={`app-card p-5 ${className}`}>
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">Focus Timer</h2>
		<p class="text-xs text-text-secondary">Pomodoro + custom sessions</p>
	</div>

	{#if error}
		<p class="mt-3 rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-xs text-warning">{error}</p>
	{/if}

	<div class="mt-4 muted-panel p-4">
		<div class="mb-3 flex flex-wrap gap-2">
			{#each [15, 25, 30, 45, 60] as option}
				<button
					class={`rounded-full px-3 py-1.5 text-xs font-medium ${duration === option ? 'bg-primary text-on-primary' : 'border border-border bg-surface text-text-primary'}`}
					onclick={() => setDuration(option)}
					type="button"
				>
					{option}m
				</button>
			{/each}
		</div>

		<div class="grid place-items-center">
			<p class="text-5xl font-semibold text-text-primary">{timeText}</p>
			<div class="mt-4 h-2 w-full rounded-full bg-border">
				<div class="h-2 rounded-full bg-primary transition-all" style={`width:${progressPercentage}%`}></div>
			</div>
		</div>

		<div class="mt-4 flex gap-2">
			{#if !running}
				<button class="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50" disabled={loading} onclick={start} type="button">{loading ? 'Starting...' : 'Start'}</button>
			{:else}
				<button class="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50" disabled={loading} onclick={finish} type="button">{loading ? 'Ending...' : 'Finish session'}</button>
			{/if}
		</div>
	</div>

	<div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
		<div class="muted-panel p-3">
			<p class="text-xs text-text-secondary">Total Minutes</p>
			<p class="mt-1 text-lg font-semibold text-text-primary">{stats.totalMinutes}</p>
		</div>
		<div class="muted-panel p-3">
			<p class="text-xs text-text-secondary">Sessions</p>
			<p class="mt-1 text-lg font-semibold text-text-primary">{stats.totalSessions}</p>
		</div>
		<div class="muted-panel p-3">
			<p class="text-xs text-text-secondary">Average</p>
			<p class="mt-1 text-lg font-semibold text-text-primary">{stats.averageMinutes}m</p>
		</div>
	</div>
</section>
