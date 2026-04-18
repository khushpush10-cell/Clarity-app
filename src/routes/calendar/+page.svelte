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

	async function completeTask(event: CustomEvent<string>) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${event.detail}/complete`, { method: 'POST' });
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === event.detail
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

	async function duplicateTask(event: CustomEvent<string>) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${event.detail}/duplicate`, { method: 'POST' });
		if (!result.ok) {
			const source = items.find((item) => item.id === event.detail);
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

	async function deleteTask(event: CustomEvent<string>) {
		const ok = confirm('Delete this task?');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/tasks/${event.detail}`, { method: 'DELETE' });
		if (!result.ok) {
			const next = readLocalTasks().filter((item) => item.id !== event.detail);
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function editTask(event: CustomEvent<{ id: string; title: string }>) {
		const nextTitle = (prompt('Edit title', event.detail.title) ?? event.detail.title).trim();
		if (!nextTitle) return;

		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${event.detail.id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title: nextTitle })
		});
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === event.detail.id ? { ...item, title: nextTitle, updatedAt: now } : item
			);
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function createTaskFromCalendar(event: CustomEvent<{ title: string; dueDate: string | null }>) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>('/api/tasks', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				title: event.detail.title,
				description: null,
				priority: 'MEDIUM',
				dueDate: event.detail.dueDate
			})
		});
		if (!result.ok) {
			const local = makeLocalTask({ title: event.detail.title, dueDate: event.detail.dueDate });
			const next = [local, ...readLocalTasks()];
			writeLocalTasks(next);
			items = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadTasks();
	}

	async function rescheduleTask(event: CustomEvent<{ id: string; dueDate: string | null }>) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${event.detail.id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ dueDate: event.detail.dueDate })
		});
		if (!result.ok) {
			const now = new Date().toISOString();
			const next = readLocalTasks().map((item) =>
				item.id === event.detail.id ? { ...item, dueDate: event.detail.dueDate, updatedAt: now } : item
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
				on:complete={completeTask}
				on:delete={deleteTask}
				on:duplicate={duplicateTask}
				on:edit={editTask}
				on:create={createTaskFromCalendar}
				on:reschedule={rescheduleTask}
			/>
		{/if}
	</section>
</MainLayout>
