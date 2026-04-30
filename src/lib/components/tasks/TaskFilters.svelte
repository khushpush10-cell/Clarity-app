<script lang="ts">
	import type { TaskPriorityUi, TaskStatusUi } from '$lib/stores/tasks';

	let { onSearch, onStatus, onPriority } = $props<{
		onSearch?: (value: string) => void | Promise<void>;
		onStatus?: (value: TaskStatusUi | 'ALL') => void | Promise<void>;
		onPriority?: (value: TaskPriorityUi | 'ALL') => void | Promise<void>;
	}>();

	let search = $state('');
	let status = $state<TaskStatusUi | 'ALL'>('ALL');
	let priority = $state<TaskPriorityUi | 'ALL'>('ALL');
	let showAdvanced = $state(false);

	async function emitAll() {
		await onSearch?.(search);
		await onStatus?.(status);
		await onPriority?.(priority);
	}
</script>

<div class="app-card p-4">
	<div class="grid grid-cols-1 gap-3 md:grid-cols-12">
		<div class="md:col-span-8">
			<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-search">Search</label>
			<input id="task-search" bind:value={search} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" oninput={emitAll} placeholder="Search by title or notes" type="search" />
		</div>
		<div class="md:col-span-4 md:self-end md:text-right">
			<button class="rounded-full border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary" onclick={() => (showAdvanced = !showAdvanced)} type="button">
				{showAdvanced ? 'Hide advanced filters' : 'Advanced filters'}
			</button>
		</div>
	</div>

	{#if showAdvanced}
		<div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
			<div>
				<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-status">Status</label>
				<select id="task-status" bind:value={status} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" onchange={emitAll}>
					<option value="ALL">All status</option>
					<option value="TODO">To do</option>
					<option value="IN_PROGRESS">In progress</option>
					<option value="DONE">Done</option>
				</select>
			</div>
			<div>
				<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-priority">Priority</label>
				<select id="task-priority" bind:value={priority} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" onchange={emitAll}>
					<option value="ALL">All priority</option>
					<option value="LOW">Low</option>
					<option value="MEDIUM">Medium</option>
					<option value="HIGH">High</option>
					<option value="URGENT">Urgent</option>
				</select>
			</div>
		</div>
	{/if}
</div>
