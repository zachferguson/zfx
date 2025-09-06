import { Request, Response, NextFunction } from "express";
import {
    registerUser,
    authenticateUser,
} from "../services/authenticationService";
import { AUTHENTICATION_ERRORS } from "../config/authenticationErrors";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";

/**
 * Handles user registration.
 *
 * @route POST /register
 * @param {Request} req - Express request object, expects { username, password, email, site } in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export const validateRegister = [
    body("username")
        .notEmpty()
        .withMessage(AUTHENTICATION_ERRORS.MISSING_REGISTER_FIELDS),
    body("password")
        .notEmpty()
        .withMessage(AUTHENTICATION_ERRORS.MISSING_REGISTER_FIELDS),
    body("email")
        .notEmpty()
        .withMessage(AUTHENTICATION_ERRORS.MISSING_REGISTER_FIELDS),
    body("site")
        .notEmpty()
        .withMessage(AUTHENTICATION_ERRORS.MISSING_REGISTER_FIELDS),
];

export const register = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { username, password, email, site } = req.body;
    try {
        const user = await registerUser(username, password, email, site);
        res.status(201).json({ message: "User registered", user });
    } catch (e: any) {
        if (e.code === "23505") {
            res.status(400).json({
                error: AUTHENTICATION_ERRORS.DUPLICATE_USER,
            });
        } else {
            res.status(500).json({
                error: AUTHENTICATION_ERRORS.REGISTER_FAILED,
            });
        }
    }
};

/**
 * Handles user login.
 *
 * @route POST /login
 * @param {Request} req - Express request object, expects { username, password, site } in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export const validateLogin = [
    body("username")
        .notEmpty()
        .withMessage(AUTHENTICATION_ERRORS.MISSING_LOGIN_FIELDS),
    body("password")
        .notEmpty()
        .withMessage(AUTHENTICATION_ERRORS.MISSING_LOGIN_FIELDS),
    body("site")
        .notEmpty()
        .withMessage(AUTHENTICATION_ERRORS.MISSING_LOGIN_FIELDS),
];

export const login = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { username, password, site } = req.body;
    try {
        const result = await authenticateUser(username, password, site);
        if (!result) {
            res.status(401).json({
                error: AUTHENTICATION_ERRORS.INVALID_CREDENTIALS,
            });
            return;
        }
        const { token, user } = result;
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ error: AUTHENTICATION_ERRORS.LOGIN_FAILED });
    }
};

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
        (req as any).user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: AUTHENTICATION_ERRORS.INVALID_TOKEN });
    }
};
