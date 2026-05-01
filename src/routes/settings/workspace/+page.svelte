<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { apiRequest } from '$lib/utils/http';

	let workspaces = $state([] as Array<{ id: string; name: string; type: string }>);
	let selectedWorkspaceId = $state<string | null>(null);
	let name = $state('');
	let type = $state('PERSONAL');
	let error = $state<string | null>(null);
	const LOCAL_WORKSPACE_KEY = 'clarity_local_workspaces_v1';

	onMount(() => {
		void loadWorkspaces();
	});

	function readLocalWorkspaces() {
		try {
			const raw = localStorage.getItem(LOCAL_WORKSPACE_KEY);
			if (!raw) return [] as Array<{ id: string; name: string; type: string }>;
			const parsed = JSON.parse(raw) as { workspaces?: Array<{ id: string; name: string; type: string }> };
			return parsed.workspaces ?? [];
		} catch {
			return [] as Array<{ id: string; name: string; type: string }>;
		}
	}

	function writeLocalWorkspaces(next: Array<{ id: string; name: string; type: string }>) {
		try {
			const raw = localStorage.getItem(LOCAL_WORKSPACE_KEY);
			const parsed = raw
				? (JSON.parse(raw) as {
						workspaces?: Array<{ id: string; name: string; type: string }>;
						membersByWorkspace?: Record<string, unknown>;
					})
				: {};
			localStorage.setItem(
				LOCAL_WORKSPACE_KEY,
				JSON.stringify({
					...parsed,
					workspaces: next
				})
			);
		} catch {
			localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ workspaces: next, membersByWorkspace: {} }));
		}
	}

	async function loadWorkspaces() {
		const result = await apiRequest<{ items?: Array<{ id: string; name: string; type: string }>; error?: string }>(
			'/api/workspaces'
		);
		if (!result.ok) {
			workspaces = readLocalWorkspaces();
			error = 'Using offline mode (local browser storage)';
		} else {
			workspaces = result.data?.items ?? [];
		}
		if (!selectedWorkspaceId) {
			const first = workspaces.at(0);
			if (first) {
				selectedWorkspaceId = first.id;
				name = first.name;
				type = first.type;
			}
		}
	}

	$effect(() => {
		if (!selectedWorkspaceId) return;
		const current = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
		if (!current) return;
		name = current.name;
		type = current.type;
	});

	async function saveWorkspace(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedWorkspaceId) return;

		const result = await apiRequest<{ item?: unknown; error?: string }>(`/api/workspaces/${selectedWorkspaceId}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, type })
		});
		if (!result.ok) {
			const next = workspaces.map((workspace) =>
				workspace.id === selectedWorkspaceId ? { ...workspace, name, type } : workspace
			);
			workspaces = next;
			writeLocalWorkspaces(next);
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}

		notifications.push({
			id: crypto.randomUUID(),
			type: 'success',
			title: 'Workspace saved',
			message: 'Workspace settings updated.'
		});
		await loadWorkspaces();
	}

	async function deleteWorkspace() {
		if (!selectedWorkspaceId) return;
		const ok = confirm('Delete this workspace?');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/workspaces/${selectedWorkspaceId}`, {
			method: 'DELETE'
		});
		if (!result.ok) {
			const next = workspaces.filter((workspace) => workspace.id !== selectedWorkspaceId);
			writeLocalWorkspaces(next);
			workspaces = next;
			selectedWorkspaceId = null;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}

		notifications.push({
			id: crypto.randomUUID(),
			type: 'info',
			title: 'Workspace deleted',
			message: 'Selected workspace has been removed.'
		});
		selectedWorkspaceId = null;
		await loadWorkspaces();
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<div>
			<h1 class="text-[28px] font-semibold text-text-primary">Workspace Settings</h1>
			<p class="text-sm text-text-secondary">Manage your personal workspace identity.</p>
		</div>

		{#if error}
			<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>
		{/if}

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
			<section class="app-card p-4 xl:col-span-4">
				<h2 class="text-xl font-semibold text-text-primary">Workspaces</h2>
				<p class="mt-1 text-sm text-text-secondary">Select a workspace to edit.</p>
				<div class="mt-3 space-y-2">
					{#if workspaces.length === 0}
						<div class="empty-state">
							<p class="text-sm">No workspaces available.</p>
						</div>
					{:else}
						{#each workspaces as workspace (workspace.id)}
							<button
								class={`w-full rounded-[12px] border px-3 py-2 text-left text-sm transition ${
									selectedWorkspaceId === workspace.id
										? 'border-secondary bg-secondary-tint text-secondary'
										: 'border-border bg-surface-2 text-text-primary hover:bg-surface'
								}`}
								onclick={() => (selectedWorkspaceId = workspace.id)}
								type="button"
							>
								<p class="font-medium">{workspace.name}</p>
								<p class="text-xs opacity-80">{workspace.type.toLowerCase()}</p>
							</button>
						{/each}
					{/if}
				</div>
			</section>

			<section class="app-card p-4 xl:col-span-8">
				<h2 class="text-xl font-semibold text-text-primary">Workspace Profile</h2>
				{#if !selectedWorkspaceId}
					<div class="empty-state mt-3">
						<p class="text-sm">Choose a workspace from the left to edit details.</p>
					</div>
				{:else}
					<form class="mt-3 space-y-3" onsubmit={saveWorkspace}>
						<div>
							<label class="mb-1 block text-[13px] font-medium text-text-secondary" for="workspace-name">Name</label>
							<input id="workspace-name" bind:value={name} class="w-full rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-sm" required type="text" />
						</div>
						<div>
							<label class="mb-1 block text-[13px] font-medium text-text-secondary" for="workspace-type">Type</label>
							<select id="workspace-type" bind:value={type} class="w-full rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-sm">
								{#each ['PERSONAL', 'BUSINESS'] as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-wrap gap-2">
							<button class="rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-hover" type="submit">Save workspace</button>
							<button class="rounded-[12px] bg-[color:var(--danger)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--danger-hover)]" onclick={deleteWorkspace} type="button">Delete workspace</button>
						</div>
					</form>
				{/if}
			</section>
		</div>
	</section>
</MainLayout>
