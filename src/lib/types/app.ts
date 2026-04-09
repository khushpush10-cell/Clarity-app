export type ThemeMode = 'light' | 'dark' | 'system';

export type TaskView = 'list' | 'kanban' | 'calendar' | 'table';

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	avatarUrl?: string | null;
}
