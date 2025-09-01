import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// Mock the controller the router imports
vi.mock("../controllers/printifyController", () => ({
    getProducts: vi.fn((_req, res) => res.json([{ id: "p1" }])),
    getShippingOptions: vi.fn((_req, res) => res.json([{ id: "s1" }])),
    submitOrder: vi.fn((_req, res) => res.status(201).json({ ok: true })),
    getOrderStatus: vi.fn((_req, res) => res.json({ status: "in_production" })),
}));

// Import AFTER the mock so the router uses our stubs
import router from "./printifyRoutes";
import * as Controller from "../controllers/printifyController";

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

    it("POST /printify/:id/shipping-options -> calls getShippingOptions with body + :id", async () => {
        const payload = {
            address_to: { country: "US", zip: "10001" },
            line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
        };
        const res = await request(app)
            .post("/printify/999/shipping-options")
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: "s1" }]);
        expect(Controller.getShippingOptions).toHaveBeenCalledTimes(1);
        const [reqArg] = (Controller.getShippingOptions as any).mock.calls[0];
        expect(reqArg.params.id).toBe("999");
        expect(reqArg.body).toEqual(payload);
    });

    it("POST /printify/submit-order -> calls submitOrder with body", async () => {
        const payload = { storeId: "s1", order: {}, stripe_payment_id: "pi_1" };
        const res = await request(app)
            .post("/printify/submit-order")
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ ok: true });
        expect(Controller.submitOrder).toHaveBeenCalledTimes(1);
        const [reqArg] = (Controller.submitOrder as any).mock.calls[0];
        expect(reqArg.body).toEqual(payload);
    });

    it("POST /printify/order-status -> calls getOrderStatus with body", async () => {
        const payload = { orderId: "ord-1", email: "a@b.com" };
        const res = await request(app)
            .post("/printify/order-status")
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "in_production" });
        expect(Controller.getOrderStatus).toHaveBeenCalledTimes(1);
        const [reqArg] = (Controller.getOrderStatus as any).mock.calls[0];
        expect(reqArg.body).toEqual(payload);
    });
});
