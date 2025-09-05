import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// Mock jsonwebtoken (your middleware imports the default export)
vi.mock("jsonwebtoken", () => ({
    default: {
        verify: vi.fn(),
    },
    // expose named too, in case someone imports it elsewhere
    verify: vi.fn(),
}));

// Import AFTER mocks
import { verifyToken } from "./authenticationMiddleware";
import * as JWT from "jsonwebtoken";
const jwt = vi.mocked(JWT as any);

function makeApp() {
    const app = express();
    app.get("/protected", verifyToken, (req, res) => {
        res.json({ ok: true, user: (req as any).user });
    });
    return app;
}

describe("authenticationMiddleware.verifyToken", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
        // ensure a secret exists for the verify call signature check
        process.env.JWT_SECRET = "test-secret";
    });

    it("returns 401 when Authorization header is missing", async () => {
        const res = await request(app).get("/protected");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Access token is missing.");
        expect(jwt.default.verify).not.toHaveBeenCalled();
    });

    it("returns 403 when jwt.verify throws (invalid/expired token)", async () => {
        jwt.default.verify.mockImplementation(() => {
            throw new Error("bad token");
        });

        const res = await request(app)
            .get("/protected")
            .set("Authorization", "Bearer not.a.jwt");

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Invalid or expired token.");
        expect(jwt.default.verify).toHaveBeenCalledWith(
            "not.a.jwt",
            "test-secret"
        );
    });

    it("calls next and attaches req.user when token is valid", async () => {
        const decoded = { sub: "u1", role: "user" };
        jwt.default.verify.mockReturnValue(decoded as any);

        const res = await request(app)
            .get("/protected")
            .set("Authorization", "Bearer real.jwt.here");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, user: decoded });
        expect(jwt.default.verify).toHaveBeenCalledWith(
            "real.jwt.here",
            "test-secret"
        );
    });
});
