<script lang="ts">
	import type { HabitLogItem } from '$lib/stores/habits';

	let { logs = [] } = $props<{ logs?: HabitLogItem[] }>();

	const dayMap = $derived.by(() => {
		const map = new Map<string, HabitLogItem>();
		for (const log of logs) {
			map.set(new Date(log.completedDate).toDateString(), log);
		}
		return map;
	});

	const days = $derived.by(() => {
		const arr: Date[] = [];
		const today = new Date();
		for (let i = 27; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(today.getDate() - i);
			arr.push(d);
		}
		return arr;
	});
</script>

<section class="app-card p-4">
	<h3 class="mb-3 text-sm font-semibold text-text-primary">Streak heatmap (28 days)</h3>
	<div class="grid grid-cols-14 gap-1">
		{#each days as day}
			{@const log = dayMap.get(day.toDateString())}
			<div
				class="h-4 w-4 rounded-[4px] border border-border"
				style={`background:${log ? 'color-mix(in srgb, var(--primary) 75%, var(--surface-2))' : 'var(--surface-2)'}`}
				title={`${day.toDateString()} ${log ? `(${log.count})` : ''}`}
			></div>
		{/each}
	</div>
</section>
