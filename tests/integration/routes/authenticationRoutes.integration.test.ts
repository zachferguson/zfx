// This is a stub for an integration test of the authentication router.
// It spins up an Express app with the real router, validators, and controllers.
import express from "express";
import request from "supertest";
import router from "../../../src/routes/authenticationRoutes";
import { describe, it, expect, beforeEach } from "vitest";

describe("authenticationRoutes (integration)", () => {
    let app: express.Express;
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/auth", router);
    });

    it("POST /auth/login returns 400 for missing fields", async () => {
        const res = await request(app).post("/auth/login").send({});
        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });
});
