import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

const h = vi.hoisted(() => ({
    ctrl: {
        login: vi.fn((req, res) =>
            res.json({ ok: true, route: "login", body: req.body })
        ),
        register: vi.fn((req, res) =>
            res
                .status(201)
                .json({ ok: true, route: "register", body: req.body })
        ),
    },
    mw: {
        verifyToken: vi.fn((_req, _res, next) => next()),
    },
}));

vi.mock("../../../src/controllers/authenticationController", () => ({
    login: h.ctrl.login,
    register: h.ctrl.register,
}));

vi.mock("../../../src/middleware/authenticationMiddleware", () => ({
    verifyToken: h.mw.verifyToken,
}));

import router from "../../../src/routes/authenticationRoutes";

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/auth", router);
    return app;
}

describe("authenticationRoutes (unit)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    // ---- Public routes ----
    it("POST /auth/login routes to controller.login", async () => {
        const payload = { username: "zach", password: "pw", site: "site-1" };
        const res = await request(app).post("/auth/login").send(payload);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, route: "login", body: payload });
        expect(h.ctrl.login).toHaveBeenCalledTimes(1);
    });

    it("POST /auth/register routes to controller.register", async () => {
        const payload = {
            username: "zach",
            password: "pw",
            email: "z@x.com",
            site: "site-1",
        };
        const res = await request(app).post("/auth/register").send(payload);
        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            ok: true,
            route: "register",
            body: payload,
        });
        expect(h.ctrl.register).toHaveBeenCalledTimes(1);
    });

    // ---- Protected route ----
    it("GET /auth/profile -> 401 when verifyToken blocks", async () => {
        // First call of verifyToken responds 401 and does NOT call next()
        h.mw.verifyToken.mockImplementationOnce((req, res) => {
            res.status(401).json({ message: "Access token is missing." });
        });
        const res = await request(app).get("/auth/profile");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Access token is missing.");
        // Controller handlers are unrelated to this route; ensure they didn't run
        expect(h.ctrl.login).not.toHaveBeenCalled();
        expect(h.ctrl.register).not.toHaveBeenCalled();
    });

    it("GET /auth/profile -> 200 when verifyToken passes through and sets user", async () => {
        h.mw.verifyToken.mockImplementationOnce((req, _res, next) => {
            (req).user = { id: 1, username: "zach", role: "user" };
            next();
        });
        const res = await request(app).get("/auth/profile");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            message: "Protected route accessed",
            user: { id: 1, username: "zach", role: "user" },
        });
        expect(h.mw.verifyToken).toHaveBeenCalledTimes(1);
    });
});
