import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserWithoutPassword } from "../../types/user";

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

export const authenticateToken = (
    req: Request,
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
        const decoded = jwt.verify(token, SECRET_KEY) as UserWithoutPassword;
        req.user = decoded;
        next();
    } catch (e) {
        res.status(403).json({ message: "Invalid or expired token." });
        return;
    }
};
