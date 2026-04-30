<script lang="ts">
	import type { TaskPriorityUi } from '$lib/stores/tasks';

	type TaskCreatePayload = {
		title: string;
		description: string | null;
		priority: TaskPriorityUi;
		dueDate: string | null;
	};

	let { onCreate } = $props<{
		onCreate?: (payload: TaskCreatePayload) => void | Promise<void>;
	}>();

	let title = $state('');
	let description = $state('');
	let priority = $state<TaskPriorityUi>('MEDIUM');
	let dueDate = $state('');
	let recurrence = $state<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!title.trim()) return;
		await onCreate?.({
			title: title.trim(),
			description: description.trim() || null,
			priority,
			dueDate: dueDate || null
		});
		title = '';
		description = '';
		priority = 'MEDIUM';
		dueDate = '';
		recurrence = 'NONE';
	}
</script>

<form class="app-card grid grid-cols-1 gap-3 p-4 md:grid-cols-12" onsubmit={onSubmit}>
	<div class="md:col-span-4">
		<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-title">Task title</label>
		<input id="task-title" bind:value={title} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="Write a clear task" required type="text" />
	</div>
	<div class="md:col-span-4">
		<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-description">Notes</label>
		<input id="task-description" bind:value={description} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="Optional details" type="text" />
	</div>
	<div class="md:col-span-2">
		<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-priority">Priority</label>
		<select id="task-priority" bind:value={priority} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm">
			<option value="LOW">Low</option>
			<option value="MEDIUM">Medium</option>
			<option value="HIGH">High</option>
			<option value="URGENT">Urgent</option>
		</select>
	</div>
	<div class="md:col-span-1">
		<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-due-date">Due date</label>
		<input id="task-due-date" bind:value={dueDate} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" type="date" />
	</div>
	<div class="md:col-span-1 md:self-end">
		<button class="w-full rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary" type="submit">Add</button>
	</div>
	<div class="md:col-span-12">
		<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-recur">Recurring</label>
		<select id="task-recur" bind:value={recurrence} class="max-w-xs rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm">
			<option value="NONE">No repeat</option>
			<option value="DAILY">Daily</option>
			<option value="WEEKLY">Weekly</option>
			<option value="MONTHLY">Monthly</option>
		</select>
	</div>
</form>
