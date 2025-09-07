import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { verifyToken } from "./authenticationMiddleware";

vi.mock("jsonwebtoken");

function makeApp() {
    const app = express();
    app.get("/protected", verifyToken, (req, res) => {
        res.json({ ok: true, user: (req as any).user });
    });
    return app;
}

describe("authenticationMiddleware.verifyToken", () => {
    let app: express.Express;
    const userPayload = {
        id: 1,
        username: "testuser",
        role: "user",
        email: "a@b.com",
        site: "mysite",
    };
    const SECRET_KEY = process.env.JWT_SECRET || "default_secret";
    let token: string;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
        process.env.JWT_SECRET = "test-secret";
        token = jwt.sign ? jwt.sign(userPayload, SECRET_KEY) : "signed.jwt";
    });

    it("returns 401 when Authorization header is missing", async () => {
        const res = await request(app).get("/protected");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Access token is missing.");
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header is not Bearer", async () => {
        const res = await request(app)
            .get("/protected")
            .set("Authorization", "NotBearer sometoken");
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Access token is missing.");
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it("returns 403 when jwt.verify throws (invalid/expired token)", async () => {
        (jwt.verify as any).mockImplementation(() => {
            throw new Error("bad token");
        });
        const res = await request(app)
            .get("/protected")
            .set("Authorization", "Bearer not.a.jwt");
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Invalid or expired token.");
        expect(jwt.verify).toHaveBeenCalledWith("not.a.jwt", "test-secret");
    });

    it("calls next and attaches req.user when token is valid", async () => {
        (jwt.verify as any).mockReturnValue(userPayload);
        const res = await request(app)
            .get("/protected")
            .set("Authorization", "Bearer real.jwt.here");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, user: userPayload });
        expect(jwt.verify).toHaveBeenCalledWith("real.jwt.here", "test-secret");
    });
});
