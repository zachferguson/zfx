import { Router, type Response, type NextFunction } from "express";
import type { AuthenticationControllerHandlers } from "../controllers/authenticationController";
import {
    validateLogin,
    validateRegister,
} from "../validators/authenticationValidators";
import type { AuthRequest } from "../middleware/authenticationMiddleware";

/**
 * Authentication middleware handlers used by protected routes.
 */
export type AuthMiddlewareHandlers = {
    /** Verifies a Bearer token and attaches `user` to the request. */
    verifyToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
};

/**
 * Creates the authentication router.
 *
 * @param {AuthenticationControllerHandlers} controller - Controller with `login` and `register` handlers.
 * @param {AuthMiddlewareHandlers} mw - Authentication middleware, uses `verifyToken` for protected routes.
 * @returns {import('express').Router} Express router with `/login`, `/register`, and `/profile` routes.
 * @remarks Attaches validation middleware for login/register; `/profile` requires a valid Bearer token.
 */
export const createAuthenticationRouter = (
    controller: AuthenticationControllerHandlers,
    mw: AuthMiddlewareHandlers
) => {
    const router = Router();

    /**
     * Handles user login.
     * @see POST /login
     */
    router.post("/login", validateLogin, controller.login);

    /**
     * Handles user registration.
     * @see POST /register
     */
    router.post("/register", validateRegister, controller.register);

    /**
     * Returns the authenticated user's profile.
     * @see GET /profile
     */
    router.get("/profile", mw.verifyToken, (req, res) => {
        res.status(200).json({
            message: "Protected route accessed",
            user: req.user,
        });
    });

    return router;
};

/**
 * Authentication routes for user login, registration, and profile access.
 *
 * @module routes/authenticationRoutes
 */
export default createAuthenticationRouter;
