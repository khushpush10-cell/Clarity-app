import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
	define: isSsrBuild
		? {}
		: {
				// Some browser dependencies probe process.env. Without this,
				// the production client bundle can crash before Svelte hydrates.
				'process.env': '{}'
			},
	plugins: [tailwindcss(), sveltekit()]
}));
