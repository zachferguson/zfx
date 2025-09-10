import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import * as expressValidator from "express-validator";
import * as AuthSvc from "../../../src/services/authenticationService";
import { AUTHENTICATION_ERRORS } from "../../../src/config/authenticationErrors";
import * as jwt from "jsonwebtoken";
import {
    register,
    login,
    verifyToken,
} from "../../../src/controllers/authenticationController";

/**
 * @file Unit tests for authenticationController (register, login, verifyToken).
 *
 * These tests focus on controller behavior only:
 * - Validation responses are driven by a mocked `validationResult`.
 * - Service layer (`registerUser`, `authenticateUser`) is mocked.
 * - JWT verification is mocked to simulate valid/invalid tokens.
 *
 * Scenarios covered:
 * - register: 400 on validation errors; 201 on success; 400 on duplicate user; 500 on other errors
 * - login: 400 on validation errors; 401 on invalid credentials; 200 on success; 500 on service error
 * - verifyToken: 401 when token missing; 403 when verify fails; calls `next()` and attaches user when valid
 */

// --- Mocks --------------------------------------------------------------------
vi.mock("express-validator", () => ({
    validationResult: vi.fn(),
}));

vi.mock("../../../src/services/authenticationService", () => ({
    registerUser: vi.fn(),
    authenticateUser: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
    default: {
        verify: vi.fn(),
    },
    verify: vi.fn(), // in case any indirect usage happens
}));

const mockValidationResult = vi.mocked(
    (expressValidator as any).validationResult as ReturnType<typeof vi.fn>
);
const authSvc = vi.mocked(AuthSvc);

// helpers for req/res/next
function makeRes() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe("authenticationController (unit)", () => {
    const OLD_SECRET = process.env.JWT_SECRET;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    });

    // --------------------------- register -------------------------------------
    describe("register", () => {
        it("returns 400 with validation errors", async () => {
            const req: any = { body: {} };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: "Validation error" }],
            } as any);

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: ["Validation error"],
            });
            expect(authSvc.registerUser).not.toHaveBeenCalled();
        });

        it("returns 201 on successful registration", async () => {
            const req: any = {
                body: {
                    username: "zach",
                    password: "pw",
                    email: "z@x.com",
                    site: "site-1",
                },
            };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);

            authSvc.registerUser.mockResolvedValue({
                id: 1,
                username: "zach",
                email: "z@x.com",
                site: "site-1",
                role: "user",
            } as any);

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "User registered",
                user: expect.objectContaining({
                    username: "zach",
                    email: "z@x.com",
                }),
            });
            expect(authSvc.registerUser).toHaveBeenCalledWith(
                "zach",
                "pw",
                "z@x.com",
                "site-1"
            );
        });

        it("returns 400 on duplicate user (23505)", async () => {
            const req: any = {
                body: {
                    username: "dup",
                    password: "pw",
                    email: "d@x.com",
                    site: "s1",
                },
            };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);

            authSvc.registerUser.mockRejectedValue({ code: "23505" });

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: AUTHENTICATION_ERRORS.DUPLICATE_USER,
            });
        });

        it("returns 500 on other service errors", async () => {
            const req: any = {
                body: {
                    username: "u",
                    password: "pw",
                    email: "u@x.com",
                    site: "s1",
                },
            };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);

            authSvc.registerUser.mockRejectedValue(new Error("db down"));

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: AUTHENTICATION_ERRORS.REGISTER_FAILED,
            });
        });
    });

    // ----------------------------- login --------------------------------------
    describe("login", () => {
        it("returns 400 with validation errors", async () => {
            const req: any = { body: {} };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: "Missing login fields" }],
            } as any);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: ["Missing login fields"],
            });
            expect(authSvc.authenticateUser).not.toHaveBeenCalled();
        });

        it("returns 401 when authenticateUser returns null", async () => {
            const req: any = {
                body: { username: "nope", password: "bad", site: "s1" },
            };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);

            authSvc.authenticateUser.mockResolvedValue(null);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: AUTHENTICATION_ERRORS.INVALID_CREDENTIALS,
            });
        });

        it("returns 200 with token and user on success", async () => {
            const user = {
                id: 1,
                username: "z",
                email: "z@x.com",
                site: "site-1",
                role: "user",
            };
            const req: any = {
                body: { username: "z", password: "pw", site: "site-1" },
            };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);

            authSvc.authenticateUser.mockResolvedValue({
                token: "jwt.token.here",
                user,
            });

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                token: "jwt.token.here",
                user,
            });
            expect(authSvc.authenticateUser).toHaveBeenCalledWith(
                "z",
                "pw",
                "site-1"
            );
        });

        it("returns 500 when authenticateUser throws", async () => {
            const req: any = {
                body: { username: "z", password: "pw", site: "site-1" },
            };
            const res = makeRes();

            mockValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);

            authSvc.authenticateUser.mockRejectedValue(new Error("boom"));

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: AUTHENTICATION_ERRORS.LOGIN_FAILED,
            });
        });
    });

    // -------------------------- verifyToken -----------------------------------
    describe("verifyToken", () => {
        it("returns 401 when no Authorization header", () => {
            const req: any = { headers: {} };
            const res = makeRes();
            const next = vi.fn();

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: AUTHENTICATION_ERRORS.MISSING_TOKEN,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("returns 403 when jwt.verify throws", () => {
            const req: any = {
                headers: { authorization: "Bearer not.a.jwt" },
            };
            const res = makeRes();
            const next = vi.fn();

            (jwt as any).default.verify.mockImplementation(() => {
                throw new Error("bad token");
            });

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: AUTHENTICATION_ERRORS.INVALID_TOKEN,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("calls next and attaches user when token is valid", () => {
            const decoded = { sub: "u1", role: "user" };
            const req: any = {
                headers: { authorization: "Bearer real.jwt.here" },
            };
            const res = makeRes();
            const next = vi.fn();

            (jwt as any).default.verify.mockReturnValue(decoded);

            verifyToken(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(req.user).toEqual(decoded);
            expect((jwt as any).default.verify).toHaveBeenCalledWith(
                "real.jwt.here",
                process.env.JWT_SECRET!
            );
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    // env cleanup
    afterAll(() => {
        if (OLD_SECRET === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = OLD_SECRET;
    });
});
