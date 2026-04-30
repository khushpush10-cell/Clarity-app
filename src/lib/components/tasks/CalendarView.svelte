<script lang="ts">
	import type { TaskItem } from '$lib/stores/tasks';

	let {
		items = [],
		onComplete,
		onDelete,
		onDuplicate,
		onEdit,
		onCreate,
		onReschedule
	} = $props<{
		items?: TaskItem[];
		onComplete?: (id: string) => void | Promise<void>;
		onDelete?: (id: string) => void | Promise<void>;
		onDuplicate?: (id: string) => void | Promise<void>;
		onEdit?: (payload: { id: string; title: string }) => void | Promise<void>;
		onCreate?: (payload: { title: string; dueDate: string | null }) => void | Promise<void>;
		onReschedule?: (payload: { id: string; dueDate: string | null }) => void | Promise<void>;
	}>();

	type CalendarMode = 'day' | 'week' | 'month';

	const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let mode = $state<CalendarMode>('month');
	let cursor = $state(new Date());
	let selectedDate = $state(startOfDay(new Date()));
	let dragTaskId = $state<string | null>(null);
	let dragOverKey = $state<string | null>(null);

	const tasksByDate = $derived.by(() => {
		const map = new Map<string, TaskItem[]>();
		for (const item of items) {
			if (!item.dueDate) continue;
			const key = toDateKey(new Date(item.dueDate));
			const bucket = map.get(key) ?? [];
			bucket.push(item);
			map.set(key, bucket);
		}
		for (const [key, bucket] of map.entries()) {
			map.set(
				key,
				bucket.sort((a, b) => {
					const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
					const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
					return aTime - bTime;
				})
			);
		}
		return map;
	});

	const unscheduledTasks = $derived.by(() =>
		items.filter((item: TaskItem) => !item.dueDate)
	);
	const monthCells = $derived.by(() => buildMonthCells(cursor));
	const weekDays = $derived.by(() => buildWeekDays(cursor));

	const selectedTasks = $derived.by(() => {
		const key = toDateKey(selectedDate);
		return tasksByDate.get(key) ?? [];
	});

	const monthTitle = $derived.by(() =>
		cursor.toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		})
	);

	function startOfDay(value: Date) {
		const date = new Date(value);
		date.setHours(0, 0, 0, 0);
		return date;
	}

	function toDateKey(date: Date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function fromDateKey(key: string) {
		const parts = key.split('-').map((chunk) => Number(chunk));
		const year = Number.isFinite(parts[0]) ? (parts[0] as number) : 1970;
		const month = Number.isFinite(parts[1]) ? (parts[1] as number) : 1;
		const day = Number.isFinite(parts[2]) ? (parts[2] as number) : 1;
		return new Date(year, month - 1, day);
	}

	function toIsoAtNoon(date: Date) {
		const noon = new Date(date);
		noon.setHours(12, 0, 0, 0);
		return noon.toISOString();
	}

	function buildMonthCells(baseDate: Date) {
		const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
		const firstWeekday = (first.getDay() + 6) % 7;
		const start = new Date(first);
		start.setDate(first.getDate() - firstWeekday);

		const cells: Array<{ date: Date; key: string; inMonth: boolean }> = [];
		for (let i = 0; i < 42; i += 1) {
			const date = new Date(start);
			date.setDate(start.getDate() + i);
			cells.push({ date, key: toDateKey(date), inMonth: date.getMonth() === baseDate.getMonth() });
		}
		return cells;
	}

	function buildWeekDays(baseDate: Date) {
		const day = startOfDay(baseDate);
		const weekday = (day.getDay() + 6) % 7;
		const monday = new Date(day);
		monday.setDate(day.getDate() - weekday);

		const days: Date[] = [];
		for (let i = 0; i < 7; i += 1) {
			const date = new Date(monday);
			date.setDate(monday.getDate() + i);
			days.push(date);
		}
		return days;
	}

	function isToday(date: Date) {
		return toDateKey(date) === toDateKey(new Date());
	}

	function isSelected(date: Date) {
		return toDateKey(date) === toDateKey(selectedDate);
	}

	function goToday() {
		cursor = startOfDay(new Date());
		selectedDate = startOfDay(new Date());
	}

	function shiftCursor(direction: -1 | 1) {
		const next = new Date(cursor);
		if (mode === 'month') next.setMonth(next.getMonth() + direction);
		if (mode === 'week') next.setDate(next.getDate() + direction * 7);
		if (mode === 'day') next.setDate(next.getDate() + direction);
		cursor = next;
	}

	function selectDate(date: Date) {
		selectedDate = startOfDay(date);
		if (mode === 'month' && (date.getMonth() !== cursor.getMonth() || date.getFullYear() !== cursor.getFullYear())) {
			cursor = startOfDay(date);
		}
	}

	async function createForDate(date: Date) {
		const title = (prompt('Task title') ?? '').trim();
		if (!title) return;
		await onCreate?.({ title, dueDate: toIsoAtNoon(date) });
	}

	function handleDragStart(id: string) {
		dragTaskId = id;
	}

	function handleDragEnd() {
		dragTaskId = null;
		dragOverKey = null;
	}

	function allowDrop(event: DragEvent, dateKey: string) {
		event.preventDefault();
		dragOverKey = dateKey;
	}

	async function onDropDate(event: DragEvent, dateKey: string) {
		event.preventDefault();
		if (!dragTaskId) return;
		await onReschedule?.({ id: dragTaskId, dueDate: toIsoAtNoon(fromDateKey(dateKey)) });
		handleDragEnd();
	}

	async function unscheduleTask(id: string) {
		await onReschedule?.({ id, dueDate: null });
	}

	function priorityClass(priority: TaskItem['priority']) {
		if (priority === 'URGENT' || priority === 'HIGH') return 'border-attention bg-attention-tint text-warning';
		if (priority === 'MEDIUM') return 'border-secondary bg-secondary-tint text-secondary';
		return 'border-border bg-surface-2 text-text-secondary';
	}
</script>

<div class="space-y-4">
	<div class="app-card p-3 md:p-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="inline-flex rounded-full border border-border bg-surface p-1 text-sm">
				{#each ['day', 'week', 'month'] as option}
					<button
						class={`rounded-full px-3 py-1.5 ${mode === option ? 'bg-secondary-tint text-secondary' : 'text-text-secondary hover:bg-surface-2'}`}
						onclick={() => (mode = option as CalendarMode)}
						type="button"
					>
						{option[0]?.toUpperCase() + option.slice(1)}
					</button>
				{/each}
			</div>

			<div class="flex items-center gap-2">
				<button class="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs" onclick={() => shiftCursor(-1)} type="button">Prev</button>
				<button class="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs" onclick={goToday} type="button">Today</button>
				<button class="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs" onclick={() => shiftCursor(1)} type="button">Next</button>
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-lg font-semibold text-text-primary">{monthTitle}</h3>
			<button class="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-on-primary" onclick={() => createForDate(selectedDate)} type="button">Add task on selected date</button>
		</div>
	</div>

	{#if mode === 'month'}
		<div class="app-card overflow-hidden">
			<div class="grid grid-cols-7 border-b border-border bg-surface-2">
				{#each weekdayLabels as label}
					<div class="px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">{label}</div>
				{/each}
			</div>
			<div class="grid grid-cols-7">
				{#each monthCells as cell}
					<button
						class={`min-h-28 border-r border-b border-border p-2 text-left align-top transition ${!cell.inMonth ? 'bg-surface-2/70 text-text-secondary' : 'bg-surface'} ${isSelected(cell.date) ? 'ring-2 ring-secondary ring-inset' : ''} ${dragOverKey === cell.key ? 'bg-secondary-tint' : ''}`}
						onclick={() => selectDate(cell.date)}
						ondragover={(event) => allowDrop(event, cell.key)}
						ondragleave={() => (dragOverKey = null)}
						ondrop={(event) => onDropDate(event, cell.key)}
						type="button"
					>
						<div class="mb-1 flex items-center justify-between">
							<span class={`text-xs font-medium ${isToday(cell.date) ? 'rounded-full bg-secondary-tint px-2 py-0.5 text-secondary' : ''}`}>{cell.date.getDate()}</span>
							{#if (tasksByDate.get(cell.key)?.length ?? 0) > 0}
								<span class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-on-primary">{tasksByDate.get(cell.key)?.length}</span>
							{/if}
						</div>
						<div class="space-y-1">
							{#each (tasksByDate.get(cell.key) ?? []).slice(0, 3) as task (task.id)}
								<div class={`rounded-full border px-2 py-0.5 text-[11px] ${task.status === 'DONE' ? 'border-primary bg-primary text-on-primary' : priorityClass(task.priority)}`} draggable="true" ondragstart={() => handleDragStart(task.id)} ondragend={handleDragEnd} role="listitem">{task.title}</div>
							{/each}
						</div>
					</button>
				{/each}
			</div>
		</div>
	{:else if mode === 'week'}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
			{#each weekDays as day}
				{@const key = toDateKey(day)}
				<div
					class={`app-card p-3 ${isSelected(day) ? 'ring-2 ring-secondary' : ''} ${dragOverKey === key ? 'bg-secondary-tint' : ''}`}
					ondragover={(event) => allowDrop(event, key)}
					ondragleave={() => (dragOverKey = null)}
					ondrop={(event) => onDropDate(event, key)}
					role="region"
				>
					<button class="w-full text-left" onclick={() => selectDate(day)} type="button">
						<p class="text-xs uppercase tracking-[0.06em] text-text-secondary">{day.toLocaleDateString(undefined, { weekday: 'long' })}</p>
						<p class="mt-1 text-sm font-semibold text-text-primary">{day.toLocaleDateString()}</p>
					</button>
					<div class="mt-3 space-y-2">
						{#if (tasksByDate.get(key)?.length ?? 0) === 0}
							<p class="text-xs text-text-secondary">No tasks</p>
						{:else}
							{#each tasksByDate.get(key) ?? [] as task (task.id)}
								<div class={`rounded-[12px] border px-2.5 py-2 text-xs ${task.status === 'DONE' ? 'border-primary bg-primary text-on-primary' : priorityClass(task.priority)}`} draggable="true" ondragstart={() => handleDragStart(task.id)} ondragend={handleDragEnd} role="listitem">{task.title}</div>
							{/each}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="app-card p-4">
			<p class="text-xs uppercase tracking-[0.06em] text-text-secondary">Selected day</p>
			<p class="mt-1 text-lg font-semibold text-text-primary">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
			<div class="mt-3 space-y-2">
				{#if selectedTasks.length === 0}
					<div class="empty-state">
						<p class="text-sm">No tasks scheduled on this day.</p>
						<button class="mt-2 rounded-full bg-primary px-3 py-1.5 text-xs text-on-primary" onclick={() => createForDate(selectedDate)} type="button">Add a task</button>
					</div>
				{:else}
					{#each selectedTasks as task (task.id)}
						<article class="muted-panel p-3" draggable="true" ondragstart={() => handleDragStart(task.id)} ondragend={handleDragEnd}>
							<div class="flex flex-wrap items-start justify-between gap-2">
								<div>
									<p class="text-sm font-semibold text-text-primary">{task.title}</p>
									{#if task.description}<p class="mt-1 text-xs text-text-secondary">{task.description}</p>{/if}
								</div>
								<span class={`rounded-full border px-2 py-0.5 text-[11px] ${task.status === 'DONE' ? 'border-primary bg-primary text-on-primary' : priorityClass(task.priority)}`}>{task.status === 'DONE' ? 'Completed' : task.priority}</span>
							</div>
							<div class="mt-3 flex flex-wrap gap-2">
								{#if task.status !== 'DONE'}
									<button class="rounded-full bg-primary px-2.5 py-1 text-xs text-on-primary" onclick={() => onComplete?.(task.id)} type="button">Complete</button>
								{/if}
								<button class="rounded-full border border-border px-2.5 py-1 text-xs" onclick={() => onEdit?.({ id: task.id, title: task.title })} type="button">Edit</button>
								<button class="rounded-full border border-border px-2.5 py-1 text-xs" onclick={() => onDuplicate?.(task.id)} type="button">Duplicate</button>
								<button class="rounded-full border border-border px-2.5 py-1 text-xs" onclick={() => unscheduleTask(task.id)} type="button">Unschedule</button>
								<button class="rounded-full bg-danger px-2.5 py-1 text-xs text-white" onclick={() => onDelete?.(task.id)} type="button">Delete</button>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<div class="app-card p-4">
		<div class="flex items-center justify-between gap-2">
			<p class="text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Unscheduled tasks</p>
			<p class="text-xs text-text-secondary">Drag onto calendar to schedule</p>
		</div>
		{#if unscheduledTasks.length === 0}
			<p class="mt-2 text-sm text-text-secondary">No unscheduled tasks.</p>
		{:else}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each unscheduledTasks as task (task.id)}
					<div class={`rounded-full border px-3 py-1.5 text-xs ${priorityClass(task.priority)}`} draggable="true" ondragstart={() => handleDragStart(task.id)} ondragend={handleDragEnd} role="listitem">{task.title}</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
