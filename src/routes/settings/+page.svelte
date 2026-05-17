<script lang="ts">
	import { onMount } from 'svelte';

	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
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

	const LOCAL_PROFILE_KEY = 'clarity_local_profile_v1';
	const NOTIFY_STORAGE_KEY = 'clarity_notification_preferences';

	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let activeSection = $state<'profile' | 'appearance' | 'notifications' | 'account'>('profile');

	let profile = $state({
		name: '',
		username: '',
		email: '',
		avatarUrl: ''
	});

	let themeChoice = $state<ThemeChoice>('light');
	let paletteChoice = $state<PaletteChoice>('default-calm');
	let notifyPrefs = $state<FeatureNotifications>({
		tasks: true,
		habits: true,
		goals: true,
		analytics: false
	});

	const sections = [
		{ key: 'profile', label: 'Profile', icon: 'user' },
		{ key: 'appearance', label: 'Appearance', icon: 'sun' },
		{ key: 'notifications', label: 'Notifications', icon: 'bell' },
		{ key: 'account', label: 'Account', icon: 'settings' }
	] as const;

	const palettes: Array<{ id: PaletteChoice; label: string; swatch: string }> = [
		{ id: 'default-calm', label: 'Default Calm', swatch: '#7F9C8A' },
		{ id: 'cozy-autumn', label: 'Cozy Autumn', swatch: '#C18F7D' },
		{ id: 'high-contrast', label: 'High Contrast', swatch: '#1F1F22' }
	];

	const initials = $derived(
		(profile.name || profile.email || 'C')
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);

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

	onMount(() => {
		const query = new URL(window.location.href).searchParams.get('section');
		if (query === 'appearance') activeSection = 'appearance';

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
				// Ignore malformed local settings.
			}
		}

		const localProfile = readLocalProfile();
		if (localProfile) profile = { ...profile, ...localProfile };
		void loadMe();
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
			if (local) profile = { ...profile, ...local };
			error = local ? 'Using offline mode (local browser storage)' : (result.error ?? 'Unable to load profile');
			loading = false;
			return;
		}

		const email = result.data.user.email;
		profile = {
			name: result.data.user.name,
			username: profile.username || email.split('@')[0] || '',
			email,
			avatarUrl: result.data.user.avatarUrl ?? profile.avatarUrl
		};
		writeLocalProfile(profile);
		loading = false;
	}

	function onAvatarSelected(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			profile = { ...profile, avatarUrl: String(reader.result ?? '') };
			writeLocalProfile(profile);
		};
		reader.readAsDataURL(file);
	}

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		const result = await apiRequest<{ user?: unknown; error?: string }>('/api/users/me', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: profile.name })
		});

		writeLocalProfile(profile);
		if (!result.ok) {
			error = 'Saved locally. Connect database to sync with server.';
			saving = false;
			return;
		}

		notifications.push({
			id: crypto.randomUUID(),
			type: 'success',
			title: 'Profile updated',
			message: 'Your profile settings were saved.'
		});
		saving = false;
	}

	function applyThemeChoice() {
		const root = document.documentElement;
		root.setAttribute('data-theme', themeChoice);
		localStorage.setItem('clarity_theme', themeChoice);
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
			error = 'Deleted local profile data. Connect database to sync account removal.';
			return;
		}

		window.location.href = '/dashboard';
	}
</script>

<MainLayout>
	<section class="space-y-5">
		<div>
			<h1 class="text-[28px] font-semibold text-text-primary">Settings</h1>
			<p class="text-sm text-text-secondary">Profile, appearance, notifications, and account preferences.</p>
		</div>

		{#if error}
			<p class="rounded-[14px] border border-warning bg-warning-tint px-3 py-2 text-sm text-warning">{error}</p>
		{/if}

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
			<aside class="app-card p-2 xl:col-span-3">
				{#each sections as section}
					<button
						class={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left text-sm ${activeSection === section.key ? 'bg-secondary-tint text-secondary' : 'text-text-primary hover:bg-surface-2'}`}
						onclick={() => (activeSection = section.key)}
						type="button"
					>
						<Icon name={section.icon} size={16} />
						<span>{section.label}</span>
					</button>
				{/each}
			</aside>

			<div class="xl:col-span-9">
				{#if loading}
					<p class="text-sm text-text-secondary">Loading settings...</p>
				{:else if activeSection === 'profile'}
					<section class="app-card p-4">
						<h2 class="text-lg font-semibold text-text-primary">Profile</h2>
						<form class="mt-4 space-y-4" onsubmit={saveProfile}>
							<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
								<div class="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-border bg-surface-2 text-xl font-semibold text-primary">
									{#if profile.avatarUrl}
										<img alt="Profile" class="h-full w-full object-cover" src={profile.avatarUrl} />
									{:else}
										{initials}
									{/if}
								</div>
								<label class="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
									<Icon name="image" size={16} />
									<span>Upload profile picture</span>
									<input accept="image/*" class="sr-only" onchange={onAvatarSelected} type="file" />
								</label>
							</div>

							<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
								<div>
									<label class="mb-1 block text-[13px] font-medium text-text-secondary" for="settings-name">Name</label>
									<input id="settings-name" bind:value={profile.name} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" required type="text" />
								</div>
								<div>
									<label class="mb-1 block text-[13px] font-medium text-text-secondary" for="settings-username">Username</label>
									<input id="settings-username" bind:value={profile.username} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm" type="text" />
								</div>
								<div class="md:col-span-2">
									<label class="mb-1 block text-[13px] font-medium text-text-secondary" for="settings-email">Email</label>
									<input id="settings-email" bind:value={profile.email} class="w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary" disabled type="email" />
								</div>
							</div>

							<button aria-label="Save profile" class="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-60" disabled={saving} type="submit">
								<Icon name="check" size={17} />
							</button>
						</form>
					</section>
				{:else if activeSection === 'appearance'}
					<section class="app-card p-4">
						<h2 class="text-lg font-semibold text-text-primary">Appearance</h2>
						<div class="mt-4 space-y-5">
							<div>
								<p class="mb-2 text-[13px] font-medium text-text-secondary">Theme</p>
								<div class="inline-flex rounded-full border border-border bg-surface-2 p-1">
									{#each ['light', 'dark'] as option}
										<button
											class={`rounded-full px-3 py-1.5 text-xs font-semibold ${themeChoice === option ? 'bg-secondary-tint text-secondary' : 'text-text-secondary'}`}
											onclick={() => (themeChoice = option as ThemeChoice)}
											type="button"
										>
											{option}
										</button>
									{/each}
								</div>
								<button aria-label="Apply theme" class="ml-2 inline-grid h-9 w-9 place-items-center rounded-full bg-primary text-on-primary" onclick={applyThemeChoice} type="button"><Icon name="check" size={15} /></button>
							</div>

							<div>
								<p class="mb-2 text-[13px] font-medium text-text-secondary">Palette</p>
								<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
									{#each palettes as option}
										<button
											class={`flex items-center gap-2 rounded-[12px] border px-3 py-2 text-left text-xs font-semibold ${paletteChoice === option.id ? 'border-secondary bg-secondary-tint text-secondary' : 'border-border bg-surface-2 text-text-primary'}`}
											onclick={() => (paletteChoice = option.id)}
											type="button"
										>
											<span class="h-4 w-4 rounded-full border border-border" style={`background:${option.swatch}`}></span>
											{option.label}
										</button>
									{/each}
								</div>
								<button aria-label="Apply palette" class="mt-3 grid h-9 w-9 place-items-center rounded-full bg-primary text-on-primary" onclick={applyPaletteChoice} type="button"><Icon name="check" size={15} /></button>
							</div>
						</div>
					</section>
				{:else if activeSection === 'notifications'}
					<section class="app-card p-4">
						<h2 class="text-lg font-semibold text-text-primary">Notifications</h2>
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
				{:else}
					<section class="rounded-[14px] border border-[color:var(--danger)]/30 bg-[color:var(--attention-tint)] p-4">
						<h2 class="text-lg font-semibold text-[color:var(--danger)]">Account</h2>
						<p class="mt-1 text-sm text-text-secondary">Deleting your account removes personal data from this workspace.</p>
						<button aria-label="Delete account" class="mt-3 grid h-10 w-10 place-items-center rounded-full bg-[color:var(--danger)] text-white" onclick={deleteAccount} type="button">
							<Icon name="trash" size={16} />
						</button>
					</section>
				{/if}
			</div>
		</div>
	</section>
</MainLayout>
