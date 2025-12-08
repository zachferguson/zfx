/**
 * Centralized error messages for authentication-related controllers.
 *
 * Used by: `authenticationValidators`, `authenticationController`, `authenticationMiddleware`
 */

/**
 * Authentication error messages keyed by code.
 */
export const AUTHENTICATION_ERRORS = {
    /** Missing required fields in registration. */
    MISSING_REGISTER_FIELDS:
        "Username, password, email, and site are required.",
    /** Duplicate username or email for a given site. */
    DUPLICATE_USER: "Username or email already exists for this site.",
    /** Server error during registration. */
    REGISTER_FAILED: "Error registering user.",
    /** Missing required fields in login. */
    MISSING_LOGIN_FIELDS: "Username, password, and site are required.",
    /** Invalid credentials supplied. */
    INVALID_CREDENTIALS: "Invalid credentials.",
    /** Server error during login. */
    LOGIN_FAILED: "Error logging in.",
    /** Authorization header missing or empty. */
    MISSING_TOKEN: "Access token is missing.",
    /** Token invalid or expired. */
    INVALID_TOKEN: "Invalid or expired token.",
};
