function escapePdfText(input: string): string {
	return input.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

export function buildSimplePdf(lines: string[]): Uint8Array {
	const safeLines = lines.map((line) => escapePdfText(line));
	const content = ['BT', '/F1 12 Tf', '50 760 Td'];
	for (let index = 0; index < safeLines.length; index += 1) {
		const prefix = index === 0 ? '' : '0 -16 Td ';
		content.push(`${prefix}(${safeLines[index]}) Tj`);
	}
	content.push('ET');
	const stream = content.join('\n');

	const objects = [
		'1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
		'2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
		'3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
		'4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
		`5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`
	];

	let output = '%PDF-1.4\n';
	const offsets: number[] = [];
	for (const object of objects) {
		offsets.push(output.length);
		output += `${object}\n`;
	}

	const xrefStart = output.length;
	output += `xref\n0 ${objects.length + 1}\n`;
	output += '0000000000 65535 f \n';
	for (const offset of offsets) {
		output += `${String(offset).padStart(10, '0')} 00000 n \n`;
	}
	output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

	return new TextEncoder().encode(output);
}
