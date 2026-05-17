<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { TaskPriorityUi } from '$lib/stores/tasks';

	type TaskKind = 'task' | 'habit' | 'goal';
	type TaskCreatePayload = {
		title: string;
		description: string | null;
		priority: TaskPriorityUi;
		dueDate: string | null;
		kind?: TaskKind;
		recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
		goalMetric?: string;
		goalTarget?: number;
		checkInEmoji?: string;
	};

	let { onCreate, onCancel } = $props<{
		onCreate?: (payload: TaskCreatePayload) => void | Promise<void>;
		onCancel?: () => void;
	}>();

	let title = $state('');
	let description = $state('');
	let kind = $state<TaskKind>('task');
	let priority = $state<TaskPriorityUi>('MEDIUM');
	let dueDate = $state('');
	let recurrence = $state<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
	let goalMetric = $state('sessions');
	let goalTarget = $state(10);
	let checkInEmoji = $state('🙂');
	let showMore = $state(false);
	let saving = $state(false);

	const taskKinds: Array<{ key: TaskKind; label: string; icon: 'tasks' | 'repeat' | 'target' }> = [
		{ key: 'task', label: 'Task', icon: 'tasks' },
		{ key: 'habit', label: 'Habit', icon: 'repeat' },
		{ key: 'goal', label: 'Goal', icon: 'target' }
	];
	const emojiOptions = ['🙂', '🔥', '✅'];

	function buildDescription() {
		const meta = [`Type: ${kind}`];
		if (kind === 'habit') {
			meta.push(`Repeat: ${recurrence.toLowerCase()}`, `Check-in: ${checkInEmoji}`);
		}
		if (kind === 'goal') {
			meta.push(`Metric: ${goalMetric}`, `Target: ${goalTarget}`);
		}
		const note = description.trim();
		return [note, meta.join(' | ')].filter(Boolean).join('\n\n');
	}

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!title.trim()) return;
		saving = true;
		try {
			await onCreate?.({
				title: title.trim(),
				description: buildDescription() || null,
				priority,
				dueDate: dueDate || null,
				kind,
				recurrence,
				goalMetric,
				goalTarget,
				checkInEmoji
			});
			title = '';
			description = '';
			kind = 'task';
			priority = 'MEDIUM';
			dueDate = '';
			recurrence = 'NONE';
			goalMetric = 'sessions';
			goalTarget = 10;
			checkInEmoji = '🙂';
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
				<p class="mt-1 text-sm text-text-secondary">Capture a task, habit, or goal in one place.</p>
			</div>
			<button aria-label="Close" class="grid h-9 w-9 place-items-center rounded-full border border-border text-text-primary" onclick={onCancel} type="button"><Icon name="x" size={16} /></button>
		</div>

		<div class="space-y-4">
			<div class="inline-flex rounded-full border border-border bg-surface-2 p-1">
				{#each taskKinds as option}
					<button
						aria-label={`Create ${option.label}`}
						class={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${kind === option.key ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`}
						onclick={() => (kind = option.key)}
						type="button"
					>
						<Icon name={option.icon} size={14} />
						<span>{option.label}</span>
					</button>
				{/each}
			</div>

			<div>
				<label class="mb-1 block text-xs font-medium text-text-secondary" for="task-title">Task title</label>
				<input id="task-title" bind:value={title} class="w-full rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent" placeholder="Write a clear task" required type="text" />
			</div>

			<button aria-label={showMore ? 'Hide details' : 'Show details'} class="inline-grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-text-primary" onclick={() => (showMore = !showMore)} type="button">
				<Icon name="chevron-down" size={16} />
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
					{#if kind === 'habit'}
						<div>
							<p class="mb-1 text-xs font-medium text-text-secondary">Habit emoji</p>
							<div class="flex gap-2">
								{#each emojiOptions as emoji}
									<button class={`grid h-10 w-10 place-items-center rounded-full border text-base ${checkInEmoji === emoji ? 'border-secondary bg-secondary-tint' : 'border-border bg-surface-2'}`} onclick={() => (checkInEmoji = emoji)} type="button">{emoji}</button>
								{/each}
							</div>
						</div>
					{/if}
					{#if kind === 'goal'}
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary" for="goal-metric">Goal metric</label>
							<input id="goal-metric" bind:value={goalMetric} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent" type="text" />
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-text-secondary" for="goal-target">Goal target</label>
							<input id="goal-target" bind:value={goalTarget} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent" min="1" type="number" />
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="mt-6 flex justify-end gap-2">
			<button aria-label="Cancel" class="grid h-10 w-10 place-items-center rounded-full border border-border text-text-primary" onclick={onCancel} type="button"><Icon name="x" size={16} /></button>
			<button aria-label="Create task" class="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-60" disabled={saving} type="submit">
				<Icon name="check" size={17} />
			</button>
		</div>
	</form>
</div>
