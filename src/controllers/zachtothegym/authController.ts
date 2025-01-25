import { Request, Response } from "express";
import { registerUser, authenticateUser } from "../../services/zttgAuthService";

export const register = async (req: Request, res: Response): Promise<void> => {
    const { username, password, email } = req.body;
    try {
        const user = await registerUser(username, password, email);

        if (!username || !password || !email) {
            res.status(400).json({ message: "Missing required fields." });
            return;
        }

        res.status(201).json({ message: "User registered", user });
    } catch (e: any) {
        if (e.code === "23505") {
            res.status(500).json({ message: "Username already exists." });
        } else {
            res.status(500).json({ message: "Error registering user.", e });
        }
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;
    try {
        const result = await authenticateUser(username, password);
        if (!result) {
            res.status(401).json({ message: "Invalid credentials." });
            return;
        }

        const { token, user } = result;
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ message: "Error logging in:", e });
        return;
    }
};
