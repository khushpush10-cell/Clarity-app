<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
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

	const typeMeta = $derived.by(() => {
		const text = `${item.description ?? ''}`.toLowerCase();
		if (text.includes('type: habit')) return { label: 'Habit', icon: 'repeat' as const };
		if (text.includes('type: goal')) return { label: 'Goal', icon: 'target' as const };
		return { label: 'Task', icon: 'tasks' as const };
	});

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

<article class="app-card p-3">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-text-secondary">
					<Icon name={typeMeta.icon} size={14} />
				</span>
				<a class="truncate text-sm font-semibold text-text-primary hover:text-primary" href={`/tasks/${item.id}`}>{item.title}</a>
			</div>
			{#if item.description}
				<p class="mt-1 line-clamp-2 text-xs text-text-secondary">{item.description}</p>
			{/if}
			<div class="mt-2 flex flex-wrap gap-1.5 text-[11px]">
				<span class="rounded-full bg-surface-2 px-2 py-0.5 text-text-secondary">{typeMeta.label}</span>
				<span class="rounded-full bg-surface-2 px-2 py-0.5 text-text-secondary">{item.status}</span>
				<span class={`rounded-full px-2 py-0.5 ${priorityBadge[item.priority as keyof typeof priorityBadge]}`}>{item.priority}</span>
				{#if item.dueDate}
					<span class="rounded-full bg-surface-2 px-2 py-0.5 text-text-secondary">Due {new Date(item.dueDate).toLocaleDateString()}</span>
				{/if}
			</div>
		</div>

		<div class="relative flex shrink-0 items-center gap-1.5">
			{#if item.status !== 'DONE'}
				<button aria-label="Complete task" class="grid h-8 w-8 place-items-center rounded-full bg-primary text-on-primary" onclick={() => onComplete?.(item.id)} type="button"><Icon name="check" size={15} /></button>
			{/if}
			<button
				aria-expanded={menuOpen}
				aria-haspopup="menu"
				aria-label="Task actions"
				class="grid h-8 w-8 place-items-center rounded-full border border-border text-text-primary"
				onclick={() => (menuOpen = !menuOpen)}
				type="button"
			>
				<Icon name="more" size={15} />
			</button>
			{#if menuOpen}
				<div class="absolute right-0 top-9 z-20 flex rounded-full border border-border bg-surface p-1 shadow-lg" role="menu">
					<button aria-label="Edit task" class="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" onclick={editTitle} type="button"><Icon name="edit" size={14} /></button>
					<button aria-label="Duplicate task" class="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" onclick={duplicateTask} type="button"><Icon name="copy" size={14} /></button>
					<button aria-label="Delete task" class="grid h-8 w-8 place-items-center rounded-full text-warning hover:bg-warning-tint" onclick={deleteTask} type="button"><Icon name="trash" size={14} /></button>
				</div>
			{/if}
		</div>
	</div>
</article>
