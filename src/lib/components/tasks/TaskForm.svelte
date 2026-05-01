<script lang="ts">
	import type { TaskPriorityUi } from '$lib/stores/tasks';

	type TaskCreatePayload = {
		title: string;
		description: string | null;
		priority: TaskPriorityUi;
		dueDate: string | null;
	};

	let { onCreate, onCancel } = $props<{
		onCreate?: (payload: TaskCreatePayload) => void | Promise<void>;
		onCancel?: () => void;
	}>();

	let title = $state('');
	let description = $state('');
	let priority = $state<TaskPriorityUi>('MEDIUM');
	let dueDate = $state('');
	let recurrence = $state<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
	let showMore = $state(false);
	let saving = $state(false);

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!title.trim()) return;
		saving = true;
		try {
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
			showMore = false;
			onCancel?.();
		} finally {
			saving = false;
		}
	}
</script>

<div class="fixed inset-0 z-40 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4" role="presentation">
	<form class="w-full rounded-t-[24px] border border-border bg-surface p-5 shadow-xl sm:max-w-xl sm:rounded-[24px]" onsubmit={onSubmit}>
		<div class="mb-5 flex items-start justify-between gap-4">
			<div>
				<h2 class="text-2xl font-semibold text-text-primary">New task</h2>
				<p class="mt-1 text-sm text-text-secondary">Capture one clear action. Add details only when needed.</p>
			</div>
			<button class="rounded-full border border-border px-3 py-1.5 text-sm text-text-primary" onclick={onCancel} type="button">Close</button>
		</div>

		<div class="space-y-4">
			<div>
				<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-title">Task title</label>
				<input id="task-title" bind:value={title} class="w-full rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent" placeholder="Write a clear task" required type="text" />
			</div>

			<button class="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary" onclick={() => (showMore = !showMore)} type="button">
				{showMore ? 'Hide details' : 'More details'}
			</button>

			{#if showMore}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-description">Notes</label>
						<textarea id="task-description" bind:value={description} class="min-h-24 w-full rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent" placeholder="Optional details"></textarea>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-priority">Priority</label>
						<select id="task-priority" bind:value={priority} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent">
							<option value="LOW">Low</option>
							<option value="MEDIUM">Medium</option>
							<option value="HIGH">High</option>
							<option value="URGENT">Urgent</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-due-date">Due date</label>
						<input id="task-due-date" bind:value={dueDate} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent" type="date" />
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-recur">Recurring</label>
						<select id="task-recur" bind:value={recurrence} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent">
							<option value="NONE">No repeat</option>
							<option value="DAILY">Daily</option>
							<option value="WEEKLY">Weekly</option>
							<option value="MONTHLY">Monthly</option>
						</select>
					</div>
				</div>
			{/if}
		</div>

		<div class="mt-6 flex justify-end gap-2">
			<button class="rounded-full border border-border px-4 py-2 text-sm text-text-primary" onclick={onCancel} type="button">Cancel</button>
			<button class="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
				{saving ? 'Saving...' : 'Create task'}
			</button>
		</div>
	</form>
</div>
