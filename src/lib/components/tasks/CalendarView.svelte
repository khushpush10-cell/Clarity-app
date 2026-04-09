<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { TaskItem } from '$lib/stores/tasks';

	let { items = [] } = $props<{ items?: TaskItem[] }>();

	const dispatch = createEventDispatcher<{
		complete: string;
		delete: string;
		duplicate: string;
		edit: { id: string; title: string };
		create: { title: string; dueDate: string | null };
		reschedule: { id: string; dueDate: string | null };
	}>();

	const grouped = $derived.by(() => {
		const map = new Map<string, TaskItem[]>();

		for (const item of items) {
			const key = item.dueDate ? new Date(item.dueDate).toDateString() : 'No due date';
			const current = map.get(key) ?? [];
			current.push(item);
			map.set(key, current);
		}

		return Array.from(map.entries()).sort((a, b) => {
			if (a[0] === 'No due date') return 1;
			if (b[0] === 'No due date') return -1;
			return new Date(a[0]).getTime() - new Date(b[0]).getTime();
		});
	});

	function createTaskForDay(day: string) {
		const title = (prompt('Task title') ?? '').trim();
		if (!title) return;

		const dueDate = day === 'No due date' ? null : new Date(day).toISOString();
		dispatch('create', { title, dueDate });
	}

	function shiftTaskByDays(item: TaskItem, offset: number) {
		const current = item.dueDate ? new Date(item.dueDate) : new Date();
		current.setDate(current.getDate() + offset);
		dispatch('reschedule', { id: item.id, dueDate: current.toISOString() });
	}

	function setTaskDate(item: TaskItem) {
		const current = item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '';
		const input = (prompt('Set date (YYYY-MM-DD)', current) ?? '').trim();
		if (!input) return;

		const parsed = new Date(`${input}T00:00:00.000Z`);
		if (Number.isNaN(parsed.getTime())) return;

		dispatch('reschedule', { id: item.id, dueDate: parsed.toISOString() });
	}

	function clearTaskDate(item: TaskItem) {
		dispatch('reschedule', { id: item.id, dueDate: null });
	}
</script>

<div class="space-y-4">
	{#if grouped.length === 0}
		<p class="rounded-[8px] border border-border bg-surface p-4 text-sm text-text-secondary">
			No tasks to display.
		</p>
	{:else}
		{#each grouped as [day, dayItems]}
			<section class="rounded-[8px] border border-border bg-surface p-4">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-sm font-semibold text-text-primary">{day}</h3>
					<button
						class="rounded-[8px] border border-border px-2 py-1 text-xs"
						onclick={() => createTaskForDay(day)}
						type="button"
					>
						Add task
					</button>
				</div>
				<div class="mt-3 space-y-2">
					{#each dayItems as item (item.id)}
						<article class="rounded-[8px] border border-border bg-background p-3">
							<p class="text-sm font-semibold text-text-primary">{item.title}</p>
							{#if item.description}
								<p class="mt-1 text-xs text-text-secondary">{item.description}</p>
							{/if}
							<div class="mt-2 flex flex-wrap gap-2">
								{#if item.status !== 'DONE'}
									<button
										class="rounded-[8px] bg-success px-2 py-1 text-xs text-white"
										onclick={() => dispatch('complete', item.id)}
										type="button"
									>
										Complete
									</button>
								{/if}
								<button
									class="rounded-[8px] border border-border px-2 py-1 text-xs"
									onclick={() => dispatch('duplicate', item.id)}
									type="button"
								>
									Duplicate
								</button>
								<button
									class="rounded-[8px] border border-border px-2 py-1 text-xs"
									onclick={() => dispatch('edit', { id: item.id, title: item.title })}
									type="button"
								>
									Edit
								</button>
								<button
									class="rounded-[8px] bg-urgent px-2 py-1 text-xs text-white"
									onclick={() => dispatch('delete', item.id)}
									type="button"
								>
									Delete
								</button>
								<button
									class="rounded-[8px] border border-border px-2 py-1 text-xs"
									onclick={() => shiftTaskByDays(item, -1)}
									type="button"
								>
									-1 day
								</button>
								<button
									class="rounded-[8px] border border-border px-2 py-1 text-xs"
									onclick={() => shiftTaskByDays(item, 1)}
									type="button"
								>
									+1 day
								</button>
								<button
									class="rounded-[8px] border border-border px-2 py-1 text-xs"
									onclick={() => setTaskDate(item)}
									type="button"
								>
									Set date
								</button>
								{#if item.dueDate}
									<button
										class="rounded-[8px] border border-border px-2 py-1 text-xs"
										onclick={() => clearTaskDate(item)}
										type="button"
									>
										Clear date
									</button>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>
