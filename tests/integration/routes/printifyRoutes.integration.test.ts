import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// --- Mock ONLY the controller, but have it honor express-validator results ---
vi.mock("../../../src/controllers/printifyController", () => {
    const { validationResult } =
        require("express-validator") as typeof import("express-validator");

    return {
        getProducts: vi.fn((req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            return res.status(200).json([{ id: "p1" }]);
        }),

        getShippingOptions: vi.fn((req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            return res.status(200).json([{ id: "s1" }]);
        }),

        submitOrder: vi.fn((req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            return res.status(201).json({ ok: true });
        }),

        getOrderStatus: vi.fn((req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            return res.status(200).json({ status: "in_production" });
        }),
    };
});

// Mock the middleware for future-proofing and explicit checks
vi.mock("../../../src/middleware/authenticationMiddleware", () => ({
    verifyToken: vi.fn((_req, _res, next) => next()),
}));

import router from "../../../src/routes/printifyRoutes";
import * as Controller from "../../../src/controllers/printifyController";
import { verifyToken } from "../../../src/middleware/authenticationMiddleware";

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

    // ---------- GET /:id/products ----------
    it("GET /printify/:id/products -> 200 and calls getProducts with :id", async () => {
        const res = await request(app).get("/printify/store-123/products");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: "p1" }]);
        expect(Controller.getProducts).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route

        const [reqArg] = (
            Controller.getProducts as unknown as ReturnType<typeof vi.fn>
        ).mock.calls[0];
        expect(reqArg.params.id).toBe("store-123");
    });

    // ---------- POST /:id/shipping-options ----------
    it("POST /printify/:id/shipping-options -> 400 when body is missing (validator runs)", async () => {
        const res = await request(app)
            .post("/printify/store-1/shipping-options")
            .send({}); // intentionally invalid

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(Controller.getShippingOptions).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route

        const [reqArg] = (
            Controller.getShippingOptions as unknown as ReturnType<typeof vi.fn>
        ).mock.calls[0];
        expect(reqArg.params.id).toBe("store-1");
    });

    it("POST /printify/:id/shipping-options -> 400 when line_items is empty", async () => {
        const res = await request(app)
            .post("/printify/store-2/shipping-options")
            .send({
                address_to: { city: "LA" }, // minimal object; validator only checks non-empty
                line_items: [], // fails isArray({min:1})
            });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(Controller.getShippingOptions).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route
    });

    it("POST /printify/:id/shipping-options -> 200 on minimal valid payload", async () => {
        const res = await request(app)
            .post("/printify/store-3/shipping-options")
            .send({
                address_to: { city: "LA" }, // passes .notEmpty() per current validator
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }], // min 1 item
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: "s1" }]);
        expect(Controller.getShippingOptions).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route

        const [reqArg] = (
            Controller.getShippingOptions as unknown as ReturnType<typeof vi.fn>
        ).mock.calls[0];
        expect(reqArg.params.id).toBe("store-3");
    });

    // ---------- POST /submit-order ----------
    it("POST /printify/submit-order -> 201 on valid payload and calls submitOrder", async () => {
        const res = await request(app)
            .post("/printify/submit-order")
            .send({
                storeId: "store-1",
                order: {
                    customer: { email: "a@b.com", address: {} },
                    total_price: 100,
                    currency: "USD",
                    shipping_method: "std",
                    shipping_cost: 10,
                    line_items: [
                        {
                            metadata: {
                                title: "T",
                                variant_label: "V",
                                price: 100,
                            },
                            quantity: 1,
                        },
                    ],
                },
                stripe_payment_id: "stripe-1",
            });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ ok: true });
        expect(Controller.submitOrder).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route

        const [reqArg] = (
            Controller.submitOrder as unknown as ReturnType<typeof vi.fn>
        ).mock.calls[0];
        expect(reqArg.body.storeId).toBe("store-1");
        expect(reqArg.body.stripe_payment_id).toBe("stripe-1");
    });

    it("POST /printify/submit-order -> 400 on invalid payload (validator runs)", async () => {
        const res = await request(app).post("/printify/submit-order").send({}); // missing everything

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(Controller.submitOrder).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route
    });

    // ---------- POST /order-status ----------
    it("POST /printify/order-status -> 200 on valid payload and calls getOrderStatus", async () => {
        const res = await request(app).post("/printify/order-status").send({
            orderId: "o1",
            email: "a@b.com",
        });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "in_production" });
        expect(Controller.getOrderStatus).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route

        const [reqArg] = (
            Controller.getOrderStatus as unknown as ReturnType<typeof vi.fn>
        ).mock.calls[0];
        expect(reqArg.body.orderId).toBe("o1");
        expect(reqArg.body.email).toBe("a@b.com");
    });

    it("POST /printify/order-status -> 400 on invalid payload (validator runs)", async () => {
        const res = await request(app).post("/printify/order-status").send({}); // missing orderId/email

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(Controller.getOrderStatus).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // public route
    });
});
