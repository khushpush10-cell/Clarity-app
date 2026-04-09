<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { apiRequest } from '$lib/utils/http';

	let workspaces = $state([] as Array<{ id: string; name: string; type: string }>);
	let selectedWorkspaceId = $state<string | null>(null);
	let name = $state('');
	let type = $state('TEAM');
	let error = $state<string | null>(null);

	onMount(() => {
		void loadWorkspaces();
	});

	async function loadWorkspaces() {
		const result = await apiRequest<{ items?: Array<{ id: string; name: string; type: string }>; error?: string }>(
			'/api/workspaces'
		);
		if (!result.ok) {
			error = result.error ?? 'Unable to load workspaces';
			return;
		}

		workspaces = result.data?.items ?? [];
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
			error = result.error ?? 'Unable to save workspace';
			return;
		}

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
			error = result.error ?? 'Unable to delete workspace';
			return;
		}

		selectedWorkspaceId = null;
		await loadWorkspaces();
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<h1 class="text-2xl font-bold text-text-primary">Workspace Settings</h1>

		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">{error}</p>
		{/if}

		<div class="grid grid-cols-12 gap-4">
			<section class="col-span-4 rounded-[8px] border border-border bg-surface p-4">
				<h2 class="text-sm font-semibold text-text-primary">Workspaces</h2>
				<div class="mt-3 space-y-2">
					{#if workspaces.length === 0}
						<p class="text-sm text-text-secondary">No workspaces available.</p>
					{:else}
						{#each workspaces as workspace (workspace.id)}
							<button
								class={`w-full rounded-[8px] border px-3 py-2 text-left text-sm ${
									selectedWorkspaceId === workspace.id
										? 'border-primary bg-primary/10 text-primary'
										: 'border-border bg-background text-text-primary'
								}`}
								onclick={() => (selectedWorkspaceId = workspace.id)}
								type="button"
							>
								{workspace.name}
							</button>
						{/each}
					{/if}
				</div>
			</section>

			<section class="col-span-8 rounded-[8px] border border-border bg-surface p-4">
				<h2 class="text-sm font-semibold text-text-primary">Workspace Profile</h2>
				{#if !selectedWorkspaceId}
					<p class="mt-3 text-sm text-text-secondary">Select a workspace first.</p>
				{:else}
					<form class="mt-3 space-y-3" onsubmit={saveWorkspace}>
						<div>
							<label class="mb-1 block text-xs text-text-secondary" for="workspace-name">Name</label>
							<input id="workspace-name" bind:value={name} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" required type="text" />
						</div>
						<div>
							<label class="mb-1 block text-xs text-text-secondary" for="workspace-type">Type</label>
							<select id="workspace-type" bind:value={type} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm">
								{#each ['PERSONAL', 'TEAM', 'BUSINESS'] as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</div>
						<div class="flex gap-2">
							<button class="rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white" type="submit">Save</button>
							<button class="rounded-[8px] bg-urgent px-3 py-2 text-sm font-semibold text-white" onclick={deleteWorkspace} type="button">Delete</button>
						</div>
					</form>
				{/if}
			</section>
		</div>
	</section>
</MainLayout>
