// Centralized error messages for authentication-related controllers

export const AUTHENTICATION_ERRORS = {
    MISSING_REGISTER_FIELDS:
        "Username, password, email, and site are required.",
    DUPLICATE_USER: "Username or email already exists for this site.",
    REGISTER_FAILED: "Error registering user.",
    MISSING_LOGIN_FIELDS: "Username, password, and site are required.",
    INVALID_CREDENTIALS: "Invalid credentials.",
    LOGIN_FAILED: "Error logging in.",
    MISSING_TOKEN: "Access token is missing.",
    INVALID_TOKEN: "Invalid or expired token.",
};
