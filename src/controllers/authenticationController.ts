import { Request, Response } from "express";
import type { IAuthenticationService } from "../services/authenticationService";
import { AUTHENTICATION_ERRORS } from "../config/authenticationErrors";
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
