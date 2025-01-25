import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

interface AuthenticatedRequest extends Request {
    user?: { id: number; username: string };
}
export const authenticateToken = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
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
        const decoded = jwt.verify(token, SECRET_KEY) as {
            id: number;
            username: string;
        };
        req.user = decoded;
        next();
    } catch (e) {
        res.status(403).json({ message: "Invalid or expired token." });
        return;
    }
};
