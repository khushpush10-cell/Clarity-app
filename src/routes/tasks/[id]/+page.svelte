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
	let attachments = $state([] as Array<{ id: string; name: string; url: string; createdAt: string }>);
	let attachmentName = $state('');
	let attachmentUrl = $state('');
	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';
	const LOCAL_COMMENTS_KEY = 'clarity_local_task_comments_v1';
	const LOCAL_ATTACHMENTS_KEY = 'clarity_local_task_attachments_v1';
	const LOCAL_ACTIVITY_KEY = 'clarity_local_task_activity_v1';

	onMount(async () => {
		await Promise.all([loadTask(), loadActivity(), loadAttachments()]);
	});

	function readLocalTasks() {
		try {
			const raw = localStorage.getItem(LOCAL_TASKS_KEY);
			return raw
				? (JSON.parse(raw) as Array<{
						id: string;
						title: string;
						description: string | null;
						status: string;
						priority: string;
					}>)
				: [];
		} catch {
			return [];
		}
	}

	function readLocalMap<T>(key: string): Record<string, T[]> {
		try {
			const raw = localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as Record<string, T[]>) : {};
		} catch {
			return {};
		}
	}

	function writeLocalMap<T>(key: string, next: Record<string, T[]>) {
		localStorage.setItem(key, JSON.stringify(next));
	}

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
				const local = readLocalTasks().find((task) => task.id === params.id) ?? null;
				if (local) {
					item = local;
					error = 'Using offline mode (local browser storage)';
					return;
				}
				error = result.error ?? 'Unable to load task';
				return;
			}

			item = result.data.item;
		} catch {
			const local = readLocalTasks().find((task) => task.id === params.id) ?? null;
			if (local) {
				item = local;
				error = 'Using offline mode (local browser storage)';
			} else {
				error = 'Unable to load task';
			}
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
		if (!result.ok) {
			const localComments = readLocalMap<(typeof comments)[number]>(LOCAL_COMMENTS_KEY);
			const localActivity = readLocalMap<(typeof activity)[number]>(LOCAL_ACTIVITY_KEY);
			comments = localComments[params.id] ?? [];
			activity = localActivity[params.id] ?? [];
			return;
		}

		comments = result.data?.comments ?? [];
		activity = result.data?.audit ?? [];
	}

	async function loadAttachments() {
		const result = await apiRequest<{ items?: typeof attachments; error?: string }>(
			`/api/tasks/${params.id}/attachments`
		);
		if (!result.ok) {
			const localAttachments = readLocalMap<(typeof attachments)[number]>(LOCAL_ATTACHMENTS_KEY);
			attachments = localAttachments[params.id] ?? [];
			return;
		}
		attachments = result.data?.items ?? [];
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
			const localComments = readLocalMap<(typeof comments)[number]>(LOCAL_COMMENTS_KEY);
			const localActivity = readLocalMap<(typeof activity)[number]>(LOCAL_ACTIVITY_KEY);
			const createdAt = new Date().toISOString();
			const commentItem = {
				id: crypto.randomUUID(),
				content,
				createdAt,
				user: { name: 'You', avatarUrl: null }
			};
			const auditItem = {
				id: crypto.randomUUID(),
				action: 'Comment added',
				createdAt,
				user: { name: 'You', avatarUrl: null }
			};
			const nextComments = [commentItem, ...(localComments[params.id] ?? [])];
			const nextAudit = [auditItem, ...(localActivity[params.id] ?? [])];
			writeLocalMap(LOCAL_COMMENTS_KEY, { ...localComments, [params.id]: nextComments });
			writeLocalMap(LOCAL_ACTIVITY_KEY, { ...localActivity, [params.id]: nextAudit });
			comments = nextComments;
			activity = nextAudit;
			error = 'Saved locally. Connect database to sync with server.';
			newComment = '';
			return;
		}

		newComment = '';
		await loadActivity();
	}

	async function submitAttachment(event: SubmitEvent) {
		event.preventDefault();
		const name = attachmentName.trim();
		const url = attachmentUrl.trim();
		if (!name || !url) return;

		const result = await apiRequest<{ item?: unknown; error?: string }>(`/api/tasks/${params.id}/attachments`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, url })
		});
		if (!result.ok) {
			const localAttachments = readLocalMap<(typeof attachments)[number]>(LOCAL_ATTACHMENTS_KEY);
			const created = {
				id: crypto.randomUUID(),
				name,
				url,
				createdAt: new Date().toISOString()
			};
			const next = [created, ...(localAttachments[params.id] ?? [])];
			writeLocalMap(LOCAL_ATTACHMENTS_KEY, { ...localAttachments, [params.id]: next });
			attachments = next;
			error = 'Saved locally. Connect database to sync with server.';
			attachmentName = '';
			attachmentUrl = '';
			return;
		}

		attachmentName = '';
		attachmentUrl = '';
		await loadAttachments();
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

			<section class="col-span-5 space-y-4">
				<div class="rounded-[8px] border border-border bg-surface p-4">
					<h2 class="text-sm font-semibold text-text-primary">Attachments</h2>
					<form class="mt-3 space-y-2" onsubmit={submitAttachment}>
						<input bind:value={attachmentName} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" placeholder="File name" type="text" />
						<input bind:value={attachmentUrl} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" placeholder="File URL" type="url" />
						<button class="rounded-[8px] bg-secondary px-3 py-2 text-xs font-semibold text-white" type="submit">Add attachment</button>
					</form>
					<div class="mt-3 space-y-2">
						{#if attachments.length === 0}
							<p class="text-sm text-text-secondary">No attachments yet.</p>
						{:else}
							{#each attachments as attachment (attachment.id)}
								<div class="rounded-[8px] border border-border bg-background p-3">
									<p class="text-sm font-medium text-text-primary">{attachment.name}</p>
									<a class="text-xs text-secondary" href={attachment.url} target="_blank" rel="noreferrer">{attachment.url}</a>
								</div>
							{/each}
						{/if}
					</div>
				</div>

				<div class="rounded-[8px] border border-border bg-surface p-4">
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
				</div>
			</section>
		</div>
	</section>
</MainLayout>
