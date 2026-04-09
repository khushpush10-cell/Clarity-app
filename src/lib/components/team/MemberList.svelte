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

	const dispatch = createEventDispatcher<{ changed: void }>();

	onMount(() => {
		void loadMembers();
	});

	$effect(() => {
		if (workspaceId) void loadMembers();
	});

	async function loadMembers() {
		if (!workspaceId) {
			items = [];
			return;
		}

		loading = true;
		error = null;

		try {
			const result = await apiRequest<{
				items?: Array<{ userId: string; role: string; joinedAt: string; user?: { name?: string; email?: string } }>;
				error?: string;
			}>(`/api/workspaces/${workspaceId}/members`);
			if (!result.ok) {
				error = result.error ?? 'Unable to load members';
				return;
			}

			items = (result.data?.items ?? []).map((entry) => ({
				userId: entry.userId,
				name: entry.user?.name ?? 'Unknown',
				email: entry.user?.email ?? '-',
				role: entry.role,
				joinedAt: entry.joinedAt
			}));
		} catch {
			error = 'Unable to load members';
		} finally {
			loading = false;
		}
	}

	async function removeMember(userId: string) {
		if (!workspaceId) return;
		const ok = confirm('Remove this member?');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>(
			`/api/workspaces/${workspaceId}/members/${userId}`,
			{ method: 'DELETE' }
		);
		if (!result.ok) {
			error = result.error ?? 'Unable to remove member';
			return;
		}

		dispatch('changed');
		await loadMembers();
	}
</script>

<section class={`rounded-[8px] border border-border bg-surface p-4 ${className}`}>
	<h2 class="text-sm font-semibold text-text-primary">Members</h2>

	{#if error}
		<p class="mt-3 rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-xs text-urgent">{error}</p>
	{/if}

	{#if loading}
		<p class="mt-3 text-sm text-text-secondary">Loading members...</p>
	{:else if items.length === 0}
		<p class="mt-3 text-sm text-text-secondary">No members found.</p>
	{:else}
		<div class="mt-3 space-y-2">
			{#each items as item (item.userId)}
				<div class="flex items-center justify-between rounded-[8px] border border-border bg-background px-3 py-2">
					<div>
						<p class="text-sm font-medium text-text-primary">{item.name}</p>
						<p class="text-xs text-text-secondary">{item.email}</p>
					</div>
					<div class="flex items-center gap-2">
						<span class="rounded-[8px] border border-border px-2 py-1 text-xs uppercase">{item.role}</span>
						{#if item.role !== 'OWNER'}
							<button
								class="rounded-[8px] bg-urgent px-2 py-1 text-xs text-white"
								onclick={() => removeMember(item.userId)}
								type="button"
							>
								Remove
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
