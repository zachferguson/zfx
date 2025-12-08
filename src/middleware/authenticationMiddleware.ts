import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserWithoutPassword } from "../types/user";

/**
 * Express request augmented with an optional authenticated user.
 */
export interface AuthRequest extends Request {
    /** Decoded user attached after token verification. */
    user?: UserWithoutPassword;
}

/**
 * Creates authentication middleware for verifying JWT access tokens.
 *
 * @param {string} secret - JWT secret used to verify tokens.
 * @returns {{ verifyToken: (req: AuthRequest, res: Response, next: NextFunction) => void }} Object containing the `verifyToken` middleware.
 * @remarks Adds `user` to `req` when token is valid. Responds `401` when missing, `403` when invalid/expired.
 */
export const createAuthMiddleware = (secret: string) => {
    /**
     * Verifies the `Authorization: Bearer <token>` header and attaches decoded user to the request.
     *
     * @see middleware
     * @param {AuthRequest} req - Express request; expects `Authorization` header with Bearer token.
     * @param {Response} res - Express response object.
     * @param {NextFunction} next - Express next function.
     * @returns {void} Calls `next()` on success or sends an error response.
     * @remarks On missing token: 401 `{ message }`. On invalid/expired: 403 `{ message }`. On success: sets `req.user` and calls `next()`.
     */
    const verifyToken = (
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ): void => {
        const authHeader = req.headers["authorization"];
        const token =
            authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : null;
        if (!token) {
            res.status(401).json({ message: "Access token is missing." });
            return;
        }
        try {
            const decoded = jwt.verify(token, secret) as UserWithoutPassword;
            req.user = decoded;
            next();
        } catch (_e) {
            res.status(403).json({ message: "Invalid or expired token." });
            return;
        }
    };
    return { verifyToken };
};
