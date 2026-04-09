<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { apiRequest } from '$lib/utils/http';

	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	let profile = $state({
		name: '',
		email: '',
		avatarUrl: ''
	});

	let sessions = $state(
		[] as Array<{
			id: string;
			userAgent: string | null;
			ipAddress: string | null;
			lastSeenAt: string;
			expiresAt: string;
		}>
	);

	let twoFactorEnabled = $state(false);
	let backupCodes = $state([] as string[]);
	let autoLogoutMinutes = $state(120);

	let exportFormat = $state<'json' | 'csv'>('json');
	let importText = $state('');

	onMount(() => {
		autoLogoutMinutes = Number(localStorage.getItem('clarity_auto_logout_minutes') ?? '120');
		void loadMe();
		void loadSessions();
	});

	async function loadMe() {
		loading = true;
		error = null;
		const result = await apiRequest<{ user?: { name: string; email: string; avatarUrl: string | null }; error?: string }>(
			'/api/users/me'
		);
		if (!result.ok || !result.data?.user) {
			error = result.error ?? 'Unable to load profile';
			loading = false;
			return;
		}

		profile = {
			name: result.data.user.name,
			email: result.data.user.email,
			avatarUrl: result.data.user.avatarUrl ?? ''
		};
		loading = false;
	}

	async function loadSessions() {
		const result = await apiRequest<{ sessions?: typeof sessions; error?: string }>('/api/users/sessions');
		if (!result.ok) return;
		sessions = result.data?.sessions ?? [];
	}

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		const result = await apiRequest<{ user?: unknown; error?: string }>('/api/users/me', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name: profile.name,
				avatarUrl: profile.avatarUrl || null
			})
		});

		if (!result.ok) {
			error = result.error ?? 'Unable to save profile';
			saving = false;
			return;
		}

		notifications.push({
			id: crypto.randomUUID(),
			type: 'success',
			title: 'Profile updated',
			message: 'Your settings were saved successfully.'
		});
		saving = false;
	}

	async function removeSession(sessionId: string) {
		const result = await apiRequest<{ success?: boolean; error?: string }>(`/api/users/sessions/${sessionId}`, {
			method: 'DELETE'
		});
		if (!result.ok) {
			error = result.error ?? 'Unable to remove session';
			return;
		}
		await loadSessions();
	}

	async function logoutOtherDevices() {
		const result = await apiRequest<{ removed?: number; error?: string }>('/api/users/sessions/others', {
			method: 'DELETE'
		});
		if (!result.ok) {
			error = result.error ?? 'Unable to logout other sessions';
			return;
		}

		notifications.push({
			id: crypto.randomUUID(),
			type: 'info',
			title: 'Sessions updated',
			message: `${result.data?.removed ?? 0} other sessions removed.`
		});
		await loadSessions();
	}

	async function enable2fa() {
		const result = await apiRequest<{ backupCodes?: string[]; error?: string }>('/api/auth/2fa/enable', {
			method: 'POST'
		});
		if (!result.ok) {
			error = result.error ?? 'Unable to enable 2FA';
			return;
		}

		twoFactorEnabled = true;
		backupCodes = result.data?.backupCodes ?? [];
	}

	async function disable2fa() {
		const result = await apiRequest<{ success?: boolean; error?: string }>('/api/auth/2fa/disable', {
			method: 'POST'
		});
		if (!result.ok) {
			error = result.error ?? 'Unable to disable 2FA';
			return;
		}

		twoFactorEnabled = false;
		backupCodes = [];
	}

	async function exportData() {
		const result = await apiRequest<Record<string, unknown>>(`/api/data/export?format=${exportFormat}`);
		if (!result.ok || !result.data) {
			error = result.error ?? 'Unable to export data';
			return;
		}

		const content = JSON.stringify(result.data, null, 2);
		await navigator.clipboard.writeText(content);
		notifications.push({
			id: crypto.randomUUID(),
			type: 'success',
			title: 'Export copied',
			message: 'Export payload copied to clipboard.'
		});
	}

	async function importData(event: SubmitEvent) {
		event.preventDefault();
		let parsed: unknown;
		try {
			parsed = JSON.parse(importText);
		} catch {
			error = 'Import text must be valid JSON';
			return;
		}

		const payload = (parsed as { data?: unknown }).data ?? parsed;
		const result = await apiRequest<{ imported?: { tasks?: number; habits?: number; goals?: number }; error?: string }>(
			'/api/data/import',
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			}
		);
		if (!result.ok) {
			error = result.error ?? 'Unable to import data';
			return;
		}

		notifications.push({
			id: crypto.randomUUID(),
			type: 'success',
			title: 'Import completed',
			message: `Tasks ${result.data?.imported?.tasks ?? 0}, Habits ${result.data?.imported?.habits ?? 0}, Goals ${result.data?.imported?.goals ?? 0}`
		});
		importText = '';
	}

	function saveAutoLogout() {
		localStorage.setItem('clarity_auto_logout_minutes', String(autoLogoutMinutes));
		notifications.push({
			id: crypto.randomUUID(),
			type: 'info',
			title: 'Preference saved',
			message: `Auto-logout set to ${autoLogoutMinutes} minutes.`
		});
	}

	async function deleteAccount() {
		const ok = confirm('Delete your account? This cannot be undone.');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>('/api/users/me', {
			method: 'DELETE'
		});
		if (!result.ok) {
			error = result.error ?? 'Unable to delete account';
			return;
		}

		window.location.href = '/auth/register';
	}
</script>

<MainLayout>
	<section class="space-y-4">
		<h1 class="text-2xl font-bold text-text-primary">Settings</h1>

		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">{error}</p>
		{/if}

		{#if loading}
			<p class="text-sm text-text-secondary">Loading settings...</p>
		{:else}
			<div class="grid grid-cols-12 gap-4">
				<section class="col-span-6 rounded-[8px] border border-border bg-surface p-4">
					<h2 class="text-sm font-semibold text-text-primary">Profile</h2>
					<form class="mt-3 space-y-3" onsubmit={saveProfile}>
						<div>
							<label class="mb-1 block text-xs text-text-secondary" for="settings-name">Name</label>
							<input id="settings-name" bind:value={profile.name} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" required type="text" />
						</div>
						<div>
							<label class="mb-1 block text-xs text-text-secondary" for="settings-email">Email</label>
							<input id="settings-email" bind:value={profile.email} class="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-sm" disabled type="email" />
						</div>
						<div>
							<label class="mb-1 block text-xs text-text-secondary" for="settings-avatar">Avatar URL</label>
							<input id="settings-avatar" bind:value={profile.avatarUrl} class="w-full rounded-[8px] border border-border px-3 py-2 text-sm" type="url" />
						</div>
						<button class="rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save profile'}</button>
					</form>
				</section>

				<section class="col-span-6 rounded-[8px] border border-border bg-surface p-4">
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-semibold text-text-primary">Security</h2>
						<button class="rounded-[8px] border border-border px-3 py-1.5 text-xs" onclick={logoutOtherDevices} type="button">Logout other devices</button>
					</div>

					<div class="mt-3 rounded-[8px] border border-border bg-background p-3">
						<p class="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
						<p class="mt-1 text-xs text-text-secondary">Status: {twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
						<div class="mt-2 flex gap-2">
							{#if twoFactorEnabled}
								<button class="rounded-[8px] bg-urgent px-3 py-2 text-xs font-semibold text-white" onclick={disable2fa} type="button">Disable 2FA</button>
							{:else}
								<button class="rounded-[8px] bg-success px-3 py-2 text-xs font-semibold text-white" onclick={enable2fa} type="button">Enable 2FA</button>
							{/if}
						</div>
						{#if backupCodes.length > 0}
							<div class="mt-3 rounded-[8px] border border-warning/30 bg-warning/10 p-2">
								<p class="text-xs font-semibold text-warning">Backup codes</p>
								<p class="mt-1 text-[11px] text-text-secondary">{backupCodes.join(', ')}</p>
							</div>
						{/if}
					</div>

					<div class="mt-3 rounded-[8px] border border-border bg-background p-3">
						<p class="text-sm font-medium text-text-primary">Auto logout</p>
						<div class="mt-2 flex items-center gap-2">
							<input bind:value={autoLogoutMinutes} class="w-24 rounded-[8px] border border-border px-2 py-1 text-sm" min="5" type="number" />
							<button class="rounded-[8px] border border-border px-3 py-1.5 text-xs" onclick={saveAutoLogout} type="button">Save</button>
						</div>
					</div>
				</section>

				<section class="col-span-12 rounded-[8px] border border-border bg-surface p-4">
					<h2 class="text-sm font-semibold text-text-primary">Active Sessions</h2>
					<div class="mt-3 space-y-2">
						{#if sessions.length === 0}
							<p class="text-sm text-text-secondary">No active sessions.</p>
						{:else}
							{#each sessions as session (session.id)}
								<div class="flex items-center justify-between rounded-[8px] border border-border bg-background px-3 py-2">
									<div>
										<p class="text-sm text-text-primary">{session.userAgent ?? 'Unknown device'}</p>
										<p class="text-xs text-text-secondary">{session.ipAddress ?? '-'} | Last seen: {new Date(session.lastSeenAt).toLocaleString()}</p>
									</div>
									<button class="rounded-[8px] bg-urgent px-2 py-1 text-xs text-white" onclick={() => removeSession(session.id)} type="button">Remove</button>
								</div>
							{/each}
						{/if}
					</div>
				</section>

				<section class="col-span-6 rounded-[8px] border border-border bg-surface p-4">
					<h2 class="text-sm font-semibold text-text-primary">Data Export</h2>
					<div class="mt-3 flex items-center gap-2">
						<select bind:value={exportFormat} class="rounded-[8px] border border-border px-3 py-2 text-sm">
							<option value="json">JSON</option>
							<option value="csv">CSV</option>
						</select>
						<button class="rounded-[8px] bg-primary px-3 py-2 text-sm font-semibold text-white" onclick={exportData} type="button">Export and copy</button>
					</div>
				</section>

				<section class="col-span-6 rounded-[8px] border border-border bg-surface p-4">
					<h2 class="text-sm font-semibold text-text-primary">Data Import</h2>
					<form class="mt-3 space-y-2" onsubmit={importData}>
						<textarea bind:value={importText} class="h-28 w-full rounded-[8px] border border-border px-3 py-2 text-xs" placeholder="Paste export JSON payload"></textarea>
						<button class="rounded-[8px] bg-secondary px-3 py-2 text-sm font-semibold text-white" type="submit">Import</button>
					</form>
				</section>

				<section class="col-span-12 rounded-[8px] border border-urgent/30 bg-urgent/10 p-4">
					<h2 class="text-sm font-semibold text-urgent">Danger Zone</h2>
					<button class="mt-3 rounded-[8px] bg-urgent px-3 py-2 text-sm font-semibold text-white" onclick={deleteAccount} type="button">Delete account</button>
				</section>
			</div>
		{/if}
	</section>
</MainLayout>
