import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/connection";
import { User, UserWithoutPassword } from "../types/user";

export const registerUser = async (
    username: string,
    password: string,
    email: string
): Promise<UserWithoutPassword> => {
    const hashedPassword = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_SALT_ROUNDS || "10")
    );
    const query = `
    INSERT INTO zachtothegym.users (username, password_hash, email)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, role
    `;
    try {
        return await db.one(query, [username, hashedPassword, email]);
    } catch (e: any) {
        if (e.code === "23505") {
            throw new Error("Username already exists.");
        }
        throw e;
    }
};

export const authenticateUser = async (
    username: string,
    password: string
): Promise<{ token: string; user: UserWithoutPassword } | null> => {
    const query = `
    SELECT id, username, role, email, password_hash
    FROM zachtothegym.users
    WHERE username = $1
    `;

    const user = await db.oneOrNone<User>(query, [username]);
    if (
        user &&
        user.password_hash &&
        (await bcrypt.compare(password, user.password_hash))
    ) {
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "1d" }
        );
        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        };
    }
    return null;
};
