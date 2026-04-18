<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import MemberList from '$lib/components/team/MemberList.svelte';
	import WorkloadView, { type WorkloadItem } from '$lib/components/team/WorkloadView.svelte';
	import { apiRequest } from '$lib/utils/http';

	interface WorkspaceItem { id: string; name: string; type: string; }
	interface TaskItem {
		id: string;
		workspaceId: string;
		title: string;
		status: 'TODO' | 'IN_PROGRESS' | 'DONE';
		assigneeId: string | null;
	}
	interface MemberItem {
		userId: string;
		role: string;
		user: { name: string };
	}

	interface LocalTeamState {
		workspaces: WorkspaceItem[];
		membersByWorkspace: Record<string, MemberItem[]>;
	}

	const LOCAL_TEAM_KEY = 'clarity_local_team_v1';
	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';

	let workspaces = $state([] as WorkspaceItem[]);
	let selectedWorkspaceId = $state<string | null>(null);
	let workload = $state([] as WorkloadItem[]);
	let members = $state([] as MemberItem[]);
	let error = $state<string | null>(null);
	let loading = $state(false);

	let workspaceName = $state('');
	let inviteUserId = $state('');
	let inviteRole = $state('MEMBER');

	onMount(() => { void loadWorkspaces(); });

	function readLocalState(): LocalTeamState {
		try {
			const raw = localStorage.getItem(LOCAL_TEAM_KEY);
			return raw
				? (JSON.parse(raw) as LocalTeamState)
				: { workspaces: [], membersByWorkspace: {} };
		} catch {
			return { workspaces: [], membersByWorkspace: {} };
		}
	}

	function writeLocalState(next: LocalTeamState) {
		localStorage.setItem(LOCAL_TEAM_KEY, JSON.stringify(next));
	}

	function readLocalTasks(): TaskItem[] {
		try {
			const raw = localStorage.getItem(LOCAL_TASKS_KEY);
			return raw ? (JSON.parse(raw) as TaskItem[]) : [];
		} catch {
			return [];
		}
	}

	function buildWorkload(membersInput: MemberItem[], tasks: TaskItem[]) {
		const map = new Map<string, WorkloadItem>();
		for (const member of membersInput) {
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

	async function loadWorkspaces() {
		loading = true; error = null;
		try {
			const result = await apiRequest<{ items?: WorkspaceItem[]; error?: string }>('/api/workspaces');
			if (!result.ok) {
				const local = readLocalState();
				workspaces = local.workspaces;
				error = 'Using offline mode (local browser storage)';
			} else {
				workspaces = result.data?.items ?? [];
			}
			if (!selectedWorkspaceId) {
				const firstWorkspace = workspaces.at(0);
				if (firstWorkspace) selectedWorkspaceId = firstWorkspace.id;
			}
			await loadWorkspaceData();
		} catch {
			const local = readLocalState();
			workspaces = local.workspaces;
			error = 'Using offline mode (local browser storage)';
			if (!selectedWorkspaceId) {
				const firstWorkspace = workspaces.at(0);
				if (firstWorkspace) selectedWorkspaceId = firstWorkspace.id;
			}
			await loadWorkspaceData();
		}
		finally { loading = false; }
	}

	$effect(() => { if (selectedWorkspaceId) void loadWorkspaceData(); });

	async function loadWorkspaceData() {
		if (!selectedWorkspaceId) return;
		const [membersResult, tasksResult] = await Promise.all([
			apiRequest<{ items?: MemberItem[]; error?: string }>(`/api/workspaces/${selectedWorkspaceId}/members`),
			apiRequest<{ items?: TaskItem[]; error?: string }>(`/api/tasks?workspaceId=${selectedWorkspaceId}&pageSize=100`)
		]);

		if (!membersResult.ok || !tasksResult.ok) {
			const local = readLocalState();
			members = local.membersByWorkspace[selectedWorkspaceId] ?? [];
			const localTasks = readLocalTasks().filter((task) => task.workspaceId === selectedWorkspaceId);
			buildWorkload(members, localTasks);
			error = 'Using offline mode (local browser storage)';
			return;
		}

		members = membersResult.data?.items ?? [];
		const tasks: TaskItem[] = tasksResult.data?.items ?? [];
		buildWorkload(members, tasks);
	}

	async function createWorkspace(event: SubmitEvent) {
		event.preventDefault();
		if (!workspaceName.trim()) return;
		const result = await apiRequest<{ item?: WorkspaceItem; error?: string }>('/api/workspaces', {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: workspaceName, type: 'TEAM' })
		});
		if (!result.ok) {
			const local = readLocalState();
			const created: WorkspaceItem = {
				id: crypto.randomUUID(),
				name: workspaceName.trim(),
				type: 'TEAM'
			};
			const nextState: LocalTeamState = {
				workspaces: [created, ...local.workspaces],
				membersByWorkspace: local.membersByWorkspace
			};
			writeLocalState(nextState);
			workspaces = nextState.workspaces;
			selectedWorkspaceId = created.id;
			workspaceName = '';
			error = 'Saved locally. Connect database to sync with server.';
			await loadWorkspaceData();
			return;
		}
		workspaceName = '';
		await loadWorkspaces();
	}

	async function addMember(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedWorkspaceId) return;
		const result = await apiRequest<{ item?: unknown; error?: string }>(`/api/workspaces/${selectedWorkspaceId}/members`, {
			method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: inviteUserId.trim(), role: inviteRole })
		});
		if (!result.ok) {
			const local = readLocalState();
			const created: MemberItem = {
				userId: inviteUserId.trim() || crypto.randomUUID(),
				role: inviteRole,
				user: { name: inviteUserId.trim() || 'New Member' }
			};
			const existing = local.membersByWorkspace[selectedWorkspaceId] ?? [];
			const nextState: LocalTeamState = {
				workspaces: local.workspaces,
				membersByWorkspace: {
					...local.membersByWorkspace,
					[selectedWorkspaceId]: [created, ...existing.filter((member) => member.userId !== created.userId)]
				}
			};
			writeLocalState(nextState);
			inviteUserId = '';
			inviteRole = 'MEMBER';
			error = 'Saved locally. Connect database to sync with server.';
			await loadWorkspaceData();
			return;
		}
		inviteUserId = ''; inviteRole = 'MEMBER';
		await loadWorkspaceData();
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<h1 class="text-3xl font-semibold text-text-primary">Team</h1>
		<p class="text-sm text-text-secondary">Create a workspace for shared planning, assign members, and monitor balanced workloads.</p>
		{#if error}<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>{/if}

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
			<section class="app-card p-4 xl:col-span-4">
				<h2 class="text-sm font-semibold text-text-primary">Workspaces</h2>
				<form class="mt-3 flex gap-2" onsubmit={createWorkspace}>
					<input bind:value={workspaceName} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="New team workspace" type="text" />
					<button class="rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary" type="submit">Add</button>
				</form>

				<div class="mt-3 space-y-2">
					{#if loading}
						<p class="text-sm text-text-secondary">Loading...</p>
					{:else if workspaces.length === 0}
						<div class="empty-state"><p class="text-sm">No workspaces yet. Create your first team space.</p></div>
					{:else}
						{#each workspaces as workspace (workspace.id)}
							<button class={`w-full rounded-[14px] border px-3 py-2 text-left text-sm ${selectedWorkspaceId === workspace.id ? 'border-secondary bg-secondary-tint text-secondary' : 'border-border bg-surface-2 text-text-primary'}`} onclick={() => (selectedWorkspaceId = workspace.id)} type="button">{workspace.name}</button>
						{/each}
					{/if}
				</div>

				{#if selectedWorkspaceId}
					<form class="mt-4 space-y-2 border-t border-border pt-4" onsubmit={addMember}>
						<h3 class="text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Invite member</h3>
						<input bind:value={inviteUserId} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="User ID" type="text" />
						<select bind:value={inviteRole} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm">{#each ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as role}<option value={role}>{role}</option>{/each}</select>
						<button class="w-full rounded-[14px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary" type="submit">Add member</button>
					</form>
				{/if}
			</section>

			<div class="space-y-4 xl:col-span-8">
				<MemberList workspaceId={selectedWorkspaceId} on:changed={loadWorkspaceData} />
				<WorkloadView items={workload} />
			</div>
		</div>
	</section>
</MainLayout>
