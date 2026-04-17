<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { TaskItem, TaskStatusUi } from '$lib/stores/tasks';

	let { items = [] } = $props<{ items?: TaskItem[] }>();

	const dispatch = createEventDispatcher<{
		move: { id: string; status: TaskStatusUi; beforeId?: string | null };
		complete: string;
		delete: string;
		duplicate: string;
		edit: { id: string; title: string };
	}>();

	const columns: { key: TaskStatusUi; label: string }[] = [
		{ key: 'TODO', label: 'To Do' },
		{ key: 'IN_PROGRESS', label: 'In Progress' },
		{ key: 'DONE', label: 'Done' }
	];

	let draggingTaskId = $state<string | null>(null);
	function onDragStart(taskId: string) { draggingTaskId = taskId; }
	function onDropColumn(status: TaskStatusUi) {
		if (!draggingTaskId) return;
		dispatch('move', { id: draggingTaskId, status, beforeId: null });
		draggingTaskId = null;
	}
	function onDropCard(status: TaskStatusUi, beforeId: string) {
		if (!draggingTaskId || draggingTaskId === beforeId) return;
		dispatch('move', { id: draggingTaskId, status, beforeId });
		draggingTaskId = null;
	}
</script>

<div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
	{#each columns as column}
		<div aria-label={column.label} class="app-card p-3" ondragover={(event) => event.preventDefault()} ondrop={() => onDropColumn(column.key)} role="list">
			<h3 class="mb-3 text-sm font-semibold text-text-primary">{column.label}</h3>
			<div class="space-y-2">
				{#each items.filter((task: TaskItem) => task.status === column.key) as item (item.id)}
					<article class="muted-panel cursor-grab p-3" draggable="true" ondragover={(event) => event.preventDefault()} ondrop={() => onDropCard(column.key, item.id)} ondragstart={() => onDragStart(item.id)}>
						<p class="text-sm font-semibold text-text-primary">{item.title}</p>
						{#if item.description}<p class="mt-1 text-xs text-text-secondary">{item.description}</p>{/if}
						<div class="mt-2 flex flex-wrap gap-2">
							{#if item.status !== 'DONE'}
								<button class="rounded-full bg-primary px-2.5 py-1 text-xs text-on-primary" onclick={() => dispatch('complete', item.id)} type="button">Complete</button>
							{/if}
							<button class="rounded-full border border-border px-2.5 py-1 text-xs" onclick={() => dispatch('duplicate', item.id)} type="button">Duplicate</button>
							<button class="rounded-full border border-border px-2.5 py-1 text-xs" onclick={() => dispatch('edit', { id: item.id, title: item.title })} type="button">Edit</button>
							<button class="rounded-full bg-danger px-2.5 py-1 text-xs text-white" onclick={() => dispatch('delete', item.id)} type="button">Delete</button>
						</div>
					</article>
				{/each}
			</div>
		</div>
	{/each}
</div>
