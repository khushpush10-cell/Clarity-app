<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { TaskItem, TaskStatusUi } from '$lib/stores/tasks';

	let { items = [], onMove, onComplete, onDelete, onDuplicate, onEdit } = $props<{
		items?: TaskItem[];
		onMove?: (payload: { id: string; status: TaskStatusUi; beforeId?: string | null }) => void | Promise<void>;
		onComplete?: (id: string) => void | Promise<void>;
		onDelete?: (id: string) => void | Promise<void>;
		onDuplicate?: (id: string) => void | Promise<void>;
		onEdit?: (payload: { id: string; title: string }) => void | Promise<void>;
	}>();

	const columns: { key: TaskStatusUi; label: string }[] = [
		{ key: 'TODO', label: 'To Do' },
		{ key: 'IN_PROGRESS', label: 'In Progress' },
		{ key: 'DONE', label: 'Done' }
	];

	let draggingTaskId = $state<string | null>(null);
	function onDragStart(taskId: string) { draggingTaskId = taskId; }
	async function onDropColumn(status: TaskStatusUi) {
		if (!draggingTaskId) return;
		await onMove?.({ id: draggingTaskId, status, beforeId: null });
		draggingTaskId = null;
	}
	async function onDropCard(status: TaskStatusUi, beforeId: string) {
		if (!draggingTaskId || draggingTaskId === beforeId) return;
		await onMove?.({ id: draggingTaskId, status, beforeId });
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
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#if item.status !== 'DONE'}
								<button aria-label="Complete task" class="grid h-8 w-8 place-items-center rounded-full bg-primary text-on-primary" onclick={() => onComplete?.(item.id)} type="button"><Icon name="check" size={14} /></button>
							{/if}
							<button aria-label="Duplicate task" class="grid h-8 w-8 place-items-center rounded-full border border-border" onclick={() => onDuplicate?.(item.id)} type="button"><Icon name="copy" size={14} /></button>
							<button aria-label="Edit task" class="grid h-8 w-8 place-items-center rounded-full border border-border" onclick={() => onEdit?.({ id: item.id, title: item.title })} type="button"><Icon name="edit" size={14} /></button>
							<button aria-label="Delete task" class="grid h-8 w-8 place-items-center rounded-full bg-danger text-white" onclick={() => onDelete?.(item.id)} type="button"><Icon name="trash" size={14} /></button>
						</div>
					</article>
				{/each}
			</div>
		</div>
	{/each}
</div>
