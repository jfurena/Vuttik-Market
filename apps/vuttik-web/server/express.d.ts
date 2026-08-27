/**
 * The auth middleware attaches the resolved account to the request. Declaring it
 * here lets handlers read `req.user` without casting to `any`, so a typo in a
 * property name is caught at build time.
 */
import 'express';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      uid: string;
      email: string;
      role: string;
      planId: string;
      isBanned: boolean;
    }
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
