import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/connection";
import { User, UserWithoutPassword } from "../types/user";

/**
 * Registers a new user in the authentication schema.
 */
export const registerUser = async (
    username: string,
    password: string,
    email: string,
    site: string
): Promise<UserWithoutPassword> => {
    const hashedPassword = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_SALT_ROUNDS || "10")
    );

    const query = `
    INSERT INTO authentication.users (username, password_hash, email, site)
    VALUES ($1, $2, $3, $4)
    RETURNING id, username, email, role, site
    `;

    try {
        return await db.one(query, [username, hashedPassword, email, site]);
    } catch (e: any) {
        if (e.code === "23505") {
            throw new Error("Username or email already exists for this site.");
        }
        throw e;
    }
};

/**
 * Authenticates a user.
 */
export const authenticateUser = async (
    username: string,
    password: string,
    site: string
): Promise<{ token: string; user: UserWithoutPassword } | null> => {
    const query = `
    SELECT id, username, role, email, password_hash, site
    FROM authentication.users
    WHERE username = $1 AND site = $2
    `;

    const user = await db.oneOrNone<User>(query, [username, site]);

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
                site: user.site,
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
                site: user.site,
            },
        };
    }
    return null;
};
