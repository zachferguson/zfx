import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/connection";
import type { IDatabase, ITask } from "pg-promise";
import { User, UserWithoutPassword } from "../types/user";

// Any pg-promise connection-like object: the global db or a tx/task context.
type DbOrTx = IDatabase<unknown> | ITask<unknown>;
const useDb = (t?: DbOrTx) => t ?? db;

/**
 * Registers a new user in the authentication schema.
 * Optionally runs inside a pg-promise transaction/task when `t` is provided.
 *
 * @param {string} username - The username
 * @param {string} password - The plain text password
 * @param {string} email - The user's email
 * @param {string} site - The site identifier
 * @param {DbOrTx} [t] - Optional pg-promise task/transaction
 * @returns {Promise<UserWithoutPassword>} The created user (without password)
 * @throws {Error} If the username or email already exists for this site, or on DB error
 */
export const registerUser = async (
    username: string,
    password: string,
    email: string,
    site: string,
    t?: DbOrTx
): Promise<UserWithoutPassword> => {
    const hashedPassword = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10)
    );

    const query = `
    INSERT INTO authentication.users (username, password_hash, email, site)
    VALUES ($1, $2, $3, $4)
    RETURNING id, username, email, role, site
  `;

    try {
        return await useDb(t).one(query, [
            username,
            hashedPassword,
            email,
            site,
        ]);
    } catch (e: any) {
        // Unique violation (constraint 23505) -> username or email already exists for this site
        if (e?.code === "23505") {
            throw new Error("Username or email already exists for this site.");
        }
        throw e;
    }
};

/**
 * Authenticates a user by username, password, and site.
 * Optionally runs inside a pg-promise transaction/task when `t` is provided.
 *
 * @param {string} username - The username
 * @param {string} password - The plain text password
 * @param {string} site - The site identifier
 * @param {DbOrTx} [t] - Optional pg-promise task/transaction
 * @returns {Promise<{ token: string; user: UserWithoutPassword } | null>} The JWT and user if authenticated, otherwise null
 */
export const authenticateUser = async (
    username: string,
    password: string,
    site: string,
    t?: DbOrTx
): Promise<{ token: string; user: UserWithoutPassword } | null> => {
    const query = `
    SELECT id, username, role, email, password_hash, site
    FROM authentication.users
    WHERE username = $1 AND site = $2
  `;

    const user = await useDb(t).oneOrNone<User>(query, [username, site]);

    if (
        user &&
        user.password_hash &&
        (await bcrypt.compare(password, user.password_hash))
    ) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            // Fail fast if config is missing (safer than silently generating an invalid token)
            throw new Error("JWT_SECRET is not configured.");
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                site: user.site,
            },
            secret,
            { expiresIn: "1d" }
        );

        const { password_hash, ...userWithoutPassword } = user;
        return { token, user: userWithoutPassword };
    }

    return null;
};
