<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import CalendarView from '$lib/components/tasks/CalendarView.svelte';
	import type { TaskItem, TaskStatusUi } from '$lib/stores/tasks';
	import { apiRequest } from '$lib/utils/http';

	let items = $state([] as TaskItem[]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';

	function readLocalTasks(): TaskItem[] {
		try {
			const raw = localStorage.getItem(LOCAL_TASKS_KEY);
			return raw ? (JSON.parse(raw) as TaskItem[]) : [];
		} catch {
			return [];
		}
	}

	function writeLocalTasks(next: TaskItem[]) {
		localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(next));
	}

	function makeLocalTask(input: { title: string; dueDate: string | null }): TaskItem {
		const now = new Date().toISOString();
		return {
			id: crypto.randomUUID(),
			workspaceId: 'local-workspace',
			creatorId: 'local-user',
			assigneeId: null,
			title: input.title,
			description: null,
			status: 'TODO',
			priority: 'MEDIUM',
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
		void loadTasks();
	});

	async function loadTasks() {
		loading = true;
		error = null;

		try {
			const result = await apiRequest<{ items?: TaskItem[]; error?: string }>('/api/tasks?pageSize=100');
			if (!result.ok) {
				items = readLocalTasks();
				error = 'Using offline mode (local browser storage)';
				return;
			}

			items = result.data?.items ?? [];
		} catch {
			items = readLocalTasks();
			error = 'Using offline mode (local browser storage)';
		} finally {
			loading = false;
		}
	}

	async function completeTask(id: string) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${id}/complete`, { method: 'POST' });
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === id
					? { ...item, status: 'DONE' as TaskStatusUi, completedAt: now, updatedAt: now }
					: item
			);
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function duplicateTask(id: string) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${id}/duplicate`, { method: 'POST' });
		if (!result.ok) {
			const source = items.find((item) => item.id === id);
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
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function deleteTask(id: string) {
		const ok = confirm('Delete this task?');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/tasks/${id}`, { method: 'DELETE' });
		if (!result.ok) {
			const next = readLocalTasks().filter((item) => item.id !== id);
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function editTask(payload: { id: string; title: string }) {
		const nextTitle = (prompt('Edit title', payload.title) ?? payload.title).trim();
		if (!nextTitle) return;

		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${payload.id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title: nextTitle })
		});
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === payload.id ? { ...item, title: nextTitle, updatedAt: now } : item
			);
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function createTaskFromCalendar(payload: { title: string; dueDate: string | null }) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>('/api/tasks', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				title: payload.title,
				description: null,
				priority: 'MEDIUM',
				dueDate: payload.dueDate
			})
		});
		if (!result.ok) {
			const local = makeLocalTask({ title: payload.title, dueDate: payload.dueDate });
			const next = [local, ...readLocalTasks()];
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function rescheduleTask(payload: { id: string; dueDate: string | null }) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${payload.id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ dueDate: payload.dueDate })
		});
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === payload.id ? { ...item, dueDate: payload.dueDate, updatedAt: now } : item
			);
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<h1 class="text-2xl font-bold text-text-primary">Calendar</h1>
		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">{error}</p>
		{/if}
		{#if loading}
			<p class="text-sm text-text-secondary">Loading tasks...</p>
		{:else}
			<CalendarView
				{items}
				onComplete={completeTask}
				onDelete={deleteTask}
				onDuplicate={duplicateTask}
				onEdit={editTask}
				onCreate={createTaskFromCalendar}
				onReschedule={rescheduleTask}
			/>
		{/if}
	</section>
</MainLayout>
