import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { env } from '$lib/server/env';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from '$lib/server/auth/constants';

const encoder = new TextEncoder();
const accessSecret = encoder.encode(env.JWT_SECRET);
const refreshSecret = encoder.encode(env.JWT_REFRESH_SECRET);

export interface TokenPayload extends JWTPayload {
	sub: string;
	email: string;
	name: string;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
		.sign(accessSecret);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.sub)
		.setIssuedAt()
		.setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
		.sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
	try {
		const { payload } = await jwtVerify(token, accessSecret);
		return payload as TokenPayload;
	} catch {
		return null;
	}
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
	try {
		const { payload } = await jwtVerify(token, refreshSecret);
		return payload as TokenPayload;
	} catch {
		return null;
	}
}
