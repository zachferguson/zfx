import type { Response } from "express";

/**
 * Sends a standardized error payload with the given status code.
 *
 * Shape rules:
 * - If `errorOrErrors` is an array, sends `{ errors: string[] }`.
 * - If it's a string, sends `{ error: string }`.
 *
 * @param {Response} res - Express response object to send the error with.
 * @param {number} status - HTTP status code to use for the response.
 * @param {string | string[]} errorOrErrors - Error message or array of error messages.
 */
export const sendError = (
    res: Response,
    status: number,
    errorOrErrors: string | string[]
) => {
    if (Array.isArray(errorOrErrors)) {
        res.status(status).json({ errors: errorOrErrors });
        return;
    }
    res.status(status).json({ error: errorOrErrors });
};

export default sendError;
