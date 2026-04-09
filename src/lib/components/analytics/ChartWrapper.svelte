<script lang="ts">
	export interface ChartPoint {
		label: string;
		value: number;
		secondaryValue?: number;
	}

	let {
		title = 'Chart',
		points = [],
		primaryLabel = 'Primary',
		secondaryLabel = 'Secondary',
		className = ''
	} = $props<{
		title?: string;
		points?: ChartPoint[];
		primaryLabel?: string;
		secondaryLabel?: string;
		className?: string;
	}>();

	const maxValue = $derived.by(() => {
		const values = points.flatMap((point: ChartPoint) => [point.value, point.secondaryValue ?? 0]);
		const max = Math.max(...values, 1);
		return max;
	});
</script>

<section class={`rounded-[8px] border border-border bg-surface p-4 ${className}`}>
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold text-text-primary">{title}</h2>
		<div class="flex items-center gap-2 text-xs text-text-secondary">
			<span class="inline-flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-primary"></span>{primaryLabel}</span>
			<span class="inline-flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-secondary"></span>{secondaryLabel}</span>
		</div>
	</div>

	{#if points.length === 0}
		<p class="mt-3 text-sm text-text-secondary">No data yet.</p>
	{:else}
		<div class="mt-4 grid grid-cols-7 gap-2">
			{#each points as point (point.label)}
				<div class="flex flex-col items-center gap-1">
					<div class="flex h-28 items-end gap-1">
						<div
							class="w-3 rounded-t-[4px] bg-primary"
							style={`height:${Math.max(8, Math.round((point.value / maxValue) * 100))}%`}
						></div>
						<div
							class="w-3 rounded-t-[4px] bg-secondary"
							style={`height:${Math.max(8, Math.round(((point.secondaryValue ?? 0) / maxValue) * 100))}%`}
						></div>
					</div>
					<p class="text-[10px] text-text-secondary">{point.label}</p>
				</div>
			{/each}
		</div>
	{/if}
</section>
