<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { TaskPriorityUi } from '$lib/stores/tasks';

	const dispatch = createEventDispatcher<{
		create: {
			title: string;
			description: string | null;
			priority: TaskPriorityUi;
			dueDate: string | null;
		};
	}>();

	let title = $state('');
	let description = $state('');
	let priority = $state<TaskPriorityUi>('MEDIUM');
	let dueDate = $state('');

	function onSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!title.trim()) {
			return;
		}

		dispatch('create', {
			title: title.trim(),
			description: description.trim() || null,
			priority,
			dueDate: dueDate || null
		});

		title = '';
		description = '';
		priority = 'MEDIUM';
		dueDate = '';
	}
</script>

<form
	class="grid grid-cols-12 gap-3 rounded-[8px] border border-border bg-surface p-4"
	onsubmit={onSubmit}
>
	<input
		bind:value={title}
		class="col-span-4 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
		placeholder="Task title"
		required
		type="text"
	/>
	<input
		bind:value={description}
		class="col-span-4 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
		placeholder="Description (optional)"
		type="text"
	/>
	<select
		bind:value={priority}
		class="col-span-2 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
	>
		<option value="LOW">Low</option>
		<option value="MEDIUM">Medium</option>
		<option value="HIGH">High</option>
		<option value="URGENT">Urgent</option>
	</select>
	<input
		bind:value={dueDate}
		class="col-span-1 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
		type="date"
	/>
	<button
		class="col-span-1 rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
		type="submit"
	>
		Add
	</button>
</form>
