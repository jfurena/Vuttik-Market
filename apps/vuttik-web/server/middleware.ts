/**
 * Authorization middleware for the Vuttik marketplace API.
 *
 * The JWT carries `role`, but tokens live for 30 days, so a token minted before
 * a ban or a role change would keep working. Every request therefore re-reads
 * the user's current role and ban status from the database (cached briefly to
 * keep the extra query off the hot path).
 */
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { get } from './db.js';
import { globalCache } from './cache.js';

/** Cache freshly-read users for a few seconds; a ban still takes effect fast. */
const USER_CACHE_TTL_SECONDS = 15;

export const JWT_SECRET = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  // index.ts already refuses to boot in production without this, but throwing
  // here too means no code path can ever sign or verify a token with a
  // publicly-known value — which is exactly what production was doing before.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está configurado. El servidor no puede firmar tokens de forma segura.');
  }
  return 'local-development-only-secret-not-for-production';
};

export interface AuthedUser {
  uid: string;
  email: string;
  role: string;
  planId: string;
  isBanned: boolean;
}

async function loadUser(uid: string): Promise<AuthedUser | null> {
  const cacheKey = `authuser:${uid}`;
  const cached = globalCache.get(cacheKey);
  if (cached) return cached;

  const row: any = await get(
    'SELECT uid, email, role, plan_id, is_banned FROM vuttik_users WHERE uid = ?',
    [uid]
  );
  if (!row) return null;

  const user: AuthedUser = {
    uid: row.uid,
    email: row.email,
    role: row.role || 'user',
    planId: row.plan_id || 'free',
    isBanned: !!row.is_banned,
  };
  globalCache.set(cacheKey, user, USER_CACHE_TTL_SECONDS);
  return user;
}

/** Drop a user from the auth cache so a ban or role change applies immediately. */
export function invalidateUser(uid: string) {
  globalCache.delete(`authuser:${uid}`);
}

function extractToken(req: any): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

function verify(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET());
  } catch {
    return null;
  }
}

/**
 * Rejects the request unless it carries a valid token for a non-banned user.
 * Populates `req.user` with database-fresh values.
 */
export const authenticateToken = async (req: any, res: any, next: any) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  const payload = verify(token);
  if (!payload?.uid) return res.status(401).json({ error: 'Token inválido o expirado' });

  try {
    const user = await loadUser(payload.uid);
    if (!user) return res.status(401).json({ error: 'La cuenta ya no existe' });
    if (user.isBanned) return res.status(403).json({ error: 'Cuenta suspendida' });

    req.user = user;
    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Error al verificar la sesión' });
  }
};

/**
 * Populates `req.user` when a valid token is present but never rejects.
 * For public reads that expose extra fields to the owner of the data.
 */
export const optionalAuth = async (req: any, _res: any, next: any) => {
  const token = extractToken(req);
  if (!token) return next();

  const payload = verify(token);
  if (!payload?.uid) return next();

  try {
    const user = await loadUser(payload.uid);
    if (user && !user.isBanned) req.user = user;
  } catch {
    // A failed lookup on an optional path should not break the request.
  }
  next();
};

/** Restricts a route to the listed roles. Use after `authenticateToken`. */
export const requireRole = (...roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

/** Shorthand for the platform administrator role. */
export const requireMegaGuardian = requireRole('mega_guardian');

/**
 * Allows the request only if the `:uid`-style route parameter refers to the
 * caller, or the caller holds one of the escalated roles.
 */
export const requireSelf = (paramName = 'uid', ...alsoAllowRoles: string[]) =>
  (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const target = req.params[paramName];
    if (target === req.user.uid) return next();
    if (alsoAllowRoles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Acceso denegado' });
  };

/**
 * True when the user owns the business profile or is an accepted member of it.
 * Business `uid` and owner `uid` coincide for single-business accounts, which
 * is why the ownership check accepts either column.
 */
export async function userCanActForBusiness(userUid: string, businessUid: string): Promise<boolean> {
  if (!businessUid) return false;
  if (businessUid === userUid) return true;

  const owned: any = await get(
    'SELECT uid FROM vuttik_business_profiles WHERE uid = ? AND owner_uid = ?',
    [businessUid, userUid]
  );
  if (owned) return true;

  const member: any = await get(
    "SELECT id FROM vuttik_business_members WHERE business_uid = ? AND member_uid = ? AND status = 'accepted'",
    [businessUid, userUid]
  );
  return !!member;
}

/**
 * Guards routes acting on behalf of a business, where the business id arrives
 * as a route parameter.
 */
export const requireBusinessAccess = (paramName = 'uid') => async (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  const businessUid = req.params[paramName];

  if (req.user.role === 'mega_guardian') return next();

  try {
    if (await userCanActForBusiness(req.user.uid, businessUid)) return next();
    return res.status(403).json({ error: 'No tienes permiso sobre este negocio' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al verificar permisos de negocio' });
  }
};

/**
 * Resolves the identity a write should be attributed to. Callers may act as a
 * business they belong to, but never as an arbitrary account: anything else
 * falls back to their own uid.
 */
export async function resolveActingUid(req: any, requestedUid?: string): Promise<string> {
  const self = req.user.uid;
  if (!requestedUid || requestedUid === self) return self;
  if (req.user.role === 'mega_guardian') return requestedUid;
  if (await userCanActForBusiness(self, requestedUid)) return requestedUid;
  return self;
}

// --- Rate limiters ---------------------------------------------------------

const limiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

/** Brute-force protection for credential endpoints. */
export const authLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
  skipSuccessfulRequests: true,
});

/** Tighter budget for endpoints that send email or cost money per call. */
export const strictLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Has alcanzado el límite por hora para esta acción.' },
});

/** Broad ceiling applied to the whole API. */
export const globalLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Demasiadas peticiones.' },
});

/** Guards the AI scan endpoint, which bills per image against the Gemini quota. */
export const aiLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Has alcanzado el límite de escaneos por hora.' },
  keyGenerator: (req: any) => req.user?.uid || req.ip,
});
