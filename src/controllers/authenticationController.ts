import { Request, Response, NextFunction } from "express";
import type { IAuthenticationService } from "../services/authenticationService";
import {
    registerUser,
    authenticateUser,
} from "../services/authenticationService";
import { AUTHENTICATION_ERRORS } from "../config/authenticationErrors";
import jwt from "jsonwebtoken";
import { validationResult, type ValidationError } from "express-validator";
import type { ParamsDictionary } from "express-serve-static-core";
import type { RegisterRequestBody, LoginRequestBody } from "../types/auth";

// Request body types are sourced from ../types/auth

/**
 * Handles user registration.
 *
 * @route POST /register
 * @param {Request} req - Express request object, expects { username, password, email, site } in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note All responses are sent via the res object; no value is returned. On success, responds with 201 and { message, user }. On error, responds with 400 (validation or duplicate), or 500 (server error) and an error message.
 */
export type AuthenticationControllerHandlers = {
    register: (
        req: Request<ParamsDictionary, unknown, RegisterRequestBody>,
        res: Response
    ) => Promise<void>;
    login: (
        req: Request<ParamsDictionary, unknown, LoginRequestBody>,
        res: Response
    ) => Promise<void>;
};

export const createAuthenticationController = (
    auth: IAuthenticationService
): AuthenticationControllerHandlers => ({
    register: async (
        req: Request<ParamsDictionary, unknown, RegisterRequestBody>,
        res: Response
    ): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Coerce potential any messages to strings for safety
            res.status(400).json({
                errors: errors
                    .array()
                    .map((e: ValidationError) => String(e.msg)),
            });
            return;
        }
        const isDuplicateError = (e: unknown): boolean => {
            if (
                typeof e === "object" &&
                e !== null &&
                "code" in e &&
                typeof (e as { code?: unknown }).code === "string"
            ) {
                return (e as { code: string }).code === "23505";
            }
            return false;
        };
        const { username, password, email, site } = req.body;
        try {
            const user = await auth.registerUser(
                username,
                password,
                email,
                site
            );
            res.status(201).json({ message: "User registered", user });
            return;
        } catch (err: unknown) {
            // Handle both raw pg unique violation (code 23505) and service-normalized Error message
            if (
                isDuplicateError(err) ||
                (err instanceof Error && err.message.includes("already exists"))
            ) {
                res.status(400).json({
                    error: AUTHENTICATION_ERRORS.DUPLICATE_USER,
                });
                return;
            } else {
                res.status(500).json({
                    error: AUTHENTICATION_ERRORS.REGISTER_FAILED,
                });
                return;
            }
        }
    },

    /**
     * Handles user login.
     *
     * @route POST /login
     * @param {Request} req - Express request object, expects { username, password, site } in body
     * @param {Response} res - Express response object
     * @returns {Promise<void>} Sends response via res object.
     * @note All responses are sent via the res object; no value is returned. On success, responds with 200 and { token, user }. On error, responds with 400 (validation), 401 (invalid credentials), or 500 (server error) and an error message.
     */
    login: async (
        req: Request<ParamsDictionary, unknown, LoginRequestBody>,
        res: Response
    ) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                errors: errors
                    .array()
                    .map((e: ValidationError) => String(e.msg)),
            });
            return;
        }
        const { username, password, site } = req.body;
        try {
            const result = await auth.authenticateUser(
                username,
                password,
                site
            );
            if (!result) {
                res.status(401).json({
                    error: AUTHENTICATION_ERRORS.INVALID_CREDENTIALS,
                });
                return;
            }
            const { token, user } = result;
            res.status(200).json({ token, user });
            return;
        } catch (_e) {
            res.status(500).json({ error: AUTHENTICATION_ERRORS.LOGIN_FAILED });
            return;
        }
    },
});

// Default-wired handlers (for existing routes/tests)
// Use function exports so tests that mock the service module can intercept calls.
const defaultAuth: IAuthenticationService = {
    registerUser,
    authenticateUser,
};
export const { register, login } = createAuthenticationController(defaultAuth);

/**
 * Middleware to verify the JWT token for protected routes.
 *
 * @route Middleware
 * @param {Request} req - Express request object, expects Authorization header with Bearer token
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 */
export const verifyToken = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
        res.status(401).json({ error: AUTHENTICATION_ERRORS.MISSING_TOKEN });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        // Attach user info to req.user with proper type
        req.user = decoded as import("../types/user").UserWithoutPassword;
        next();
    } catch (_err) {
        res.status(403).json({ error: AUTHENTICATION_ERRORS.INVALID_TOKEN });
    }
};
