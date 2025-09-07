import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import router from "../../../src/routes/printifyRoutes";

vi.mock("../../../src/controllers/printifyController", () => ({
    getProducts: vi.fn((_req, res) => res.json([{ id: "mock" }])),
    getShippingOptions: vi.fn((_req, res) => res.json([{ id: "mock-ship" }])),
    submitOrder: vi.fn((_req, res) => res.status(201).json({ ok: true })),
    getOrderStatus: vi.fn((_req, res) => res.json({ status: "mock-status" })),
}));

import * as Controller from "../../../src/controllers/printifyController";

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/printify", router);
    return app;
}

describe("printifyRoutes (unit)", () => {
    let app: express.Express;
    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });
    it("GET /printify/:id/products -> calls getProducts", async () => {
        const res = await request(app).get("/printify/abc/products");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: "mock" }]);
        expect(Controller.getProducts).toHaveBeenCalled();
    });
});
