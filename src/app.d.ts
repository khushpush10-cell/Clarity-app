// See https://svelte.dev/docs/kit/types#app.d.ts

declare global {
	namespace App {
		interface SessionUser {
			id: string;
			email: string;
			name: string;
			avatarUrl?: string | null;
		}

		interface Locals {
			user: SessionUser | null;
			requestId: string;
		}

		interface PageData {
			user: SessionUser | null;
		}
	}
}

export {};
