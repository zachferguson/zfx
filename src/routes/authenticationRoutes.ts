import { Router } from "express";
import { login, register } from "../controllers/authenticationController";
import {
    validateLogin,
    validateRegister,
} from "../validators/authenticationValidators";
import { verifyToken } from "../middleware/authenticationMiddleware";

/**
 * Authentication routes for user login, registration, and profile access.
 *
 * @module routes/authenticationRoutes
 */
const router = Router();

/**
 * Logs in a user.
 *
 * @route POST /login
 * @returns {Promise<void>} Sends response via res object.
 * @note On success, responds with 200 and a JWT token and user info. On error, responds with 400 (validation), 401 (invalid credentials), or 500 (server error).
 */
router.post("/login", validateLogin, login);

/**
 * Registers a new user.
 *
 * @route POST /register
 * @returns {Promise<void>} Sends response via res object.
 * @note On success, responds with 201 and the new user. On error, responds with 400 (validation or duplicate), or 500 (server error).
 */
router.post("/register", validateRegister, register);

/**
 * Gets the authenticated user's profile. Protected route.
 *
 * @route GET /profile
 * @returns {Promise<void>} Sends response via res object.
 * @note Requires a valid JWT. On success, responds with 200 and the user info. On error, responds with 401 (missing/invalid token).
 */
router.get("/profile", verifyToken, (req, res) => {
    res.status(200).json({
        message: "Protected route accessed",
        user: req.user,
    });
});

export default router;
