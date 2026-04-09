<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import MemberList from '$lib/components/team/MemberList.svelte';
	import WorkloadView, { type WorkloadItem } from '$lib/components/team/WorkloadView.svelte';
	import { apiRequest } from '$lib/utils/http';

	interface WorkspaceItem {
		id: string;
		name: string;
		type: string;
	}

	interface TaskItem {
		id: string;
		title: string;
		status: 'TODO' | 'IN_PROGRESS' | 'DONE';
		assigneeId: string | null;
	}

	let workspaces = $state([] as WorkspaceItem[]);
	let selectedWorkspaceId = $state<string | null>(null);
	let workload = $state([] as WorkloadItem[]);
	let members = $state([] as Array<{ userId: string; role: string; user: { name: string } }>);
	let error = $state<string | null>(null);
	let loading = $state(false);

	let workspaceName = $state('');
	let inviteUserId = $state('');
	let inviteRole = $state('MEMBER');

	onMount(() => {
		void loadWorkspaces();
	});

	async function loadWorkspaces() {
		loading = true;
		error = null;

		try {
			const result = await apiRequest<{ items?: WorkspaceItem[]; error?: string }>('/api/workspaces');
			if (!result.ok) {
				error = result.error ?? 'Unable to load workspaces';
				return;
			}

			workspaces = result.data?.items ?? [];
			if (!selectedWorkspaceId) {
				const firstWorkspace = workspaces.at(0);
				if (firstWorkspace) {
					selectedWorkspaceId = firstWorkspace.id;
				}
			}

			await loadWorkspaceData();
		} catch {
			error = 'Unable to load workspaces';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (selectedWorkspaceId) {
			void loadWorkspaceData();
		}
	});

	async function loadWorkspaceData() {
		if (!selectedWorkspaceId) return;

		const [membersResult, tasksResult] = await Promise.all([
			apiRequest<{ items?: Array<{ userId: string; role: string; user: { name: string } }>; error?: string }>(
				`/api/workspaces/${selectedWorkspaceId}/members`
			),
			apiRequest<{ items?: TaskItem[]; error?: string }>(`/api/tasks?workspaceId=${selectedWorkspaceId}&pageSize=100`)
		]);

		if (!membersResult.ok) {
			error = membersResult.error ?? 'Unable to load members';
			return;
		}
		if (!tasksResult.ok) {
			error = tasksResult.error ?? 'Unable to load tasks';
			return;
		}

		members = membersResult.data?.items ?? [];
		const tasks: TaskItem[] = tasksResult.data?.items ?? [];

		const map = new Map<string, WorkloadItem>();
		for (const member of members) {
			map.set(member.userId, {
				member: member.user?.name ?? member.userId,
				total: 0,
				done: 0,
				inProgress: 0
			});
		}

		for (const task of tasks) {
			if (!task.assigneeId) continue;
			const bucket = map.get(task.assigneeId);
			if (!bucket) continue;
			bucket.total += 1;
			if (task.status === 'DONE') bucket.done += 1;
			if (task.status === 'IN_PROGRESS') bucket.inProgress += 1;
		}

		workload = Array.from(map.values());
	}

	async function createWorkspace(event: SubmitEvent) {
		event.preventDefault();
		if (!workspaceName.trim()) return;

		const result = await apiRequest<{ item?: WorkspaceItem; error?: string }>('/api/workspaces', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: workspaceName, type: 'TEAM' })
		});

		if (!result.ok) {
			error = result.error ?? 'Unable to create workspace';
			return;
		}

		workspaceName = '';
		await loadWorkspaces();
	}

	async function addMember(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedWorkspaceId) return;

		const result = await apiRequest<{ item?: unknown; error?: string }>(
			`/api/workspaces/${selectedWorkspaceId}/members`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId: inviteUserId.trim(), role: inviteRole })
			}
		);

		if (!result.ok) {
			error = result.error ?? 'Unable to add member';
			return;
		}

		inviteUserId = '';
		inviteRole = 'MEMBER';
		await loadWorkspaceData();
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<h1 class="text-2xl font-bold text-text-primary">Team</h1>

		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">{error}</p>
		{/if}

		<div class="grid grid-cols-12 gap-4">
			<section class="col-span-4 rounded-[8px] border border-border bg-surface p-4">
				<h2 class="text-sm font-semibold text-text-primary">Workspaces</h2>

				<form class="mt-3 flex gap-2" onsubmit={createWorkspace}>
					<input
						bind:value={workspaceName}
						class="w-full rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
						placeholder="New team workspace"
						type="text"
					/>
					<button class="rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white" type="submit">Add</button>
				</form>

				<div class="mt-3 space-y-2">
					{#if loading}
						<p class="text-sm text-text-secondary">Loading...</p>
					{:else if workspaces.length === 0}
						<p class="text-sm text-text-secondary">No workspaces yet.</p>
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

				{#if selectedWorkspaceId}
					<form class="mt-4 space-y-2 border-t border-border pt-4" onsubmit={addMember}>
						<h3 class="text-xs font-semibold tracking-[0.06em] text-text-secondary uppercase">Invite Member</h3>
						<input
							bind:value={inviteUserId}
							class="w-full rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
							placeholder="User ID"
							type="text"
						/>
						<select
							bind:value={inviteRole}
							class="w-full rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
						>
							{#each ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as role}
								<option value={role}>{role}</option>
							{/each}
						</select>
						<button class="w-full rounded-[8px] bg-secondary px-3 py-2 text-sm font-semibold text-white" type="submit">Add member</button>
					</form>
				{/if}
			</section>

			<div class="col-span-8 space-y-4">
				<MemberList workspaceId={selectedWorkspaceId} on:changed={loadWorkspaceData} />
				<WorkloadView items={workload} />
			</div>
		</div>
	</section>
</MainLayout>
