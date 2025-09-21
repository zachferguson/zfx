import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserWithoutPassword } from "../types/user";

export interface AuthRequest extends Request {
    user?: UserWithoutPassword;
}

export function createAuthMiddleware(secret: string) {
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
}
