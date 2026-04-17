<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { HabitItem } from '$lib/stores/habits';

	let { item } = $props<{ item: HabitItem }>();

	const dispatch = createEventDispatcher<{ log: string; delete: string }>();
</script>

<article class="app-card p-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="flex items-center gap-2">
				<span class="h-3 w-3 rounded-full" style={`background:${item.color}`}></span>
				<h3 class="text-base font-semibold text-text-primary">{item.name}</h3>
			</div>
			{#if item.description}<p class="mt-1 text-sm text-text-secondary">{item.description}</p>{/if}
			<div class="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
				<span class="rounded-full bg-surface-2 px-2 py-1">Streak {item.streakCurrent}</span>
				<span class="rounded-full bg-surface-2 px-2 py-1">Best {item.streakBest}</span>
				<span class="rounded-full bg-surface-2 px-2 py-1">Target {item.targetCount}</span>
			</div>
		</div>

		<div class="flex gap-2">
			<button class="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary" onclick={() => dispatch('log', item.id)} type="button">Log today</button>
			<button class="rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white" onclick={() => dispatch('delete', item.id)} type="button">Delete</button>
		</div>
	</div>
</article>
