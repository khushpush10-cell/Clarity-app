<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { TaskItem } from '$lib/stores/tasks';

	let { items = [] } = $props<{ items?: TaskItem[] }>();

	const dispatch = createEventDispatcher<{
		complete: string;
		delete: string;
		duplicate: string;
		edit: { id: string; title: string };
		create: { title: string; dueDate: string | null };
		reschedule: { id: string; dueDate: string | null };
	}>();

	let mode = $state<'day' | 'week' | 'month'>('month');

	const grouped = $derived.by(() => {
		const map = new Map<string, TaskItem[]>();
		for (const item of items) {
			const key = item.dueDate ? new Date(item.dueDate).toDateString() : 'Unscheduled';
			const current = map.get(key) ?? [];
			current.push(item);
			map.set(key, current);
		}
		return Array.from(map.entries()).sort((a, b) => {
			if (a[0] === 'Unscheduled') return 1;
			if (b[0] === 'Unscheduled') return -1;
			return new Date(a[0]).getTime() - new Date(b[0]).getTime();
		});
	});

	function createTaskForDay(day: string) {
		const title = (prompt('Task title') ?? '').trim();
		if (!title) return;
		const dueDate = day === 'Unscheduled' ? null : new Date(day).toISOString();
		dispatch('create', { title, dueDate });
	}

	function shiftTaskByDays(item: TaskItem, offset: number) {
		const current = item.dueDate ? new Date(item.dueDate) : new Date();
		current.setDate(current.getDate() + offset);
		dispatch('reschedule', { id: item.id, dueDate: current.toISOString() });
	}
</script>

<div class="space-y-3">
	<div class="inline-flex rounded-full border border-border bg-surface p-1 text-sm">
		{#each ['day', 'week', 'month'] as option}
			<button class={`rounded-full px-3 py-1 ${mode === option ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} onclick={() => (mode = option as 'day' | 'week' | 'month')} type="button">{option[0]?.toUpperCase() + option.slice(1)}</button>
		{/each}
	</div>

	{#if grouped.length === 0}
		<div class="empty-state">
			<p class="text-sm">No tasks scheduled yet.</p>
			<div class="mt-3 flex gap-2">
				<button class="rounded-full bg-primary px-3 py-1.5 text-xs text-on-primary" onclick={() => createTaskForDay(new Date().toDateString())} type="button">Add your first task</button>
			</div>
		</div>
	{:else}
		{#each grouped as [day, dayItems]}
			<section class="app-card p-4">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-sm font-semibold text-text-primary">{day}</h3>
					<button class="rounded-full border border-border px-2.5 py-1 text-xs" onclick={() => createTaskForDay(day)} type="button">Add task</button>
				</div>
				<div class="mt-3 space-y-2">
					{#each dayItems as item (item.id)}
						<article class="muted-panel p-3">
							<p class="text-sm font-semibold text-text-primary">{item.title}</p>
							{#if item.description}<p class="mt-1 text-xs text-text-secondary">{item.description}</p>{/if}
							<div class="mt-2 flex flex-wrap gap-2">
								{#if item.status !== 'DONE'}
									<button class="rounded-full bg-primary px-2 py-1 text-xs text-on-primary" onclick={() => dispatch('complete', item.id)} type="button">Complete</button>
								{/if}
								<button class="rounded-full border border-border px-2 py-1 text-xs" onclick={() => dispatch('duplicate', item.id)} type="button">Duplicate</button>
								<button class="rounded-full border border-border px-2 py-1 text-xs" onclick={() => dispatch('edit', { id: item.id, title: item.title })} type="button">Edit</button>
								<button class="rounded-full bg-danger px-2 py-1 text-xs text-white" onclick={() => dispatch('delete', item.id)} type="button">Delete</button>
								<button class="rounded-full border border-border px-2 py-1 text-xs" onclick={() => shiftTaskByDays(item, -1)} type="button">-1d</button>
								<button class="rounded-full border border-border px-2 py-1 text-xs" onclick={() => shiftTaskByDays(item, 1)} type="button">+1d</button>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>
