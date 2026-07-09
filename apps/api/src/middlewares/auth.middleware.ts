import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@mhshms/types';

// Extend Express Request interface to hold decrypted user details
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication token is required.'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN_FORMAT',
      message: 'Access token format must be Bearer <token>.'
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'military_hospital_secret_jwt_key_2026';

  jwt.verify(token, jwtSecret, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'The token provided is either expired, invalid, or forged.'
      });
    }

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role as UserRole
    };
    next();
  });
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required for this endpoint.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'UNAUTHORIZED_ROLE',
        message: `Your acting role (${req.user.role}) does not have permission to access this resource.`
      });
    }

    next();
  };
}
