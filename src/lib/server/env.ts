import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
	JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
	JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
	GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
	GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	VERCEL_URL: z.string().optional(),
	SESSION_COOKIE_NAME: z.string().min(1, 'SESSION_COOKIE_NAME is required')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	const message = parsed.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join('; ');

	throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;
