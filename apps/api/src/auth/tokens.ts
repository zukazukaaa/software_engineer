import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserTier } from '@omega/shared';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  tier: UserTier;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // randomized so different refreshes produce distinct tokens
}

export interface TokenConfig {
  accessSecret: string;
  refreshSecret: string;
  /** e.g. '15m' */
  accessExpiresIn: string;
  /** e.g. '7d' */
  refreshExpiresIn: string;
}

export const signAccessToken = (cfg: TokenConfig, payload: AccessTokenPayload): string =>
  jwt.sign(payload, cfg.accessSecret, { expiresIn: cfg.accessExpiresIn as jwt.SignOptions['expiresIn'] });

export const verifyAccessToken = (cfg: TokenConfig, token: string): AccessTokenPayload =>
  jwt.verify(token, cfg.accessSecret) as AccessTokenPayload;

export const signRefreshToken = (cfg: TokenConfig, payload: RefreshTokenPayload): string =>
  jwt.sign(payload, cfg.refreshSecret, { expiresIn: cfg.refreshExpiresIn as jwt.SignOptions['expiresIn'] });

export const verifyRefreshToken = (cfg: TokenConfig, token: string): RefreshTokenPayload =>
  jwt.verify(token, cfg.refreshSecret) as RefreshTokenPayload;

/** SHA-256 hash used to store refresh tokens server-side without exposing them. */
export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export class TokenExpiredError extends Error {
  constructor(message = 'token expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message = 'invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export const safeVerifyAccess = (
  cfg: TokenConfig,
  token: string,
): AccessTokenPayload | { error: TokenExpiredError | InvalidTokenError } => {
  try {
    return verifyAccessToken(cfg, token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return { error: new TokenExpiredError() };
    return { error: new InvalidTokenError() };
  }
};

export const safeVerifyRefresh = (
  cfg: TokenConfig,
  token: string,
): RefreshTokenPayload | { error: TokenExpiredError | InvalidTokenError } => {
  try {
    return verifyRefreshToken(cfg, token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return { error: new TokenExpiredError() };
    return { error: new InvalidTokenError() };
  }
};
