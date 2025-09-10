/**
 * Represents a user entity in the authentication.users table.
 *
 * Used by: authenticationService, authenticationService.unit.test.ts, pgmem.ts (test utils)
 */
type User = {
    id: number;
    username: string;
    password_hash?: string;
    email: string;
    role: string;
    site: string;
};

/**
 * User shape returned by APIs/services (without password_hash).
 *
 * Used by: authenticationService (return type), authenticationService.unit.test.ts
 */
type UserWithoutPassword = Omit<User, "password_hash">;

export { User, UserWithoutPassword };
