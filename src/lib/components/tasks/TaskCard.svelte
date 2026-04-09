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

	const priorityClass: Record<TaskItem['priority'], string> = {
		LOW: 'text-secondary',
		MEDIUM: 'text-warning',
		HIGH: 'text-urgent',
		URGENT: 'text-urgent font-semibold'
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

<article class="rounded-[8px] border border-border bg-surface p-4" oncontextmenu={onContextMenu}>
	<div class="flex items-start justify-between gap-4">
		<div>
			<a class="text-base font-semibold text-text-primary hover:text-primary" href={`/tasks/${item.id}`}>{item.title}</a>
			{#if item.description}
				<p class="mt-1 text-sm text-text-secondary">{item.description}</p>
			{/if}
			<div class="mt-2 flex gap-3 text-xs">
				<span class="rounded-[8px] bg-background px-2 py-1 text-text-secondary">{item.status}</span>
				<span class={priorityClass[item.priority as keyof typeof priorityClass]}>{item.priority}</span>
				{#if item.dueDate}
					<span class="text-text-secondary">Due: {new Date(item.dueDate).toLocaleDateString()}</span>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap justify-end gap-2">
			<button
				class="rounded-[8px] border border-border px-2 py-1 text-xs hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]"
				onclick={editTitle}
				type="button"
			>
				Edit
			</button>
			<button
				class="rounded-[8px] border border-border px-2 py-1 text-xs hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]"
				onclick={() => dispatch('duplicate', item.id)}
				type="button"
			>
				Duplicate
			</button>
			{#if item.status !== 'DONE'}
				<button
					class="rounded-[8px] bg-success px-2 py-1 text-xs text-white hover:opacity-90"
					onclick={() => dispatch('complete', item.id)}
					type="button"
				>
					Complete
				</button>
			{/if}
			<button
				class="rounded-[8px] bg-urgent px-2 py-1 text-xs text-white hover:opacity-90"
				onclick={() => dispatch('delete', item.id)}
				type="button"
			>
				Delete
			</button>
		</div>
	</div>
</article>
