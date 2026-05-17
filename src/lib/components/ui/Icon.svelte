<script lang="ts">
	type IconName =
		| 'analytics'
		| 'bell'
		| 'calendar'
		| 'check'
		| 'chevron-down'
		| 'chevron-left'
		| 'chevron-right'
		| 'chevrons-left'
		| 'chevrons-right'
		| 'copy'
		| 'dashboard'
		| 'edit'
		| 'filter'
		| 'flag'
		| 'heart'
		| 'home'
		| 'image'
		| 'list'
		| 'logout'
		| 'menu'
		| 'moon'
		| 'more'
		| 'plus'
		| 'repeat'
		| 'search'
		| 'settings'
		| 'target'
		| 'sun'
		| 'tasks'
		| 'template'
		| 'trash'
		| 'undo'
		| 'upload'
		| 'user'
		| 'x';

	let { name, size = 18, label = '' } = $props<{
		name: IconName;
		size?: number;
		label?: string;
	}>();
</script>

<svg
	aria-hidden={label ? undefined : 'true'}
	aria-label={label || undefined}
	class="inline-block shrink-0"
	fill="none"
	height={size}
	role={label ? 'img' : undefined}
	stroke="currentColor"
	stroke-linecap="round"
	stroke-linejoin="round"
	stroke-width="1.8"
	viewBox="0 0 24 24"
	width={size}
>
	{#if name === 'dashboard'}
		<path d="M4 13h7V4H4z" /><path d="M13 20h7V4h-7z" /><path d="M4 20h7v-5H4z" />
	{:else if name === 'tasks'}
		<path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="m4 6 1 1 2-2" /><path d="m4 12 1 1 2-2" /><path d="m4 18 1 1 2-2" />
	{:else if name === 'calendar'}
		<path d="M7 3v3" /><path d="M17 3v3" /><path d="M4 8h16" /><rect height="17" rx="3" width="18" x="3" y="5" />
	{:else if name === 'analytics'}
		<path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-3 3 2 5-7" />
	{:else if name === 'settings'}
		<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 0 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21a2.1 2.1 0 0 1-4.2 0v-.08a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.05.05a2.1 2.1 0 0 1-2.97-2.97l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.66-1.1H3a2.1 2.1 0 0 1 0-4.2h.08A1.8 1.8 0 0 0 4.74 8.6a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2.1 2.1 0 0 1 7.3 3.6l.05.05a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 10.43 2.35V2a2.1 2.1 0 0 1 4.2 0v.08a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 0 1 2.97 2.97l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.66 1.1H21a2.1 2.1 0 0 1 0 4.2h-.08A1.8 1.8 0 0 0 19.4 15Z" />
	{:else if name === 'bell'}
		<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" />
	{:else if name === 'user'}
		<path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" />
	{:else if name === 'sun'}
		<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
	{:else if name === 'moon'}
		<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />
	{:else if name === 'check'}
		<path d="m5 12 4 4L19 6" />
	{:else if name === 'edit'}
		<path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
	{:else if name === 'copy'}
		<rect height="13" rx="2" width="13" x="8" y="8" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
	{:else if name === 'trash'}
		<path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" />
	{:else if name === 'more'}
		<circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
	{:else if name === 'plus'}
		<path d="M12 5v14" /><path d="M5 12h14" />
	{:else if name === 'chevron-left'}
		<path d="m15 18-6-6 6-6" />
	{:else if name === 'chevron-right'}
		<path d="m9 18 6-6-6-6" />
	{:else if name === 'chevrons-left'}
		<path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" />
	{:else if name === 'chevrons-right'}
		<path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" />
	{:else if name === 'chevron-down'}
		<path d="m6 9 6 6 6-6" />
	{:else if name === 'search'}
		<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
	{:else if name === 'filter'}
		<path d="M4 5h16" /><path d="M7 12h10" /><path d="M10 19h4" />
	{:else if name === 'template'}
		<path d="M4 4h7v7H4z" /><path d="M13 4h7v7h-7z" /><path d="M4 13h7v7H4z" /><path d="M13 13h7v7h-7z" />
	{:else if name === 'upload'}
		<path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" />
	{:else if name === 'x'}
		<path d="M18 6 6 18" /><path d="m6 6 12 12" />
	{:else if name === 'menu'}
		<path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
	{:else if name === 'logout'}
		<path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5" />
	{:else if name === 'list'}
		<path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
	{:else if name === 'image'}
		<rect height="16" rx="3" width="18" x="3" y="4" /><path d="m8 14 2.5-2.5L16 17" /><circle cx="8" cy="9" r="1.5" />
	{:else if name === 'home'}
		<path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" />
	{:else if name === 'repeat'}
		<path d="m17 2 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
	{:else if name === 'target'}
		<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />
	{:else if name === 'flag'}
		<path d="M5 22V4" /><path d="M5 4h12l-1.5 4L17 12H5" />
	{:else if name === 'heart'}
		<path d="M20.8 4.6a5.2 5.2 0 0 0-7.4 0L12 6l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-9a5.2 5.2 0 0 0 0-7.4Z" />
	{:else if name === 'undo'}
		<path d="m9 14-5-5 5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-2" />
	{/if}
</svg>
