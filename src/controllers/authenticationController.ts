import { Request, Response } from "express";
import type { IAuthenticationService } from "../services/authenticationService";
import { AUTHENTICATION_ERRORS } from "../config/authenticationErrors";
import { validationResult } from "express-validator";
import { sendError } from "../utils/sendError";
import type { ParamsDictionary } from "express-serve-static-core";
import type { RegisterRequestBody, LoginRequestBody } from "../types/auth";

// Request body types are sourced from ../types/auth

/**
 * Authentication controller handler signatures.
 *
 * @remarks Defines the function types used by the authentication controller.
 */
/**
 * Map of authentication controller handlers.
 */
export type AuthenticationControllerHandlers = {
    /** Handles user registration. */
    register: (
        req: Request<ParamsDictionary, unknown, RegisterRequestBody>,
        res: Response
    ) => Promise<void>;
    /** Handles user login. */
    login: (
        req: Request<ParamsDictionary, unknown, LoginRequestBody>,
        res: Response
    ) => Promise<void>;
};

/**
 * Creates the authentication controller handlers.
 *
 * @remarks Wires `register` and `login` to the provided `IAuthenticationService`; all responses are sent via `res`.
 * @param {IAuthenticationService} auth - Authentication service providing `registerUser` and `authenticateUser`.
 * @returns {AuthenticationControllerHandlers} Object containing `register` and `login` handlers.
 */
export const createAuthenticationController = (
    auth: IAuthenticationService
): AuthenticationControllerHandlers => {
    return {
        /**
         * Handles user registration.
         *
         * @see POST /register
         * @param {Request<ParamsDictionary, unknown, RegisterRequestBody>} req - Express request; body `{ username, password, email, site }`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 201 `{ message, user }`. On validation or duplicate: 400 `{ errors|error }`. On server error: 500 `{ error }`.
         */
        register: async (
            req: Request<ParamsDictionary, unknown, RegisterRequestBody>,
            res: Response
        ): Promise<void> => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
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
                    (err instanceof Error &&
                        err.message.includes("already exists"))
                ) {
                    sendError(res, 400, AUTHENTICATION_ERRORS.DUPLICATE_USER);
                    return;
                } else {
                    sendError(res, 500, AUTHENTICATION_ERRORS.REGISTER_FAILED);
                    return;
                }
            }
        },

        /**
         * Handles user login.
         *
         * @see POST /login
         * @param {Request<ParamsDictionary, unknown, LoginRequestBody>} req - Express request; body `{ username, password, site }`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 200 `{ token, user }`. On validation error: 400 `{ errors }`. On invalid credentials: 401 `{ error }`. On server error: 500 `{ error }`.
         */
        login: async (
            req: Request<ParamsDictionary, unknown, LoginRequestBody>,
            res: Response
        ): Promise<void> => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
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
                    sendError(
                        res,
                        401,
                        AUTHENTICATION_ERRORS.INVALID_CREDENTIALS
                    );
                    return;
                }
                const { token, user } = result;
                res.status(200).json({ token, user });
                return;
            } catch (_e) {
                sendError(res, 500, AUTHENTICATION_ERRORS.LOGIN_FAILED);
                return;
            }
        },
    };
};
