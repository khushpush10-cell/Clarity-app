import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		setupFiles: ['src/test/setup.ts'],
		include: ['src/**/*.{test,spec}.{ts,js}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			lines: 70,
			functions: 70,
			branches: 70,
			statements: 70
		}
	}
});
