// Reusable request body DTOs for auth endpoints

/**
 * Request body for user registration.
 */
export type RegisterRequestBody = {
    /** Desired username. */
    username: string;
    /** Plaintext password to be hashed. */
    password: string;
    /** User email address. */
    email: string;
    /** Site identifier for multi-tenant separation. */
    site: string;
};

/**
 * Request body for user login.
 */
export type LoginRequestBody = {
    /** Username credential. */
    username: string;
    /** Plaintext password credential. */
    password: string;
    /** Site identifier for multi-tenant separation. */
    site: string;
};
