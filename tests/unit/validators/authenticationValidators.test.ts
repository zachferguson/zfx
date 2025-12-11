// @ts-nocheck
import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";
import {
    validateRegister,
    validateLogin,
} from "../../../src/validators/authenticationValidators";
import { AUTHENTICATION_ERRORS } from "../../../src/config/authenticationErrors";
import { Request } from "express";

/**
 * @file Unit tests for authenticationValidators.
 *
 * These tests verify the behavior of the authentication validator chains using express-validator
 * by executing each chain against mocked request objects and asserting the produced validation
 * results and error messages.
 *
 * Scenarios covered:
 * - validateRegister: accepts valid registration input; rejects missing/empty fields with
 *   MISSING_REGISTER_FIELDS
 * - validateLogin: accepts valid login input; rejects missing/empty fields with
 *   MISSING_LOGIN_FIELDS
 */
function mockReq({
    params = {},
    body = {},
    query = {},
}: { params?: any; body?: any; query?: any } = {}): Request {
    return { params, body, query } as Request;
}
async function runValidation(chain: Array<any>, req: Request) {
    for (const validator of chain) {
        await validator.run(req);
    }
    return validationResult(req);
}

describe("authenticationValidators (unit)", () => {
    describe("validateRegister", () => {
        it("accepts valid body", async () => {
            const req = mockReq({
                body: {
                    username: "u",
                    password: "p",
                    email: "e@e.com",
                    site: "mysite",
                },
            });
            const result = await runValidation(validateRegister, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({
                body: { username: "", password: "", email: "", site: "" },
            });
            const result = await runValidation(validateRegister, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                AUTHENTICATION_ERRORS.MISSING_REGISTER_FIELDS
            );
        });
    });

    describe("validateLogin", () => {
        it("accepts valid body", async () => {
            const req = mockReq({
                body: { username: "u", password: "p", site: "mysite" },
            });
            const result = await runValidation(validateLogin, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({
                body: { username: "", password: "", site: "" },
            });
            const result = await runValidation(validateLogin, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                AUTHENTICATION_ERRORS.MISSING_LOGIN_FIELDS
            );
        });
    });
});
