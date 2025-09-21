import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/connection";
import type { IDatabase, ITask } from "pg-promise";
import { User, UserWithoutPassword } from "../types/user";

// Any pg-promise connection-like object: the global db or a tx/task context.
export type DbOrTx = IDatabase<unknown> | ITask<unknown>;

export interface IAuthenticationService {
    registerUser(
        username: string,
        password: string,
        email: string,
        site: string,
        t?: DbOrTx
    ): Promise<UserWithoutPassword>;
    authenticateUser(
        username: string,
        password: string,
        site: string,
        t?: DbOrTx
    ): Promise<{ token: string; user: UserWithoutPassword } | null>;
}

export class AuthenticationService implements IAuthenticationService {
    constructor(
        private readonly database: IDatabase<unknown>,
        private readonly jwtSecret: string,
        private readonly bcryptRounds: number
    ) {}

    private dbOr(t?: DbOrTx): IDatabase<unknown> | ITask<unknown> {
        return t ?? this.database;
    }

    async registerUser(
        username: string,
        password: string,
        email: string,
        site: string,
        t?: DbOrTx
    ): Promise<UserWithoutPassword> {
        const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

        const query = `
    INSERT INTO authentication.users (username, password_hash, email, site)
    VALUES ($1, $2, $3, $4)
    RETURNING id, username, email, role, site
  `;

        try {
            return await (this.dbOr(t) as IDatabase<unknown>).one(query, [
                username,
                hashedPassword,
                email,
                site,
            ]);
        } catch (e: unknown) {
            // Unique violation (constraint 23505)
            if (
                typeof e === "object" &&
                e !== null &&
                "code" in e &&
                (e as { code?: unknown }).code === "23505"
            ) {
                throw new Error(
                    "Username or email already exists for this site."
                );
            }
            throw e instanceof Error ? e : new Error("Registration failed");
        }
    }

    async authenticateUser(
        username: string,
        password: string,
        site: string,
        t?: DbOrTx
    ): Promise<{ token: string; user: UserWithoutPassword } | null> {
        const query = `
    SELECT id, username, role, email, password_hash, site
    FROM authentication.users
    WHERE username = $1 AND site = $2
  `;

        const user = await (this.dbOr(t) as IDatabase<unknown>).oneOrNone<User>(
            query,
            [username, site]
        );

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
                this.jwtSecret,
                { expiresIn: "1d" }
            );

            const { password_hash: _pw, ...userWithoutPassword } = user;
            return { token, user: userWithoutPassword };
        }

        return null;
    }
}

// Helper to get bcrypt salt rounds, reading env at call time for testability
function getBcryptSaltRounds(): number {
    return parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
}

// Helper to get JWT secret at call time for testability
function getJwtSecret(): string {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error("JWT_SECRET is not configured.");
    return s;
}

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
// Back-compat function exports: delegate to a service instance built with current env
function getDefaultAuthService(): AuthenticationService {
    return new AuthenticationService(db, getJwtSecret(), getBcryptSaltRounds());
}

export const registerUser = (
    username: string,
    password: string,
    email: string,
    site: string,
    t?: DbOrTx
) => getDefaultAuthService().registerUser(username, password, email, site, t);

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
export const authenticateUser = (
    username: string,
    password: string,
    site: string,
    t?: DbOrTx
) => getDefaultAuthService().authenticateUser(username, password, site, t);
