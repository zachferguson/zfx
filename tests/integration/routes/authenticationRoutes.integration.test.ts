import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

/**
 * @file Integration tests for authenticationRoutes.
 *
 * Verifies the authentication routing layer, ensuring middleware and controllers
 * are properly invoked with expected behavior. Uses a real Express app with mocked
 * controllers and middleware.
 *
 * Scenarios covered:
 * - Registration validation and success
 * - Login validation, invalid credentials, and success
 * - Protected route access with verifyToken middleware
 */

vi.mock("../../../src/controllers/authenticationController", () => {
    const { validationResult } =
        require("express-validator") as typeof import("express-validator");

    return {
        register: vi.fn((req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { username, email } = req.body || {};
            return res.status(201).json({ user: { username, email } });
        }),

        login: vi.fn((req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { username, site } = req.body || {};
            if (String(username || "").startsWith("no_such")) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            return res.status(200).json({
                token: "mock.jwt.token",
                user: { username, email: `${username}@example.com`, site },
            });
        }),
    };
});

vi.mock("../../../src/middleware/authenticationMiddleware", () => ({
    verifyToken: vi.fn((req, _res, next) => {
        (req as any).user = { id: 1, username: "mockuser" };
        next();
    }),
}));

import router from "../../../src/routes/authenticationRoutes";
import * as Controller from "../../../src/controllers/authenticationController";
import { verifyToken } from "../../../src/middleware/authenticationMiddleware";

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/auth", router);
    return app;
}

describe("authenticationRoutes (integration)", () => {
    let app: express.Express;

    const SITE = "developerhorizon";
    const STRONG_PWD = "Th!sIs@VeryStr0ngPwd#2025";
    const unique = (p: string) =>
        `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    describe("POST /auth/login", () => {
        // Should return 400 when required login fields are missing
        it("returns 400 for missing fields (validator runs)", async () => {
            const res = await request(app).post("/auth/login").send({});
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            // Note: controller does the validation check, so it *is* invoked.
            expect(Controller.login).toHaveBeenCalledTimes(1);
            expect(verifyToken).not.toHaveBeenCalled(); // public route
        });

        // Should return 401 when credentials are invalid
        it("returns 401 for invalid credentials", async () => {
            const res = await request(app).post("/auth/login").send({
                username: "no_such_user",
                password: "wrong",
                site: SITE,
            });

            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
            expect(Controller.login).toHaveBeenCalledTimes(1);
            expect(verifyToken).not.toHaveBeenCalled(); // public route
        });

        // Should return 200 and token when credentials are valid
        it("returns 200 and token for valid credentials", async () => {
            const username = unique("login");

            const res = await request(app).post("/auth/login").send({
                username,
                password: STRONG_PWD,
                site: SITE,
            });

            expect(res.status).toBe(200);
            expect(res.body.user).toMatchObject({ username, site: SITE });
            expect(typeof res.body.token).toBe("string");
            expect(res.body.token.length).toBeGreaterThan(0);
            expect(Controller.login).toHaveBeenCalledTimes(1);
            expect(verifyToken).not.toHaveBeenCalled(); // public route
        });
    });

    describe("POST /auth/register", () => {
        // Should return 400 when required registration fields are missing
        it("returns 400 for missing fields (validator runs)", async () => {
            const res = await request(app).post("/auth/register").send({});
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(Controller.register).toHaveBeenCalledTimes(1);
            expect(verifyToken).not.toHaveBeenCalled(); // public route
        });

        // Should return 201 when registration succeeds
        it("returns 201 for valid registration", async () => {
            const username = unique("user");
            const email = `${username}@example.com`;

            const res = await request(app).post("/auth/register").send({
                username,
                password: STRONG_PWD,
                email,
                site: SITE,
                name: "Test User",
            });

            expect(res.status).toBe(201);
            expect(res.body.user).toEqual({ username, email });
            expect(Controller.register).toHaveBeenCalledTimes(1);
            expect(verifyToken).not.toHaveBeenCalled(); // public route
        });
    });

    describe("GET /auth/profile", () => {
        // Should return 401 when verifyToken blocks the request
        it("returns 401 when verifyToken blocks", async () => {
            (
                verifyToken as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce((_req, res) =>
                res.status(401).json({ error: "Unauthorized" })
            );

            const res = await request(app).get("/auth/profile");

            expect(res.status).toBe(401);
            expect(res.body.error).toBe("Unauthorized");
        });

        // Should return 200 and attach user when verifyToken passes
        it("returns 200 with verifyToken passing and attaches user", async () => {
            const res = await request(app)
                .get("/auth/profile")
                .set("Authorization", "Bearer mock.jwt.token");

            expect(res.status).toBe(200);
            expect(res.body.user).toEqual({ id: 1, username: "mockuser" });
            expect(verifyToken).toHaveBeenCalledTimes(1);
        });
    });
});
