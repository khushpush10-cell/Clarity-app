<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import Icon from '$lib/components/ui/Icon.svelte';
	import { apiRequest } from '$lib/utils/http';

	let query = $state('');
	let unread = $state(0);
	let notificationOpen = $state(false);
	let isDark = $state(false);
	let notifications = $state(
		[] as Array<{ id: string; title: string; message: string; read: boolean; link: string | null }>
	);
	const LOCAL_NOTIFICATIONS_KEY = 'clarity_local_notifications_v1';

	onMount(() => {
		isDark = (document.documentElement.getAttribute('data-theme') ?? localStorage.getItem('clarity_theme')) === 'dark';
		const localItems = readLocalNotifications();
		if (localItems.length > 0) {
			notifications = localItems;
			unread = localItems.filter((item) => !item.read).length;
		}
		void loadNotifications();
	});

	function readLocalNotifications() {
		try {
			const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
			return raw
				? (JSON.parse(raw) as Array<{ id: string; title: string; message: string; read: boolean; link: string | null }>)
				: [];
		} catch {
			return [];
		}
	}

	function writeLocalNotifications(
		items: Array<{ id: string; title: string; message: string; read: boolean; link: string | null }>
	) {
		localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(items));
	}

	async function loadNotifications() {
		const result = await apiRequest<{ items?: typeof notifications; unread?: number; error?: string }>('/api/notifications');
		if (!result.ok) {
			const local = readLocalNotifications();
			if (local.length === 0) {
				const seeded = [
					{
						id: crypto.randomUUID(),
						title: 'Welcome to Clarity',
						message: 'Create your first task and organize it with labels when you are ready.',
						read: false,
						link: '/tasks'
					}
				];
				notifications = seeded;
				unread = seeded.length;
				writeLocalNotifications(seeded);
				return;
			}
			notifications = local;
			unread = local.filter((item) => !item.read).length;
			return;
		}

		notifications = result.data?.items ?? [];
		unread = result.data?.unread ?? 0;
		writeLocalNotifications(notifications);
	}

	async function openNotification(item: { id: string; link: string | null }) {
		const result = await apiRequest(`/api/notifications/${item.id}/read`, { method: 'POST' });
		if (!result.ok) {
			const next = readLocalNotifications().map((entry) =>
				entry.id === item.id ? { ...entry, read: true } : entry
			);
			notifications = next;
			unread = next.filter((entry) => !entry.read).length;
			writeLocalNotifications(next);
		}
		notificationOpen = false;
		await loadNotifications();
		if (item.link) {
			await goto(item.link);
		}
	}

	async function readAll() {
		const result = await apiRequest('/api/notifications/read-all', { method: 'POST' });
		if (!result.ok) {
			const next = readLocalNotifications().map((entry) => ({ ...entry, read: true }));
			notifications = next;
			unread = 0;
			writeLocalNotifications(next);
			return;
		}
		await loadNotifications();
	}

	async function onSearchKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		const value = query.trim();
		if (!value) return;
		await goto(`/tasks?search=${encodeURIComponent(value)}`);
	}

	function toggleTheme() {
		const root = document.documentElement;
		const current = root.getAttribute('data-theme') ?? 'light';
		const next = current === 'dark' ? 'light' : 'dark';
		root.setAttribute('data-theme', next);
		localStorage.setItem('clarity_theme', next);
		isDark = next === 'dark';
	}

	let userOpen = $state(false);
	const userName = $derived(page.data.user?.name ?? page.data.user?.email ?? 'Guest workspace');
	const userEmail = $derived(page.data.user?.email ?? 'Local profile');
	const initials = $derived(
		userName
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase() || 'C'
	);
</script>

<header
	class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-surface px-3 md:px-4 lg:px-6"
>
	<div class="w-full max-w-2xl">
		<input
			bind:value={query}
			aria-label="Global search"
			class="w-full rounded-full border border-border bg-surface-2 px-4 py-2 text-sm outline-none"
			placeholder="Search tasks and labels..."
			onkeydown={onSearchKeydown}
			type="search"
		/>
	</div>
	<div class="relative ml-3 flex items-center gap-2 text-sm text-text-secondary md:ml-6 md:gap-3">
		<button
			aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			class="inline-flex h-9 w-16 items-center rounded-full border border-border bg-surface-2 p-1 text-text-primary transition"
			onclick={toggleTheme}
			type="button"
		>
			<span class={`grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary transition ${isDark ? 'translate-x-7' : 'translate-x-0'}`}>
				{#if isDark}
					<Icon name="moon" size={15} />
				{:else}
					<Icon name="sun" size={15} />
				{/if}
			</span>
		</button>

		<div class="relative">
			<button
				aria-label="Notifications"
				class="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-text-primary"
				onclick={() => (notificationOpen = !notificationOpen)}
				type="button"
			>
				<Icon name="bell" size={17} />
				{#if unread > 0}
					<span class="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-attention text-[10px] text-white">{unread}</span>
				{/if}
			</button>
			{#if notificationOpen}
				<div class="absolute right-0 z-20 mt-2 w-80 rounded-[14px] border border-border bg-surface p-3 shadow-lg">
					<div class="mb-2 flex items-center justify-between">
						<p class="text-xs font-semibold tracking-[0.06em] text-text-secondary uppercase">Notifications</p>
						<button aria-label="Mark all notifications read" class="grid h-7 w-7 place-items-center rounded-full border border-border text-primary" onclick={readAll} type="button"><Icon name="check" size={14} /></button>
					</div>
					<div class="max-h-80 space-y-2 overflow-auto">
						{#if notifications.length === 0}
							<p class="text-xs text-text-secondary">No notifications</p>
						{:else}
							{#each notifications as item (item.id)}
								<button
									class={`w-full rounded-[14px] border px-3 py-2 text-left ${item.read ? 'border-border bg-surface-2' : 'border-secondary bg-secondary-tint'}`}
									onclick={() => openNotification(item)}
									type="button"
								>
									<p class="text-sm font-medium text-text-primary">{item.title}</p>
									<p class="mt-1 text-xs text-text-secondary">{item.message}</p>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<div class="relative">
			<button
				aria-expanded={userOpen}
				aria-haspopup="menu"
				class="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-text-primary"
				onclick={() => (userOpen = !userOpen)}
				type="button"
			>
				<span class="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-on-primary">
					{initials}
				</span>
			</button>
			{#if userOpen}
				<div
					class="absolute right-0 z-20 mt-2 w-64 rounded-[14px] border border-border bg-surface p-3 shadow-lg"
					role="menu"
				>
					<p class="truncate text-sm font-semibold text-text-primary">{userName}</p>
					<p class="truncate text-xs text-text-secondary">{userEmail}</p>
					<div class="mt-3 space-y-1">
						<a class="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm hover:bg-surface-2" href="/settings" role="menuitem"><Icon name="user" size={15} /> Profile settings</a>
						<a class="block rounded-[10px] px-3 py-2 text-sm hover:bg-surface-2" href="/settings?section=appearance" role="menuitem">Appearance</a>
					</div>
				</div>
			{/if}
		</div>
	</div>
</header>
