<script lang="ts">
	import type { TaskItem } from '$lib/stores/tasks';

	let { item, onComplete, onDelete, onDuplicate, onEdit } = $props<{
		item: TaskItem;
		onComplete?: (id: string) => void | Promise<void>;
		onDelete?: (id: string) => void | Promise<void>;
		onDuplicate?: (id: string) => void | Promise<void>;
		onEdit?: (payload: { id: string; title: string }) => void | Promise<void>;
	}>();

	let menuOpen = $state(false);

	const priorityBadge: Record<TaskItem['priority'], string> = {
		LOW: 'bg-surface-2 text-text-secondary',
		MEDIUM: 'bg-secondary-tint text-secondary',
		HIGH: 'bg-warning-tint text-warning',
		URGENT: 'bg-warning-tint text-warning font-semibold'
	};

	async function editTitle() {
		menuOpen = false;
		const nextTitle = prompt('Edit task title', item.title);
		if (nextTitle && nextTitle.trim() && nextTitle.trim() !== item.title) {
			await onEdit?.({ id: item.id, title: nextTitle.trim() });
		}
	}

	async function duplicateTask() {
		menuOpen = false;
		await onDuplicate?.(item.id);
	}

	async function deleteTask() {
		menuOpen = false;
		await onDelete?.(item.id);
	}
</script>

<article class="app-card p-4">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
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

		<div class="relative flex shrink-0 items-center gap-2">
			{#if item.status !== 'DONE'}
				<button class="rounded-full bg-primary px-3 py-1.5 text-xs text-on-primary" onclick={() => onComplete?.(item.id)} type="button">Complete</button>
			{/if}
			<button
				aria-expanded={menuOpen}
				aria-haspopup="menu"
				aria-label="Task actions"
				class="rounded-full border border-border px-3 py-1.5 text-xs"
				onclick={() => (menuOpen = !menuOpen)}
				type="button"
			>
				...
			</button>
			{#if menuOpen}
				<div class="absolute right-0 top-9 z-20 w-36 rounded-[14px] border border-border bg-surface p-1 shadow-lg" role="menu">
					<button class="block w-full rounded-[10px] px-3 py-2 text-left text-xs hover:bg-surface-2" onclick={editTitle} type="button">Edit</button>
					<button class="block w-full rounded-[10px] px-3 py-2 text-left text-xs hover:bg-surface-2" onclick={duplicateTask} type="button">Duplicate</button>
					<button class="block w-full rounded-[10px] px-3 py-2 text-left text-xs text-warning hover:bg-warning-tint" onclick={deleteTask} type="button">Delete</button>
				</div>
			{/if}
		</div>
	</div>
</article>
