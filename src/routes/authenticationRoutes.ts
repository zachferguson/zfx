import { Router } from "express";
import {
    login,
    register,
    type AuthenticationControllerHandlers,
} from "../controllers/authenticationController";
import {
    validateLogin,
    validateRegister,
} from "../validators/authenticationValidators";
import { verifyToken } from "../middleware/authenticationMiddleware";

export type AuthMiddlewareHandlers = {
    verifyToken: typeof verifyToken;
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
// Default wired router (existing behavior). Tests can mock controller/middleware modules.
// Use the default-wired verifyToken so mocking the module still works.
const defaultRouter = createAuthenticationRouter(
    { login, register },
    { verifyToken }
);
export default defaultRouter;
