import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
