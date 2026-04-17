<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { TaskItem } from '$lib/stores/tasks';

	let { item } = $props<{ item: TaskItem }>();

	const dispatch = createEventDispatcher<{
		complete: string;
		delete: string;
		duplicate: string;
		edit: { id: string; title: string };
	}>();

	const priorityBadge: Record<TaskItem['priority'], string> = {
		LOW: 'bg-surface-2 text-text-secondary',
		MEDIUM: 'bg-secondary-tint text-secondary',
		HIGH: 'bg-warning-tint text-warning',
		URGENT: 'bg-warning-tint text-warning font-semibold'
	};

	function editTitle() {
		const nextTitle = prompt('Edit task title', item.title);
		if (nextTitle && nextTitle.trim() && nextTitle.trim() !== item.title) {
			dispatch('edit', { id: item.id, title: nextTitle.trim() });
		}
	}

	function onContextMenu(event: MouseEvent) {
		event.preventDefault();
		const action = prompt('Action: complete | duplicate | edit | delete', 'complete')?.trim().toLowerCase();
		if (!action) return;
		if (action === 'complete') dispatch('complete', item.id);
		if (action === 'duplicate') dispatch('duplicate', item.id);
		if (action === 'edit') editTitle();
		if (action === 'delete') dispatch('delete', item.id);
	}
</script>

<article class="app-card p-4" oncontextmenu={onContextMenu}>
	<div class="flex items-start justify-between gap-4">
		<div>
			<a class="text-base font-semibold text-text-primary hover:text-primary" href={`/tasks/${item.id}`}>{item.title}</a>
			{#if item.description}
				<p class="mt-1 text-sm text-text-secondary">{item.description}</p>
			{/if}
			<div class="mt-2 flex flex-wrap gap-2 text-xs">
				<span class="rounded-full bg-surface-2 px-2 py-1 text-text-secondary">{item.status}</span>
				<span class={`rounded-full px-2 py-1 ${priorityBadge[item.priority as keyof typeof priorityBadge]}`}>{item.priority}</span>
				{#if item.dueDate}
					<span class="rounded-full bg-surface-2 px-2 py-1 text-text-secondary">Due {new Date(item.dueDate).toLocaleDateString()}</span>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap justify-end gap-2">
			<button class="rounded-full border border-border px-3 py-1.5 text-xs" onclick={editTitle} type="button">Edit</button>
			<button class="rounded-full border border-border px-3 py-1.5 text-xs" onclick={() => dispatch('duplicate', item.id)} type="button">Duplicate</button>
			{#if item.status !== 'DONE'}
				<button class="rounded-full bg-primary px-3 py-1.5 text-xs text-on-primary" onclick={() => dispatch('complete', item.id)} type="button">Complete</button>
			{/if}
			<button class="rounded-full bg-danger px-3 py-1.5 text-xs text-white" onclick={() => dispatch('delete', item.id)} type="button">Delete</button>
		</div>
	</div>
</article>
