import { Router, type Response, type NextFunction } from "express";
import type { AuthenticationControllerHandlers } from "../controllers/authenticationController";
import {
    validateLogin,
    validateRegister,
} from "../validators/authenticationValidators";
import type { AuthRequest } from "../middleware/authenticationMiddleware";

export type AuthMiddlewareHandlers = {
    verifyToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
};

export function createAuthenticationRouter(
    controller: AuthenticationControllerHandlers,
    mw: AuthMiddlewareHandlers
) {
    const router = Router();

    router.post("/login", validateLogin, controller.login);
    router.post("/register", validateRegister, controller.register);
    router.get("/profile", mw.verifyToken, (req, res) => {
        res.status(200).json({
            message: "Protected route accessed",
            user: req.user,
        });
    });

    return router;
}

/**
 * Authentication routes for user login, registration, and profile access.
 *
 * @module routes/authenticationRoutes
 */
export default createAuthenticationRouter;
