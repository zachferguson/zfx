import { Request, Response, NextFunction } from "express";
import { registerUser, authenticateUser } from "../services/authService";
import jwt from "jsonwebtoken";

/**
 * Handles user registration.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    const { username, password, email, site } = req.body;

    if (!username || !password || !email || !site) {
        res.status(400).json({
            message: "Username, password, email, and site are required.",
        });
        return;
    }

    try {
        const user = await registerUser(username, password, email, site);
        res.status(201).json({ message: "User registered", user });
    } catch (e: any) {
        if (e.code === "23505") {
            res.status(400).json({
                message: "Username or email already exists for this site.",
            });
        } else {
            res.status(500).json({
                message: "Error registering user.",
                error: e,
            });
        }
    }
};

/**
 * Handles user login.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    const { username, password, site } = req.body;

    if (!username || !password || !site) {
        res.status(400).json({
            message: "Username, password, and site are required.",
        });
        return;
    }

    try {
        const result = await authenticateUser(username, password, site);
        if (!result) {
            res.status(401).json({ message: "Invalid credentials." });
            return;
        }

        const { token, user } = result;
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ message: "Error logging in", error: e });
    }
};

/**
 * Verifies the JWT token for protected routes.
 */
export const verifyToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
        res.status(401).json({ message: "Access token is missing." });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        (req as any).user = decoded; // Attach decoded user info to request
        next();
    } catch (err) {
        res.status(403).json({ message: "Invalid or expired token." });
    }
};
