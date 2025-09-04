import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// --- Mocks ---
vi.mock("../services/authenticationService", () => ({
    registerUser: vi.fn(),
    authenticateUser: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
    default: {
        verify: vi.fn(),
    },
    verify: vi.fn(), // if you import named or default, both are covered
}));

// Import the things under test *after* mocks
import { register, login, verifyToken } from "./authenticationController";
import * as AuthSvc from "../services/authenticationService";
import * as JWT from "jsonwebtoken";

const authSvc = vi.mocked(AuthSvc);
const jwt = vi.mocked(JWT as any);

// Small helper to mount routes for controller tests
function makeApp() {
    const app = express();
    app.use(express.json());

    app.post("/auth/register", register);
    app.post("/auth/login", login);

    // A protected route using verifyToken
    app.get("/protected", verifyToken, (req, res) => {
        res.json({ ok: true, user: (req as any).user });
    });

    return app;
}

describe("authController", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    // ---------- register ----------
    it("POST /auth/register -> 400 when required fields missing", async () => {
        const res = await request(app).post("/auth/register").send({
            // username missing
            password: "pw",
            email: "a@b.com",
            site: "site-1",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(
            "Username, password, email, and site are required."
        );
        expect(authSvc.registerUser).not.toHaveBeenCalled();
    });

    it("POST /auth/register -> 201 when created", async () => {
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

    it("POST /auth/register -> 400 on unique violation (code 23505)", async () => {
        authSvc.registerUser.mockRejectedValue({ code: "23505" });

        const res = await request(app).post("/auth/register").send({
            username: "dup",
            password: "pw",
            email: "dup@x.com",
            site: "site-1",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(
            "Username or email already exists for this site."
        );
    });

    it("POST /auth/register -> 500 on other errors", async () => {
        authSvc.registerUser.mockRejectedValue(new Error("db down"));

        const res = await request(app).post("/auth/register").send({
            username: "u",
            password: "pw",
            email: "u@x.com",
            site: "site-1",
        });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Error registering user.");
        expect(res.body.error).toBeTruthy();
    });

    // ---------- login ----------
    it("POST /auth/login -> 400 when required fields missing", async () => {
        const res = await request(app).post("/auth/login").send({
            username: "z",
            // password missing
            site: "site-1",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(
            "Username, password, and site are required."
        );
        expect(authSvc.authenticateUser).not.toHaveBeenCalled();
    });

    it("POST /auth/login -> 401 when invalid credentials", async () => {
        authSvc.authenticateUser.mockResolvedValue(null);

        const res = await request(app).post("/auth/login").send({
            username: "nope",
            password: "bad",
            site: "site-1",
        });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid credentials.");
    });

    it("POST /auth/login -> 200 returns token and user on success", async () => {
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

    it("POST /auth/login -> 500 on service throw", async () => {
        authSvc.authenticateUser.mockRejectedValue(new Error("boom"));

        const res = await request(app).post("/auth/login").send({
            username: "z",
            password: "pw",
            site: "site-1",
        });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Error logging in");
        expect(res.body.error).toBeTruthy();
    });

    // ---------- verifyToken middleware ----------
    it("GET /protected -> 401 when no Authorization header", async () => {
        const res = await request(app).get("/protected");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Access token is missing.");
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it("GET /protected -> 403 when jwt.verify throws", async () => {
        // IMPORTANT: stub the default export's verify
        (jwt.default.verify as any).mockImplementation(() => {
            throw new Error("bad token");
        });

        const res = await request(app)
            .get("/protected")
            .set("Authorization", "Bearer not.a.jwt");

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Invalid or expired token.");
        expect(jwt.default.verify).toHaveBeenCalled(); // assert default.verify
    });

    it("GET /protected -> 200 when jwt verifies and attaches user", async () => {
        const decoded = { sub: "u1", role: "user" };
        // IMPORTANT: stub the default export's verify
        (jwt.default.verify as any).mockReturnValue(decoded as any);

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
