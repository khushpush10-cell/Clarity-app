import { env } from '$lib/server/env';

type EmailPayload = {
	to: string;
	subject: string;
	html: string;
	text?: string;
};

function resolveFromAddress(): string {
	if (!env.EMAIL_FROM) {
		throw new Error('EMAIL_FROM is not configured');
	}
	return env.EMAIL_FROM;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
	if (!env.RESEND_API_KEY) {
		throw new Error('RESEND_API_KEY is not configured');
	}

	const { Resend } = await import('resend');
	const resend = new Resend(env.RESEND_API_KEY);
	await resend.emails.send({
		from: resolveFromAddress(),
		to: payload.to,
		subject: payload.subject,
		html: payload.html,
		text: payload.text ?? ''
	});
}

export function resolveAppBaseUrl(origin: string): string {
	if (env.APP_BASE_URL) {
		return env.APP_BASE_URL.replace(/\/$/, '');
	}
	return origin.replace(/\/$/, '');
}
