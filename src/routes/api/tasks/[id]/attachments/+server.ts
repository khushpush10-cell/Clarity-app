import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { logAudit } from '$lib/server/audit/log';
import { saveAttachment } from '$lib/server/attachment/storage';
import { prisma } from '$lib/server/prisma';
import { getAccessibleWorkspaceIds } from '$lib/server/workspace';

export const POST: RequestHandler = async ({ locals, params, request, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const workspaceIds = await getAccessibleWorkspaceIds(locals.user.id);
	const task = await prisma.task.findFirst({
		where: {
			id: params.id,
			workspaceId: { in: workspaceIds },
			deletedAt: null
		},
		select: { id: true, workspaceId: true, title: true }
	});

	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	let file: File | null = null;
	const contentType = request.headers.get('content-type') ?? '';

	if (contentType.includes('multipart/form-data')) {
		const form = await request.formData();
		const candidate = form.get('file');
		if (candidate instanceof File) file = candidate;
	} else {
		const body = (await request.json()) as { fileName?: string; contentBase64?: string; mimeType?: string };
		if (body.fileName && body.contentBase64 && body.mimeType) {
			const bytes = Uint8Array.from(atob(body.contentBase64), (char) => char.charCodeAt(0));
			file = new File([bytes], body.fileName, { type: body.mimeType });
		}
	}

	if (!file) {
		return json({ error: 'No file provided. Use multipart/form-data with field "file".' }, { status: 400 });
	}

	try {
		const saved = await saveAttachment({ file });

		await logAudit({
			workspaceId: task.workspaceId,
			userId: locals.user.id,
			action: 'ATTACHMENT_UPLOAD',
			entityType: 'TASK',
			entityId: task.id,
			changes: { fileName: saved.fileName, url: saved.url, size: saved.size, mimeType: saved.mimeType },
			ipAddress: getClientAddress?.() ?? null,
			userAgent: request.headers.get('user-agent')
		});

		return json({ success: true, file: saved }, { status: 201 });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 400 });
	}
};
