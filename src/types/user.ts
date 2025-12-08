/**
 * Represents a user entity in the authentication.users table.
 *
 * Used by: authenticationService, authenticationService.unit.test.ts, pgmem.ts (test utils)
 */
type User = {
    /** Primary key. */
    id: number;
    /** Unique username. */
    username: string;
    /** Optional hashed password. */
    password_hash?: string;
    /** Email address. */
    email: string;
    /** Role (e.g., 'admin', 'user'). */
    role: string;
    /** Site identifier for multi-tenant separation. */
    site: string;
};

/**
 * User shape returned by APIs/services (without password_hash).
 *
 * Used by: authenticationService (return type), authenticationService.unit.test.ts
 */
type UserWithoutPassword = Omit<User, "password_hash">;

export { User, UserWithoutPassword };
