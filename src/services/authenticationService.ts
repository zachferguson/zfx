import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { IDatabase, ITask } from "pg-promise";
import { User, UserWithoutPassword } from "../types/user";

// Any pg-promise connection-like object: the global db or a tx/task context.
/**
 * pg-promise database or transactional context.
 */
export type DbOrTx = IDatabase<unknown> | ITask<unknown>;

/**
 * JWT and user returned on successful authentication.
 */
export type AuthResult = {
    /** Signed JSON Web Token for the authenticated user. */
    token: string;
    /** User details without password hash. */
    user: UserWithoutPassword;
};

/**
 * Contract for user registration and authentication.
 */
export interface IAuthenticationService {
    /**
     * Registers a new user.
     *
     * @param {string} username - Username to create.
     * @param {string} password - Plaintext password to hash and store.
     * @param {string} email - User email address.
     * @param {string} site - Site/tenant identifier.
     * @param {DbOrTx} [t] - Optional pg-promise context.
     * @returns {Promise<UserWithoutPassword>} The created user without password hash.
     * @remarks Throws on unique violation (duplicate username/email per site).
     */
    registerUser(
        username: string,
        password: string,
        email: string,
        site: string,
        t?: DbOrTx
    ): Promise<UserWithoutPassword>;
    /**
     * Authenticates a user and returns a JWT.
     *
     * @param {string} username - Username.
     * @param {string} password - Plaintext password to verify.
     * @param {string} site - Site/tenant identifier.
     * @param {DbOrTx} [t] - Optional pg-promise context.
     * @returns {Promise<{ token: string; user: UserWithoutPassword } | null>} JWT and user (without password) on success; `null` on invalid credentials.
     * @remarks JWT includes `id`, `username`, `role`, and `site` claims; expires in 1 day.
     */
    authenticateUser(
        username: string,
        password: string,
        site: string,
        t?: DbOrTx
    ): Promise<AuthResult | null>;
}

/**
 * Service implementing user registration and authentication.
 */
export class AuthenticationService implements IAuthenticationService {
    /**
     * Constructs the authentication service.
     *
     * @param {IDatabase<unknown>} database - pg-promise database instance.
     * @param {string} jwtSecret - Secret used to sign JWTs.
     * @param {number} bcryptRounds - Number of bcrypt salt rounds.
     */
    constructor(
        private readonly database: IDatabase<unknown>,
        private readonly jwtSecret: string,
        private readonly bcryptRounds: number
    ) {}

    private dbOr(t?: DbOrTx): IDatabase<unknown> | ITask<unknown> {
        return t ?? this.database;
    }

    /**
     * Registers a new user.
     *
     * @param {string} username - Username to create.
     * @param {string} password - Plaintext password to hash and store.
     * @param {string} email - User email address.
     * @param {string} site - Site/tenant identifier.
     * @param {DbOrTx} [t] - Optional pg-promise context.
     * @returns {Promise<UserWithoutPassword>} The created user without password hash.
     * @remarks Throws `Error("Username or email already exists for this site.")` on unique violation.
     */
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

    /**
     * Authenticates a user and returns a signed JWT on success.
     *
     * @param {string} username - Username.
     * @param {string} password - Plaintext password to verify.
     * @param {string} site - Site/tenant identifier.
     * @param {DbOrTx} [t] - Optional pg-promise context.
     * @returns {Promise<{ token: string; user: UserWithoutPassword } | null>} JWT and user (without password) on success; `null` otherwise.
     * @remarks JWT expiration: `1d`. Claims: `id`, `username`, `role`, `site`.
     */

    async authenticateUser(
        username: string,
        password: string,
        site: string,
        t?: DbOrTx
    ): Promise<AuthResult | null> {
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
