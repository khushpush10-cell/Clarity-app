<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { HabitItem } from '$lib/stores/habits';

	let { item } = $props<{ item: HabitItem }>();

	const dispatch = createEventDispatcher<{
		log: string;
		delete: string;
	}>();
</script>

<article class="rounded-[8px] border border-border bg-surface p-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="flex items-center gap-2">
				<span class="h-3 w-3 rounded-full" style={`background:${item.color}`}></span>
				<h3 class="text-base font-semibold text-text-primary">{item.name}</h3>
			</div>
			{#if item.description}
				<p class="mt-1 text-sm text-text-secondary">{item.description}</p>
			{/if}
			<div class="mt-2 flex gap-3 text-xs text-text-secondary">
				<span>Streak: {item.streakCurrent}</span>
				<span>Best: {item.streakBest}</span>
				<span>Target: {item.targetCount}</span>
			</div>
		</div>

		<div class="flex gap-2">
			<button
				class="rounded-[8px] bg-success px-3 py-1.5 text-xs font-semibold text-white"
				onclick={() => dispatch('log', item.id)}
				type="button"
			>
				Log today
			</button>
			<button
				class="rounded-[8px] bg-urgent px-3 py-1.5 text-xs font-semibold text-white"
				onclick={() => dispatch('delete', item.id)}
				type="button"
			>
				Delete
			</button>
		</div>
	</div>
</article>
