<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import CalendarView from '$lib/components/tasks/CalendarView.svelte';
	import type { TaskItem } from '$lib/stores/tasks';
	import { apiRequest } from '$lib/utils/http';

	let items = $state([] as TaskItem[]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		void loadTasks();
	});

	async function loadTasks() {
		loading = true;
		error = null;

		try {
			const result = await apiRequest<{ items?: TaskItem[]; error?: string }>('/api/tasks?pageSize=100');
			if (!result.ok) {
				error = result.error ?? 'Unable to load tasks';
				return;
			}

			items = result.data?.items ?? [];
		} catch {
			error = 'Unable to load tasks';
		} finally {
			loading = false;
		}
	}

	async function completeTask(event: CustomEvent<string>) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${event.detail}/complete`, { method: 'POST' });
		if (!result.ok) {
			error = result.error ?? 'Unable to complete task';
			return;
		}
		await loadTasks();
	}

	async function duplicateTask(event: CustomEvent<string>) {
		const result = await apiRequest<{ item?: TaskItem; error?: string }>(`/api/tasks/${event.detail}/duplicate`, { method: 'POST' });
		if (!result.ok) {
			error = result.error ?? 'Unable to duplicate task';
			return;
		}
		await loadTasks();
	}

	async function deleteTask(event: CustomEvent<string>) {
		const ok = confirm('Delete this task?');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/tasks/${event.detail}`, { method: 'DELETE' });
		if (!result.ok) {
			error = result.error ?? 'Unable to delete task';
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
			error = result.error ?? 'Unable to edit task';
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
			error = result.error ?? 'Unable to create task';
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
			error = result.error ?? 'Unable to reschedule task';
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
