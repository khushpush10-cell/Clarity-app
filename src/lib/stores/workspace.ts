import { writable } from 'svelte/store';

interface WorkspaceSummary {
	id: string;
	name: string;
	role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
}

interface WorkspaceState {
	activeWorkspaceId: string | null;
	workspaces: WorkspaceSummary[];
}

const initialState: WorkspaceState = {
	activeWorkspaceId: null,
	workspaces: []
};

function createWorkspaceStore() {
	const { subscribe, set, update } = writable<WorkspaceState>(initialState);

	return {
		subscribe,
		setWorkspaces: (workspaces: WorkspaceSummary[]) => update((s) => ({ ...s, workspaces })),
		setActiveWorkspace: (activeWorkspaceId: string) => update((s) => ({ ...s, activeWorkspaceId })),
		reset: () => set(initialState)
	};
}

export const workspace = createWorkspaceStore();
