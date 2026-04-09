<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { apiRequest } from '$lib/utils/http';

	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let item = $state<{
		id: string;
		title: string;
		description: string | null;
		status: string;
		priority: string;
	} | null>(null);

	let comments = $state(
		[] as Array<{ id: string; content: string; createdAt: string; user: { name: string; avatarUrl: string | null } }>
	);
	let activity = $state(
		[] as Array<{ id: string; action: string; createdAt: string; user: { name: string; avatarUrl: string | null } }>
	);
	let newComment = $state('');

	onMount(async () => {
		await Promise.all([loadTask(), loadActivity()]);
	});

	async function loadTask() {
		loading = true;
		error = null;
		try {
			const result = await apiRequest<{
				item?: {
					id: string;
					title: string;
					description: string | null;
					status: string;
					priority: string;
				};
				error?: string;
			}>(`/api/tasks/${params.id}`);

			if (!result.ok || !result.data?.item) {
				error = result.error ?? 'Unable to load task';
				return;
			}

			item = result.data.item;
		} catch {
			error = 'Unable to load task';
		} finally {
			loading = false;
		}
	}

	async function loadActivity() {
		const result = await apiRequest<{
			comments?: Array<{ id: string; content: string; createdAt: string; user: { name: string; avatarUrl: string | null } }>;
			audit?: Array<{ id: string; action: string; createdAt: string; user: { name: string; avatarUrl: string | null } }>;
			error?: string;
		}>(`/api/tasks/${params.id}/activity`);
		if (!result.ok) return;

		comments = result.data?.comments ?? [];
		activity = result.data?.audit ?? [];
	}

	async function submitComment(event: SubmitEvent) {
		event.preventDefault();
		const content = newComment.trim();
		if (!content) return;

		const result = await apiRequest<{ item?: unknown; error?: string }>(`/api/tasks/${params.id}/comments`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ content })
		});
		if (!result.ok) {
			error = result.error ?? 'Unable to add comment';
			return;
		}

		newComment = '';
		await loadActivity();
	}
</script>

<MainLayout>
	<section class="mx-auto mt-4 max-w-5xl space-y-4">
		<section class="rounded-[8px] border border-border bg-surface p-6">
			{#if loading}
				<p class="text-sm text-text-secondary">Loading task...</p>
			{:else if error}
				<p class="text-sm text-urgent">{error}</p>
			{:else if item}
				<h1 class="text-xl font-bold">{item.title}</h1>
				{#if item.description}
					<p class="mt-3 text-text-secondary">{item.description}</p>
				{/if}
				<div class="mt-4 flex gap-3 text-xs">
					<span class="rounded-[8px] bg-background px-2 py-1">{item.status}</span>
					<span>{item.priority}</span>
				</div>
			{/if}
		</section>

		<div class="grid grid-cols-12 gap-4">
			<section class="col-span-7 rounded-[8px] border border-border bg-surface p-4">
				<h2 class="text-sm font-semibold text-text-primary">Comments</h2>
				<form class="mt-3 flex gap-2" onsubmit={submitComment}>
					<input bind:value={newComment} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" placeholder="Write a comment (@mention supported in plain text)" type="text" />
					<button class="rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white" type="submit">Post</button>
				</form>
				<div class="mt-3 space-y-2">
					{#if comments.length === 0}
						<p class="text-sm text-text-secondary">No comments yet.</p>
					{:else}
						{#each comments as comment (comment.id)}
							<article class="rounded-[8px] border border-border bg-background p-3">
								<p class="text-sm text-text-primary">{comment.content}</p>
								<p class="mt-1 text-xs text-text-secondary">{comment.user.name} - {new Date(comment.createdAt).toLocaleString()}</p>
							</article>
						{/each}
					{/if}
				</div>
			</section>

			<section class="col-span-5 rounded-[8px] border border-border bg-surface p-4">
				<h2 class="text-sm font-semibold text-text-primary">Activity History</h2>
				<div class="mt-3 space-y-2">
					{#if activity.length === 0}
						<p class="text-sm text-text-secondary">No activity yet.</p>
					{:else}
						{#each activity as event (event.id)}
							<div class="rounded-[8px] border border-border bg-background p-3">
								<p class="text-sm font-medium text-text-primary">{event.action}</p>
								<p class="mt-1 text-xs text-text-secondary">{event.user.name} - {new Date(event.createdAt).toLocaleString()}</p>
							</div>
						{/each}
					{/if}
				</div>
			</section>
		</div>
	</section>
</MainLayout>
