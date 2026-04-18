<script lang="ts">
	import { onMount } from 'svelte';

	import CalendarView from '$lib/components/tasks/CalendarView.svelte';
	import KanbanBoard from '$lib/components/tasks/KanbanBoard.svelte';
	import TaskCard from '$lib/components/tasks/TaskCard.svelte';
	import TaskFilters from '$lib/components/tasks/TaskFilters.svelte';
	import TaskForm from '$lib/components/tasks/TaskForm.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { tasks, type TaskItem, type TaskPriorityUi, type TaskStatusUi } from '$lib/stores/tasks';
	import { apiRequest } from '$lib/utils/http';

	interface FilterPreset {
		id: string;
		name: string;
		search: string;
		statusFilter: TaskStatusUi | 'ALL';
		priorityFilter: TaskPriorityUi | 'ALL';
	}

	interface FilterPresetApiItem extends FilterPreset {
		userId: string;
		createdAt: string;
	}

	interface TaskTemplate {
		id: string;
		title: string;
		description: string | null;
		priority: TaskPriorityUi;
	}

	let items = $state([] as TaskItem[]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let search = $state('');
	let view = $state<'list' | 'kanban' | 'calendar' | 'table'>('list');
	let statusFilter = $state<TaskStatusUi | 'ALL'>('ALL');
	let priorityFilter = $state<TaskPriorityUi | 'ALL'>('ALL');

	let presets = $state([] as FilterPreset[]);
	let templates = $state([] as TaskTemplate[]);
	let selectedIds = $state([] as string[]);
	let bulkLoading = $state(false);
	let currentWorkspaceId = $state<string | null>(null);
	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';

	const unsubscribe = tasks.subscribe((value) => {
		items = value.items;
		loading = value.loading;
		error = value.error;
		search = value.search;
		view = value.view;
		statusFilter = value.statusFilter;
		priorityFilter = value.priorityFilter;
	});

	const views: { key: 'list' | 'kanban' | 'calendar' | 'table'; label: string }[] = [
		{ key: 'list', label: 'List' },
		{ key: 'kanban', label: 'Kanban' },
		{ key: 'calendar', label: 'Calendar' },
		{ key: 'table', label: 'Table' }
	];

	const defaultTemplates: TaskTemplate[] = [
		{ id: 'morning-routine', title: 'Morning routine', description: 'Plan priorities, hydrate, review calendar', priority: 'MEDIUM' },
		{ id: 'study-plan', title: 'Study plan', description: '45 min focus + 10 min revision', priority: 'HIGH' },
		{ id: 'gym-schedule', title: 'Gym schedule', description: 'Workout + cool down + meal prep', priority: 'MEDIUM' }
	];

	function readLocalTasks(): TaskItem[] {
		try {
			const raw = localStorage.getItem(LOCAL_TASKS_KEY);
			if (!raw) return [];
			return JSON.parse(raw) as TaskItem[];
		} catch {
			return [];
		}
	}

	function writeLocalTasks(next: TaskItem[]) {
		localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(next));
	}

	function upsertLocalTask(next: TaskItem) {
		const current = readLocalTasks();
		const without = current.filter((item) => item.id !== next.id);
		writeLocalTasks([next, ...without]);
	}

	function makeLocalTask(input: {
		title: string;
		description: string | null;
		priority: TaskPriorityUi;
		dueDate: string | null;
	}): TaskItem {
		const now = new Date().toISOString();
		return {
			id: crypto.randomUUID(),
			workspaceId: currentWorkspaceId ?? 'local-workspace',
			creatorId: 'local-user',
			assigneeId: null,
			title: input.title,
			description: input.description,
			status: 'TODO',
			priority: input.priority,
			dueDate: input.dueDate,
			dueTime: null,
			completedAt: null,
			colorTag: null,
			parentTaskId: null,
			createdAt: now,
			updatedAt: now,
			position: readLocalTasks().length + 1
		};
	}

	onMount(() => {
		loadLocalState();
		void bootstrap();
		document.addEventListener('clarity:complete-hotkey', completeFirstPending as EventListener);
		return () => {
			document.removeEventListener('clarity:complete-hotkey', completeFirstPending as EventListener);
			unsubscribe();
		};
	});

	async function bootstrap() {
		await loadTasks();
		await loadPresetsFromApi();
	}

	function loadLocalState() {
		const url = new URL(window.location.href);
		const query = url.searchParams.get('search') ?? '';
		if (query) tasks.setSearch(query);
		const storedTemplates = localStorage.getItem('clarity_task_templates');
		templates = storedTemplates ? (JSON.parse(storedTemplates) as TaskTemplate[]) : defaultTemplates;
	}

	function persistPresetsLocal() { localStorage.setItem('clarity_task_presets', JSON.stringify(presets)); }
	function persistTemplates() { localStorage.setItem('clarity_task_templates', JSON.stringify(templates)); }
	function clearSelection() { selectedIds = []; }
	function toggleSelect(id: string) { selectedIds = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]; }
	function toggleSelectAll() { selectedIds = selectedIds.length === items.length ? [] : items.map((item) => item.id); }

	async function loadTasks() {
		tasks.setLoading(true);
		tasks.setError(null);
		try {
			const params = new URLSearchParams();
			params.set('pageSize', '100');
			if (search) params.set('search', search);
			if (statusFilter !== 'ALL') params.set('status', statusFilter);
			if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
			const result = await apiRequest<{ items?: TaskItem[]; error?: string }>(`/api/tasks?${params.toString()}`);
			if (!result.ok) {
				const localItems = readLocalTasks();
				tasks.setItems(localItems);
				tasks.setError('Using offline mode (local browser storage)');
				return;
			}
			tasks.setItems(result.data?.items ?? []);
			currentWorkspaceId = (result.data as { workspaceId?: string } | null)?.workspaceId ?? null;
			clearSelection();
		} catch {
			const localItems = readLocalTasks();
			tasks.setItems(localItems);
			tasks.setError('Using offline mode (local browser storage)');
		} finally {
			tasks.setLoading(false);
		}
	}

	async function loadPresetsFromApi() {
		const workspaceQuery = currentWorkspaceId ? `?workspaceId=${encodeURIComponent(currentWorkspaceId)}` : '';
		const result = await apiRequest<{ items?: FilterPresetApiItem[]; error?: string }>(`/api/tasks/filter-presets${workspaceQuery}`);
		if (!result.ok) {
			const storedPresets = localStorage.getItem('clarity_task_presets');
			presets = storedPresets ? (JSON.parse(storedPresets) as FilterPreset[]) : [];
			return;
		}
		presets = (result.data?.items ?? []).map((item) => ({
			id: item.id,
			name: item.name,
			search: item.search,
			statusFilter: item.statusFilter,
			priorityFilter: item.priorityFilter
		}));
		persistPresetsLocal();
	}

	async function createTask(event: CustomEvent<{ title: string; description: string | null; priority: TaskPriorityUi; dueDate: string | null; }>) {
		const body = { title: event.detail.title, description: event.detail.description, priority: event.detail.priority, dueDate: event.detail.dueDate ? new Date(event.detail.dueDate).toISOString() : null };
		const result = await apiRequest<{ item?: TaskItem; error?: string }>('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
		if (!result.ok) {
			const local = makeLocalTask({
				title: event.detail.title,
				description: event.detail.description,
				priority: event.detail.priority,
				dueDate: body.dueDate
			});
			upsertLocalTask(local);
			tasks.setItems([local, ...items]);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		await loadTasks();
	}

	async function createFromTemplate(templateId: string) {
		const template = templates.find((candidate: TaskTemplate) => candidate.id === templateId);
		if (!template) return;
		const result = await apiRequest<{ item?: TaskItem; error?: string }>('/api/tasks', {
			method: 'POST', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title: template.title, description: template.description, priority: template.priority })
		});
		if (!result.ok) {
			const local = makeLocalTask({
				title: template.title,
				description: template.description,
				priority: template.priority,
				dueDate: null
			});
			upsertLocalTask(local);
			tasks.setItems([local, ...items]);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		notifications.push({ id: crypto.randomUUID(), type: 'success', title: 'Template applied', message: `Task created from ${template.title}` });
		await loadTasks();
	}

	function saveTemplate() {
		const title = prompt('Template title');
		if (!title) return;
		const description = prompt('Template description (optional)') ?? null;
		const priorityInput = (prompt('Priority: LOW/MEDIUM/HIGH/URGENT', 'MEDIUM') ?? 'MEDIUM').toUpperCase() as TaskPriorityUi;
		const priority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priorityInput) ? priorityInput : 'MEDIUM';
		templates = [{ id: crypto.randomUUID(), title, description, priority }, ...templates];
		persistTemplates();
	}

	async function saveFilterPreset() {
		const name = prompt('Preset name');
		if (!name) return;
		const payload: { workspaceId?: string; name: string; search: string; statusFilter: TaskStatusUi | 'ALL'; priorityFilter: TaskPriorityUi | 'ALL'; } = { name, search, statusFilter, priorityFilter };
		if (currentWorkspaceId) payload.workspaceId = currentWorkspaceId;
		const result = await apiRequest<{ item?: FilterPresetApiItem; error?: string }>('/api/tasks/filter-presets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
		if (!result.ok || !result.data?.item) {
			presets = [
				{
					id: crypto.randomUUID(),
					name,
					search,
					statusFilter,
					priorityFilter
				},
				...presets
			];
			persistPresetsLocal();
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		const item = result.data.item;
		presets = [{ id: item.id, name: item.name, search: item.search, statusFilter: item.statusFilter, priorityFilter: item.priorityFilter }, ...presets];
		persistPresetsLocal();
	}

	async function applyPreset(presetId: string) {
		const preset = presets.find((candidate: FilterPreset) => candidate.id === presetId);
		if (!preset) return;
		tasks.setSearch(preset.search); tasks.setStatusFilter(preset.statusFilter); tasks.setPriorityFilter(preset.priorityFilter);
		await loadTasks();
	}

	async function deletePreset(presetId: string) {
		const workspaceQuery = currentWorkspaceId ? `?workspaceId=${encodeURIComponent(currentWorkspaceId)}` : '';
		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/tasks/filter-presets/${presetId}${workspaceQuery}`, { method: 'DELETE' });
		if (!result.ok) {
			presets = presets.filter((candidate: FilterPreset) => candidate.id !== presetId);
			persistPresetsLocal();
			tasks.setError('Updated locally. Connect database to sync with server.');
			return;
		}
		presets = presets.filter((candidate: FilterPreset) => candidate.id !== presetId);
		persistPresetsLocal();
	}

	function orderedIdsForStatus(status: TaskStatusUi): string[] { return items.filter((candidate) => candidate.status === status).sort((a, b) => a.position - b.position).map((candidate) => candidate.id); }
	function insertBefore(ids: string[], movingId: string, beforeId: string | null | undefined): string[] {
		const base = ids.filter((id) => id !== movingId);
		if (!beforeId) return [...base, movingId];
		const index = base.indexOf(beforeId);
		if (index === -1) return [...base, movingId];
		return [...base.slice(0, index), movingId, ...base.slice(index)];
	}

	async function persistOrder(workspaceId: string, status: TaskStatusUi, orderedIds: string[]) {
		if (orderedIds.length === 0) return;
		const result = await apiRequest<{ success?: boolean; error?: string }>('/api/tasks/reorder', {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workspaceId, status, orderedIds })
		});
		if (!result.ok) throw new Error(result.error ?? 'Unable to reorder tasks');
	}

	async function completeTask(event: CustomEvent<string>) { await completeTaskById(event.detail); }
	async function completeTaskById(id: string) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${id}/complete`, { method: 'POST' });
		if (!result.ok) {
			const current = readLocalTasks();
			const now = new Date().toISOString();
			const next = current.map((item) =>
				item.id === id ? { ...item, status: 'DONE' as TaskStatusUi, completedAt: now, updatedAt: now } : item
			);
			writeLocalTasks(next);
			tasks.setItems(next);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		await loadTasks();
	}

	async function bulkCompleteSelected() {
		if (selectedIds.length === 0) return;
		bulkLoading = true; error = null;
		for (const id of [...selectedIds]) {
			const result = await apiRequest(`/api/tasks/${id}/complete`, { method: 'POST' });
			if (!result.ok) { error = result.error ?? 'Unable to complete selected tasks'; bulkLoading = false; return; }
		}
		bulkLoading = false; await loadTasks();
	}

	async function bulkDeleteSelected() {
		if (selectedIds.length === 0) return;
		const ok = confirm(`Delete ${selectedIds.length} selected tasks?`); if (!ok) return;
		bulkLoading = true; error = null;
		for (const id of [...selectedIds]) {
			const result = await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
			if (!result.ok) { error = result.error ?? 'Unable to delete selected tasks'; bulkLoading = false; return; }
		}
		bulkLoading = false; await loadTasks();
	}

	async function completeFirstPending() {
		const target = items.find((candidate: TaskItem) => candidate.status !== 'DONE');
		if (!target) return;
		await completeTaskById(target.id);
	}

	async function duplicateTask(event: CustomEvent<string>) { await duplicateTaskById(event.detail); }
	async function duplicateTaskById(id: string) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${id}/duplicate`, { method: 'POST' });
		if (!result.ok) {
			const source = items.find((candidate) => candidate.id === id);
			if (!source) return;
			const now = new Date().toISOString();
			const copy: TaskItem = {
				...source,
				id: crypto.randomUUID(),
				title: `${source.title} (Copy)`,
				status: 'TODO',
				completedAt: null,
				createdAt: now,
				updatedAt: now,
				position: readLocalTasks().length + 1
			};
			const next = [copy, ...readLocalTasks()];
			writeLocalTasks(next);
			tasks.setItems(next);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		await loadTasks();
	}

	async function deleteTask(event: CustomEvent<string>) { await deleteTaskById(event.detail); }
	async function deleteTaskById(id: string) {
		const ok = confirm('Delete this task?'); if (!ok) return;
		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/tasks/${id}`, { method: 'DELETE' });
		if (!result.ok) {
			const next = readLocalTasks().filter((item) => item.id !== id);
			writeLocalTasks(next);
			tasks.setItems(next);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		await loadTasks();
	}

	async function editTask(event: CustomEvent<{ id: string; title: string }>) {
		const nextTitle = event.detail.title.includes('(Copy)') ? event.detail.title : (prompt('Edit task title', event.detail.title) ?? event.detail.title).trim();
		if (!nextTitle) return;
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${event.detail.id}`, {
			method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: nextTitle })
		});
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === event.detail.id ? { ...item, title: nextTitle, updatedAt: now } : item
			);
			writeLocalTasks(next);
			tasks.setItems(next);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		await loadTasks();
	}

	async function patchTask(id: string, patch: Partial<Pick<TaskItem, 'status' | 'priority' | 'dueDate'>>) {
		const previous = items;
		const optimistic = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
		tasks.setItems(optimistic);
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${id}`, {
			method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: patch.status, priority: patch.priority, dueDate: patch.dueDate })
		});
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === id ? { ...item, ...patch, updatedAt: now } : item
			);
			writeLocalTasks(next);
			tasks.setItems(next);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		await loadTasks();
	}

	async function moveTask(event: CustomEvent<{ id: string; status: TaskStatusUi; beforeId?: string | null }>) {
		const moving = items.find((candidate) => candidate.id === event.detail.id); if (!moving) return;
		const canPersistReorder = !search && statusFilter === 'ALL' && priorityFilter === 'ALL';
		if (!canPersistReorder) { await patchTask(event.detail.id, { status: event.detail.status }); return; }
		try {
			const sourceStatus = moving.status; const targetStatus = event.detail.status; const workspaceId = moving.workspaceId;
			if (sourceStatus === targetStatus) {
				const reordered = insertBefore(orderedIdsForStatus(targetStatus), moving.id, event.detail.beforeId ?? null);
				await persistOrder(workspaceId, targetStatus, reordered);
			} else {
				const sourceOrdered = orderedIdsForStatus(sourceStatus).filter((id) => id !== moving.id);
				const targetOrdered = insertBefore(orderedIdsForStatus(targetStatus), moving.id, event.detail.beforeId ?? null);
				await persistOrder(workspaceId, sourceStatus, sourceOrdered);
				await persistOrder(workspaceId, targetStatus, targetOrdered);
			}
			await loadTasks();
		} catch (err) {
			tasks.setError(err instanceof Error ? err.message : 'Unable to move task');
		}
	}

	async function onSearch(event: CustomEvent<string>) { tasks.setSearch(event.detail); await loadTasks(); }
	async function onStatus(event: CustomEvent<TaskStatusUi | 'ALL'>) { tasks.setStatusFilter(event.detail); await loadTasks(); }
	async function onPriority(event: CustomEvent<TaskPriorityUi | 'ALL'>) { tasks.setPriorityFilter(event.detail); await loadTasks(); }
	async function createTaskFromCalendar(event: CustomEvent<{ title: string; dueDate: string | null }>) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>('/api/tasks', {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: event.detail.title, description: null, priority: 'MEDIUM', dueDate: event.detail.dueDate })
		});
		if (!result.ok) {
			const local = makeLocalTask({
				title: event.detail.title,
				description: null,
				priority: 'MEDIUM',
				dueDate: event.detail.dueDate
			});
			upsertLocalTask(local);
			tasks.setItems([local, ...items]);
			tasks.setError('Saved locally. Connect database to sync with server.');
			return;
		}
		await loadTasks();
	}
	async function rescheduleTask(event: CustomEvent<{ id: string; dueDate: string | null }>) { await patchTask(event.detail.id, { dueDate: event.detail.dueDate }); }
	function setView(nextView: 'list' | 'kanban' | 'calendar' | 'table') { tasks.setView(nextView); }
</script>

<section class="space-y-4">
	<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
		<h1 class="text-3xl font-semibold text-text-primary">Tasks</h1>
		<div class="flex items-center gap-2">
			<button class="rounded-full border border-border bg-surface-2 px-3 py-2 text-xs" onclick={saveTemplate} type="button">Save template</button>
			<button class="rounded-full border border-border bg-surface-2 px-3 py-2 text-xs" onclick={saveFilterPreset} type="button">Save filter</button>
		</div>
	</div>

	{#if templates.length > 0}
		<div class="app-card p-3">
			<p class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Task templates</p>
			<div class="flex flex-wrap gap-2">
				{#each templates as template (template.id)}
					<button class="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs" onclick={() => createFromTemplate(template.id)} type="button">{template.title}</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if presets.length > 0}
		<div class="app-card p-3">
			<p class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Saved filters</p>
			<div class="flex flex-wrap gap-2">
				{#each presets as preset (preset.id)}
					<div class="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-1">
						<button class="text-xs" onclick={() => applyPreset(preset.id)} type="button">{preset.name}</button>
						<button class="rounded-full px-1 text-xs text-warning" onclick={() => deletePreset(preset.id)} type="button">x</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<TaskForm on:create={createTask} />
	<TaskFilters on:search={onSearch} on:status={onStatus} on:priority={onPriority} />

	<div class="flex flex-wrap items-center gap-2">
		<div class="inline-flex rounded-full border border-border bg-surface p-1">
			{#each views as item}
				<button class={`rounded-full px-3 py-1.5 text-sm font-medium ${view === item.key ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`} onclick={() => setView(item.key)} type="button">{item.label}</button>
			{/each}
		</div>

		{#if selectedIds.length > 0}
			<div class="ml-auto flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
				<span class="text-xs text-text-secondary">{selectedIds.length} selected</span>
				<button class="rounded-full bg-primary px-2.5 py-1 text-xs text-on-primary disabled:opacity-50" disabled={bulkLoading} onclick={bulkCompleteSelected} type="button">Complete</button>
				<button class="rounded-full bg-danger px-2.5 py-1 text-xs text-white disabled:opacity-50" disabled={bulkLoading} onclick={bulkDeleteSelected} type="button">Delete</button>
			</div>
		{/if}
	</div>

	{#if error}
		<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>
	{/if}

	{#if loading}
		<p class="text-sm text-text-secondary">Loading tasks...</p>
	{:else if items.length === 0}
		<div class="empty-state">
			<p class="text-sm">No tasks yet. Start with one clear action and build momentum.</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button class="rounded-full bg-primary px-3 py-1.5 text-xs text-on-primary" onclick={() => createFromTemplate('morning-routine')} type="button">Add your first task</button>
				<button class="rounded-full border border-border px-3 py-1.5 text-xs" onclick={saveTemplate} type="button">Use template</button>
			</div>
		</div>
	{:else if view === 'list'}
		<div class="space-y-3">
			{#each items as item (item.id)}
				<div class="flex items-start gap-2">
					<input checked={selectedIds.includes(item.id)} onclick={() => toggleSelect(item.id)} type="checkbox" />
					<div class="flex-1"><TaskCard {item} on:complete={completeTask} on:delete={deleteTask} on:duplicate={duplicateTask} on:edit={editTask} /></div>
				</div>
			{/each}
		</div>
	{:else if view === 'kanban'}
		<KanbanBoard items={items} on:move={moveTask} on:complete={completeTask} on:delete={deleteTask} on:duplicate={duplicateTask} on:edit={editTask} />
	{:else if view === 'calendar'}
		<CalendarView items={items} on:complete={completeTask} on:delete={deleteTask} on:duplicate={duplicateTask} on:edit={editTask} on:create={createTaskFromCalendar} on:reschedule={rescheduleTask} />
	{:else}
		<div class="app-card overflow-auto">
			<table class="min-w-full border-collapse text-sm">
				<thead class="bg-surface-2 text-left text-text-secondary">
					<tr>
						<th class="px-3 py-2"><input checked={selectedIds.length === items.length && items.length > 0} onclick={toggleSelectAll} type="checkbox" /></th>
						<th class="px-3 py-2">Title</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Priority</th><th class="px-3 py-2">Due Date</th><th class="px-3 py-2">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.id)}
						<tr class="border-t border-border">
							<td class="px-3 py-2"><input checked={selectedIds.includes(item.id)} onclick={() => toggleSelect(item.id)} type="checkbox" /></td>
							<td class="px-3 py-2 font-medium text-text-primary">{item.title}</td>
							<td class="px-3 py-2"><select class="rounded-[10px] border border-border bg-surface-2 px-2 py-1 text-xs" value={item.status} onchange={(event) => patchTask(item.id, { status: (event.currentTarget as HTMLSelectElement).value as TaskStatusUi })}>{#each ['TODO', 'IN_PROGRESS', 'DONE'] as option}<option value={option}>{option}</option>{/each}</select></td>
							<td class="px-3 py-2"><select class="rounded-[10px] border border-border bg-surface-2 px-2 py-1 text-xs" value={item.priority} onchange={(event) => patchTask(item.id, { priority: (event.currentTarget as HTMLSelectElement).value as TaskPriorityUi })}>{#each ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as option}<option value={option}>{option}</option>{/each}</select></td>
							<td class="px-3 py-2"><input class="rounded-[10px] border border-border bg-surface-2 px-2 py-1 text-xs" type="date" value={item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : ''} onchange={(event) => {
								const value = (event.currentTarget as HTMLInputElement).value;
								patchTask(item.id, { dueDate: value ? new Date(value + 'T00:00:00.000Z').toISOString() : null });
							}} /></td>
							<td class="px-3 py-2"><div class="flex flex-wrap gap-2">{#if item.status !== 'DONE'}<button class="rounded-full bg-primary px-2 py-1 text-xs text-on-primary" onclick={() => completeTaskById(item.id)} type="button">Complete</button>{/if}<button class="rounded-full border border-border px-2 py-1 text-xs" onclick={() => duplicateTaskById(item.id)} type="button">Duplicate</button><button class="rounded-full bg-danger px-2 py-1 text-xs text-white" onclick={() => deleteTaskById(item.id)} type="button">Delete</button></div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
