<script lang="ts">
	export interface WorkloadItem {
		member: string;
		total: number;
		done: number;
		inProgress: number;
	}

	let { items = [], className = '' } = $props<{ items?: WorkloadItem[]; className?: string }>();
</script>

<section class={`app-card p-4 ${className}`}>
	<h2 class="text-sm font-semibold text-text-primary">Workload Overview</h2>
	{#if items.length === 0}
		<div class="empty-state mt-3"><p class="text-sm">No workload data yet.</p></div>
	{:else}
		<div class="mt-3 space-y-2">
			{#each items as item (item.member)}
				<div class="muted-panel p-3">
					<div class="mb-2 flex items-center justify-between"><p class="text-sm font-medium text-text-primary">{item.member}</p><p class="text-xs text-text-secondary">{item.done}/{item.total} done</p></div>
					<div class="h-2 rounded-full bg-border"><div class="h-2 rounded-full bg-primary" style={`width:${item.total ? Math.round((item.done / item.total) * 100) : 0}%`}></div></div>
					<div class="mt-2 flex justify-between text-xs text-text-secondary"><span>Total: {item.total}</span><span>In Progress: {item.inProgress}</span></div>
				</div>
			{/each}
		</div>
	{/if}
</section>
