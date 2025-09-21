import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
    register,
    login,
    verifyToken,
} from "../../../src/controllers/authenticationController";
import {
    validateRegister,
    validateLogin,
} from "../../../src/validators/authenticationValidators";
import { AUTHENTICATION_ERRORS } from "../../../src/config/authenticationErrors";
import * as AuthSvc from "../../../src/services/authenticationService";
import * as JWT from "jsonwebtoken";

/**
 * @file Integration tests for the authenticationController.
 *
 * Verifies authentication endpoints including user registration, login, and protected route access
 * using a real Express app with mocked authentication services and JWT verification.
 *
 * Scenarios covered:
 * - Registration with valid and invalid data
 * - Login with valid and invalid credentials
 * - Access to protected routes with and without valid JWTs
 * - Error handling for duplicate users and service failures
 */

vi.mock("../../../src/services/authenticationService", () => ({
    registerUser: vi.fn(),
    authenticateUser: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
    default: { verify: vi.fn() },
    verify: vi.fn(),
}));

const authSvc = vi.mocked(AuthSvc);
const jwt = vi.mocked(JWT as any);

function makeApp() {
    const app = express();
    app.use(express.json());
    app.post("/auth/register", validateRegister, register);
    app.post("/auth/login", validateLogin, login);
    app.get("/protected", verifyToken, (req, res) => {
        res.json({ ok: true, user: (req as any).user });
    });
    return app;
}

describe("authenticationController (integration)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    describe("POST /auth/register", () => {
        // Should return 400 when required registration fields are missing
        it("400 when required fields missing", async () => {
            const res = await request(app).post("/auth/register").send({
                // username missing
                password: "pw",
                email: "a@b.com",
                site: "site-1",
            });
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(
                AUTHENTICATION_ERRORS.MISSING_REGISTER_FIELDS
            );
            expect(authSvc.registerUser).not.toHaveBeenCalled();
        });

        // Should return 201 and user info when registration succeeds
        it("201 when created", async () => {
            authSvc.registerUser.mockResolvedValue({
                id: 1,
                username: "zach",
                email: "z@x.com",
                site: "site-1",
                role: "user",
            });
            const res = await request(app).post("/auth/register").send({
                username: "zach",
                password: "pw",
                email: "z@x.com",
                site: "site-1",
            });
            expect(res.status).toBe(201);
            expect(res.body.message).toBe("User registered");
            expect(res.body.user).toEqual(
                expect.objectContaining({ username: "zach", email: "z@x.com" })
            );
            expect(authSvc.registerUser).toHaveBeenCalledWith(
                "zach",
                "pw",
                "z@x.com",
                "site-1"
            );
        });

        // Should return 400 on unique violation (duplicate user)
        it("400 on unique violation (code 23505)", async () => {
            authSvc.registerUser.mockRejectedValue({ code: "23505" });
            const res = await request(app).post("/auth/register").send({
                username: "dup",
                password: "pw",
                email: "dup@x.com",
                site: "site-1",
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe(AUTHENTICATION_ERRORS.DUPLICATE_USER);
        });

        // Should return 500 on other registration errors
        it("500 on other errors", async () => {
            authSvc.registerUser.mockRejectedValue(new Error("db down"));
            const res = await request(app).post("/auth/register").send({
                username: "u",
                password: "pw",
                email: "u@x.com",
                site: "site-1",
            });
            expect(res.status).toBe(500);
            expect(res.body.error).toBe(AUTHENTICATION_ERRORS.REGISTER_FAILED);
        });
    });

    describe("POST /auth/login", () => {
        // Should return 400 when required login fields are missing
        it("400 when required fields missing", async () => {
            const res = await request(app).post("/auth/login").send({
                username: "z",
                // password missing
                site: "site-1",
            });
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(
                AUTHENTICATION_ERRORS.MISSING_LOGIN_FIELDS
            );
            expect(authSvc.authenticateUser).not.toHaveBeenCalled();
        });

        // Should return 401 when credentials are invalid
        it("401 when invalid credentials", async () => {
            authSvc.authenticateUser.mockResolvedValue(null);
            const res = await request(app).post("/auth/login").send({
                username: "nope",
                password: "bad",
                site: "site-1",
            });
            expect(res.status).toBe(401);
            expect(res.body.error).toBe(
                AUTHENTICATION_ERRORS.INVALID_CREDENTIALS
            );
        });

        // Should return 200 and token/user on successful login
        it("200 returns token and user on success", async () => {
            const user = {
                id: 1,
                username: "z",
                email: "z@x.com",
                site: "site-1",
                role: "user",
            };
            authSvc.authenticateUser.mockResolvedValue({
                token: "jwt.token.here",
                user,
            });
            const res = await request(app).post("/auth/login").send({
                username: "z",
                password: "pw",
                site: "site-1",
            });
            expect(res.status).toBe(200);
            expect(res.body.token).toBe("jwt.token.here");
            expect(res.body.user).toEqual(user);
            expect(authSvc.authenticateUser).toHaveBeenCalledWith(
                "z",
                "pw",
                "site-1"
            );
        });

        // Should return 500 on login service error
        it("500 on service throw", async () => {
            authSvc.authenticateUser.mockRejectedValue(new Error("boom"));
            const res = await request(app).post("/auth/login").send({
                username: "z",
                password: "pw",
                site: "site-1",
            });
            expect(res.status).toBe(500);
            expect(res.body.error).toBe(AUTHENTICATION_ERRORS.LOGIN_FAILED);
        });
    });

    describe("GET /protected", () => {
        // Should return 401 when no Authorization header is present
        it("401 when no Authorization header", async () => {
            const res = await request(app).get("/protected");
            expect(res.status).toBe(401);
            expect(res.body.error).toBe(AUTHENTICATION_ERRORS.MISSING_TOKEN);
            expect(jwt.verify).not.toHaveBeenCalled();
        });

        // Should return 403 when JWT verification fails
        it("403 when jwt.verify throws", async () => {
            (jwt.default.verify).mockImplementation(() => {
                throw new Error("bad token");
            });
            const res = await request(app)
                .get("/protected")
                .set("Authorization", "Bearer not.a.jwt");
            expect(res.status).toBe(403);
            expect(res.body.error).toBe(AUTHENTICATION_ERRORS.INVALID_TOKEN);
            expect(jwt.default.verify).toHaveBeenCalled();
        });

        // Should return 200 and attach user when JWT verifies
        it("200 when jwt verifies and attaches user", async () => {
            const decoded = { sub: "u1", role: "user" };
            (jwt.default.verify).mockReturnValue(decoded as any);
            const res = await request(app)
                .get("/protected")
                .set("Authorization", "Bearer real.jwt.here");
            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.user).toEqual(decoded);
            expect(jwt.default.verify).toHaveBeenCalledWith(
                "real.jwt.here",
                process.env.JWT_SECRET!
            );
        });
    });
});
