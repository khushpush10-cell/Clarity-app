<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	import { apiRequest } from '$lib/utils/http';

	export interface TeamMemberItem {
		userId: string;
		name: string;
		email: string;
		role: string;
		joinedAt: string;
	}

	let { workspaceId, className = '' } = $props<{ workspaceId: string | null; className?: string }>();
	let items = $state([] as TeamMemberItem[]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	const LOCAL_TEAM_KEY = 'clarity_local_team_v1';

	const dispatch = createEventDispatcher<{ changed: void }>();

	onMount(() => { void loadMembers(); });
	$effect(() => { if (workspaceId) void loadMembers(); });

	function readLocalMembers() {
		if (!workspaceId) return [];
		try {
			const raw = localStorage.getItem(LOCAL_TEAM_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw) as {
				membersByWorkspace?: Record<
					string,
					Array<{ userId: string; role: string; user: { name: string; email?: string } }>
				>;
			};
			const fromWorkspace = parsed.membersByWorkspace?.[workspaceId] ?? [];
			return fromWorkspace.map((entry) => ({
				userId: entry.userId,
				name: entry.user?.name ?? entry.userId,
				email: entry.user?.email ?? '-',
				role: entry.role,
				joinedAt: new Date().toISOString()
			}));
		} catch {
			return [];
		}
	}

	function removeMemberLocal(userId: string) {
		if (!workspaceId) return;
		try {
			const raw = localStorage.getItem(LOCAL_TEAM_KEY);
			const parsed = raw
				? (JSON.parse(raw) as {
						membersByWorkspace?: Record<
							string,
							Array<{ userId: string; role: string; user: { name: string; email?: string } }>
						>;
				  })
				: { membersByWorkspace: {} };
			const current = parsed.membersByWorkspace?.[workspaceId] ?? [];
			const next = current.filter((entry) => entry.userId !== userId);
			const updated = {
				...parsed,
				membersByWorkspace: {
					...(parsed.membersByWorkspace ?? {}),
					[workspaceId]: next
				}
			};
			localStorage.setItem(LOCAL_TEAM_KEY, JSON.stringify(updated));
		} catch {
			// Ignore malformed local data
		}
	}

	async function loadMembers() {
		if (!workspaceId) { items = []; return; }
		loading = true; error = null;
		try {
			const result = await apiRequest<{ items?: Array<{ userId: string; role: string; joinedAt: string; user?: { name?: string; email?: string } }>; error?: string; }>(`/api/workspaces/${workspaceId}/members`);
			if (!result.ok) {
				items = readLocalMembers();
				error = 'Using offline mode (local browser storage)';
				return;
			}
			items = (result.data?.items ?? []).map((entry) => ({ userId: entry.userId, name: entry.user?.name ?? 'Unknown', email: entry.user?.email ?? '-', role: entry.role, joinedAt: entry.joinedAt }));
		} catch {
			items = readLocalMembers();
			error = 'Using offline mode (local browser storage)';
		}
		finally { loading = false; }
	}

	async function removeMember(userId: string) {
		if (!workspaceId) return;
		const ok = confirm('Remove this member?'); if (!ok) return;
		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });
		if (!result.ok) {
			removeMemberLocal(userId);
			items = items.filter((item) => item.userId !== userId);
			error = 'Updated locally. Connect database to sync with server.';
			dispatch('changed');
			return;
		}
		dispatch('changed');
		await loadMembers();
	}
</script>

<section class={`app-card p-4 ${className}`}>
	<h2 class="text-sm font-semibold text-text-primary">Members</h2>
	{#if error}<p class="mt-3 rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-xs text-warning">{error}</p>{/if}
	{#if loading}
		<p class="mt-3 text-sm text-text-secondary">Loading members...</p>
	{:else if items.length === 0}
		<div class="empty-state mt-3"><p class="text-sm">No members found yet. Invite teammates to collaborate.</p></div>
	{:else}
		<div class="mt-3 space-y-2">
			{#each items as item (item.userId)}
				<div class="muted-panel flex items-center justify-between px-3 py-2">
					<div><p class="text-sm font-medium text-text-primary">{item.name}</p><p class="text-xs text-text-secondary">{item.email}</p></div>
					<div class="flex items-center gap-2">
						<span class="rounded-full bg-secondary-tint px-2 py-1 text-xs uppercase text-secondary">{item.role}</span>
						{#if item.role !== 'OWNER'}<button class="rounded-full bg-danger px-2 py-1 text-xs text-white" onclick={() => removeMember(item.userId)} type="button">Remove</button>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
