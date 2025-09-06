import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../../src/controllers/printifyController", () => ({
    getProducts: vi.fn((_req, res) => res.json([{ id: "p1" }])),
    getShippingOptions: vi.fn((_req, res) => res.json([{ id: "s1" }])),
    submitOrder: vi.fn((_req, res) => res.status(201).json({ ok: true })),
    getOrderStatus: vi.fn((_req, res) => res.json({ status: "in_production" })),
}));

import router from "../../../src/routes/printifyRoutes";
import * as Controller from "../../../src/controllers/printifyController";

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/printify", router);
    return app;
}

describe("printifyRoutes", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    it("GET /printify/:id/products -> calls getProducts with :id", async () => {
        const res = await request(app).get("/printify/123/products");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: "p1" }]);
        expect(Controller.getProducts).toHaveBeenCalledTimes(1);
        const [reqArg] = (Controller.getProducts as any).mock.calls[0];
        expect(reqArg.params.id).toBe("123");
    });
    // ...rest of test code (truncated for brevity, copy full file for actual migration)
});
