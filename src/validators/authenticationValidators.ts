import { body } from "express-validator";
import { AUTHENTICATION_ERRORS } from "../config/authenticationErrors";

/**
 * Validation chain for user registration.
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

/**
 * Validation chain for user login.
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
