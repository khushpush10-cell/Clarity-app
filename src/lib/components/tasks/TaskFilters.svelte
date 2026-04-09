<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { TaskPriorityUi, TaskStatusUi } from '$lib/stores/tasks';

	const dispatch = createEventDispatcher<{
		search: string;
		status: TaskStatusUi | 'ALL';
		priority: TaskPriorityUi | 'ALL';
	}>();

	let search = $state('');
	let status = $state<TaskStatusUi | 'ALL'>('ALL');
	let priority = $state<TaskPriorityUi | 'ALL'>('ALL');

	function emitAll() {
		dispatch('search', search);
		dispatch('status', status);
		dispatch('priority', priority);
	}
</script>

<div class="grid grid-cols-12 gap-3 rounded-[8px] border border-border bg-surface p-4">
	<input
		bind:value={search}
		class="col-span-8 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
		oninput={emitAll}
		placeholder="Search by title or description"
		type="search"
	/>
	<select
		bind:value={status}
		class="col-span-2 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
		onchange={emitAll}
	>
		<option value="ALL">All status</option>
		<option value="TODO">To do</option>
		<option value="IN_PROGRESS">In progress</option>
		<option value="DONE">Done</option>
	</select>
	<select
		bind:value={priority}
		class="col-span-2 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
		onchange={emitAll}
	>
		<option value="ALL">All priority</option>
		<option value="LOW">Low</option>
		<option value="MEDIUM">Medium</option>
		<option value="HIGH">High</option>
		<option value="URGENT">Urgent</option>
	</select>
</div>
