import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface SaveAttachmentInput {
	file: File;
}

const ALLOWED_MIME = new Set([
	'image/png',
	'image/jpeg',
	'image/webp',
	'application/pdf',
	'text/plain'
]);

export async function saveAttachment(input: SaveAttachmentInput): Promise<{ fileName: string; url: string; size: number; mimeType: string }> {
	const file = input.file;
	if (!ALLOWED_MIME.has(file.type)) {
		throw new Error('Unsupported file type');
	}

	if (file.size > 5 * 1024 * 1024) {
		throw new Error('File too large (max 5MB)');
	}

	const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
	const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
	const uploadsDir = join(process.cwd(), 'static', 'uploads');
	await mkdir(uploadsDir, { recursive: true });

	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(join(uploadsDir, fileName), buffer);

	return {
		fileName,
		url: `/uploads/${fileName}`,
		size: file.size,
		mimeType: file.type
	};
}
