<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { apiRequest } from '$lib/utils/http';

	type ThemeChoice = 'light' | 'dark';
	type PaletteChoice = 'default-calm' | 'cozy-autumn' | 'high-contrast';
	type FeatureNotifications = {
		tasks: boolean;
		habits: boolean;
		goals: boolean;
		analytics: boolean;
	};

	const NOTIFY_STORAGE_KEY = 'clarity_notification_preferences';
	const LOCAL_PROFILE_KEY = 'clarity_local_profile_v1';
	const LOCAL_SETTINGS_SESSIONS_KEY = 'clarity_local_sessions_v1';
	const LOCAL_SECURITY_KEY = 'clarity_local_security_v1';
	const LOCAL_GOALS_KEY = 'clarity_local_goals_v1';
	const LOCAL_HABITS_KEY = 'clarity_local_habits_v1';
	const LOCAL_TASKS_KEY = 'clarity_local_tasks_v1';

	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	let profile = $state({
		name: '',
		email: ''
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

	let themeChoice = $state<ThemeChoice>('light');
	let paletteChoice = $state<PaletteChoice>('default-calm');
	let notifyPrefs = $state<FeatureNotifications>({
		tasks: true,
		habits: true,
		goals: true,
		analytics: false
	});

	function readLocalProfile() {
		try {
			const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
			if (!raw) return null;
			return JSON.parse(raw) as typeof profile;
		} catch {
			return null;
		}
	}

	function writeLocalProfile(next: typeof profile) {
		localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(next));
	}

	function readLocalSessions() {
		try {
			const raw = localStorage.getItem(LOCAL_SETTINGS_SESSIONS_KEY);
			return raw ? (JSON.parse(raw) as typeof sessions) : [];
		} catch {
			return [];
		}
	}

	function writeLocalSessions(next: typeof sessions) {
		localStorage.setItem(LOCAL_SETTINGS_SESSIONS_KEY, JSON.stringify(next));
	}

	function readLocalSecurity() {
		try {
			const raw = localStorage.getItem(LOCAL_SECURITY_KEY);
			if (!raw) return { twoFactorEnabled: false, backupCodes: [] as string[] };
			return JSON.parse(raw) as { twoFactorEnabled: boolean; backupCodes: string[] };
		} catch {
			return { twoFactorEnabled: false, backupCodes: [] as string[] };
		}
	}

	function writeLocalSecurity(next: { twoFactorEnabled: boolean; backupCodes: string[] }) {
		localStorage.setItem(LOCAL_SECURITY_KEY, JSON.stringify(next));
	}

	function getLocalCounts() {
		const parseCount = (key: string) => {
			try {
				const raw = localStorage.getItem(key);
				return raw ? (JSON.parse(raw) as unknown[]).length : 0;
			} catch {
				return 0;
			}
		};
		return {
			tasks: parseCount(LOCAL_TASKS_KEY),
			habits: parseCount(LOCAL_HABITS_KEY),
			goals: parseCount(LOCAL_GOALS_KEY)
		};
	}

	onMount(() => {
		autoLogoutMinutes = Number(localStorage.getItem('clarity_auto_logout_minutes') ?? '120');
		themeChoice = (localStorage.getItem('clarity_theme') as ThemeChoice) ?? 'light';
		const savedPalette = localStorage.getItem('clarity_palette');
		paletteChoice =
			savedPalette === 'cozy-autumn' || savedPalette === 'high-contrast'
				? (savedPalette as PaletteChoice)
				: 'default-calm';
		const savedNotify = localStorage.getItem(NOTIFY_STORAGE_KEY);
		if (savedNotify) {
			try {
				notifyPrefs = { ...notifyPrefs, ...(JSON.parse(savedNotify) as Partial<FeatureNotifications>) };
			} catch {
				// Ignore malformed local data
			}
		}
		const localProfile = readLocalProfile();
		if (localProfile) {
			profile = localProfile;
		}
		const localSessions = readLocalSessions();
		if (localSessions.length > 0) {
			sessions = localSessions;
		}
		const localSecurity = readLocalSecurity();
		twoFactorEnabled = localSecurity.twoFactorEnabled;
		backupCodes = localSecurity.backupCodes;

		void loadMe();
		void loadSessions();
	});

async function loadMe() {
		loading = true;
		error = null;
		const result = await apiRequest<{
			user?: { name: string; email: string; avatarUrl: string | null };
			error?: string;
		}>('/api/users/me');
		if (!result.ok || !result.data?.user) {
			const local = readLocalProfile();
			if (local) {
				profile = local;
				error = 'Using offline mode (local browser storage)';
			} else {
				error = result.error ?? 'Unable to load profile';
			}
			loading = false;
			return;
		}

		profile = {
			name: result.data.user.name,
			email: result.data.user.email
		};
		writeLocalProfile(profile);
		loading = false;
	}

	async function loadSessions() {
		const result = await apiRequest<{ sessions?: typeof sessions; error?: string }>('/api/users/sessions');
		if (!result.ok) {
			sessions = readLocalSessions();
			return;
		}
		sessions = result.data?.sessions ?? [];
		writeLocalSessions(sessions);
	}

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		const result = await apiRequest<{ user?: unknown; error?: string }>('/api/users/me', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name: profile.name
			})
		});

		if (!result.ok) {
			writeLocalProfile(profile);
			error = 'Saved locally. Connect database to sync with server.';
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
			const next = readLocalSessions().filter((session) => session.id !== sessionId);
			writeLocalSessions(next);
			sessions = next;
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}
		await loadSessions();
	}

	async function logoutOtherDevices() {
		const result = await apiRequest<{ removed?: number; error?: string }>('/api/users/sessions/others', {
			method: 'DELETE'
		});
		if (!result.ok) {
			writeLocalSessions([]);
			sessions = [];
			error = 'Saved locally. Connect database to sync with server.';
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
			twoFactorEnabled = true;
			backupCodes = [
				crypto.randomUUID().slice(0, 8),
				crypto.randomUUID().slice(0, 8),
				crypto.randomUUID().slice(0, 8),
				crypto.randomUUID().slice(0, 8)
			];
			writeLocalSecurity({ twoFactorEnabled, backupCodes });
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}

		twoFactorEnabled = true;
		backupCodes = result.data?.backupCodes ?? [];
		writeLocalSecurity({ twoFactorEnabled, backupCodes });
	}

	async function disable2fa() {
		const result = await apiRequest<{ success?: boolean; error?: string }>('/api/auth/2fa/disable', {
			method: 'POST'
		});
		if (!result.ok) {
			twoFactorEnabled = false;
			backupCodes = [];
			writeLocalSecurity({ twoFactorEnabled, backupCodes });
			error = 'Saved locally. Connect database to sync with server.';
			return;
		}

		twoFactorEnabled = false;
		backupCodes = [];
		writeLocalSecurity({ twoFactorEnabled, backupCodes });
	}

	async function exportData() {
		const result = await apiRequest<Record<string, unknown>>(`/api/data/export?format=${exportFormat}`);
		if (!result.ok || !result.data) {
			const fallback = {
				format: exportFormat,
				exportedAt: new Date().toISOString(),
				localCounts: getLocalCounts()
			};
			const content = JSON.stringify(fallback, null, 2);
			await navigator.clipboard.writeText(content);
			notifications.push({
				id: crypto.randomUUID(),
				type: 'success',
				title: 'Local export copied',
				message: 'Local browser data summary copied to clipboard.'
			});
			error = 'Using offline export (local browser storage)';
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
			const data = payload as {
				tasks?: unknown[];
				habits?: unknown[];
				goals?: unknown[];
				profile?: typeof profile;
			};
			if (Array.isArray(data.tasks)) localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(data.tasks));
			if (Array.isArray(data.habits)) localStorage.setItem(LOCAL_HABITS_KEY, JSON.stringify(data.habits));
			if (Array.isArray(data.goals)) localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(data.goals));
			if (data.profile) writeLocalProfile(data.profile);
			notifications.push({
				id: crypto.randomUUID(),
				type: 'success',
				title: 'Imported locally',
				message: 'Import saved to browser storage.'
			});
			error = 'Using offline import (local browser storage)';
			importText = '';
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

	function applyThemeChoice() {
		const root = document.documentElement;
		root.setAttribute('data-theme', themeChoice);
		localStorage.setItem('clarity_theme', themeChoice);
		notifications.push({
			id: crypto.randomUUID(),
			type: 'success',
			title: 'Theme applied',
			message: `Theme switched to ${themeChoice}.`
		});
	}

	function applyPaletteChoice() {
		const root = document.documentElement;
		if (paletteChoice === 'default-calm') {
			root.removeAttribute('data-palette');
			localStorage.removeItem('clarity_palette');
		} else {
			root.setAttribute('data-palette', paletteChoice);
			localStorage.setItem('clarity_palette', paletteChoice);
		}
		notifications.push({
			id: crypto.randomUUID(),
			type: 'success',
			title: 'Palette applied',
			message:
				paletteChoice === 'default-calm'
					? 'Default Calm is active.'
					: `${paletteChoice.replace('-', ' ')} palette is active.`
		});
	}

	function updateNotificationPreference(key: keyof FeatureNotifications, value: boolean) {
		notifyPrefs = { ...notifyPrefs, [key]: value };
		localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(notifyPrefs));
	}

	async function deleteAccount() {
		const ok = confirm('Delete your account? This cannot be undone.');
		if (!ok) return;

		const result = await apiRequest<{ success?: boolean; error?: string }>('/api/users/me', {
			method: 'DELETE'
		});
		if (!result.ok) {
			localStorage.removeItem(LOCAL_PROFILE_KEY);
			localStorage.removeItem(LOCAL_SETTINGS_SESSIONS_KEY);
			localStorage.removeItem(LOCAL_SECURITY_KEY);
			localStorage.removeItem(LOCAL_TASKS_KEY);
			localStorage.removeItem(LOCAL_HABITS_KEY);
			localStorage.removeItem(LOCAL_GOALS_KEY);
			error = 'Deleted local data. Connect database to sync account removal.';
			return;
		}

		window.location.href = '/dashboard';
	}
</script>

<MainLayout>
	<section class="space-y-5">
		<div>
			<h1 class="text-[28px] font-semibold text-text-primary">Settings</h1>
			<p class="text-sm text-text-secondary">Profile, preferences, security, and data controls.</p>
		</div>

		{#if error}
			<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>
		{/if}

		{#if loading}
			<p class="text-sm text-text-secondary">Loading settings...</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
				<section class="app-card p-4 xl:col-span-7">
					<h2 class="text-xl font-semibold text-text-primary">Profile</h2>
					<form class="mt-4 space-y-3" onsubmit={saveProfile}>
						<div>
							<label class="mb-1 block text-[13px] font-medium text-text-secondary" for="settings-name">Name</label>
							<input id="settings-name" bind:value={profile.name} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" required type="text" />
						</div>
						<div>
							<label class="mb-1 block text-[13px] font-medium text-text-secondary" for="settings-email">Email</label>
							<input id="settings-email" bind:value={profile.email} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary" disabled type="email" />
						</div>
						<button class="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-hover" disabled={saving} type="submit">
							{saving ? 'Saving...' : 'Save profile'}
						</button>
					</form>
				</section>

				<section class="app-card p-4 xl:col-span-5">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-semibold text-text-primary">Security</h2>
						<button class="rounded-[14px] border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-primary" onclick={logoutOtherDevices} type="button">Logout other devices</button>
					</div>

					<div class="mt-4 space-y-3">
						<div class="muted-panel p-3">
							<p class="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
							<p class="mt-1 text-xs text-text-secondary">Status: {twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
							<div class="mt-2 flex gap-2">
								{#if twoFactorEnabled}
									<button class="rounded-[14px] bg-[color:var(--danger)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[color:var(--danger-hover)]" onclick={disable2fa} type="button">Disable 2FA</button>
								{:else}
									<button class="rounded-[14px] bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition hover:bg-primary-hover" onclick={enable2fa} type="button">Enable 2FA</button>
								{/if}
							</div>
							{#if backupCodes.length > 0}
								<div class="mt-3 rounded-[12px] border border-warning bg-warning-tint p-2">
									<p class="text-xs font-semibold text-warning">Backup codes</p>
									<p class="mt-1 text-[11px] text-text-secondary">{backupCodes.join(', ')}</p>
								</div>
							{/if}
						</div>

						<div class="muted-panel p-3">
							<p class="text-sm font-medium text-text-primary">Auto logout</p>
							<p class="text-xs text-text-secondary">Set inactivity timeout (minutes).</p>
							<div class="mt-2 flex items-center gap-2">
								<input bind:value={autoLogoutMinutes} class="w-24 rounded-[12px] border border-border bg-surface px-2 py-1.5 text-sm" min="5" type="number" />
								<button class="rounded-[12px] border border-border bg-surface px-3 py-1.5 text-xs text-text-primary" onclick={saveAutoLogout} type="button">Save</button>
							</div>
						</div>
					</div>
				</section>

				<section class="app-card p-4 xl:col-span-6">
					<h2 class="text-xl font-semibold text-text-primary">Theme & Appearance</h2>
					<p class="mt-1 text-sm text-text-secondary">Choose how Clarity feels across all pages.</p>
					<div class="mt-4 space-y-4">
						<div>
							<p class="mb-2 text-[13px] font-medium text-text-secondary">Mode</p>
							<div class="inline-flex rounded-[14px] border border-border bg-surface-2 p-1">
								{#each ['light', 'dark'] as option}
									<button
										class={`rounded-[12px] px-3 py-1.5 text-xs font-semibold transition ${themeChoice === option ? 'bg-secondary-tint text-secondary' : 'text-text-secondary hover:bg-surface'}`}
										onclick={() => (themeChoice = option as ThemeChoice)}
										type="button"
									>
										{option}
									</button>
								{/each}
							</div>
						</div>

						<div>
							<p class="mb-2 text-[13px] font-medium text-text-secondary">Palette</p>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
								{#each [
									{ id: 'default-calm', label: 'Default Calm' },
									{ id: 'cozy-autumn', label: 'Cozy Autumn' },
									{ id: 'high-contrast', label: 'High Contrast' }
								] as option}
									<button
										class={`rounded-[12px] border px-3 py-2 text-left text-xs font-semibold transition ${paletteChoice === option.id ? 'border-secondary bg-secondary-tint text-secondary' : 'border-border bg-surface-2 text-text-primary hover:bg-surface'}`}
										onclick={() => (paletteChoice = option.id as PaletteChoice)}
										type="button"
									>
										{option.label}
									</button>
								{/each}
							</div>
						</div>

						<div class="flex flex-wrap gap-2">
							<button class="rounded-[12px] bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition hover:bg-primary-hover" onclick={applyThemeChoice} type="button">Apply mode</button>
							<button class="rounded-[12px] border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-primary" onclick={applyPaletteChoice} type="button">Apply palette</button>
						</div>
					</div>
				</section>

				<section class="app-card p-4 xl:col-span-6">
					<h2 class="text-xl font-semibold text-text-primary">Notification Preferences</h2>
					<p class="mt-1 text-sm text-text-secondary">Control what updates you receive.</p>
					<div class="mt-4 space-y-2">
						{#each [
							{ key: 'tasks', label: 'Task reminders' },
							{ key: 'habits', label: 'Habit nudges' },
							{ key: 'goals', label: 'Goal milestones' },
							{ key: 'analytics', label: 'Weekly analytics summary' }
						] as pref}
							<label class="flex items-center justify-between rounded-[12px] border border-border bg-surface-2 px-3 py-2">
								<span class="text-sm text-text-primary">{pref.label}</span>
								<input
									checked={notifyPrefs[pref.key as keyof FeatureNotifications]}
									class="h-4 w-4 accent-[var(--primary)]"
									onchange={(event) =>
										updateNotificationPreference(
											pref.key as keyof FeatureNotifications,
											(event.currentTarget as HTMLInputElement).checked
										)}
									type="checkbox"
								/>
							</label>
						{/each}
					</div>
				</section>

				<section class="app-card p-4 xl:col-span-12">
					<h2 class="text-xl font-semibold text-text-primary">Active Sessions</h2>
					<div class="mt-3 space-y-2">
						{#if sessions.length === 0}
							<div class="empty-state">
								<p class="text-sm">No active sessions right now.</p>
							</div>
						{:else}
							{#each sessions as session (session.id)}
								<div class="flex flex-col gap-2 rounded-[14px] border border-border bg-surface-2 px-3 py-2 md:flex-row md:items-center md:justify-between">
									<div>
										<p class="text-sm text-text-primary">{session.userAgent ?? 'Unknown device'}</p>
										<p class="text-xs text-text-secondary">{session.ipAddress ?? '-'} | Last seen: {new Date(session.lastSeenAt).toLocaleString()}</p>
									</div>
									<button class="rounded-[12px] bg-[color:var(--danger)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[color:var(--danger-hover)]" onclick={() => removeSession(session.id)} type="button">Remove</button>
								</div>
							{/each}
						{/if}
					</div>
				</section>

				<section class="app-card p-4 xl:col-span-6">
					<h2 class="text-xl font-semibold text-text-primary">Data Export</h2>
					<p class="mt-1 text-sm text-text-secondary">Create a backup snapshot from your current workspace.</p>
					<div class="mt-4 flex items-center gap-2">
						<select bind:value={exportFormat} class="rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-sm">
							<option value="json">JSON</option>
							<option value="csv">CSV</option>
						</select>
						<button class="rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-hover" onclick={exportData} type="button">Export and copy</button>
					</div>
				</section>

				<section class="app-card p-4 xl:col-span-6">
					<h2 class="text-xl font-semibold text-text-primary">Data Import</h2>
					<p class="mt-1 text-sm text-text-secondary">Paste an exported JSON payload to restore data.</p>
					<form class="mt-3 space-y-2" onsubmit={importData}>
						<textarea bind:value={importText} class="h-28 w-full rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-xs" placeholder="Paste export JSON payload"></textarea>
						<button class="rounded-[12px] border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary" type="submit">Import</button>
					</form>
				</section>

				<section class="rounded-[14px] border border-[color:var(--danger)]/30 bg-[color:var(--attention-tint)] p-4 xl:col-span-12">
					<h2 class="text-xl font-semibold text-[color:var(--danger)]">Danger Zone</h2>
					<p class="mt-1 text-sm text-text-secondary">Deleting your account removes all personal data from this workspace.</p>
					<button class="mt-3 rounded-[12px] bg-[color:var(--danger)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--danger-hover)]" onclick={deleteAccount} type="button">Delete account</button>
				</section>
			</div>
		{/if}
	</section>
</MainLayout>
