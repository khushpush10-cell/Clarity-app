import { z } from 'zod';

export const registerSchema = z.object({
	email: z.string().email().toLowerCase(),
	password: z.string().min(8).max(128),
	name: z.string().min(1).max(120)
});

export const loginSchema = z.object({
	email: z.string().email().toLowerCase(),
	password: z.string().min(8).max(128),
	totpCode: z.string().trim().length(6).optional(),
	backupCode: z.string().trim().min(8).optional()
});

export const forgotPasswordSchema = z.object({
	email: z.string().email().toLowerCase()
});

export const resetPasswordSchema = z.object({
	token: z.string().min(32),
	password: z.string().min(8).max(128)
});

export const verifyEmailSchema = z.object({
	token: z.string().min(32)
});

export const googleAuthSchema = z.object({
	idToken: z.string().min(10)
});

export const twoFactorEnableSchema = z.object({
	code: z.string().trim().length(6)
});

export const twoFactorDisableSchema = z.object({
	code: z.string().trim().length(6)
});
