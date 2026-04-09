import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const filterPresetSchema = z.object({
	workspaceId: z.string().cuid().optional(),
	name: z.string().min(1).max(100),
	search: z.string().max(200).default(''),
	statusFilter: z.enum(['ALL', 'TODO', 'IN_PROGRESS', 'DONE']).default('ALL'),
	priorityFilter: z.enum(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('ALL')
});

interface StoredPreset {
	id: string;
	userId: string;
	name: string;
	search: string;
	statusFilter: string;
	priorityFilter: string;
	createdAt: string;
}

function parseSettings(settings: Prisma.JsonValue | null): Record<string, unknown> {
	if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
		return {};
	}
	return settings as Record<string, unknown>;
}

function parsePresets(settings: Prisma.JsonValue | null): StoredPreset[] {
	const parsed = parseSettings(settings);
	const raw = parsed.taskFilterPresets;
	if (!Array.isArray(raw)) return [];

	return raw
		.filter((item) => item && typeof item === 'object')
		.map((item) => {
			const value = item as Record<string, unknown>;
			return {
				id: String(value.id ?? ''),
				userId: String(value.userId ?? ''),
				name: String(value.name ?? ''),
				search: String(value.search ?? ''),
				statusFilter: String(value.statusFilter ?? 'ALL'),
				priorityFilter: String(value.priorityFilter ?? 'ALL'),
				createdAt: String(value.createdAt ?? new Date().toISOString())
			};
		})
		.filter((item) => item.id && item.userId && item.name);
}

function withPresets(settings: Prisma.JsonValue | null, presets: StoredPreset[]): Prisma.InputJsonValue {
	const parsed = parseSettings(settings);
	return {
		...parsed,
		taskFilterPresets: presets
	} as unknown as Prisma.InputJsonValue;
}

export const taskFilterPresetUtils = {
	parsePresets,
	withPresets
};

export type TaskFilterPresetInput = z.infer<typeof filterPresetSchema>;
export type StoredTaskFilterPreset = StoredPreset;


