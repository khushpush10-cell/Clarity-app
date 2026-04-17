<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import ProgressBar from '$lib/components/goals/ProgressBar.svelte';

	export interface GoalItem {
		id: string;
		title: string;
		description: string | null;
		targetMetric: string;
		currentValue: number;
		targetValue: number;
		progressPercentage: number;
		deadline: string | null;
		color: string;
	}

	let { item, className = '' } = $props<{ item: GoalItem; className?: string }>();

	const dispatch = createEventDispatcher<{ update: { id: string; currentValue: number }; delete: string }>();
	const deadlineLabel = $derived.by(() => (!item.deadline ? 'No deadline' : new Date(item.deadline).toLocaleDateString()));
</script>

<section class={`app-card p-4 ${className}`}>
	<div class="flex items-start justify-between gap-3">
		<div>
			<h2 class="text-base font-semibold text-text-primary">{item.title}</h2>
			{#if item.description}<p class="mt-1 text-sm text-text-secondary">{item.description}</p>{/if}
		</div>
		<span class="rounded-full px-2 py-1 text-xs font-semibold" style={`background: color-mix(in srgb, ${item.color} 22%, var(--surface-2)); color:${item.color};`}>
			{item.targetMetric}
		</span>
	</div>

	<div class="mt-3">
		<ProgressBar value={item.progressPercentage} />
		<div class="mt-2 flex items-center justify-between text-xs text-text-secondary">
			<span>{item.currentValue} / {item.targetValue}</span>
			<span>{item.progressPercentage}%</span>
		</div>
	</div>

	<div class="mt-3 flex items-center justify-between text-xs text-text-secondary">
		<p>Deadline: {deadlineLabel}</p>
		<div class="flex gap-2">
			<button class="rounded-full border border-border px-2 py-1 text-text-primary" onclick={() => dispatch('update', { id: item.id, currentValue: item.currentValue + 1 })} type="button">+1</button>
			<button class="rounded-full bg-danger px-2 py-1 text-white" onclick={() => dispatch('delete', item.id)} type="button">Delete</button>
		</div>
	</div>
</section>
